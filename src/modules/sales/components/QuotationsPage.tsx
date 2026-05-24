import React, { useState } from 'react';
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { CustomerSelect } from '@/core/ui/components/smart';
import { useAppStore } from '@/core/store';

interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  date: string;
  expiryDate: string;
  totalAmount: number;
  status: 'open' | 'accepted' | 'rejected' | 'expired';
}

const STATUS_LABELS: Record<string, string> = {
  open: 'مفتوحة',
  accepted: 'مقبولة',
  rejected: 'مرفوضة',
  expired: 'منتهية',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  expired: 'bg-slate-100 text-slate-700',
};

export const QuotationsPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const [quotations, setQuotations] = useState<Quotation[]>([
    { id: '1', quotationNumber: 'Q-2026-001', customerName: 'شركة الأمل', date: '2026-06-15', expiryDate: '2026-07-15', totalAmount: 850000, status: 'open' },
    { id: '2', quotationNumber: 'Q-2026-002', customerName: 'مؤسسة النور', date: '2026-06-10', expiryDate: '2026-07-10', totalAmount: 1200000, status: 'accepted' },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [formData, setFormData] = useState({ quotationNumber: '', customerName: '', date: '', expiryDate: '', totalAmount: '' });

  const handleSave = () => {
    if (!formData.quotationNumber || !formData.customerName) return;
    if (editing) {
      setQuotations(prev => prev.map(q => q.id === editing.id ? {
        ...q,
        quotationNumber: formData.quotationNumber,
        customerName: formData.customerName,
        date: formData.date,
        expiryDate: formData.expiryDate,
        totalAmount: Number(formData.totalAmount) || 0,
      } : q));
    } else {
      setQuotations(prev => [...prev, {
        id: crypto.randomUUID(),
        quotationNumber: formData.quotationNumber,
        customerName: formData.customerName,
        date: formData.date,
        expiryDate: formData.expiryDate,
        totalAmount: Number(formData.totalAmount) || 0,
        status: 'open',
      }]);
    }
    setIsModalOpen(false);
    setEditing(null);
    setFormData({ quotationNumber: '', customerName: '', date: '', expiryDate: '', totalAmount: '' });
  };

  const handleDelete = (id: string) => {
    setQuotations(prev => prev.filter(q => q.id !== id));
  };

  const columns = [
    { key: 'quotationNumber', header: 'الرقم', width: '120px' },
    { key: 'customerName', header: 'العميل' },
    { key: 'date', header: 'التاريخ', width: '120px' },
    { key: 'totalAmount', header: 'المبلغ', align: 'right' as const, render: (row: Quotation) => Number(row.totalAmount).toLocaleString('ar-SA') },
    { key: 'status', header: 'الحالة', width: '100px', render: (row: Quotation) => (
      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[row.status]}`}>{STATUS_LABELS[row.status]}</span>
    )},
    { key: 'actions', header: '', width: '100px', render: (row: Quotation) => (
      <div className="flex gap-1">
        <button onClick={() => { setEditing(row); setFormData({ quotationNumber: row.quotationNumber, customerName: row.customerName, date: row.date, expiryDate: row.expiryDate, totalAmount: String(row.totalAmount) }); setIsModalOpen(true); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-primary-600">
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
          <Tag size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">عروض الأسعار</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة عروض الأسعار للعملاء</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { setEditing(null); setFormData({ quotationNumber: '', customerName: '', date: '', expiryDate: '', totalAmount: '' }); setIsModalOpen(true); }}>
          عرض جديد
        </Button>
      </div>

      <Card>
        <Table<Quotation>
          data={quotations}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          emptyMessage="لا توجد عروض أسعار"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'تعديل عرض' : 'عرض سعر جديد'}
        size="md"
        footer={<><Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button><Button variant="primary" onClick={handleSave}>حفظ</Button></>}
      >
        <div className="space-y-4">
          <Input label="رقم العرض" value={formData.quotationNumber} onChange={e => setFormData(prev => ({ ...prev, quotationNumber: e.target.value }))} />
           <div>
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">العميل</label>
             <CustomerSelect companyId={activeCompany?.id || ''} value={formData.customerName} onChange={v => setFormData(prev => ({ ...prev, customerName: Array.isArray(v) ? v[0] || '' : v || '' }))} size="sm" />
           </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="التاريخ" type="date" value={formData.date} onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))} />
            <Input label="تاريخ الانتهاء" type="date" value={formData.expiryDate} onChange={e => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))} />
          </div>
          <Input label="المبلغ الإجمالي" type="number" value={formData.totalAmount} onChange={e => setFormData(prev => ({ ...prev, totalAmount: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
};

export default QuotationsPage;
