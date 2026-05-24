import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { Card, Button, Table } from '@/core/ui/components';
import { useInvoices } from '../hooks/useSales';
import { useAppStore } from '@/core/store';
import type { SalesInvoice } from '../types';

export const InvoicesPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { invoices, isLoading } = useInvoices(activeCompany?.id || '');

  const columns = [
    { key: 'invoiceNumber', header: 'رقم الفاتورة', width: '120px' },
    { key: 'customerName', header: 'العميل', render: (row: SalesInvoice) => row.customer?.name || row.customerId },
    { key: 'date', header: 'التاريخ' },
    { key: 'totalAmount', header: 'الإجمالي', align: 'right' as const, render: (row: SalesInvoice) => 
      Number(row.totalAmount).toLocaleString('ar-SA', { minimumFractionDigits: 2 })
    },
    { key: 'status', header: 'الحالة', render: (row: SalesInvoice) => {
      const statusLabels: Record<string, string> = {
        draft: 'مسودة',
        posted: 'مرحلة',
        paid: 'مدفوعة',
        partially_paid: 'مدفوعة جزئياً',
        cancelled: 'ملغاة',
      };
      return statusLabels[row.status] || row.status;
    }},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">فواتير المبيعات</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة فواتير المبيعات والضريبة</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />}>
          فاتورة جديدة
        </Button>
      </div>

      <Card>
        <Table<SalesInvoice>
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

export default InvoicesPage;
