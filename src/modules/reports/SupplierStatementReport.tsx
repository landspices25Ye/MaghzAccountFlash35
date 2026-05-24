import React, { useState, useEffect } from 'react';
import { Truck, FileDown } from 'lucide-react';
import { Card, Button, Table } from '@/core/ui/components';
import { useAppStore } from '@/core/store';
import { getDbAdapter } from '@/core/database/adapters';
import { exportToExcel, exportToPdf } from '@/core/utils/export';

interface SupplierLine {
  supplier: string;
  phone: string;
  balance: number;
  invoiceCount: number;
  totalPurchases: number;
  lastInvoice: string;
}

export const SupplierStatementReport: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const [suppliers, setSuppliers] = useState<SupplierLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeCompany?.id) return;
    const companyId = activeCompany.id;
    async function load() {
      setIsLoading(true);
      const adapter = await getDbAdapter();
      const contactsResult = await adapter.getContacts(companyId, 'supplier');
      const contacts = (contactsResult.data || []) as any[];

      const rows: SupplierLine[] = [];
      for (const c of contacts) {
        const invResult = await adapter.query(
          `SELECT * FROM purchase_invoices WHERE supplier_id = $1 ORDER BY date DESC`,
          [c.id]
        );
        const invoices = (invResult.rows || []) as any[];
        const totalPurchases = invoices.reduce((s, i) => s + Number(i.total || i.total_amount || 0), 0);
        rows.push({
          supplier: c.name,
          phone: c.phone,
          balance: Number(c.balance || 0),
          invoiceCount: invoices.length,
          totalPurchases,
          lastInvoice: invoices[0]?.date || '-',
        });
      }
      setSuppliers(rows.sort((a, b) => b.balance - a.balance));
      setIsLoading(false);
    }
    load();
  }, [activeCompany?.id]);

  const totalBalance = suppliers.reduce((s, c) => s + c.balance, 0);
  const totalPurchases = suppliers.reduce((s, c) => s + c.totalPurchases, 0);

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
          <Truck size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">كشف حساب الموردين</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">أرصدة الموردين والمشتريات</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={() => exportToExcel(suppliers, 'Supplier_Statement')}>Excel</Button>
          <Button variant="secondary" leftIcon={<FileDown size={16} />} onClick={() => exportToPdf('sup-print', 'Supplier_Statement', 'كشف حساب الموردين')}>PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي التزامات الموردين</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{totalBalance.toLocaleString('ar-SA')} YER</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي المشتريات</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalPurchases.toLocaleString('ar-SA')} YER</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4">
          <Table
            data={suppliers}
            columns={[
              { key: 'supplier', header: 'المورد' },
              { key: 'phone', header: 'الهاتف' },
              { key: 'balance', header: 'الرصيد', align: 'right', render: (row) => row.balance.toLocaleString('ar-SA') },
              { key: 'invoiceCount', header: 'الفواتير', align: 'right' },
              { key: 'totalPurchases', header: 'إجمالي المشتريات', align: 'right', render: (row) => row.totalPurchases.toLocaleString('ar-SA') },
              { key: 'lastInvoice', header: 'آخر فاتورة' },
            ]}
            keyExtractor={(row) => row.supplier}
          />
        </div>
      </Card>

      <div id="sup-print" className="hidden">
        <table>
          <thead><tr><th>المورد</th><th>الرصيد</th><th>المشتريات</th></tr></thead>
          <tbody>
            {suppliers.map(row => (
              <tr key={row.supplier}><td>{row.supplier}</td><td className="number">{row.balance.toLocaleString('ar-SA')}</td><td className="number">{row.totalPurchases.toLocaleString('ar-SA')}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupplierStatementReport;
