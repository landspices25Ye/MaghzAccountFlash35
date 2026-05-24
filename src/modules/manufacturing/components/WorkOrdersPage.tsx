import React, { useState } from 'react';
import { Wrench, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';

interface WorkOrder {
  id: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  plannedStartDate: string;
  plannedEndDate: string;
  totalCost: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'معلقة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

export const WorkOrdersPage: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([
    { id: '1', orderNumber: 'WO-2026-001', productName: 'منتج أ', quantity: 500, status: 'in_progress', plannedStartDate: '2026-06-01', plannedEndDate: '2026-06-15', totalCost: 1250000 },
    { id: '2', orderNumber: 'WO-2026-002', productName: 'منتج ب', quantity: 300, status: 'pending', plannedStartDate: '2026-07-01', plannedEndDate: '2026-07-20', totalCost: 850000 },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [formData, setFormData] = useState({ orderNumber: '', productName: '', quantity: '', plannedStartDate: '', plannedEndDate: '', totalCost: '' });

  const handleSave = () => {
    if (!formData.orderNumber || !formData.productName) return;
    if (editing) {
      setWorkOrders(prev => prev.map(wo => wo.id === editing.id ? {
        ...wo,
        orderNumber: formData.orderNumber,
        productName: formData.productName,
        quantity: Number(formData.quantity) || 0,
        plannedStartDate: formData.plannedStartDate,
        plannedEndDate: formData.plannedEndDate,
        totalCost: Number(formData.totalCost) || 0,
      } : wo));
    } else {
      setWorkOrders(prev => [...prev, {
        id: crypto.randomUUID(),
        orderNumber: formData.orderNumber,
        productName: formData.productName,
        quantity: Number(formData.quantity) || 0,
        status: 'pending',
        plannedStartDate: formData.plannedStartDate,
        plannedEndDate: formData.plannedEndDate,
        totalCost: Number(formData.totalCost) || 0,
      }]);
    }
    setIsModalOpen(false);
    setEditing(null);
    setFormData({ orderNumber: '', productName: '', quantity: '', plannedStartDate: '', plannedEndDate: '', totalCost: '' });
  };

  const handleDelete = (id: string) => {
    setWorkOrders(prev => prev.filter(wo => wo.id !== id));
  };

  const columns = [
    { key: 'orderNumber', header: 'رقم الأمر', width: '120px' },
    { key: 'productName', header: 'المنتج' },
    { key: 'quantity', header: 'الكمية', width: '100px' },
    { key: 'totalCost', header: 'التكلفة', align: 'right' as const, render: (row: WorkOrder) => Number(row.totalCost).toLocaleString('ar-SA') },
    { key: 'status', header: 'الحالة', width: '120px', render: (row: WorkOrder) => (
      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[row.status]}`}>{STATUS_LABELS[row.status]}</span>
    )},
    { key: 'actions', header: '', width: '100px', render: (row: WorkOrder) => (
      <div className="flex gap-1">
        <button onClick={() => { setEditing(row); setFormData({ orderNumber: row.orderNumber, productName: row.productName, quantity: String(row.quantity), plannedStartDate: row.plannedStartDate, plannedEndDate: row.plannedEndDate, totalCost: String(row.totalCost) }); setIsModalOpen(true); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-primary-600">
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
          <Wrench size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">أوامر التشغيل</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة أوامر التشغيل والإنتاج</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { setEditing(null); setFormData({ orderNumber: '', productName: '', quantity: '', plannedStartDate: '', plannedEndDate: '', totalCost: '' }); setIsModalOpen(true); }}>
          أمر تشغيل جديد
        </Button>
      </div>

      <Card>
        <Table<WorkOrder>
          data={workOrders}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          emptyMessage="لا توجد أوامر تشغيل"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'تعديل أمر تشغيل' : 'أمر تشغيل جديد'}
        size="md"
        footer={<><Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button><Button variant="primary" onClick={handleSave}>حفظ</Button></>}
      >
        <div className="space-y-4">
          <Input label="رقم الأمر" value={formData.orderNumber} onChange={e => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))} />
          <Input label="اسم المنتج" value={formData.productName} onChange={e => setFormData(prev => ({ ...prev, productName: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="الكمية" type="number" value={formData.quantity} onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))} />
            <Input label="التكلفة الإجمالية" type="number" value={formData.totalCost} onChange={e => setFormData(prev => ({ ...prev, totalCost: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="تاريخ البداية" type="date" value={formData.plannedStartDate} onChange={e => setFormData(prev => ({ ...prev, plannedStartDate: e.target.value }))} />
            <Input label="تاريخ الانتهاء" type="date" value={formData.plannedEndDate} onChange={e => setFormData(prev => ({ ...prev, plannedEndDate: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WorkOrdersPage;
