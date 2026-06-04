export const DEFAULT_LOCALE = 'ar-YE';

export function formatNumber(value: number | string, locale: string = DEFAULT_LOCALE): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat(locale).format(num);
}

export function formatCurrencyValue(value: number | string, currency = 'YER', locale: string = DEFAULT_LOCALE): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDateValue(date: Date | string, locale: string = DEFAULT_LOCALE): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function formatDateTime(date: Date | string, locale: string = DEFAULT_LOCALE): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
