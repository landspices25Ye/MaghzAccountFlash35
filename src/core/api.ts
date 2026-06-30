import { getDbAdapter } from '@/core/database/adapters';
import { mapRows } from '@/core/utils/mapPgRow';
import type { DocumentSequence, ProductType, Unit, CashBox, Bank, CostCenter, PayrollComponent, DefaultAccount } from './types';

// ─── Document Sequences ───────────────────────────────────────────────────────
export async function getDocumentSequences(companyId: string): Promise<{ success: boolean; data?: DocumentSequence[]; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query('SELECT * FROM document_sequences WHERE company_id = $1 ORDER BY document_type', [companyId]);
  return result.success ? { success: true, data: mapRows<DocumentSequence>(result.rows) } : { success: false, error: result.error };
}

export async function updateDocumentSequence(id: string, data: Partial<DocumentSequence>, companyId: string): Promise<{ success: boolean; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query(
    'UPDATE document_sequences SET prefix = $1, suffix = $2, starting_number = $3, current_number = $4, increment_step = $5, padding_length = $6, year_reset = $7, is_active = $8, updated_at = NOW() WHERE id = $9 AND company_id = $10',
    [data.prefix, data.suffix, data.startingNumber, data.currentNumber, data.incrementStep, data.paddingLength, data.yearReset, data.isActive, id, companyId]
  );
  return result.success ? { success: true } : { success: false, error: result.error };
}

function formatSequenceNumber(seq: DocumentSequence): string {
  const num = String(seq.currentNumber + (seq.incrementStep || 1)).padStart(seq.paddingLength || 4, '0');
  let prefix = seq.prefix || '';
  let suffix = seq.suffix || '';
  if (seq.yearReset) {
    const currentYear = new Date().getFullYear();
    prefix = prefix.replace(/YYYY/g, String(currentYear)).replace(/YY/g, String(currentYear).slice(-2));
    suffix = suffix.replace(/YYYY/g, String(currentYear)).replace(/YY/g, String(currentYear).slice(-2));
  }
  // Avoid double dash
  const sep = prefix && !prefix.endsWith('-') ? '-' : '';
  return `${prefix}${sep}${num}${suffix}`;
}

export async function getNextDocumentNumber(companyId: string, documentType: string): Promise<{ success: boolean; number?: string; error?: string }> {
  const adapter = await getDbAdapter();
  // Try up to 10 times to handle the case where the sequence is behind
  // (e.g., after seed reset or manual inserts that didn't update the sequence)
  for (let attempt = 0; attempt < 10; attempt++) {
    // Atomically increment and return the new value
    const updateResult = await adapter.query(
      `UPDATE document_sequences
       SET current_number = current_number + increment_step, updated_at = NOW()
       WHERE company_id = $1 AND document_type = $2 AND is_active = true
       RETURNING *`,
      [companyId, documentType]
    );
    if (!updateResult.success || !updateResult.rows?.[0]) {
      return { success: false, error: 'Sequence not found' };
    }
    const rawSeq = updateResult.rows[0] as Record<string, unknown>;
    const incrementStep = Number(rawSeq.increment_step) || 1;
    const usedSeq: DocumentSequence = {
      ...mapRows<DocumentSequence>([rawSeq])[0],
      currentNumber: Number(rawSeq.current_number) - incrementStep,
    };
    const fullNumber = formatSequenceNumber(usedSeq);

    // Check if this number already exists for the given document type
    const tableName = getTableForDocumentType(documentType);
    if (!tableName) {
      return { success: true, number: fullNumber };
    }
    const numberColumn = getNumberColumnForDocumentType(documentType);
    const checkResult = await adapter.query(
      `SELECT 1 FROM ${tableName} WHERE company_id = $1 AND ${numberColumn} = $2 LIMIT 1`,
      [companyId, fullNumber]
    );
    if (checkResult.success && (!checkResult.rows || checkResult.rows.length === 0)) {
      return { success: true, number: fullNumber };
    }
    // Number already used, loop will try again with incremented value
  }
  return { success: false, error: 'Could not generate unique document number after 10 attempts' };
}

function getTableForDocumentType(documentType: string): string | null {
  const map: Record<string, string> = {
    sales_invoice: 'sales_invoices',
    quotation: 'quotations',
    purchase_order: 'purchase_orders',
    purchase_invoice: 'purchase_invoices',
    journal_voucher: 'transactions',
    receipt_voucher: 'receipt_vouchers',
    payment_voucher: 'payment_vouchers',
    work_order: 'work_orders',
    payroll_run: 'payroll_runs',
    product: 'products',
  };
  return map[documentType] || null;
}

