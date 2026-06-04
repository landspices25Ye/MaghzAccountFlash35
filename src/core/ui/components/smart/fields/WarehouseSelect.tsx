import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useWarehouses } from '@/modules/inventory/hooks/useInventory';

interface WarehouseSelectProps {
  companyId: string;
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const WarehouseSelect: React.FC<WarehouseSelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر المخزن...', disabled, size, className,
}) => {
  const { warehouses, isLoading } = useWarehouses(companyId);

  const options = useMemo(() => {
    return warehouses.map(w => ({
      label: w.name,
      sublabel: w.code || undefined,
      disabled: !w.isActive,
      ...w,
    })) as SmartSelectItem[];
  }, [warehouses]);

  return (
    <SmartSelect
      value={value}
      onChange={(v) => onChange(typeof v === 'string' ? v : null)}
      options={options}
      isLoading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="بحث في المخازن..."
      emptyMessage="لا يوجد مخازن"
      disabled={disabled}
      size={size}
      className={className}
      clearable
    />
  );
};

export default WarehouseSelect;
