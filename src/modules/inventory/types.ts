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
categoryIds?: string[];
productTypeId?: string;
costPrice: number;
salePrice: number;
isActive: boolean;
image?: string;
quantity?: number;
minStock?: number;
maxStock?: number;
reorderPoint?: number;
createdBy?: string;
updatedBy?: string;
}

export interface Warehouse {
id: string;
companyId: string;
name: string;
code?: string;
branchId?: string;
isActive: boolean;
createdBy?: string;
updatedBy?: string;
}

export interface Stock {
id: string;
companyId: string;
productId: string;
warehouseId: string;
quantity: number;
minStockAlert?: number;
}

export interface StockItem extends Stock {
productName?: string;
productCode?: string;
warehouseName?: string;
unit?: string;
costPrice?: number;
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
createdBy?: string;
updatedBy?: string;
}

export interface StockTransfer {
id: string;
companyId: string;
productId: string;
fromWarehouseId: string;
toWarehouseId: string;
quantity: number;
date: string;
reference?: string;
notes?: string;
status: 'draft' | 'completed' | 'cancelled';
createdAt?: string;
createdBy?: string;
updatedBy?: string;
}

export interface InventoryTransaction {
id: string;
companyId: string;
date: string;
type: 'in' | 'out' | 'adjustment' | 'transfer';
productId: string;
warehouseId: string;
quantity: number;
reference: string;
notes?: string;
createdAt?: string;
createdBy?: string;
updatedBy?: string;
}

export interface StockAdjustment {
id: string;
companyId: string;
date: string;
productId: string;
warehouseId: string;
systemQty: number;
actualQty: number;
difference: number;
reason: string;
status: 'draft' | 'pending' | 'approved' | 'rejected' | 'posted';
unitCost?: number;
approvedBy?: string;
approvedAt?: string;
postedAt?: string;
createdBy?: string;
updatedBy?: string;
}

export interface ProductCategory {
id: string;
companyId: string;
name: string;
parentId?: string;
createdBy?: string;
updatedBy?: string;
}
