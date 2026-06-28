import type { Plugin, ViteDevServer } from 'vite';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FORBIDDEN_SQL_PATTERNS = [
  /\bDROP\b/i,
  /\bALTER\b/i,
  /\bTRUNCATE\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bCREATE\b\s+(?:TABLE|INDEX|DATABASE|USER|ROLE|FUNCTION|PROCEDURE|TRIGGER|VIEW)\b/i,
  /\bINSERT\b\s+INTO\s+(?:pg_|information_schema)\./i,
  /\bDELETE\b\s+FROM\s+(?:pg_|information_schema)\./i,
];

function isSqlAllowed(sql: string): boolean {
  const trimmed = (sql || '').trim();
  if (!trimmed) return false;
  for (const pattern of FORBIDDEN_SQL_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }
  return true;
}

interface E2EPluginOptions {
  envPath?: string;
}

export function e2eDbBridge(options: E2EPluginOptions = {}): Plugin {
  let pool: Pool | null = null;

  return {
    name: 'maghz-e2e-db-bridge',
    apply: 'serve',

    async configureServer(server: ViteDevServer) {
      loadEnv({ path: options.envPath ?? path.resolve(__dirname, '../.env.local') });

      const config = {
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        database: process.env.DB_NAME ?? 'MaghzAccountFlash35',
        user: process.env.DB_USER ?? 'maghz',
        password: process.env.DB_PASSWORD ?? '',
      };

      pool = new Pool(config);
      server.middlewares.use('/__e2e/db', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ success: false, error: 'POST only' }));
          return;
        }
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as { sql: string; params?: unknown[] };
          if (!isSqlAllowed(body.sql)) {
            res.statusCode = 403;
            res.end(JSON.stringify({ success: false, error: 'SQL operation not permitted' }));
            return;
          }
          if (!pool) throw new Error('Pool not initialized');
          const result = await pool.query(body.sql, body.params ?? []);
          res.end(JSON.stringify({ success: true, rows: result.rows, rowCount: result.rowCount ?? 0 }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: (err as Error).message }));
        }
      });

      server.middlewares.use('/__e2e/ping', async (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        try {
          if (!pool) throw new Error('Pool not initialized');
          const r = await pool.query('SELECT current_database() AS db, version() AS version');
          res.end(JSON.stringify({ success: true, db: r.rows[0]?.db, version: r.rows[0]?.version }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: (err as Error).message }));
        }
      });
    },

    transformIndexHtml() {
      const shimCode = `(function(){if(window.electronDB)return;const post=async(s,p)=>{const r=await fetch('/__e2e/db',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:s,params:p||[]})});return r.json();};window.electronDB={ping:async()=>(await fetch('/__e2e/ping')).json(),_exec:async(s,p)=>{const r=await post(s,p||[]);return{success:r.success,rows:r.rows,rowCount:r.rowCount||0,error:r.error};},_execBatch:async(qs)=>{const r=[];for(const q of qs){const x=await post(q.sql,q.params||[]);if(!x.success)return{success:false,error:x.error};r.push({rows:x.rows,rowCount:x.rowCount||0});}return{success:true,results:r};},testConnection:async()=>({success:true}),updateConfig:async()=>({success:true}),seedDefault:async()=>({success:true}),seedDemo:async()=>({success:true}),clearAll:async()=>({success:true}),getDbInfo:async()=>({success:true,info:{mode:'e2e-bridge'}})},window.electronEnv={isElectron:false,platform:'web',e2e:true};})();`;
      return [
        {
          tag: 'script',
          attrs: { type: 'text/javascript' },
          children: shimCode,
          injectTo: 'head-prepend',
        },
      ];
    },

    async closeBundle() {
      if (pool) {
        await pool.end();
        pool = null;
      }
    },
  };
}
