import React, { useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { useCustomers } from '../hooks/useSales';
import { useAppStore } from '@/core/store';
import type { Customer } from '../types';

export const CustomersPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { customers, isLoading, create } = useCustomers(activeCompany?.id || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', taxNumber: '' });

  const handleSave = async () => {
    if (!activeCompany) return;
    await create({
      companyId: activeCompany.id,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      taxNumber: formData.taxNumber,
      balance: 0,
      isActive: true,
    });
    setIsModalOpen(false);
    setFormData({ name: '', phone: '', email: '', address: '', taxNumber: '' });
  };

  const columns = [
    { key: 'name', header: 'الاسم' },
    { key: 'phone', header: 'الهاتف' },
    { key: 'email', header: 'البريد' },
    { key: 'balance', header: 'الرصيد', align: 'right' as const, render: (row: Customer) => 
      Number(row.balance).toLocaleString('ar-SA', { minimumFractionDigits: 2 })
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">العملاء</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة بيانات العملاء</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
          عميل جديد
        </Button>
      </div>

      <Card>
        <Table<Customer>
          data={customers}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          isLoading={isLoading}
          emptyMessage="لا يوجد عملاء"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="إضافة عميل جديد"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button variant="primary" onClick={handleSave}>حفظ</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="الاسم" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
          <Input label="الهاتف" value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} />
          <Input label="البريد الإلكتروني" type="email" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} />
          <Input label="العنوان" value={formData.address} onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))} />
          <Input label="الرقم الضريبي" value={formData.taxNumber} onChange={e => setFormData(prev => ({ ...prev, taxNumber: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
};

export default CustomersPage;
