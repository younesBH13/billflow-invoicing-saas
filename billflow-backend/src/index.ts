// billflow-backend/src/index.ts

import express from 'express';
import cors, { CorsOptions } from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database';
import routes from './routes';
import path from 'path';
import fs from 'fs';


dotenv.config();

const app = express();

const parseAllowedOrigins = (value: string | undefined): string[] =>
  value
    ?.split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0) ?? [];

const allowedOrigins = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);
const allowAllOrigins = allowedOrigins.length === 0 || allowedOrigins.includes('*');
const effectiveAllowedOrigins = allowAllOrigins ? ['http://localhost:5173'] : allowedOrigins;

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow empty origin (like same-origin or server-to-server)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check against allowed origins list or localhost/127.0.0.1 for dev
    if (
      allowAllOrigins ||
      effectiveAllowedOrigins.includes(origin) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      callback(null, true);
      return;
    }

    console.warn(`Blocked request from disallowed origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Mount your API routes under /api
app.use('/api', routes);

// ===== Serve Frontend (production build) =====
const clientDistPath = path.resolve(__dirname, '../../billflow-client-scribe/dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // SPA fallback (React routes)
  app.get('*', (req, res) => {
    // Keep API routes untouched
    if (req.path.startsWith('/api')) return res.status(404).end();
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  console.warn('⚠️ Frontend dist not found. Build frontend first: billflow-client-scribe -> npm run build');
}


const parsePort = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isPortInUseError = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as NodeJS.ErrnoException).code === 'EADDRINUSE';

const listenOnPort = (port: number): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(port));

    server.on('error', (error) => {
      server.close();
      reject(Object.assign(error, { port }));
    });
  });

const startServer = async () => {
  console.log('🚀 Starting BillFlow Backend API...');
  try {
    await initializeDatabase();
    console.log('✅ Database schema ready');

    const configuredPort = parsePort(process.env.PORT, 3001);
    const allowFallbackPorts = !process.env.PORT;
    const candidatePorts = allowFallbackPorts
      ? [configuredPort, configuredPort + 1, configuredPort + 2, configuredPort + 3]
      : [configuredPort];

    let selectedPort: number | undefined;
    const conflictingPorts: number[] = [];

    for (const candidate of candidatePorts) {
      try {
        selectedPort = await listenOnPort(candidate);
        break;
      } catch (error) {
        if (isPortInUseError(error)) {
          conflictingPorts.push(candidate);
          console.warn(`⚠️ Port ${candidate} is already in use. Attempting another port...`);
          continue;
        }

        throw error;
      }
    }

    if (!selectedPort) {
      console.error(
        '❌ Failed to start server: all candidate ports are in use. '
        + `Please stop the process using port${conflictingPorts.length > 1 ? 's' : ''} ${conflictingPorts.join(', ')} `
        + 'or set a different PORT in your environment.'
      );
      process.exit(1);
    }

    console.log(`✅ Server running on http://0.0.0.0:${selectedPort}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 API available at: http://localhost:${selectedPort}/api`);
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
// trigger nodemon restart
