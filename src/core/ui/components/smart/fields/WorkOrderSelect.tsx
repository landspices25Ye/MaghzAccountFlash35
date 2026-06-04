import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useWorkOrders } from '@/modules/manufacturing/hooks/useManufacturing';
import { useFormatters } from '@/core/utils/useFormatters';
import { useAppStore } from '@/core/store';

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
  const { activeCompany } = useAppStore();
  const { formatCurrency } = useFormatters(activeCompany?.id || '');

  const options = useMemo(() => {
    return workOrders.map(w => ({
      label: w.orderNumber,
      sublabel: `${w.status} | ${formatCurrency(w.quantity)}`,
      ...w,
    })) as SmartSelectItem[];
  }, [workOrders, formatCurrency]);

  return (
    <SmartSelect
      value={value}
      onChange={(v) => onChange(typeof v === 'string' ? v : null)}
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
