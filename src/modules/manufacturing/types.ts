export interface BOM {
  id: string;
  companyId: string;
  productId: string;
  productName?: string;
  version: string;
  isActive: boolean;
}

export interface BOMLine {
  id: string;
  bomId: string;
  materialId: string;
  quantity: number;
  unitCost?: number;
}

export interface WorkOrder {
  id: string;
  companyId: string;
  orderNumber: string;
  productId: string;
  bomId?: string;
  quantity: number;
  producedQuantity?: number;
  status: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  totalCost?: number;
  notes?: string;
}

export interface WorkOrderLine {
  id: string;
  workOrderId: string;
  materialId: string;
  plannedQuantity: number;
  actualQuantity?: number;
  unitCost?: number;
}
