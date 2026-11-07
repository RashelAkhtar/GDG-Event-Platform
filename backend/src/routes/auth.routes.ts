import { Router, type Request, type Response, type NextFunction } from 'express';
import passport, { isGoogleConfigured } from '../config/passport.ts';
import mongoose from 'mongoose';
import { generateToken } from '../utils/jwt.ts';
import { User, UserRole, type IUser } from '../models/User.ts';
import { protect, optionalAuth } from '../middlewares/auth.middleware.ts';

const router = Router();

function getClientRedirectUrl(req: Request): string {
  const referer = req.headers.referer;
  if (referer) {
    try {
      const url = new URL(referer);
      return url.origin;
    } catch {}
  }

  const origin = req.headers.origin;
  if (origin && typeof origin === 'string') {
    try {
      const url = new URL(origin);
      return url.origin;
    } catch {}
  }

  const fwdHost = req.headers['x-forwarded-host'] || req.headers.host;
  if (fwdHost && typeof fwdHost === 'string') {
    const proto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http');
    try {
      const url = new URL(`${proto}://${fwdHost}`);
      return url.origin;
    } catch {}
  }

  return process.env.CLIENT_URL || 'http://localhost:3000';
}

// 1. Initiate Google OAuth
router.get('/google', (req: Request, res: Response, next: NextFunction) => {
  const clientUrl = getClientRedirectUrl(req);
  if (!isGoogleConfigured) {
    return res.redirect(`${clientUrl}/login?error=google_not_configured`);
  }
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })(req, res, next);
});

// 2. Google OAuth Callback
router.get(
  '/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    const clientUrl = getClientRedirectUrl(req);
    if (!isGoogleConfigured) {
      return res.redirect(`${clientUrl}/login?error=google_not_configured`);
    }
    passport.authenticate('google', {
      failureRedirect: `${clientUrl}/login?error=oauth_failed`,
      session: false,
    })(req, res, next);
  },
  (req: Request, res: Response) => {
    const user = req.user as IUser;
    const clientUrl = getClientRedirectUrl(req);

    // Issue single app JWT
    const token = generateToken({ 
      userId: user._id.toString(), 
      role: user.role 
    });

    // Set HTTP-only cookie
    res.cookie('gdg_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.redirect(`${clientUrl}/?auth=success&token=${token}`);
  }
);

// 3. Get Logged-in User (Session check)
router.get('/me', optionalAuth, (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(200).json({ success: false, user: null });
  }
  res.status(200).json({ success: true, user: req.user });
});

// 4. Logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('gdg_token');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// 5. Admin Direct Password Login
router.post('/admin/login', async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body || {};
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '';

  const inputEmail = String(email || '').trim().toLowerCase();
  const inputPassword = typeof password === 'string' ? password : '';

  if (!inputEmail || !inputPassword) {
    return res.status(400).json({ success: false, message: 'Please enter both admin email and password' });
  }

  if (adminEmail && adminPassword && inputEmail === adminEmail && inputPassword === adminPassword) {
    if (mongoose.connection.readyState !== 1) {
      const fallbackUser = {
        _id: 'admin_master_aryan',
        email: adminEmail,
        name: 'GDG Admin',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=GDGAdmin&backgroundColor=1a73e8&textColor=ffffff',
        role: UserRole.ADMIN,
      };
      const token = generateToken({
        userId: 'admin_master_aryan',
        role: 'ADMIN',
      });
      res.cookie('gdg_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return res.status(200).json({
        success: true,
        message: 'Admin authenticated successfully',
        user: fallbackUser,
        token,
      });
    }

    let user: IUser;
    try {
      const existingUser = await User.findOne({ email: adminEmail });
      if (existingUser) {
        user = existingUser;
        if (user.role !== UserRole.ADMIN) {
          user.role = UserRole.ADMIN;
          await user.save();
        }
      } else {
        user = await User.create({
          googleId: 'admin_' + Buffer.from(adminEmail).toString('hex').slice(0, 16),
          email: adminEmail,
          name: 'GDG Admin',
          avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=GDGAdmin&backgroundColor=1a73e8&textColor=ffffff',
          role: UserRole.ADMIN,
        });
      }
    } catch (error) {
      return next(error);
    }

    const userId = user._id.toString();
    const token = generateToken({
      userId,
      role: 'ADMIN',
    });

    res.cookie('gdg_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Admin authenticated successfully',
      user,
      token,
    });
  }

  return res.status(401).json({ success: false, message: 'Invalid admin email or password' });
});

// 6. Direct Participant Community Login
router.post('/participant/login', async (req: Request, res: Response) => {
  const { name, email } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanName) {
    return res.status(400).json({ success: false, message: 'Participant handle or name is required' });
  }

  // Guard against admin impersonation
  if (cleanName.toLowerCase().includes('admin') || cleanEmail.includes('admin') || cleanEmail === 'aryan.crores@gmail.com') {
    return res.status(403).json({ success: false, message: 'Host accounts must sign in using the Host / Admin tab.' });
  }

  const effectiveEmail = cleanEmail || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}@community.gdg`;
  const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`;

  let finalUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let finalUser: any = {
    _id: finalUserId,
    googleId: `community_${finalUserId}`,
    name: cleanName,
    email: effectiveEmail,
    avatar,
    role: UserRole.USER,
  };

  // 1. Direct MongoDB Database Persistence (Single Source of Truth)
  if (mongoose.connection.readyState === 1) {
    try {
      const existing = await User.findOne({ email: effectiveEmail });
      if (existing) {
        finalUserId = existing._id.toString();
        finalUser = {
          _id: finalUserId,
          googleId: existing.googleId,
          name: existing.name || cleanName,
          email: existing.email,
          avatar: existing.avatar || avatar,
          role: existing.role || UserRole.USER,
        };
      } else {
        const created = await User.create({
          googleId: `community_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: cleanName,
          email: effectiveEmail,
          avatar,
          role: UserRole.USER,
        });
        finalUserId = created._id.toString();
        finalUser = {
          _id: finalUserId,
          googleId: created.googleId,
          name: created.name,
          email: created.email,
          avatar: created.avatar,
          role: created.role,
        };
      }
    } catch (dbErr) {
      console.warn('MongoDB participant user persist notice:', dbErr);
    }
  }

  const token = generateToken({
    userId: finalUserId,
    role: 'USER',
  });

  res.cookie('gdg_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    success: true,
    message: 'Signed in successfully',
    user: finalUser,
    token,
  });
});

export default router;
