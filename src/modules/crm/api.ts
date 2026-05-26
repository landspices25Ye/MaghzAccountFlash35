import { getDbAdapter } from '@/core/database/adapters';
import type { Lead, Opportunity, Task, Activity } from './types';

const adapterPromise = getDbAdapter();

export const crmApi = {
  // ─── Leads ────────────────────────────────────────────────────────────────
  async getLeads(companyId: string): Promise<{ success: boolean; data?: Lead[]; error?: string }> {
    const adapter = await adapterPromise;
    const result = await adapter.query(
      `SELECT l.*, u.name as assigned_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id WHERE l.company_id = $1 ORDER BY l.created_at DESC`,
      [companyId]
    );
    if (result.success) {
      const rows = (result.rows || []).map((r: Record<string, unknown>) => mapLeadRow(r));
      return { success: true, data: rows };
    }
    return { success: false, error: result.error };
  },

  async getLeadById(id: string): Promise<{ success: boolean; data?: Lead; error?: string }> {
    const adapter = await adapterPromise;
    const result = await adapter.query('SELECT * FROM leads WHERE id = $1 LIMIT 1', [id]);
    if (result.success && result.rows?.[0]) return { success: true, data: mapLeadRow(result.rows[0]) };
    return { success: false, error: result.error || 'Not found' };
  },

  async createLead(data: Omit<Lead, 'id' | 'createdAt'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await adapterPromise;
    const result = await adapter.query(
      `INSERT INTO leads (company_id, name, phone, email, company, source, status, rating, estimated_value, assigned_to, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [data.companyId, data.name, data.phone, data.email, data.company, data.source, data.status, data.rating, data.estimatedValue, data.assignedTo, data.notes, new Date().toISOString()]
    );
    if (result.success && result.rows?.[0]) return { success: true, id: result.rows[0].id };
    return { success: false, error: result.error };
  },

  async updateLead(id: string, data: Partial<Omit<Lead, 'id' | 'companyId'>>): Promise<{ success: boolean; error?: string }> {
    const adapter = await adapterPromise;
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(data.phone); }
    if (data.email !== undefined) { fields.push(`email = $${idx++}`); values.push(data.email); }
    if (data.company !== undefined) { fields.push(`company = $${idx++}`); values.push(data.company); }
    if (data.source !== undefined) { fields.push(`source = $${idx++}`); values.push(data.source); }
    if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
    if (data.rating !== undefined) { fields.push(`rating = $${idx++}`); values.push(data.rating); }
    if (data.estimatedValue !== undefined) { fields.push(`estimated_value = $${idx++}`); values.push(data.estimatedValue); }
    if (data.assignedTo !== undefined) { fields.push(`assigned_to = $${idx++}`); values.push(data.assignedTo); }
    if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }
    if (fields.length === 0) return { success: true };
    values.push(id);
    const result = await adapter.query(`UPDATE leads SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    return { success: result.success, error: result.error };
  },

  async deleteLead(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await adapterPromise;
    const result = await adapter.query('DELETE FROM leads WHERE id = $1', [id]);
    return { success: result.success, error: result.error };
  },

  async convertLeadToCustomer(id: string, customerData: Record<string, unknown>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await adapterPromise;
    const leadRes = await adapter.query('SELECT * FROM leads WHERE id = $1 LIMIT 1', [id]);
    if (!leadRes.success || !leadRes.rows?.[0]) return { success: false, error: 'Lead not found' };
    const lead = leadRes.rows[0];
    const custResult = await adapter.query(
      `INSERT INTO customers (company_id, code, name, phone, email, address, tax_number, credit_limit, balance, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [lead.company_id, customerData.code || `CUST-${Date.now()}`, lead.name, lead.phone, lead.email, customerData.address || null, customerData.taxNumber || null, customerData.creditLimit || 0, 0, true]
    );
    if (custResult.success && custResult.rows?.[0]) {
      await adapter.query("UPDATE leads SET status = 'converted' WHERE id = $1", [id]);
      return { success: true, id: custResult.rows[0].id };
    }
    return { success: false, error: custResult.error };
  },

  // ─── Opportunities ────────────────────────────────────────────────────────
  async getOpportunities(companyId: string): Promise<{ success: boolean; data?: Opportunity[]; error?: string }> {
    const adapter = await adapterPromise;
    const result = await adapter.query(
      `SELECT o.*, u.name as assigned_name FROM opportunities o LEFT JOIN users u ON o.assigned_to = u.id WHERE o.company_id = $1 ORDER BY o.created_at DESC`,
      [companyId]
    );
    if (result.success) {
      const rows = (result.rows || []).map((r: Record<string, unknown>) => mapOpportunityRow(r));
      return { success: true, data: rows };
    }
    return { success: false, error: result.error };
  },

  async createOpportunity(data: Omit<Opportunity, 'id' | 'createdAt'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await adapterPromise;
    const result = await adapter.query(
      `INSERT INTO opportunities (company_id, lead_id, customer_id, name, value, stage, probability, expected_close_date, assigned_to, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [data.companyId, data.leadId, data.customerId, data.name, data.value, data.stage, data.probability, data.expectedCloseDate, data.assignedTo, data.notes, new Date().toISOString()]
    );
    if (result.success && result.rows?.[0]) return { success: true, id: result.rows[0].id };
    return { success: false, error: result.error };
  },

  async updateOpportunity(id: string, data: Partial<Omit<Opportunity, 'id' | 'companyId'>>): Promise<{ success: boolean; error?: string }> {
    const adapter = await adapterPromise;
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.value !== undefined) { fields.push(`value = $${idx++}`); values.push(data.value); }
    if (data.stage !== undefined) { fields.push(`stage = $${idx++}`); values.push(data.stage); }
    if (data.probability !== undefined) { fields.push(`probability = $${idx++}`); values.push(data.probability); }
    if (data.expectedCloseDate !== undefined) { fields.push(`expected_close_date = $${idx++}`); values.push(data.expectedCloseDate); }
    if (data.assignedTo !== undefined) { fields.push(`assigned_to = $${idx++}`); values.push(data.assignedTo); }
    if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }
    if (fields.length === 0) return { success: true };
    values.push(id);
    const result = await adapter.query(`UPDATE opportunities SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    return { success: result.success, error: result.error };
  },

  async deleteOpportunity(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await adapterPromise;
    const result = await adapter.query('DELETE FROM opportunities WHERE id = $1', [id]);
    return { success: result.success, error: result.error };
  },

  // ─── Tasks ────────────────────────────────────────────────────────────────
  async getTasks(companyId: string): Promise<{ success: boolean; data?: Task[]; error?: string }> {
    const adapter = await adapterPromise;
    const result = await adapter.query(
      `SELECT t.*, u.name as assigned_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.company_id = $1 ORDER BY t.due_date ASC`,
      [companyId]
    );
    if (result.success) {
      const rows = (result.rows || []).map((r: Record<string, unknown>) => mapTaskRow(r));
      return { success: true, data: rows };
    }
    return { success: false, error: result.error };
  },

  async createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await adapterPromise;
    const result = await adapter.query(
      `INSERT INTO tasks (company_id, opportunity_id, lead_id, customer_id, title, description, due_date, priority, status, assigned_to, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [data.companyId, data.opportunityId, data.leadId, data.customerId, data.title, data.description, data.dueDate, data.priority, data.status, data.assignedTo, new Date().toISOString()]
    );
    if (result.success && result.rows?.[0]) return { success: true, id: result.rows[0].id };
    return { success: false, error: result.error };
  },

  async updateTask(id: string, data: Partial<Omit<Task, 'id' | 'companyId'>>): Promise<{ success: boolean; error?: string }> {
    const adapter = await adapterPromise;
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
    if (data.dueDate !== undefined) { fields.push(`due_date = $${idx++}`); values.push(data.dueDate); }
    if (data.priority !== undefined) { fields.push(`priority = $${idx++}`); values.push(data.priority); }
    if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
    if (data.assignedTo !== undefined) { fields.push(`assigned_to = $${idx++}`); values.push(data.assignedTo); }
    if (fields.length === 0) return { success: true };
    values.push(id);
    const result = await adapter.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    return { success: result.success, error: result.error };
  },

  async deleteTask(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await adapterPromise;
    const result = await adapter.query('DELETE FROM tasks WHERE id = $1', [id]);
    return { success: result.success, error: result.error };
  },

  // ─── Activities ───────────────────────────────────────────────────────────
  async getActivities(companyId: string): Promise<{ success: boolean; data?: Activity[]; error?: string }> {
    const adapter = await adapterPromise;
    const result = await adapter.query(
      `SELECT a.*, u.name as assigned_name FROM activities a LEFT JOIN users u ON a.assigned_to = u.id WHERE a.company_id = $1 ORDER BY a.activity_date DESC`,
      [companyId]
    );
    if (result.success) {
      const rows = (result.rows || []).map((r: Record<string, unknown>) => mapActivityRow(r));
      return { success: true, data: rows };
    }
    return { success: false, error: result.error };
  },

  async createActivity(data: Omit<Activity, 'id' | 'createdAt'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await adapterPromise;
    const result = await adapter.query(
      `INSERT INTO activities (company_id, lead_id, opportunity_id, customer_id, type, subject, description, activity_date, duration_minutes, assigned_to, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [data.companyId, data.leadId, data.opportunityId, data.customerId, data.type, data.subject, data.description, data.activityDate, data.durationMinutes, data.assignedTo, new Date().toISOString()]
    );
    if (result.success && result.rows?.[0]) return { success: true, id: result.rows[0].id };
    return { success: false, error: result.error };
  },

  async updateActivity(id: string, data: Partial<Omit<Activity, 'id' | 'companyId'>>): Promise<{ success: boolean; error?: string }> {
    const adapter = await adapterPromise;
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (data.type !== undefined) { fields.push(`type = $${idx++}`); values.push(data.type); }
    if (data.subject !== undefined) { fields.push(`subject = $${idx++}`); values.push(data.subject); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
    if (data.activityDate !== undefined) { fields.push(`activity_date = $${idx++}`); values.push(data.activityDate); }
    if (data.durationMinutes !== undefined) { fields.push(`duration_minutes = $${idx++}`); values.push(data.durationMinutes); }
    if (data.assignedTo !== undefined) { fields.push(`assigned_to = $${idx++}`); values.push(data.assignedTo); }
    if (fields.length === 0) return { success: true };
    values.push(id);
    const result = await adapter.query(`UPDATE activities SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    return { success: result.success, error: result.error };
  },

  async deleteActivity(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await adapterPromise;
    const result = await adapter.query('DELETE FROM activities WHERE id = $1', [id]);
    return { success: result.success, error: result.error };
  },
};

function mapLeadRow(r: Record<string, unknown>): Lead {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    name: String(r.name),
    phone: r.phone ? String(r.phone) : undefined,
    email: r.email ? String(r.email) : undefined,
    company: r.company ? String(r.company) : undefined,
    source: r.source ? String(r.source) : undefined,
    status: String(r.status) as Lead['status'],
    rating: String(r.rating) as Lead['rating'],
    estimatedValue: r.estimated_value ? Number(r.estimated_value) : undefined,
    assignedTo: r.assigned_to ? String(r.assigned_to) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
    createdAt: r.created_at ? String(r.created_at) : undefined,
  };
}

function mapOpportunityRow(r: Record<string, unknown>): Opportunity {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    leadId: r.lead_id ? String(r.lead_id) : undefined,
    customerId: r.customer_id ? String(r.customer_id) : undefined,
    name: String(r.name),
    value: Number(r.value) || 0,
    stage: String(r.stage) as Opportunity['stage'],
    probability: r.probability ? Number(r.probability) : undefined,
    expectedCloseDate: r.expected_close_date ? String(r.expected_close_date) : undefined,
    assignedTo: r.assigned_to ? String(r.assigned_to) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
    createdAt: r.created_at ? String(r.created_at) : undefined,
  };
}

