import React, { useState, useEffect } from 'react';
import { Scale, FileDown } from 'lucide-react';
import { Card, Button } from '@/core/ui/components';
import { exportToExcel, exportToPdf } from '@/core/utils/export';
import { accountingApi } from '../api';
import { useAppStore } from '@/core/store';
import type { Account } from '../types';

interface BSRow {
  account: string;
  amount: number;
  isHeader?: boolean;
  isTotal?: boolean;
}

export const BalanceSheetReport: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const [assets, setAssets] = useState<BSRow[]>([]);
  const [liabilities, setLiabilities] = useState<BSRow[]>([]);
  const [equity, setEquity] = useState<BSRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const formatNumber = (n: number) => Number(n).toLocaleString('ar-SA', { minimumFractionDigits: 2 });

  useEffect(() => {
    if (!activeCompany?.id) return;
    const companyId = activeCompany.id;
    async function load() {
      setIsLoading(true);
      const result = await accountingApi.getBalanceSheet(companyId);
      if (result.success && result.data) {
        const accounts = result.data as Account[];

        const assetAccs = accounts.filter(a => a.type === 'asset');
        const liabilityAccs = accounts.filter(a => a.type === 'liability');
        const equityAccs = accounts.filter(a => a.type === 'equity');

        const buildRows = (accs: Account[]): BSRow[] => {
          const rows: BSRow[] = [];
          let total = 0;
          for (const acc of accs) {
            if (Math.abs(acc.balance) > 0) {
              rows.push({ account: acc.nameAr, amount: Math.abs(acc.balance) });
              total += Math.abs(acc.balance);
            }
          }
          if (total > 0) {
            rows.push({ account: 'الإجمالي', amount: total, isTotal: true });
          }
          return rows;
        };

        setAssets(buildRows(assetAccs));
        setLiabilities(buildRows(liabilityAccs));
        setEquity(buildRows(equityAccs));
      }
      setIsLoading(false);
    }
    load();
  }, [activeCompany?.id]);

  const allRows = [...assets, ...liabilities, ...equity];

  const renderRows = (rows: BSRow[]) => (
    <div className="space-y-1">
      {rows.map((row, idx) => {
        if (row.isTotal) {
          return (
            <div key={idx} className="flex justify-between py-1.5 px-3 font-semibold border-t border-slate-200 dark:border-slate-700">
              <span>{row.account}</span>
              <span className="tabular-nums">{formatNumber(row.amount)}</span>
            </div>
          );
        }
        return (
          <div key={idx} className="flex justify-between py-1 px-3 text-slate-600 dark:text-slate-300">
            <span>{row.account}</span>
            <span className="tabular-nums">{formatNumber(row.amount)}</span>
          </div>
        );
      })}
    </div>
  );

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
          <Scale size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">الميزانية العمومية</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">تاريخ: 30 يونيو 2026</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={() => exportToExcel(allRows, 'BalanceSheet_Report')}>Excel</Button>
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={() => exportToPdf('bs-print', 'BalanceSheet_Report', 'الميزانية العمومية')}>PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50 mb-4">الأصول</h3>
          {renderRows(assets)}
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50 mb-4">الالتزامات</h3>
            {renderRows(liabilities)}
          </Card>
          <Card>
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50 mb-4">حقوق الملكية</h3>
            {renderRows(equity)}
          </Card>
        </div>
      </div>

      {/* Hidden printable table */}
      <div id="bs-print" className="hidden">
        <table>
          <thead><tr><th>البند</th><th>المبلغ</th></tr></thead>
          <tbody>
            {allRows.map((row, idx) => (
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

export default BalanceSheetReport;
