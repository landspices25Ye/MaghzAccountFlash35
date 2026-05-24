export interface User {
  id: string;
  companyId?: string;
  username: string;
  email?: string;
  role: 'super_admin' | 'admin' | 'manager' | 'accountant' | 'sales_rep' | 'viewer';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface Role {
  id: string;
  companyId?: string;
  name: string;
  permissions: Permission[];
}

export type Permission =
  // Core
  | 'core.view' | 'core.edit'
  // Accounting
  | 'accounting.view' | 'accounting.create' | 'accounting.edit' | 'accounting.delete' | 'accounting.post'
  // Inventory
  | 'inventory.view' | 'inventory.create' | 'inventory.edit' | 'inventory.delete'
  // Sales
  | 'sales.view' | 'sales.create' | 'sales.edit' | 'sales.delete' | 'sales.post'
  // Purchases
  | 'purchases.view' | 'purchases.create' | 'purchases.edit' | 'purchases.delete'
  // Manufacturing
  | 'manufacturing.view' | 'manufacturing.create' | 'manufacturing.edit'
  // HR
  | 'hr.view' | 'hr.create' | 'hr.edit' | 'hr.delete'
  // CRM
  | 'crm.view' | 'crm.create' | 'crm.edit' | 'crm.delete'
  // Reports
  | 'reports.view' | 'reports.export' | 'reports.custom'
  // Settings
  | 'settings.view' | 'settings.edit' | 'settings.users' | 'settings.roles';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
