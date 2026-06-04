import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useLeads } from '@/modules/crm/hooks/useCrm';

interface LeadSelectProps {
  companyId: string;
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LeadSelect: React.FC<LeadSelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر العميل المحتمل...', disabled, size, className,
}) => {
  const { leads, isLoading } = useLeads(companyId);

  const options = useMemo(() => {
    return leads.map(l => ({
      label: l.name,
      sublabel: l.phone || l.email || undefined,
      ...l,
    })) as SmartSelectItem[];
  }, [leads]);

  return (
    <SmartSelect
      value={value}
      onChange={(v) => onChange(typeof v === 'string' ? v : null)}
      options={options}
      isLoading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="بحث في العملاء المحتملين..."
      emptyMessage="لا يوجد عملاء محتملين"
      disabled={disabled}
      size={size}
      className={className}
      clearable
    />
  );
};

export default LeadSelect;
