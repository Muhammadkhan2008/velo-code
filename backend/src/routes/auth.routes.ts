import bcrypt from 'bcryptjs';
import {OAuth2Client} from 'google-auth-library';
import type {ResultSetHeader, RowDataPacket} from 'mysql2';
import {Router} from 'express';
import {z} from 'zod';
import {env} from '../config/env.js';
import {pool} from '../db/pool.js';
import {requireAuth} from '../middleware/auth.js';
import {signAccessToken} from '../utils/jwt.js';

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  full_name: string;
  password_hash: string | null;
  auth_provider: 'local' | 'google';
  google_sub: string | null;
  avatar_url: string | null;
  is_premium: number;
}

const signupSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const googleSchema = z.object({
  idToken: z.string().min(1),
});

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

function toAuthResponse(user: UserRow) {
  const token = signAccessToken({userId: user.id, email: user.email});
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      authProvider: user.auth_provider,
      avatarUrl: user.avatar_url,
      isPremium: Boolean(user.is_premium),
    },
  };
}

export const authRouter = Router();

authRouter.post('/signup', async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({message: 'Invalid payload', issues: parsed.error.flatten()});
      return;
    }

    const fullName = parsed.data.fullName.trim();
    const email = parsed.data.email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const [existing] = await pool.query<UserRow[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      res.status(409).json({message: 'Email already exists'});
      return;
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO users (email, full_name, password_hash, auth_provider) VALUES (?, ?, ?, ?)',
      [email, fullName, passwordHash, 'local'],
    );

    const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [result.insertId]);
    res.status(201).json(toAuthResponse(rows[0]));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({message: 'Invalid payload', issues: parsed.error.flatten()});
      return;
    }

    const email = parsed.data.email.toLowerCase().trim();
    const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    const user = rows[0];

    if (!user || !user.password_hash) {
      res.status(401).json({message: 'Invalid credentials'});
      return;
    }

    const passwordValid = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!passwordValid) {
      res.status(401).json({message: 'Invalid credentials'});
      return;
    }

    res.json(toAuthResponse(user));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/google', async (req, res, next) => {
  try {
    if (!googleClient || !env.GOOGLE_CLIENT_ID) {
      res.status(500).json({message: 'Google auth is not configured'});
      return;
    }

    const parsed = googleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({message: 'Invalid payload', issues: parsed.error.flatten()});
      return;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) {
      res.status(401).json({message: 'Invalid Google token'});
      return;
    }

    const googleSub = payload.sub;
    const email = payload.email.toLowerCase();
    const fullName = payload.name ?? 'Google User';
    const avatarUrl = payload.picture ?? null;

    const [byGoogleSub] = await pool.query<UserRow[]>('SELECT * FROM users WHERE google_sub = ? LIMIT 1', [googleSub]);
    let user = byGoogleSub[0];

    if (!user) {
      const [byEmail] = await pool.query<UserRow[]>('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
      user = byEmail[0];

      if (user) {
        await pool.execute(
          'UPDATE users SET google_sub = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?',
          [googleSub, avatarUrl, user.id],
        );
        const [updatedRows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [user.id]);
        user = updatedRows[0];
      } else {
        const [result] = await pool.execute<ResultSetHeader>(
          'INSERT INTO users (email, full_name, password_hash, auth_provider, google_sub, avatar_url) VALUES (?, ?, NULL, ?, ?, ?)',
          [email, fullName, 'google', googleSub, avatarUrl],
        );
        const [createdRows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [result.insertId]);
        user = createdRows[0];
      }
    }

    res.json(toAuthResponse(user));
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [req.authUser?.userId ?? 0]);
    const user = rows[0];

    if (!user) {
      res.status(404).json({message: 'User not found'});
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        authProvider: user.auth_provider,
        avatarUrl: user.avatar_url,
        isPremium: Boolean(user.is_premium),
      },
    });
  } catch (error) {
    next(error);
  }
});
