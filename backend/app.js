import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { config } from './config.js';
import { createAuthRoutes } from './routes/authRoutes.js';
import { createMezzoteamRoutes } from './routes/mezzoteamRoutes.js';
import { createTrimbleRoutes } from './routes/trimbleRoutes.js';

function resolveFrontendUrl() {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:5173';
}

const frontendUrl = resolveFrontendUrl();
const isDeployed = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';

const app = express();

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);
app.use(express.json({ limit: '25mb' }));
app.use(cookieParser());
app.use(
  session({
    name: 'mezzoteam.sid',
    secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isDeployed,
      sameSite: isDeployed ? 'lax' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

const authRouter = express.Router();
createAuthRoutes(authRouter);
app.use('/api/auth', authRouter);

const mezzoteamRouter = express.Router();
createMezzoteamRoutes(mezzoteamRouter);
app.use('/api/mezzoteam', mezzoteamRouter);

const trimbleRouter = express.Router();
createTrimbleRoutes(trimbleRouter);
app.use('/api/trimble', trimbleRouter);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'trimble-mezzoteam-proxy',
    mockMezzoteam: config.useMockMezzoteam,
    mockTrimble: config.useMockTrimble,
    mezzoteamApiVersion: config.mezzoteamApiVersion,
  });
});

export default app;
