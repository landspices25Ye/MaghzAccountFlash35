import type { DbAdapter } from './types';
import { seedAllData } from './seedData';

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

// Convert snake_case keys to camelCase for frontend compatibility
function snakeToCamel(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = snakeToCamel(val);
  }
  return result;
}

function seedIfEmpty(companyId: string) {
  const tablesToSeed = [
    'accounts', 'contacts', 'products', 'transactions',
    'sales_invoices', 'sales_invoice_lines', 'purchase_invoices', 'purchase_invoice_lines',
    'employees', 'attendance', 'payroll', 'leads', 'opportunities', 'tasks',
    'work_orders', 'boms', 'warehouses', 'stock', 'product_categories',
    'users', 'roles', 'currencies', 'vat_settings', 'branches',
    'document_sequences', 'product_types', 'units', 'cash_boxes', 'banks',
    'cost_centers', 'payroll_components', 'default_accounts'
  ];
  const needsSeed = tablesToSeed.some(t => getTable(t).length === 0);
  if (needsSeed) {
    const seed = seedAllData(companyId);
    for (const [table, rows] of Object.entries(seed)) {
      if (rows && rows.length > 0 && getTable(table).length === 0) {
        getTable(table).push(...rows);
      }
    }
    // Create sales invoice lines from invoices
    const salesInvoices = getTable('sales_invoices');
    for (const inv of salesInvoices) {
      if (inv.lines) {
        for (const line of inv.lines) {
          getTable('sales_invoice_lines').push({
            id: genId(),
            invoice_id: inv.id,
            ...line,
          });
        }
      }
    }
    // Create purchase invoice lines from invoices
    const purchaseInvoices = getTable('purchase_invoices');
    for (const inv of purchaseInvoices) {
      if (inv.lines) {
        for (const line of inv.lines) {
          getTable('purchase_invoice_lines').push({
            id: genId(),
            invoice_id: inv.id,
            ...line,
          });
        }
      }
    }
    // Seed warehouses
    if (getTable('warehouses').length === 0) {
      getTable('warehouses').push(
        { id: 'wh-1', company_id: companyId, name: 'المستودع الرئيسي - صنعاء', code: 'WH-SAN', branch_id: null, is_active: true },
        { id: 'wh-2', company_id: companyId, name: 'مستودع عدن', code: 'WH-ADN', branch_id: null, is_active: true },
        { id: 'wh-3', company_id: companyId, name: 'مستودع الحديدة', code: 'WH-HOD', branch_id: null, is_active: true },
      );
    }
    // Seed stock
    if (getTable('stock').length === 0) {
      const products = getTable('products');
      for (const p of products) {
        getTable('stock').push({
          id: genId(),
          company_id: companyId,
          product_id: p.id,
          warehouse_id: 'wh-1',
          quantity: Math.floor(p.stock * 0.6),
        });
        getTable('stock').push({
          id: genId(),
          company_id: companyId,
          product_id: p.id,
          warehouse_id: 'wh-2',
          quantity: Math.floor(p.stock * 0.3),
        });
        getTable('stock').push({
          id: genId(),
          company_id: companyId,
          product_id: p.id,
          warehouse_id: 'wh-3',
          quantity: Math.floor(p.stock * 0.1),
        });
      }
    }
    // Seed product categories
    if (getTable('product_categories').length === 0) {
      getTable('product_categories').push(
        { id: 'cat-1', company_id: companyId, name: 'أدوات منزلية' },
        { id: 'cat-2', company_id: companyId, name: 'إلكترونيات' },
        { id: 'cat-3', company_id: companyId, name: 'أدوات مطبخ' },
        { id: 'cat-4', company_id: companyId, name: 'تكييف' },
        { id: 'cat-5', company_id: companyId, name: 'عناية شخصية' },
        { id: 'cat-6', company_id: companyId, name: 'تبريد' },
      );
    }
    // Seed users
    if (getTable('users').length === 0) {
      getTable('users').push(
        { id: 'user-1', company_id: companyId, username: 'admin', email: 'admin@maghz.local', role: 'admin', password_hash: '', is_active: true, created_at: new Date().toISOString() },
        { id: 'user-2', company_id: companyId, username: 'محاسب', email: 'accountant@maghz.local', role: 'accountant', password_hash: '', is_active: true, created_at: new Date().toISOString() },
        { id: 'user-3', company_id: companyId, username: 'مبيعات', email: 'sales@maghz.local', role: 'sales_rep', password_hash: '', is_active: true, created_at: new Date().toISOString() },
        { id: 'user-4', company_id: companyId, username: 'مدير', email: 'manager@maghz.local', role: 'manager', password_hash: '', is_active: true, created_at: new Date().toISOString() },
      );
    }
    // Seed roles
    if (getTable('roles').length === 0) {
      getTable('roles').push(
        { id: 'role-1', company_id: companyId, name: 'admin', permissions: ['*'] },
        { id: 'role-2', company_id: companyId, name: 'accountant', permissions: ['accounting', 'reports'] },
        { id: 'role-3', company_id: companyId, name: 'sales_rep', permissions: ['sales', 'crm'] },
        { id: 'role-4', company_id: companyId, name: 'manager', permissions: ['sales', 'purchases', 'accounting', 'reports', 'hr'] },
      );
    }
    // Seed currencies
    if (getTable('currencies').length === 0) {
      getTable('currencies').push(
        { id: 'curr-1', company_id: companyId, code: 'YER', name: 'الريال اليمني', symbol: '﷼', rate: 1, is_base: true, is_active: true },
        { id: 'curr-2', company_id: companyId, code: 'USD', name: 'الدولار الأمريكي', symbol: '$', rate: 1500, is_base: false, is_active: true },
        { id: 'curr-3', company_id: companyId, code: 'SAR', name: 'الريال السعودي', symbol: 'ر.س', rate: 400, is_base: false, is_active: true },
        { id: 'curr-4', company_id: companyId, code: 'AED', name: 'الدرهم الإماراتي', symbol: 'د.إ', rate: 408, is_base: false, is_active: true },
      );
    }
    // Seed vat_settings
    if (getTable('vat_settings').length === 0) {
      getTable('vat_settings').push(
        { id: 'vat-1', company_id: companyId, name: 'ضريبة القيمة المضافة', rate: 5, is_active: true },
      );
    }
    // Seed branches
    if (getTable('branches').length === 0) {
      getTable('branches').push(
        { id: 'branch-1', company_id: companyId, name: 'الفرع الرئيسي - صنعاء', code: 'HQ', city: 'صنعاء', phone: '+96714444888', is_active: true },
        { id: 'branch-2', company_id: companyId, name: 'فرع عدن', code: 'ADN', city: 'عدن', phone: '+9672333555', is_active: true },
        { id: 'branch-3', company_id: companyId, name: 'فرع الحديدة', code: 'HOD', city: 'الحديدة', phone: '+9673222666', is_active: true },
      );
    }
    // Seed inventory transactions
    const seedTx = seedAllData(companyId);
    if (seedTx.inventory_transactions) getTable('inventory_transactions').push(...seedTx.inventory_transactions);
    if (seedTx.stock_adjustments) getTable('stock_adjustments').push(...seedTx.stock_adjustments);
    if (seedTx.sales_returns) getTable('sales_returns').push(...seedTx.sales_returns);
    if (seedTx.purchase_returns) getTable('purchase_returns').push(...seedTx.purchase_returns);
    if (seedTx.receipt_vouchers) getTable('receipt_vouchers').push(...seedTx.receipt_vouchers);
    if (seedTx.payment_vouchers) getTable('payment_vouchers').push(...seedTx.payment_vouchers);
  }
}

