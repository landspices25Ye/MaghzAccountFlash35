import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useCurrencies } from '@/modules/core/hooks/useCore';

interface CurrencySelectProps {
  companyId: string;
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CurrencySelect: React.FC<CurrencySelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر العملة...', disabled, size, className,
}) => {
  const { currencies, isLoading } = useCurrencies(companyId);

  const options = useMemo(() => {
    return currencies.map(c => ({
      label: `${c.name} (${c.code})`,
      sublabel: c.isDefault ? 'الافتراضية' : `سعر الصرف: ${c.exchangeRate}`,
      disabled: !c.isActive,
      ...c,
    })) as SmartSelectItem[];
  }, [currencies]);

  return (
    <SmartSelect
      value={value}
      onChange={(v) => onChange(typeof v === 'string' ? v : null)}
      options={options}
      isLoading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="بحث في العملات..."
      emptyMessage="لا توجد عملات"
      disabled={disabled}
      size={size}
      className={className}
      clearable
    />
  );
};

export default CurrencySelect;
