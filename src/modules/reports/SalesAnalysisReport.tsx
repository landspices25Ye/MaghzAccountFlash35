import React, { useState, useEffect } from 'react';
import { TrendingUp, FileDown } from 'lucide-react';
import { Card, Button, Table } from '@/core/ui/components';
import { useAppStore } from '@/core/store';
import { getDbAdapter } from '@/core/database/adapters';
import { exportToExcel, exportToPdf } from '@/core/utils/export';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SalesData {
  month: string;
  revenue: number;
  invoiceCount: number;
  avgInvoiceValue: number;
}

interface TopCustomer {
  name: string;
  total: number;
  invoiceCount: number;
}

export const SalesAnalysisReport: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeCompany?.id) return;
    const companyId = activeCompany.id;
    async function load() {
      setIsLoading(true);
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT * FROM sales_invoices WHERE company_id = $1`,
        [companyId]
      );
      const invoices = (result.rows || []) as any[];

      // Monthly breakdown
      const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو'];
      const monthly: Record<string, { revenue: number; count: number }> = {};
      for (const m of months) monthly[m] = { revenue: 0, count: 0 };

      for (const inv of invoices) {
        if (inv.date) {
          const d = new Date(inv.date);
          const m = months[d.getMonth()] || months[0];
          monthly[m].revenue += Number(inv.total || inv.total_amount || 0);
          monthly[m].count += 1;
        }
      }

      const salesRows = months.map(m => ({
        month: m,
        revenue: monthly[m].revenue,
        invoiceCount: monthly[m].count,
        avgInvoiceValue: monthly[m].count > 0 ? Math.floor(monthly[m].revenue / monthly[m].count) : 0,
      }));
      setSalesData(salesRows);

      // Top customers by invoice total
      const custMap: Record<string, { name: string; total: number; count: number }> = {};
      for (const inv of invoices) {
        const cid = inv.customer_id;
        if (!custMap[cid]) {
          const cres = await adapter.query(`SELECT * FROM contacts WHERE id = $1`, [cid]);
          const c = (cres.rows?.[0] || {}) as any;
          custMap[cid] = { name: c.name || 'غير معروف', total: 0, count: 0 };
        }
        custMap[cid].total += Number(inv.total || inv.total_amount || 0);
        custMap[cid].count += 1;
      }
      const top = Object.values(custMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map(c => ({ name: c.name, total: c.total, invoiceCount: c.count }));
      setTopCustomers(top);
      setIsLoading(false);
    }
    load();
  }, [activeCompany?.id]);

  const totalRevenue = salesData.reduce((s, d) => s + d.revenue, 0);
  const totalInvoices = salesData.reduce((s, d) => s + d.invoiceCount, 0);
  const avgInvoice = totalInvoices > 0 ? Math.floor(totalRevenue / totalInvoices) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">تحليل المبيعات</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">تقرير تحليلي شامل لأداء المبيعات</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={() => exportToExcel([...salesData, ...topCustomers], 'Sales_Analysis')}>Excel</Button>
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={() => exportToPdf('sales-print', 'Sales_Analysis', 'تحليل المبيعات')}>PDF</Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي المبيعات</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalRevenue.toLocaleString('ar-SA')} YER</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">عدد الفواتير</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalInvoices}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">متوسط قيمة الفاتورة</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{avgInvoice.toLocaleString('ar-SA')} YER</p>
          </div>
        </Card>
      </div>

      {/* Monthly Chart */}
      <Card>
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">المبيعات الشهرية</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value: any) => Number(value).toLocaleString('ar-SA')} />
                <Bar dataKey="revenue" fill="#3b82f6" name="المبيعات" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Monthly Table */}
      <Card>
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">التفاصيل الشهرية</h3>
          <Table
            data={salesData}
            columns={[
              { key: 'month', header: 'الشهر' },
              { key: 'revenue', header: 'المبيعات', align: 'right', render: (row) => row.revenue.toLocaleString('ar-SA') },
              { key: 'invoiceCount', header: 'عدد الفواتير', align: 'right' },
              { key: 'avgInvoiceValue', header: 'متوسط الفاتورة', align: 'right', render: (row) => row.avgInvoiceValue.toLocaleString('ar-SA') },
            ]}
            keyExtractor={(row) => row.month}
          />
        </div>
      </Card>

      {/* Top Customers */}
      <Card>
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">أفضل 5 عملاء</h3>
          <Table
            data={topCustomers}
            columns={[
              { key: 'name', header: 'العميل' },
              { key: 'total', header: 'إجمالي المبيعات', align: 'right', render: (row) => row.total.toLocaleString('ar-SA') },
              { key: 'invoiceCount', header: 'عدد الفواتير', align: 'right' },
            ]}
            keyExtractor={(row, i) => `${row.name}-${i}`}
          />
        </div>
      </Card>

      {/* Hidden printable */}
      <div id="sales-print" className="hidden">
        <table>
          <thead><tr><th>الشهر</th><th>المبيعات</th><th>الفواتير</th></tr></thead>
          <tbody>
            {salesData.map(row => (
              <tr key={row.month}><td>{row.month}</td><td className="number">{row.revenue.toLocaleString('ar-SA')}</td><td className="number">{row.invoiceCount}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesAnalysisReport;
