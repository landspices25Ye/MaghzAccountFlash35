import type { DbAdapter } from './types';
import { mockAdapter } from './mockAdapter';

/**
 * Database Adapter Factory
 * Layers: PostgreSQL (Electron IPC) → Mock (Browser)
 * No longer supports Realm — PostgreSQL is the sole production database.
 */

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronEnv?.isElectron;
}

function isElectronPg(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronDB?.ping;
}

let adapter: DbAdapter | null = null;
let adapterType: 'pg' | 'mock' | null = null;

export async function getDbAdapter(): Promise<DbAdapter> {
  // Stale adapter? reset for retry
  if (adapter && adapterType === 'pg') {
    try {
      const ping = await adapter.ping();
      if (ping.success) return adapter;
    } catch { /* stale */ }
    adapter = null;
    adapterType = null;
  }

  // Don't get stuck on mock — always retry PG if available next call
  if (adapter && adapterType === 'mock') {
    adapter = null;
    adapterType = null;
  }

  // Layer 1: PostgreSQL via Electron IPC (production, multi-user)
  if (isElectronPg()) {
    try {
      const { electronPgAdapter } = await import('./electronPgAdapter');
      const ping = await electronPgAdapter.ping();
      if (ping.success) {
        console.log('[DB Adapter] PostgreSQL via Electron IPC');
        adapter = electronPgAdapter;
        adapterType = 'pg';
        return adapter;
      }
    } catch (err) {
      console.warn('[DB Adapter] PG unavailable:', err);
    }
  }

  // Layer 2: Mock (browser / dev)
  console.log('[DB Adapter] Mock adapter (browser mode)');
  adapter = mockAdapter;
  adapterType = 'mock';
  return adapter;
}

export { isElectron, isElectronPg };
