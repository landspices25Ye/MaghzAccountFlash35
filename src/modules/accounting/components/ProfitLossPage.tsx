import React, { useState, useEffect } from 'react';
import { BarChart3, FileDown, Calendar } from 'lucide-react';
import { Card, Button, Input } from '@/core/ui/components';
import { useAppStore } from '@/core/store';
import { useTranslation } from '@/core/i18n/useTranslation';
import { accountingApi } from '../api';
import { exportToExcel, exportToPDF } from '@/core/utils/exportEngine';
import type { Account } from '../types';

interface PnLRow {
  section: string;
  account: string;
  accountId: string;
  amount: number;
  isHeader?: boolean;
  isTotal?: boolean;
}

export const ProfitLossReport: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore(state => state.activeCompany);
  const [pnlData, setPnlData] = useState<PnLRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const formatNumber = (n: number) => Number(Math.abs(n)).toLocaleString('ar-SA', { minimumFractionDigits: 2 });

  useEffect(() => {
    if (!activeCompany?.id) return;
    const companyId = activeCompany.id;
    async function load() {
      setIsLoading(true);
      const result = await accountingApi.getProfitLoss(companyId, startDate || undefined, endDate || undefined);
      if (result.success && result.data) {
        const accounts = result.data as Account[];
        const rows: PnLRow[] = [];

        const revenues = accounts.filter(a => a.type === 'revenue');
        if (revenues.length > 0) {
          rows.push({ section: 'header', account: 'الإيرادات', accountId: '', amount: 0, isHeader: true });
          let totalRev = 0;
          for (const acc of revenues) {
            const amt = Math.abs(acc.balance);
            rows.push({ section: 'revenue', account: acc.nameAr, accountId: acc.id, amount: amt });
            totalRev += amt;
          }
          rows.push({ section: 'revenue', account: 'إجمالي الإيرادات', accountId: '', amount: totalRev, isTotal: true });
        }

        const expenses = accounts.filter(a => a.type === 'expense');
        if (expenses.length > 0) {
          rows.push({ section: 'header', account: 'المصروفات', accountId: '', amount: 0, isHeader: true });
          let totalExp = 0;
          for (const acc of expenses) {
            const amt = Math.abs(acc.balance);
            rows.push({ section: 'expense', account: acc.nameAr, accountId: acc.id, amount: amt });
            totalExp += amt;
          }
          rows.push({ section: 'expense', account: 'إجمالي المصروفات', accountId: '', amount: totalExp, isTotal: true });
        }

        const totalRevenue = revenues.reduce((s, a) => s + Math.abs(a.balance), 0);
        const totalExpense = expenses.reduce((s, a) => s + Math.abs(a.balance), 0);
        const netProfit = totalRevenue - totalExpense;
        rows.push({ section: 'net', account: 'صافي الربح', accountId: '', amount: netProfit, isTotal: true });

        setPnlData(rows);
      }
      setIsLoading(false);
    }
    load();
  }, [activeCompany?.id, startDate, endDate]);

  const handleExportExcel = () => {
    exportToExcel(pnlData.map(r => ({ البند: r.account, المبلغ: r.amount })), [
      { key: 'البند', header: 'البند', width: 40 },
      { key: 'المبلغ', header: 'المبلغ', width: 15 },
    ], 'ProfitLoss');
  };

  const handleExportPDF = () => {
    exportToPDF(pnlData.map(r => ({ item: r.account, amount: r.amount })), [
      { key: 'item', header: 'البند' },
      { key: 'amount', header: 'المبلغ' },
    ], 'ProfitLoss', {
      title: t('accounting.profitLoss'),
      subtitle: activeCompany?.name,
      rtl: true,
    });
  };

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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('accounting.profitLoss')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {startDate && endDate ? `الفترة: ${startDate} - ${endDate}` : 'الفترة: الكل'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Calendar size={14} />} onClick={() => setShowFilters(!showFilters)}>
            {t('filter')}
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<FileDown size={14} />} onClick={handleExportExcel}>Excel</Button>
          <Button variant="secondary" size="sm" leftIcon={<FileDown size={14} />} onClick={handleExportPDF}>PDF</Button>
        </div>
      </div>

      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <Input label={t('accounting.fromDate')} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <Input label={t('accounting.toDate')} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { setStartDate(''); setEndDate(''); }}>{t('cancel')}</Button>
              <Button onClick={() => setShowFilters(false)}>{t('accounting.applyFilter')}</Button>
            </div>
          </div>
        </Card>
      )}

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
              <a 
                key={idx} 
                href={`/accounting/ledger?accountId=${row.accountId}`}
                className="flex justify-between py-1.5 px-4 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded transition-colors"
              >
                <span className={row.section === 'revenue' ? 'text-emerald-600 dark:text-emerald-400' : ''}>{row.account}</span>
                <span className="tabular-nums">{formatNumber(row.amount)}</span>
              </a>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default ProfitLossReport;
