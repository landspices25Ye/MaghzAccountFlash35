import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/core/database/adapters', () => ({
  getDbAdapter: vi.fn(),
}));

vi.mock('@/core/utils/validation', () => ({
  validateInput: vi.fn(() => ({ success: true })),
  idCompanySchema: {},
  companyIdSchema: {},
  uuidSchema: {},
  createTransactionSchema: {},
  createReceiptVoucherSchema: {},
  createPaymentVoucherSchema: {},
}));

vi.mock('@/core/utils/pagination', () => ({
  clampPageArgs: vi.fn((p: number, ps: number) => ({ page: p, pageSize: ps, offset: (p - 1) * ps })),
  paginatedResult: vi.fn((items: unknown[], total: number, p: number, ps: number) => ({
    items,
    total,
    page: p,
    pageSize: ps,
    totalPages: Math.max(1, Math.ceil(total / ps)),
  })),
}));

vi.mock('@/core/api', () => ({
  getNextDocumentNumber: vi.fn(),
  getCompanyById: vi.fn(),
  getDefaultAccountId: vi.fn(),
}));

vi.mock('@/core/utils/currencyConverter', () => ({
  YER_CODE: 'YER',
}));

import { accountingApi } from './api';
import { getDbAdapter } from '@/core/database/adapters';

function makeMockAdapter(queryImpl: (sql: string, params: unknown[]) => Promise<{ success: boolean; rows?: unknown[]; error?: string }>) {
  return { query: vi.fn(queryImpl) };
}

describe('accountingApi.applyPaymentToInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates invoice paid_amount and decrements customer balance for receipt', async () => {
    const queries: string[] = [];
    const adapter = makeMockAdapter(async (sql) => {
      queries.push(sql);
      if (sql.startsWith('WITH updated AS')) {
        return { success: true, rows: [{ customer_id: 'cust-1', total_amount: 1000, paid_amount: 250, currency_code: 'YER' }] };
      }
      return { success: true, rows: [] };
    });
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await accountingApi.applyPaymentToInvoice('rv-1', 'comp-1', 'inv-1', 250, 250, 'receipt', 'user-1');
    expect(res.success).toBe(true);
    const cteQuery = queries.find(q => q.startsWith('WITH updated AS'))!;
    expect(cteQuery).toMatch(/paid_amount = COALESCE\(i\.paid_amount, 0\) \+ \$1/);
    expect(cteQuery).toMatch(/base_currency_paid = COALESCE\(i\.base_currency_paid, 0\) \+ \$2/);
    expect(cteQuery).toMatch(/CASE.*paid.*THEN\s+'paid'/is);
    expect(queries.some(q => q.includes('UPDATE customers'))).toBe(true);
  });

  it('sets invoice status to paid when fully paid (via CTE CASE)', async () => {
    const queries: string[] = [];
    const adapter = makeMockAdapter(async (sql) => {
      queries.push(sql);
      if (sql.startsWith('WITH updated AS')) {
        return { success: true, rows: [{ customer_id: 'cust-1', total_amount: 1000, paid_amount: 1000, currency_code: 'YER' }] };
      }
      return { success: true, rows: [] };
    });
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await accountingApi.applyPaymentToInvoice('rv-1', 'comp-1', 'inv-1', 1000, 1000, 'receipt', 'user-1');
    expect(res.success).toBe(true);
    const cteQuery = queries.find(q => q.startsWith('WITH updated AS'))!;
    expect(cteQuery).toMatch(/'paid'/);
  });

  it('sets invoice status to partially_paid when partially paid (via CTE CASE)', async () => {
    const queries: string[] = [];
    const adapter = makeMockAdapter(async (sql) => {
      queries.push(sql);
      if (sql.startsWith('WITH updated AS')) {
        return { success: true, rows: [{ customer_id: 'cust-1', total_amount: 1000, paid_amount: 500, currency_code: 'YER' }] };
      }
      return { success: true, rows: [] };
    });
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await accountingApi.applyPaymentToInvoice('rv-1', 'comp-1', 'inv-1', 500, 500, 'receipt', 'user-1');
    expect(res.success).toBe(true);
    const cteQuery = queries.find(q => q.startsWith('WITH updated AS'))!;
    expect(cteQuery).toMatch(/'partially_paid'/);
  });

  it('increments supplier balance for payment voucher', async () => {
    const queries: string[] = [];
    const adapter = makeMockAdapter(async (sql) => {
      queries.push(sql);
      if (sql.startsWith('WITH updated AS')) {
        return { success: true, rows: [{ supplier_id: 'sup-1', total_amount: 1000, paid_amount: 0, currency_code: 'YER' }] };
      }
      return { success: true, rows: [] };
    });
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await accountingApi.applyPaymentToInvoice('pv-1', 'comp-1', 'pinv-1', 1000, 1000, 'payment', 'user-1');
    expect(res.success).toBe(true);
    expect(queries.some(q => q.includes('UPDATE suppliers'))).toBe(true);
    expect(queries.length).toBe(2);
  });

  it('returns error if invoice not found', async () => {
    const adapter = makeMockAdapter(async () => ({ success: true, rows: [] }));
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await accountingApi.applyPaymentToInvoice('rv-1', 'comp-1', 'inv-1', 100, 100, 'receipt', 'user-1');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not found/i);
  });
});

