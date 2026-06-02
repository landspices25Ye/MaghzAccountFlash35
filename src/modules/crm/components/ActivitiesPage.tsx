import React, { useState } from 'react';
import { Activity, Plus, Phone, Mail, Users, MapPin, FileText, BarChart3 } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { useAppStore } from '@/core/store';
import { useActivities } from '../hooks/useCrm';
import { useOwnerFilter } from '@/core/utils/useOwnerFilter';
import { OwnerFilterToggle } from '@/core/ui/components/OwnerFilterToggle';
import type { Activity as ActivityType } from '../types';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  call: <Phone size={14} />,
  meeting: <Users size={14} />,
  email: <Mail size={14} />,
  visit: <MapPin size={14} />,
  note: <FileText size={14} />,
};

const TYPE_LABELS: Record<string, string> = {
  call: 'مكالمة',
  meeting: 'اجتماع',
  email: 'بريد',
  visit: 'زيارة',
  note: 'ملاحظة',
};

export const ActivitiesPage: React.FC = () => {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const companyId = activeCompany?.id || '';
  const { activities, isLoading, create, update, remove } = useActivities(companyId);
  const { filtered: filteredActivities, showToggle: showOwnerToggle, isOwnOnly, toggleOwnOnly } = useOwnerFilter(activities, 'crm');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityType | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  const [formData, setFormData] = useState({
    type: 'call' as ActivityType['type'], subject: '', description: '', activityDate: new Date().toISOString().split('T')[0], durationMinutes: '', assignedTo: '', leadId: '', opportunityId: '', customerId: '',
  });

  const resetForm = () => {
    setFormData({ type: 'call', subject: '', description: '', activityDate: new Date().toISOString().split('T')[0], durationMinutes: '', assignedTo: '', leadId: '', opportunityId: '', customerId: '' });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setIsModalOpen(true); };
  const openEdit = (act: ActivityType) => {
    setEditing(act);
    setFormData({
      type: act.type,
      subject: act.subject,
      description: act.description || '',
      activityDate: act.activityDate,
      durationMinutes: String(act.durationMinutes || ''),
      assignedTo: act.assignedTo || '',
      leadId: act.leadId || '',
      opportunityId: act.opportunityId || '',
      customerId: act.customerId || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.subject) return;
    const payload = {
      companyId,
      type: formData.type,
      subject: formData.subject,
      description: formData.description || undefined,
      activityDate: formData.activityDate,
      durationMinutes: Number(formData.durationMinutes) || undefined,
      assignedTo: formData.assignedTo || undefined,
      leadId: formData.leadId || undefined,
      opportunityId: formData.opportunityId || undefined,
      customerId: formData.customerId || undefined,
    };
    if (editing) {
      await update(editing.id, payload);
    } else {
      await create(payload);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await remove(confirmDelete);
    setConfirmDelete(null);
  };

  const repReport = React.useMemo(() => {
    const map = new Map<string, { count: number; duration: number }>();
    activities.forEach((a) => {
      const key = a.assignedTo || 'غير معين';
      const curr = map.get(key) || { count: 0, duration: 0 };
      curr.count += 1;
      curr.duration += a.durationMinutes || 0;
      map.set(key, curr);
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [activities]);

  const columns = [
    { key: 'type', header: 'النوع', width: '80px', render: (row: ActivityType) => (
      <div className="flex items-center gap-1 text-sm text-slate-600">
        {TYPE_ICONS[row.type]}
        <span>{TYPE_LABELS[row.type]}</span>
      </div>
    )},
    { key: 'subject', header: 'الموضوع' },
    { key: 'activityDate', header: 'التاريخ', width: '120px' },
    { key: 'durationMinutes', header: 'المدة', width: '80px', render: (row: ActivityType) => row.durationMinutes ? `${row.durationMinutes} د` : '—' },
    { key: 'assignedTo', header: 'المسؤول', width: '120px', render: (row: ActivityType) => row.assignedTo || '—' },
    { key: 'actions', header: '', width: '120px', render: (row: ActivityType) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="text-amber-600" onClick={() => openEdit(row)}>تعديل</Button>
        <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => setConfirmDelete(row.id)}>حذف</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">الأنشطة</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">سجل المكالمات والاجتماعات والبريد</p>
          </div>
        </div>
      <div className="flex items-center gap-2">
        <OwnerFilterToggle isOwnOnly={isOwnOnly} showToggle={showOwnerToggle} onToggle={toggleOwnOnly} />
        <Button variant="secondary" leftIcon={<BarChart3 size={16} />} onClick={() => setShowReport(true)}>تقرير الأداء</Button>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>نشاط جديد</Button>
      </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">جارٍ التحميل...</div>
        ) : filteredActivities.length === 0 ? (
          <EmptyState icon="inbox" title="لا توجد أنشطة" description="يمكنك إضافة نشاط جديد" action={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>نشاط جديد</Button>} />
        ) : (
          <Table<ActivityType>
            data={filteredActivities}
            columns={columns}
            keyExtractor={(row) => row.id}
            emptyMessage="لا توجد أنشطة"
          />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editing ? 'تعديل نشاط' : 'نشاط جديد'}
        size="md"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>إلغاء</Button>
            <Button variant="primary" onClick={handleSave}>حفظ</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">النوع</label>
              <select value={formData.type} onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as ActivityType['type'] }))} className="form-control">
                <option value="call">مكالمة</option>
                <option value="meeting">اجتماع</option>
                <option value="email">بريد</option>
                <option value="visit">زيارة</option>
                <option value="note">ملاحظة</option>
              </select>
            </div>
            <Input label="التاريخ" type="date" value={formData.activityDate} onChange={(e) => setFormData((prev) => ({ ...prev, activityDate: e.target.value }))} />
          </div>
          <Input label="الموضوع" value={formData.subject} onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))} />
          <Input label="التفاصيل" value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="المدة (دقائق)" type="number" value={formData.durationMinutes} onChange={(e) => setFormData((prev) => ({ ...prev, durationMinutes: e.target.value }))} />
            <Input label="المسؤول" value={formData.assignedTo} onChange={(e) => setFormData((prev) => ({ ...prev, assignedTo: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        title="تقرير أداء المندوبين"
        size="md"
        footer={<Button variant="secondary" onClick={() => setShowReport(false)}>إغلاق</Button>}
      >
        <div className="space-y-4">
          {repReport.length === 0 ? (
            <EmptyState title="لا توجد بيانات" description="لا توجد أنشطة مسجلة" />
          ) : (
            <Table
              data={repReport}
              columns={[
                { key: 'name', header: 'المندوب' },
                { key: 'count', header: 'عدد الأنشطة', width: '120px' },
                { key: 'duration', header: 'إجمالي الدقائق', width: '140px' },
              ]}
              keyExtractor={(row, i) => `${row.name}-${i}`}
            />
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="حذف النشاط"
        message="هل أنت متأكد من حذف هذا النشاط؟"
        variant="danger"
      />
    </div>
  );
};

export default ActivitiesPage;
