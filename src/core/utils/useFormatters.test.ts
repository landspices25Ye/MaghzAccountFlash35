import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/core/store/settingsStore', () => ({
  useSettingsStore: vi.fn(),
}));

import { useSettingsStore } from '@/core/store/settingsStore';
import { useFormatters } from '@/core/utils/useFormatters';

const mockUseSettingsStore = useSettingsStore as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useFormatters - formatCurrency', () => {
  it('formats with 2 decimal places by default', () => {
    mockUseSettingsStore.mockReturnValue({
      decimalPlaces: 2, dateFormat: 'yyyy-MM-dd', calendar: 'gregorian',
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatCurrency(1234.5);
    expect(formatted).toMatch(/[\p{Nd},]+/u);
    expect(formatted).not.toBe('-');
  });

  it('formats with 0 decimal places', () => {
    mockUseSettingsStore.mockReturnValue({
      decimalPlaces: 0, dateFormat: 'yyyy-MM-dd', calendar: 'gregorian',
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatCurrency(1234.56);
    expect(formatted).not.toContain('.');
    expect(formatted).not.toBe('-');
  });

  it('returns dash for invalid input', () => {
    mockUseSettingsStore.mockReturnValue({
      decimalPlaces: 2, dateFormat: 'yyyy-MM-dd', calendar: 'gregorian',
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    expect(result.current.formatCurrency(NaN)).toBe('-');
    expect(result.current.formatCurrency('invalid')).toBe('-');
  });

  it('handles string number input', () => {
    mockUseSettingsStore.mockReturnValue({
      decimalPlaces: 2, dateFormat: 'yyyy-MM-dd', calendar: 'gregorian',
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatCurrency('5000');
    expect(formatted).not.toBe('-');
  });
});

describe('useFormatters - formatDate (Gregorian)', () => {
  it('formats with default yyyy-MM-dd', () => {
    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'yyyy-MM-dd', decimalPlaces: 2, calendar: 'gregorian',
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatDate(new Date(2024, 5, 15));
    expect(formatted).toBe('2024-06-15');
  });

  it('formats with dd/MM/yyyy', () => {
    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'dd/MM/yyyy', decimalPlaces: 2, calendar: 'gregorian',
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatDate(new Date(2024, 5, 15));
    expect(formatted).toBe('15/06/2024');
  });

  it('formats string date input', () => {
    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'yyyy-MM-dd', decimalPlaces: 2, calendar: 'gregorian',
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatDate('2024-06-15');
    expect(formatted).toBe('2024-06-15');
  });

  it('returns dash for invalid date', () => {
    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'yyyy-MM-dd', decimalPlaces: 2, calendar: 'gregorian',
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    expect(result.current.formatDate('invalid-date')).toBe('-');
  });
});

describe('useFormatters - formatDate (Hijri)', () => {
  it('formats Hijri date with yyyy/MM/dd and adds  هـ suffix', () => {
    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'yyyy/MM/dd', decimalPlaces: 2, calendar: 'hijri',
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatDate(new Date(2024, 0, 1));
    expect(formatted).toMatch(/\d{4}\/\d{2}\/\d{2} هـ/);
  });

  it('formats Hijri date with dd/MM/yyyy pattern', () => {
    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'dd/MM/yyyy', decimalPlaces: 2, calendar: 'hijri',
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatDate(new Date(2024, 5, 15));
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4} هـ/);
  });

  it('returns Hijri year approximately 1445-1446 for 2024 Gregorian', () => {
    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'yyyy', decimalPlaces: 2, calendar: 'hijri',
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatDate(new Date(2024, 5, 15));
    const year = parseInt(formatted.replace(' هـ', ''), 10);
    expect(year).toBeGreaterThanOrEqual(1445);
    expect(year).toBeLessThanOrEqual(1446);
  });
});

describe('useFormatters - calendar field', () => {
  it('returns gregorian by default', () => {
    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'yyyy-MM-dd', decimalPlaces: 2, calendar: 'gregorian',
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    expect(result.current.calendar).toBe('gregorian');
  });

  it('returns hijri when set', () => {
    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'yyyy/MM/dd', decimalPlaces: 2, calendar: 'hijri',
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    expect(result.current.calendar).toBe('hijri');
  });
});