describe('accountingApi.createReceiptVoucher with payment application', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies payment to invoice when invoiceId and amountApplied are provided', async () => {
    const queries: string[] = [];
    const adapter = makeMockAdapter(async (sql) => {
      queries.push(sql);
      if (sql.startsWith('INSERT INTO receipt_vouchers')) {
        return { success: true, rows: [] };
      }
      if (sql.includes('UPDATE sales_invoices')) {
        return { success: true, rows: [{ total_amount: 1000, paid_amount: 250 }] };
      }
      if (sql.includes('SELECT customer_id')) {
        return { success: true, rows: [{ customer_id: 'cust-1' }] };
      }
      return { success: true, rows: [] };
    });
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await accountingApi.createReceiptVoucher({
      companyId: 'comp-1',
      voucherNumber: 'RV-001',
      date: '2026-06-01',
      customerId: 'cust-1',
      customerName: 'Cust 1',
      invoiceId: 'inv-1',
      amount: 250,
      amountApplied: 250,
      paymentMethod: 'cash',
      status: 'draft',
    } as never, 'user-1');

    expect(res.success).toBe(true);
    expect(queries.some(q => q.includes('UPDATE sales_invoices'))).toBe(true);
  });

  it('does not apply payment when amountApplied is 0', async () => {
    const queries: string[] = [];
    const adapter = makeMockAdapter(async (sql) => {
      queries.push(sql);
      if (sql.startsWith('INSERT INTO receipt_vouchers')) {
        return { success: true, rows: [] };
      }
      return { success: true, rows: [] };
    });
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await accountingApi.createReceiptVoucher({
      companyId: 'comp-1',
      voucherNumber: 'RV-001',
      date: '2026-06-01',
      customerId: 'cust-1',
      customerName: 'Cust 1',
      amount: 100,
      paymentMethod: 'cash',
      status: 'draft',
    } as never, 'user-1');

    expect(res.success).toBe(true);
    expect(queries.some(q => q.includes('UPDATE sales_invoices'))).toBe(false);
  });

  it('rejects when amountApplied exceeds amount', async () => {
    const adapter = makeMockAdapter(async () => ({ success: true, rows: [] }));
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await accountingApi.createReceiptVoucher({
      companyId: 'comp-1',
      voucherNumber: 'RV-001',
      date: '2026-06-01',
      customerId: 'cust-1',
      customerName: 'Cust 1',
      amount: 100,
      amountApplied: 200,
      paymentMethod: 'cash',
      status: 'draft',
    } as never, 'user-1');

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/amount applied/i);
  });
});

describe('accountingApi.deleteReceiptVoucher with applied payment protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects deletion when amountApplied > 0 (would break invoice balance)', async () => {
    const adapter = makeMockAdapter(async () => ({
      success: true,
      rows: [{ invoice_id: 'inv-1', amount_applied: 250, base_currency_applied: 250, status: 'posted' }],
    }));
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await accountingApi.deleteReceiptVoucher('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/applied payment/i);
  });

  it('allows deletion when amountApplied is 0 (no payment linked)', async () => {
    let deleteCalled = false;
    const adapter = makeMockAdapter(async (sql) => {
      if (sql.startsWith('SELECT')) {
        return { success: true, rows: [{ invoice_id: null, amount_applied: 0, base_currency_applied: 0, status: 'draft' }] };
      }
      if (sql.startsWith('DELETE')) {
        deleteCalled = true;
        return { success: true, rows: [] };
      }
      return { success: true, rows: [] };
    });
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await accountingApi.deleteReceiptVoucher('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');
    expect(res.success).toBe(true);
    expect(deleteCalled).toBe(true);
  });
});

describe('accountingApi.deletePaymentVoucher with applied payment protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects deletion when amountApplied > 0', async () => {
    const adapter = makeMockAdapter(async () => ({
      success: true,
      rows: [{ invoice_id: 'pinv-1', amount_applied: 500, base_currency_applied: 500, status: 'posted' }],
    }));
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await accountingApi.deletePaymentVoucher('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/applied payment/i);
  });
});

describe('accountingApi.updateReceiptVoucher with posted status protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects modifying invoiceId on posted voucher', async () => {
    const adapter = makeMockAdapter(async () => ({
      success: true,
      rows: [{ status: 'posted', amount_applied: 100, base_currency_applied: 100, invoice_id: 'inv-1' }],
    }));
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await accountingApi.updateReceiptVoucher(
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      'user-1',
      { invoiceId: 'inv-2' } as never
    );
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/posted voucher/i);
  });

  it('rejects modifying amountApplied on posted voucher', async () => {
    const adapter = makeMockAdapter(async () => ({
      success: true,
      rows: [{ status: 'posted', amount_applied: 100, base_currency_applied: 100, invoice_id: 'inv-1' }],
    }));
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await accountingApi.updateReceiptVoucher(
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      'user-1',
      { amountApplied: 200 } as never
    );
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/posted voucher/i);
  });

  it('allows modifying other fields on posted voucher', async () => {
    const queries: string[] = [];
    const adapter = makeMockAdapter(async (sql) => {
      queries.push(sql);
      if (sql.startsWith('SELECT')) {
        return { success: true, rows: [{ status: 'posted', amount_applied: 100, base_currency_applied: 100, invoice_id: 'inv-1' }] };
      }
      return { success: true, rows: [] };
    });
    vi.mocked(getDbAdapter).mockResolvedValue(adapter as never);

    const res = await accountingApi.updateReceiptVoucher(
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      'user-1',
      { notes: 'Updated notes' } as never
    );
    expect(res.success).toBe(true);
    expect(queries.some(q => q.startsWith('UPDATE'))).toBe(true);
  });
});
