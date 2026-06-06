import React, { useState, useEffect, useMemo } from 'react';
import { Truck, FileDown, Filter, RotateCcw } from 'lucide-react';
import { Card, Button, Table } from '@/core/ui/components';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { useAppStore } from '@/core/store';
import { getDbAdapter } from '@/core/database/adapters';
import { exportToExcel, exportToPDF } from '@/core/utils/exportEngine';
import { useTranslation } from '@/core/i18n/useTranslation';
import { formatCurrency } from '@/core/utils';
import { aggregateSupplierAging, computeAgingTotals, todayIso, AGING_BUCKETS } from '@/core/utils/aging';

export const SupplierStatementReport: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore((state) => state.activeCompany);
  const [suppliers, setSuppliers] = useState<ReturnType<typeof aggregateSupplierAging>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [asOfDate, setAsOfDate] = useState<string>(todayIso());

  useEffect(() => {
    if (!activeCompany?.id) return;
    const companyId = activeCompany.id;
    async function load() {
      setIsLoading(true);
      const adapter = await getDbAdapter();
      const contactsResult = await adapter.getContacts(companyId, 'supplier');
      const contacts = (contactsResult.data || []) as Array<{ id: string; name: string; phone?: string; balance?: number }>;

      const params: unknown[] = [companyId];
      let invQuery = `SELECT supplier_id, invoice_number, date, due_date,
                              (total_amount - COALESCE(paid_amount, 0)) AS outstanding
                         FROM purchase_invoices
                        WHERE company_id = $1
                          AND status != 'cancelled'
                          AND (total_amount - COALESCE(paid_amount, 0)) > 0`;
      if (fromDate) { invQuery += ` AND date >= $${params.length + 1}`; params.push(fromDate); }
      if (toDate) { invQuery += ` AND date <= $${params.length + 1}`; params.push(toDate); }
      const invResult = await adapter.query(invQuery, params);
      const rows = (invResult.rows || []) as Array<{ supplier_id: string; invoice_number: string; date: string; due_date: string | null; outstanding: number }>;
      const aged = aggregateSupplierAging(
        rows.map((r) => ({ supplier_id: r.supplier_id, date: r.date, due_date: r.due_date, outstanding: r.outstanding, invoice_number: r.invoice_number })),
        asOfDate,
        contacts.map((c) => ({ id: c.id, name: c.name, phone: c.phone || '', balance: c.balance || 0 })),
      );
      setSuppliers(aged);
      setIsLoading(false);
    }
    load();
  }, [activeCompany?.id, fromDate, toDate, asOfDate]);

  const totals = useMemo(() => computeAgingTotals(suppliers), [suppliers]);

  const handleExportExcel = async () => {
    const cols = [
      { key: 'supplier', header: 'المورد' },
      { key: 'phone', header: 'الهاتف' },
      { key: 'bucket0to30', header: '0-30 يوم' },
      { key: 'bucket31to60', header: '31-60 يوم' },
      { key: 'bucket61to90', header: '61-90 يوم' },
      { key: 'bucket90plus', header: '+90 يوم' },
      { key: 'totalOutstanding', header: 'الإجمالي' },
      { key: 'invoiceCount', header: 'الفواتير' },
    ];
    await exportToExcel(suppliers, cols, 'Supplier_Aging');
  };

  const handleExportPDF = async () => {
    const cols = [
      { key: 'supplier', header: 'المورد', width: 25 },
      { key: 'phone', header: 'الهاتف', width: 15 },
      { key: 'totalOutstanding', header: 'الإجمالي', width: 15 },
    ];
    await exportToPDF(suppliers, cols, 'Supplier_Aging', {
      title: t('reports.supplierStatement'),
      subtitle: activeCompany?.name,
      rtl: true,
    });
  };

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!suppliers.length) {
    return (
      <EmptyState
        icon="search"
        title="لا يوجد موردين"
        description="لم يتم العثور على موردين ضمن الفلاتر المحددة"
        action={
          <Button variant="secondary" onClick={clearFilters} leftIcon={<RotateCcw size={16} />}>
            مسح الفلاتر
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Truck size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('reports.supplierStatement')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">أرصدة الموردين وتوزيع أعمار الالتزامات</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<Filter size={16} />} onClick={() => setShowFilters((s) => !s)}>
            {t('reports.filter')}
          </Button>
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={handleExportExcel}>
            Excel
          </Button>
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={handleExportPDF}>
            PDF
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card>
          <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('reports.fromDate')}</label>
              <input type="date" className="w-full px-2 py-1.5 text-sm border rounded-md dark:bg-slate-900 dark:border-slate-600" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('reports.toDate')}</label>
              <input type="date" className="w-full px-2 py-1.5 text-sm border rounded-md dark:bg-slate-900 dark:border-slate-600" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">تاريخ الاستحقاق المرجعي</label>
              <input type="date" className="w-full px-2 py-1.5 text-sm border rounded-md dark:bg-slate-900 dark:border-slate-600" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value || todayIso())} />
            </div>
            <div className="flex items-end">
              <Button variant="ghost" size="sm" leftIcon={<RotateCcw size={14} />} onClick={clearFilters}>
                {t('reports.clearFilter')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي المستحق</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totals.totalOutstanding)}</p>
          </div>
        </Card>
        {AGING_BUCKETS.map((bucket, i) => {
          const total = i === 0 ? totals.total0to30 : i === 1 ? totals.total31to60 : i === 2 ? totals.total61to90 : totals.total90plus;
          const count = i === 0 ? totals.count0to30 : i === 1 ? totals.count31to60 : i === 2 ? totals.count61to90 : totals.count90plus;
          const color = i === 0 ? 'emerald' : i === 1 ? 'amber' : i === 2 ? 'orange' : 'rose';
          return (
            <Card key={bucket.label}>
              <div className="p-4 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">{bucket.label} يوم</p>
                <p className={`text-xl font-bold text-${color}-600 dark:text-${color}-400`}>{formatCurrency(total)}</p>
                <p className="text-xs text-slate-400 mt-1">{count} مورد</p>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">توزيع أعمار الالتزامات لكل مورد</h3>
          <Table
            data={suppliers}
            columns={[
              { key: 'supplier', header: 'المورد' },
              { key: 'phone', header: 'الهاتف' },
              { key: 'bucket0to30', header: '0-30', align: 'right', render: (row) => formatCurrency(row.bucket0to30) },
              { key: 'bucket31to60', header: '31-60', align: 'right', render: (row) => formatCurrency(row.bucket31to60) },
              { key: 'bucket61to90', header: '61-90', align: 'right', render: (row) => formatCurrency(row.bucket61to90) },
              { key: 'bucket90plus', header: '90+', align: 'right', render: (row) => formatCurrency(row.bucket90plus) },
              { key: 'totalOutstanding', header: 'الإجمالي', align: 'right', render: (row) => <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(row.totalOutstanding)}</span> },
              { key: 'invoiceCount', header: 'فواتير', align: 'right' },
            ]}
            keyExtractor={(row) => row.supplierId}
          />
        </div>
      </Card>
    </div>
  );
};

export default SupplierStatementReport;
