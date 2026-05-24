import React, { useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';

interface Employee {
  id: string;
  employeeNumber: string;
  fullName: string;
  position?: string;
  department?: string;
  hireDate: string;
  baseSalary: number;
  isActive: boolean;
}

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ employeeNumber: '', fullName: '', position: '', department: '', hireDate: '', baseSalary: '' });

  const handleSave = () => {
    setEmployees(prev => [...prev, {
      id: crypto.randomUUID(),
      employeeNumber: formData.employeeNumber,
      fullName: formData.fullName,
      position: formData.position,
      department: formData.department,
      hireDate: formData.hireDate,
      baseSalary: Number(formData.baseSalary) || 0,
      isActive: true,
    }]);
    setIsModalOpen(false);
    setFormData({ employeeNumber: '', fullName: '', position: '', department: '', hireDate: '', baseSalary: '' });
  };

  const columns = [
    { key: 'employeeNumber', header: 'الرقم الوظيفي' },
    { key: 'fullName', header: 'الاسم' },
    { key: 'position', header: 'المنصب' },
    { key: 'department', header: 'القسم' },
    { key: 'baseSalary', header: 'الراتب الأساسي', align: 'right' as const, render: (row: Employee) => Number(row.baseSalary).toLocaleString('ar-SA') },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">الموظفين</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">سجلات الموظفين</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>موظف جديد</Button>
      </div>

      <Card>
        <Table<Employee>
          data={employees}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          emptyMessage="لا يوجد موظفين"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="إضافة موظف"
        size="md"
        footer={<><Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button><Button variant="primary" onClick={handleSave}>حفظ</Button></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="الرقم الوظيفي" value={formData.employeeNumber} onChange={e => setFormData(prev => ({ ...prev, employeeNumber: e.target.value }))} />
            <Input label="الاسم الكامل" value={formData.fullName} onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="المنصب" value={formData.position} onChange={e => setFormData(prev => ({ ...prev, position: e.target.value }))} />
            <Input label="القسم" value={formData.department} onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="تاريخ التعيين" type="date" value={formData.hireDate} onChange={e => setFormData(prev => ({ ...prev, hireDate: e.target.value }))} />
            <Input label="الراتب الأساسي" type="number" value={formData.baseSalary} onChange={e => setFormData(prev => ({ ...prev, baseSalary: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeesPage;
