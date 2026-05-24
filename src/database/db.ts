import Dexie, { type Table } from 'dexie';

// Interface definitions
export interface Company {
  id?: number;
  name: string;
  currency: string;
  taxNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
}

export interface User {
  id?: number;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'accountant' | 'cashier';
  avatar?: string;
  createdAt: Date;
}

export interface ActivityLog {
  id?: number;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details?: string;
}

export interface Account {
  id?: number;
  code: string;       // e.g. "1101001"
  nameAr: string;     // Arabic Name
  nameEn: string;     // English Name
  parentId?: number;  // Parent account ID for hierarchy
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  nature: 'debit' | 'credit';
  isGroup: boolean;   // True if it is a folder/category, false if transactional
  balance: number;    // Current balance
}

export interface Product {
  id?: number;
  code: string;
  nameAr: string;
  nameEn: string;
  barcode?: string;
  sku?: string;
  unit: string;       // e.g. "Pcs", "Kg"
  costPrice: number;
  salePrice: number;
  stockQty: number;
  minStockAlert?: number;
}

export interface Contact {
  id?: number;
  type: 'customer' | 'vendor' | 'both';
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance: number;    // Account receivable/payable balance
}

export interface Transaction {
  id?: number;
  date: Date;
  reference: string;
  description: string;
  totalAmount: number;
  createdById: number;
  status: 'draft' | 'posted';
}

export interface JournalEntry {
  id?: number;
  transactionId: number;
  accountId: number;
  debit: number;
  credit: number;
  memo?: string;
}

class MaghzDatabase extends Dexie {
  companies!: Table<Company, number>;
  users!: Table<User, number>;
  activityLogs!: Table<ActivityLog, number>;
  accounts!: Table<Account, number>;
  products!: Table<Product, number>;
  contacts!: Table<Contact, number>;
  transactions!: Table<Transaction, number>;
  journalEntries!: Table<JournalEntry, number>;

  constructor() {
    super('MaghzDB');
    
    // Schema definitions
    this.version(1).stores({
      companies: '++id, name, currency',
      users: '++id, username, email, role',
      activityLogs: '++id, timestamp, userId, action, module',
      accounts: '++id, &code, nameAr, nameEn, parentId, type, isGroup',
      products: '++id, &code, nameAr, nameEn, barcode',
      contacts: '++id, type, name, phone',
      transactions: '++id, date, reference, status',
      journalEntries: '++id, transactionId, accountId',
    });
  }
}

export const db = new MaghzDatabase();

// Database Seeder
export async function seedDatabase() {
  const companyCount = await db.companies.count();
  if (companyCount > 0) return; // Database already seeded

  console.log('Seeding initial database tables...');

  // 1. Seed Company
  const companyId = await db.companies.add({
    name: 'شركة المغز التجارية المحدودة',
    currency: 'YER',
    taxNumber: '100123456789',
    address: 'صنعاء، الجمهورية اليمنية',
    phone: '+967712345678',
    email: 'info@maghz-erp.com',
  });

  // 2. Seed Admin User
  await db.users.add({
    username: 'مدير النظام',
    email: 'admin@maghz-erp.com',
    role: 'admin',
    createdAt: new Date(),
  });

  // 3. Seed Basic Chart of Accounts
  // Assets (الأصول)
  const assetsId = await db.accounts.add({
    code: '1',
    nameAr: 'الأصول',
    nameEn: 'Assets',
    type: 'asset',
    nature: 'debit',
    isGroup: true,
    balance: 0,
  });

  const currentAssetsId = await db.accounts.add({
    code: '11',
    nameAr: 'الأصول المتداولة',
    nameEn: 'Current Assets',
    parentId: assetsId,
    type: 'asset',
    nature: 'debit',
    isGroup: true,
    balance: 0,
  });

  // Cash and Cash Equivalents (النقدية وما يعادلها)
  const cashId = await db.accounts.add({
    code: '111',
    nameAr: 'الصندوق والبنوك',
    nameEn: 'Cash & Banks',
    parentId: currentAssetsId,
    type: 'asset',
    nature: 'debit',
    isGroup: true,
    balance: 0,
  });

  // Ledger Cash Accounts
  await db.accounts.add({
    code: '111001',
    nameAr: 'الصندوق الرئيسي',
    nameEn: 'Main Safe Cash',
    parentId: cashId,
    type: 'asset',
    nature: 'debit',
    isGroup: false,
    balance: 5000000,
  });

  await db.accounts.add({
    code: '111002',
    nameAr: 'حساب بنك الكريمي',
    nameEn: 'Al Karimi Bank Account',
    parentId: cashId,
    type: 'asset',
    nature: 'debit',
    isGroup: false,
    balance: 12000000,
  });

  // Liabilities (الالتزامات)
  await db.accounts.add({
    code: '2',
    nameAr: 'الالتزامات',
    nameEn: 'Liabilities',
    type: 'liability',
    nature: 'credit',
    isGroup: true,
    balance: 0,
  });

  // Equity (حقوق الملكية)
  const equityId = await db.accounts.add({
    code: '3',
    nameAr: 'حقوق الملكية',
    nameEn: 'Equity',
    type: 'equity',
    nature: 'credit',
    isGroup: true,
    balance: 0,
  });

  await db.accounts.add({
    code: '311001',
    nameAr: 'رأس المال المدفوع',
    nameEn: 'Paid-in Capital',
    parentId: equityId,
    type: 'equity',
    nature: 'credit',
    isGroup: false,
    balance: 17000000,
  });

  // Revenues (الإيرادات)
  const revenueId = await db.accounts.add({
    code: '4',
    nameAr: 'الإيرادات',
    nameEn: 'Revenues',
    type: 'revenue',
    nature: 'credit',
    isGroup: true,
    balance: 0,
  });

  await db.accounts.add({
    code: '411001',
    nameAr: 'مبيعات المنتجات',
    nameEn: 'Product Sales',
    parentId: revenueId,
    type: 'revenue',
    nature: 'credit',
    isGroup: false,
    balance: 0,
  });

  // Expenses (المصروفات)
  const expenseId = await db.accounts.add({
    code: '5',
    nameAr: 'المصروفات',
    nameEn: 'Expenses',
    type: 'expense',
    nature: 'debit',
    isGroup: true,
    balance: 0,
  });

  await db.accounts.add({
    code: '511001',
    nameAr: 'مصروفات الإيجار',
    nameEn: 'Rent Expense',
    parentId: expenseId,
    type: 'expense',
    nature: 'debit',
    isGroup: false,
    balance: 0,
  });

  await db.accounts.add({
    code: '511002',
    nameAr: 'رواتب وأجور',
    nameEn: 'Salaries & Wages',
    parentId: expenseId,
    type: 'expense',
    nature: 'debit',
    isGroup: false,
    balance: 0,
  });

  // 4. Seed Log
  await db.activityLogs.add({
    timestamp: new Date(),
    userId: 'system',
    userName: 'النظام',
    action: 'تهيئة وتغذية قاعدة البيانات الأولى',
    module: 'الأساس (Core)',
    details: `تم إنشاء قاعدة البيانات بنجاح وتأسيس حسابات دليل الحسابات الافتراضي لشركة المغز برقم معرف ${companyId} بالريال اليمني YER.`,
  });

  console.log('Seeding completed successfully!');
}
