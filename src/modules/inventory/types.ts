export interface Product {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  barcode?: string;
  sku?: string;
  unit: string;
  categoryId?: string;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
}

export interface Warehouse {
  id: string;
  companyId: string;
  name: string;
  code?: string;
  branchId?: string;
  isActive: boolean;
}

export interface Stock {
  id: string;
  companyId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  minStockAlert?: number;
}

export interface StockMovement {
  id: string;
  companyId: string;
  productId: string;
  warehouseId: string;
  type: 'in' | 'out' | 'transfer';
  quantity: number;
  reference?: string;
  notes?: string;
  createdAt?: string;
}

export interface ProductCategory {
  id: string;
  companyId: string;
  name: string;
  parentId?: string;
}
