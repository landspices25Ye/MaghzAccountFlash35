import type { DbAdapter } from './types';

/**
 * Database Adapter Factory
 * PostgreSQL (Electron IPC) is the ONLY supported database.
 * No in-memory/mock fallback — the app requires a live PostgreSQL connection.
 */

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronEnv?.isElectron;
}

function isElectronPg(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronDB?.ping;
}

let adapter: DbAdapter | null = null;

export async function getDbAdapter(): Promise<DbAdapter> {
  // Reuse existing working adapter
  if (adapter) {
    try {
      const ping = await adapter.ping();
      if (ping.success) return adapter;
    } catch { /* stale */ }
    adapter = null;
  }

  // PostgreSQL via Electron IPC (production)
  if (isElectronPg()) {
    try {
      const { electronPgAdapter } = await import('./electronPgAdapter');
      const ping = await electronPgAdapter.ping();
      if (ping.success) {
        console.log('[DB Adapter] PostgreSQL via Electron IPC');
        adapter = electronPgAdapter;
        return adapter;
      }
    } catch (err) {
      console.warn('[DB Adapter] PG unavailable:', err);
    }
  }

  throw new Error(
    'PostgreSQL غير متوفر. تأكد من تشغيل Electron وقاعدة البيانات.'
  );
}

export { isElectron, isElectronPg };
