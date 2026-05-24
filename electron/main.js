import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { registerDatabaseHandlers, seedInitialData } from './dbHandler.js';
import { runDrizzleMigrations } from './migrationRunner.js';
import { registerRealmHandlers, seedRealmData, closeRealm } from './realmHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
config({ path: path.join(__dirname, '../.env.local') });

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,              // Secure: use preload for IPC
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    title: 'maghzaccount-pro - نظام ERP محاسبي متكامل',
    frame: true,
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Register PostgreSQL IPC handlers (Drizzle ORM bridge)
  registerDatabaseHandlers();

  // Register Realm DB IPC handlers (local storage)
  registerRealmHandlers();

  // 1. Run Drizzle migrations on PostgreSQL
  try {
    await runDrizzleMigrations();
    await seedInitialData();
    console.log('[App] PostgreSQL (Drizzle) ready.');
  } catch (err) {
    console.error('[App] PostgreSQL migration failed:', err.message);
    console.warn('[App] PostgreSQL unavailable — Realm will serve as primary local store.');
  }

  // 2. Seed Realm local database
  try {
    await seedRealmData();
    console.log('[App] Realm local database ready.');
  } catch (err) {
    console.error('[App] Realm initialization failed:', err.message);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeRealm();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
