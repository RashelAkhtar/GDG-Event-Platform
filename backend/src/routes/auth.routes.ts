import { Router, type Request, type Response, type NextFunction } from 'express';
import passport from 'passport';
import mongoose from 'mongoose';
import { generateToken } from '../utils/jwt.ts';
import { User, UserRole, type IUser } from '../models/User.ts';
import { protect, optionalAuth } from '../middlewares/auth.middleware.ts';

const router = Router();

// 1. Initiate Google OAuth
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })
);

// 2. Google OAuth Callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=oauth_failed`,
    session: false,
  }),
  (req: Request, res: Response) => {
    const user = req.user as IUser;

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

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
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

export default router;
