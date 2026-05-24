import { useState, useEffect, useCallback } from 'react';
import { getDbAdapter } from '@/core/database/adapters';
import type { Employee } from '../types';

export function useEmployees(companyId: string) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const adapter = await getDbAdapter();
      const result = await adapter.query('SELECT * FROM employees WHERE company_id = $1 ORDER BY full_name', [companyId]);
      if (result.success && result.rows) {
        setEmployees(result.rows as Employee[]);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<Employee, 'id'>) => {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      'INSERT INTO employees (company_id, employee_number, full_name, national_id, phone, email, address, department_id, position, grade, hire_date, termination_date, base_salary, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id',
      [data.companyId, data.employeeNumber, data.fullName, data.nationalId, data.phone, data.email, data.address, data.departmentId, data.position, data.grade, data.hireDate, data.terminationDate, data.baseSalary, data.isActive]
    );
    if (result.success && result.rows?.[0]) {
      setEmployees(prev => [...prev, { ...data, id: result.rows![0].id }]);
    }
    return result;
  }, []);

  return { employees, isLoading, create };
}
