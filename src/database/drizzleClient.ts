/**
 * drizzleClient.ts
 * 
 * Drizzle ORM client - runs ONLY in Electron main process via IPC.
 * Exported to be used from dbHandler.js or directly from Node.js context.
 * 
 * In the renderer (React), always use pgClient.ts which routes via IPC.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: InstanceType<typeof Pool> | null = null;

export function getDrizzleClient() {
  if (_db) return _db;

  _pool = new Pool({
    host: process.env.VITE_DB_HOST || 'localhost',
    port: parseInt(process.env.VITE_DB_PORT || '5432'),
    database: process.env.VITE_DB_NAME || 'MaghzAccountFlash35',
    user: process.env.VITE_DB_USER || 'Maghz',
    password: process.env.VITE_DB_PASSWORD || 'Zaamla2026',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  _db = drizzle(_pool, { schema });
  return _db;
}

export function getPool() {
  if (!_pool) getDrizzleClient();
  return _pool!;
}
