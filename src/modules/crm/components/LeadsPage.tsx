import React, { useState, useMemo } from 'react';
import { Target, Plus, UserCheck } from 'lucide-react';
import { Card, Button, Input, Modal, Table, Pagination } from '@/core/ui/components';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { ActionButtons } from '@/core/ui/components/ActionButtons';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { useAppStore } from '@/core/store';
import { useLeadsPaginated, useActivities } from '../hooks/useCrm';
import type { Lead, Activity } from '../types';

export const LeadsPage: React.FC = () => {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const companyId = activeCompany?.id || '';
  const [statusFilter, setStatusFilter] = useState<string>('');
  const leadFilters = useMemo(() => ({ status: statusFilter || undefined }), [statusFilter]);
  const { leads, total, page, pageSize, isLoading, goToPage, changePageSize, create, update, remove, convertToCustomer } = useLeadsPaginated(companyId, leadFilters);
  const { create: createActivity } = useActivities(companyId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', company: '', source: '', estimatedValue: '', rating: 'warm' as Lead['rating'], assignedTo: '', notes: '',
  });
  const [activityForm, setActivityForm] = useState({ type: 'call' as Activity['type'], subject: '', description: '', activityDate: new Date().toISOString().split('T')[0] });

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', company: '', source: '', estimatedValue: '', rating: 'warm', assignedTo: '', notes: '' });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setFormData({
      name: lead.name,
      phone: lead.phone || '',
      email: lead.email || '',
      company: lead.company || '',
      source: lead.source || '',
      estimatedValue: String(lead.estimatedValue || ''),
      rating: lead.rating,
      assignedTo: lead.assignedTo || '',
      notes: lead.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return;
    const payload = {
      companyId,
      name: formData.name,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      company: formData.company || undefined,
      source: formData.source || undefined,
      status: (editing ? editing.status : 'new') as Lead['status'],
      rating: formData.rating,
      estimatedValue: Number(formData.estimatedValue) || undefined,
      assignedTo: formData.assignedTo || undefined,
      notes: formData.notes || undefined,
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

  const handleAddActivity = async () => {
    if (!selectedLead) return;
    await createActivity({
      companyId,
      leadId: selectedLead.id,
      type: activityForm.type,
      subject: activityForm.subject,
      description: activityForm.description || undefined,
      activityDate: activityForm.activityDate,
    });
    setIsActivityOpen(false);
    setActivityForm({ type: 'call', subject: '', description: '', activityDate: new Date().toISOString().split('T')[0] });
  };

  const handleConvert = async () => {
    if (!selectedLead) return;
    await convertToCustomer(selectedLead.id, { code: `CUST-${Date.now()}`, address: '', taxNumber: '', creditLimit: 0 });
    setIsConvertOpen(false);
    setSelectedLead(null);
  };

  const ratingColor = (rating: Lead['rating']) => {
    if (rating === 'hot') return 'bg-rose-100 text-rose-700';
    if (rating === 'warm') return 'bg-amber-100 text-amber-700';
    return 'bg-blue-100 text-blue-700';
  };

  const columns = [
    { key: 'name', header: 'الاسم' },
    { key: 'company', header: 'الشركة' },
    { key: 'phone', header: 'الهاتف' },
    { key: 'rating', header: 'التقييم', render: (row: Lead) => <span className={`px-2 py-0.5 rounded-full text-xs ${ratingColor(row.rating)}`}>{ratingLabel(row.rating)}</span> },
    { key: 'status', header: 'الحالة', render: (row: Lead) => <StatusBadge status={row.status} /> },
    { key: 'actions', header: '', width: '180px', render: (row: Lead) => (
      <div className="flex items-center gap-1">
        <ActionButtons onView={() => { setSelectedLead(row); setIsActivityOpen(true); }} onEdit={() => openEdit(row)} onDelete={() => setConfirmDelete(row.id)} showPrint={false} />
        {row.status !== 'converted' && row.status !== 'lost' && (
          <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => { setSelectedLead(row); setIsConvertOpen(true); }} title="تحويل لعميل">
            <UserCheck size={14} />
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">العملاء المحتملين</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة العملاء المحتملين والمتابعات</p>
          </div>
        </div>
      <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>عميل محتمل جديد</Button>
      </div>

      <Card>
        <div className="p-4 flex items-center gap-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">الحالة:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-1 text-sm border rounded-md dark:bg-slate-900 dark:border-slate-600">
              <option value="">الكل</option>
              <option value="new">جديد</option>
              <option value="contacted">تم التواصل</option>
              <option value="qualified">مؤهل</option>
              <option value="converted">تم التحويل</option>
              <option value="lost">خاسر</option>
            </select>
          </div>
          <span className="text-xs text-slate-500">إجمالي: {total}</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">جارٍ التحميل...</div>
        ) : leads.length === 0 ? (
          <EmptyState icon="inbox" title="لا يوجد عملاء محتملين" description="يمكنك إضافة عميل محتمل جديد" action={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>عميل محتمل جديد</Button>} />
        ) : (
          <Table<Lead>
            data={leads}
            columns={columns}
            keyExtractor={(row) => row.id}
            emptyMessage="لا يوجد عملاء محتملين"
          />
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={goToPage}
          onPageSizeChange={changePageSize}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editing ? 'تعديل عميل محتمل' : 'عميل محتمل جديد'}
        size="md"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>إلغاء</Button>
            <Button variant="primary" onClick={handleSave}>حفظ</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="الاسم" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} />
          <Input label="الشركة" value={formData.company} onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="الهاتف" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} />
            <Input label="البريد" type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="المصدر" value={formData.source} onChange={(e) => setFormData((prev) => ({ ...prev, source: e.target.value }))} />
            <Input label="القيمة المتوقعة" type="number" value={formData.estimatedValue} onChange={(e) => setFormData((prev) => ({ ...prev, estimatedValue: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">التقييم</label>
              <select value={formData.rating} onChange={(e) => setFormData((prev) => ({ ...prev, rating: e.target.value as Lead['rating'] }))} className="form-control">
                <option value="hot">Hot (ساخن)</option>
                <option value="warm">Warm (دافئ)</option>
                <option value="cold">Cold (بارد)</option>
              </select>
            </div>
            <Input label="المكلف" value={formData.assignedTo} onChange={(e) => setFormData((prev) => ({ ...prev, assignedTo: e.target.value }))} />
          </div>
          <Input label="ملاحظات" value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} />
        </div>
      </Modal>

      {/* Activity Modal */}
      <Modal
        isOpen={isActivityOpen}
        onClose={() => { setIsActivityOpen(false); setSelectedLead(null); }}
        title={selectedLead ? `متابعات: ${selectedLead.name}` : 'متابعة'}
        size="md"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => { setIsActivityOpen(false); setSelectedLead(null); }}>إغلاق</Button>
            <Button variant="primary" onClick={handleAddActivity}>إضافة نشاط</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">النوع</label>
              <select value={activityForm.type} onChange={(e) => setActivityForm((prev) => ({ ...prev, type: e.target.value as Activity['type'] }))} className="form-control">
                <option value="call">مكالمة</option>
                <option value="meeting">اجتماع</option>
                <option value="email">بريد</option>
                <option value="visit">زيارة</option>
                <option value="note">ملاحظة</option>
              </select>
            </div>
            <Input label="التاريخ" type="date" value={activityForm.activityDate} onChange={(e) => setActivityForm((prev) => ({ ...prev, activityDate: e.target.value }))} />
          </div>
          <Input label="الموضوع" value={activityForm.subject} onChange={(e) => setActivityForm((prev) => ({ ...prev, subject: e.target.value }))} />
          <Input label="التفاصيل" value={activityForm.description} onChange={(e) => setActivityForm((prev) => ({ ...prev, description: e.target.value }))} />
        </div>
      </Modal>

      {/* Convert Modal */}
      <ConfirmDialog
        isOpen={isConvertOpen}
        onClose={() => setIsConvertOpen(false)}
        onConfirm={handleConvert}
        title="تحويل إلى عميل"
        message="هل تريد تحويل هذا العميل المحتمل إلى عميل فعلي؟"
        variant="info"
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="حذف عميل محتمل"
        message="هل أنت متأكد من الحذف؟"
        variant="danger"
      />
    </div>
  );
};

function ratingLabel(rating: Lead['rating']) {
  const labels: Record<string, string> = { hot: 'ساخن', warm: 'دافئ', cold: 'بارد' };
  return labels[rating] || rating;
}

export default LeadsPage;
