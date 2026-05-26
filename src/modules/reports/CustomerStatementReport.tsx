import React, { useState, useEffect } from 'react';
import { Users, FileDown, Filter, RotateCcw } from 'lucide-react';
import { Card, Button, Table } from '@/core/ui/components';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { useAppStore } from '@/core/store';
import { getDbAdapter } from '@/core/database/adapters';
import { exportToExcel, exportToPDF } from '@/core/utils/exportEngine';
import { useTranslation } from '@/core/i18n/useTranslation';
import { formatCurrency } from '@/core/utils';

interface CustomerLine {
  customerId: string;
  customer: string;
  phone: string;
  balance: number;
  invoiceCount: number;
  totalSales: number;
  lastInvoice: string;
}

export const CustomerStatementReport: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore((state) => state.activeCompany);
  const [customers, setCustomers] = useState<CustomerLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!activeCompany?.id) return;
    const companyId = activeCompany.id;
    async function load() {
      setIsLoading(true);
      const adapter = await getDbAdapter();
      const contactsResult = await adapter.getContacts(companyId, 'customer');
      const contacts = (contactsResult.data || []) as Record<string, unknown>[];

      const rows: CustomerLine[] = [];
      for (const c of contacts) {
        let query = `SELECT * FROM sales_invoices WHERE customer_id = $1`;
        const params: unknown[] = [c.id];
        if (fromDate) {
          query += ` AND date >= $${params.length + 1}`;
          params.push(fromDate);
        }
        if (toDate) {
          query += ` AND date <= $${params.length + 1}`;
          params.push(toDate);
        }
        query += ` ORDER BY date DESC`;
        const invResult = await adapter.query(query, params);
        const invoices = (invResult.rows || []) as Record<string, unknown>[];
        const totalSales = invoices.reduce((s, i) => s + Number(i.total || i.total_amount || 0), 0);
        rows.push({
          customerId: String(c.id || ''),
          customer: String(c.name || ''),
          phone: String(c.phone || ''),
          balance: Number(c.balance || 0),
          invoiceCount: invoices.length,
          totalSales,
          lastInvoice: String(invoices[0]?.date || '-'),
        });
      }
      setCustomers(rows.sort((a, b) => b.balance - a.balance));
      setIsLoading(false);
    }
    load();
  }, [activeCompany?.id, fromDate, toDate]);

  const totalBalance = customers.reduce((s, c) => s + c.balance, 0);
  const totalSales = customers.reduce((s, c) => s + c.totalSales, 0);

  const handleExportExcel = async () => {
    const cols = [
      { key: 'customer', header: 'العميل' },
      { key: 'phone', header: 'الهاتف' },
      { key: 'balance', header: 'الرصيد' },
      { key: 'invoiceCount', header: 'الفواتير' },
      { key: 'totalSales', header: 'إجمالي المبيعات' },
      { key: 'lastInvoice', header: 'آخر فاتورة' },
    ];
    await exportToExcel(customers, cols, 'Customer_Statement');
  };

  const handleExportPDF = async () => {
    const cols = [
      { key: 'customer', header: 'العميل', width: 25 },
      { key: 'phone', header: 'الهاتف', width: 15 },
      { key: 'balance', header: 'الرصيد', width: 15 },
      { key: 'totalSales', header: 'المبيعات', width: 15 },
    ];
    await exportToPDF(customers, cols, 'Customer_Statement', {
      title: t('reports.customerStatement'),
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

  if (!customers.length) {
    return (
      <EmptyState
        icon="search"
        title="لا يوجد عملاء"
        description="لم يتم العثور على عملاء ضمن الفلاتر المحددة"
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
          <Users size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('reports.customerStatement')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">أرصدة العملاء والمبيعات</p>
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
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('reports.fromDate')}</label>
              <input type="date" className="w-full px-2 py-1.5 text-sm border rounded-md dark:bg-slate-900 dark:border-slate-600" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('reports.toDate')}</label>
              <input type="date" className="w-full px-2 py-1.5 text-sm border rounded-md dark:bg-slate-900 dark:border-slate-600" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="ghost" size="sm" leftIcon={<RotateCcw size={14} />} onClick={clearFilters}>
                {t('reports.clearFilter')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('sales.customer.totalBalance')}</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totalBalance)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('reports.totalSales')}</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalSales)}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4">
          <Table
            data={customers}
            columns={[
              { key: 'customer', header: 'العميل' },
              { key: 'phone', header: 'الهاتف' },
              { key: 'balance', header: 'الرصيد', align: 'right', render: (row) => formatCurrency(row.balance) },
              { key: 'invoiceCount', header: 'الفواتير', align: 'right' },
              { key: 'totalSales', header: 'إجمالي المبيعات', align: 'right', render: (row) => formatCurrency(row.totalSales) },
              { key: 'lastInvoice', header: 'آخر فاتورة' },
            ]}
            keyExtractor={(row) => row.customerId}
          />
        </div>
      </Card>
    </div>
  );
};

export default CustomerStatementReport;
