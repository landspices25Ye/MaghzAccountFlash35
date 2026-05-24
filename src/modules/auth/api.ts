import { getDbAdapter } from '@/core/database/adapters';
import type { User, LoginCredentials } from './types';

// Mock auth for development (replace with real backend in production)
const MOCK_USERS: User[] = [
  { id: '1', username: 'admin', email: 'admin@maghz.local', role: 'admin', isActive: true },
  { id: '2', username: 'محاسب', email: 'accountant@maghz.local', role: 'accountant', isActive: true },
  { id: '3', username: 'مبيعات', email: 'sales@maghz.local', role: 'sales_rep', isActive: true },
  { id: '4', username: 'مدير', email: 'manager@maghz.local', role: 'manager', isActive: true },
];

export const authApi = {
  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = MOCK_USERS.find(u => u.username === credentials.username);
    
    if (!user) {
      return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }
    
    if (!user.isActive) {
      return { success: false, error: 'الحساب معطل' };
    }
    
    // In production, verify password hash here
    return { success: true, user };
  },

  async logout(): Promise<void> {
    // Clear any server-side sessions if needed
    localStorage.removeItem('auth_user');
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

  async getUsers(companyId: string): Promise<{ success: boolean; data?: User[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      'SELECT * FROM users WHERE company_id = $1 ORDER BY username',
      [companyId]
    );
    if (result.success) {
      return { success: true, data: result.rows as User[] };
    }
    return { success: false, error: result.error };
  },

  async createUser(data: Omit<User, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `INSERT INTO users (company_id, username, email, role, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [data.companyId, data.username, data.email, data.role, '', data.isActive]
    );
    if (result.success && result.rows?.[0]) {
      return { success: true, id: result.rows[0].id };
    }
    return { success: false, error: result.error };
  },

  async updateUser(id: string, data: Partial<User>): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query(
      `UPDATE users SET username = $1, email = $2, role = $3, is_active = $4, updated_at = NOW() WHERE id = $5`,
      [data.username, data.email, data.role, data.isActive, id]
    );
  },
};
