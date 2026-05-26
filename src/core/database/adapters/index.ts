import type { DbAdapter } from './types';
import { mockAdapter } from './mockAdapter';

/**
 * Database Adapter Factory
 * Automatically selects the best available adapter based on environment
 */

// Detect environment
function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronEnv?.isElectron;
}

function isElectronRealm(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronRealm?.ping;
}

function isElectronPg(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronDB?.ping;
}

// Create adapters lazily
let adapter: DbAdapter | null = null;
let adapterType: 'pg' | 'realm' | 'mock' | null = null;

export async function getDbAdapter(): Promise<DbAdapter> {
  // If we already have a working mock adapter, return it
  if (adapter && adapterType === 'mock') return adapter;

  // Reset if previous adapter failed (allows retry)
  if (adapter && adapterType !== 'mock') {
    adapter = null;
    adapterType = null;
  }

  // Layer 1: PostgreSQL via Electron IPC (best performance, multi-user)
  if (isElectronPg()) {
    try {
      const { electronPgAdapter } = await import('./electronPgAdapter');
      const ping = await electronPgAdapter.ping();
      if (ping.success) {
        console.log('[DB Adapter] Using PostgreSQL via Electron IPC');
        adapter = electronPgAdapter;
        adapterType = 'pg';
        return adapter;
      }
    } catch (err) {
      console.warn('[DB Adapter] Electron PG failed, falling back:', err);
    }
  }

  // Layer 2: Realm via Electron IPC (offline mode)
  if (isElectronRealm()) {
    try {
      const realm = (window as any).electronRealm;
      const ping = await realm.ping();
      if (ping.success) {
        console.log('[DB Adapter] Using Realm via Electron IPC');
        adapter = createRealmAdapter();
        adapterType = 'realm';
        return adapter;
      }
    } catch (err) {
      console.warn('[DB Adapter] Electron Realm failed, falling back:', err);
    }
  }

  // Layer 3: Mock (browser / web mode)
  console.log('[DB Adapter] Using Mock adapter (browser mode)');
  adapter = mockAdapter;
  adapterType = 'mock';
  return adapter;
}

function createRealmAdapter(): DbAdapter {
  const realm = (window as any).electronRealm;
  const fallback = mockAdapter;
  
  return {
    async ping() {
      return realm.ping();
    },
    
    // Delegate raw SQL queries to mock adapter (supports products, contacts, employees, warehouses, etc.)
    async query(sql, params) {
      return fallback.query(sql, params);
    },
    
    // Delegate transactions to mock adapter
    async transaction(queries) {
      return fallback.transaction(queries);
    },
    
    async getCompany() {
      const result = await realm.queryCompany();
      if (result.success) return { success: true, data: result.company };
      return { success: false, error: result.error };
    },
    
    async getAccounts(companyId) {
      const result = await realm.queryAccounts(companyId);
      if (result.success) return { success: true, data: result.accounts };
      return { success: false, error: result.error, data: [] };
    },
    
    async createAccount(data) {
      return realm.addAccount(data);
    },
    
    async updateAccountBalance(accountId, delta) {
      return fallback.updateAccountBalance(accountId, delta);
    },
    
    async getTransactions(companyId) {
      const result = await realm.queryTransactions(companyId);
      if (result.success) return { success: true, data: result.transactions };
      return { success: false, error: result.error, data: [] };
    },
    
    async createTransaction(data) {
      return realm.postTransaction(data);
    },
    
    // Delegate to mock adapter for tables not supported by Realm
    async getProducts(companyId) {
      return fallback.getProducts(companyId);
    },
    
    async createProduct(data) {
      return fallback.createProduct(data);
    },
    
    async getContacts(companyId, type) {
      return fallback.getContacts(companyId, type);
    },
    
    async createContact(data) {
      return fallback.createContact(data);
    },
  };
}

export { isElectron, isElectronRealm, isElectronPg };
