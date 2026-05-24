import React, { useState } from 'react';
import { Package, Plus, Pencil } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { UnitSelect } from '@/core/ui/components/smart';
import { useProducts } from '../hooks/useInventory';
import { useAppStore } from '@/core/store';
import type { Product } from '../types';

export const ProductsPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { products, isLoading, create } = useProducts(activeCompany?.id || '');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ code: '', nameAr: '', nameEn: '', barcode: '', sku: '', unit: 'قطعة', costPrice: '0', salePrice: '0' });

  const handleSave = async () => {
    if (!activeCompany) return;
    await create({
      companyId: activeCompany.id,
      code: formData.code,
      nameAr: formData.nameAr,
      nameEn: formData.nameEn,
      barcode: formData.barcode,
      sku: formData.sku,
      unit: formData.unit,
      costPrice: Number(formData.costPrice),
      salePrice: Number(formData.salePrice),
      isActive: true,
    });
    setIsModalOpen(false);
    setFormData({ code: '', nameAr: '', nameEn: '', barcode: '', sku: '', unit: 'قطعة', costPrice: '0', salePrice: '0' });
  };

  const columns = [
    { key: 'code', header: 'الرمز', width: '100px' },
    { key: 'nameAr', header: 'الاسم' },
    { key: 'unit', header: 'الوحدة', width: '100px' },
    { key: 'costPrice', header: 'سعر التكلفة', align: 'right' as const, render: (row: Product) => Number(row.costPrice).toLocaleString('ar-SA') },
    { key: 'salePrice', header: 'سعر البيع', align: 'right' as const, render: (row: Product) => Number(row.salePrice).toLocaleString('ar-SA') },
    { key: 'actions', header: '', width: '80px', render: () => (
      <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
        <Pencil size={14} />
      </button>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">المنتجات</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة المنتجات والمخزون</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
          منتج جديد
        </Button>
      </div>

      <Card>
        <Table<Product>
          data={products}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          isLoading={isLoading}
          emptyMessage="لا توجد منتجات"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="إضافة منتج جديد"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button variant="primary" onClick={handleSave}>حفظ</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="الرمز" value={formData.code} onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">الوحدة</label>
              <UnitSelect companyId={activeCompany?.id || ''} value={formData.unit} onChange={v => setFormData(prev => ({ ...prev, unit: v || 'قطعة' }))} size="sm" />
            </div>
          </div>
          <Input label="الاسم (عربي)" value={formData.nameAr} onChange={e => setFormData(prev => ({ ...prev, nameAr: e.target.value }))} />
          <Input label="الاسم (إنجليزي)" value={formData.nameEn} onChange={e => setFormData(prev => ({ ...prev, nameEn: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="الباركود" value={formData.barcode} onChange={e => setFormData(prev => ({ ...prev, barcode: e.target.value }))} />
            <Input label="SKU" value={formData.sku} onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="سعر التكلفة" type="number" value={formData.costPrice} onChange={e => setFormData(prev => ({ ...prev, costPrice: e.target.value }))} />
            <Input label="سعر البيع" type="number" value={formData.salePrice} onChange={e => setFormData(prev => ({ ...prev, salePrice: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductsPage;
