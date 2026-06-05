import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { usePermission, useCanView, useCanCreate, useModulePermissions } from './usePermission';
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

function Probe({ perm }: { perm: Permission }) {
  const v = usePermission(perm);
  return <span data-testid="probe">{String(v)}</span>;
}

function ProbeViewCreate({ module }: { module: 'sales' | 'accounting' }) {
  const canView = useCanView(module);
  const canCreate = useCanCreate(module);
  return (
    <span data-testid="probe">
      {canView ? 'V' : '-'}:{canCreate ? 'C' : '-'}
    </span>
  );
}

function ProbeModule({ module }: { module: 'sales' | 'hr' }) {
  const perms = useModulePermissions(module);
  return (
    <span data-testid="probe">
      {JSON.stringify(perms)}
    </span>
  );
}

describe('usePermission', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('returns false when no user is logged in', () => {
    render(<Probe perm="sales.create" />);
    expect(screen.getByTestId('probe')).toHaveTextContent('false');
  });

  it('returns true when user has the permission (manager + fallback)', () => {
    act(() => {
      useAuthStore.getState().login(makeUser('manager'));
    });
    render(<Probe perm="sales.create" />);
    expect(screen.getByTestId('probe')).toHaveTextContent('true');
  });

  it('returns false when user lacks the permission', () => {
    act(() => {
      useAuthStore.getState().login(makeUser('viewer'));
    });
    render(<Probe perm="sales.create" />);
    expect(screen.getByTestId('probe')).toHaveTextContent('false');
  });

  it('super_admin returns true for any permission', () => {
    act(() => {
      useAuthStore.getState().login(makeUser('super_admin'));
    });
    render(<Probe perm="settings.roles" />);
    expect(screen.getByTestId('probe')).toHaveTextContent('true');
  });

  it('re-renders when user changes (login)', () => {
    const { rerender } = render(<Probe perm="sales.create" />);
    expect(screen.getByTestId('probe')).toHaveTextContent('false');

    act(() => {
      useAuthStore.getState().login(makeUser('manager'));
    });
    rerender(<Probe perm="sales.create" />);
    expect(screen.getByTestId('probe')).toHaveTextContent('true');
  });

  it('re-renders when user changes (logout)', () => {
    act(() => {
      useAuthStore.getState().login(makeUser('manager'));
    });
    const { rerender } = render(<Probe perm="sales.create" />);
    expect(screen.getByTestId('probe')).toHaveTextContent('true');

    act(() => {
      useAuthStore.getState().logout();
    });
    rerender(<Probe perm="sales.create" />);
    expect(screen.getByTestId('probe')).toHaveTextContent('false');
  });

  it('re-renders when permissions are updated', () => {
    act(() => {
      useAuthStore.getState().login(makeUser('viewer'));
    });
    const { rerender } = render(<Probe perm="sales.create" />);
    expect(screen.getByTestId('probe')).toHaveTextContent('false');

    act(() => {
      useAuthStore.getState().setPermissions(['sales.create', 'sales.view']);
    });
    rerender(<Probe perm="sales.create" />);
    expect(screen.getByTestId('probe')).toHaveTextContent('true');
  });
});

describe('useCanView / useCanCreate', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('view+create shortcuts for manager', () => {
    act(() => {
      useAuthStore.getState().login(makeUser('manager'));
    });
    render(<ProbeViewCreate module="sales" />);
    expect(screen.getByTestId('probe')).toHaveTextContent('V:C');
  });

  it('viewer has view but not create', () => {
    act(() => {
      useAuthStore.getState().login(makeUser('viewer'));
    });
    render(<ProbeViewCreate module="sales" />);
    expect(screen.getByTestId('probe')).toHaveTextContent('V:-');
  });

  it('sales_rep with own perm has no module.view', () => {
    act(() => {
      useAuthStore.getState().login(makeUser('sales_rep'));
    });
    render(<ProbeViewCreate module="accounting" />);
    expect(screen.getByTestId('probe')).toHaveTextContent('-:-');
  });
});

describe('useModulePermissions', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('returns all false when not logged in', () => {
    render(<ProbeModule module="sales" />);
    const text = screen.getByTestId('probe').textContent ?? '';
    expect(text).toContain('"canView":false');
    expect(text).toContain('"canCreate":false');
    expect(text).toContain('"canEdit":false');
    expect(text).toContain('"canDelete":false');
    expect(text).toContain('"canPost":false');
  });

  it('manager has canView + canCreate + canEdit + canPost for sales', () => {
    act(() => {
      useAuthStore.getState().login(makeUser('manager'));
    });
    render(<ProbeModule module="sales" />);
    const text = screen.getByTestId('probe').textContent ?? '';
    expect(text).toContain('"canView":true');
    expect(text).toContain('"canCreate":true');
    expect(text).toContain('"canEdit":true');
    expect(text).toContain('"canPost":true');
  });
});
