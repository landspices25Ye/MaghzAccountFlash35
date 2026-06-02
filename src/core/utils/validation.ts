import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const companyIdSchema = z.string().uuid().min(1);
export const userIdSchema = z.string().uuid().min(1);

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50),
});

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

export const currencyAmountSchema = z.number().min(0).multipleOf(0.0001);

export const percentageSchema = z.number().min(0).max(100).multipleOf(0.01);

export const nonEmptyString = z.string().min(1).max(255);

export const emailSchema = z.string().email().optional().or(z.literal(''));

export const phoneSchema = z.string().max(50).optional().or(z.literal(''));

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
  return { success: false, error: errors };
}

export const idCompanySchema = z.object({
  id: uuidSchema,
  companyId: companyIdSchema,
});

export const createAccountSchema = z.object({
  companyId: companyIdSchema,
  code: z.string().min(1).max(20),
  nameAr: z.string().min(1).max(255),
  nameEn: z.string().max(255).optional(),
  parentId: uuidSchema.optional(),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  nature: z.enum(['debit', 'credit']),
  isGroup: z.boolean().default(false),
  balance: currencyAmountSchema.default(0),
  isActive: z.boolean().default(true),
});

export const createTransactionSchema = z.object({
  companyId: companyIdSchema,
  date: dateSchema,
  reference: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  totalAmount: currencyAmountSchema,
  status: z.enum(['draft', 'posted', 'cancelled']).default('draft'),
  entries: z.array(z.object({
    accountId: uuidSchema,
    debit: currencyAmountSchema,
    credit: currencyAmountSchema,
    memo: z.string().max(500).optional(),
  })).min(1),
});

export const createReceiptVoucherSchema = z.object({
  companyId: companyIdSchema,
  voucherNumber: nonEmptyString,
  date: dateSchema,
  customerId: uuidSchema,
  amount: currencyAmountSchema,
  paymentMethod: z.string().max(50),
  bankAccountId: uuidSchema.optional(),
  checkNumber: z.string().max(50).optional(),
  checkDate: dateSchema.optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['draft', 'posted', 'cancelled']).default('draft'),
});

export const createPaymentVoucherSchema = z.object({
  companyId: companyIdSchema,
  voucherNumber: nonEmptyString,
  date: dateSchema,
  supplierId: uuidSchema,
  expenseAccountId: uuidSchema.optional(),
  amount: currencyAmountSchema,
  paymentMethod: z.string().max(50),
  bankAccountId: uuidSchema.optional(),
  checkNumber: z.string().max(50).optional(),
  checkDate: dateSchema.optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['draft', 'posted', 'cancelled']).default('draft'),
});

export const createCustomerSchema = z.object({
  companyId: companyIdSchema,
  code: z.string().max(50).optional(),
  name: nonEmptyString,
  phone: phoneSchema,
  email: emailSchema,
  address: z.string().max(1000).optional(),
  taxNumber: z.string().max(50).optional(),
  creditLimit: currencyAmountSchema.optional(),
  balance: currencyAmountSchema.default(0),
  isActive: z.boolean().default(true),
});

export const createInvoiceSchema = z.object({
  companyId: companyIdSchema,
  invoiceNumber: nonEmptyString,
  customerId: uuidSchema,
  date: dateSchema,
  dueDate: dateSchema.optional(),
  subtotal: currencyAmountSchema,
  discountAmount: currencyAmountSchema.optional(),
  vatAmount: currencyAmountSchema.optional(),
  totalAmount: currencyAmountSchema,
  paidAmount: currencyAmountSchema.optional(),
  status: z.enum(['draft', 'posted', 'paid', 'partially_paid', 'cancelled']).default('draft'),
  notes: z.string().max(2000).optional(),
  lines: z.array(z.object({
    productId: uuidSchema,
    quantity: currencyAmountSchema,
    unitPrice: currencyAmountSchema,
    discountPercent: percentageSchema.optional(),
    vatPercent: percentageSchema.optional(),
    lineTotal: currencyAmountSchema,
  })).min(1),
});

export const createQuotationSchema = z.object({
  companyId: companyIdSchema,
  quotationNumber: nonEmptyString,
  customerId: uuidSchema,
  date: dateSchema,
  expiryDate: dateSchema.optional(),
  totalAmount: currencyAmountSchema,
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'converted']).default('draft'),
  notes: z.string().max(2000).optional(),
  lines: z.array(z.object({
    productId: uuidSchema,
    quantity: currencyAmountSchema,
    unitPrice: currencyAmountSchema,
    discountPercent: percentageSchema.optional(),
    lineTotal: currencyAmountSchema,
  })).min(1),
});

export const createSalesReturnSchema = z.object({
  companyId: companyIdSchema,
  returnNumber: nonEmptyString,
  invoiceId: uuidSchema.optional(),
  customerId: uuidSchema,
  date: dateSchema,
  subtotal: currencyAmountSchema,
  vatAmount: currencyAmountSchema.optional(),
  totalAmount: currencyAmountSchema,
  reason: z.string().max(1000).optional(),
  status: z.enum(['draft', 'posted', 'cancelled']).default('draft'),
  notes: z.string().max(2000).optional(),
  lines: z.array(z.object({
    productId: uuidSchema,
    quantity: currencyAmountSchema,
    unitPrice: currencyAmountSchema,
    lineTotal: currencyAmountSchema,
  })).min(1),
});

