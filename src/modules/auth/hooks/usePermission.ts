import { useAuthStore } from '@/modules/auth/store';
import type { Permission } from '@/modules/auth/types';

export function usePermission(permission: Permission): boolean {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return hasPermission(permission);
}

export function usePermissions(permissions: Permission[]): Record<string, boolean> {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return permissions.reduce<Record<string, boolean>>((acc, p) => {
    acc[p] = hasPermission(p);
    return acc;
  }, {});
}

export function useHasRole(roles: string[]): boolean {
  const hasRole = useAuthStore((s) => s.hasRole);
  return hasRole(roles);
}

type Module = 'accounting' | 'inventory' | 'sales' | 'purchases' | 'manufacturing' | 'hr' | 'crm' | 'reports' | 'settings';

export function useCanView(module: Module): boolean {
  return usePermission(`${module}.view` as Permission);
}

export function useCanCreate(module: Module): boolean {
  return usePermission(`${module}.create` as Permission);
}

export function useCanEdit(module: Module): boolean {
  return usePermission(`${module}.edit` as Permission);
}

export function useCanDelete(module: Module): boolean {
  return usePermission(`${module}.delete` as Permission);
}

export function useCanPost(module: Module): boolean {
  return usePermission(`${module}.post` as Permission);
}

export function useCanExport(): boolean {
  return usePermission('reports.export');
}

export function useModulePermissions(module: Module) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return {
    canView: hasPermission(`${module}.view` as Permission),
    canCreate: hasPermission(`${module}.create` as Permission),
    canEdit: hasPermission(`${module}.edit` as Permission),
    canDelete: hasPermission(`${module}.delete` as Permission),
    canPost: hasPermission(`${module}.post` as Permission),
  };
}

export function useShouldFilterByOwner(module: Module): boolean {
  const shouldFilterByOwner = useAuthStore((s) => s.shouldFilterByOwner);
  return shouldFilterByOwner(module);
}
