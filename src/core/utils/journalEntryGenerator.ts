import { getDbAdapter } from '@/core/database/adapters';

/**
 * Automatically generates journal entries (accounting transactions)
 * for business documents like invoices, vouchers, returns, etc.
 */

export interface JournalEntryLine {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface AutoJournalEntry {
  reference: string;
  description: string;
  date: string;
  totalAmount: number;
  entries: JournalEntryLine[];
}

// Well-known account codes from our chart of accounts
const ACC = {
  CASH: '11101',           // الصندوق الرئيسي
  BANK: '11102',           // البنك اليمني الدولي
  TRADE_DEBTORS: '11201',  // مدينون تجاريون
  INVENTORY: '11301',      // بضاعة أول المدة
  PREPAID_RENT: '11401',   // إيجار مدفوع مقدماً
  TRADE_CREDITORS: '21101',// دائنون تجاريون
  VAT_PAYABLE: '21301',    // ضريبة القيمة المضافة
  SALES: '41101',          // مبيعات المنتجات
  SALES_SERVICES: '41102', // مبيعات الخدمات
  SALES_RETURNS: '41103',  // مردودات المبيعات
  COGS: '51101',           // تكلفة بضاعة مباعة
  SALARIES: '52101',       // رواتب موظفين
  RENT_WAREHOUSE: '52201', // إيجار مستودعات
  RENT_OFFICE: '52202',    // إيجار مكاتب
  ELECTRICITY: '52301',    // كهرباء وماء
  ADVERTISING: '52401',    // إعلانات ودعاية
  MAINTENANCE: '52501',    // صيانة معدات
  SHIPPING: '52601',       // نقل وشحن
  BUILDING_DEP: '52701',   // استهلاك مباني
  EQUIPMENT_DEP: '52702',  // استهلاك معدات
};

async function findAccountByCode(companyId: string, code: string): Promise<string | null> {
  const adapter = await getDbAdapter();
  const result = await adapter.query(
    `SELECT id FROM accounts WHERE company_id = $1 AND code = $2`,
    [companyId, code]
  );
  return result.rows?.[0]?.id || null;
}

async function createTransaction(companyId: string, entry: AutoJournalEntry) {
  const adapter = await getDbAdapter();
  return adapter.createTransaction({
    companyId,
    date: entry.date,
    reference: entry.reference,
    description: entry.description,
    totalAmount: entry.totalAmount,
    status: 'posted',
    entries: entry.entries,
  });
}

/**
 * Post a Sales Invoice to accounting
 * Dr: Trade Debtors (Customer)
 * Cr: Sales Revenue
 * Cr: VAT Payable
 */
export async function postSalesInvoice(
  companyId: string,
  invoice: { invoiceNumber: string; date: string; customerId: string; subtotal: number; vatAmount: number; totalAmount: number }
) {
  const debtorsId = await findAccountByCode(companyId, ACC.TRADE_DEBTORS);
  const salesId = await findAccountByCode(companyId, ACC.SALES);
  const vatId = await findAccountByCode(companyId, ACC.VAT_PAYABLE);

  if (!debtorsId || !salesId || !vatId) {
    return { success: false, error: 'Required accounts not found in chart of accounts' };
  }

  const entries: JournalEntryLine[] = [
    { accountId: debtorsId, debit: invoice.totalAmount, credit: 0, memo: `فاتورة مبيعات ${invoice.invoiceNumber}` },
    { accountId: salesId, debit: 0, credit: invoice.subtotal, memo: `إيرادات مبيعات ${invoice.invoiceNumber}` },
    { accountId: vatId, debit: 0, credit: invoice.vatAmount, memo: `ضريبة مبيعات ${invoice.invoiceNumber}` },
  ];

  return createTransaction(companyId, {
    reference: invoice.invoiceNumber,
    description: `قيد تلقائي - فاتورة مبيعات ${invoice.invoiceNumber}`,
    date: invoice.date,
    totalAmount: invoice.totalAmount,
    entries,
  });
}

/**
 * Post a Purchase Invoice to accounting
 * Dr: Inventory / Purchases
 * Cr: Trade Creditors (Supplier)
 * Dr: VAT Recoverable (if applicable)
 */
export async function postPurchaseInvoice(
  companyId: string,
  invoice: { invoiceNumber: string; date: string; supplierId: string; subtotal: number; vatAmount: number; totalAmount: number }
) {
  const inventoryId = await findAccountByCode(companyId, ACC.INVENTORY);
  const creditorsId = await findAccountByCode(companyId, ACC.TRADE_CREDITORS);
  const vatId = await findAccountByCode(companyId, ACC.VAT_PAYABLE);

  if (!inventoryId || !creditorsId || !vatId) {
    return { success: false, error: 'Required accounts not found' };
  }

  const entries: JournalEntryLine[] = [
    { accountId: inventoryId, debit: invoice.subtotal, credit: 0, memo: `مشتريات ${invoice.invoiceNumber}` },
    { accountId: vatId, debit: invoice.vatAmount, credit: 0, memo: `ضريبة مشتريات ${invoice.invoiceNumber}` },
    { accountId: creditorsId, debit: 0, credit: invoice.totalAmount, memo: `التزام مورد ${invoice.invoiceNumber}` },
  ];

  return createTransaction(companyId, {
    reference: invoice.invoiceNumber,
    description: `قيد تلقائي - فاتورة مشتريات ${invoice.invoiceNumber}`,
    date: invoice.date,
    totalAmount: invoice.totalAmount,
    entries,
  });
}

/**
 * Post a Receipt Voucher to accounting
 * Dr: Cash / Bank
 * Cr: Trade Debtors
 */
export async function postReceiptVoucher(
  companyId: string,
  voucher: { voucherNumber: string; date: string; customer: string; amount: number; paymentMethod: string }
) {
  const cashId = await findAccountByCode(companyId, ACC.CASH);
  const bankId = await findAccountByCode(companyId, ACC.BANK);
  const debtorsId = await findAccountByCode(companyId, ACC.TRADE_DEBTORS);

  if (!cashId || !debtorsId) {
    return { success: false, error: 'Required accounts not found' };
  }

  const debitAccount = voucher.paymentMethod === 'bank' && bankId ? bankId : cashId;

  const entries: JournalEntryLine[] = [
    { accountId: debitAccount, debit: voucher.amount, credit: 0, memo: `قبض من ${voucher.customer}` },
    { accountId: debtorsId, debit: 0, credit: voucher.amount, memo: `تخفيض ذمة ${voucher.customer}` },
  ];

  return createTransaction(companyId, {
    reference: voucher.voucherNumber,
    description: `قيد تلقائي - سند قبض ${voucher.voucherNumber} - ${voucher.customer}`,
    date: voucher.date,
    totalAmount: voucher.amount,
    entries,
  });
}

/**
 * Post a Payment Voucher to accounting
 * Dr: Trade Creditors / Expense Account
 * Cr: Cash / Bank
 */
export async function postPaymentVoucher(
  companyId: string,
  voucher: { voucherNumber: string; date: string; supplier: string; amount: number; paymentMethod: string; expenseAccount?: string }
) {
  const cashId = await findAccountByCode(companyId, ACC.CASH);
  const bankId = await findAccountByCode(companyId, ACC.BANK);
  const creditorsId = await findAccountByCode(companyId, ACC.TRADE_CREDITORS);
  const rentWarehouseId = await findAccountByCode(companyId, ACC.RENT_WAREHOUSE);
  const rentOfficeId = await findAccountByCode(companyId, ACC.RENT_OFFICE);
  const electricityId = await findAccountByCode(companyId, ACC.ELECTRICITY);
  const advertisingId = await findAccountByCode(companyId, ACC.ADVERTISING);
  const maintenanceId = await findAccountByCode(companyId, ACC.MAINTENANCE);
  const shippingId = await findAccountByCode(companyId, ACC.SHIPPING);

  if (!cashId || !creditorsId) {
    return { success: false, error: 'Required accounts not found' };
  }

  const creditAccount = voucher.paymentMethod === 'bank' && bankId ? bankId : cashId;

  // Determine debit account based on expense type
  let debitAccount = creditorsId;
  if (voucher.expenseAccount) {
    const expLower = voucher.expenseAccount.toLowerCase();
    if (expLower.includes('إيجار') && expLower.includes('مستودع')) debitAccount = rentWarehouseId || creditorsId;
    else if (expLower.includes('إيجار')) debitAccount = rentOfficeId || creditorsId;
    else if (expLower.includes('كهرب')) debitAccount = electricityId || creditorsId;
    else if (expLower.includes('إعلان') || expLower.includes('دعاية')) debitAccount = advertisingId || creditorsId;
    else if (expLower.includes('صيانة')) debitAccount = maintenanceId || creditorsId;
    else if (expLower.includes('نقل') || expLower.includes('شحن')) debitAccount = shippingId || creditorsId;
  }

  const entries: JournalEntryLine[] = [
    { accountId: debitAccount, debit: voucher.amount, credit: 0, memo: `صرف لـ ${voucher.supplier}` },
    { accountId: creditAccount, debit: 0, credit: voucher.amount, memo: `سحب نقدي/بنكي` },
  ];

  return createTransaction(companyId, {
    reference: voucher.voucherNumber,
    description: `قيد تلقائي - سند صرف ${voucher.voucherNumber} - ${voucher.supplier}`,
    date: voucher.date,
    totalAmount: voucher.amount,
    entries,
  });
}

/**
 * Post a Sales Return to accounting (reverse of sales)
 * Dr: Sales Returns
 * Cr: Trade Debtors
 */
export async function postSalesReturn(
  companyId: string,
  ret: { returnNumber: string; date: string; customer: string; amount: number }
) {
  const salesReturnsId = await findAccountByCode(companyId, ACC.SALES_RETURNS);
  const debtorsId = await findAccountByCode(companyId, ACC.TRADE_DEBTORS);
  const inventoryId = await findAccountByCode(companyId, ACC.INVENTORY);

  if (!salesReturnsId || !debtorsId || !inventoryId) {
    return { success: false, error: 'Required accounts not found' };
  }

  const entries: JournalEntryLine[] = [
    { accountId: salesReturnsId, debit: ret.amount, credit: 0, memo: `مردود مبيعات ${ret.returnNumber}` },
    { accountId: debtorsId, debit: 0, credit: ret.amount, memo: `تخفيض ذمة ${ret.customer}` },
    // Also return inventory (simplified: assume full return to inventory)
    { accountId: inventoryId, debit: Math.floor(ret.amount * 0.7), credit: 0, memo: `إعادة بضاعة للمخزون` },
    { accountId: await findAccountByCode(companyId, ACC.COGS) || inventoryId, debit: 0, credit: Math.floor(ret.amount * 0.7), memo: `عكس تكلفة بضاعة مباعة` },
  ];

  return createTransaction(companyId, {
    reference: ret.returnNumber,
    description: `قيد تلقائي - مردود مبيعات ${ret.returnNumber}`,
    date: ret.date,
    totalAmount: ret.amount,
    entries,
  });
}

/**
 * Post a Purchase Return to accounting
 * Dr: Trade Creditors
 * Cr: Inventory
 */
export async function postPurchaseReturn(
  companyId: string,
  ret: { returnNumber: string; date: string; supplier: string; amount: number }
) {
  const creditorsId = await findAccountByCode(companyId, ACC.TRADE_CREDITORS);
  const inventoryId = await findAccountByCode(companyId, ACC.INVENTORY);

  if (!creditorsId || !inventoryId) {
    return { success: false, error: 'Required accounts not found' };
  }

  const entries: JournalEntryLine[] = [
    { accountId: creditorsId, debit: ret.amount, credit: 0, memo: `تخفيض التزام ${ret.supplier}` },
    { accountId: inventoryId, debit: 0, credit: ret.amount, memo: `إخراج بضاعة مردودة ${ret.returnNumber}` },
  ];

  return createTransaction(companyId, {
    reference: ret.returnNumber,
    description: `قيد تلقائي - مردود مشتريات ${ret.returnNumber}`,
    date: ret.date,
    totalAmount: ret.amount,
    entries,
  });
}

/**
 * Post an Inventory Transaction to accounting
 * In: Dr Inventory, Cr Creditors (or Cash if paid)
 * Out: Dr COGS, Cr Inventory
 */
export async function postInventoryTransaction(
  companyId: string,
  tx: { reference: string; date: string; type: 'in' | 'out' | 'adjustment' | 'transfer'; product: string; amount: number }
) {
  const inventoryId = await findAccountByCode(companyId, ACC.INVENTORY);
  const cogsId = await findAccountByCode(companyId, ACC.COGS);
  const cashId = await findAccountByCode(companyId, ACC.CASH);

  if (!inventoryId) {
    return { success: false, error: 'Inventory account not found' };
  }

  let entries: JournalEntryLine[] = [];
  let description = '';

  if (tx.type === 'in') {
    entries = [
      { accountId: inventoryId, debit: tx.amount, credit: 0, memo: `استلام ${tx.product}` },
      { accountId: cashId || inventoryId, debit: 0, credit: tx.amount, memo: `دفع قيمة المشتريات` },
    ];
    description = `قيد تلقائي - استلام مخزون ${tx.reference}`;
  } else if (tx.type === 'out') {
    entries = [
      { accountId: cogsId || inventoryId, debit: tx.amount, credit: 0, memo: `تكلفة بضاعة مباعة ${tx.product}` },
      { accountId: inventoryId, debit: 0, credit: tx.amount, memo: `صرف ${tx.product}` },
    ];
    description = `قيد تلقائي - صرف مخزون ${tx.reference}`;
  } else if (tx.type === 'adjustment') {
    // Adjustment handled separately
    return { success: true, id: 'skip' };
  }

  if (entries.length === 0) return { success: true, id: 'skip' };

  return createTransaction(companyId, {
    reference: tx.reference,
    description,
    date: tx.date,
    totalAmount: tx.amount,
    entries,
  });
}

/**
 * Post a Stock Adjustment to accounting
 * Positive difference (found): Dr Inventory, Cr Income
 * Negative difference (lost): Dr Loss, Cr Inventory
 */
export async function postStockAdjustment(
  companyId: string,
  adj: { id: string; date: string; product: string; difference: number; reason: string }
) {
  const inventoryId = await findAccountByCode(companyId, ACC.INVENTORY);
  const cogsId = await findAccountByCode(companyId, ACC.COGS);

  if (!inventoryId) {
    return { success: false, error: 'Inventory account not found' };
  }

  const entries: JournalEntryLine[] = [];
  if (adj.difference > 0) {
    entries.push(
      { accountId: inventoryId, debit: adj.difference, credit: 0, memo: `عثور ${adj.product}` },
      { accountId: cogsId || inventoryId, debit: 0, credit: adj.difference, memo: `إيراد عثور` }
    );
  } else if (adj.difference < 0) {
    const loss = Math.abs(adj.difference);
    entries.push(
      { accountId: cogsId || inventoryId, debit: loss, credit: 0, memo: `فاقد ${adj.product}` },
      { accountId: inventoryId, debit: 0, credit: loss, memo: `خسارة مخزون` }
    );
  }

  if (entries.length === 0) return { success: true, id: 'skip' };

  return createTransaction(companyId, {
    reference: `ADJ-${adj.id}`,
    description: `قيد تلقائي - تسوية مخزون ${adj.id} - ${adj.reason}`,
    date: adj.date,
    totalAmount: Math.abs(adj.difference),
    entries,
  });
}
