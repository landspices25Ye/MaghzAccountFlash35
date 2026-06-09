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
import { Can } from '@/core/ui/components/PermissionGate';
import { useTranslation } from '@/core/i18n/useTranslation';

export const LeadsPage: React.FC = () => {
  const { t } = useTranslation();
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
    { key: 'name', header: t('crm.lead.name') },
    { key: 'company', header: t('crm.lead.company') },
    { key: 'phone', header: t('crm.lead.phone') },
    { key: 'rating', header: t('crm.lead.rating'), render: (row: Lead) => <span className={`px-2 py-0.5 rounded-full text-xs ${ratingColor(row.rating)}`}>{t(`crm.rating.${row.rating}`)}</span> },
    { key: 'status', header: t('crm.lead.status'), render: (row: Lead) => <StatusBadge status={row.status} /> },
    { key: 'actions', header: '', width: '180px', render: (row: Lead) => (
      <div className="flex items-center gap-1">
        <ActionButtons onView={() => { setSelectedLead(row); setIsActivityOpen(true); }} onEdit={() => openEdit(row)} onDelete={() => setConfirmDelete(row.id)} showPrint={false} />
        {row.status !== 'converted' && row.status !== 'lost' && (
          <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => { setSelectedLead(row); setIsConvertOpen(true); }} title={t('crm.lead.convertToCustomer')}>
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('crm.leads.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('crm.leads.description')}</p>
          </div>
        </div>
      <Can action="create" module="crm"><Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>{t('crm.lead.new')}</Button></Can>
      </div>

      <Card>
        <div className="p-4 flex items-center gap-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">{t('crm.lead.statusFilter')}:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-1 text-sm border rounded-md dark:bg-slate-900 dark:border-slate-600">
              <option value="">{t('settings.common.all')}</option>
              <option value="new">{t('crm.status.new')}</option>
              <option value="contacted">{t('crm.status.contacted')}</option>
              <option value="qualified">{t('crm.status.qualified')}</option>
              <option value="converted">{t('crm.status.converted')}</option>
              <option value="lost">{t('crm.status.lost')}</option>
            </select>
          </div>
          <span className="text-xs text-slate-500">{t('crm.total')}: {total}</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">{t('settings.common.loading')}</div>
        ) : leads.length === 0 ? (
          <EmptyState icon="inbox" title={t('crm.lead.empty')} description={t('crm.lead.emptyDescription')} action={<Can action="create" module="crm"><Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>{t('crm.lead.new')}</Button></Can>} />
        ) : (
          <Table<Lead>
            data={leads}
            columns={columns}
            keyExtractor={(row) => row.id}
            emptyMessage={t('crm.lead.empty')}
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
        title={editing ? t('crm.lead.edit') : t('crm.lead.new')}
        size="md"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>{t('settings.common.cancel')}</Button>
            <Button variant="primary" onClick={handleSave}>{t('settings.common.save')}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label={t('crm.lead.name')} value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} />
          <Input label={t('crm.lead.company')} value={formData.company} onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('crm.lead.phone')} value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} />
            <Input label={t('crm.lead.email')} type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('crm.lead.source')} value={formData.source} onChange={(e) => setFormData((prev) => ({ ...prev, source: e.target.value }))} />
            <Input label={t('crm.lead.estimatedValue')} type="number" value={formData.estimatedValue} onChange={(e) => setFormData((prev) => ({ ...prev, estimatedValue: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('crm.lead.rating')}</label>
              <select value={formData.rating} onChange={(e) => setFormData((prev) => ({ ...prev, rating: e.target.value as Lead['rating'] }))} className="form-control">
                <option value="hot">{t('crm.rating.hot')}</option>
                <option value="warm">{t('crm.rating.warm')}</option>
                <option value="cold">{t('crm.rating.cold')}</option>
              </select>
            </div>
            <Input label={t('crm.form.assignedTo')} value={formData.assignedTo} onChange={(e) => setFormData((prev) => ({ ...prev, assignedTo: e.target.value }))} />
          </div>
          <Input label={t('crm.form.notes')} value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} />
        </div>
      </Modal>

      {/* Activity Modal */}
      <Modal
        isOpen={isActivityOpen}
        onClose={() => { setIsActivityOpen(false); setSelectedLead(null); }}
        title={selectedLead ? `${t('crm.lead.followUps')}: ${selectedLead.name}` : t('crm.lead.followUp')}
        size="md"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => { setIsActivityOpen(false); setSelectedLead(null); }}>{t('settings.common.close')}</Button>
            <Button variant="primary" onClick={handleAddActivity}>{t('crm.activity.addActivity')}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('crm.activity.type')}</label>
              <select value={activityForm.type} onChange={(e) => setActivityForm((prev) => ({ ...prev, type: e.target.value as Activity['type'] }))} className="form-control">
                <option value="call">{t('crm.activity.call')}</option>
                <option value="meeting">{t('crm.activity.meeting')}</option>
                <option value="email">{t('crm.activity.email')}</option>
                <option value="visit">{t('crm.activity.visit')}</option>
                <option value="note">{t('crm.activity.note')}</option>
              </select>
            </div>
            <Input label={t('crm.activity.date')} type="date" value={activityForm.activityDate} onChange={(e) => setActivityForm((prev) => ({ ...prev, activityDate: e.target.value }))} />
          </div>
          <Input label={t('crm.activity.subject')} value={activityForm.subject} onChange={(e) => setActivityForm((prev) => ({ ...prev, subject: e.target.value }))} />
          <Input label={t('crm.activity.details')} value={activityForm.description} onChange={(e) => setActivityForm((prev) => ({ ...prev, description: e.target.value }))} />
        </div>
      </Modal>

      {/* Convert Modal */}
      <ConfirmDialog
        isOpen={isConvertOpen}
        onClose={() => setIsConvertOpen(false)}
        onConfirm={handleConvert}
        title={t('crm.lead.convertTitle')}
        message={t('crm.lead.convertMessage')}
        variant="info"
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={t('crm.lead.deleteTitle')}
        message={t('crm.lead.deleteMessage')}
        variant="danger"
      />
    </div>
  );
};

export default LeadsPage;
