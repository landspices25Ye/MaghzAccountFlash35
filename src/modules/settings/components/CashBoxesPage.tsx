import React, { useState } from 'react';
import { Vault, Plus, Pencil, Trash2, CheckSquare } from 'lucide-react';
import { Card, Button, Table, Modal, Input, ConfirmDialog } from '@/core/ui/components';
import { BranchSelect, UserSelect, AccountSelect } from '@/core/ui/components/smart';
import { useCashBoxes } from '@/core/hooks/useSettings';
import { useAppStore } from '@/core/store';
import { useFormatters } from '@/core/utils/useFormatters';
import type { CashBox } from '@/core/types';

export const CashBoxesPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { boxes, isLoading, create, update, remove } = useCashBoxes(activeCompany?.id || '');
  const { formatCurrency } = useFormatters(activeCompany?.id || '');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CashBox>>({ name: '', code: '', currentBalance: 0 });

  const reset = () => {
    setForm({ name: '', code: '', currentBalance: 0 });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.name || !activeCompany?.id) return;
    if (editingId) {
      await update(editingId, form);
    } else {
      await create({ ...form, companyId: activeCompany.id, isActive: true } as Omit<CashBox, 'id'>);
    }
    setIsOpen(false);
    reset();
  };

  const openEdit = (b: CashBox) => {
    setForm({ ...b });
    setEditingId(b.id);
    setIsOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await remove(deleteId);
    setDeleteId(null);
  };

  const columns = [
    { key: 'name', header: 'اسم الصندوق', render: (row: CashBox) => <span className="font-medium">{row.name}</span> },
    { key: 'code', header: 'الرمز', width: '100px', render: (row: CashBox) => <span className="font-mono text-xs">{row.code}</span> },
    { key: 'currentBalance', header: 'الرصيد الحالي', width: '140px', align: 'right' as const, render: (row: CashBox) => <span>{formatCurrency(row.currentBalance)}</span> },
    { key: 'isActive', header: 'نشط', width: '80px', render: (row: CashBox) => <span className={row.isActive ? 'text-emerald-600' : 'text-slate-400'}>{row.isActive ? 'نعم' : 'لا'}</span> },
    { key: 'actions', header: '', width: '130px', render: (row: CashBox) => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => openEdit(row)} leftIcon={<Pencil size={14} />} />
        <Button size="sm" variant="ghost" onClick={() => setDeleteId(row.id)} leftIcon={<Trash2 size={14} className="text-rose-500" />} />
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Vault size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">الصناديق والخزائن</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة صناديق النقدية والخزائن</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { reset(); setIsOpen(true); }}>صندوق جديد</Button>
      </div>

      <Card>
        <Table<CashBox> data={boxes} columns={columns} keyExtractor={(row, i) => row.id || String(i)} isLoading={isLoading} emptyMessage="لا توجد صناديق" />
      </Card>

      {isOpen && (
        <Modal isOpen={isOpen} title={editingId ? 'تعديل الصندوق' : 'صندوق جديد'} onClose={() => setIsOpen(false)} size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="الاسم *" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Input label="الرمز" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} />
              <Input label="الرصيد الافتتاحي" type="number" value={String(form.currentBalance || 0)} onChange={e => setForm({ ...form, currentBalance: Number(e.target.value) })} />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">الحساب المحاسبي</label>
                <AccountSelect companyId={activeCompany?.id || ''} value={form.accountId || ''} onChange={v => setForm({ ...form, accountId: v || undefined })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">الفرع</label>
                <BranchSelect companyId={activeCompany?.id || ''} value={form.branchId || ''} onChange={v => setForm({ ...form, branchId: v || undefined })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">المستخدم المسؤول</label>
                <UserSelect companyId={activeCompany?.id || ''} value={form.responsibleUserId || ''} onChange={v => setForm({ ...form, responsibleUserId: v || undefined })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button onClick={handleSave} leftIcon={<CheckSquare size={16} />}>حفظ</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="حذف الصندوق" message="هل أنت متأكد من حذف هذا الصندوق؟" />
    </div>
  );
};

export default CashBoxesPage;
