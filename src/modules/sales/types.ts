export interface Customer {
  id: string;
  companyId: string;
  code?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  creditLimit?: number;
  balance: number;
  isActive: boolean;
}

export interface CustomerStatementRow {
  date: string;
  documentType: string;
  documentNumber: string;
  debit: number;
  credit: number;
  balance: number;
  notes?: string;
}

export interface SalesInvoice {
  id: string;
  companyId: string;
  invoiceNumber: string;
  customerId: string;
  customer?: Customer;
  date: string;
  dueDate?: string;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: 'draft' | 'posted' | 'paid' | 'partially_paid' | 'cancelled';
  notes?: string;
  lines: SalesInvoiceLine[];
}

export interface SalesInvoiceLine {
  id?: string;
  invoiceId?: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  vatPercent: number;
  lineTotal: number;
}

export interface Quotation {
  id: string;
  companyId: string;
  quotationNumber: string;
  customerId: string;
  customer?: Customer;
  date: string;
  expiryDate?: string;
  totalAmount: number;
  status: 'open' | 'accepted' | 'rejected' | 'expired' | 'converted';
  notes?: string;
  lines: QuotationLine[];
}

export interface QuotationLine {
  id?: string;
  quotationId?: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
}

export interface SalesReturn {
  id: string;
  companyId: string;
  returnNumber: string;
  invoiceId: string;
  invoice?: SalesInvoice;
  customerId: string;
  customer?: Customer;
  date: string;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  reason: string;
  status: 'draft' | 'posted' | 'cancelled';
  notes?: string;
  lines: SalesReturnLine[];
}

export interface SalesReturnLine {
  id?: string;
  returnId?: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ArAgingBucket {
  period: string;
  amount: number;
  count: number;
}

export interface CustomerArAging {
  customerId: string;
  customerName: string;
  totalDue: number;
  buckets: ArAgingBucket[];
}
