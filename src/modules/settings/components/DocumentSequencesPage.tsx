import React, { useState } from 'react';
import { Hash, RotateCcw, Save, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, Button, Table, Input } from '@/core/ui/components';
import { useDocumentSequences } from '@/core/hooks/useSettings';
import { useAppStore } from '@/core/store';
import type { DocumentSequence } from '@/core/types';

const TYPE_LABELS: Record<string, string> = {
  sales_invoice: 'فاتورة مبيعات',
  purchase_invoice: 'فاتورة مشتريات',
  sales_return: 'مردود مبيعات',
  purchase_return: 'مردود مشتريات',
  receipt_voucher: 'سند قبض',
  payment_voucher: 'سند صرف',
  journal_voucher: 'قيد يومي',
  purchase_order: 'أمر شراء',
  quotation: 'عرض سعر',
  work_order: 'أمر إنتاج',
  stock_adjustment: 'تسوية مخزون',
  inventory_transfer: 'تحويل مخزني',
  payroll_run: 'كشف راتب',
};

export const DocumentSequencesPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { sequences, isLoading, update, peekNextNumber } = useDocumentSequences(activeCompany?.id || '');
  const [editing, setEditing] = useState<Record<string, Partial<DocumentSequence>>>({});
  const [previewNumber, setPreviewNumber] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleEdit = (id: string, field: keyof DocumentSequence, value: any) => {
    setEditing(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = async (seq: DocumentSequence) => {
    const changes = editing[seq.id];
    if (!changes) return;
    setSavingId(seq.id);
    await update(seq.id, changes);
    setSavingId(null);
    setEditing(prev => { const n = { ...prev }; delete n[seq.id]; return n; });
  };

  const handlePreview = async (seq: DocumentSequence) => {
    const result = await peekNextNumber(seq.documentType);
    if (result.success && result.number) {
      setPreviewNumber(prev => ({ ...prev, [seq.id]: result.number! }));
    }
  };

  const toggleActive = async (seq: DocumentSequence) => {
    await update(seq.id, { isActive: !seq.isActive });
  };

  const columns = [
    { key: 'documentType', header: 'نوع المستند', width: '160px', render: (row: DocumentSequence) => (
      <div className="flex items-center gap-2">
        <Hash size={14} className="text-primary-500" />
        <span className="font-medium">{TYPE_LABELS[row.documentType] || row.documentType}</span>
      </div>
    )},
    { key: 'prefix', header: 'بادئة', width: '100px', render: (row: DocumentSequence) => (
      <Input size="sm" value={editing[row.id]?.prefix ?? row.prefix} onChange={e => handleEdit(row.id, 'prefix', e.target.value)} className="w-24" />
    )},
    { key: 'suffix', header: 'لاحقة', width: '80px', render: (row: DocumentSequence) => (
      <Input size="sm" value={editing[row.id]?.suffix ?? row.suffix} onChange={e => handleEdit(row.id, 'suffix', e.target.value)} className="w-20" />
    )},
    { key: 'startNumber', header: 'الرقم البداية', width: '100px', render: (row: DocumentSequence) => (
      <Input size="sm" type="number" value={String(editing[row.id]?.startingNumber ?? row.startingNumber)} onChange={e => handleEdit(row.id, 'startingNumber', Number(e.target.value))} className="w-24" />
    )},
    { key: 'currentNumber', header: 'الرقم الحالي', width: '100px', render: (row: DocumentSequence) => (
      <Input size="sm" type="number" value={String(editing[row.id]?.currentNumber ?? row.currentNumber)} onChange={e => handleEdit(row.id, 'currentNumber', Number(e.target.value))} className="w-24" />
    )},
    { key: 'incrementStep', header: 'خطوة الزيادة', width: '100px', render: (row: DocumentSequence) => (
      <Input size="sm" type="number" value={String(editing[row.id]?.incrementStep ?? row.incrementStep)} onChange={e => handleEdit(row.id, 'incrementStep', Number(e.target.value))} className="w-20" />
    )},
    { key: 'paddingLength', header: 'الأصفار', width: '80px', render: (row: DocumentSequence) => (
      <Input size="sm" type="number" value={String(editing[row.id]?.paddingLength ?? row.paddingLength)} onChange={e => handleEdit(row.id, 'paddingLength', Number(e.target.value))} className="w-16" />
    )},
    { key: 'yearReset', header: 'إعادة سنوية', width: '90px', render: (row: DocumentSequence) => (
      <input
        type="checkbox"
        checked={editing[row.id]?.yearReset ?? row.yearReset}
        onChange={e => handleEdit(row.id, 'yearReset', e.target.checked)}
        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
      />
    )},
    { key: 'isActive', header: 'نشط', width: '80px', render: (row: DocumentSequence) => (
      <button onClick={() => toggleActive(row)} className="focus:outline-none" title={row.isActive ? 'إلغاء التفعيل' : 'تفعيل'}>
        {row.isActive ? (
          <ToggleRight size={20} className="text-emerald-500" />
        ) : (
          <ToggleLeft size={20} className="text-slate-400" />
        )}
      </button>
    )},
    { key: 'preview', header: 'معاينة', width: '160px', render: (row: DocumentSequence) => (
      <div className="flex items-center gap-2">
        {previewNumber[row.id] && (
          <span className="text-xs font-mono bg-primary-50 text-primary-700 px-2 py-0.5 rounded border border-primary-100">{previewNumber[row.id]}</span>
        )}
        <Button size="sm" variant="ghost" onClick={() => handlePreview(row)} leftIcon={<Eye size={12} />}>معاينة</Button>
      </div>
    )},
    { key: 'actions', header: '', width: '80px', render: (row: DocumentSequence) => (
      editing[row.id] ? (
        <Button size="sm" variant="secondary" onClick={() => handleSave(row)} isLoading={savingId === row.id} leftIcon={<Save size={12} />}>حفظ</Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => { setEditing({ [row.id]: { ...row } }); }} leftIcon={<RotateCcw size={12} />}>تعديل</Button>
      )
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">الترقيم المتسلسل</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة أرقام المستندات التلقائية لجميع العمليات</p>
        </div>
      </div>
      <Card>
        <Table<DocumentSequence> data={sequences} columns={columns} keyExtractor={(row, i) => row.id || String(i)} isLoading={isLoading} emptyMessage="لا توجد إعدادات ترقيم" />
      </Card>
    </div>
  );
};

export default DocumentSequencesPage;
