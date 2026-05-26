const { contextBridge, ipcRenderer } = require('electron');

// ─── PostgreSQL via Drizzle ORM (IPC Bridge) ─────────────────────────────────
contextBridge.exposeInMainWorld('electronDB', {
  ping: () => ipcRenderer.invoke('db:ping'),
  query: (sql, params = []) => ipcRenderer.invoke('db:query', { sql, params }),
  transaction: (queries) => ipcRenderer.invoke('db:transaction', queries),
  testConnection: (config) => ipcRenderer.invoke('db:test-connection', config),
  updateConfig: (config) => ipcRenderer.invoke('db:update-config', config),
  seedDefault: () => ipcRenderer.invoke('db:seed-default'),
  seedDemo: () => ipcRenderer.invoke('db:seed-demo'),
  getDbInfo: () => ipcRenderer.invoke('db:info'),
});

// ─── Realm DB Local Storage (IPC Bridge) ─────────────────────────────────────
contextBridge.exposeInMainWorld('electronRealm', {
  ping: () => ipcRenderer.invoke('realm:ping'),

  queryAccounts: (companyId) =>
    ipcRenderer.invoke('realm:query-accounts', companyId),

  queryLogs: (limit = 5) =>
    ipcRenderer.invoke('realm:query-logs', limit),

  queryCompany: () =>
    ipcRenderer.invoke('realm:query-company'),

  updateAccountBalance: (payload) =>
    ipcRenderer.invoke('realm:update-account-balance', payload),

  addLog: (payload) =>
    ipcRenderer.invoke('realm:add-log', payload),

  addAccount: (payload) =>
    ipcRenderer.invoke('realm:add-account', payload),

  queryTransactions: (companyId) =>
    ipcRenderer.invoke('realm:query-transactions', companyId),

  postTransaction: (payload) =>
    ipcRenderer.invoke('realm:post-transaction', payload),
});

// ─── App Environment Info ─────────────────────────────────────────────────────
contextBridge.exposeInMainWorld('electronEnv', {
  isElectron: true,
  platform: process.platform,
});
