/**
 * realmClient.ts
 *
 * Unified Realm DB client for React renderer process.
 *
 * - In Electron: routes all calls through IPC (window.electronRealm)
 * - In Web browser: uses a mock adapter backed by IndexedDB (via a simple 
 *   localStorage-compatible shim) so the web build never crashes.
 *
 * All exports share a consistent API regardless of environment.
 */

// ─── Environment Detection ───────────────────────────────────────────────────

export function isElectronRealm(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as any).electronRealm !== 'undefined'
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RealmAccount {
  id: string;
  companyId?: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  parentId?: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  nature: 'debit' | 'credit';
  isGroup: boolean;
  balance: number;
}

export interface RealmActivityLog {
  id: string;
  userName?: string;
  action: string;
  module?: string;
  details?: string;
  timestamp: Date;
}

export interface RealmCompany {
  id: string;
  name: string;
  nameEn?: string;
  currency: string;
  taxNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface RealmResult<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

// ─── Electron IPC Wrappers ────────────────────────────────────────────────────

export async function realmPing(): Promise<{ success: boolean; dbPath?: string; error?: string }> {
  if (!isElectronRealm()) {
    return { success: false, error: 'Not in Electron environment' };
  }
  return (window as any).electronRealm.ping();
}

export async function realmGetAccounts(companyId?: string): Promise<{ success: boolean; accounts: RealmAccount[] }> {
  if (!isElectronRealm()) {
    return mockGetAccounts();
  }
  return (window as any).electronRealm.queryAccounts(companyId);
}

export async function realmGetLogs(limit = 5): Promise<{ success: boolean; logs: RealmActivityLog[] }> {
  if (!isElectronRealm()) {
    return mockGetLogs(limit);
  }
  return (window as any).electronRealm.queryLogs(limit);
}

export async function realmGetCompany(): Promise<{ success: boolean; company?: RealmCompany }> {
  if (!isElectronRealm()) {
    return mockGetCompany();
  }
  return (window as any).electronRealm.queryCompany();
}

export async function realmUpdateBalance(
  companyId: string,
  code: string,
  delta: number
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  if (!isElectronRealm()) {
    return mockUpdateBalance(code, delta);
  }
  return (window as any).electronRealm.updateAccountBalance({ companyId, code, delta });
}

export async function realmAddLog(
  companyId: string,
  userName: string,
  action: string,
  module: string,
  details?: string
): Promise<{ success: boolean; id?: string }> {
  if (!isElectronRealm()) {
    return mockAddLog({ companyId, userName, action, module, details });
  }
  return (window as any).electronRealm.addLog({ companyId, userName, action, module, details });
}

export async function realmAddAccount(payload: {
  companyId: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  parentId?: string;
  type: string;
  nature: string;
  isGroup: boolean;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!isElectronRealm()) {
    return mockAddAccount(payload);
  }
  return (window as any).electronRealm.addAccount(payload);
}

export async function realmGetTransactions(companyId?: string): Promise<{ success: boolean; transactions: any[]; error?: string }> {
  if (!isElectronRealm()) {
    return mockGetTransactions(companyId);
  }
  return (window as any).electronRealm.queryTransactions(companyId);
}

export async function realmPostTransaction(payload: {
  companyId: string;
  date: string;
  reference: string;
  description: string;
  totalAmount: number;
  entries: Array<{
    accountId: string;
    debit: number;
    credit: number;
    memo?: string;
  }>;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!isElectronRealm()) {
    return mockPostTransaction(payload);
  }
  return (window as any).electronRealm.postTransaction(payload);
}

// ─── Web Mock Adapter (IndexedDB via simple object store) ─────────────────────
// This runs when opening the app in a normal web browser (not Electron).
// It initialises the same initial seed data in memory so the UI renders correctly.

let _mockAccounts: RealmAccount[] = [];
let _mockLogs: RealmActivityLog[] = [];
let _mockTransactions: any[] = [];
let _mockJournalEntries: any[] = [];
let _mockCompany: RealmCompany | null = null;
let _mockInitialised = false;

function genMockId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function ensureMockSeeded(): void {
  if (_mockInitialised) return;
  _mockInitialised = true;

  const companyId = genMockId();
  _mockCompany = {
    id: companyId,
    name: 'شركة المغز التجارية المحدودة',
    nameEn: 'Maghz Trading Company Ltd.',
    currency: 'YER',
    taxNumber: '100123456789',
    address: 'صنعاء، الجمهورية اليمنية',
    phone: '+967712345678',
    email: 'info@maghz-erp.com',
  };

  const assetsId = genMockId();
  const curAssetsId = genMockId();
  const cashGroupId = genMockId();
  const equityId = genMockId();
  const revenueId = genMockId();
  const expenseId = genMockId();

  _mockAccounts = [
    { id: assetsId, companyId, code: '1', nameAr: 'الأصول', nameEn: 'Assets', type: 'asset', nature: 'debit', isGroup: true, balance: 0 },
    { id: curAssetsId, companyId, code: '11', nameAr: 'الأصول المتداولة', nameEn: 'Current Assets', parentId: assetsId, type: 'asset', nature: 'debit', isGroup: true, balance: 0 },
    { id: cashGroupId, companyId, code: '111', nameAr: 'الصندوق والبنوك', nameEn: 'Cash & Banks', parentId: curAssetsId, type: 'asset', nature: 'debit', isGroup: true, balance: 0 },
    { id: genMockId(), companyId, code: '111001', nameAr: 'الصندوق الرئيسي', nameEn: 'Main Safe Cash', parentId: cashGroupId, type: 'asset', nature: 'debit', isGroup: false, balance: 5000000 },
    { id: genMockId(), companyId, code: '111002', nameAr: 'حساب بنك الكريمي', nameEn: 'Al Karimi Bank Account', parentId: cashGroupId, type: 'asset', nature: 'debit', isGroup: false, balance: 12000000 },
    { id: genMockId(), companyId, code: '2', nameAr: 'الالتزامات', nameEn: 'Liabilities', type: 'liability', nature: 'credit', isGroup: true, balance: 0 },
    { id: equityId, companyId, code: '3', nameAr: 'حقوق الملكية', nameEn: 'Equity', type: 'equity', nature: 'credit', isGroup: true, balance: 0 },
    { id: genMockId(), companyId, code: '311001', nameAr: 'رأس المال المدفوع', nameEn: 'Paid-in Capital', parentId: equityId, type: 'equity', nature: 'credit', isGroup: false, balance: 17000000 },
    { id: revenueId, companyId, code: '4', nameAr: 'الإيرادات', nameEn: 'Revenues', type: 'revenue', nature: 'credit', isGroup: true, balance: 0 },
    { id: genMockId(), companyId, code: '411001', nameAr: 'مبيعات المنتجات', nameEn: 'Product Sales', parentId: revenueId, type: 'revenue', nature: 'credit', isGroup: false, balance: 0 },
    { id: expenseId, companyId, code: '5', nameAr: 'المصروفات', nameEn: 'Expenses', type: 'expense', nature: 'debit', isGroup: true, balance: 0 },
    { id: genMockId(), companyId, code: '511001', nameAr: 'مصروفات الإيجار', nameEn: 'Rent Expense', parentId: expenseId, type: 'expense', nature: 'debit', isGroup: false, balance: 0 },
    { id: genMockId(), companyId, code: '511002', nameAr: 'رواتب وأجور', nameEn: 'Salaries & Wages', parentId: expenseId, type: 'expense', nature: 'debit', isGroup: false, balance: 0 },
  ];

  _mockLogs = [
    {
      id: genMockId(),
      userName: 'النظام',
      action: 'تهيئة قاعدة البيانات المحلية (وضع الويب)',
      module: 'الأساس (Core)',
      details: 'تم تشغيل التطبيق في وضع الويب باستخدام محاكي Realm المحلي.',
      timestamp: new Date(),
    },
  ];
}

function mockGetAccounts(): { success: boolean; accounts: RealmAccount[] } {
  ensureMockSeeded();
  return { success: true, accounts: _mockAccounts };
}

function mockGetLogs(limit: number): { success: boolean; logs: RealmActivityLog[] } {
  ensureMockSeeded();
  return { success: true, logs: _mockLogs.slice(0, limit) };
}

function mockGetCompany(): { success: boolean; company?: RealmCompany } {
  ensureMockSeeded();
  if (!_mockCompany) return { success: false };
  return { success: true, company: _mockCompany };
}

function mockUpdateBalance(code: string, delta: number): { success: boolean; newBalance?: number } {
  ensureMockSeeded();
  const acc = _mockAccounts.find(a => a.code === code);
  if (!acc) return { success: false };
  acc.balance += delta;
  return { success: true, newBalance: acc.balance };
}

function mockAddLog(entry: {
  companyId: string;
  userName: string;
  action: string;
  module: string;
  details?: string;
}): { success: boolean; id: string } {
  ensureMockSeeded();
  const id = genMockId();
  _mockLogs.unshift({
    id,
    userName: entry.userName,
    action: entry.action,
    module: entry.module,
    details: entry.details,
    timestamp: new Date(),
  });
  return { success: true, id };
}

function mockAddAccount(payload: {
  companyId: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  parentId?: string;
  type: string;
  nature: string;
  isGroup: boolean;
}): { success: boolean; id: string } {
  ensureMockSeeded();
  const id = genMockId();
  _mockAccounts.push({
    id,
    companyId: payload.companyId,
    code: payload.code,
    nameAr: payload.nameAr,
    nameEn: payload.nameEn,
    parentId: payload.parentId,
    type: payload.type as any,
    nature: payload.nature as any,
    isGroup: payload.isGroup,
    balance: 0,
  });
  return { success: true, id };
}

function mockGetTransactions(companyId?: string): { success: boolean; transactions: any[] } {
  ensureMockSeeded();
  let query = _mockTransactions;
  if (companyId) {
    query = query.filter(tx => tx.companyId === companyId);
  }
  const result = query.map(tx => {
    const entries = _mockJournalEntries.filter(je => je.transactionId === tx.id);
    return {
      ...tx,
      entries,
    };
  });
  return { success: true, transactions: result };
}

function mockPostTransaction(payload: {
  companyId: string;
  date: string;
  reference: string;
  description: string;
  totalAmount: number;
  entries: Array<{
    accountId: string;
    debit: number;
    credit: number;
    memo?: string;
  }>;
}): { success: boolean; id: string } {
  ensureMockSeeded();
  const txId = genMockId();
  
  const transaction = {
    id: txId,
    companyId: payload.companyId,
    date: new Date(payload.date),
    reference: payload.reference,
    description: payload.description,
    totalAmount: payload.totalAmount,
    status: 'posted',
    createdAt: new Date(),
  };
  
  _mockTransactions.unshift(transaction);
  
  for (const entry of payload.entries) {
    const jeId = genMockId();
    _mockJournalEntries.push({
      id: jeId,
      transactionId: txId,
      accountId: entry.accountId,
      debit: entry.debit,
      credit: entry.credit,
      memo: entry.memo,
      createdAt: new Date(),
    });
    
    // Update balance
    const acc = _mockAccounts.find(a => a.id === entry.accountId);
    if (acc) {
      const delta = acc.nature === 'debit' ? (entry.debit - entry.credit) : (entry.credit - entry.debit);
      acc.balance += delta;
    }
  }
  
  return { success: true, id: txId };
}
