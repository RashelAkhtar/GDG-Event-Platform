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

          const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
          if (adminEmail && email.toLowerCase() === adminEmail) {
            return done(new Error('Use admin email and password sign-in.'), undefined);
          }

          let user = null;
          if (mongoose.connection.readyState === 1) {
            user = await User.findOne({ googleId });
            if (!user) {
              user = await User.create({
                googleId,
                email,
                name: profile.displayName,
                avatar: profile.photos?.[0]?.value,
                role: UserRole.USER,
              });
            }
          }

          if (!user) {
            return done(new Error('Authentication service is unavailable.'), undefined);
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
  console.log('Google OAuth is not configured.');
}

export default passport;