function mapTaskRow(r: Record<string, unknown>): Task {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    opportunityId: r.opportunity_id ? String(r.opportunity_id) : undefined,
    leadId: r.lead_id ? String(r.lead_id) : undefined,
    customerId: r.customer_id ? String(r.customer_id) : undefined,
    title: String(r.title),
    description: r.description ? String(r.description) : undefined,
    dueDate: r.due_date ? String(r.due_date) : undefined,
    priority: String(r.priority) as Task['priority'],
    status: String(r.status) as Task['status'],
    assignedTo: r.assigned_to ? String(r.assigned_to) : undefined,
    createdAt: r.created_at ? String(r.created_at) : undefined,
  };
}

function mapActivityRow(r: Record<string, unknown>): Activity {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    leadId: r.lead_id ? String(r.lead_id) : undefined,
    opportunityId: r.opportunity_id ? String(r.opportunity_id) : undefined,
    customerId: r.customer_id ? String(r.customer_id) : undefined,
    type: String(r.type) as Activity['type'],
    subject: String(r.subject),
    description: r.description ? String(r.description) : undefined,
    activityDate: String(r.activity_date),
    durationMinutes: r.duration_minutes ? Number(r.duration_minutes) : undefined,
    assignedTo: r.assigned_to ? String(r.assigned_to) : undefined,
    createdAt: r.created_at ? String(r.created_at) : undefined,
  };
}
