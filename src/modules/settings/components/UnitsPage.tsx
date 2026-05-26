import React, { useState } from 'react';
import { Scale, Plus, Pencil, Trash2, CheckSquare } from 'lucide-react';
import { Card, Button, Table, Modal, Input } from '@/core/ui/components';
import { useUnits } from '@/core/hooks/useSettings';
import { useAppStore } from '@/core/store';
import type { Unit } from '@/core/types';

export const UnitsPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { units, isLoading, create, update, remove } = useUnits(activeCompany?.id || '');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Unit>>({ nameAr: '', nameEn: '', code: '', conversionFactor: 1 });

  const reset = () => {
    setForm({ nameAr: '', nameEn: '', code: '', conversionFactor: 1 });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.nameAr || !activeCompany?.id) return;
    if (editingId) {
      await update(editingId, form);
    } else {
      await create({ ...form, companyId: activeCompany.id, isActive: true } as Omit<Unit, 'id'>);
    }
    setIsOpen(false);
    reset();
  };

  const openEdit = (u: Unit) => {
    setForm({ ...u });
    setEditingId(u.id);
    setIsOpen(true);
  };

  const columns = [
    { key: 'nameAr', header: 'الاسم', render: (row: Unit) => <span className="font-medium">{row.nameAr}</span> },
    { key: 'nameEn', header: 'الإنجليزي', render: (row: Unit) => <span className="text-slate-500 text-sm">{row.nameEn}</span> },
    { key: 'code', header: 'الرمز', width: '100px', render: (row: Unit) => <span className="font-mono text-xs">{row.code}</span> },
    { key: 'conversionFactor', header: 'معامل التحويل', width: '120px', render: (row: Unit) => <span>{row.conversionFactor}</span> },
    { key: 'actions', header: '', width: '100px', render: (row: Unit) => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => openEdit(row)} leftIcon={<Pencil size={14} />} />
        <Button size="sm" variant="ghost" onClick={() => remove(row.id)} leftIcon={<Trash2 size={14} className="text-rose-500" />} />
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">وحدات القياس</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة وحدات المنتجات والتحويلات</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { reset(); setIsOpen(true); }}>وحدة جديدة</Button>
      </div>

      <Card>
        <Table<Unit> data={units} columns={columns} keyExtractor={(row, i) => row.id || String(i)} isLoading={isLoading} emptyMessage="لا توجد وحدات" />
      </Card>

      {isOpen && (
        <Modal isOpen={isOpen} title={editingId ? 'تعديل الوحدة' : 'وحدة جديدة'} onClose={() => setIsOpen(false)} size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="الاسم (عربي) *" value={form.nameAr || ''} onChange={e => setForm({ ...form, nameAr: e.target.value })} />
              <Input label="الاسم (إنجليزي)" value={form.nameEn || ''} onChange={e => setForm({ ...form, nameEn: e.target.value })} />
              <Input label="الرمز" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} />
              <Input label="معامل التحويل" type="number" value={String(form.conversionFactor || 1)} onChange={e => setForm({ ...form, conversionFactor: Number(e.target.value) })} />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">الوحدة الأساسية</label>
                <select className="form-control" value={form.baseUnitId || ''} onChange={e => setForm({ ...form, baseUnitId: e.target.value || undefined })}>
                  <option value="">بدون</option>
                  {units.filter(u => u.id !== editingId).map(u => (
                    <option key={u.id} value={u.id}>{u.nameAr} ({u.code})</option>
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

export default UnitsPage;
