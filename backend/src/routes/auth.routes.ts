import { Router, type Request, type Response } from 'express';
import passport from 'passport';
import { generateToken } from '../utils/jwt.ts';
import { type IUser } from '../models/User.ts';
import { protect } from '../middlewares/auth.middleware.ts';

const router = Router();

// 1. Redirect to Google Consent Screen
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// 2. Google Redirect Callback
router.get(
  '/google/callback',
  passport.authenticate('google', { 
    session: false, 
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=auth_failed` 
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
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard`);
  }
);

// 3. Get Logged-in User
router.get('/me', protect, (req: Request, res: Response) => {
  res.status(200).json({ success: true, user: req.user });
});

// 4. Logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('gdg_token');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export default router;
