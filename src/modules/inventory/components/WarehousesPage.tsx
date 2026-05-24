import React, { useState } from 'react';
import { Warehouse, Plus } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';

interface WarehouseType {
  id: string;
  companyId: string;
  name: string;
  code?: string;
  branchId?: string;
  isActive: boolean;
}

export const WarehousesPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '' });

  const handleSave = () => {
    if (!formData.name) return;
    setWarehouses(prev => [...prev, {
      id: crypto.randomUUID(),
      companyId: '',
      name: formData.name,
      code: formData.code,
      isActive: true,
    }]);
    setIsModalOpen(false);
    setFormData({ name: '', code: '' });
  };

  const columns = [
    { key: 'code', header: 'الرمز' },
    { key: 'name', header: 'الاسم' },
    { key: 'isActive', header: 'الحالة', render: (row: WarehouseType) => row.isActive ? 'نشط' : 'معطل' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Warehouse size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">المستودعات</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة مستودعات المخزون</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>مستودع جديد</Button>
      </div>

      <Card>
        <Table<WarehouseType>
          data={warehouses}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          emptyMessage="لا توجد مستودعات"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="إضافة مستودع"
        size="sm"
        footer={<><Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button><Button variant="primary" onClick={handleSave}>حفظ</Button></>}
      >
        <div className="space-y-4">
          <Input label="الاسم" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
          <Input label="الرمز" value={formData.code} onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
};

export default WarehousesPage;
