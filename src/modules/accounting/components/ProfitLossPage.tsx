import React, { useState, useEffect } from 'react';
import { BarChart3, FileDown } from 'lucide-react';
import { Card, Button } from '@/core/ui/components';
import { exportToExcel, exportToPdf } from '@/core/utils/export';
import { accountingApi } from '../api';
import { useAppStore } from '@/core/store';
import type { Account } from '../types';

interface PnLRow {
  section: string;
  account: string;
  amount: number;
  isHeader?: boolean;
  isTotal?: boolean;
}

export const ProfitLossReport: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const [pnlData, setPnlData] = useState<PnLRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const formatNumber = (n: number) => Number(Math.abs(n)).toLocaleString('ar-SA', { minimumFractionDigits: 2 });

  useEffect(() => {
    if (!activeCompany?.id) return;
    const companyId = activeCompany.id;
    async function load() {
      setIsLoading(true);
      const result = await accountingApi.getProfitLoss(companyId);
      if (result.success && result.data) {
        const accounts = result.data as Account[];
        const rows: PnLRow[] = [];

        // Revenue section
        const revenues = accounts.filter(a => a.type === 'revenue');
        if (revenues.length > 0) {
          rows.push({ section: 'header', account: 'الإيرادات', amount: 0, isHeader: true });
          let totalRev = 0;
          for (const acc of revenues) {
            const amt = Math.abs(acc.balance);
            rows.push({ section: 'revenue', account: acc.nameAr, amount: amt });
            totalRev += amt;
          }
          rows.push({ section: 'revenue', account: 'إجمالي الإيرادات', amount: totalRev, isTotal: true });
        }

        // Expense section
        const expenses = accounts.filter(a => a.type === 'expense');
        if (expenses.length > 0) {
          rows.push({ section: 'header', account: 'المصروفات', amount: 0, isHeader: true });
          let totalExp = 0;
          for (const acc of expenses) {
            const amt = Math.abs(acc.balance);
            rows.push({ section: 'expense', account: acc.nameAr, amount: amt });
            totalExp += amt;
          }
          rows.push({ section: 'expense', account: 'إجمالي المصروفات', amount: totalExp, isTotal: true });
        }

        // Net Profit
        const totalRevenue = revenues.reduce((s, a) => s + Math.abs(a.balance), 0);
        const totalExpense = expenses.reduce((s, a) => s + Math.abs(a.balance), 0);
        const netProfit = totalRevenue - totalExpense;
        rows.push({ section: 'net', account: 'صافي الربح', amount: netProfit, isTotal: true });

        setPnlData(rows);
      }
      setIsLoading(false);
    }
    load();
  }, [activeCompany?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">قائمة الدخل</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">الفترة: يناير - يونيو 2026</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={() => exportToExcel(pnlData, 'ProfitLoss_Report')}>Excel</Button>
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={() => exportToPdf('pnl-print', 'ProfitLoss_Report', 'قائمة الدخل')}>PDF</Button>
        </div>
      </div>

      <Card>
        <div className="space-y-2">
          {pnlData.map((row, idx) => {
            if (row.isHeader) {
              return <div key={idx} className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2">{row.account}</div>;
            }
            if (row.isTotal && row.section === 'net') {
              return (
                <div key={idx} className="flex justify-between py-3 px-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                  <span className="font-bold text-primary-700 dark:text-primary-300">{row.account}</span>
                  <span className="font-bold text-primary-700 dark:text-primary-300 tabular-nums">{formatNumber(row.amount)}</span>
                </div>
              );
            }
            if (row.isTotal) {
              return (
                <div key={idx} className="flex justify-between py-2 px-4 bg-slate-50 dark:bg-slate-800/50 font-semibold border-t border-slate-200 dark:border-slate-700">
                  <span>{row.account}</span>
                  <span className="tabular-nums">{formatNumber(row.amount)}</span>
                </div>
              );
            }
            return (
              <div key={idx} className="flex justify-between py-1.5 px-4 text-slate-700 dark:text-slate-200">
                <span className={row.section === 'revenue' ? 'text-emerald-600 dark:text-emerald-400' : ''}>{row.account}</span>
                <span className="tabular-nums">{formatNumber(row.amount)}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Hidden printable table */}
      <div id="pnl-print" className="hidden">
        <table>
          <thead>
            <tr><th>البند</th><th>المبلغ</th></tr>
          </thead>
          <tbody>
            {pnlData.map((row, idx) => (
              <tr key={idx} className={row.isTotal ? 'total-row' : ''}>
                <td>{row.account}</td>
                <td className="number">{Number(row.amount).toLocaleString('ar-SA')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProfitLossReport;
