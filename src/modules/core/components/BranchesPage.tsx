import React, { useState } from 'react';
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';

interface Branch {
  id: string;
  name: string;
  code?: string;
  address?: string;
  isActive: boolean;
}

export const BranchesPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([
    { id: '1', name: 'الفرع الرئيسي - صنعاء', code: 'HQ', address: 'شارع الستين، صنعاء', isActive: true },
    { id: '2', name: 'فرع عدن', code: 'ADN', address: 'خور مكسر، عدن', isActive: true },
    { id: '3', name: 'فرع تعز', code: 'TAZ', address: 'شارع القاهرة، تعز', isActive: true },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', address: '' });

  const handleSave = () => {
    if (!formData.name) return;
    if (editing) {
      setBranches(prev => prev.map(b => b.id === editing.id ? { ...b, ...formData } : b));
    } else {
      setBranches(prev => [...prev, {
        id: crypto.randomUUID(),
        name: formData.name,
        code: formData.code,
        address: formData.address,
        isActive: true,
      }]);
    }
    setIsModalOpen(false);
    setEditing(null);
    setFormData({ name: '', code: '', address: '' });
  };

  const handleDelete = (id: string) => {
    setBranches(prev => prev.filter(b => b.id !== id));
  };

  const columns = [
    { key: 'code', header: 'الرمز', width: '100px' },
    { key: 'name', header: 'الاسم' },
    { key: 'address', header: 'العنوان' },
    { key: 'isActive', header: 'الحالة', width: '100px', render: (row: Branch) => row.isActive ? 'نشط' : 'معطل' },
    { key: 'actions', header: '', width: '120px', render: (row: Branch) => (
      <div className="flex gap-1">
        <button onClick={() => { setEditing(row); setFormData({ name: row.name, code: row.code || '', address: row.address || '' }); setIsModalOpen(true); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-primary-600">
          <Pencil size={14} />
        </button>
        <button onClick={() => handleDelete(row.id)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-danger-600">
          <Trash2 size={14} />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">الفروع</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة فروع المؤسسة</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { setEditing(null); setFormData({ name: '', code: '', address: '' }); setIsModalOpen(true); }}>
          فرع جديد
        </Button>
      </div>

      <Card>
        <Table<Branch>
          data={branches}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          emptyMessage="لا يوجد فروع"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'تعديل فرع' : 'إضافة فرع'}
        size="md"
        footer={<><Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button><Button variant="primary" onClick={handleSave}>حفظ</Button></>}
      >
        <div className="space-y-4">
          <Input label="اسم الفرع" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
          <Input label="الرمز" value={formData.code} onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))} />
          <Input label="العنوان" value={formData.address} onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
};

export default BranchesPage;
