export interface Supplier {
  id: string;
  companyId: string;
  code?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  balance: number;
  isActive: boolean;
}

export interface PurchaseInvoice {
  id: string;
  companyId: string;
  invoiceNumber: string;
  supplierId: string;
  supplier?: Supplier;
  date: string;
  dueDate?: string;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: 'draft' | 'posted' | 'paid' | 'partially_paid' | 'cancelled';
  notes?: string;
  lines: PurchaseInvoiceLine[];
}

export interface PurchaseInvoiceLine {
  id: string;
  invoiceId: string;
  productId?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  companyId: string;
  orderNumber: string;
  supplierId: string;
  date: string;
  expectedDate?: string;
  totalAmount: number;
  status: 'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  notes?: string;
}
