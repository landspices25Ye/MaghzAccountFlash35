import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useSuppliers } from '@/modules/purchases/hooks/usePurchases';
import { useFormatters } from '@/core/utils/useFormatters';
import { useAppStore } from '@/core/store';

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
  const { activeCompany } = useAppStore();
  const { formatCurrency } = useFormatters(activeCompany?.id || '');

  const options = useMemo(() => {
    return suppliers.map(s => ({
      label: s.name,
      sublabel: showBalance ? `الرصيد: ${formatCurrency(s.balance)}` : s.phone || undefined,
      disabled: !s.isActive,
      ...s,
    })) as SmartSelectItem[];
  }, [suppliers, showBalance, formatCurrency]);

  return (
    <SmartSelect
      value={value}
      onChange={(v) => onChange(typeof v === 'string' ? v : null)}
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
