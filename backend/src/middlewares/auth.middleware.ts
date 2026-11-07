import { type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { verifyToken } from '../utils/jwt.ts';
import { User, UserRole, type IUser } from '../models/User.ts';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = req.cookies?.gdg_token || req.cookies?.token || bearerToken;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }

  let decoded: ReturnType<typeof verifyToken>;
  try {
    decoded = verifyToken(token);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  if (decoded.role === 'ADMIN' && (decoded.userId === 'admin_master_aryan' || !mongoose.Types.ObjectId.isValid(decoded.userId) || mongoose.connection.readyState !== 1)) {
    req.user = {
      _id: 'admin_master_aryan' as any,
      email: (process.env.ADMIN_EMAIL || 'aryan.crores@gmail.com').trim().toLowerCase(),
      name: 'Aryan (Admin)',
      role: UserRole.ADMIN,
    } as any;
    return next();
  }

  if (!mongoose.Types.ObjectId.isValid(decoded.userId)) {
    if (mongoose.connection.readyState !== 1 || decoded.userId.startsWith('user_')) {
      req.user = {
        _id: decoded.userId as any,
        name: 'Community Participant',
        email: `${decoded.userId}@community.gdg`,
        role: decoded.role || UserRole.USER,
      } as any;
      return next();
    }
    return res.status(401).json({ message: 'User session expired. Please log in again.' });
  }

  try {
    const user: IUser | null = await User.findById(decoded.userId);
    if (!user) {
      if (mongoose.connection.readyState !== 1 || decoded.userId.startsWith('user_')) {
        req.user = {
          _id: decoded.userId as any,
          name: 'Community Participant',
          email: `${decoded.userId}@community.gdg`,
          role: decoded.role || UserRole.USER,
        } as any;
        return next();
      }
      return res.status(401).json({ message: 'User session expired. Please log in again.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = req.cookies?.gdg_token || req.cookies?.token || bearerToken;

  if (!token) return next();

  let decoded: ReturnType<typeof verifyToken>;
  try {
    decoded = verifyToken(token);
  } catch {
    return next();
  }

  if (decoded.role === 'ADMIN' && (decoded.userId === 'admin_master_aryan' || !mongoose.Types.ObjectId.isValid(decoded.userId) || mongoose.connection.readyState !== 1)) {
    req.user = {
      _id: 'admin_master_aryan' as any,
      email: (process.env.ADMIN_EMAIL || 'aryan.crores@gmail.com').trim().toLowerCase(),
      name: 'Aryan (Admin)',
      role: UserRole.ADMIN,
    } as any;
    return next();
  }

  if (!mongoose.Types.ObjectId.isValid(decoded.userId)) {
    if (mongoose.connection.readyState !== 1 || decoded.userId.startsWith('user_')) {
      req.user = {
        _id: decoded.userId as any,
        name: 'Community Participant',
        email: `${decoded.userId}@community.gdg`,
        role: decoded.role || UserRole.USER,
      } as any;
    }
    return next();
  }

  try {
    const user = await User.findById(decoded.userId);
    if (user) {
      req.user = user;
    } else if (mongoose.connection.readyState !== 1 || decoded.userId.startsWith('user_')) {
      req.user = {
        _id: decoded.userId as any,
        name: 'Community Participant',
        email: `${decoded.userId}@community.gdg`,
        role: decoded.role || UserRole.USER,
      } as any;
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if ((req.user as import('../models/User.ts').IUser | undefined)?.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: 'Forbidden. Admin privileges required.' });
  }
  next();
};
