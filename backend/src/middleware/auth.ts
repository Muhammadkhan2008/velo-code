import type {NextFunction, Request, Response} from 'express';
import {verifyAccessToken} from '../utils/jwt.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({message: 'Missing or invalid authorization header'});
    return;
  }

  const token = authHeader.slice(7);

  try {
    req.authUser = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({message: 'Invalid or expired token'});
  }
}
