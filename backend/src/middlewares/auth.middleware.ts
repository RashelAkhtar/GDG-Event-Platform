import { type Request, type Response,type NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.ts';
import { User, UserRole } from '../models/User.ts';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorization = req.headers.authorization;
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const token = req.cookies?.token || bearerToken;

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if ((req.user as import('../models/User.ts').IUser | undefined)?.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: 'Forbidden. Admin privileges required.' });
  }
  next();
};
