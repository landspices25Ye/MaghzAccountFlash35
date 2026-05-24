import React, { useState } from 'react';
import { CheckSquare, Plus, User } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'cancelled';
  assignedTo?: string;
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'عالي',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-rose-100 text-rose-700',
};

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'متابعة العميل المحتمل أحمد', dueDate: '2026-07-05', priority: 'high', status: 'pending', assignedTo: 'خالد' },
    { id: '2', title: 'إعداد عرض سعر لمؤسسة النور', dueDate: '2026-07-03', priority: 'medium', status: 'pending', assignedTo: 'محمد' },
    { id: '3', title: 'تحديث بيانات العملاء', dueDate: '2026-06-28', priority: 'low', status: 'completed', assignedTo: 'أحمد' },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', dueDate: '', priority: 'medium' as Task['priority'], assignedTo: '' });

  const handleSave = () => {
    if (!formData.title) return;
    setTasks(prev => [...prev, {
      id: crypto.randomUUID(),
      title: formData.title,
      description: formData.description,
      dueDate: formData.dueDate,
      priority: formData.priority,
      status: 'pending',
      assignedTo: formData.assignedTo,
    }]);
    setIsModalOpen(false);
    setFormData({ title: '', description: '', dueDate: '', priority: 'medium', assignedTo: '' });
  };

  const toggleStatus = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'pending' ? 'completed' : 'pending' } : t));
  };

  const columns = [
    { key: 'title', header: 'المهمة', render: (row: Task) => (
      <div>
        <p className={row.status === 'completed' ? 'line-through text-slate-400' : 'font-medium'}>{row.title}</p>
        {row.description && <p className="text-xs text-slate-400">{row.description}</p>}
      </div>
    )},
    { key: 'assignedTo', header: 'المكلف', width: '100px', render: (row: Task) => (
      <div className="flex items-center gap-1 text-sm text-slate-500">
        <User size={14} />{row.assignedTo || '-'}
      </div>
    )},
    { key: 'dueDate', header: 'الموعد', width: '120px' },
    { key: 'priority', header: 'الأولوية', width: '100px', render: (row: Task) => (
      <span className={`px-2 py-0.5 rounded-full text-xs ${PRIORITY_COLORS[row.priority]}`}>{PRIORITY_LABELS[row.priority]}</span>
    )},
    { key: 'status', header: '', width: '80px', render: (row: Task) => (
      <button onClick={() => toggleStatus(row.id)} className={`px-2 py-1 rounded text-xs ${row.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
        {row.status === 'completed' ? '✓ تم' : 'إنجاز'}
      </button>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckSquare size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">المهام</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة مهام فريق المبيعات</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
          مهمة جديدة
        </Button>
      </div>

      <Card>
        <Table<Task>
          data={tasks}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          emptyMessage="لا توجد مهام"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="مهمة جديدة"
        size="md"
        footer={<><Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button><Button variant="primary" onClick={handleSave}>حفظ</Button></>}
      >
        <div className="space-y-4">
          <Input label="العنوان" value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} />
          <Input label="الوصف" value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="تاريخ الاستحقاق" type="date" value={formData.dueDate} onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))} />
            <Input label="المكلف" value={formData.assignedTo} onChange={e => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">الأولوية</label>
            <select value={formData.priority} onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value as Task['priority'] }))} className="form-control">
              <option value="low">منخفض</option>
              <option value="medium">متوسط</option>
              <option value="high">عالي</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TasksPage;
