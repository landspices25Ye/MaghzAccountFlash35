import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/core/database/adapters', () => ({
  getDbAdapter: vi.fn(),
}));

vi.mock('@/core/utils/validation', () => ({
  validateInput: vi.fn(() => ({ success: true })),
  idCompanySchema: {},
  companyIdSchema: {},
  uuidSchema: {},
  createCustomerSchema: {},
  createInvoiceSchema: {},
  createQuotationSchema: {},
  createSalesReturnSchema: {},
}));

vi.mock('@/core/utils/pagination', () => ({
  clampPageArgs: vi.fn((page: number, pageSize: number) => ({
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  })),
  paginatedResult: vi.fn((items: unknown[], total: number, page: number, pageSize: number) => ({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })),
}));

import { salesApi } from './api';
import { getDbAdapter } from '@/core/database/adapters';

function makeMockAdapter(queryImpl: (sql: string, params: unknown[]) => Promise<{ success: boolean; rows?: unknown[]; error?: string }>) {
  return { query: vi.fn(queryImpl) };
}

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const CUSTOMER_ID = '00000000-0000-0000-0000-000000000010';
const INVOICE_ID = '00000000-0000-0000-0000-000000000020';

describe('salesApi.getCustomerStatement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns union of invoices and posted receipt vouchers', async () => {
    const adapter = makeMockAdapter(async (_sql, params) => {
      if (params[0] === CUSTOMER_ID) {
        return {
          success: true,
          rows: [
            { date: '2026-05-15', document_type: 'فاتورة', document_number: 'INV-001', debit: 1000, credit: 0, balance: 1000, notes: null },
            { date: '2026-05-10', document_type: 'سند قبض', document_number: 'RV-001', debit: 0, credit: 500, balance: 0, notes: null },
          ],
        };
      }
      return { success: true, rows: [] };
    });
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await salesApi.getCustomerStatement(CUSTOMER_ID);
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);
    expect(adapter.query).toHaveBeenCalledTimes(1);
    const [sql] = adapter.query.mock.calls[0];
    expect(sql).toMatch(/FROM sales_invoices/);
    expect(sql).toMatch(/FROM receipt_vouchers/);
    expect(sql).toMatch(/voucher_number as document_number/);
  });

  it('returns empty array when no transactions exist', async () => {
    const adapter = makeMockAdapter(async () => ({ success: true, rows: [] }));
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await salesApi.getCustomerStatement(CUSTOMER_ID);
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
  });

  it('propagates adapter errors', async () => {
    const adapter = makeMockAdapter(async () => ({ success: false, error: 'db down' }));
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await salesApi.getCustomerStatement(CUSTOMER_ID);
    expect(res.success).toBe(false);
    expect(res.error).toBe('db down');
  });
});

describe('salesApi.getCustomerArAging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('groups invoices by customer and bucket using due_date when present', async () => {
    const today = new Date().toISOString().split('T')[0];
    const ago = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
    };
    const adapter = makeMockAdapter(async () => ({
      success: true,
      rows: [
        { customer_id: CUSTOMER_ID, customer_name: 'عميل 1', due_amount: 1000, aging_date: ago(10) },
        { customer_id: CUSTOMER_ID, customer_name: 'عميل 1', due_amount: 2000, aging_date: ago(45) },
        { customer_id: CUSTOMER_ID, customer_name: 'عميل 1', due_amount: 500, aging_date: ago(120) },
      ],
    }));
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await salesApi.getCustomerArAging(COMPANY_ID);
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    const row = res.data![0];
    expect(row.customerId).toBe(CUSTOMER_ID);
    expect(row.totalDue).toBe(3500);
    expect(row.buckets.find(b => b.period === '0-30')?.amount).toBe(1000);
    expect(row.buckets.find(b => b.period === '31-60')?.amount).toBe(2000);
    expect(row.buckets.find(b => b.period === '>90')?.amount).toBe(500);
    void today;
  });

  it('falls back to invoice date when due_date is null', async () => {
    const adapter = makeMockAdapter(async () => ({
      success: true,
      rows: [
        { customer_id: CUSTOMER_ID, customer_name: 'عميل 1', due_amount: 800, aging_date: '2020-01-01' },
      ],
    }));
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await salesApi.getCustomerArAging(COMPANY_ID);
    expect(res.success).toBe(true);
    const row = res.data![0];
    expect(row.buckets.find(b => b.period === '>90')?.amount).toBe(800);
  });

  it('ignores zero-amount rows (paid invoices)', async () => {
    const adapter = makeMockAdapter(async () => ({
      success: true,
      rows: [
        { customer_id: CUSTOMER_ID, customer_name: 'عميل 1', due_amount: 0, aging_date: '2025-01-01' },
      ],
    }));
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await salesApi.getCustomerArAging(COMPANY_ID);
    expect(res.success).toBe(true);
    expect(res.data![0].totalDue).toBe(0);
  });

  it('filters by company_id', async () => {
    const adapter = makeMockAdapter(async () => ({ success: true, rows: [] }));
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    await salesApi.getCustomerArAging(COMPANY_ID);
    const [sql, params] = adapter.query.mock.calls[0];
    expect(sql).toMatch(/c\.company_id = \$1/);
    expect(sql).toMatch(/status IN \('posted', 'partially_paid'\)/);
    expect(sql).toMatch(/total_amount - i\.paid_amount\) > 0/);
    expect(params[0]).toBe(COMPANY_ID);
  });
});

