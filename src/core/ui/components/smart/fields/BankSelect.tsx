import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useBanks } from '@/core/hooks/useSettings';

interface BankSelectProps {
  companyId: string;
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BankSelect: React.FC<BankSelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر البنك...', disabled, size, className,
}) => {
  const { banks, isLoading } = useBanks(companyId);

  const options = useMemo(() => {
    return banks.map(b => ({
      label: b.name,
      sublabel: b.bankName || b.accountNumber || undefined,
      disabled: !b.isActive,
      ...b,
    })) as SmartSelectItem[];
  }, [banks]);

  return (
    <SmartSelect
      value={value}
      onChange={onChange}
      options={options}
      isLoading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="بحث في البنوك..."
      emptyMessage="لا يوجد بنوك"
      disabled={disabled}
      size={size}
      className={className}
      clearable
    />
  );
};

export default BankSelect;
