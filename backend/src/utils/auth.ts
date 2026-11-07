import type { Request } from 'express';
import type { IUser } from '../models/User.ts';

export const getId = (value: string | string[] | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const getUser = (req: Request): IUser | undefined =>
  req.user as unknown as IUser | undefined;
