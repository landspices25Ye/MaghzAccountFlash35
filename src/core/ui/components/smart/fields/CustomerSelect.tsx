import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useCustomers } from '@/modules/sales/hooks/useSales';
import { useFormatters } from '@/core/utils/useFormatters';
import { useAppStore } from '@/core/store';

interface CustomerSelectProps {
  companyId: string;
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showBalance?: boolean;
}

export const CustomerSelect: React.FC<CustomerSelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر العميل...', disabled, size, className, showBalance = true,
}) => {
  const { customers, isLoading } = useCustomers(companyId);
  const { activeCompany } = useAppStore();
  const { formatCurrency } = useFormatters(activeCompany?.id || '');

  const options = useMemo(() => {
    return customers.map(c => ({
      label: c.name,
      sublabel: showBalance ? `الرصيد: ${formatCurrency(c.balance)}` : c.phone || undefined,
      disabled: !c.isActive,
      ...c,
    })) as SmartSelectItem[];
  }, [customers, showBalance]);

  return (
    <SmartSelect
      value={value}
      onChange={onChange}
      options={options}
      isLoading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="بحث في العملاء..."
      emptyMessage="لا يوجد عملاء"
      disabled={disabled}
      size={size}
      className={className}
      clearable
    />
  );
};

export default CustomerSelect;
