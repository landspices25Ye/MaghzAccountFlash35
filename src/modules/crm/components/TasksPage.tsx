import React, { useState } from 'react';
import { CheckSquare, Plus, User, AlertTriangle } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { useAppStore } from '@/core/store';
import { useTasks } from '../hooks/useCrm';
import { useOwnerFilter } from '@/core/utils/useOwnerFilter';
import { OwnerFilterToggle } from '@/core/ui/components/OwnerFilterToggle';
import type { Task } from '../types';
import { Can } from '@/core/ui/components/PermissionGate';
import { useTranslation } from '@/core/i18n/useTranslation';

export const TasksPage: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore((state) => state.activeCompany);
  const companyId = activeCompany?.id || '';
  const { tasks, isLoading, create, update, remove } = useTasks(companyId);
  const { filtered: filteredTasks, showToggle: showOwnerToggle, isOwnOnly, toggleOwnOnly } = useOwnerFilter(tasks, 'crm');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '', description: '', dueDate: '', priority: 'medium' as Task['priority'], assignedTo: '', leadId: '', opportunityId: '', customerId: '',
  });

  const resetForm = () => {
    setFormData({ title: '', description: '', dueDate: '', priority: 'medium', assignedTo: '', leadId: '', opportunityId: '', customerId: '' });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setIsModalOpen(true); };
  const openEdit = (task: Task) => {
    setEditing(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate || '',
      priority: task.priority,
      assignedTo: task.assignedTo || '',
      leadId: task.leadId || '',
      opportunityId: task.opportunityId || '',
      customerId: task.customerId || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title) return;
    const payload = {
      companyId,
      title: formData.title,
      description: formData.description || undefined,
      dueDate: formData.dueDate || undefined,
      priority: formData.priority,
      status: (editing ? editing.status : 'pending') as Task['status'],
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

  const toggleStatus = async (task: Task) => {
    const newStatus: Task['status'] = task.status === 'pending' ? 'completed' : 'pending';
    await update(task.id, { status: newStatus });
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'completed') return false;
    return new Date(task.dueDate) < new Date();
  };

  const columns = [
    { key: 'title', header: t('crm.task.title'), render: (row: Task) => (
      <div className="flex items-center gap-2">
        {isOverdue(row) && <AlertTriangle size={14} className="text-rose-500" />}
        <div>
          <p className={row.status === 'completed' ? 'line-through text-slate-400' : 'font-medium'}>{row.title}</p>
          {row.description && <p className="text-xs text-slate-400">{row.description}</p>}
        </div>
      </div>
    )},
    { key: 'assignedTo', header: t('crm.task.assignedTo'), width: '120px', render: (row: Task) => (
      <div className="flex items-center gap-1 text-sm text-slate-500">
        <User size={14} />{row.assignedTo || '—'}
      </div>
    )},
    { key: 'dueDate', header: t('crm.task.dueDate'), width: '130px', render: (row: Task) => (
      <span className={isOverdue(row) ? 'text-rose-600 font-medium' : ''}>{row.dueDate || '—'}</span>
    )},
    { key: 'priority', header: t('crm.task.priority'), width: '100px', render: (row: Task) => (
      <span className={`px-2 py-0.5 rounded-full text-xs ${priorityColor(row.priority)}`}>{t(`crm.priority.${row.priority}`)}</span>
    )},
    { key: 'status', header: '', width: '90px', render: (row: Task) => (
      <Button variant="ghost" size="sm" onClick={() => toggleStatus(row)} className={row.status === 'completed' ? 'text-emerald-600' : 'text-slate-500'}>
        {row.status === 'completed' ? t('crm.task.statusCompleted') : t('crm.task.statusPending')}
      </Button>
    )},
    { key: 'actions', header: '', width: '100px', render: (row: Task) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="text-amber-600" onClick={() => openEdit(row)}>{t('settings.common.edit')}</Button>
        <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => setConfirmDelete(row.id)}>{t('settings.common.delete')}</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckSquare size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('crm.tasks.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('crm.tasks.description')}</p>
          </div>
        </div>
        <OwnerFilterToggle isOwnOnly={isOwnOnly} showToggle={showOwnerToggle} onToggle={toggleOwnOnly} />
        <Can action="create" module="crm"><Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>{t('crm.task.new')}</Button></Can>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">{t('settings.common.loading')}</div>
        ) : filteredTasks.length === 0 ? (
          <EmptyState icon="inbox" title={t('crm.task.empty')} description={t('crm.task.emptyDescription')} action={<Can action="create" module="crm"><Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>{t('crm.task.new')}</Button></Can>} />
        ) : (
          <Table<Task>
            data={filteredTasks}
            columns={columns}
            keyExtractor={(row) => row.id}
            emptyMessage={t('crm.task.empty')}
          />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editing ? t('crm.task.edit') : t('crm.task.new')}
        size="md"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>{t('settings.common.cancel')}</Button>
            <Button variant="primary" onClick={handleSave}>{t('settings.common.save')}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label={t('crm.form.title')} value={formData.title} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} />
          <Input label={t('crm.form.description')} value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('crm.form.dueDate')} type="date" value={formData.dueDate} onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('crm.task.priority')}</label>
              <select value={formData.priority} onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value as Task['priority'] }))} className="form-control">
                <option value="low">{t('crm.priority.low')}</option>
                <option value="medium">{t('crm.priority.medium')}</option>
                <option value="high">{t('crm.priority.high')}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('crm.form.assignedTo')} value={formData.assignedTo} onChange={(e) => setFormData((prev) => ({ ...prev, assignedTo: e.target.value }))} />
            <Input label={t('crm.form.customerOrOpportunity')} value={formData.opportunityId || formData.leadId || formData.customerId} onChange={(e) => setFormData((prev) => ({ ...prev, opportunityId: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={t('crm.task.deleteTitle')}
        message={t('crm.task.deleteMessage')}
        variant="danger"
      />
    </div>
  );
};

function priorityColor(priority: Task['priority']) {
  const colors: Record<string, string> = { low: 'bg-slate-100 text-slate-700', medium: 'bg-amber-100 text-amber-700', high: 'bg-rose-100 text-rose-700' };
  return colors[priority] || 'bg-slate-100 text-slate-700';
}

export default TasksPage;
