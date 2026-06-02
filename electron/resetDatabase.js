import dotenv from 'dotenv';
import { Client } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { runDrizzleMigrations } from './migrationRunner.js';
import { seedComprehensiveDemoData } from './seedDemoData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

function getEnvVar(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

async function dropAndCreateDatabase() {
  const host = getEnvVar('DB_HOST');
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = getEnvVar('DB_USER');
  const password = getEnvVar('DB_PASSWORD');
  const dbName = getEnvVar('DB_NAME');

  const adminClient = new Client({ host, port, database: 'postgres', user, password });
  await adminClient.connect();
  console.log(`[DB] Connected to ${host}:${port} as ${user} (postgres db)`);

  try {
    console.log(`[DB] Terminating connections to database ${dbName}...`);
    await adminClient.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid();`, [dbName]);

    console.log(`[DB] Dropping database ${dbName} if exists...`);
    await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}";`);

    console.log(`[DB] Creating database ${dbName}...`);
    await adminClient.query(`CREATE DATABASE "${dbName}";`);

    console.log('[DB] Drop and recreate completed.');
  } finally {
    await adminClient.end();
  }
}

async function seedDatabase() {
  const host = getEnvVar('DB_HOST');
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = getEnvVar('DB_USER');
  const password = getEnvVar('DB_PASSWORD');
  const dbName = getEnvVar('DB_NAME');

  const client = new Client({ host, port, database: dbName, user, password });
  await client.connect();
  console.log(`[DB] Connected to ${dbName} for seeding.`);

  try {
    // create or get demo company (safe: SELECT then INSERT — avoids ON CONFLICT on non-unique column)
    const companyName = process.env.DEMO_COMPANY_NAME || 'Demo Company';
    let sel = await client.query(`SELECT id FROM companies WHERE name = $1 LIMIT 1`, [companyName]);
    let companyId = sel.rows[0] && sel.rows[0].id ? sel.rows[0].id : null;

    if (!companyId) {
      const insertRes = await client.query(
        `INSERT INTO companies (name, name_en, currency, tax_number, address, phone, email)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;`,
        [companyName, companyName, 'YER', process.env.DEMO_TAX || '', process.env.DEMO_ADDRESS || '', process.env.DEMO_PHONE || '', process.env.DEMO_EMAIL || 'demo@example.com']
      );
      companyId = insertRes.rows[0] && insertRes.rows[0].id ? insertRes.rows[0].id : null;
    }

    if (!companyId) throw new Error('Could not determine company id for seeding');

    console.log('[DB] Seeding demo data (this may take a while)...');
    await seedComprehensiveDemoData(client, companyId);
    console.log('[DB] Seeding finished.');
  } finally {
    await client.end();
  }
}

async function main() {
  try {
    console.log('[DB] Starting reset process...');
    await dropAndCreateDatabase();

    console.log('[DB] Running migrations...');
    await runDrizzleMigrations();

    console.log('[DB] Running seeders...');
    await seedDatabase();

    console.log('[DB] Reset completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[DB] Reset failed:', err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || !process.env.JEST_WORKER_ID) {
  main();
}
