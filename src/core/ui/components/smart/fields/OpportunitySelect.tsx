import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useOpportunities } from '@/modules/crm/hooks/useCrm';

interface OpportunitySelectProps {
  companyId: string;
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const OpportunitySelect: React.FC<OpportunitySelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر الفرصة...', disabled, size, className,
}) => {
  const { opportunities, isLoading } = useOpportunities(companyId);

  const options = useMemo(() => {
    return opportunities.map(o => ({
      label: o.name,
      sublabel: `${Number(o.value).toLocaleString('ar-SA')} | ${o.stage}`,
      ...o,
    })) as SmartSelectItem[];
  }, [opportunities]);

  return (
    <SmartSelect
      value={value}
      onChange={onChange}
      options={options}
      isLoading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="بحث في الفرص..."
      emptyMessage="لا توجد فرص"
      disabled={disabled}
      size={size}
      className={className}
      clearable
    />
  );
};

export default OpportunitySelect;
