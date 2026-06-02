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
  clearAll: () => ipcRenderer.invoke('db:clear-all'),
  getDbInfo: () => ipcRenderer.invoke('db:info'),
});

// ─── App Environment Info ─────────────────────────────────────────────────────
contextBridge.exposeInMainWorld('electronEnv', {
  isElectron: true,
  platform: process.platform,
});
