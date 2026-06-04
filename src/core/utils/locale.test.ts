import { describe, it, expect } from 'vitest';
import { DEFAULT_LOCALE, formatNumber, formatCurrencyValue, formatDateValue, formatDateTime } from './locale';

describe('locale utility', () => {
  it('exports DEFAULT_LOCALE as ar-YE', () => {
    expect(DEFAULT_LOCALE).toBe('ar-YE');
  });

  it('formatNumber uses default locale', () => {
    const result = formatNumber(1234.5);
    expect(result).toContain('١٬٢٣٤');
  });

  it('formatNumber returns - for NaN', () => {
    expect(formatNumber('not a number')).toBe('-');
    expect(formatNumber(NaN)).toBe('-');
  });

  it('formatCurrencyValue includes currency symbol', () => {
    const result = formatCurrencyValue(1000, 'YER');
    expect(result).toMatch(/١٬٠٠٠/);
  });

  it('formatDateValue returns formatted date', () => {
    const result = formatDateValue('2026-01-15T10:30:00Z');
    expect(result).toMatch(/2026|٢٠٢٦/);
    expect(result).toMatch(/01|٠١/);
  });

  it('formatDateTime includes time component', () => {
    const result = formatDateTime('2026-01-15T10:30:00Z');
    expect(result).toMatch(/٠١:٣٠|01:30|13:30|١:٣٠/);
  });

  it('all functions accept custom locale override', () => {
    const en = formatNumber(1234.5, 'en-US');
    expect(en).toBe('1,234.5');
  });
});
