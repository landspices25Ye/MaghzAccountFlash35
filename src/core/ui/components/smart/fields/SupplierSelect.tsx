import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useSuppliers } from '@/modules/purchases/hooks/usePurchases';

interface SupplierSelectProps {
  companyId: string;
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showBalance?: boolean;
}

export const SupplierSelect: React.FC<SupplierSelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر المورد...', disabled, size, className, showBalance = true,
}) => {
  const { suppliers, isLoading } = useSuppliers(companyId);

  const options = useMemo(() => {
    return suppliers.map(s => ({
      label: s.name,
      sublabel: showBalance ? `الرصيد: ${Number(s.balance).toLocaleString('ar-SA')}` : s.phone || undefined,
      disabled: !s.isActive,
      ...s,
    })) as SmartSelectItem[];
  }, [suppliers, showBalance]);

  return (
    <SmartSelect
      value={value}
      onChange={onChange}
      options={options}
      isLoading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="بحث في الموردين..."
      emptyMessage="لا يوجد موردين"
      disabled={disabled}
      size={size}
      className={className}
      clearable
    />
  );
};

export default SupplierSelect;
