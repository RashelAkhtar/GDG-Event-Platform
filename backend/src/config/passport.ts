import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User, UserRole } from '../models/User.ts';
import mongoose from 'mongoose';
import 'dotenv/config';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const isGoogleConfigured = Boolean(
  googleClientId &&
  googleClientSecret &&
  !googleClientId.includes('your_google_client_id') &&
  !googleClientSecret.includes('your_google_client_secret')
);

if (isGoogleConfigured && googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `http://localhost:${process.env.PORT || 5000}/api/v1/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const googleId = profile.id;

          if (!email) {
            return done(new Error('No email found from Google profile'), undefined);
          }

          const adminEmail = (process.env.ADMIN_EMAIL || 'aryan.crores@gmail.com').toLowerCase();
          const isAdmin = email.toLowerCase() === adminEmail;
          const assignedRole = isAdmin ? UserRole.ADMIN : UserRole.USER;

          let user = null;
          if (mongoose.connection.readyState === 1) {
            user = await User.findOne({ googleId });
            if (!user) {
              user = await User.create({
                googleId,
                email,
                name: profile.displayName,
                avatar: profile.photos?.[0]?.value,
                role: assignedRole,
              });
            } else if (isAdmin && user.role !== UserRole.ADMIN) {
              user.role = UserRole.ADMIN;
              await user.save();
            }
          }

          if (!user) {
            user = {
              _id: 'admin_master_aryan',
              email,
              name: profile.displayName || 'Aryan',
              avatar: profile.photos?.[0]?.value || 'https://api.dicebear.com/7.x/initials/svg?seed=Aryan&backgroundColor=1a73e8&textColor=ffffff',
              role: assignedRole,
            } as any;
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
  console.log('🔒 Google OAuth Strategy initialized with credentials');
} else {
  // Always register a fallback strategy for 'google' so passport.authenticate('google') never throws Unknown authentication strategy
  passport.use('google', {
    authenticate: function(this: any) {
      const adminEmail = (process.env.ADMIN_EMAIL || 'aryan.crores@gmail.com').toLowerCase();
      const devUser = {
        _id: 'admin_master_aryan',
        email: adminEmail,
        name: 'Aryan',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Aryan&backgroundColor=1a73e8&textColor=ffffff',
        role: UserRole.ADMIN,
      };
      this.success(devUser);
    },
  } as any);
  console.log('⚡ Fallback Google authentication strategy registered for development');
}

export default passport;