// Simple SQL parser for mock adapter
function parseSql(sql: string): { table: string; alias?: string; joins: Array<{ table: string; alias?: string; on: string }>; where: string[]; returning?: string[] } {
  const joins: Array<{ table: string; alias?: string; on: string }> = [];

  // Extract main table
  const fromMatch = sql.match(/FROM\s+(\w+)(?:\s+AS\s+(\w+))?/i);
  const table = fromMatch?.[1] || '';
  const alias = fromMatch?.[2];
  
  // Extract joins
  const joinRegex = /LEFT\s+JOIN\s+(\w+)(?:\s+AS\s+(\w+))?\s+ON\s+([^\s]+)\s*=\s*([^\s]+)/gi;
  let joinMatch;
  while ((joinMatch = joinRegex.exec(sql)) !== null) {
    joins.push({ table: joinMatch[1], alias: joinMatch[2], on: joinMatch[3] + '=' + joinMatch[4] });
  }
  
  // Extract WHERE columns
  const whereCols: string[] = [];
  const whereRegex = /WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|$)/is;
  const whereMatch = sql.match(whereRegex);
  if (whereMatch) {
    const parts = whereMatch[1].split(/\s+AND\s+/i);
    for (const part of parts) {
      const colMatch = part.match(/(\w+)\.?(\w+)?\s*[=<>]/);
      if (colMatch) {
        whereCols.push(colMatch[2] || colMatch[1]);
      }
    }
  }
  
  // Extract RETURNING
  const returningMatch = sql.match(/RETURNING\s+(.+)$/i);
  const returning = returningMatch ? returningMatch[1].split(',').map(s => s.trim()) : undefined;
  
  return { table, alias, joins, where: whereCols, returning };
}

