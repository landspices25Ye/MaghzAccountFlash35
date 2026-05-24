import { describe, it, expect, vi } from 'vitest';
import { exportToExcel, dataToHtmlTable } from '@/core/utils/export';

describe('export utilities', () => {
  describe('dataToHtmlTable', () => {
    it('converts array of objects to HTML table', () => {
      const data = [
        { name: 'Product A', price: 100 },
        { name: 'Product B', price: 200 },
      ];
      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'price', label: 'Price' },
      ];

      const html = dataToHtmlTable(data, columns);
      expect(html).toContain('<table>');
      expect(html).toContain('Product A');
      expect(html).toContain('١٠٠');
      expect(html).toContain('Product B');
      expect(html).toContain('٢٠٠');
    });

    it('handles empty data', () => {
      const html = dataToHtmlTable([], [{ key: 'name', label: 'Name' }]);
      expect(html).toContain('<p>لا توجد بيانات</p>');
    });

    it('handles null values', () => {
      const data = [{ name: 'Test', value: null }];
      const html = dataToHtmlTable(data, [
        { key: 'name', label: 'Name' },
        { key: 'value', label: 'Value' },
      ]);
      expect(html).toContain('-');
    });

    it('formats numbers with locale', () => {
      const data = [{ amount: 1234567 }];
      const html = dataToHtmlTable(data, [{ key: 'amount', label: 'Amount' }]);
      expect(html).toContain('class="number"');
    });
  });

  describe('exportToExcel', () => {
    it('shows alert when no data', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      exportToExcel([], 'test');
      expect(alertSpy).toHaveBeenCalledWith('لا توجد بيانات للتصدير');
      alertSpy.mockRestore();
    });
  });
});
