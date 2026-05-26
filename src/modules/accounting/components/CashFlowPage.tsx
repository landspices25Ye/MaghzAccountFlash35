import React, { useState, useEffect } from 'react';
import { Banknote, FileDown, Calendar } from 'lucide-react';
import { Card, Button, Input } from '@/core/ui/components';
import { useAppStore } from '@/core/store';
import { useTranslation } from '@/core/i18n/useTranslation';
import { accountingApi } from '../api';
import { salesApi } from '@/modules/sales/api';
import { purchasesApi } from '@/modules/purchases/api';
import { exportToExcel } from '@/core/utils/exportEngine';
import { exportToPdf } from '@/core/utils/export';
import type { Account } from '../types';
import { useFormatters } from '@/core/utils/useFormatters';

interface CFRow {
  activity: string;
  amount: number;
  isTotal?: boolean;
}

export const CashFlowReport: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore(state => state.activeCompany);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [operating, setOperating] = useState<CFRow[]>([]);
  const [investing, setInvesting] = useState<CFRow[]>([]);
  const [financing, setFinancing] = useState<CFRow[]>([]);
  const [netChange, setNetChange] = useState(0);
  const { formatCurrency } = useFormatters(activeCompany?.id || '');

  const formatNumber = (n: number) => formatCurrency(Math.abs(n));

  useEffect(() => {
    if (!activeCompany?.id) return;
    
    async function load() {
      setIsLoading(true);
      const companyId = activeCompany!.id;
      
      // Get profit/loss data
      const plResult = await accountingApi.getProfitLoss(companyId, startDate || undefined, endDate || undefined);
      const bsResult = await accountingApi.getBalanceSheet(companyId, endDate || undefined);
      const arResult = await salesApi.getCustomerArAging(companyId);
      // Get all suppliers for AP aging
      const suppliersResult = await purchasesApi.getSuppliers(companyId);
      let apTotal = 0;
      if (suppliersResult.success && suppliersResult.data) {
        for (const s of suppliersResult.data) {
          const apResult = await purchasesApi.getApAging(s.id, companyId);
          if (apResult.data) {
            apTotal += apResult.data.reduce((sum, b) => sum + b.amount, 0);
          }
        }
      }
      
      // Calculate net profit
      let netProfit = 0;
      if (plResult.success && plResult.data) {
        const accounts = plResult.data as Account[];
        const revenue = accounts.filter(a => a.type === 'revenue').reduce((s, a) => s + Math.abs(a.balance), 0);
        const expense = accounts.filter(a => a.type === 'expense').reduce((s, a) => s + Math.abs(a.balance), 0);
        netProfit = revenue - expense;
      }
      
      // Calculate changes in receivables/payables
      const arChange = arResult.data?.reduce((s, c) => s + (c.totalDue || 0), 0) || 0;
      const apChange = apTotal;
      
      // Build operating section
      const ops: CFRow[] = [];
      if (netProfit !== 0) ops.push({ activity: 'صافي الربح', amount: netProfit });
      
      // Get depreciation (approximate from expense accounts with depreciation in name)
      if (plResult.success && plResult.data) {
        const accounts = plResult.data as Account[];
        const depreciationAcc = accounts.find(a => a.nameAr?.includes('إهلاك') || a.nameAr?.includes('اهلاك'));
        if (depreciationAcc) ops.push({ activity: 'الإهلاك', amount: Math.abs(depreciationAcc.balance) });
      }
      
      if (arChange !== 0) ops.push({ activity: 'التغير في العملاء', amount: -arChange });
      if (apChange !== 0) ops.push({ activity: 'التغير في الموردين', amount: apChange });
      
      // Inventory change (approximate)
      let inventoryChange = 0;
      if (bsResult.success && bsResult.data) {
        const accounts = bsResult.data as Account[];
        const inventoryAcc = accounts.find(a => a.nameAr?.includes('مخزون') || a.nameAr?.includes('مخزن'));
        if (inventoryAcc) inventoryChange = inventoryAcc.balance;
      }
      if (inventoryChange !== 0) ops.push({ activity: 'التغير في المخزون', amount: -inventoryChange });
      
      const opsTotal = ops.reduce((s, r) => s + r.amount, 0);
      if (ops.length > 0) ops.push({ activity: 'صافي التدفق النقدي من العمليات', amount: opsTotal, isTotal: true });
      setOperating(ops);
      
      // Investing section (fixed assets)
      const inv: CFRow[] = [];
      if (bsResult.success && bsResult.data) {
        const accounts = bsResult.data as Account[];
        const fixedAssets = accounts.filter(a => a.type === 'asset' && (a.nameAr?.includes('أصول ثابتة') || a.nameAr?.includes('أصول') || a.nameAr?.includes('عقار')));
        const faTotal = fixedAssets.reduce((s, a) => s + Math.abs(a.balance), 0);
        if (faTotal > 0) inv.push({ activity: 'شراء أصول ثابتة', amount: -faTotal });
      }
      const invTotal = inv.reduce((s, r) => s + r.amount, 0);
      if (inv.length > 0) inv.push({ activity: 'صافي التدفق النقدي من الاستثمار', amount: invTotal, isTotal: true });
      setInvesting(inv);
      
      // Financing section (loans, equity)
      const fin: CFRow[] = [];
      if (bsResult.success && bsResult.data) {
        const accounts = bsResult.data as Account[];
        const loans = accounts.filter(a => a.type === 'liability' && (a.nameAr?.includes('قرض') || a.nameAr?.includes('التزام')));
        const equity = accounts.filter(a => a.type === 'equity');
        const loanTotal = loans.reduce((s, a) => s + a.balance, 0);
        const equityTotal = equity.reduce((s, a) => s + a.balance, 0);
        if (loanTotal !== 0) fin.push({ activity: 'سداد قرض / قروض جديدة', amount: loanTotal });
        if (equityTotal !== 0) fin.push({ activity: 'مساهمات رأس المال', amount: equityTotal });
      }
      const finTotal = fin.reduce((s, r) => s + r.amount, 0);
      if (fin.length > 0) fin.push({ activity: 'صافي التدفق النقدي من التمويل', amount: finTotal, isTotal: true });
      setFinancing(fin);
      
      setNetChange(opsTotal + invTotal + finTotal);
      setIsLoading(false);
    }
    
    load();
  }, [activeCompany?.id, startDate, endDate]);

  const allRows = [...operating, ...investing, ...financing];

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
          <Banknote size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">التدفقات النقدية</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {startDate && endDate ? `الفترة: ${startDate} - ${endDate}` : 'الفترة: الكل'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Calendar size={14} />} onClick={() => setShowFilters(!showFilters)}>
            {t('filter')}
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<FileDown size={14} />} onClick={() => exportToExcel(allRows.map(r => ({ النشاط: r.activity, المبلغ: r.amount })), [
            { key: 'النشاط', header: 'النشاط', width: 40 },
            { key: 'المبلغ', header: 'المبلغ', width: 15 },
          ], 'CashFlow_Report')}>Excel</Button>
          <Button variant="secondary" size="sm" leftIcon={<FileDown size={14} />} onClick={() => exportToPdf('cf-print', 'CashFlow_Report', 'التدفقات النقدية')}>PDF</Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <h3 className="font-bold text-lg text-emerald-700 dark:text-emerald-300 mb-4">العمليات التشغيلية</h3>
          {operating.length > 0 ? renderRows(operating) : <p className="text-slate-400 text-center py-4">لا توجد بيانات</p>}
        </Card>
        <Card>
          <h3 className="font-bold text-lg text-blue-700 dark:text-blue-300 mb-4">الاستثمار</h3>
          {investing.length > 0 ? renderRows(investing) : <p className="text-slate-400 text-center py-4">لا توجد بيانات</p>}
        </Card>
        <Card>
          <h3 className="font-bold text-lg text-purple-700 dark:text-purple-300 mb-4">التمويل</h3>
          {financing.length > 0 ? renderRows(financing) : <p className="text-slate-400 text-center py-4">لا توجد بيانات</p>}
        </Card>
      </div>

      <Card>
        <div className="flex justify-between py-3 px-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
          <span className="font-bold text-primary-700 dark:text-primary-300">صافي التغير في النقدية</span>
          <span className={`font-bold tabular-nums ${netChange >= 0 ? 'text-primary-700 dark:text-primary-300' : 'text-rose-600'}`}>
            {netChange >= 0 ? '+' : '-'}{formatNumber(netChange)}
          </span>
        </div>
      </Card>

      {/* Hidden printable table */}
      <div id="cf-print" className="hidden">
        <table>
          <thead><tr><th>النشاط</th><th>المبلغ</th></tr></thead>
          <tbody>
            {allRows.map((row, idx) => (
              <tr key={idx} className={row.isTotal ? 'total-row' : ''}>
                <td>{row.activity}</td>
                <td className="number">{formatCurrency(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashFlowReport;
