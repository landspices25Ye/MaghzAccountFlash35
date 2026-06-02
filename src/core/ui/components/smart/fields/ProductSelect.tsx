import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useProducts } from '@/modules/inventory/hooks/useInventory';
import { useProductTypes } from '@/core/hooks/useSettings';
import { filterProductsByModule, type ProductModule } from '@/core/utils/productTypeFilter';
import { useFormatters } from '@/core/utils/useFormatters';
import { useAppStore } from '@/core/store';

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
  module?: ProductModule;
  categoryId?: string;
}

export const ProductSelect: React.FC<ProductSelectProps> = ({
  companyId, value, onChange, placeholder = 'اختر المنتج...', disabled, size, className, multiple = false, showPrice = true, module, categoryId,
}) => {
  const { products, isLoading } = useProducts(companyId);
  const { productTypes } = useProductTypes(companyId);
  const { activeCompany } = useAppStore();
  const { formatCurrency } = useFormatters(activeCompany?.id || '');

  const options = useMemo(() => {
    let filtered = products;
    if (module) {
      filtered = filterProductsByModule(filtered, productTypes, module);
    }
    if (categoryId) {
      filtered = filtered.filter((p) => p.categoryId === categoryId || p.categoryIds?.includes(categoryId));
    }
    return filtered.map(p => {
      const type = productTypes.find(t => t.id === p.productTypeId);
      const typeLabel = type ? ` • ${type.nameAr}` : '';
      return {
        label: `${p.nameAr}${typeLabel}`,
        sublabel: showPrice ? `سعر: ${formatCurrency(p.salePrice)} | ${p.code}` : p.code,
        disabled: !p.isActive,
        ...p,
      } as SmartSelectItem;
    });
  }, [products, productTypes, showPrice, module, categoryId]);

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
