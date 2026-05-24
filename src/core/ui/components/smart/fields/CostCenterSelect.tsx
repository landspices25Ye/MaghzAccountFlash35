import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useCostCenters } from '@/core/hooks/useSettings';

interface CostCenterSelectProps {
  companyId: string;
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CostCenterSelect: React.FC<CostCenterSelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر مركز التكلفة...', disabled, size, className,
}) => {
  const { centers, isLoading } = useCostCenters(companyId);

  const options = useMemo(() => {
    return centers.map(c => ({
      label: c.nameAr,
      sublabel: c.code || c.type,
      disabled: !c.isActive,
      ...c,
    })) as SmartSelectItem[];
  }, [centers]);

  return (
    <SmartSelect
      value={value}
      onChange={onChange}
      options={options}
      isLoading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="بحث في المراكز..."
      emptyMessage="لا يوجد مراكز تكلفة"
      disabled={disabled}
      size={size}
      className={className}
      clearable
    />
  );
};

export default CostCenterSelect;
