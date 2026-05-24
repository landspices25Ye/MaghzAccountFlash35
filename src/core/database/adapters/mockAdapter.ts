import type { DbAdapter } from './types';

/**
 * Mock Database Adapter for Browser / Web mode
 * Uses in-memory storage for development/demo
 */

const storage = new Map<string, any[]>();

function getTable(name: string): any[] {
  if (!storage.has(name)) {
    storage.set(name, []);
  }
  return storage.get(name)!;
}

function genId(): string {
  return crypto.randomUUID();
}

export const mockAdapter: DbAdapter = {
  async ping() {
    return { success: true, message: 'Mock DB active' };
  },

  async query(_sql, _params) {
    // Mock queries not supported directly, use specific methods
    return { success: true, rows: [] };
  },

  async transaction(_queries) {
    return { success: true, results: [] };
  },

  async getCompany() {
    const companies = getTable('companies');
    if (companies.length === 0) {
      // Seed default company
      const company = {
        id: genId(),
        name: 'شركة تجريبية',
        name_en: 'Demo Company',
        currency: 'YER',
        tax_number: '000000000',
        address: 'صنعاء، اليمن',
        phone: '+967000000000',
        email: 'demo@maghz.local',
        created_at: new Date().toISOString(),
      };
      companies.push(company);
      return { success: true, data: company };
    }
    return { success: true, data: companies[0] };
  },

  async getAccounts(companyId) {
    const accounts = getTable('accounts').filter(a => a.company_id === companyId);
    if (accounts.length === 0) {
      // Seed default chart of accounts
      const seedAccounts = [
        { id: genId(), company_id: companyId, code: '1', name_ar: 'الأصول', name_en: 'Assets', parent_id: null, type: 'asset', nature: 'debit', is_group: true, balance: 0, is_active: true },
        { id: genId(), company_id: companyId, code: '11', name_ar: 'الأصول المتداولة', name_en: 'Current Assets', parent_id: null, type: 'asset', nature: 'debit', is_group: true, balance: 0, is_active: true },
        { id: genId(), company_id: companyId, code: '111', name_ar: 'الصندوق والبنوك', name_en: 'Cash & Banks', parent_id: null, type: 'asset', nature: 'debit', is_group: true, balance: 0, is_active: true },
        { id: genId(), company_id: companyId, code: '111001', name_ar: 'الصندوق الرئيسي', name_en: 'Main Safe Cash', parent_id: null, type: 'asset', nature: 'debit', is_group: false, balance: 5000000, is_active: true },
        { id: genId(), company_id: companyId, code: '2', name_ar: 'الالتزامات', name_en: 'Liabilities', parent_id: null, type: 'liability', nature: 'credit', is_group: true, balance: 0, is_active: true },
        { id: genId(), company_id: companyId, code: '3', name_ar: 'حقوق الملكية', name_en: 'Equity', parent_id: null, type: 'equity', nature: 'credit', is_group: true, balance: 0, is_active: true },
        { id: genId(), company_id: companyId, code: '311001', name_ar: 'رأس المال المدفوع', name_en: 'Paid-in Capital', parent_id: null, type: 'equity', nature: 'credit', is_group: false, balance: 17000000, is_active: true },
        { id: genId(), company_id: companyId, code: '4', name_ar: 'الإيرادات', name_en: 'Revenues', parent_id: null, type: 'revenue', nature: 'credit', is_group: true, balance: 0, is_active: true },
        { id: genId(), company_id: companyId, code: '411001', name_ar: 'مبيعات المنتجات', name_en: 'Product Sales', parent_id: null, type: 'revenue', nature: 'credit', is_group: false, balance: 0, is_active: true },
        { id: genId(), company_id: companyId, code: '5', name_ar: 'المصروفات', name_en: 'Expenses', parent_id: null, type: 'expense', nature: 'debit', is_group: true, balance: 0, is_active: true },
        { id: genId(), company_id: companyId, code: '511001', name_ar: 'مصروفات الإيجار', name_en: 'Rent Expense', parent_id: null, type: 'expense', nature: 'debit', is_group: false, balance: 0, is_active: true },
        { id: genId(), company_id: companyId, code: '511002', name_ar: 'رواتب وأجور', name_en: 'Salaries & Wages', parent_id: null, type: 'expense', nature: 'debit', is_group: false, balance: 0, is_active: true },
      ];
      getTable('accounts').push(...seedAccounts);
      return { success: true, data: seedAccounts };
    }
    return { success: true, data: accounts };
  },

  async createAccount(data) {
    const id = genId();
    getTable('accounts').push({ id, ...data, balance: data.balance || 0, is_active: true, created_at: new Date().toISOString() });
    return { success: true, id };
  },

  async updateAccountBalance(accountId, delta) {
    const accounts = getTable('accounts');
    const acc = accounts.find(a => a.id === accountId);
    if (acc) {
      acc.balance += delta;
      acc.updated_at = new Date().toISOString();
      return { success: true };
    }
    return { success: false, error: 'Account not found' };
  },

  async getTransactions(companyId) {
    const txs = getTable('transactions').filter(t => t.company_id === companyId);
    return { success: true, data: txs };
  },

  async createTransaction(data) {
    const id = genId();
    const tx = {
      id,
      company_id: data.companyId,
      date: data.date,
      reference: data.reference,
      description: data.description,
      total_amount: data.totalAmount,
      status: data.status || 'posted',
      entries: data.entries || [],
      created_at: new Date().toISOString(),
    };
    getTable('transactions').push(tx);
    
    // Update balances
    for (const entry of data.entries) {
      const acc = getTable('accounts').find(a => a.id === entry.accountId);
      if (acc) {
        const delta = acc.nature === 'debit' ? (entry.debit - entry.credit) : (entry.credit - entry.debit);
        acc.balance += delta;
      }
    }
    
    return { success: true, id };
  },

  async getProducts(companyId) {
    const products = getTable('products').filter(p => p.company_id === companyId);
    return { success: true, data: products };
  },

  async createProduct(data) {
    const id = genId();
    getTable('products').push({ id, ...data, created_at: new Date().toISOString() });
    return { success: true, id };
  },

  async getContacts(companyId, type) {
    let contacts = getTable('contacts').filter(c => c.company_id === companyId);
    if (type) contacts = contacts.filter(c => c.type === type);
    return { success: true, data: contacts };
  },

  async createContact(data) {
    const id = genId();
    getTable('contacts').push({ id, ...data, balance: data.balance || 0, created_at: new Date().toISOString() });
    return { success: true, id };
  },
};
