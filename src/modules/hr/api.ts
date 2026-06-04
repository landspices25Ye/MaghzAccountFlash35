import { getDbAdapter } from '@/core/database/adapters';
import { validateInput, idCompanySchema, companyIdSchema, createEmployeeSchema } from '@/core/utils/validation';
import type { Employee, AttendanceRecord, PayrollRun, PayrollLine, Leave, EndOfService } from './types';

export const hrApi = {
  // ─── Employees ────────────────────────────────────────────────────────────
  async getEmployees(companyId: string): Promise<{ success: boolean; data?: Employee[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT e.*, d.name as department_name FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE e.company_id = $1 ORDER BY e.full_name`,
        [companyId]
      );
      if (result.success) {
        const rows = (result.rows || []).map((r: Record<string, unknown>) => mapEmployeeRow(r));
        return { success: true, data: rows };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getEmployeeById(id: string, companyId: string): Promise<{ success: boolean; data?: Employee; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query('SELECT e.*, d.name as department_name FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE e.id = $1 AND e.company_id = $2 LIMIT 1', [id, companyId]);
      if (result.success && result.rows?.[0]) return { success: true, data: mapEmployeeRow(result.rows[0]) };
      return { success: false, error: result.error || 'Not found' };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createEmployee(data: Omit<Employee, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createEmployeeSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `INSERT INTO employees (company_id, employee_number, full_name, national_id, phone, email, address, department_id, position, grade, hire_date, termination_date, base_salary, is_active, photo_url, attachments)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
        [data.companyId, data.employeeNumber, data.fullName, data.nationalId, data.phone, data.email, data.address, data.departmentId, data.position, data.grade, data.hireDate, data.terminationDate, data.baseSalary, data.isActive, data.photoUrl, data.attachments ? JSON.stringify(data.attachments) : null]
      );
      if (result.success && result.rows?.[0]) return { success: true, id: result.rows[0].id };
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateEmployee(id: string, companyId: string, data: Partial<Omit<Employee, 'id' | 'companyId'>>): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      if (data.employeeNumber !== undefined) { fields.push(`employee_number = $${idx++}`); values.push(data.employeeNumber); }
      if (data.fullName !== undefined) { fields.push(`full_name = $${idx++}`); values.push(data.fullName); }
      if (data.nationalId !== undefined) { fields.push(`national_id = $${idx++}`); values.push(data.nationalId); }
      if (data.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(data.phone); }
      if (data.email !== undefined) { fields.push(`email = $${idx++}`); values.push(data.email); }
      if (data.address !== undefined) { fields.push(`address = $${idx++}`); values.push(data.address); }
      if (data.departmentId !== undefined) { fields.push(`department_id = $${idx++}`); values.push(data.departmentId); }
      if (data.position !== undefined) { fields.push(`position = $${idx++}`); values.push(data.position); }
      if (data.grade !== undefined) { fields.push(`grade = $${idx++}`); values.push(data.grade); }
      if (data.hireDate !== undefined) { fields.push(`hire_date = $${idx++}`); values.push(data.hireDate); }
      if (data.terminationDate !== undefined) { fields.push(`termination_date = $${idx++}`); values.push(data.terminationDate); }
      if (data.baseSalary !== undefined) { fields.push(`base_salary = $${idx++}`); values.push(data.baseSalary); }
      if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.isActive); }
      if (data.photoUrl !== undefined) { fields.push(`photo_url = $${idx++}`); values.push(data.photoUrl); }
      if (data.attachments !== undefined) { fields.push(`attachments = $${idx++}`); values.push(data.attachments ? JSON.stringify(data.attachments) : null); }
      if (fields.length === 0) return { success: true };
      values.push(id);
      values.push(companyId);
      const result = await adapter.query(`UPDATE employees SET ${fields.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1}`, values);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteEmployee(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query('DELETE FROM employees WHERE id = $1 AND company_id = $2', [id, companyId]);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Attendance ───────────────────────────────────────────────────────────
  async getAttendance(companyId: string, month: number, year: number): Promise<{ success: boolean; data?: AttendanceRecord[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT a.*, e.full_name as employee_name FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.company_id = $1 AND EXTRACT(MONTH FROM a.date) = $2 AND EXTRACT(YEAR FROM a.date) = $3 ORDER BY a.date DESC`,
        [companyId, month, year]
      );
      if (result.success) {
        const rows = (result.rows || []).map((r: Record<string, unknown>) => mapAttendanceRow(r));
        return { success: true, data: rows };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async saveAttendance(records: Omit<AttendanceRecord, 'id'>[]): Promise<{ success: boolean; error?: string }> {
    try {
      if (records.length > 0) {
        const cidValidation = validateInput(companyIdSchema, records[0].companyId);
        if (!cidValidation.success) return { success: false, error: cidValidation.error };
      }
      const adapter = await getDbAdapter();
      for (const rec of records) {
        const existing = await adapter.query('SELECT id FROM attendance WHERE employee_id = $1 AND date = $2 LIMIT 1', [rec.employeeId, rec.date]);
        if (existing.rows?.[0]) {
          await adapter.query(
            'UPDATE attendance SET check_in = $1, check_out = $2, overtime_hours = $3, status = $4, notes = $5 WHERE id = $6',
            [rec.checkIn, rec.checkOut, rec.overtimeHours, rec.status, rec.notes, existing.rows[0].id]
          );
        } else {
          await adapter.query(
            'INSERT INTO attendance (company_id, employee_id, date, check_in, check_out, overtime_hours, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
            [rec.companyId, rec.employeeId, rec.date, rec.checkIn, rec.checkOut, rec.overtimeHours, rec.status, rec.notes]
          );
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Payroll ──────────────────────────────────────────────────────────────
  async getPayrollRuns(companyId: string): Promise<{ success: boolean; data?: PayrollRun[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query('SELECT * FROM payroll_runs WHERE company_id = $1 ORDER BY year DESC, month DESC', [companyId]);
      if (!result.success) return { success: false, error: result.error };
      const runs = (result.rows || []).map((r: Record<string, unknown>) => mapPayrollRunRow(r));
      for (const run of runs) {
        const linesRes = await adapter.query('SELECT * FROM payroll_lines WHERE payroll_run_id = $1', [run.id]);
        run.lines = (linesRes.rows || []).map((r: Record<string, unknown>) => mapPayrollLineRow(r));
      }
      return { success: true, data: runs };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createPayrollRun(data: Omit<PayrollRun, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, data.companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const tx = await adapter.transaction([
        { sql: `INSERT INTO payroll_runs (company_id, month, year, total_amount, status) VALUES ($1,$2,$3,$4,$5) RETURNING id`, params: [data.companyId, data.month, data.year, data.totalAmount, data.status] },
      ]);
      if (tx.success && tx.results?.[0]?.[0]) {
        const runId = tx.results[0][0].id as string;
        for (const line of data.lines) {
          await adapter.query(
            `INSERT INTO payroll_lines (payroll_run_id, employee_id, base_salary, allowances, deductions, overtime, net_salary) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [runId, line.employeeId, line.baseSalary, line.allowances, line.deductions, line.overtime, line.netSalary]
          );
        }
        return { success: true, id: runId };
      }
      return { success: false, error: tx.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async postPayrollRun(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query("UPDATE payroll_runs SET status = 'posted' WHERE id = $1 AND company_id = $2", [id, companyId]);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Leaves ───────────────────────────────────────────────────────────────
  async getLeaves(companyId: string): Promise<{ success: boolean; data?: Leave[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT l.*, e.full_name as employee_name FROM leaves l JOIN employees e ON l.employee_id = e.id WHERE l.company_id = $1 ORDER BY l.created_at DESC`,
        [companyId]
      );
      if (result.success) {
        const rows = (result.rows || []).map((r: Record<string, unknown>) => mapLeaveRow(r));
        return { success: true, data: rows };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createLeave(data: Omit<Leave, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, data.companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `INSERT INTO leaves (company_id, employee_id, leave_type, start_date, end_date, days, status, reason) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [data.companyId, data.employeeId, data.leaveType, data.startDate, data.endDate, data.days, data.status, data.reason]
      );
      if (result.success && result.rows?.[0]) return { success: true, id: result.rows[0].id };
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateLeaveStatus(id: string, companyId: string, status: Leave['status'], approvedBy?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        'UPDATE leaves SET status = $1, approved_by = $2, approved_at = $3 WHERE id = $4 AND company_id = $5',
        [status, approvedBy || null, status === 'approved' ? new Date().toISOString() : null, id, companyId]
      );
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteLeave(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query('DELETE FROM leaves WHERE id = $1 AND company_id = $2', [id, companyId]);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── End of Service ───────────────────────────────────────────────────────
  async getEndOfServices(companyId: string): Promise<{ success: boolean; data?: EndOfService[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT e.*, emp.full_name as employee_name FROM end_of_service e JOIN employees emp ON e.employee_id = emp.id WHERE e.company_id = $1 ORDER BY e.created_at DESC`,
        [companyId]
      );
      if (result.success) {
        const rows = (result.rows || []).map((r: Record<string, unknown>) => mapEosRow(r));
        return { success: true, data: rows };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createEndOfService(data: Omit<EndOfService, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, data.companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `INSERT INTO end_of_service (company_id, employee_id, termination_date, service_years, last_salary, eos_amount, reason, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [data.companyId, data.employeeId, data.terminationDate, data.serviceYears, data.lastSalary, data.eosAmount, data.reason, data.status, data.notes]
      );
      if (result.success && result.rows?.[0]) return { success: true, id: result.rows[0].id };
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateEndOfServiceStatus(id: string, companyId: string, status: EndOfService['status']): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query('UPDATE end_of_service SET status = $1 WHERE id = $2 AND company_id = $3', [status, id, companyId]);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteEndOfService(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query('DELETE FROM end_of_service WHERE id = $1 AND company_id = $2', [id, companyId]);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },
};

function mapEmployeeRow(r: Record<string, unknown>): Employee {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    employeeNumber: String(r.employee_number),
    fullName: String(r.full_name),
    nationalId: r.national_id ? String(r.national_id) : undefined,
    phone: r.phone ? String(r.phone) : undefined,
    email: r.email ? String(r.email) : undefined,
    address: r.address ? String(r.address) : undefined,
    departmentId: r.department_id ? String(r.department_id) : undefined,
    departmentName: r.department_name ? String(r.department_name) : undefined,
    position: r.position ? String(r.position) : undefined,
    grade: r.grade ? String(r.grade) : undefined,
    hireDate: r.hire_date ? String(r.hire_date) : undefined,
    terminationDate: r.termination_date ? String(r.termination_date) : undefined,
    baseSalary: r.base_salary ? Number(r.base_salary) : undefined,
    isActive: r.is_active === true || r.is_active === 'true',
    photoUrl: r.photo_url ? String(r.photo_url) : undefined,
    attachments: r.attachments ? JSON.parse(String(r.attachments)) : undefined,
  };
}

function mapAttendanceRow(r: Record<string, unknown>): AttendanceRecord {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    employeeId: String(r.employee_id),
    employeeName: r.employee_name ? String(r.employee_name) : undefined,
    date: String(r.date),
    checkIn: r.check_in ? String(r.check_in) : undefined,
    checkOut: r.check_out ? String(r.check_out) : undefined,
    overtimeHours: r.overtime_hours ? Number(r.overtime_hours) : undefined,
    status: String(r.status) as AttendanceRecord['status'],
    notes: r.notes ? String(r.notes) : undefined,
  };
}

function mapPayrollRunRow(r: Record<string, unknown>): PayrollRun {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    month: Number(r.month),
    year: Number(r.year),
    totalAmount: Number(r.total_amount) || 0,
    status: String(r.status) as PayrollRun['status'],
    lines: [],
    notes: r.notes ? String(r.notes) : undefined,
  };
}

function mapPayrollLineRow(r: Record<string, unknown>): PayrollLine {
  return {
    id: String(r.id),
    payrollRunId: String(r.payroll_run_id),
    employeeId: String(r.employee_id),
    employeeName: String(r.employee_name),
    baseSalary: Number(r.base_salary) || 0,
    allowances: Number(r.allowances) || 0,
    deductions: Number(r.deductions) || 0,
    overtime: Number(r.overtime) || 0,
    netSalary: Number(r.net_salary) || 0,
  };
}

function mapLeaveRow(r: Record<string, unknown>): Leave {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    employeeId: String(r.employee_id),
    employeeName: r.employee_name ? String(r.employee_name) : undefined,
    leaveType: String(r.leave_type) as Leave['leaveType'],
    startDate: String(r.start_date),
    endDate: String(r.end_date),
    days: Number(r.days) || 0,
    status: String(r.status) as Leave['status'],
    approvedBy: r.approved_by ? String(r.approved_by) : undefined,
    approvedAt: r.approved_at ? String(r.approved_at) : undefined,
    reason: r.reason ? String(r.reason) : undefined,
  };
}

function mapEosRow(r: Record<string, unknown>): EndOfService {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    employeeId: String(r.employee_id),
    employeeName: r.employee_name ? String(r.employee_name) : undefined,
    terminationDate: String(r.termination_date),
    serviceYears: Number(r.service_years) || 0,
    lastSalary: Number(r.last_salary) || 0,
    eosAmount: Number(r.eos_amount) || 0,
    reason: String(r.reason) as EndOfService['reason'],
    status: String(r.status) as EndOfService['status'],
    notes: r.notes ? String(r.notes) : undefined,
  };
}
