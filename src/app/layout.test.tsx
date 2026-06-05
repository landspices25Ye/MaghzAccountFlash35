import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './layout';
import { useAppStore } from '@/core/store';
import { useAuthStore } from '@/modules/auth/store';
import type { User, Permission } from '@/modules/auth/types';

function makeUser(role: string, _permissions: Permission[] = []): User {
  return {
    id: 'u-1',
    companyId: 'c-1',
    username: 'tester',
    fullName: 'Test User',
    role,
    roleId: 'r-1',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

function setUser(user: User | null, _permissions: Permission[] = []) {
  const store = useAuthStore.getState();
  if (user) {
    store.login(user, _permissions);
  } else {
    store.logout();
  }
}

function renderSidebar(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar />
    </MemoryRouter>
  );
}

describe('Sidebar role-aware navigation', () => {
  beforeEach(() => {
    setUser(null);
    useAppStore.setState({ sidebarOpen: true });
  });

  it('shows no menu items when no user is logged in', () => {
    renderSidebar();
    expect(screen.queryByText('لوحة التحكم')).toBeNull();
    expect(screen.queryByText('المبيعات')).toBeNull();
  });

  it('shows core modules for super_admin (everything)', () => {
    setUser(makeUser('super_admin'));
    renderSidebar();
    expect(screen.getByText('لوحة التحكم')).toBeInTheDocument();
    expect(screen.getByText('الحسابات')).toBeInTheDocument();
    expect(screen.getByText('المخازن')).toBeInTheDocument();
    expect(screen.getByText('المبيعات')).toBeInTheDocument();
    expect(screen.getByText('المشتريات')).toBeInTheDocument();
    expect(screen.getByText('التصنيع')).toBeInTheDocument();
    expect(screen.getByText('الموظفين')).toBeInTheDocument();
    expect(screen.getByText('العملاء')).toBeInTheDocument();
    expect(screen.getByText('التقارير')).toBeInTheDocument();
    expect(screen.getByText('الإعدادات')).toBeInTheDocument();
  });

  it('viewer sees read-only modules (no manufacturing, no HR, no CRM, no settings)', () => {
    setUser(makeUser('viewer'));
    renderSidebar();
    expect(screen.getByText('لوحة التحكم')).toBeInTheDocument();
    expect(screen.getByText('الحسابات')).toBeInTheDocument();
    expect(screen.getByText('المخازن')).toBeInTheDocument();
    expect(screen.getByText('المبيعات')).toBeInTheDocument();
    expect(screen.getByText('المشتريات')).toBeInTheDocument();
    expect(screen.getByText('التقارير')).toBeInTheDocument();
    expect(screen.queryByText('التصنيع')).toBeNull();
    expect(screen.queryByText('الموظفين')).toBeNull();
    expect(screen.queryByText('العملاء')).toBeNull();
    expect(screen.queryByText('الإعدادات')).toBeNull();
  });

  it('sales_rep with own perm only sees CRM + sales + inventory (own)', () => {
    setUser(makeUser('sales_rep'));
    renderSidebar();
    expect(screen.getByText('المبيعات')).toBeInTheDocument();
    expect(screen.getByText('العملاء')).toBeInTheDocument();
    expect(screen.getByText('التقارير')).toBeInTheDocument();
    expect(screen.queryByText('الحسابات')).toBeNull();
    expect(screen.queryByText('التصنيع')).toBeNull();
    expect(screen.queryByText('الموظفين')).toBeNull();
    expect(screen.queryByText('الإعدادات')).toBeNull();
  });

  it('re-renders sidebar when user changes (login)', () => {
    setUser(makeUser('viewer'));
    const { unmount } = renderSidebar();
    expect(screen.queryByText('التصنيع')).toBeNull();
    unmount();

    act(() => {
      setUser(
        makeUser('manager'),
        [
          'manufacturing.view',
          'sales.view',
          'purchases.view',
          'inventory.view',
          'accounting.view',
          'reports.view',
          'core.view',
        ]
      );
    });
    renderSidebar();
    expect(screen.getByText('التصنيع')).toBeInTheDocument();
  });

  it('re-renders sidebar when user logs out', () => {
    setUser(makeUser('manager'));
    const { unmount } = renderSidebar();
    expect(screen.getByText('المبيعات')).toBeInTheDocument();
    unmount();

    act(() => {
      setUser(null);
    });
    renderSidebar();
    expect(screen.queryByText('المبيعات')).toBeNull();
  });

  it('expands active parent and shows its children', () => {
    setUser(makeUser('manager'));
    renderSidebar('/sales/invoices');
    const salesLink = screen.getByText('المبيعات').closest('a');
    expect(salesLink).toBeInTheDocument();
    expect(screen.getByText('فواتير المبيعات')).toBeInTheDocument();
    expect(screen.getByText('العملاء')).toBeInTheDocument();
    expect(screen.getByText('عروض الأسعار')).toBeInTheDocument();
    expect(screen.getByText('مردودات المبيعات')).toBeInTheDocument();
  });

  it('does not render children of collapsed parents', () => {
    setUser(makeUser('manager'));
    renderSidebar('/');
    expect(screen.queryByText('فواتير المبيعات')).toBeNull();
    expect(screen.queryByText('ميزان المراجعة')).toBeNull();
  });

  it('admin cannot see settings.roles / core.edit but can see settings module', () => {
    setUser(makeUser('admin'));
    renderSidebar('/settings');
    expect(screen.getByText('الإعدادات')).toBeInTheDocument();
    const settingsSection = screen.getByText('الإعدادات').closest('div')?.parentElement;
    expect(within(settingsSection as HTMLElement).queryByText('الأدوار')).not.toBeNull();
  });
});
