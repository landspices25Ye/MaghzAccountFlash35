import { getDbAdapter } from '@/core/database/adapters';
import type { BOM, BOMLine, WorkOrder, WorkOrderLine } from './types';

const adapterPromise = getDbAdapter();

export const manufacturingApi = {
  // ─── BOM ──────────────────────────────────────────────────────────────────
  async getBoms(companyId: string): Promise<{ success: boolean; data?: BOM[]; error?: string }> {
    const adapter = await adapterPromise;
    const result = await adapter.query(
      `SELECT b.*, p.name as product_name FROM bills_of_materials b LEFT JOIN products p ON b.product_id = p.id WHERE b.company_id = $1 ORDER BY b.version DESC`,
      [companyId]
    );
    if (result.success) {
      const rows = (result.rows || []).map((r: Record<string, unknown>) => ({
        id: String(r.id),
        companyId: String(r.company_id),
        productId: String(r.product_id),
        productName: r.product_name ? String(r.product_name) : undefined,
        version: String(r.version),
        isActive: r.is_active === true || r.is_active === 'true',
        totalCost: r.total_cost ? Number(r.total_cost) : undefined,
        notes: r.notes ? String(r.notes) : undefined,
      }));
      return { success: true, data: rows };
    }
    return { success: false, error: result.error };
  },

  async getBomById(id: string): Promise<{ success: boolean; data?: { bom: BOM; lines: BOMLine[] }; error?: string }> {
    const adapter = await adapterPromise;
    const bomRes = await adapter.query('SELECT * FROM bills_of_materials WHERE id = $1 LIMIT 1', [id]);
    if (!bomRes.success || !bomRes.rows?.[0]) return { success: false, error: bomRes.error || 'Not found' };
    const row = bomRes.rows[0];
    const bom: BOM = {
      id: String(row.id),
      companyId: String(row.company_id),
      productId: String(row.product_id),
      version: String(row.version),
      isActive: row.is_active === true || row.is_active === 'true',
      totalCost: row.total_cost ? Number(row.total_cost) : undefined,
      notes: row.notes ? String(row.notes) : undefined,
    };
    const linesRes = await adapter.query('SELECT l.*, p.name as material_name FROM bom_lines l LEFT JOIN products p ON l.material_id = p.id WHERE l.bom_id = $1', [id]);
    const lines = (linesRes.rows || []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      bomId: String(r.bom_id),
      materialId: String(r.material_id),
      materialName: r.material_name ? String(r.material_name) : undefined,
      quantity: Number(r.quantity) || 0,
      unitCost: r.unit_cost ? Number(r.unit_cost) : undefined,
      totalCost: r.total_cost ? Number(r.total_cost) : undefined,
    }));
    return { success: true, data: { bom, lines } };
  },

  async createBom(data: Omit<BOM, 'id'> & { lines: Omit<BOMLine, 'id' | 'bomId'>[] }): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await adapterPromise;
    const tx = await adapter.transaction([
      { sql: `INSERT INTO bills_of_materials (company_id, product_id, version, is_active, total_cost, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        params: [data.companyId, data.productId, data.version, data.isActive, data.totalCost, data.notes] },
    ]);
    if (tx.success && tx.results?.[0]?.[0]) {
      const bomId = tx.results[0][0].id as string;
      for (const line of data.lines) {
        await adapter.query(
          `INSERT INTO bom_lines (bom_id, material_id, quantity, unit_cost, total_cost) VALUES ($1,$2,$3,$4,$5)`,
          [bomId, line.materialId, line.quantity, line.unitCost, (line.quantity || 0) * (line.unitCost || 0)]
        );
      }
      return { success: true, id: bomId };
    }
    return { success: false, error: tx.error };
  },

  async updateBom(id: string, data: Partial<Omit<BOM, 'id' | 'companyId'>> & { lines?: Partial<BOMLine>[] }): Promise<{ success: boolean; error?: string }> {
    const adapter = await adapterPromise;
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (data.productId !== undefined) { fields.push(`product_id = $${idx++}`); values.push(data.productId); }
    if (data.version !== undefined) { fields.push(`version = $${idx++}`); values.push(data.version); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.isActive); }
    if (data.totalCost !== undefined) { fields.push(`total_cost = $${idx++}`); values.push(data.totalCost); }
    if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }
    if (fields.length > 0) { values.push(id); await adapter.query(`UPDATE bills_of_materials SET ${fields.join(', ')} WHERE id = $${idx}`, values); }
    if (data.lines) {
      await adapter.query('DELETE FROM bom_lines WHERE bom_id = $1', [id]);
      for (const line of data.lines) {
        await adapter.query(
          `INSERT INTO bom_lines (bom_id, material_id, quantity, unit_cost, total_cost) VALUES ($1,$2,$3,$4,$5)`,
          [id, line.materialId, line.quantity, line.unitCost, (line.quantity || 0) * (line.unitCost || 0)]
        );
      }
    }
    return { success: true };
  },

  async deleteBom(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await adapterPromise;
    await adapter.query('DELETE FROM bom_lines WHERE bom_id = $1', [id]);
    const result = await adapter.query('DELETE FROM bills_of_materials WHERE id = $1', [id]);
    return { success: result.success, error: result.error };
  },

  // ─── Work Orders ──────────────────────────────────────────────────────────
  async getWorkOrders(companyId: string): Promise<{ success: boolean; data?: WorkOrder[]; error?: string }> {
    const adapter = await adapterPromise;
    const result = await adapter.query(
      `SELECT w.*, p.name as product_name FROM work_orders w LEFT JOIN products p ON w.product_id = p.id WHERE w.company_id = $1 ORDER BY w.order_number DESC`,
      [companyId]
    );
    if (result.success) {
      const rows = (result.rows || []).map((r: Record<string, unknown>) => mapWorkOrderRow(r));
      return { success: true, data: rows };
    }
    return { success: false, error: result.error };
  },

  async getWorkOrderById(id: string): Promise<{ success: boolean; data?: { workOrder: WorkOrder; lines: WorkOrderLine[] }; error?: string }> {
    const adapter = await adapterPromise;
    const res = await adapter.query('SELECT w.*, p.name as product_name FROM work_orders w LEFT JOIN products p ON w.product_id = p.id WHERE w.id = $1 LIMIT 1', [id]);
    if (!res.success || !res.rows?.[0]) return { success: false, error: res.error || 'Not found' };
    const workOrder = mapWorkOrderRow(res.rows[0]);
    const linesRes = await adapter.query('SELECT l.*, p.name as material_name FROM work_order_lines l LEFT JOIN products p ON l.material_id = p.id WHERE l.work_order_id = $1', [id]);
    const lines = (linesRes.rows || []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      workOrderId: String(r.work_order_id),
      materialId: String(r.material_id),
      materialName: r.material_name ? String(r.material_name) : undefined,
      plannedQuantity: Number(r.planned_quantity) || 0,
      actualQuantity: r.actual_quantity ? Number(r.actual_quantity) : undefined,
      unitCost: r.unit_cost ? Number(r.unit_cost) : undefined,
      actualUnitCost: r.actual_unit_cost ? Number(r.actual_unit_cost) : undefined,
    }));
    return { success: true, data: { workOrder, lines } };
  },

  async createWorkOrder(data: Omit<WorkOrder, 'id'> & { lines: Omit<WorkOrderLine, 'id' | 'workOrderId'>[] }): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await adapterPromise;
    const tx = await adapter.transaction([
      { sql: `INSERT INTO work_orders (company_id, order_number, product_id, bom_id, quantity, status, planned_start_date, planned_end_date, estimated_cost, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        params: [data.companyId, data.orderNumber, data.productId, data.bomId, data.quantity, data.status, data.plannedStartDate, data.plannedEndDate, data.estimatedCost, data.notes] },
    ]);
    if (tx.success && tx.results?.[0]?.[0]) {
      const woId = tx.results[0][0].id as string;
      for (const line of data.lines) {
        await adapter.query(
          `INSERT INTO work_order_lines (work_order_id, material_id, planned_quantity, unit_cost) VALUES ($1,$2,$3,$4)`,
          [woId, line.materialId, line.plannedQuantity, line.unitCost]
        );
      }
      return { success: true, id: woId };
    }
    return { success: false, error: tx.error };
  },

  async updateWorkOrder(id: string, data: Partial<Omit<WorkOrder, 'id' | 'companyId'>> & { lines?: Partial<WorkOrderLine>[] }): Promise<{ success: boolean; error?: string }> {
    const adapter = await adapterPromise;
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (data.orderNumber !== undefined) { fields.push(`order_number = $${idx++}`); values.push(data.orderNumber); }
    if (data.productId !== undefined) { fields.push(`product_id = $${idx++}`); values.push(data.productId); }
    if (data.bomId !== undefined) { fields.push(`bom_id = $${idx++}`); values.push(data.bomId); }
    if (data.quantity !== undefined) { fields.push(`quantity = $${idx++}`); values.push(data.quantity); }
    if (data.producedQuantity !== undefined) { fields.push(`produced_quantity = $${idx++}`); values.push(data.producedQuantity); }
    if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
    if (data.plannedStartDate !== undefined) { fields.push(`planned_start_date = $${idx++}`); values.push(data.plannedStartDate); }
    if (data.plannedEndDate !== undefined) { fields.push(`planned_end_date = $${idx++}`); values.push(data.plannedEndDate); }
    if (data.actualStartDate !== undefined) { fields.push(`actual_start_date = $${idx++}`); values.push(data.actualStartDate); }
    if (data.actualEndDate !== undefined) { fields.push(`actual_end_date = $${idx++}`); values.push(data.actualEndDate); }
    if (data.estimatedCost !== undefined) { fields.push(`estimated_cost = $${idx++}`); values.push(data.estimatedCost); }
    if (data.actualCost !== undefined) { fields.push(`actual_cost = $${idx++}`); values.push(data.actualCost); }
    if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }
    if (fields.length > 0) { values.push(id); await adapter.query(`UPDATE work_orders SET ${fields.join(', ')} WHERE id = $${idx}`, values); }
    if (data.lines) {
      await adapter.query('DELETE FROM work_order_lines WHERE work_order_id = $1', [id]);
      for (const line of data.lines) {
        await adapter.query(
          `INSERT INTO work_order_lines (work_order_id, material_id, planned_quantity, actual_quantity, unit_cost, actual_unit_cost) VALUES ($1,$2,$3,$4,$5,$6)`,
          [id, line.materialId, line.plannedQuantity, line.actualQuantity, line.unitCost, line.actualUnitCost]
        );
      }
    }
    return { success: true };
  },

  async deleteWorkOrder(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await adapterPromise;
    await adapter.query('DELETE FROM work_order_lines WHERE work_order_id = $1', [id]);
    const result = await adapter.query('DELETE FROM work_orders WHERE id = $1', [id]);
    return { success: result.success, error: result.error };
  },

  async updateWorkOrderStatus(id: string, status: WorkOrder['status']): Promise<{ success: boolean; error?: string }> {
    const adapter = await adapterPromise;
    let sql: string;
    let params: unknown[];

    if (status === 'in_progress') {
      sql = `UPDATE work_orders SET status = 'in_progress', actual_start_date = $1 WHERE id = $2`;
      params = [new Date().toISOString(), id];
    } else if (status === 'completed') {
      sql = `UPDATE work_orders SET status = 'completed', actual_end_date = $1 WHERE id = $2`;
      params = [new Date().toISOString(), id];
    } else {
      sql = `UPDATE work_orders SET status = $1 WHERE id = $2`;
      params = [status, id];
    }

    const result = await adapter.query(sql, params);
    return { success: result.success, error: result.error };
  },
};

function mapWorkOrderRow(r: Record<string, unknown>): WorkOrder {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    orderNumber: String(r.order_number),
    productId: String(r.product_id),
    productName: r.product_name ? String(r.product_name) : undefined,
    bomId: r.bom_id ? String(r.bom_id) : undefined,
    quantity: Number(r.quantity) || 0,
    producedQuantity: r.produced_quantity ? Number(r.produced_quantity) : undefined,
    status: String(r.status) as WorkOrder['status'],
    plannedStartDate: r.planned_start_date ? String(r.planned_start_date) : undefined,
    plannedEndDate: r.planned_end_date ? String(r.planned_end_date) : undefined,
    actualStartDate: r.actual_start_date ? String(r.actual_start_date) : undefined,
    actualEndDate: r.actual_end_date ? String(r.actual_end_date) : undefined,
    estimatedCost: r.estimated_cost ? Number(r.estimated_cost) : undefined,
    actualCost: r.actual_cost ? Number(r.actual_cost) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
  };
}
