import React, { useState } from 'react';
import { Target, Plus } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
// import { useAppStore } from '@/core/store';

interface Lead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  source?: string;
  status: string;
  estimatedValue?: number;
}

export const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', company: '', source: '', estimatedValue: '' });

  const handleSave = () => {
    setLeads(prev => [...prev, {
      id: crypto.randomUUID(),
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      company: formData.company,
      source: formData.source,
      status: 'new',
      estimatedValue: Number(formData.estimatedValue) || undefined,
    }]);
    setIsModalOpen(false);
    setFormData({ name: '', phone: '', email: '', company: '', source: '', estimatedValue: '' });
  };

  const columns = [
    { key: 'name', header: 'الاسم' },
    { key: 'company', header: 'الشركة' },
    { key: 'phone', header: 'الهاتف' },
    { key: 'status', header: 'الحالة', render: (row: Lead) => row.status === 'new' ? 'جديد' : row.status },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">العملاء المحتملين</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة العملاء المحتملين</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>عميل محتمل جديد</Button>
      </div>

      <Card>
        <Table<Lead>
          data={leads}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          emptyMessage="لا يوجد عملاء محتملين"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="إضافة عميل محتلف"
        size="md"
        footer={<><Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button><Button variant="primary" onClick={handleSave}>حفظ</Button></>}
      >
        <div className="space-y-4">
          <Input label="الاسم" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
          <Input label="الشركة" value={formData.company} onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="الهاتف" value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} />
            <Input label="البريد" type="email" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} />
          </div>
          <Input label="المصدر" value={formData.source} onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))} />
          <Input label="القيمة المتوقعة" type="number" value={formData.estimatedValue} onChange={e => setFormData(prev => ({ ...prev, estimatedValue: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
};

export default LeadsPage;
