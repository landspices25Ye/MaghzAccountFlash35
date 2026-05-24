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
  id: string;
  invoiceId: string;
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
  date: string;
  expiryDate?: string;
  totalAmount: number;
  status: 'open' | 'accepted' | 'rejected' | 'expired';
  notes?: string;
}
