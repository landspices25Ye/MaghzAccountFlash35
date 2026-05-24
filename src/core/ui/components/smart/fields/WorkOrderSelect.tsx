import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useWorkOrders } from '@/modules/manufacturing/hooks/useManufacturing';

interface WorkOrderSelectProps {
  companyId: string;
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const WorkOrderSelect: React.FC<WorkOrderSelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر أمر الإنتاج...', disabled, size, className,
}) => {
  const { workOrders, isLoading } = useWorkOrders(companyId);

  const options = useMemo(() => {
    return workOrders.map(w => ({
      label: w.orderNumber,
      sublabel: `${w.status} | ${Number(w.quantity).toLocaleString('ar-SA')}`,
      ...w,
    })) as SmartSelectItem[];
  }, [workOrders]);

  return (
    <SmartSelect
      value={value}
      onChange={onChange}
      options={options}
      isLoading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="بحث في أوامر الإنتاج..."
      emptyMessage="لا توجد أوامر إنتاج"
      disabled={disabled}
      size={size}
      className={className}
      clearable
    />
  );
};

export default WorkOrderSelect;
