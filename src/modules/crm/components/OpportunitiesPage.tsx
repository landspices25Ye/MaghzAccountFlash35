import React, { useState } from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';

interface Opportunity {
  id: string;
  name: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseDate?: string;
}

const STAGE_LABELS: Record<string, string> = {
  prospecting: 'استكشاف',
  qualification: 'تأهيل',
  proposal: 'عرض',
  negotiation: 'تفاوض',
  closed_won: 'مغلق (ربح)',
  closed_lost: 'مغلق (خسارة)',
};

export const OpportunitiesPage: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', value: '', stage: 'prospecting', probability: '50', expectedCloseDate: '' });

  const handleSave = () => {
    setOpportunities(prev => [...prev, {
      id: crypto.randomUUID(),
      name: formData.name,
      value: Number(formData.value) || 0,
      stage: formData.stage,
      probability: Number(formData.probability) || 0,
      expectedCloseDate: formData.expectedCloseDate,
    }]);
    setIsModalOpen(false);
    setFormData({ name: '', value: '', stage: 'prospecting', probability: '50', expectedCloseDate: '' });
  };

  const columns = [
    { key: 'name', header: 'الفرصة' },
    { key: 'value', header: 'القيمة', align: 'right' as const, render: (row: Opportunity) => Number(row.value).toLocaleString('ar-SA') },
    { key: 'stage', header: 'المرحلة', render: (row: Opportunity) => STAGE_LABELS[row.stage] || row.stage },
    { key: 'probability', header: 'الاحتمالية', render: (row: Opportunity) => `${row.probability}%` },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckSquare size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">الفرص</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة فرص المبيعات</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>فرصة جديدة</Button>
      </div>

      <Card>
        <Table<Opportunity>
          data={opportunities}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          emptyMessage="لا توجد فرص"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="إضافة فرصة"
        size="md"
        footer={<><Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button><Button variant="primary" onClick={handleSave}>حفظ</Button></>}
      >
        <div className="space-y-4">
          <Input label="اسم الفرصة" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
          <Input label="القيمة" type="number" value={formData.value} onChange={e => setFormData(prev => ({ ...prev, value: e.target.value }))} />
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">المرحلة</label>
            <select value={formData.stage} onChange={e => setFormData(prev => ({ ...prev, stage: e.target.value }))} className="form-control">
              <option value="prospecting">استكشاف</option>
              <option value="qualification">تأهيل</option>
              <option value="proposal">عرض</option>
              <option value="negotiation">تفاوض</option>
              <option value="closed_won">مغلق (ربح)</option>
              <option value="closed_lost">مغلق (خسارة)</option>
            </select>
          </div>
          <Input label="الاحتمالية (%)" type="number" value={formData.probability} onChange={e => setFormData(prev => ({ ...prev, probability: e.target.value }))} />
          <Input label="تاريخ الإغلاق المتوقع" type="date" value={formData.expectedCloseDate} onChange={e => setFormData(prev => ({ ...prev, expectedCloseDate: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
};

export default OpportunitiesPage;
