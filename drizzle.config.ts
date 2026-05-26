import { config } from 'dotenv';
config({ path: ['.env.local', '.env'] });
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/core/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.VITE_DB_HOST || 'localhost',
    port: parseInt(process.env.VITE_DB_PORT || '5432'),
    database: process.env.VITE_DB_NAME || 'MaghzAccountFlash35',
    user: process.env.VITE_DB_USER || 'maghz',
    password: process.env.VITE_DB_PASSWORD || 'Zaamla2026',
    ssl: false,
  },
});