function applyWhere(rows: any[], params: any[], sql: string): any[] {
  const lower = sql.toLowerCase();
  if (!lower.includes('where')) return rows;
  
  return rows.filter(row => {
    // Extract conditions
    const condMatch = lower.match(/where\s+(.+?)(?:order|group|limit|$)/is);
    if (!condMatch) return true;

    const conditions = condMatch[1].split(/\s+and\s+/i);
    let matches = true;

    for (const cond of conditions) {
      const eqMatch = cond.match(/([\w.]+)\s*=\s*\$(\d+)/);
      if (eqMatch) {
        const col = eqMatch[1].split('.').pop()!;
        const idx = parseInt(eqMatch[2]) - 1;
        if (row[col] !== params[idx] && row[col] !== undefined) {
          matches = false;
          break;
        }
        if (row[col] === undefined) {
          // Try camelCase or other variations
          const camel = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
          if (row[camel] !== undefined) {
            if (row[camel] !== params[idx]) {
              matches = false;
              break;
            }
          } else {
            // Field doesn't exist in row - for boolean defaults like is_active, assume true
            if (col === 'is_active' || col === 'isActive') {
              if (true !== params[idx]) {
                matches = false;
                break;
              }
            } else {
              matches = false;
              break;
            }
          }
        }
      } else {
        const placeholderMatch = cond.match(/\$(\d+)/);
        if (placeholderMatch) {
          const idx = parseInt(placeholderMatch[1]) - 1;
          // Generic check against a likely column
          if (row.company_id !== undefined && row.company_id !== params[idx]) {
            if (row.companyId !== undefined && row.companyId !== params[idx]) {
              matches = false;
              break;
            }
          }
        }
      }
    }
    
    return matches;
  });
}

function handleSelect(sql: string, params: any[]): any[] {
  const parsed = parseSql(sql);
  const tableName = parsed.table;
  
  // Map table aliases/names
  const tableMap: Record<string, string> = {
    'customers': 'contacts',
    'suppliers': 'contacts',
    'c': 'contacts',
    'inventory_transactions': 'inventory_transactions',
    'stock_adjustments': 'stock_adjustments',
    'sales_returns': 'sales_returns',
    'purchase_returns': 'purchase_returns',
    'receipt_vouchers': 'receipt_vouchers',
    'payment_vouchers': 'payment_vouchers',
  };
  
  const actualTable = tableMap[tableName] || tableName;
  let rows = [...getTable(actualTable)];
  
  // Apply WHERE filtering
  rows = applyWhere(rows, params, sql);
  
  // Handle LEFT JOINs
  for (const join of parsed.joins) {
    const joinTable = tableMap[join.table] || join.table;
    const joinRows = getTable(joinTable);
    const onParts = join.on.split('=');
    const leftField = onParts[0].trim().split('.').pop()!;
    const rightField = onParts[1].trim().split('.').pop()!;
    
    rows = rows.map(row => {
      const match = joinRows.find(jr => {
        const leftVal = row[leftField.replace(join.alias + '.', '')] || row[leftField.split('.').pop()!];
        const rightVal = jr[rightField.replace(parsed.alias + '.', '')] || jr[rightField.split('.').pop()!];
        return leftVal === rightVal;
      });
      if (match) {
        // Add joined fields with alias prefix
        for (const [key, val] of Object.entries(match)) {
          row[join.alias + '_' + key] = val;
        }
      }
      return row;
    });
  }
  
  // Apply ORDER BY
  const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)/i);
  if (orderMatch) {
    const col = orderMatch[1];
    rows.sort((a, b) => {
      if (a[col] < b[col]) return -1;
      if (a[col] > b[col]) return 1;
      return 0;
    });
  }
  
  // Filter by type for customers/suppliers
  if (tableName === 'customers') {
    rows = rows.filter(r => r.type === 'customer');
  } else if (tableName === 'suppliers') {
    rows = rows.filter(r => r.type === 'supplier');
  }
  
  return rows;
}

function handleInsert(sql: string, params: any[]): { id?: string }[] {
  const tableMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
  const table = tableMatch?.[1] || '';
  
  const colMatch = sql.match(/\(([^)]+)\)/);
  const cols = colMatch?.[1].split(',').map(c => c.trim()) || [];
  
  const row: any = { id: genId() };
  for (let i = 0; i < cols.length && i < params.length; i++) {
    row[cols[i]] = params[i];
  }
  
  getTable(table).push(row);
  
  const parsed = parseSql(sql);
  if (parsed.returning?.includes('id')) {
    return [{ id: row.id }];
  }
  return [];
}

