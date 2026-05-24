import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store';
import { authApi } from '../api';
import type { User, LoginCredentials } from '../types';

export function useAuth() {
  const { user, isAuthenticated, isLoading, login: storeLogin, logout: storeLogout } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setError(null);
    const result = await authApi.login(credentials);
    if (result.success && result.user) {
      storeLogin(result.user);
      return true;
    }
    setError(result.error || 'Login failed');
    return false;
  }, [storeLogin]);

  const logout = useCallback(() => {
    authApi.logout();
    storeLogout();
  }, [storeLogout]);

  return { user, isAuthenticated, isLoading, error, login, logout };
}

export function useUsers(companyId: string) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await authApi.getUsers(companyId);
      if (result.success && result.data) {
        setUsers(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<User, 'id'>) => {
    const result = await authApi.createUser(data);
    if (result.success && result.id) {
      setUsers(prev => [...prev, { ...data, id: result.id! }]);
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<User>) => {
    const result = await authApi.updateUser(id, data);
    if (result.success) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
    }
    return result;
  }, []);

  return { users, isLoading, create, update };
}
