import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useEmployees } from '@/modules/hr/hooks/useHr';

interface EmployeeSelectProps {
  companyId: string;
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  filterActive?: boolean;
}

export const EmployeeSelect: React.FC<EmployeeSelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر الموظف...', disabled, size, className, filterActive = true,
}) => {
  const { employees, isLoading } = useEmployees(companyId);

  const options = useMemo(() => {
    let filtered = employees;
    if (filterActive) filtered = filtered.filter(e => e.isActive);
    return filtered.map(e => ({
      label: e.fullName,
      sublabel: `${e.employeeNumber} | ${e.position || ''}`,
      disabled: !e.isActive,
      ...e,
    })) as SmartSelectItem[];
  }, [employees, filterActive]);

  return (
    <SmartSelect
      value={value}
      onChange={onChange}
      options={options}
      isLoading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="بحث في الموظفين..."
      emptyMessage="لا يوجد موظفين"
      disabled={disabled}
      size={size}
      className={className}
      clearable
    />
  );
};

export default EmployeeSelect;