export const createSupplierSchema = z.object({
  companyId: companyIdSchema,
  code: z.string().max(50).optional(),
  name: nonEmptyString,
  phone: phoneSchema,
  email: emailSchema,
  address: z.string().max(1000).optional(),
  taxNumber: z.string().max(50).optional(),
  balance: currencyAmountSchema.default(0),
  isActive: z.boolean().default(true),
});

export const createPurchaseInvoiceSchema = z.object({
  companyId: companyIdSchema,
  invoiceNumber: nonEmptyString,
  supplierId: uuidSchema,
  purchaseOrderId: uuidSchema.optional(),
  date: dateSchema,
  dueDate: dateSchema.optional(),
  subtotal: currencyAmountSchema,
  discountAmount: currencyAmountSchema.optional(),
  vatAmount: currencyAmountSchema.optional(),
  totalAmount: currencyAmountSchema,
  paidAmount: currencyAmountSchema.optional(),
  status: z.enum(['draft', 'posted', 'paid', 'partially_paid', 'cancelled']).default('draft'),
  notes: z.string().max(2000).optional(),
  lines: z.array(z.object({
    productId: uuidSchema.optional(),
    description: z.string().max(1000).optional(),
    quantity: currencyAmountSchema,
    unitPrice: currencyAmountSchema,
    lineTotal: currencyAmountSchema,
  })).min(1),
});

export const createPurchaseOrderSchema = z.object({
  companyId: companyIdSchema,
  orderNumber: nonEmptyString,
  supplierId: uuidSchema,
  date: dateSchema,
  expectedDate: dateSchema.optional(),
  totalAmount: currencyAmountSchema,
  status: z.enum(['draft', 'sent', 'confirmed', 'received', 'invoiced', 'cancelled']).default('draft'),
  notes: z.string().max(2000).optional(),
  lines: z.array(z.object({
    productId: uuidSchema.optional(),
    description: z.string().max(1000).optional(),
    quantity: currencyAmountSchema,
    unitPrice: currencyAmountSchema,
    lineTotal: currencyAmountSchema,
    receivedQuantity: currencyAmountSchema.optional(),
  })).optional(),
});

export const createPurchaseReturnSchema = z.object({
  companyId: companyIdSchema,
  returnNumber: nonEmptyString,
  invoiceId: uuidSchema.optional(),
  supplierId: uuidSchema,
  date: dateSchema,
  subtotal: currencyAmountSchema,
  vatAmount: currencyAmountSchema.optional(),
  totalAmount: currencyAmountSchema,
  status: z.enum(['draft', 'posted', 'cancelled']).default('draft'),
  notes: z.string().max(2000).optional(),
  reason: z.string().max(1000).optional(),
  lines: z.array(z.object({
    productId: uuidSchema.optional(),
    description: z.string().max(1000).optional(),
    quantity: currencyAmountSchema,
    unitPrice: currencyAmountSchema,
    lineTotal: currencyAmountSchema,
  })).min(1),
});

export const createProductSchema = z.object({
  companyId: companyIdSchema,
  code: z.string().min(1).max(50),
  nameAr: nonEmptyString,
  nameEn: z.string().max(255).optional(),
  barcode: z.string().max(100).optional(),
  sku: z.string().max(100).optional(),
  unit: z.string().max(50).default('piece'),
  categoryId: uuidSchema.optional(),
  categoryIds: z.array(uuidSchema).optional(),
  productTypeId: uuidSchema.optional(),
  costPrice: currencyAmountSchema,
  salePrice: currencyAmountSchema,
  isActive: z.boolean().default(true),
  createdBy: uuidSchema.optional(),
  updatedBy: uuidSchema.optional(),
});

export const createEmployeeSchema = z.object({
  companyId: companyIdSchema,
  employeeNumber: nonEmptyString,
  fullName: nonEmptyString,
  nationalId: z.string().max(50).optional(),
  phone: phoneSchema,
  email: emailSchema,
  address: z.string().max(1000).optional(),
  departmentId: uuidSchema.optional(),
  position: z.string().max(100).optional(),
  grade: z.string().max(50).optional(),
  hireDate: dateSchema.optional(),
  terminationDate: dateSchema.optional(),
  baseSalary: currencyAmountSchema.optional(),
  isActive: z.boolean().default(true),
});

export const createLeadSchema = z.object({
  companyId: companyIdSchema,
  name: nonEmptyString,
  phone: phoneSchema,
  email: emailSchema,
  company: z.string().max(255).optional(),
  source: z.string().max(100).optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).default('new'),
  rating: z.enum(['hot', 'warm', 'cold']).default('warm'),
  estimatedValue: currencyAmountSchema.optional(),
  assignedTo: uuidSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export const createBomSchema = z.object({
  companyId: companyIdSchema,
  productId: uuidSchema,
  version: nonEmptyString,
  isActive: z.boolean().default(true),
  totalCost: currencyAmountSchema.optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(z.object({
    materialId: uuidSchema,
    quantity: currencyAmountSchema,
    unitCost: currencyAmountSchema.optional(),
  })).min(1),
});

export const createWorkOrderSchema = z.object({
  companyId: companyIdSchema,
  orderNumber: nonEmptyString,
  productId: uuidSchema,
  bomId: uuidSchema.optional(),
  quantity: currencyAmountSchema,
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']).default('planned'),
  plannedStartDate: dateSchema.optional(),
  plannedEndDate: dateSchema.optional(),
  estimatedCost: currencyAmountSchema.optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(z.object({
    materialId: uuidSchema,
    plannedQuantity: currencyAmountSchema,
    unitCost: currencyAmountSchema.optional(),
  })).optional(),
});
