/**
 * realmHandler.js
 *
 * Realm DB Local Database Handler for Electron Main Process.
 * Acts as the LOCAL-FIRST fallback / cache layer when running as a desktop app.
 *
 * Schemas mirror the Drizzle/PostgreSQL structure but use Realm's object model.
 * IPC channels: realm:ping, realm:seed, realm:query-accounts, realm:query-logs,
 *               realm:write-account, realm:add-log
 */

import { ipcMain, app } from 'electron';
import path from 'path';

let Realm;
let realm = null;

// ─── Schema Definitions ──────────────────────────────────────────────────────

const CompanySchema = {
  name: 'Company',
  primaryKey: 'id',
  properties: {
    id: 'string',
    name: 'string',
    nameEn: 'string?',
    currency: { type: 'string', default: 'YER' },
    taxNumber: 'string?',
    address: 'string?',
    phone: 'string?',
    email: 'string?',
    createdAt: { type: 'date', default: () => new Date() },
  },
};

const UserSchema = {
  name: 'User',
  primaryKey: 'id',
  properties: {
    id: 'string',
    companyId: 'string?',
    username: 'string',
    email: 'string?',
    role: { type: 'string', default: 'accountant' },
    isActive: { type: 'bool', default: true },
    createdAt: { type: 'date', default: () => new Date() },
  },
};

const AccountSchema = {
  name: 'Account',
  primaryKey: 'id',
  properties: {
    id: 'string',
    companyId: 'string?',
    code: 'string',
    nameAr: 'string',
    nameEn: 'string?',
    parentId: 'string?',
    type: 'string', // asset, liability, equity, revenue, expense
    nature: 'string', // debit, credit
    isGroup: { type: 'bool', default: false },
    balance: { type: 'double', default: 0 },
    isActive: { type: 'bool', default: true },
    createdAt: { type: 'date', default: () => new Date() },
    updatedAt: { type: 'date', default: () => new Date() },
  },
};

const ActivityLogSchema = {
  name: 'ActivityLog',
  primaryKey: 'id',
  properties: {
    id: 'string',
    companyId: 'string?',
    userId: 'string?',
    userName: 'string?',
    action: 'string',
    module: 'string?',
    details: 'string?',
    createdAt: { type: 'date', default: () => new Date() },
  },
};

const ProductSchema = {
  name: 'Product',
  primaryKey: 'id',
  properties: {
    id: 'string',
    companyId: 'string?',
    code: 'string',
    nameAr: 'string',
    nameEn: 'string?',
    unit: { type: 'string', default: 'قطعة' },
    costPrice: { type: 'double', default: 0 },
    salePrice: { type: 'double', default: 0 },
    stockQty: { type: 'double', default: 0 },
    isActive: { type: 'bool', default: true },
    createdAt: { type: 'date', default: () => new Date() },
  },
};

const ContactSchema = {
  name: 'Contact',
  primaryKey: 'id',
  properties: {
    id: 'string',
    companyId: 'string?',
    type: 'string', // customer, vendor, both
    name: 'string',
    phone: 'string?',
    email: 'string?',
    address: 'string?',
    balance: { type: 'double', default: 0 },
    isActive: { type: 'bool', default: true },
    createdAt: { type: 'date', default: () => new Date() },
  },
};

const TransactionSchema = {
  name: 'Transaction',
  primaryKey: 'id',
  properties: {
    id: 'string',
    companyId: 'string?',
    date: 'date',
    reference: 'string?',
    description: 'string?',
    totalAmount: { type: 'double', default: 0 },
    status: { type: 'string', default: 'draft' }, // draft, posted, cancelled
    createdAt: { type: 'date', default: () => new Date() },
  },
};

const JournalEntrySchema = {
  name: 'JournalEntry',
  primaryKey: 'id',
  properties: {
    id: 'string',
    transactionId: 'string',
    accountId: 'string',
    debit: { type: 'double', default: 0 },
    credit: { type: 'double', default: 0 },
    memo: 'string?',
    createdAt: { type: 'date', default: () => new Date() },
  },
};

