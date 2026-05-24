import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useProducts } from '@/modules/inventory/hooks/useInventory';

interface ProductSelectProps {
  companyId: string;
  value?: string | string[];
  onChange: (value: string | string[] | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  multiple?: boolean;
  showPrice?: boolean;
}

export const ProductSelect: React.FC<ProductSelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر المنتج...', disabled, size, className, multiple = false, showPrice = true,
}) => {
  const { products, isLoading } = useProducts(companyId);

  const options = useMemo(() => {
    return products.map(p => ({
      label: p.nameAr,
      sublabel: showPrice ? `سعر: ${Number(p.salePrice).toLocaleString('ar-SA')} | ${p.code}` : p.code,
      disabled: !p.isActive,
      ...p,
    })) as SmartSelectItem[];
  }, [products, showPrice]);

  return (
    <SmartSelect
      value={value}
      onChange={onChange}
      options={options}
      isLoading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="بحث في المنتجات..."
      emptyMessage="لا توجد منتجات"
      disabled={disabled}
      size={size}
      className={className}
      multiple={multiple}
      clearable
    />
  );
};

export default ProductSelect;
