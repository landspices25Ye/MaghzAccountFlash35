import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useBranches } from '@/modules/core/hooks/useCore';

interface BranchSelectProps {
  companyId: string;
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BranchSelect: React.FC<BranchSelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر الفرع...', disabled, size, className,
}) => {
  const { branches, isLoading } = useBranches(companyId);

  const options = useMemo(() => {
    return branches.map(b => ({
      label: b.name,
      sublabel: b.code || undefined,
      disabled: !b.isActive,
      ...b,
    })) as SmartSelectItem[];
  }, [branches]);

  return (
    <SmartSelect
      value={value}
      onChange={(v) => onChange(typeof v === 'string' ? v : null)}
      options={options}
      isLoading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="بحث في الفروع..."
      emptyMessage="لا يوجد فروع"
      disabled={disabled}
      size={size}
      className={className}
      clearable
    />
  );
};

export default BranchSelect;
