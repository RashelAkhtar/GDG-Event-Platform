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

  if (!mongoose.Types.ObjectId.isValid(decoded.userId)) {
    return res.status(401).json({ message: 'User no longer exists.' });
  }

  try {
    const user: IUser | null = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
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

  if (!mongoose.Types.ObjectId.isValid(decoded.userId)) return next();

  try {
    const user = await User.findById(decoded.userId);
    if (user) req.user = user;
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
