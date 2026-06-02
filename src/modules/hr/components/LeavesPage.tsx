import React, { useState } from 'react';
import { Calendar, Plus, CheckCircle, XCircle } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { useAppStore } from '@/core/store';
import { useLeaves, useEmployees } from '../hooks/useHr';
import { useOwnerFilter } from '@/core/utils/useOwnerFilter';
import { OwnerFilterToggle } from '@/core/ui/components/OwnerFilterToggle';
import type { Leave } from '../types';

export const LeavesPage: React.FC = () => {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const companyId = activeCompany?.id || '';
  const { leaves, isLoading, create, updateStatus, remove } = useLeaves(companyId);
  const { filtered: filteredLeaves, showToggle: showOwnerToggle, isOwnOnly, toggleOwnOnly } = useOwnerFilter(leaves, 'hr');
  const { employees } = useEmployees(companyId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '', leaveType: 'annual' as Leave['leaveType'], startDate: '', endDate: '', days: '', reason: '',
  });

  const resetForm = () => {
    setFormData({ employeeId: '', leaveType: 'annual', startDate: '', endDate: '', days: '', reason: '' });
  };

  const handleSave = async () => {
    if (!formData.employeeId || !formData.startDate || !formData.endDate) return;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    await create({
      companyId,
      employeeId: formData.employeeId,
      leaveType: formData.leaveType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      days: diffDays,
      status: 'pending',
      reason: formData.reason || undefined,
    });
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await remove(confirmDelete);
    setConfirmDelete(null);
  };

  const columns = [
    { key: 'employeeName', header: 'الموظف', render: (row: Leave) => row.employeeName || row.employeeId },
    { key: 'leaveType', header: 'نوع الإجازة', render: (row: Leave) => leaveTypeLabel(row.leaveType) },
    { key: 'startDate', header: 'من', width: '120px' },
    { key: 'endDate', header: 'إلى', width: '120px' },
    { key: 'days', header: 'الأيام', width: '80px' },
    { key: 'status', header: 'الحالة', width: '110px', render: (row: Leave) => <StatusBadge status={row.status} /> },
    { key: 'actions', header: '', width: '160px', render: (row: Leave) => (
      <div className="flex items-center gap-1">
        {row.status === 'pending' && (
          <>
            <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => updateStatus(row.id, 'approved', 'manager')} title="موافقة">
              <CheckCircle size={16} />
            </Button>
            <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => updateStatus(row.id, 'rejected', 'manager')} title="رفض">
              <XCircle size={16} />
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => setConfirmDelete(row.id)} title="حذف">
          <XCircle size={16} />
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">الإجازات</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة الإجازات السنوية والمرضية والطارئة</p>
          </div>
      </div>
      <div className="flex items-center gap-2">
        <OwnerFilterToggle isOwnOnly={isOwnOnly} showToggle={showOwnerToggle} onToggle={toggleOwnOnly} />
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>طلب إجازة</Button>
      </div>
    </div>

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">جارٍ التحميل...</div>
        ) : filteredLeaves.length === 0 ? (
          <EmptyState icon="inbox" title="لا توجد إجازات" description="يمكنك تقديم طلب إجازة جديد" action={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>طلب إجازة</Button>} />
        ) : (
          <Table<Leave>
            data={filteredLeaves}
            columns={columns}
            keyExtractor={(row) => row.id}
            emptyMessage="لا توجد إجازات"
          />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title="طلب إجازة جديد"
        size="md"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>إلغاء</Button>
            <Button variant="primary" onClick={handleSave}>حفظ</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">الموظف</label>
            <select value={formData.employeeId} onChange={(e) => setFormData((prev) => ({ ...prev, employeeId: e.target.value }))} className="form-control">
              <option value="">اختر موظف</option>
              {employees.map((emp) => (<option key={emp.id} value={emp.id}>{emp.fullName}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">نوع الإجازة</label>
            <select value={formData.leaveType} onChange={(e) => setFormData((prev) => ({ ...prev, leaveType: e.target.value as Leave['leaveType'] }))} className="form-control">
              <option value="annual">سنوية</option>
              <option value="sick">مرضية</option>
              <option value="emergency">طارئة</option>
              <option value="unpaid">بدون راتب</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="من تاريخ" type="date" value={formData.startDate} onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))} />
            <Input label="إلى تاريخ" type="date" value={formData.endDate} onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))} />
          </div>
          <Input label="السبب" value={formData.reason} onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))} />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="حذف طلب الإجازة"
        message="هل أنت متأكد من حذف طلب الإجازة هذا؟"
        variant="danger"
      />
    </div>
  );
};

function leaveTypeLabel(type: Leave['leaveType']) {
  const labels: Record<string, string> = { annual: 'سنوية', sick: 'مرضية', emergency: 'طارئة', unpaid: 'بدون راتب' };
  return labels[type] || type;
}

export default LeavesPage;
