import React, { useState, useEffect } from 'react';
import { Scale, FileDown, Calendar } from 'lucide-react';
import { Card, Button, Input } from '@/core/ui/components';
import { useAppStore } from '@/core/store';
import { useTranslation } from '@/core/i18n/useTranslation';
import { accountingApi } from '../api';
import { exportToExcel, exportToPDF } from '@/core/utils/exportEngine';
import { useFormatters } from '@/core/utils/useFormatters';
import type { Account } from '../types';

interface BSRow {
  account: string;
  accountId: string;
  amount: number;
  isHeader?: boolean;
  isTotal?: boolean;
}

export const BalanceSheetReport: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore(state => state.activeCompany);
  const { formatCurrency } = useFormatters(activeCompany?.id || '');
  const [assets, setAssets] = useState<BSRow[]>([]);
  const [liabilities, setLiabilities] = useState<BSRow[]>([]);
  const [equity, setEquity] = useState<BSRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!activeCompany?.id) return;
    const companyId = activeCompany.id;
    async function load() {
      setIsLoading(true);
      const result = await accountingApi.getBalanceSheet(companyId, asOfDate || undefined);
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
              rows.push({ account: acc.nameAr, accountId: acc.id, amount: Math.abs(acc.balance) });
              total += Math.abs(acc.balance);
            }
          }
          if (total > 0) {
            rows.push({ account: 'الإجمالي', accountId: '', amount: total, isTotal: true });
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
  }, [activeCompany?.id, asOfDate]);

  const allRows = [...assets, ...liabilities, ...equity];

  const handleExportExcel = () => {
    exportToExcel(allRows.map(r => ({ البند: r.account, المبلغ: r.amount })), [
      { key: 'البند', header: 'البند', width: 40 },
      { key: 'المبلغ', header: 'المبلغ', width: 15 },
    ], 'BalanceSheet');
  };

  const handleExportPDF = () => {
    exportToPDF(allRows.map(r => ({ item: r.account, amount: r.amount })), [
      { key: 'item', header: 'البند' },
      { key: 'amount', header: 'المبلغ' },
    ], 'BalanceSheet', {
      title: t('accounting.balanceSheet'),
      subtitle: activeCompany?.name,
      rtl: true,
    });
  };

  const renderRows = (rows: BSRow[]) => (
    <div className="space-y-1">
      {rows.map((row, idx) => {
        if (row.isTotal) {
          return (
            <div key={idx} className="flex justify-between py-1.5 px-3 font-semibold border-t border-slate-200 dark:border-slate-700">
              <span>{row.account}</span>
              <span className="tabular-nums">{formatCurrency(row.amount)}</span>
            </div>
          );
        }
        return (
          <a 
            key={idx} 
            href={`/accounting/ledger?accountId=${row.accountId}`}
            className="flex justify-between py-1 px-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded transition-colors"
          >
            <span>{row.account}</span>
            <span className="tabular-nums">{formatCurrency(row.amount)}</span>
          </a>
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('accounting.balanceSheet')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {asOfDate ? `تاريخ: ${asOfDate}` : 'تاريخ: اليوم'}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Input label={t('accounting.toDate')} type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setAsOfDate('')}>{t('cancel')}</Button>
              <Button onClick={() => setShowFilters(false)}>{t('accounting.applyFilter')}</Button>
            </div>
          </div>
        </Card>
      )}

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
    </div>
  );
};

export default BalanceSheetReport;
