import { create } from 'zustand';
import type { User } from '@/modules/auth/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  
  // Permissions
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: string[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  login: (user) => {
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, isAuthenticated: true, isLoading: false });
  },
  
  logout: () => {
    localStorage.removeItem('auth_user');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
  
  setLoading: (loading) => set({ isLoading: loading }),

  hasPermission: (permission: string) => {
    const { user } = get();
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.role === 'super_admin') return true;
    
    // Admin has most permissions
    if (user.role === 'admin') {
      const restrictedPermissions = ['settings.roles', 'core.edit'];
      return !restrictedPermissions.includes(permission);
    }
    
    // Role-based permission check
    const rolePermissions: Record<string, string[]> = {
      manager: [
        'core.view', 'accounting.view', 'accounting.create', 'accounting.edit', 'accounting.post',
        'inventory.view', 'inventory.create', 'inventory.edit',
        'sales.view', 'sales.create', 'sales.edit', 'sales.post',
        'purchases.view', 'purchases.create', 'purchases.edit',
        'reports.view', 'reports.export',
        'settings.view',
      ],
      accountant: [
        'core.view',
        'accounting.view', 'accounting.create', 'accounting.edit', 'accounting.post',
        'inventory.view',
        'sales.view', 'sales.create', 'sales.edit',
        'purchases.view', 'purchases.create', 'purchases.edit',
        'reports.view', 'reports.export',
      ],
      sales_rep: [
        'sales.view', 'sales.create', 'sales.edit',
        'inventory.view',
        'crm.view', 'crm.create', 'crm.edit',
        'reports.view',
      ],
      viewer: [
        'core.view', 'accounting.view', 'inventory.view', 'sales.view',
        'purchases.view', 'reports.view',
      ],
    };
    
    const permissions = rolePermissions[user.role] || [];
    return permissions.includes(permission);
  },

  hasRole: (roles: string[]) => {
    const { user } = get();
    if (!user) return false;
    return roles.includes(user.role);
  },
}));

// Initialize auth state from localStorage
export function initAuth() {
  const stored = localStorage.getItem('auth_user');
  if (stored) {
    try {
      const user = JSON.parse(stored);
      useAuthStore.getState().login(user);
    } catch {
      useAuthStore.getState().logout();
    }
  } else {
    useAuthStore.getState().setLoading(false);
  }
}
