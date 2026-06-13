import React, { useState, useRef, useMemo } from 'react';
import { Users, Plus, User } from 'lucide-react';
import { Card, Button, Input, Modal, Table, Pagination } from '@/core/ui/components';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { ActionButtons } from '@/core/ui/components/ActionButtons';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { useAppStore } from '@/core/store';
import { useFormatters } from '@/core/utils/useFormatters';
import { useEmployeesPaginated } from '../hooks/useHr';
import type { Employee } from '../types';
import { Can } from '@/core/ui/components/PermissionGate';
import { useTranslation } from '@/core/i18n/useTranslation';
import { useToastStore } from '@/core/store/toastStore';

export const EmployeesPage: React.FC = () => {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const companyId = activeCompany?.id || '';
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const { formatCurrency } = useFormatters(activeCompany?.id || '');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const employeeFilters = useMemo(() => ({ isActive: isActiveFilter }), [isActiveFilter]);
  const { employees, total, page, pageSize, isLoading, goToPage, changePageSize, create, update, remove } = useEmployeesPaginated(companyId, employeeFilters);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employeeNumber: '', fullName: '', nationalId: '', phone: '', email: '',
    address: '', departmentId: '', position: '', grade: '', hireDate: '', baseSalary: '',
    isActive: true, photoUrl: '', attachments: [] as string[],
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetForm = () => {
    setFormData({
      employeeNumber: '', fullName: '', nationalId: '', phone: '', email: '',
      address: '', departmentId: '', position: '', grade: '', hireDate: '', baseSalary: '',
      isActive: true, photoUrl: '', attachments: [],
    });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setFormData({
      employeeNumber: emp.employeeNumber,
      fullName: emp.fullName,
      nationalId: emp.nationalId || '',
      phone: emp.phone || '',
      email: emp.email || '',
      address: emp.address || '',
      departmentId: emp.departmentId || '',
      position: emp.position || '',
      grade: emp.grade || '',
      hireDate: emp.hireDate || '',
      baseSalary: String(emp.baseSalary || ''),
      isActive: emp.isActive,
      photoUrl: emp.photoUrl || '',
      attachments: emp.attachments || [],
    });
    setIsModalOpen(true);
  };

  const openView = (emp: Employee) => {
    setViewing(emp);
    setIsDetailOpen(true);
  };

  const handleSave = async () => {
    if (!formData.employeeNumber || !formData.fullName) return;
    const payload = {
      companyId,
      employeeNumber: formData.employeeNumber,
      fullName: formData.fullName,
      nationalId: formData.nationalId || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      address: formData.address || undefined,
      departmentId: formData.departmentId || undefined,
      position: formData.position || undefined,
      grade: formData.grade || undefined,
      hireDate: formData.hireDate || undefined,
      baseSalary: Number(formData.baseSalary) || undefined,
      isActive: formData.isActive,
      photoUrl: formData.photoUrl || undefined,
      attachments: formData.attachments,
    };
    if (editing) {
      await update(editing.id, payload);
      addToast('success', t('hr.employeesPage.updated'));
    } else {
      await create(payload);
      addToast('success', t('hr.employeesPage.created'));
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await remove(confirmDelete);
    addToast('success', t('hr.employeesPage.deleted'));
    setConfirmDelete(null);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, photoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const columns = [
    { key: 'employeeNumber', header: t('hr.employeesPage.employeeNumber'), width: '120px' },
    { key: 'fullName', header: t('hr.employeesPage.name'), render: (row: Employee) => (
      <div className="flex items-center gap-2">
        {row.photoUrl ? <img src={row.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" /> : <User size={18} className="text-slate-400" />}
        <span>{row.fullName}</span>
      </div>
    )},
    { key: 'position', header: t('hr.employeesPage.position') },
    { key: 'departmentName', header: t('hr.employeesPage.department'), render: (row: Employee) => row.departmentName || row.departmentId || '—' },
    { key: 'baseSalary', header: t('hr.employeesPage.baseSalary'), align: 'right' as const, render: (row: Employee) => formatCurrency(row.baseSalary || 0) || '—' },
    { key: 'isActive', header: t('hr.employeesPage.status'), width: '100px', render: (row: Employee) => <StatusBadge status={row.isActive ? 'active' : 'inactive'} /> },
    { key: 'actions', header: '', width: '140px', render: (row: Employee) => (
      <ActionButtons onView={() => openView(row)} onEdit={() => openEdit(row)} onDelete={() => setConfirmDelete(row.id)} showPrint={false} />
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('hr.employeesPage.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('hr.employeesPage.subtitle')}</p>
          </div>
        </div>
    <Can action="create" module="hr"><Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>{t('hr.employeesPage.new')}</Button></Can>
      </div>

      <Card>
        <div className="p-4 flex items-center gap-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">{t('hr.employeesPage.filterLabel')}</label>
            <select
              value={isActiveFilter === undefined ? 'all' : isActiveFilter ? 'active' : 'inactive'}
              onChange={(e) => {
                const v = e.target.value;
                setIsActiveFilter(v === 'all' ? undefined : v === 'active');
              }}
              className="px-2 py-1 text-sm border rounded-md dark:bg-slate-900 dark:border-slate-600"
            >
              <option value="all">{t('settings.common.all')}</option>
              <option value="active">{t('settings.common.active')}</option>
              <option value="inactive">{t('settings.common.inactive')}</option>
            </select>
          </div>
          <span className="text-xs text-slate-500">{t('hr.employeesPage.total')} {total}</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">{t('settings.common.loading')}</div>
        ) : employees.length === 0 ? (
          <EmptyState icon="inbox" title={t('hr.employeesPage.emptyTitle')} description={t('hr.employeesPage.emptyDescription')} action={<Can action="create" module="hr"><Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>{t('hr.employeesPage.new')}</Button></Can>} />
        ) : (
          <Table<Employee>
            data={employees}
            columns={columns}
            keyExtractor={(row) => row.id}
            emptyMessage={t('hr.employeesPage.emptyMessage')}
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
        title={editing ? t('hr.employeesPage.edit') : t('hr.employeesPage.new')}
        size="lg"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>{t('settings.common.cancel')}</Button>
            <Button variant="primary" onClick={handleSave}>{t('settings.common.save')}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                {formData.photoUrl ? <img src={formData.photoUrl} alt="" className="w-full h-full object-cover" /> : <User size={32} className="text-slate-400" />}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 left-0 bg-primary-600 text-white rounded-full p-1">
                <Plus size={12} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <div className="flex-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('hr.employeesPage.employeeNumber')} value={formData.employeeNumber} onChange={(e) => setFormData((prev) => ({ ...prev, employeeNumber: e.target.value }))} />
            <Input label={t('hr.employeesPage.fullName')} value={formData.fullName} onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('hr.employeesPage.nationalId')} value={formData.nationalId} onChange={(e) => setFormData((prev) => ({ ...prev, nationalId: e.target.value }))} />
            <Input label={t('hr.employeesPage.phone')} value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('hr.employeesPage.email')} type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} />
            <Input label={t('hr.employeesPage.address')} value={formData.address} onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('hr.employeesPage.position')} value={formData.position} onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))} />
            <Input label={t('hr.employeesPage.department')} value={formData.departmentId} onChange={(e) => setFormData((prev) => ({ ...prev, departmentId: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('hr.employeesPage.grade')} value={formData.grade} onChange={(e) => setFormData((prev) => ({ ...prev, grade: e.target.value }))} />
            <Input label={t('hr.employeesPage.baseSalary')} type="number" value={formData.baseSalary} onChange={(e) => setFormData((prev) => ({ ...prev, baseSalary: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('hr.employeesPage.hireDate')} type="date" value={formData.hireDate} onChange={(e) => setFormData((prev) => ({ ...prev, hireDate: e.target.value }))} />
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))} className="rounded" />
              <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-200">{t('settings.common.active')}</label>
            </div>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setViewing(null); }}
        title={t('hr.employeesPage.viewTitle')}
        size="md"
        footer={<Button variant="secondary" onClick={() => { setIsDetailOpen(false); setViewing(null); }}>{t('settings.common.close')}</Button>}
      >
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {viewing.photoUrl ? <img src={viewing.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover" /> : <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center"><User size={32} className="text-slate-400" /></div>}
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-50">{viewing.fullName}</p>
                <p className="text-sm text-slate-500">{viewing.position} — {viewing.departmentName || viewing.departmentId}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 dark:bg-slate-800 rounded p-2"><span className="text-slate-500">{t('hr.employeesPage.employeeNumberLabel')}</span><p className="font-medium">{viewing.employeeNumber}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded p-2"><span className="text-slate-500">{t('hr.employeesPage.nationalIdLabel')}</span><p className="font-medium">{viewing.nationalId || '—'}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded p-2"><span className="text-slate-500">{t('hr.employeesPage.phoneLabel')}</span><p className="font-medium">{viewing.phone || '—'}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded p-2"><span className="text-slate-500">{t('hr.employeesPage.emailLabel')}</span><p className="font-medium">{viewing.email || '—'}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded p-2"><span className="text-slate-500">{t('hr.employeesPage.hireDateLabel')}</span><p className="font-medium">{viewing.hireDate || '—'}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded p-2"><span className="text-slate-500">{t('hr.employeesPage.baseSalaryLabel')}</span><p className="font-medium">{formatCurrency(viewing.baseSalary || 0) || '—'}</p></div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={t('hr.employeesPage.deleteTitle')}
        message={t('hr.employeesPage.deleteConfirm')}
        variant="danger"
      />
    </div>
  );
};

export default EmployeesPage;
