import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('./useSettings', () => ({
  useSettings: vi.fn(),
}));

import { useSettings } from './useSettings';
import { useFormatters } from './useFormatters';

const mockUseSettings = useSettings as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useFormatters - formatCurrency', () => {
  it('formats with 2 decimal places by default', () => {
    mockUseSettings.mockReturnValue({
      settings: { decimalPlaces: 2, dateFormat: 'yyyy-MM-dd', calendar: 'gregorian' },
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatCurrency(1234.5);
    expect(formatted).toMatch(/[\p{Nd},]+/u);
    expect(formatted).not.toBe('-');
  });

  it('formats with 0 decimal places', () => {
    mockUseSettings.mockReturnValue({
      settings: { decimalPlaces: 0, dateFormat: 'yyyy-MM-dd', calendar: 'gregorian' },
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatCurrency(1234.56);
    expect(formatted).not.toContain('.');
    expect(formatted).not.toBe('-');
  });

  it('returns dash for invalid input', () => {
    mockUseSettings.mockReturnValue({
      settings: { decimalPlaces: 2, dateFormat: 'yyyy-MM-dd', calendar: 'gregorian' },
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    expect(result.current.formatCurrency(NaN)).toBe('-');
    expect(result.current.formatCurrency('invalid')).toBe('-');
  });

  it('handles string number input', () => {
    mockUseSettings.mockReturnValue({
      settings: { decimalPlaces: 2, dateFormat: 'yyyy-MM-dd', calendar: 'gregorian' },
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatCurrency('5000');
    expect(formatted).not.toBe('-');
  });
});

describe('useFormatters - formatDate (Gregorian)', () => {
  it('formats with default yyyy-MM-dd', () => {
    mockUseSettings.mockReturnValue({
      settings: { dateFormat: 'yyyy-MM-dd', decimalPlaces: 2, calendar: 'gregorian' },
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatDate(new Date(2024, 5, 15));
    expect(formatted).toBe('2024-06-15');
  });

  it('formats with dd/MM/yyyy', () => {
    mockUseSettings.mockReturnValue({
      settings: { dateFormat: 'dd/MM/yyyy', decimalPlaces: 2, calendar: 'gregorian' },
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatDate(new Date(2024, 5, 15));
    expect(formatted).toBe('15/06/2024');
  });

  it('formats string date input', () => {
    mockUseSettings.mockReturnValue({
      settings: { dateFormat: 'yyyy-MM-dd', decimalPlaces: 2, calendar: 'gregorian' },
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatDate('2024-06-15');
    expect(formatted).toBe('2024-06-15');
  });

  it('returns dash for invalid date', () => {
    mockUseSettings.mockReturnValue({
      settings: { dateFormat: 'yyyy-MM-dd', decimalPlaces: 2, calendar: 'gregorian' },
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    expect(result.current.formatDate('invalid-date')).toBe('-');
  });
});

describe('useFormatters - formatDate (Hijri)', () => {
  it('formats Hijri date with yyyy/MM/dd and adds  هـ suffix', () => {
    mockUseSettings.mockReturnValue({
      settings: { dateFormat: 'yyyy/MM/dd', decimalPlaces: 2, calendar: 'hijri' },
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatDate(new Date(2024, 0, 1));
    expect(formatted).toMatch(/\d{4}\/\d{2}\/\d{2} هـ/);
  });

  it('formats Hijri date with dd/MM/yyyy pattern', () => {
    mockUseSettings.mockReturnValue({
      settings: { dateFormat: 'dd/MM/yyyy', decimalPlaces: 2, calendar: 'hijri' },
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    const formatted = result.current.formatDate(new Date(2024, 5, 15));
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4} هـ/);
  });

  it('returns Hijri year approximately 1445-1446 for 2024 Gregorian', () => {
    mockUseSettings.mockReturnValue({
      settings: { dateFormat: 'yyyy', decimalPlaces: 2, calendar: 'hijri' },
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
    mockUseSettings.mockReturnValue({
      settings: { dateFormat: 'yyyy-MM-dd', decimalPlaces: 2, calendar: 'gregorian' },
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    expect(result.current.calendar).toBe('gregorian');
  });

  it('returns hijri when set', () => {
    mockUseSettings.mockReturnValue({
      settings: { dateFormat: 'yyyy/MM/dd', decimalPlaces: 2, calendar: 'hijri' },
    });
    const { result } = renderHook(() => useFormatters('comp-1'));
    expect(result.current.calendar).toBe('hijri');
  });
});