function getNumberColumnForDocumentType(documentType: string): string {
  const map: Record<string, string> = {
    sales_invoice: 'invoice_number',
    quotation: 'quotation_number',
    purchase_order: 'order_number',
    purchase_invoice: 'invoice_number',
    journal_voucher: 'reference',
    receipt_voucher: 'voucher_number',
    payment_voucher: 'voucher_number',
    work_order: 'order_number',
    payroll_run: 'run_number',
    product: 'code',
  };
  return map[documentType] || 'number';
}

export async function peekNextDocumentNumber(companyId: string, documentType: string): Promise<{ success: boolean; number?: string; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query('SELECT * FROM document_sequences WHERE company_id = $1 AND document_type = $2 AND is_active = true', [companyId, documentType]);
  if (!result.success || !result.rows?.[0]) return { success: false, error: 'Sequence not found' };
  const seq = mapRows<DocumentSequence>([result.rows[0]])[0];
  // Preview only: use currentNumber (as if next consumption) without incrementing
  const previewSeq = { ...seq, currentNumber: seq.currentNumber + (seq.incrementStep || 1) };
  return { success: true, number: formatSequenceNumber(previewSeq) };
}

// ─── Product Types ────────────────────────────────────────────────────────────
export async function getProductTypes(companyId: string): Promise<{ success: boolean; data?: ProductType[]; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query('SELECT * FROM product_types WHERE company_id = $1 ORDER BY name_ar', [companyId]);
  return result.success ? { success: true, data: mapRows<ProductType>(result.rows) } : { success: false, error: result.error };
}

