import React, { useState } from 'react';
import { Target, Plus, Pencil, CheckSquare } from 'lucide-react';
import { Card, Button, Table, Modal, Input } from '@/core/ui/components';
import { useCostCenters } from '@/core/hooks/useSettings';
import { useAppStore } from '@/core/store';
import { useFormatters } from '@/core/utils/useFormatters';
import type { CostCenter } from '@/core/types';

export const CostCentersPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { centers, isLoading, create, update } = useCostCenters(activeCompany?.id || '');
  const { formatCurrency } = useFormatters(activeCompany?.id || '');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CostCenter>>({ nameAr: '', nameEn: '', code: '', type: 'department', budgetAmount: 0 });

  const reset = () => {
    setForm({ nameAr: '', nameEn: '', code: '', type: 'department', budgetAmount: 0 });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.nameAr || !activeCompany?.id) return;
    if (editingId) {
      await update(editingId, form);
    } else {
      await create({ ...form, companyId: activeCompany.id, isActive: true } as Omit<CostCenter, 'id'>);
    }
    setIsOpen(false);
    reset();
  };

  const openEdit = (c: CostCenter) => {
    setForm({ ...c });
    setEditingId(c.id);
    setIsOpen(true);
  };

  const columns = [
    { key: 'nameAr', header: 'الاسم', render: (row: CostCenter) => <span className="font-medium">{row.nameAr}</span> },
    { key: 'nameEn', header: 'الإنجليزي', render: (row: CostCenter) => <span className="text-slate-500 text-sm">{row.nameEn}</span> },
    { key: 'code', header: 'الرمز', width: '100px', render: (row: CostCenter) => <span className="font-mono text-xs">{row.code}</span> },
    { key: 'type', header: 'النوع', width: '120px', render: (row: CostCenter) => <span>{row.type === 'department' ? 'قسم' : row.type === 'project' ? 'مشروع' : row.type === 'branch' ? 'فرع' : row.type}</span> },
    { key: 'budgetAmount', header: 'الميزانية', width: '140px', align: 'right' as const, render: (row: CostCenter) => <span>{formatCurrency(row.budgetAmount)}</span> },
    { key: 'isActive', header: 'نشط', width: '80px', render: (row: CostCenter) => <span className={row.isActive ? 'text-emerald-600' : 'text-slate-400'}>{row.isActive ? 'نعم' : 'لا'}</span> },
    { key: 'actions', header: '', width: '100px', render: (row: CostCenter) => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => openEdit(row)} leftIcon={<Pencil size={14} />} />
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">مراكز التكلفة</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة الأقسام والمشاريع والفروع كمراكز تكلفة</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { reset(); setIsOpen(true); }}>مركز جديد</Button>
      </div>

      <Card>
        <Table<CostCenter> data={centers} columns={columns} keyExtractor={(row, i) => row.id || String(i)} isLoading={isLoading} emptyMessage="لا توجد مراكز تكلفة" />
      </Card>

      {isOpen && (
        <Modal isOpen={isOpen} title={editingId ? 'تعديل المركز' : 'مركز تكلفة جديد'} onClose={() => setIsOpen(false)} size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="الاسم (عربي) *" value={form.nameAr || ''} onChange={e => setForm({ ...form, nameAr: e.target.value })} />
              <Input label="الاسم (إنجليزي)" value={form.nameEn || ''} onChange={e => setForm({ ...form, nameEn: e.target.value })} />
              <Input label="الرمز" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">النوع</label>
                <select className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="department">قسم</option>
                  <option value="project">مشروع</option>
                  <option value="branch">فرع</option>
                </select>
              </div>
              <Input label="الميزانية" type="number" value={String(form.budgetAmount || 0)} onChange={e => setForm({ ...form, budgetAmount: Number(e.target.value) })} />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">مركز التكلفة الأب</label>
                <select className="form-control" value={form.parentId || ''} onChange={e => setForm({ ...form, parentId: e.target.value || undefined })}>
                  <option value="">بدون (مركز رئيسي)</option>
                  {centers.filter(c => c.id !== editingId).map(c => (
                    <option key={c.id} value={c.id}>{c.nameAr} ({c.code})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button onClick={handleSave} leftIcon={<CheckSquare size={16} />}>حفظ</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CostCentersPage;
