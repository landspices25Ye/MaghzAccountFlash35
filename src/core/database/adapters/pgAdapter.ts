import { Pool } from 'pg';

const pool = new Pool({
  host: import.meta.env.VITE_DB_HOST || 'localhost',
  port: Number(import.meta.env.VITE_DB_PORT || '5432'),
  database: import.meta.env.VITE_DB_NAME || 'maghzaccount',
  user: import.meta.env.VITE_DB_USER || 'postgres',
  password: import.meta.env.VITE_DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected pool error:', err.message);
});

export async function pgPing(): Promise<{ success: boolean; message?: string }> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time');
    client.release();
    return { success: true, message: result.rows[0].time };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function pgQuery<T = any>(sql: string, params?: any[]): Promise<{ success: boolean; rows?: T[]; error?: string }> {
  try {
    const result = await pool.query(sql, params || []);
    return { success: true, rows: result.rows as T[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function pgTransaction(queries: { sql: string; params?: any[] }[]): Promise<{ success: boolean; results?: any[]; error?: string }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    for (const q of queries) {
      const res = await client.query(q.sql, q.params || []);
      results.push(res.rows);
    }
    await client.query('COMMIT');
    return { success: true, results };
  } catch (err: any) {
    await client.query('ROLLBACK');
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

export { pool };
