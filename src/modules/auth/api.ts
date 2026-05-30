import { getDbAdapter } from '@/core/database/adapters';
import type {
  User,
  Role,
  AuditLog,
  LoginCredentials,
  UserFilters,
  RoleFilters,
  AuditLogFilters,
} from './types';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const adapter = await getDbAdapter();
    const result = await adapter.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [credentials.username]
    );

    if (!result.success || !result.rows || result.rows.length === 0) {
      return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }

    const user = result.rows[0] as User;

    if (!user.isActive) {
      return { success: false, error: 'الحساب معطل' };
    }

    if (user.passwordHash) {
      const inputHash = await hashPassword(credentials.password);
      if (inputHash !== user.passwordHash) {
        return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
      }
    }

    if (credentials.rememberMe) {
      localStorage.setItem('auth_remember', credentials.username);
    }

    return { success: true, user };
  },

  async logout(): Promise<void> {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_remember');
  },

  async getCurrentUser(): Promise<User | null> {
    const stored = localStorage.getItem('auth_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  },

  async getUsers(companyId: string, filters?: UserFilters): Promise<{ success: boolean; data?: User[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      'SELECT * FROM users WHERE company_id = $1 ORDER BY username',
      [companyId]
    );
    if (result.success) {
      let users = (result.rows || []) as User[];
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        users = users.filter((u) => (u.username?.toLowerCase() || '').includes(q) || (u.email && u.email.toLowerCase().includes(q)));
      }
      if (filters?.role) {
        users = users.filter((u) => u.role === filters.role);
      }
      if (filters?.branchId) {
        users = users.filter((u) => u.branchId === filters.branchId);
      }
      if (filters?.isActive !== undefined) {
        users = users.filter((u) => u.isActive === filters.isActive);
      }
      return { success: true, data: users };
    }
    return { success: false, error: result.error };
  },

  async getUserById(id: string): Promise<{ success: boolean; data?: User; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.success && result.rows && result.rows.length > 0) {
      return { success: true, data: result.rows[0] as User };
    }
    return { success: false, error: result.error || 'User not found' };
  },

  async createUser(data: Omit<User, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    const pw = (data as any).password || '';
    const passwordHash = pw ? await hashPassword(pw) : '';
    const result = await adapter.query(
      `INSERT INTO users (company_id, username, email, full_name, phone, role, role_id, branch_id, is_active, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        data.companyId,
        data.username,
        data.email,
        data.fullName,
        data.phone,
        data.role,
        data.roleId,
        data.branchId,
        data.isActive,
        passwordHash,
        new Date().toISOString(),
      ]
    );
    if (result.success && result.rows?.[0]) {
      return { success: true, id: result.rows[0].id };
    }
    return { success: false, error: result.error };
  },

  async updateUser(id: string, data: Partial<User>): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query(
      `UPDATE users SET username = $1, email = $2, full_name = $3, phone = $4, role = $5, role_id = $6, branch_id = $7, is_active = $8, updated_at = $9 WHERE id = $10`,
      [data.username, data.email, data.fullName, data.phone, data.role, data.roleId, data.branchId, data.isActive, new Date().toISOString(), id]
    );
  },

  async deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query('DELETE FROM users WHERE id = $1', [id]);
  },

  async resetPassword(id: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    const passwordHash = await hashPassword(newPassword);
    return adapter.query(
      'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
      [passwordHash, new Date().toISOString(), id]
    );
  },

  async getRoles(companyId: string, filters?: RoleFilters): Promise<{ success: boolean; data?: Role[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query('SELECT * FROM roles WHERE company_id = $1 OR company_id IS NULL ORDER BY name', [companyId]);
    if (result.success) {
      let roles = (result.rows || []).map((row: any) => ({
        ...row,
        isSystem: row.is_system,
        permissions: Array.isArray(row.permissions) ? row.permissions : JSON.parse(row.permissions || '[]'),
      })) as Role[];
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        roles = roles.filter((r) => (r.name?.toLowerCase() || '').includes(q));
      }
      return { success: true, data: roles };
    }
    return { success: false, error: result.error };
  },

  async getRoleById(id: string): Promise<{ success: boolean; data?: Role; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query('SELECT * FROM roles WHERE id = $1', [id]);
    if (result.success && result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any;
      const role: Role = {
        ...row,
        isSystem: row.is_system,
        permissions: Array.isArray(row.permissions) ? row.permissions : JSON.parse(row.permissions || '[]'),
      };
      return { success: true, data: role };
    }
    return { success: false, error: result.error || 'Role not found' };
  },

  async createRole(data: Omit<Role, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    const permsJson = JSON.stringify(data.permissions);
    const result = await adapter.query(
      `INSERT INTO roles (company_id, name, description, permissions, is_system, created_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [data.companyId, data.name, data.description, permsJson, data.isSystem ?? false, new Date().toISOString()]
    );
    if (result.success && result.rows?.[0]) {
      return { success: true, id: result.rows[0].id };
    }
    return { success: false, error: result.error };
  },

  async updateRole(id: string, data: Partial<Role>): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    const permsJson = data.permissions ? JSON.stringify(data.permissions) : undefined;
    return adapter.query(
      `UPDATE roles SET name = $1, description = $2, permissions = $3, is_system = $4, updated_at = $5 WHERE id = $6`,
      [data.name, data.description, permsJson, data.isSystem, new Date().toISOString(), id]
    );
  },

  async deleteRole(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query('DELETE FROM roles WHERE id = $1', [id]);
  },

  async getAuditLogs(companyId: string, filters?: AuditLogFilters): Promise<{ success: boolean; data?: AuditLog[]; error?: string }> {
    const adapter = await getDbAdapter();
    let sql = 'SELECT * FROM audit_logs WHERE company_id = $1';
    const params: any[] = [companyId];

    if (filters?.userId) {
      sql += ' AND user_id = $' + (params.length + 1);
      params.push(filters.userId);
    }
    if (filters?.tableName) {
      sql += ' AND table_name = $' + (params.length + 1);
      params.push(filters.tableName);
    }
    if (filters?.action) {
      sql += ' AND action = $' + (params.length + 1);
      params.push(filters.action);
    }
    if (filters?.fromDate) {
      sql += ' AND created_at >= $' + (params.length + 1);
      params.push(filters.fromDate);
    }
    if (filters?.toDate) {
      sql += ' AND created_at <= $' + (params.length + 1);
      params.push(filters.toDate);
    }

    sql += ' ORDER BY created_at DESC LIMIT 1000';

    const result = await adapter.query(sql, params);
    if (result.success) {
      const logs = (result.rows || []).map((row: any) => ({
        ...row,
        oldValues: row.old_values ? JSON.parse(row.old_values) : undefined,
        newValues: row.new_values ? JSON.parse(row.new_values) : undefined,
        createdAt: row.created_at || row.createdAt,
      })) as AuditLog[];
      return { success: true, data: logs };
    }
    return { success: false, error: result.error };
  },
};
