# Velo Code Backend

Backend API for authentication and user accounts (MySQL + JWT + Google sign-in token flow).

## Features
- Email/password signup
- Email/password login
- Continue with Google (`idToken` verification)
- Authenticated `me` endpoint

## Setup
1. Copy `.env.example` to `.env` and update values.
2. Install packages:
   - `npm install`
3. Initialize database tables:
   - `npm run db:init`
4. Start backend:
   - `npm run dev`

Default server URL: `http://localhost:4000`

## API
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/me` (Bearer token)
- `GET /api/health`

## Notes
- This backend is isolated in `backend/` and does not modify the frontend layout.
- iOS/Android/desktop packaging can call this API once deployed.
