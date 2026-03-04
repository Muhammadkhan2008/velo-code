import jwt from 'jsonwebtoken';
import {env} from '../config/env.js';

export interface AuthTokenPayload {
  userId: number;
  email: string;
}

export function signAccessToken(payload: AuthTokenPayload): string {
  const signOptions: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    ...signOptions,
  });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}
