import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runDrizzleMigrations() {
  console.log('[Drizzle] Starting PostgreSQL database migrations...');
  const pool = new Pool({
    host: process.env.VITE_DB_HOST || 'localhost',
    port: parseInt(process.env.VITE_DB_PORT || '5432'),
    database: process.env.VITE_DB_NAME || 'MaghzAccountFlash35',
    user: process.env.VITE_DB_USER || 'Maghz',
    password: process.env.VITE_DB_PASSWORD || 'Zaamla2026',
  });

  const db = drizzle(pool);

  // Path to the drizzle migrations folder
  const migrationsFolder = path.join(__dirname, '../drizzle');
  
  try {
    console.log('[Drizzle] Applying migrations from:', migrationsFolder);
    await migrate(db, { migrationsFolder });
    console.log('[Drizzle] Database schema is fully up to date.');
  } catch (err) {
    console.error('[Drizzle] Running migrations encountered an error:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}
