/**
 * @deprecated Use `useFormatters` from `./useFormatters` instead.
 * This module provides pure functions that respect the company's locale
 * settings (calendar, decimal places, default currency).
 *
 * Kept for backward compatibility with non-React contexts (Electron, scripts).
 */
import { useAppStore } from '@/core/store';

export const DEFAULT_LOCALE = 'ar-YE';

const HIJRI_LOCALE = 'ar-SA-u-ca-islamic-umalqura';

function getSettings() {
  const company = useAppStore.getState().activeCompany;
  return {
    decimalPlaces: company?.decimalPlaces ?? 2,
    dateFormat: company?.dateFormat ?? 'yyyy-MM-dd',
    calendar: company?.calendar ?? 'gregorian',
    currency: company?.currency ?? 'YER',
  };
}

export function formatNumber(value: number | string, locale: string = DEFAULT_LOCALE): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '-';
  const { decimalPlaces } = getSettings();
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(num);
}

export function formatCurrencyValue(value: number | string, currency?: string, locale: string = DEFAULT_LOCALE): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '-';
  const { decimalPlaces, currency: defaultCurrency } = getSettings();
  const code = currency ?? defaultCurrency;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(num);
  } catch {
    return new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(num);
  }
}

export function formatDateValue(date: Date | string, locale: string = DEFAULT_LOCALE): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  const { calendar } = getSettings();
  const targetLocale = calendar === 'hijri' ? HIJRI_LOCALE : locale;
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  if (calendar === 'hijri') {
    (options as Record<string, unknown>).calendar = 'islamic';
  }
  return new Intl.DateTimeFormat(targetLocale, options).format(d);
}

export function formatDateTime(date: Date | string, locale: string = DEFAULT_LOCALE): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  const { calendar } = getSettings();
  const targetLocale = calendar === 'hijri' ? HIJRI_LOCALE : locale;
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };
  if (calendar === 'hijri') {
    (options as Record<string, unknown>).calendar = 'islamic';
  }
  return new Intl.DateTimeFormat(targetLocale, options).format(d);
}
