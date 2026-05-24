export interface Employee {
  id: string;
  companyId: string;
  employeeNumber: string;
  fullName: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  address?: string;
  departmentId?: string;
  position?: string;
  grade?: string;
  hireDate?: string;
  terminationDate?: string;
  baseSalary?: number;
  isActive: boolean;
}
