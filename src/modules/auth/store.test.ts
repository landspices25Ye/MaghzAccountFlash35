import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, initAuth } from './store';
import type { User } from './types';

// Clear localStorage before each test
beforeEach(() => {
  localStorage.clear();
  useAuthStore.getState().logout();
});

describe('Auth Store', () => {
  describe('login', () => {
    it('sets user and authentication state', () => {
      const user: User = { id: '1', username: 'admin', email: 'a@b.com', role: 'admin', isActive: true };
      useAuthStore.getState().login(user);

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user).toEqual(user);
      expect(localStorage.getItem('auth_user')).toBeTruthy();
    });
  });

  describe('logout', () => {
    it('clears user and auth state', () => {
      const user: User = { id: '1', username: 'admin', email: 'a@b.com', role: 'admin', isActive: true };
      useAuthStore.getState().login(user);
      useAuthStore.getState().logout();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('returns false when not authenticated', () => {
      expect(useAuthStore.getState().hasPermission('core.view')).toBe(false);
    });

    it('super_admin has all permissions', () => {
      const user: User = { id: '1', username: 'super', email: 's@b.com', role: 'super_admin', isActive: true };
      useAuthStore.getState().login(user);
      expect(useAuthStore.getState().hasPermission('any.permission')).toBe(true);
    });

    it('admin has most permissions except restricted', () => {
      const user: User = { id: '1', username: 'admin', email: 'a@b.com', role: 'admin', isActive: true };
      useAuthStore.getState().login(user);
      expect(useAuthStore.getState().hasPermission('core.view')).toBe(true);
      expect(useAuthStore.getState().hasPermission('settings.roles')).toBe(true);
      expect(useAuthStore.getState().hasPermission('core.edit')).toBe(false);
    });

    it('accountant has accounting permissions', () => {
      const user: User = { id: '2', username: 'acc', email: 'a@b.com', role: 'accountant', isActive: true };
      useAuthStore.getState().login(user);
      expect(useAuthStore.getState().hasPermission('accounting.post')).toBe(true);
      expect(useAuthStore.getState().hasPermission('sales.create')).toBe(true);
      expect(useAuthStore.getState().hasPermission('hr.view')).toBe(false);
    });

    it('sales_rep has sales and crm permissions', () => {
      const user: User = { id: '3', username: 'sales', email: 's@b.com', role: 'sales_rep', isActive: true };
      useAuthStore.getState().login(user);
      expect(useAuthStore.getState().hasPermission('sales.create')).toBe(true);
      expect(useAuthStore.getState().hasPermission('accounting.view')).toBe(false);
    });

    it('viewer has read-only permissions', () => {
      const user: User = { id: '4', username: 'view', email: 'v@b.com', role: 'viewer', isActive: true };
      useAuthStore.getState().login(user);
      expect(useAuthStore.getState().hasPermission('sales.view')).toBe(true);
      expect(useAuthStore.getState().hasPermission('sales.create')).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('returns true for matching role', () => {
      const user: User = { id: '1', username: 'admin', email: 'a@b.com', role: 'admin', isActive: true };
      useAuthStore.getState().login(user);
      expect(useAuthStore.getState().hasRole(['admin', 'manager'])).toBe(true);
    });

    it('returns false for non-matching role', () => {
      const user: User = { id: '1', username: 'admin', email: 'a@b.com', role: 'admin', isActive: true };
      useAuthStore.getState().login(user);
      expect(useAuthStore.getState().hasRole(['viewer'])).toBe(false);
    });
  });

  describe('initAuth', () => {
    it('restores auth from localStorage', () => {
      const user: User = { id: '1', username: 'admin', email: 'a@b.com', role: 'admin', isActive: true };
      localStorage.setItem('auth_user', JSON.stringify(user));

      initAuth();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.username).toBe('admin');
    });

    it('handles invalid stored data', () => {
      localStorage.setItem('auth_user', 'invalid-json');
      initAuth();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
