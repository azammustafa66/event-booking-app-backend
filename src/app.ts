import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { mainRouter } from './routes';

const app = express();

app.use(
  express.json(),
  express.urlencoded({ extended: true }),
  cors({
    // CORS_ORIGIN supports multiple origins as a comma-separated string (e.g. "https://app.com,https://admin.app.com")
    origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
  cookieParser(),
);
app.use('/api/v1', mainRouter);

app.get('/', (_req, res, _next) =>
  res.status(200).json({
    message: 'Server up and running',
  }),
);

export default app;
