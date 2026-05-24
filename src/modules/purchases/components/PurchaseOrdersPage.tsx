import React, { useState } from 'react';
import { ClipboardList, Plus, CheckSquare, Trash2 } from 'lucide-react';
import { Card, Button, Table, Modal, Input, Badge } from '@/core/ui/components';
import { usePurchaseOrders } from '../hooks/usePurchases';
import { useAppStore } from '@/core/store';
import type { PurchaseOrder } from '../types';

interface OrderLine {
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export const PurchaseOrdersPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { orders, isLoading, create } = usePurchaseOrders(activeCompany?.id || '');
  const [isOpen, setIsOpen] = useState(false);
  const [lines, setLines] = useState<OrderLine[]>([{ productName: '', quantity: 1, unitPrice: 0, total: 0 }]);
  const [header, setHeader] = useState({ supplier: '', date: new Date().toISOString().split('T')[0], expectedDate: '', notes: '' });

  const addLine = () => setLines([...lines, { productName: '', quantity: 1, unitPrice: 0, total: 0 }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof OrderLine, value: any) => {
    const newLines = [...lines];
    newLines[idx] = { ...newLines[idx], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      newLines[idx].total = newLines[idx].quantity * newLines[idx].unitPrice;
    }
    setLines(newLines);
  };

  const total = lines.reduce((s, l) => s + l.total, 0);

  const handleCreate = async () => {
    if (!header.supplier || !activeCompany?.id) return;
    const orderNumber = `PO-2024-${String(orders.length + 1).padStart(4, '0')}`;
    const newOrder: Omit<PurchaseOrder, 'id'> = {
      companyId: activeCompany.id,
      orderNumber,
      supplierId: header.supplier,
      date: header.date,
      expectedDate: header.expectedDate || undefined,
      totalAmount: total,
      status: 'draft',
      notes: header.notes,
    };
    await create(newOrder);
    setIsOpen(false);
    setLines([{ productName: '', quantity: 1, unitPrice: 0, total: 0 }]);
    setHeader({ supplier: '', date: new Date().toISOString().split('T')[0], expectedDate: '', notes: '' });
  };

  const statusLabels: Record<string, string> = {
    draft: 'مسودة',
    sent: 'مرسل',
    partially_received: 'مستلم جزئياً',
    received: 'مستلم كلياً',
    cancelled: 'ملغاة',
  };
  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    sent: 'bg-blue-100 text-blue-700',
    partially_received: 'bg-amber-100 text-amber-700',
    received: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-rose-100 text-rose-700',
  };

  const columns = [
    { key: 'orderNumber', header: 'رقم الأمر', width: '120px' },
    { key: 'supplierName', header: 'المورد', render: (row: PurchaseOrder) => row.supplier?.name || row.supplierId },
    { key: 'date', header: 'التاريخ' },
    { key: 'expectedDate', header: 'التوقع', render: (row: PurchaseOrder) => row.expectedDate || '-' },
    { key: 'totalAmount', header: 'الإجمالي', align: 'right' as const, render: (row: PurchaseOrder) => Number(row.totalAmount).toLocaleString('ar-SA') },
    { key: 'status', header: 'الحالة', render: (row: PurchaseOrder) => (
      <Badge className={statusColors[row.status] || 'bg-slate-100'}>{statusLabels[row.status] || row.status}</Badge>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">أوامر الشراء</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة أوامر الشراء من الموردين</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsOpen(true)}>أمر شراء جديد</Button>
      </div>

      <Card>
        <Table<PurchaseOrder> data={orders} columns={columns} keyExtractor={(row, i) => row.id || String(i)} isLoading={isLoading} emptyMessage="لا توجد أوامر شراء" />
      </Card>

      {isOpen && (
        <Modal isOpen={isOpen} title="أمر شراء جديد" onClose={() => setIsOpen(false)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="المورد" value={header.supplier} onChange={e => setHeader({ ...header, supplier: e.target.value })} />
              <Input label="تاريخ التوقع" type="date" value={header.expectedDate} onChange={e => setHeader({ ...header, expectedDate: e.target.value })} />
            </div>
            <Input label="التاريخ" type="date" value={header.date} onChange={e => setHeader({ ...header, date: e.target.value })} />
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-sm">سطور الأمر</h4>
                <Button size="sm" variant="secondary" onClick={addLine} leftIcon={<Plus size={14} />}>إضافة سطر</Button>
              </div>
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4"><Input placeholder="اسم المنتج" value={line.productName} onChange={e => updateLine(idx, 'productName', e.target.value)} /></div>
                  <div className="col-span-2"><Input type="number" placeholder="الكمية" value={String(line.quantity)} onChange={e => updateLine(idx, 'quantity', Number(e.target.value))} /></div>
                  <div className="col-span-3"><Input type="number" placeholder="السعر" value={String(line.unitPrice)} onChange={e => updateLine(idx, 'unitPrice', Number(e.target.value))} /></div>
                  <div className="col-span-2 text-sm font-medium text-slate-700 dark:text-slate-200">{(line.quantity * line.unitPrice).toLocaleString('ar-SA')}</div>
                  <div className="col-span-1"><Button size="sm" variant="ghost" onClick={() => removeLine(idx)} leftIcon={<Trash2 size={14} className="text-rose-500" />} /></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">ملاحظات:</span>
              <Input value={header.notes} onChange={e => setHeader({ ...header, notes: e.target.value })} placeholder="ملاحظات إضافية" />
            </div>
            <div className="flex justify-end text-lg font-bold text-primary-600">
              الإجمالي: {total.toLocaleString('ar-SA')}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button onClick={handleCreate} leftIcon={<CheckSquare size={16} />}>حفظ أمر الشراء</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PurchaseOrdersPage;
