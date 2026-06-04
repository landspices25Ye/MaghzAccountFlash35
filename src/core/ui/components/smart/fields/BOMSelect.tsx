import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useBoms } from '@/modules/manufacturing/hooks/useManufacturing';

interface BOMSelectProps {
  companyId: string;
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BOMSelect: React.FC<BOMSelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر قائمة المواد...', disabled, size, className,
}) => {
  const { boms, isLoading } = useBoms(companyId);

  const options = useMemo(() => {
    return boms.map(b => ({
      label: b.productName || `BOM ${b.version}`,
      sublabel: `الإصدار: ${b.version}`,
      disabled: !b.isActive,
      ...b,
    })) as SmartSelectItem[];
  }, [boms]);

  return (
    <SmartSelect
      value={value}
      onChange={(v) => onChange(typeof v === 'string' ? v : null)}
      options={options}
      isLoading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="بحث في BOM..."
      emptyMessage="لا توجد قوائم مواد"
      disabled={disabled}
      size={size}
      className={className}
      clearable
    />
  );
};

export default BOMSelect;
