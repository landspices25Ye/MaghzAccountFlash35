import React from 'react';
import { Banknote, FileDown } from 'lucide-react';
import { Card, Button } from '@/core/ui/components';
import { exportToExcel, exportToPdf } from '@/core/utils/export';

interface CFRow {
  activity: string;
  amount: number;
  isHeader?: boolean;
  isTotal?: boolean;
}

const operating: CFRow[] = [
  { activity: 'صافي الربح', amount: 697000 },
  { activity: 'الإهلاك', amount: 320000 },
  { activity: 'التغير في العملاء', amount: -180000 },
  { activity: 'التغير في المخزون', amount: -95000 },
  { activity: 'التغير في الموردين', amount: 120000 },
  { activity: 'صافي التدفق النقدي من العمليات', amount: 862000, isTotal: true },
];

const investing: CFRow[] = [
  { activity: 'شراء أصول ثابتة', amount: -450000 },
  { activity: 'صافي التدفق النقدي من الاستثمار', amount: -450000, isTotal: true },
];

const financing: CFRow[] = [
  { activity: 'سداد قرض', amount: -200000 },
  { activity: 'صافي التدفق النقدي من التمويل', amount: -200000, isTotal: true },
];

export const CashFlowReport: React.FC = () => {
  const formatNumber = (n: number) => Number(Math.abs(n)).toLocaleString('ar-SA', { minimumFractionDigits: 2 });

  const renderRows = (rows: CFRow[]) => (
    <div className="space-y-1">
      {rows.map((row, idx) => {
        if (row.isTotal) {
          return (
            <div key={idx} className="flex justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800/50 font-semibold border-t border-slate-200 dark:border-slate-700">
              <span>{row.activity}</span>
              <span className={`tabular-nums ${row.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {row.amount >= 0 ? '+' : '-'}{formatNumber(row.amount)}
              </span>
            </div>
          );
        }
        return (
          <div key={idx} className="flex justify-between py-1 px-3 text-slate-600 dark:text-slate-300">
            <span>{row.activity}</span>
            <span className={`tabular-nums ${row.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {row.amount >= 0 ? '+' : '-'}{formatNumber(row.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Banknote size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">التدفقات النقدية</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">الفترة: يناير - يونيو 2026</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={() => exportToExcel([...operating, ...investing, ...financing], 'CashFlow_Report')}>Excel</Button>
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={() => exportToPdf('cf-print', 'CashFlow_Report', 'التدفقات النقدية')}>PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <h3 className="font-bold text-lg text-emerald-700 dark:text-emerald-300 mb-4">العمليات التشغيلية</h3>
          {renderRows(operating)}
        </Card>
        <Card>
          <h3 className="font-bold text-lg text-blue-700 dark:text-blue-300 mb-4">الاستثمار</h3>
          {renderRows(investing)}
        </Card>
        <Card>
          <h3 className="font-bold text-lg text-purple-700 dark:text-purple-300 mb-4">التمويل</h3>
          {renderRows(financing)}
        </Card>
      </div>

      <Card>
        <div className="flex justify-between py-3 px-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
          <span className="font-bold text-primary-700 dark:text-primary-300">صافي التغير في النقدية</span>
          <span className="font-bold text-primary-700 dark:text-primary-300 tabular-nums">+212,000</span>
        </div>
      </Card>

      {/* Hidden printable table */}
      <div id="cf-print" className="hidden">
        <table>
          <thead><tr><th>النشاط</th><th>المبلغ</th></tr></thead>
          <tbody>
            {[...operating, ...investing, ...financing].map((row, idx) => (
              <tr key={idx} className={row.isTotal ? 'total-row' : ''}>
                <td>{row.activity}</td>
                <td className="number">{Number(row.amount).toLocaleString('ar-SA')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashFlowReport;
