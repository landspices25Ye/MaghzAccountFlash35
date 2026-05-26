import { useCallback } from 'react';
import { useSettings } from './useSettings';

export function useFormatters(companyId: string) {
  const { settings } = useSettings(companyId);
  const decimalPlaces = settings?.decimalPlaces ?? 2;
  const dateFormat = settings?.dateFormat ?? 'yyyy-MM-dd';

  const formatCurrency = useCallback((value: number | string) => {
    const num = typeof value === 'string' ? Number(value) : value;
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('ar-YE', {
      style: 'decimal',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(num);
  }, [decimalPlaces]);

  const formatDate = useCallback((date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    try {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return dateFormat
        .replace('yyyy', String(year))
        .replace('MM', month)
        .replace('dd', day);
    } catch {
      return '-';
    }
  }, [dateFormat]);

  return { formatCurrency, formatDate, decimalPlaces, dateFormat };
}

export default useFormatters;
