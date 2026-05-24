import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { Card, Button, Table } from '@/core/ui/components';
import { usePurchaseInvoices } from '../hooks/usePurchases';
import { useAppStore } from '@/core/store';
import type { PurchaseInvoice } from '../types';

export const PurchaseInvoicesPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { invoices, isLoading } = usePurchaseInvoices(activeCompany?.id || '');

  const columns = [
    { key: 'invoiceNumber', header: 'رقم الفاتورة', width: '120px' },
    { key: 'supplierName', header: 'المورد', render: (row: PurchaseInvoice) => row.supplier?.name || row.supplierId },
    { key: 'date', header: 'التاريخ' },
    { key: 'totalAmount', header: 'الإجمالي', align: 'right' as const, render: (row: PurchaseInvoice) => Number(row.totalAmount).toLocaleString('ar-SA', { minimumFractionDigits: 2 }) },
    { key: 'status', header: 'الحالة', render: (row: PurchaseInvoice) => {
      const labels: Record<string, string> = { draft: 'مسودة', posted: 'مرحلة', paid: 'مدفوعة', partially_paid: 'جزئي', cancelled: 'ملغاة' };
      return labels[row.status] || row.status;
    }},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">فواتير المشتريات</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">فواتير المشتريات من الموردين</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />}>فاتورة جديدة</Button>
      </div>

      <Card>
        <Table<PurchaseInvoice>
          data={invoices}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          isLoading={isLoading}
          emptyMessage="لا توجد فواتير"
        />
      </Card>
    </div>
  );
};

export default PurchaseInvoicesPage;
