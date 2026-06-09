import React, { useMemo } from 'react';
import { SmartSelect, type SmartSelectItem } from '../SmartSelect';
import { useProducts } from '@/modules/inventory/hooks/useInventory';
import { useProductTypes } from '@/core/hooks/useSettings';
import { filterProductsByModule, type ProductModule } from '@/core/utils/productTypeFilter';
import { useFormatters } from '@/core/utils/useFormatters';
import { useAppStore } from '@/core/store';
import { useTranslation } from '@/core/i18n/useTranslation';

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
  companyId, value, onChange, placeholder, disabled, size, className, multiple = false, showPrice = true, module, categoryId,
}) => {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('select.product.placeholder');
  const { products, isLoading } = useProducts(companyId);
  const { types: productTypes } = useProductTypes(companyId);
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
  }, [products, productTypes, showPrice, module, categoryId, formatCurrency]);

  return (
    <SmartSelect
      value={value}
      onChange={(v) => onChange(typeof v === 'string' ? v : multiple ? v : null)}
      options={options}
      isLoading={isLoading}
      placeholder={resolvedPlaceholder}
      searchPlaceholder={t('select.product.search')}
      emptyMessage={t('select.product.empty')}
      disabled={disabled}
      size={size}
      className={className}
      multiple={multiple}
      clearable
    />
  );
};

export default ProductSelect;