// ─── UUID Generator (without crypto dependency issues) ────────────────────────
function genId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ─── Open Realm ───────────────────────────────────────────────────────────────
async function openRealm() {
  if (realm && !realm.isClosed) return realm;

  try {
    // Dynamically import Realm (ESM compatible)
    const realmModule = await import('realm');
    Realm = realmModule.default || realmModule.Realm || realmModule;

    const realmPath = path.join(app.getPath('userData'), 'maghz_local.realm');
    console.log('[Realm] Opening local database at:', realmPath);

    realm = await Realm.open({
      path: realmPath,
      schema: [
        CompanySchema,
        UserSchema,
        AccountSchema,
        ActivityLogSchema,
        ProductSchema,
        ContactSchema,
        TransactionSchema,
        JournalEntrySchema,
      ],
      schemaVersion: 1,
    });

    console.log('[Realm] Local database opened successfully.');
    return realm;
  } catch (err) {
    console.error('[Realm] Failed to open database:', err.message);
    throw err;
  }
}

// ─── Seed Initial Data ────────────────────────────────────────────────────────
export async function seedRealmData() {
  const db = await openRealm();

  const existingCompanies = db.objects('Company');
  if (existingCompanies.length > 0) {
    console.log('[Realm] Data already seeded, skipping.');
    return existingCompanies[0].id;
  }

  console.log('[Realm] Seeding initial data with YER currency...');

  const companyId = genId();
  const adminId = genId();

  db.write(() => {
    // 1. Seed Company
    const company = db.create('Company', {
      id: companyId,
      name: 'شركة المغز التجارية المحدودة',
      nameEn: 'Maghz Trading Company Ltd.',
      currency: 'YER',
      taxNumber: '100123456789',
      address: 'صنعاء، الجمهورية اليمنية',
      phone: '+967712345678',
      email: 'info@maghz-erp.com',
      createdAt: new Date(),
    });

    // 2. Seed Admin User
    db.create('User', {
      id: adminId,
      companyId: companyId,
      username: 'مدير النظام',
      email: 'admin@maghz-erp.com',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
    });

    // 3. Seed Chart of Accounts
    const assetsId = genId();
    db.create('Account', { id: assetsId, companyId, code: '1', nameAr: 'الأصول', nameEn: 'Assets', type: 'asset', nature: 'debit', isGroup: true, balance: 0, createdAt: new Date(), updatedAt: new Date() });

    const curAssetsId = genId();
    db.create('Account', { id: curAssetsId, companyId, code: '11', nameAr: 'الأصول المتداولة', nameEn: 'Current Assets', parentId: assetsId, type: 'asset', nature: 'debit', isGroup: true, balance: 0, createdAt: new Date(), updatedAt: new Date() });

    const cashGroupId = genId();
    db.create('Account', { id: cashGroupId, companyId, code: '111', nameAr: 'الصندوق والبنوك', nameEn: 'Cash & Banks', parentId: curAssetsId, type: 'asset', nature: 'debit', isGroup: true, balance: 0, createdAt: new Date(), updatedAt: new Date() });

    db.create('Account', { id: genId(), companyId, code: '111001', nameAr: 'الصندوق الرئيسي', nameEn: 'Main Safe Cash', parentId: cashGroupId, type: 'asset', nature: 'debit', isGroup: false, balance: 5000000, createdAt: new Date(), updatedAt: new Date() });
    db.create('Account', { id: genId(), companyId, code: '111002', nameAr: 'حساب بنك الكريمي', nameEn: 'Al Karimi Bank Account', parentId: cashGroupId, type: 'asset', nature: 'debit', isGroup: false, balance: 12000000, createdAt: new Date(), updatedAt: new Date() });

    db.create('Account', { id: genId(), companyId, code: '2', nameAr: 'الالتزامات', nameEn: 'Liabilities', type: 'liability', nature: 'credit', isGroup: true, balance: 0, createdAt: new Date(), updatedAt: new Date() });

    const equityId = genId();
    db.create('Account', { id: equityId, companyId, code: '3', nameAr: 'حقوق الملكية', nameEn: 'Equity', type: 'equity', nature: 'credit', isGroup: true, balance: 0, createdAt: new Date(), updatedAt: new Date() });
    db.create('Account', { id: genId(), companyId, code: '311001', nameAr: 'رأس المال المدفوع', nameEn: 'Paid-in Capital', parentId: equityId, type: 'equity', nature: 'credit', isGroup: false, balance: 17000000, createdAt: new Date(), updatedAt: new Date() });

    const revenueId = genId();
    db.create('Account', { id: revenueId, companyId, code: '4', nameAr: 'الإيرادات', nameEn: 'Revenues', type: 'revenue', nature: 'credit', isGroup: true, balance: 0, createdAt: new Date(), updatedAt: new Date() });
    db.create('Account', { id: genId(), companyId, code: '411001', nameAr: 'مبيعات المنتجات', nameEn: 'Product Sales', parentId: revenueId, type: 'revenue', nature: 'credit', isGroup: false, balance: 0, createdAt: new Date(), updatedAt: new Date() });

    const expenseId = genId();
    db.create('Account', { id: expenseId, companyId, code: '5', nameAr: 'المصروفات', nameEn: 'Expenses', type: 'expense', nature: 'debit', isGroup: true, balance: 0, createdAt: new Date(), updatedAt: new Date() });
    db.create('Account', { id: genId(), companyId, code: '511001', nameAr: 'مصروفات الإيجار', nameEn: 'Rent Expense', parentId: expenseId, type: 'expense', nature: 'debit', isGroup: false, balance: 0, createdAt: new Date(), updatedAt: new Date() });
    db.create('Account', { id: genId(), companyId, code: '511002', nameAr: 'رواتب وأجور', nameEn: 'Salaries & Wages', parentId: expenseId, type: 'expense', nature: 'debit', isGroup: false, balance: 0, createdAt: new Date(), updatedAt: new Date() });

    // 4. Seed Activity Log
    db.create('ActivityLog', {
      id: genId(),
      companyId,
      userId: adminId,
      userName: 'النظام',
      action: 'تهيئة قاعدة البيانات المحلية Realm DB',
      module: 'الأساس (Core)',
      details: `تم إنشاء قاعدة البيانات المحلية (Realm) وتأسيس دليل الحسابات للشركة بالريال اليمني YER بنجاح.`,
      createdAt: new Date(),
    });
  });

  console.log('[Realm] Initial seeding completed with YER currency.');
  return companyId;
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
export function registerRealmHandlers() {
  // Ping / connectivity test
  ipcMain.handle('realm:ping', async () => {
    try {
      const db = await openRealm();
      const count = db.objects('Company').length;
      return { success: true, dbPath: db.path, companyCount: count };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Query all accounts
  ipcMain.handle('realm:query-accounts', async (_event, companyId) => {
    try {
      const db = await openRealm();
      let query = db.objects('Account');
      if (companyId) {
        query = query.filtered('companyId == $0', companyId);
      }
      const accounts = Array.from(query).map(acc => ({
        id: acc.id,
        companyId: acc.companyId,
        code: acc.code,
        nameAr: acc.nameAr,
        nameEn: acc.nameEn,
        parentId: acc.parentId,
        type: acc.type,
        nature: acc.nature,
        isGroup: acc.isGroup,
        balance: acc.balance,
      }));
      return { success: true, accounts };
    } catch (err) {
      return { success: false, error: err.message, accounts: [] };
    }
  });

  // Query recent activity logs
  ipcMain.handle('realm:query-logs', async (_event, limit = 5) => {
    try {
      const db = await openRealm();
      const logs = Array.from(db.objects('ActivityLog').sorted('createdAt', true)).slice(0, limit).map(log => ({
        id: log.id,
        userName: log.userName,
        action: log.action,
        module: log.module,
        details: log.details,
        timestamp: log.createdAt,
      }));
      return { success: true, logs };
    } catch (err) {
      return { success: false, error: err.message, logs: [] };
    }
  });

  // Query company info
  ipcMain.handle('realm:query-company', async () => {
    try {
      const db = await openRealm();
      const companies = db.objects('Company');
      if (companies.length === 0) return { success: false, error: 'No company found' };
      const comp = companies[0];
      return {
        success: true,
        company: {
          id: comp.id,
          name: comp.name,
          nameEn: comp.nameEn,
          currency: comp.currency,
          taxNumber: comp.taxNumber,
          address: comp.address,
          phone: comp.phone,
          email: comp.email,
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Update account balance (used for quick transactions)
  ipcMain.handle('realm:update-account-balance', async (_event, { companyId, code, delta }) => {
    try {
      const db = await openRealm();
      const accounts = db.objects('Account').filtered('code == $0 && companyId == $1', code, companyId);
      if (accounts.length === 0) return { success: false, error: `Account ${code} not found` };
      db.write(() => {
        accounts[0].balance += delta;
        accounts[0].updatedAt = new Date();
      });
      return { success: true, newBalance: accounts[0].balance };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Add activity log
  ipcMain.handle('realm:add-log', async (_event, { companyId, userId, userName, action, module: mod, details }) => {
    try {
      const db = await openRealm();
      let logId;
      db.write(() => {
        logId = genId();
        db.create('ActivityLog', {
          id: logId,
          companyId,
          userId: userId || 'system',
          userName: userName || 'النظام',
          action,
          module: mod,
          details,
          createdAt: new Date(),
        });
      });
      return { success: true, id: logId };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Add Account in Realm
  ipcMain.handle('realm:add-account', async (_event, { companyId, code, nameAr, nameEn, parentId, type, nature, isGroup }) => {
    try {
      const db = await openRealm();
      let accountId = genId();
      db.write(() => {
        db.create('Account', {
          id: accountId,
          companyId: companyId || null,
          code,
          nameAr,
          nameEn: nameEn || null,
          parentId: parentId || null,
          type,
          nature,
          isGroup: !!isGroup,
          balance: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
      return { success: true, id: accountId };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Query Transactions & Journal Entries in Realm
  ipcMain.handle('realm:query-transactions', async (_event, companyId) => {
    try {
      const db = await openRealm();
      let query = db.objects('Transaction');
      if (companyId) {
        query = query.filtered('companyId == $0', companyId);
      }
      const transactions = Array.from(query.sorted('date', true)).map(tx => {
        const entries = Array.from(db.objects('JournalEntry').filtered('transactionId == $0', tx.id)).map(je => ({
          id: je.id,
          accountId: je.accountId,
          debit: je.debit,
          credit: je.credit,
          memo: je.memo,
        }));
        return {
          id: tx.id,
          companyId: tx.companyId,
          date: tx.date,
          reference: tx.reference,
          description: tx.description,
          totalAmount: tx.totalAmount,
          status: tx.status,
          entries,
        };
      });
      return { success: true, transactions };
    } catch (err) {
      return { success: false, error: err.message, transactions: [] };
    }
  });

  // Post ACID Double-Entry Transaction in Realm & update balances
  ipcMain.handle('realm:post-transaction', async (_event, { companyId, date, reference, description, totalAmount, entries }) => {
    try {
      const db = await openRealm();
      const txId = genId();
      db.write(() => {
        // 1. Create Transaction
        db.create('Transaction', {
          id: txId,
          companyId: companyId || null,
          date: new Date(date),
          reference: reference || null,
          description: description || null,
          totalAmount: parseFloat(totalAmount) || 0,
          status: 'posted',
          createdAt: new Date(),
        });

        // 2. Create Journal Entries & update account balances
        for (const entry of entries) {
          const entryId = genId();
          db.create('JournalEntry', {
            id: entryId,
            transactionId: txId,
            accountId: entry.accountId,
            debit: parseFloat(entry.debit) || 0,
            credit: parseFloat(entry.credit) || 0,
            memo: entry.memo || null,
            createdAt: new Date(),
          });

          // Update balance of the account
          const accs = db.objects('Account').filtered('id == $0', entry.accountId);
          if (accs.length > 0) {
            const acc = accs[0];
            const deb = parseFloat(entry.debit) || 0;
            const cred = parseFloat(entry.credit) || 0;
            const delta = acc.nature === 'debit' ? (deb - cred) : (cred - deb);
            acc.balance += delta;
            acc.updatedAt = new Date();
          }
        }
      });
      return { success: true, id: txId };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  console.log('[Realm] IPC handlers registered.');
}

// ─── Close on Exit ────────────────────────────────────────────────────────────
export function closeRealm() {
  if (realm && !realm.isClosed) {
    realm.close();
    realm = null;
    console.log('[Realm] Local database closed.');
  }
}
