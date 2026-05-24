import React, { useState } from 'react';
import { Layers, Plus, Pencil, CheckSquare } from 'lucide-react';
import { Card, Button, Table, Modal, Input, Badge } from '@/core/ui/components';
import { AccountSelect } from '@/core/ui/components/smart';
import { useProductTypes } from '@/core/hooks/useSettings';
import { useAppStore } from '@/core/store';
import type { ProductType } from '@/core/types';

export const ProductTypesPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { types, isLoading, create, update } = useProductTypes(activeCompany?.id || '');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ProductType>>({
    nameAr: '', nameEn: '', code: '',
    appearsInSales: true, appearsInPurchases: true, appearsInInventory: true,
    appearsInManufacturing: false, hasStockTracking: true, hasBOM: false,
  });

  const resetForm = () => {
    setForm({ nameAr: '', nameEn: '', code: '', appearsInSales: true, appearsInPurchases: true, appearsInInventory: true, appearsInManufacturing: false, hasStockTracking: true, hasBOM: false });
  };

  const handleSave = async () => {
    if (!form.nameAr || !activeCompany?.id) return;
    if (editingId) {
      await update(editingId, form);
      setEditingId(null);
    } else {
      await create({ ...form, companyId: activeCompany.id, isActive: true } as Omit<ProductType, 'id'>);
    }
    setIsOpen(false);
    resetForm();
  };

  const openEdit = (t: ProductType) => {
    setForm({ ...t });
    setEditingId(t.id);
    setIsOpen(true);
  };

  const boolBadge = (val: boolean) => (
    <Badge className={val ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}>
      {val ? 'نعم' : 'لا'}
    </Badge>
  );

  const columns = [
    { key: 'nameAr', header: 'الاسم', render: (row: ProductType) => <span className="font-medium">{row.nameAr}</span> },
    { key: 'code', header: 'الرمز', width: '80px', render: (row: ProductType) => <span className="font-mono text-xs text-slate-500">{row.code}</span> },
    { key: 'sales', header: 'مبيعات', width: '70px', render: (row: ProductType) => boolBadge(row.appearsInSales) },
    { key: 'purchases', header: 'مشتريات', width: '80px', render: (row: ProductType) => boolBadge(row.appearsInPurchases) },
    { key: 'inventory', header: 'مخزون', width: '70px', render: (row: ProductType) => boolBadge(row.appearsInInventory) },
    { key: 'manufacturing', header: 'تصنيع', width: '70px', render: (row: ProductType) => boolBadge(row.appearsInManufacturing) },
    { key: 'stock', header: 'مخزوني', width: '70px', render: (row: ProductType) => boolBadge(row.hasStockTracking) },
    { key: 'bom', header: 'BOM', width: '60px', render: (row: ProductType) => boolBadge(row.hasBOM) },
    { key: 'actions', header: '', width: '60px', render: (row: ProductType) => (
      <Button size="sm" variant="ghost" onClick={() => openEdit(row)} leftIcon={<Pencil size={14} />} />
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">أنواع المنتجات</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة أنواع المنتجات وقواظ الظهور في العمليات</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { resetForm(); setEditingId(null); setIsOpen(true); }}>نوع جديد</Button>
      </div>

      <Card>
        <Table<ProductType> data={types} columns={columns} keyExtractor={(row, i) => row.id || String(i)} isLoading={isLoading} emptyMessage="لا يوجد أنواع منتجات" />
      </Card>

      {isOpen && (
        <Modal isOpen={isOpen} title={editingId ? 'تعديل نوع المنتج' : 'نوع منتج جديد'} onClose={() => setIsOpen(false)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="الاسم (عربي) *" value={form.nameAr || ''} onChange={e => setForm({ ...form, nameAr: e.target.value })} />
              <Input label="الاسم (إنجليزي)" value={form.nameEn || ''} onChange={e => setForm({ ...form, nameEn: e.target.value })} />
              <Input label="الرمز" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm">قواعد الظهور</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'appearsInSales', label: 'يظهر في المبيعات' },
                  { key: 'appearsInPurchases', label: 'يظهر في المشتريات' },
                  { key: 'appearsInInventory', label: 'يظهر في المخزون' },
                  { key: 'appearsInManufacturing', label: 'يظهر في التصنيع' },
                  { key: 'hasStockTracking', label: 'يتبع المخزون' },
                  { key: 'hasBOM', label: 'يدعم BOM' },
                ].map((field: any) => (
                  <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(form as any)[field.key] ?? false}
                      onChange={e => setForm({ ...form, [field.key]: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm">الحسابات الافتراضية</h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">حساب المبيعات</label>
                  <AccountSelect companyId={activeCompany?.id || ''} value={form.defaultSalesAccountId || ''} onChange={v => setForm({ ...form, defaultSalesAccountId: v || undefined })} size="sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">حساب تكلفة البضاعة</label>
                  <AccountSelect companyId={activeCompany?.id || ''} value={form.defaultCOGSAccountId || ''} onChange={v => setForm({ ...form, defaultCOGSAccountId: v || undefined })} size="sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">حساب المخزون</label>
                  <AccountSelect companyId={activeCompany?.id || ''} value={form.defaultInventoryAccountId || ''} onChange={v => setForm({ ...form, defaultInventoryAccountId: v || undefined })} size="sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button onClick={handleSave} leftIcon={<CheckSquare size={16} />}>{editingId ? 'حفظ التعديلات' : 'إنشاء'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProductTypesPage;
