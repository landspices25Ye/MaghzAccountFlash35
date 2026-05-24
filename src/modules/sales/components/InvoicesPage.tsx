import React, { useState } from 'react';
import { FileText, Plus, BookOpen, CheckSquare, Trash2, Printer } from 'lucide-react';
import { printDocument } from '@/core/utils/printDocument';
import { Card, Button, Table, Badge, Modal, Input } from '@/core/ui/components';
import { CustomerSelect, ProductSelect } from '@/core/ui/components/smart';
import { useInvoices } from '../hooks/useSales';
import { useAppStore } from '@/core/store';
import { postSalesInvoice } from '@/core/utils/journalEntryGenerator';
import type { SalesInvoice } from '../types';

interface InvoiceLine {
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export const InvoicesPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { invoices, isLoading, create } = useInvoices(activeCompany?.id || '');
  const [postingId, setPostingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [lines, setLines] = useState<InvoiceLine[]>([{ productName: '', quantity: 1, unitPrice: 0, total: 0 }]);
  const [header, setHeader] = useState({ customer: '', date: new Date().toISOString().split('T')[0], vatRate: 5 });

  const addLine = () => setLines([...lines, { productName: '', quantity: 1, unitPrice: 0, total: 0 }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof InvoiceLine, value: any) => {
    const newLines = [...lines];
    newLines[idx] = { ...newLines[idx], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      newLines[idx].total = newLines[idx].quantity * newLines[idx].unitPrice;
    }
    setLines(newLines);
  };

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const vatAmount = Math.floor(subtotal * (header.vatRate / 100));
  const total = subtotal + vatAmount;

  const handleCreate = async () => {
    if (!header.customer || lines.length === 0 || !activeCompany?.id) return;
    const invNumber = `INV-2024-${String(invoices.length + 1).padStart(4, '0')}`;
    const newInvoice: Omit<SalesInvoice, 'id'> = {
      companyId: activeCompany.id,
      invoiceNumber: invNumber,
      customerId: header.customer,
      date: header.date,
      dueDate: header.date,
      subtotal,
      discountAmount: 0,
      vatAmount,
      totalAmount: total,
      paidAmount: 0,
      status: 'draft',
      notes: '',
      lines: lines.map(l => ({ productId: l.productName, quantity: l.quantity, unitPrice: l.unitPrice, discountPercent: 0, vatPercent: header.vatRate, lineTotal: l.total })),
    };
    await create(newInvoice);
    setIsOpen(false);
    setLines([{ productName: '', quantity: 1, unitPrice: 0, total: 0 }]);
    setHeader({ customer: '', date: new Date().toISOString().split('T')[0], vatRate: 5 });
  };

  const handlePrint = (invoice: SalesInvoice) => {
    printDocument({
      type: 'sales-invoice',
      docNumber: invoice.invoiceNumber,
      date: invoice.date,
      dueDate: invoice.dueDate,
      partyName: invoice.customer?.name || invoice.customerId,
      partyLabel: 'العميل',
      lines: invoice.lines.map(l => ({
        description: l.productName || l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        total: l.lineTotal,
      })),
      subtotal: invoice.subtotal,
      vatAmount: invoice.vatAmount,
      totalAmount: invoice.totalAmount,
      notes: invoice.notes,
      companyName: activeCompany?.name,
      currency: activeCompany?.currency,
    });
  };

  const handlePost = async (invoice: SalesInvoice) => {
    if (!activeCompany?.id) return;
    setPostingId(invoice.id);
    const result = await postSalesInvoice(activeCompany.id, {
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date,
      customerId: invoice.customerId,
      subtotal: invoice.subtotal,
      vatAmount: invoice.vatAmount,
      totalAmount: invoice.totalAmount,
    });
    setPostingId(null);
    if (result.success) {
      alert(`تم ترحيل الفاتورة ${invoice.invoiceNumber} وتوليد القيد اليومي بنجاح!`);
    } else {
      alert(`فشل الترحيل: ${result.error}`);
    }
  };

  const columns = [
    { key: 'invoiceNumber', header: 'رقم الفاتورة', width: '120px' },
    { key: 'customerName', header: 'العميل', render: (row: SalesInvoice) => row.customer?.name || row.customerId },
    { key: 'date', header: 'التاريخ' },
    { key: 'subtotal', header: 'المجموع', align: 'right' as const, render: (row: SalesInvoice) => Number(row.subtotal).toLocaleString('ar-SA') },
    { key: 'vatAmount', header: 'الضريبة', align: 'right' as const, render: (row: SalesInvoice) => Number(row.vatAmount).toLocaleString('ar-SA') },
    { key: 'totalAmount', header: 'الإجمالي', align: 'right' as const, render: (row: SalesInvoice) => Number(row.totalAmount).toLocaleString('ar-SA', { minimumFractionDigits: 2 }) },
    { key: 'status', header: 'الحالة', render: (row: SalesInvoice) => {
      const statusLabels: Record<string, string> = { draft: 'مسودة', posted: 'مرحّلة', paid: 'مدفوعة', partially_paid: 'مدفوعة جزئياً', cancelled: 'ملغاة' };
      const colors: Record<string, string> = { draft: 'bg-slate-100 text-slate-600', posted: 'bg-emerald-100 text-emerald-700', paid: 'bg-blue-100 text-blue-700', partially_paid: 'bg-amber-100 text-amber-700', cancelled: 'bg-rose-100 text-rose-700' };
      return <Badge className={colors[row.status] || 'bg-slate-100'}>{statusLabels[row.status] || row.status}</Badge>;
    }},
    { key: 'actions', header: 'إجراء', render: (row: SalesInvoice) => (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" leftIcon={<Printer size={14} />} onClick={() => handlePrint(row)} title="طباعة" />
        {row.status === 'draft' ? (
          <Button size="sm" variant="secondary" leftIcon={<CheckSquare size={14} />} onClick={() => handlePost(row)} disabled={postingId === row.id}>
            {postingId === row.id ? 'جارٍ الترحيل...' : 'ترحيل'}
          </Button>
        ) : <span className="text-xs text-slate-400 flex items-center gap-1"><BookOpen size={12} /> مرحّل</span>}
      </div>
    )},
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
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsOpen(true)}>فاتورة جديدة</Button>
      </div>

      <Card>
        <Table<SalesInvoice> data={invoices} columns={columns} keyExtractor={(row, i) => row.id || String(i)} isLoading={isLoading} emptyMessage="لا توجد فواتير" />
      </Card>

      {isOpen && (
        <Modal isOpen={isOpen} title="فاتورة مبيعات جديدة" onClose={() => setIsOpen(false)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">العميل</label>
                <CustomerSelect companyId={activeCompany?.id || ''} value={header.customer} onChange={v => setHeader({ ...header, customer: v || '' })} />
              </div>
              <Input label="التاريخ" type="date" value={header.date} onChange={e => setHeader({ ...header, date: e.target.value })} />
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-sm">سطور الفاتورة</h4>
                <Button size="sm" variant="secondary" onClick={addLine} leftIcon={<Plus size={14} />}>إضافة سطر</Button>
              </div>
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <ProductSelect companyId={activeCompany?.id || ''} value={line.productName} onChange={v => updateLine(idx, 'productName', v || '')} size="sm" />
                  </div>
                  <div className="col-span-2"><Input type="number" placeholder="الكمية" value={String(line.quantity)} onChange={e => updateLine(idx, 'quantity', Number(e.target.value))} /></div>
                  <div className="col-span-3"><Input type="number" placeholder="السعر" value={String(line.unitPrice)} onChange={e => updateLine(idx, 'unitPrice', Number(e.target.value))} /></div>
                  <div className="col-span-2 text-sm font-medium text-slate-700 dark:text-slate-200">{(line.quantity * line.unitPrice).toLocaleString('ar-SA')}</div>
                  <div className="col-span-1"><Button size="sm" variant="ghost" onClick={() => removeLine(idx)} leftIcon={<Trash2 size={14} className="text-rose-500" />} /></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">الضريبة: {header.vatRate}%</span>
              <div className="space-y-1 text-end">
                <p>المجموع: <strong>{subtotal.toLocaleString('ar-SA')}</strong></p>
                <p>الضريبة: <strong>{vatAmount.toLocaleString('ar-SA')}</strong></p>
                <p className="text-lg font-bold text-primary-600">الإجمالي: {total.toLocaleString('ar-SA')}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button onClick={handleCreate} leftIcon={<CheckSquare size={16} />}>حفظ الفاتورة</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InvoicesPage;
