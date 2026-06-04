import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useAccounts } from '@/modules/accounting/hooks/useAccounting';

interface AccountSelectProps {
  companyId: string;
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  filterType?: 'all' | 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  excludeGroups?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AccountSelect: React.FC<AccountSelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر الحساب...',
  filterType = 'all', excludeGroups = true, disabled, size, className,
}) => {
  const { accounts, isLoading } = useAccounts(companyId);

  const options = useMemo(() => {
    let filtered = accounts;
    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.type === filterType);
    }
    if (excludeGroups) {
      filtered = filtered.filter(a => !a.isGroup);
    }
    return filtered.map(a => ({
      label: `${a.code} - ${a.nameAr}`,
      sublabel: a.nameEn || undefined,
      disabled: !a.isActive,
      ...a,
    })) as SmartSelectItem[];
  }, [accounts, filterType, excludeGroups]);

  return (
    <SmartSelect
      value={value}
      onChange={(v) => onChange(typeof v === 'string' ? v : null)}
      options={options}
      isLoading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="بحث في الحسابات..."
      emptyMessage="لا توجد حسابات"
      disabled={disabled}
      size={size}
      className={className}
      clearable
    />
  );
};

export default AccountSelect;
