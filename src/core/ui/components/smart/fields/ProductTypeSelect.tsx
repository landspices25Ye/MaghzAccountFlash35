import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useProductTypes } from '@/core/hooks/useSettings';
import type { ProductType } from '@/core/types';

interface ProductTypeSelectProps {
  companyId: string;
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  filterModule?: 'sales' | 'purchases' | 'inventory' | 'manufacturing';
}

export const ProductTypeSelect: React.FC<ProductTypeSelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر نوع المنتج...', disabled, size, className, filterModule,
}) => {
  const { types, isLoading } = useProductTypes(companyId);

  const options = useMemo(() => {
    let filtered = types;
    if (filterModule) {
      const map: Record<string, keyof ProductType> = {
        sales: 'appearsInSales',
        purchases: 'appearsInPurchases',
        inventory: 'appearsInInventory',
        manufacturing: 'appearsInManufacturing',
      };
      filtered = filtered.filter(t => t[map[filterModule] as keyof ProductType] as boolean);
    }
    return filtered.map(t => ({
      label: t.nameAr,
      sublabel: t.code || undefined,
      disabled: !t.isActive,
      ...t,
    })) as SmartSelectItem[];
  }, [types, filterModule]);

  return (
    <SmartSelect
      value={value}
      onChange={(v) => onChange(typeof v === 'string' ? v : null)}
      options={options}
      isLoading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="بحث في الأنواع..."
      emptyMessage="لا يوجد أنواع"
      disabled={disabled}
      size={size}
      className={className}
      clearable
    />
  );
};

export default ProductTypeSelect;