describe('salesApi.getPostedInvoicesWithLines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns posted invoices joined with their lines', async () => {
    const adapter = makeMockAdapter(async (_sql, _params) => {
      if ((_sql as string).includes('FROM sales_invoices i')) {
        return {
          success: true,
          rows: [
            {
              id: INVOICE_ID, company_id: COMPANY_ID, invoice_number: 'INV-100',
              customer_id: CUSTOMER_ID, customer_name: 'عميل 1', date: '2026-05-01',
              subtotal: 1000, discount_amount: 0, vat_amount: 150, total_amount: 1150,
              paid_amount: 0, currency_code: 'YER', exchange_rate: 1,
              base_currency_amount: 1150, base_currency_paid: 0,
              status: 'posted', notes: null,
            },
          ],
        };
      }
      return {
        success: true,
        rows: [
          { id: 'l1', invoice_id: INVOICE_ID, product_id: 'p1', product_name: 'منتج 1', quantity: 2, unit_price: 500, discount_percent: 0, vat_percent: 15, line_total: 1150, currency_code: 'YER', exchange_rate: 1, base_currency_line_total: 1150 },
        ],
      };
    });
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await salesApi.getPostedInvoicesWithLines(COMPANY_ID);
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.data![0].lines).toHaveLength(1);
    expect(res.data![0].lines[0].productName).toBe('منتج 1');
  });

  it('only returns invoices with status posted/partially_paid/paid', async () => {
    const adapter = makeMockAdapter(async (_sql) => {
      if ((_sql as string).includes('FROM sales_invoices i')) {
        return { success: true, rows: [] };
      }
      return { success: true, rows: [] };
    });
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    await salesApi.getPostedInvoicesWithLines(COMPANY_ID);
    const [sql] = adapter.query.mock.calls[0];
    expect(sql).toMatch(/status IN \('posted', 'partially_paid', 'paid'\)/);
  });

  it('returns empty array when no posted invoices exist', async () => {
    const adapter = makeMockAdapter(async () => ({ success: true, rows: [] }));
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await salesApi.getPostedInvoicesWithLines(COMPANY_ID);
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
  });
});

describe('salesApi.createInvoice (currency auto-compute)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('auto-computes baseCurrencyAmount when not provided', async () => {
    const adapter = makeMockAdapter(async (sql, params) => {
      if (sql.startsWith('WITH inv AS')) {
        expect(params[12]).toBe(5000);
        return { success: true, rows: [{ id: 'inv-1' }] };
      }
      return { success: true, rows: [] };
    });
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await salesApi.createInvoice({
      companyId: COMPANY_ID,
      invoiceNumber: 'INV-001',
      customerId: CUSTOMER_ID,
      date: '2026-06-01',
      dueDate: undefined,
      subtotal: 1000,
      discountAmount: 0,
      vatAmount: 0,
      totalAmount: 1000,
      paidAmount: 0,
      currencyCode: 'USD',
      exchangeRate: 5,
      status: 'draft',
      notes: '',
      lines: [],
    } as never);
    expect(res.success).toBe(true);
  });

  it('inserts 16 columns for the invoice header (incl. multi-currency)', async () => {
    const adapter = makeMockAdapter(async (sql, _params) => {
      if (sql.startsWith('WITH inv AS')) {
        expect(sql).toMatch(/currency_code,exchange_rate,base_currency_amount,base_currency_paid/);
        return { success: true, rows: [{ id: 'inv-1' }] };
      }
      return { success: true, rows: [] };
    });
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    await salesApi.createInvoice({
      companyId: COMPANY_ID,
      invoiceNumber: 'INV-002',
      customerId: CUSTOMER_ID,
      date: '2026-06-01',
      dueDate: undefined,
      subtotal: 1000,
      discountAmount: 0,
      vatAmount: 0,
      totalAmount: 1000,
      paidAmount: 0,
      currencyCode: 'YER',
      exchangeRate: 1,
      status: 'draft',
      notes: '',
      lines: [],
    } as never);
  });
});
