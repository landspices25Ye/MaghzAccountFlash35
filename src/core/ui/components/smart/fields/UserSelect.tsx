import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useUsers } from '@/modules/auth/hooks/useAuth';

interface UserSelectProps {
  companyId: string;
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UserSelect: React.FC<UserSelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر المستخدم...', disabled, size, className,
}) => {
  const { users, isLoading } = useUsers(companyId);

  const options = useMemo(() => {
    return users.map(u => ({
      label: u.username,
      sublabel: u.email || u.role,
      disabled: !u.isActive,
      ...u,
    })) as SmartSelectItem[];
  }, [users]);

  return (
    <SmartSelect
      value={value}
      onChange={(v) => onChange(typeof v === 'string' ? v : null)}
      options={options}
      isLoading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="بحث في المستخدمين..."
      emptyMessage="لا يوجد مستخدمين"
      disabled={disabled}
      size={size}
      className={className}
      clearable
    />
  );
};

export default UserSelect;
