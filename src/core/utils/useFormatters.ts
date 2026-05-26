import { useCallback } from 'react';
import { useSettings } from './useSettings';

export function useFormatters(companyId: string) {
  const { settings } = useSettings(companyId);
  const decimalPlaces = settings?.decimalPlaces ?? 2;
  const dateFormat = settings?.dateFormat ?? 'yyyy-MM-dd';
  const calendar = settings?.calendar ?? 'gregorian';

  const formatCurrency = useCallback((value: number | string) => {
    const num = typeof value === 'string' ? Number(value) : value;
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('ar-YE', {
      style: 'decimal',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(num);
  }, [decimalPlaces]);

  const getHijriParts = useCallback((date: Date) => {
    const f = new Intl.DateTimeFormat('en-u-ca-islamic', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = f.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';
    return { year, month: month.padStart(2, '0'), day: day.padStart(2, '0') };
  }, []);

  const formatDate = useCallback((date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    try {
      if (calendar === 'hijri') {
        const hijri = getHijriParts(d);
        return dateFormat
          .replace('yyyy', hijri.year)
          .replace('MM', hijri.month)
          .replace('dd', hijri.day) + ' هـ';
      }
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
  }, [dateFormat, calendar, getHijriParts]);

  return { formatCurrency, formatDate, decimalPlaces, dateFormat, calendar };
}

export default useFormatters;