export async function createProductType(data: Omit<ProductType, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query<{ id: string }>(
    `INSERT INTO product_types (company_id, name_ar, name_en, code, appears_in_sales, appears_in_purchases, appears_in_inventory, appears_in_manufacturing, has_stock_tracking, has_bom, default_sales_account_id, default_cogs_account_id, default_inventory_account_id, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
    [data.companyId, data.nameAr, data.nameEn, data.code, data.appearsInSales, data.appearsInPurchases, data.appearsInInventory, data.appearsInManufacturing, data.hasStockTracking, data.hasBOM, data.defaultSalesAccountId, data.defaultCOGSAccountId, data.defaultInventoryAccountId, data.isActive]
  );
  return result.success && result.rows?.[0] ? { success: true, id: result.rows[0].id } : { success: false, error: result.error };
}

export async function updateProductType(id: string, data: Partial<ProductType>, companyId: string): Promise<{ success: boolean; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query(
    `UPDATE product_types SET name_ar = $1, name_en = $2, code = $3, appears_in_sales = $4, appears_in_purchases = $5, appears_in_inventory = $6, appears_in_manufacturing = $7, has_stock_tracking = $8, has_bom = $9, default_sales_account_id = $10, default_cogs_account_id = $11, default_inventory_account_id = $12, is_active = $13 WHERE id = $14 AND company_id = $15`,
    [data.nameAr, data.nameEn, data.code, data.appearsInSales, data.appearsInPurchases, data.appearsInInventory, data.appearsInManufacturing, data.hasStockTracking, data.hasBOM, data.defaultSalesAccountId, data.defaultCOGSAccountId, data.defaultInventoryAccountId, data.isActive, id, companyId]
  );
  return result.success ? { success: true } : { success: false, error: result.error };
}

export async function deleteProductType(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query('DELETE FROM product_types WHERE id = $1 AND company_id = $2', [id, companyId]);
  return result.success ? { success: true } : { success: false, error: result.error };
}

// ─── Units ────────────────────────────────────────────────────────────────────
export async function getUnits(companyId: string): Promise<{ success: boolean; data?: Unit[]; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query('SELECT * FROM units WHERE company_id = $1 AND is_active = true ORDER BY name_ar', [companyId]);
  return result.success ? { success: true, data: mapRows<Unit>(result.rows) } : { success: false, error: result.error };
}

export async function createUnit(data: Omit<Unit, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query<{ id: string }>(
    'INSERT INTO units (company_id, name_ar, name_en, code, conversion_factor, base_unit_id, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [data.companyId, data.nameAr, data.nameEn, data.code, data.conversionFactor, data.baseUnitId, data.isActive]
  );
  return result.success && result.rows?.[0] ? { success: true, id: result.rows[0].id } : { success: false, error: result.error };
}

export async function updateUnit(id: string, data: Partial<Unit>, companyId: string): Promise<{ success: boolean; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query(
    'UPDATE units SET name_ar = $1, name_en = $2, code = $3, conversion_factor = $4, base_unit_id = $5, is_active = $6 WHERE id = $7 AND company_id = $8',
    [data.nameAr, data.nameEn, data.code, data.conversionFactor, data.baseUnitId, data.isActive, id, companyId]
  );
  return result.success ? { success: true } : { success: false, error: result.error };
}

export async function deleteUnit(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query('DELETE FROM units WHERE id = $1 AND company_id = $2', [id, companyId]);
  return result.success ? { success: true } : { success: false, error: result.error };
}

// ─── Cash Boxes ───────────────────────────────────────────────────────────────
export async function getCashBoxes(companyId: string): Promise<{ success: boolean; data?: CashBox[]; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query('SELECT * FROM cash_boxes WHERE company_id = $1 AND is_active = true ORDER BY name', [companyId]);
  return result.success ? { success: true, data: mapRows<CashBox>(result.rows) } : { success: false, error: result.error };
}

export async function createCashBox(data: Omit<CashBox, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query<{ id: string }>(
    'INSERT INTO cash_boxes (company_id, name, code, account_id, branch_id, responsible_user_id, is_active, current_balance) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
    [data.companyId, data.name, data.code, data.accountId, data.branchId, data.responsibleUserId, data.isActive, data.currentBalance]
  );
  return result.success && result.rows?.[0] ? { success: true, id: result.rows[0].id } : { success: false, error: result.error };
}

export async function updateCashBox(id: string, data: Partial<CashBox>, companyId: string): Promise<{ success: boolean; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query(
    'UPDATE cash_boxes SET name = $1, code = $2, account_id = $3, branch_id = $4, responsible_user_id = $5, is_active = $6, current_balance = $7 WHERE id = $8 AND company_id = $9',
    [data.name, data.code, data.accountId, data.branchId, data.responsibleUserId, data.isActive, data.currentBalance, id, companyId]
  );
  return result.success ? { success: true } : { success: false, error: result.error };
}

// ─── Banks ────────────────────────────────────────────────────────────────────
export async function getBanks(companyId: string): Promise<{ success: boolean; data?: Bank[]; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query('SELECT * FROM banks WHERE company_id = $1 AND is_active = true ORDER BY name', [companyId]);
  return result.success ? { success: true, data: mapRows<Bank>(result.rows) } : { success: false, error: result.error };
}

export async function createBank(data: Omit<Bank, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query<{ id: string }>(
    'INSERT INTO banks (company_id, name, bank_name, account_number, iban, account_id, branch_id, is_active, current_balance) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
    [data.companyId, data.name, data.bankName, data.accountNumber, data.iban, data.accountId, data.branchId, data.isActive, data.currentBalance]
  );
  return result.success && result.rows?.[0] ? { success: true, id: result.rows[0].id } : { success: false, error: result.error };
}

export async function updateBank(id: string, data: Partial<Bank>, companyId: string): Promise<{ success: boolean; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query(
    'UPDATE banks SET name = $1, bank_name = $2, account_number = $3, iban = $4, account_id = $5, branch_id = $6, is_active = $7, current_balance = $8 WHERE id = $9 AND company_id = $10',
    [data.name, data.bankName, data.accountNumber, data.iban, data.accountId, data.branchId, data.isActive, data.currentBalance, id, companyId]
  );
  return result.success ? { success: true } : { success: false, error: result.error };
}

// ─── Delete Cash Boxes and Banks ──────────────────────────────────────────────
export async function deleteCashBox(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query('DELETE FROM cash_boxes WHERE id = $1 AND company_id = $2', [id, companyId]);
  return result.success ? { success: true } : { success: false, error: result.error };
}

export async function deleteBank(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query('DELETE FROM banks WHERE id = $1 AND company_id = $2', [id, companyId]);
  return result.success ? { success: true } : { success: false, error: result.error };
}

// ─── Cost Centers ─────────────────────────────────────────────────────────────
export async function getCostCenters(companyId: string): Promise<{ success: boolean; data?: CostCenter[]; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query('SELECT * FROM cost_centers WHERE company_id = $1 AND is_active = true ORDER BY name_ar', [companyId]);
  return result.success ? { success: true, data: mapRows<CostCenter>(result.rows) } : { success: false, error: result.error };
}

export async function createCostCenter(data: Omit<CostCenter, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query<{ id: string }>(
    'INSERT INTO cost_centers (company_id, name_ar, name_en, code, parent_id, type, budget_amount, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
    [data.companyId, data.nameAr, data.nameEn, data.code, data.parentId, data.type, data.budgetAmount, data.isActive]
  );
  return result.success && result.rows?.[0] ? { success: true, id: result.rows[0].id } : { success: false, error: result.error };
}

export async function updateCostCenter(id: string, data: Partial<CostCenter>, companyId: string): Promise<{ success: boolean; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query(
    'UPDATE cost_centers SET name_ar = $1, name_en = $2, code = $3, parent_id = $4, type = $5, budget_amount = $6, is_active = $7 WHERE id = $8 AND company_id = $9',
    [data.nameAr, data.nameEn, data.code, data.parentId, data.type, data.budgetAmount, data.isActive, id, companyId]
  );
  return result.success ? { success: true } : { success: false, error: result.error };
}

export async function deleteCostCenter(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query('DELETE FROM cost_centers WHERE id = $1 AND company_id = $2', [id, companyId]);
  return result.success ? { success: true } : { success: false, error: result.error };
}

// ─── Payroll Components ───────────────────────────────────────────────────────
export async function getPayrollComponents(companyId: string): Promise<{ success: boolean; data?: PayrollComponent[]; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query('SELECT * FROM payroll_components WHERE company_id = $1 AND is_active = true ORDER BY type, name_ar', [companyId]);
  return result.success ? { success: true, data: mapRows<PayrollComponent>(result.rows) } : { success: false, error: result.error };
}

export async function createPayrollComponent(data: Omit<PayrollComponent, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query<{ id: string }>(
    `INSERT INTO payroll_components (company_id, name_ar, name_en, code, type, calculation_method, default_amount, affects_gross_salary, affects_tax, affects_social_insurance, default_account_id, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [data.companyId, data.nameAr, data.nameEn, data.code, data.type, data.calculationMethod, data.defaultAmount, data.affectsGrossSalary, data.affectsTax, data.affectsSocialInsurance, data.defaultAccountId, data.isActive]
  );
  return result.success && result.rows?.[0] ? { success: true, id: result.rows[0].id } : { success: false, error: result.error };
}

export async function updatePayrollComponent(id: string, data: Partial<PayrollComponent>, companyId: string): Promise<{ success: boolean; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query(
    `UPDATE payroll_components SET name_ar = $1, name_en = $2, code = $3, type = $4, calculation_method = $5, default_amount = $6, affects_gross_salary = $7, affects_tax = $8, affects_social_insurance = $9, default_account_id = $10, is_active = $11 WHERE id = $12 AND company_id = $13`,
    [data.nameAr, data.nameEn, data.code, data.type, data.calculationMethod, data.defaultAmount, data.affectsGrossSalary, data.affectsTax, data.affectsSocialInsurance, data.defaultAccountId, data.isActive, id, companyId]
  );
  return result.success ? { success: true } : { success: false, error: result.error };
}

// ─── Default Accounts ─────────────────────────────────────────────────────────
export async function getDefaultAccounts(companyId: string): Promise<{ success: boolean; data?: DefaultAccount[]; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query('SELECT * FROM default_accounts WHERE company_id = $1 ORDER BY function_key', [companyId]);
  return result.success ? { success: true, data: mapRows<DefaultAccount>(result.rows) } : { success: false, error: result.error };
}

export async function updateDefaultAccount(id: string, accountId: string | null, companyId: string): Promise<{ success: boolean; error?: string }> {
  const adapter = await getDbAdapter();
  const result = await adapter.query('UPDATE default_accounts SET account_id = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3', [accountId, id, companyId]);
  return result.success ? { success: true } : { success: false, error: result.error };
}

export async function applyDefaultTemplate(companyId: string, template: 'trading' | 'manufacturing' | 'services'): Promise<{ success: boolean; error?: string }> {
  // Templates map function keys to account codes
  const templates: Record<string, Record<string, string>> = {
    trading: {
      default_cash: '11101', default_bank: '11102', default_sales: '41101', default_cogs: '51101',
      default_inventory: '11301', default_debtors: '11201', default_creditors: '21101',
      default_vat_output: '21301', default_vat_input: '21301', default_salaries: '52101',
      default_sales_returns: '41103', default_purchase_returns: '21101',
    },
    manufacturing: {
      default_cash: '11101', default_bank: '11102', default_sales: '41101', default_cogs: '51101',
      default_inventory: '11301', default_debtors: '11201', default_creditors: '21101',
      default_vat_output: '21301', default_vat_input: '21301', default_salaries: '52101',
      default_sales_returns: '41103', default_purchase_returns: '21101',
    },
    services: {
      default_cash: '11101', default_bank: '11102', default_sales: '41102', default_cogs: '51101',
      default_inventory: '11301', default_debtors: '11201', default_creditors: '21101',
      default_vat_output: '21301', default_vat_input: '21301', default_salaries: '52101',
      default_sales_returns: '41103', default_purchase_returns: '21101',
    },
  };
  const adapter = await getDbAdapter();
  const t = templates[template];
  for (const [functionKey, code] of Object.entries(t)) {
    // Find account id by code
    const accResult = await adapter.query<{ id: string }>('SELECT id FROM accounts WHERE company_id = $1 AND code = $2', [companyId, code]);
    if (accResult.success && accResult.rows?.[0]) {
      await adapter.query(
        'UPDATE default_accounts SET account_id = $1 WHERE company_id = $2 AND function_key = $3',
        [accResult.rows[0].id, companyId, functionKey]
      );
    }
  }
  return { success: true };
}
