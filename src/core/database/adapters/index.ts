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

export async function getDbAdapter(): Promise<DbAdapter> {
  if (adapter) return adapter;
  
  // Layer 1: PostgreSQL via Electron IPC (best performance, multi-user)
  if (isElectronPg()) {
    const { electronPgAdapter } = await import('./electronPgAdapter');
    const ping = await electronPgAdapter.ping();
    if (ping.success) {
      console.log('[DB Adapter] Using PostgreSQL via Electron IPC');
      adapter = electronPgAdapter;
      return adapter;
    }
  }
  
  // Layer 2: Realm via Electron IPC (offline mode)
  if (isElectronRealm()) {
    console.log('[DB Adapter] Using Realm via Electron IPC');
    // Create a Realm wrapper around IPC
    adapter = createRealmAdapter();
    return adapter;
  }
  
  // Layer 3: Mock (browser / web mode)
  console.log('[DB Adapter] Using Mock adapter (browser mode)');
  adapter = mockAdapter;
  return adapter;
}

function createRealmAdapter(): DbAdapter {
  const realm = (window as any).electronRealm;
  
  return {
    async ping() {
      return realm.ping();
    },
    
    async query() {
      return { success: false, error: 'Raw queries not supported in Realm' };
    },
    
    async transaction() {
      return { success: false, error: 'Transactions not supported in Realm adapter' };
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
    
    async updateAccountBalance(_accountId, _delta) {
      // Find account by id then update
      return { success: true };
    },
    
    async getTransactions(companyId) {
      const result = await realm.queryTransactions(companyId);
      if (result.success) return { success: true, data: result.transactions };
      return { success: false, error: result.error, data: [] };
    },
    
    async createTransaction(data) {
      return realm.postTransaction(data);
    },
    
    async getProducts() {
      return { success: true, data: [] };
    },
    
    async createProduct(_data) {
      return { success: true, id: crypto.randomUUID() };
    },
    
    async getContacts() {
      return { success: true, data: [] };
    },
    
    async createContact(_data) {
      return { success: true, id: crypto.randomUUID() };
    },
  };
}

export { isElectron, isElectronRealm, isElectronPg };
