import { type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { verifyToken } from '../utils/jwt.ts';
import { User, UserRole, type IUser } from '../models/User.ts';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorization = req.headers.authorization;
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const token = req.cookies?.gdg_token || req.cookies?.token || bearerToken;

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }

    const decoded = verifyToken(token);
    let user: IUser | null = null;
    try {
      if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(decoded.userId)) {
        user = await User.findById(decoded.userId);
      }
    } catch {}

    if (!user) {
      const adminEmail = (process.env.ADMIN_EMAIL || 'aryan.crores@gmail.com').toLowerCase();
      if (decoded.userId === 'admin_master_aryan' || decoded.role === UserRole.ADMIN) {
        user = {
          _id: 'admin_master_aryan',
          email: adminEmail,
          name: 'Aryan (Admin)',
          avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Aryan&backgroundColor=1a73e8&textColor=ffffff',
          role: UserRole.ADMIN,
        } as any;
      } else {
        return res.status(401).json({ message: 'User no longer exists.' });
      }
    }

    req.user = user as any;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authorization = req.headers.authorization;
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const token = req.cookies?.gdg_token || req.cookies?.token || bearerToken;

    if (token) {
      const decoded = verifyToken(token);
      let user: IUser | null = null;
      try {
        if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(decoded.userId)) {
          user = await User.findById(decoded.userId);
        }
      } catch {}

      if (!user && (decoded.userId === 'admin_master_aryan' || decoded.role === UserRole.ADMIN)) {
        const adminEmail = (process.env.ADMIN_EMAIL || 'aryan.crores@gmail.com').toLowerCase();
        user = {
          _id: 'admin_master_aryan',
          email: adminEmail,
          name: 'Aryan (Admin)',
          avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Aryan&backgroundColor=1a73e8&textColor=ffffff',
          role: UserRole.ADMIN,
        } as any;
      }

      if (user) {
        req.user = user;
      }
    }
  } catch {
    // Non-blocking: continue as guest
  }
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if ((req.user as import('../models/User.ts').IUser | undefined)?.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: 'Forbidden. Admin privileges required.' });
  }
  next();
};
