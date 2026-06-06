import { z } from 'zod';
import { getDbAdapter } from '@/core/database/adapters';
import { validateInput, idCompanySchema, companyIdSchema, uuidSchema, createBomSchema, createWorkOrderSchema } from '@/core/utils/validation';
import type { BOM, BOMLine, WorkOrder, WorkOrderLine } from './types';

const workOrderStatusSchema = z.enum(['planned', 'in_progress', 'completed', 'cancelled']);

export const manufacturingApi = {
  // ─── BOM ──────────────────────────────────────────────────────────────────
  async getBoms(companyId: string, ownedByUserId?: string): Promise<{ success: boolean; data?: BOM[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      let sql = `SELECT b.*, p.name_ar as product_name FROM boms b LEFT JOIN products p ON b.product_id = p.id WHERE b.company_id = $1`;
      const params: unknown[] = [companyId];
      if (ownedByUserId) {
        const uidValidation = validateInput(uuidSchema, ownedByUserId);
        if (!uidValidation.success) return { success: false, error: uidValidation.error };
        sql += ' AND b.created_by = $2';
        params.push(ownedByUserId);
      }
      sql += ' ORDER BY b.version DESC';
      const result = await adapter.query(sql, params);
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
          createdBy: r.created_by ? String(r.created_by) : undefined,
          updatedBy: r.updated_by ? String(r.updated_by) : undefined,
        }));
        return { success: true, data: rows };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getBomById(id: string, companyId: string): Promise<{ success: boolean; data?: { bom: BOM; lines: BOMLine[] }; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const bomRes = await adapter.query('SELECT * FROM boms WHERE id = $1 AND company_id = $2 LIMIT 1', [id, companyId]);
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
        createdBy: row.created_by ? String(row.created_by) : undefined,
        updatedBy: row.updated_by ? String(row.updated_by) : undefined,
      };
      const linesRes = await adapter.query('SELECT l.*, p.name_ar as material_name FROM bom_lines l LEFT JOIN products p ON l.material_id = p.id WHERE l.bom_id = $1', [id]);
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
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createBom(data: Omit<BOM, 'id'> & { lines: Omit<BOMLine, 'id' | 'bomId'>[] }, _userId?: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createBomSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const tx = await adapter.transaction([
        { sql: `INSERT INTO boms (company_id, product_id, version, is_active, total_cost, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, params: [data.companyId, data.productId, data.version, data.isActive, data.totalCost, data.notes, _userId ?? null] },
      ]);
      if (tx.success && tx.results?.[0]?.[0]) {
        const bomId = tx.results[0][0].id as string;
        await batchInsertLines(adapter, 'bom_lines', ['bom_id', 'material_id', 'quantity', 'unit_cost', 'total_cost'],
          data.lines.map(l => [bomId, l.materialId, l.quantity, l.unitCost, (l.quantity || 0) * (l.unitCost || 0)])
        );
        return { success: true, id: bomId };
      }
      return { success: false, error: tx.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateBom(id: string, companyId: string, _userId?: string, data: Partial<Omit<BOM, 'id' | 'companyId'>> & { lines?: Partial<BOMLine>[] } = {}): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      if (data.productId !== undefined) { fields.push(`product_id = $${idx++}`); values.push(data.productId); }
      if (data.version !== undefined) { fields.push(`version = $${idx++}`); values.push(data.version); }
      if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.isActive); }
      if (data.totalCost !== undefined) { fields.push(`total_cost = $${idx++}`); values.push(data.totalCost); }
      if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }

      fields.push(`updated_by = $${idx++}`);
      values.push(_userId ?? null);

      if (fields.length > 0) { values.push(id); values.push(companyId); await adapter.query(`UPDATE boms SET ${fields.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1}`, values); }
      if (data.lines) {
        await adapter.query('DELETE FROM bom_lines WHERE bom_id = $1', [id]);
        await batchInsertLines(adapter, 'bom_lines', ['bom_id', 'material_id', 'quantity', 'unit_cost', 'total_cost'],
          data.lines.map(l => [id, l.materialId, l.quantity, l.unitCost, (l.quantity || 0) * (l.unitCost || 0)])
        );
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteBom(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      await adapter.query('DELETE FROM bom_lines WHERE bom_id = $1', [id]);
      const result = await adapter.query('DELETE FROM boms WHERE id = $1 AND company_id = $2', [id, companyId]);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Work Orders ──────────────────────────────────────────────────────────
  async getWorkOrders(companyId: string, ownedByUserId?: string): Promise<{ success: boolean; data?: WorkOrder[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      let sql = `SELECT w.*, p.name_ar as product_name FROM work_orders w LEFT JOIN products p ON w.product_id = p.id WHERE w.company_id = $1`;
      const params: unknown[] = [companyId];
      if (ownedByUserId) {
        const uidValidation = validateInput(uuidSchema, ownedByUserId);
        if (!uidValidation.success) return { success: false, error: uidValidation.error };
        sql += ' AND w.created_by = $2';
        params.push(ownedByUserId);
      }
      sql += ' ORDER BY w.order_number DESC';
      const result = await adapter.query(sql, params);
      if (result.success) {
        const rows = (result.rows || []).map((r: Record<string, unknown>) => mapWorkOrderRow(r));
        return { success: true, data: rows };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getWorkOrderById(id: string, companyId?: string): Promise<{ success: boolean; data?: { workOrder: WorkOrder; lines: WorkOrderLine[] }; error?: string }> {
    try {
      if (companyId) {
        const idValidation = validateInput(idCompanySchema, { id, companyId });
        if (!idValidation.success) return { success: false, error: idValidation.error };
      }
      const adapter = await getDbAdapter();
      const sql = companyId
        ? 'SELECT w.*, p.name_ar as product_name FROM work_orders w LEFT JOIN products p ON w.product_id = p.id WHERE w.id = $1 AND w.company_id = $2 LIMIT 1'
        : 'SELECT w.*, p.name_ar as product_name FROM work_orders w LEFT JOIN products p ON w.product_id = p.id WHERE w.id = $1 LIMIT 1';
      const params = companyId ? [id, companyId] : [id];
      const res = await adapter.query(sql, params);
      if (!res.success || !res.rows?.[0]) return { success: false, error: res.error || 'Not found' };
      const workOrder = mapWorkOrderRow(res.rows[0]);
      const linesRes = await adapter.query('SELECT l.*, p.name_ar as material_name FROM work_order_consumptions l LEFT JOIN products p ON l.material_id = p.id WHERE l.work_order_id = $1', [id]);
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
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createWorkOrder(data: Omit<WorkOrder, 'id'> & { lines: Omit<WorkOrderLine, 'id' | 'workOrderId'>[] }, _userId?: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createWorkOrderSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const tx = await adapter.transaction([
        { sql: `INSERT INTO work_orders (company_id, order_number, product_id, bom_id, quantity, status, planned_start_date, planned_end_date, estimated_cost, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`, params: [data.companyId, data.orderNumber, data.productId, data.bomId, data.quantity, data.status, data.plannedStartDate, data.plannedEndDate, data.estimatedCost, data.notes, _userId ?? null] },
      ]);
      if (tx.success && tx.results?.[0]?.[0]) {
        const woId = tx.results[0][0].id as string;
        await batchInsertLines(adapter, 'work_order_consumptions', ['work_order_id', 'material_id', 'planned_quantity', 'unit_cost'],
          data.lines.map(l => [woId, l.materialId, l.plannedQuantity, l.unitCost])
        );
        return { success: true, id: woId };
      }
      return { success: false, error: tx.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateWorkOrder(id: string, companyId: string, _userId?: string, data: Partial<Omit<WorkOrder, 'id' | 'companyId'>> & { lines?: Partial<WorkOrderLine>[] } = {}): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
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

      fields.push(`updated_by = $${idx++}`);
      values.push(_userId ?? null);

      if (fields.length > 0) { values.push(id); values.push(companyId); await adapter.query(`UPDATE work_orders SET ${fields.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1}`, values); }
      if (data.lines) {
        await adapter.query('DELETE FROM work_order_consumptions WHERE work_order_id = $1', [id]);
        await batchInsertLines(adapter, 'work_order_consumptions', ['work_order_id', 'material_id', 'planned_quantity', 'actual_quantity', 'unit_cost', 'actual_unit_cost'],
          data.lines.map(l => [id, l.materialId, l.plannedQuantity, l.actualQuantity, l.unitCost, l.actualUnitCost])
        );
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteWorkOrder(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      await adapter.query('DELETE FROM work_order_consumptions WHERE work_order_id = $1', [id]);
      const result = await adapter.query('DELETE FROM work_orders WHERE id = $1 AND company_id = $2', [id, companyId]);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateWorkOrderStatus(id: string, companyId: string, status: WorkOrder['status'], _userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const statusValidation = validateInput(workOrderStatusSchema, status);
      if (!statusValidation.success) return { success: false, error: statusValidation.error };
      if (_userId) {
        const uidValidation = validateInput(uuidSchema, _userId);
        if (!uidValidation.success) return { success: false, error: uidValidation.error };
      }
      const adapter = await getDbAdapter();
      let sql: string;
      let params: unknown[];

      if (status === 'in_progress') {
        sql = `UPDATE work_orders SET status = 'in_progress', actual_start_date = $1`;
        params = [new Date().toISOString()];
        if (_userId) { sql += `, updated_by = $${params.length + 1}`; params.push(_userId); }
        sql += ` WHERE id = $${params.length + 1} AND company_id = $${params.length + 2}`;
        params.push(id, companyId);
      } else if (status === 'completed') {
        sql = `UPDATE work_orders SET status = 'completed', actual_end_date = $1`;
        params = [new Date().toISOString()];
        if (_userId) { sql += `, updated_by = $${params.length + 1}`; params.push(_userId); }
        sql += ` WHERE id = $${params.length + 1} AND company_id = $${params.length + 2}`;
        params.push(id, companyId);
      } else {
        sql = `UPDATE work_orders SET status = $1`;
        params = [status];
        if (_userId) { sql += `, updated_by = $${params.length + 1}`; params.push(_userId); }
        sql += ` WHERE id = $${params.length + 1} AND company_id = $${params.length + 2}`;
        params.push(id, companyId);
      }

      const result = await adapter.query(sql, params);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
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
    createdBy: r.created_by ? String(r.created_by) : undefined,
    updatedBy: r.updated_by ? String(r.updated_by) : undefined,
  };
}

async function batchInsertLines(adapter: Awaited<ReturnType<typeof getDbAdapter>>, table: string, columns: string[], rows: unknown[][]): Promise<void> {
  if (rows.length === 0) return;
  const colCount = columns.length;
  const placeholders = rows.map((_, ri) => {
    const base = ri * colCount;
    return `(${Array.from({ length: colCount }, (_, ci) => `$${base + ci + 1}`).join(',')})`;
  }).join(',');
  const values = rows.flat();
  await adapter.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`, values);
}

