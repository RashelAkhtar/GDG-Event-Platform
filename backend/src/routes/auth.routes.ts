import { Router, type Request, type Response, type NextFunction } from 'express';
import passport, { isGoogleConfigured } from '../config/passport.ts';
import mongoose from 'mongoose';
import { generateToken } from '../utils/jwt.ts';
import { User, UserRole, type IUser } from '../models/User.ts';
import { protect, optionalAuth } from '../middlewares/auth.middleware.ts';

const router = Router();

/**
 * Checks whether an origin belongs to a disallowed external service (e.g. Google auth pages)
 * so we never redirect an authenticated participant back to Google accounts!
 */
function isDisallowedOrigin(originStr: string): boolean {
  try {
    const url = new URL(originStr);
    const host = url.hostname.toLowerCase();
    return (
      host.endsWith('google.com') ||
      host.endsWith('googleusercontent.com') ||
      host.endsWith('googleapis.com') ||
      host.endsWith('gvt1.com') ||
      host === 'accounts.google.com' ||
      host === 'myaccount.google.com'
    );
  } catch {
    return true;
  }
}

/**
 * Resolves the client application's frontend URL with strict filtering
 * to prevent redirecting users to accounts.google.com or other external domains.
 */
function resolveClientUrl(req: Request): string {
  // 1. Explicit return_to query parameter (passed from frontend)
  const returnToQuery = req.query.return_to;
  if (typeof returnToQuery === 'string' && returnToQuery.trim()) {
    try {
      const parsed = new URL(returnToQuery.trim());
      if (!isDisallowedOrigin(parsed.origin)) {
        return parsed.origin;
      }
    } catch {}
  }

  // 2. Request Origin header
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.trim()) {
    try {
      const parsed = new URL(origin.trim());
      if (!isDisallowedOrigin(parsed.origin)) {
        return parsed.origin;
      }
    } catch {}
  }

  // 3. Referer header (ONLY if NOT from a Google domain!)
  const referer = req.headers.referer;
  if (typeof referer === 'string' && referer.trim()) {
    try {
      const parsed = new URL(referer.trim());
      if (!isDisallowedOrigin(parsed.origin)) {
        return parsed.origin;
      }
    } catch {}
  }

  // 4. Host header from proxy/deployment
  const fwdHost = req.headers['x-forwarded-host'] || req.headers.host;
  if (fwdHost && typeof fwdHost === 'string') {
    const proto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http');
    try {
      const candidate = `${proto}://${fwdHost.split(',')[0].trim()}`;
      const parsed = new URL(candidate);
      if (!isDisallowedOrigin(parsed.origin)) {
        return parsed.origin;
      }
    } catch {}
  }

  // 5. Environment variable CLIENT_URL
  if (process.env.CLIENT_URL && !isDisallowedOrigin(process.env.CLIENT_URL)) {
    try {
      const parsed = new URL(process.env.CLIENT_URL);
      return parsed.origin;
    } catch {}
  }

  return 'http://localhost:3000';
}

/**
 * Extracts and validates the return URL preserved in OAuth state parameter
 */
function extractReturnUrlFromState(req: Request): string | null {
  const stateStr = req.query.state;
  if (typeof stateStr === 'string' && stateStr.trim()) {
    try {
      const jsonStr = Buffer.from(stateStr, 'base64').toString('utf8');
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed.returnTo === 'string') {
        const url = new URL(parsed.returnTo);
        if (!isDisallowedOrigin(url.origin)) {
          return url.origin;
        }
      }
    } catch {}
  }
  return null;
}

// 1. Initiate Google OAuth
router.get('/google', (req: Request, res: Response, next: NextFunction) => {
  const returnTo = resolveClientUrl(req);
  if (!isGoogleConfigured) {
    return res.redirect(`${returnTo}/login?error=google_not_configured`);
  }

  // Encode the client return destination in OAuth state
  const state = Buffer.from(JSON.stringify({ returnTo })).toString('base64');

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    state,
  })(req, res, next);
});

// 2. Google OAuth Callback
router.get(
  '/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    const clientUrl = extractReturnUrlFromState(req) || resolveClientUrl(req);
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
    const clientUrl = extractReturnUrlFromState(req) || resolveClientUrl(req);

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

    console.log(`[GDG Auth] Google OAuth successful for participant: ${user.email} (${user.name}). Redirecting to: ${clientUrl}`);
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

  // Direct MongoDB Database Persistence (Single Source of Truth)
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