function handleUpdate(sql: string, params: any[]): any[] {
  const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
  const table = tableMatch?.[1] || '';
  
  // Extract WHERE id condition
  const whereMatch = sql.match(/WHERE\s+id\s*=\s*\$(\d+)/i);
  const idIdx = whereMatch ? parseInt(whereMatch[1]) - 1 : -1;
  const id = idIdx >= 0 ? params[idIdx] : null;
  
  if (id) {
    const row = getTable(table).find(r => r.id === id);
    if (row) {
      // Extract SET columns
      const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/is);
      if (setMatch) {
        const setParts = setMatch[1].split(',');
        for (let i = 0; i < setParts.length; i++) {
          const colMatch = setParts[i].match(/(\w+)\s*=\s*\$(\d+)/);
          if (colMatch) {
            const col = colMatch[1];
            const idx = parseInt(colMatch[2]) - 1;
            row[col] = params[idx];
          }
        }
      }
    }
  }
  
  return [];
}

export const mockAdapter: DbAdapter = {
  async ping() {
    return { success: true, message: 'Mock DB active' };
  },

  async query(sql, params = []) {
    const lower = sql.toLowerCase().trim();
    
    // Ensure seed data is available for queries
    // Look for any param that looks like a companyId (starts with comp-)
    if (lower.startsWith('select')) {
      const companyId = params.find(p => typeof p === 'string' && p.startsWith('comp-'));
      if (companyId) {
        seedIfEmpty(companyId as string);
      }
    }
    
    try {
      if (lower.startsWith('select')) {
        const rows = handleSelect(sql, params).map(snakeToCamel);
        return { success: true, rows };
      }
      
      if (lower.startsWith('insert')) {
        const rows = handleInsert(sql, params);
        return { success: true, rows };
      }
      
      if (lower.startsWith('update')) {
        handleUpdate(sql, params);
        return { success: true, rows: [] };
      }
      
      if (lower.startsWith('delete')) {
        const tableMatch = sql.match(/FROM\s+(\w+)/i) || sql.match(/(\w+)\s+WHERE/i);
        const table = tableMatch?.[1] || '';
        const whereMatch = sql.match(/WHERE\s+id\s*=\s*\$(\d+)/i);
        const idIdx = whereMatch ? parseInt(whereMatch[1]) - 1 : -1;
        const id = idIdx >= 0 ? params[idIdx] : null;
        
        if (id && table) {
          const rows = getTable(table);
          const idx = rows.findIndex(r => r.id === id);
          if (idx >= 0) rows.splice(idx, 1);
        }
        return { success: true, rows: [] };
      }
      
      return { success: true, rows: [] };
    } catch (e) {
      return { success: false, error: String(e), rows: [] };
    }
  },

  async transaction(queries) {
    const results: any[] = [];
    for (const q of queries) {
      const result = await this.query(q.sql, q.params);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      results.push(result.rows);
    }
    return { success: true, results };
  },

  async getCompany() {
    const companies = getTable('companies');
    if (companies.length === 0) {
      const company = {
        id: 'comp-1',
        name: 'شركة المغزى للتجارة والصناعة',
        name_en: 'Maghz Trading & Industry Co.',
        currency: 'YER',
        tax_number: '3100123456',
        address: 'صنعاء - شارع الستين - عمارة التجارة الدولية',
        phone: '+96714444888',
        email: 'info@maghzaccount.com',
        date_format: 'yyyy-MM-dd',
        decimal_places: 2,
        calendar: 'gregorian',
        created_at: new Date().toISOString(),
      };
      companies.push(company);
      seedIfEmpty(company.id);
      return { success: true, data: company };
    }
    return { success: true, data: snakeToCamel(companies[0]) };
  },

  async getAccounts(companyId) {
    seedIfEmpty(companyId);
    const accounts = getTable('accounts').filter(a => a.company_id === companyId).map(snakeToCamel);
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
    seedIfEmpty(companyId);
    const txs = getTable('transactions').filter(t => t.company_id === companyId).map(snakeToCamel);
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
    seedIfEmpty(companyId);
    const products = getTable('products').filter(p => p.company_id === companyId).map(snakeToCamel);
    return { success: true, data: products };
  },

  async createProduct(data) {
    const id = genId();
    getTable('products').push({ id, ...data, created_at: new Date().toISOString() });
    return { success: true, id };
  },

  async getContacts(companyId, type) {
    seedIfEmpty(companyId);
    let contacts = getTable('contacts').filter(c => c.company_id === companyId).map(snakeToCamel);
    if (type) contacts = contacts.filter(c => c.type === type);
    return { success: true, data: contacts };
  },

  async createContact(data) {
    const id = genId();
    getTable('contacts').push({ id, ...data, balance: data.balance || 0, created_at: new Date().toISOString() });
    return { success: true, id };
  },
};
