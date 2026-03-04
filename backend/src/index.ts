import cors from 'cors';
import express, {type NextFunction, type Request, type Response} from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import {env} from './config/env.js';
import {pool} from './db/pool.js';
import {authRouter} from './routes/auth.routes.js';
import {healthRouter} from './routes/health.routes.js';

const app = express();

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({limit: '1mb'}));

app.get('/', (_req, res) => {
  res.json({name: 'Velo Code Backend', status: 'running'});
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({message: 'Internal server error'});
});

const server = app.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`);
});

process.on('SIGINT', async () => {
  server.close();
  await pool.end();
  process.exit(0);
});
