import cors from '@fastify/cors';
import Fastify from 'fastify';
import { registerHealthRoutes } from './routes/health.js';
import { registerPlayerRoutes } from './routes/players.js';
import { createPool } from './database/pool.js';

export async function createServer() {
  const app = Fastify({ logger: true });
  const pool = createPool();

  await app.register(cors, { origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' });
  app.addHook('onClose', async () => pool?.end());
  await app.register(registerHealthRoutes);
  await app.register(registerPlayerRoutes, { pool });

  return app;
}

