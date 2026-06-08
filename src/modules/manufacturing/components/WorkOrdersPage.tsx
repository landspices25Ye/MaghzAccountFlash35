import React, { useState, useMemo } from 'react';
import { Wrench, Plus, Trash2, ArrowRight, FileBarChart } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { ActionButtons } from '@/core/ui/components/ActionButtons';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { useAppStore } from '@/core/store';
import { useWorkOrders, useWorkOrderVariance } from '../hooks/useManufacturing';
import { manufacturingApi } from '../api';
import { useFormatters } from '@/core/utils/useFormatters';
import { useOwnerFilter } from '@/core/utils/useOwnerFilter';
import { OwnerFilterToggle } from '@/core/ui/components/OwnerFilterToggle';
import { Can } from '@/core/ui/components/PermissionGate';
import type { WorkOrder, WorkOrderLine } from '../types';

interface WorkOrderFormLine {
  materialId: string;
  plannedQuantity: number;
  unitCost: number;
}

const STATUS_FLOW: WorkOrder['status'][] = ['planned', 'in_progress', 'completed', 'cancelled'];

export const WorkOrdersPage: React.FC = () => {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const companyId = activeCompany?.id || '';
  const { workOrders, isLoading, create, update, remove, changeStatus } = useWorkOrders(companyId);
  const { filtered: filteredWorkOrders, showToggle: showOwnerToggle, isOwnOnly, toggleOwnOnly } = useOwnerFilter(workOrders, 'manufacturing');
  const { formatCurrency } = useFormatters(companyId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isVarianceOpen, setIsVarianceOpen] = useState(false);
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [viewing, setViewing] = useState<{ workOrder: WorkOrder; lines: WorkOrderLine[] } | null>(null);
  const [selectedVarianceId, setSelectedVarianceId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<{ id: string; status: WorkOrder['status'] } | null>(null);

  const [formData, setFormData] = useState({ orderNumber: '', productId: '', quantity: '', plannedStartDate: '', plannedEndDate: '', estimatedCost: '' });
  const [lines, setLines] = useState<WorkOrderFormLine[]>([{ materialId: '', plannedQuantity: 1, unitCost: 0 }]);

  const estimatedTotal = useMemo(() =>
    lines.reduce((sum, l) => sum + (l.plannedQuantity * l.unitCost), 0),
  [lines]);

  const resetForm = () => {
    setFormData({ orderNumber: '', productId: '', quantity: '', plannedStartDate: '', plannedEndDate: '', estimatedCost: '' });
    setLines([{ materialId: '', plannedQuantity: 1, unitCost: 0 }]);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = async (wo: WorkOrder) => {
    setEditing(wo);
    setFormData({
      orderNumber: wo.orderNumber,
      productId: wo.productId,
      quantity: String(wo.quantity),
      plannedStartDate: wo.plannedStartDate || '',
      plannedEndDate: wo.plannedEndDate || '',
      estimatedCost: String(wo.estimatedCost || ''),
    });
    const res = await manufacturingApi.getWorkOrderById(wo.id, companyId);
    if (res.success && res.data) {
      setLines(res.data.lines.map((l) => ({ materialId: l.materialId, plannedQuantity: l.plannedQuantity, unitCost: l.unitCost || 0 })));
    } else {
      setLines([]);
    }
    setIsModalOpen(true);
  };

  const openView = async (wo: WorkOrder) => {
    const res = await manufacturingApi.getWorkOrderById(wo.id, companyId);
    if (res.success && res.data) {
      setViewing(res.data);
      setIsDetailOpen(true);
    }
  };

  const openVariance = (id: string) => {
    setSelectedVarianceId(id);
    setIsVarianceOpen(true);
  };

  const handleSave = async () => {
    if (!formData.orderNumber || !formData.productId) return;
    const payload = {
      companyId,
      orderNumber: formData.orderNumber,
      productId: formData.productId,
      quantity: Number(formData.quantity) || 0,
      status: (editing ? editing.status : 'planned') as WorkOrder['status'],
      plannedStartDate: formData.plannedStartDate || undefined,
      plannedEndDate: formData.plannedEndDate || undefined,
      estimatedCost: Number(formData.estimatedCost) || estimatedTotal || undefined,
      lines: lines.map((l) => ({ materialId: l.materialId, plannedQuantity: l.plannedQuantity, unitCost: l.unitCost })),
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

  const handleStatusChange = async () => {
    if (!confirmStatus) return;
    await changeStatus(confirmStatus.id, confirmStatus.status);
    setConfirmStatus(null);
  };

  const canAdvance = (status: WorkOrder['status']) => {
    const idx = STATUS_FLOW.indexOf(status);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 && status !== 'cancelled';
  };

  const nextStatus = (status: WorkOrder['status']): WorkOrder['status'] | undefined => {
    const idx = STATUS_FLOW.indexOf(status);
    return STATUS_FLOW[idx + 1];
  };

  const statusActionLabel: Record<string, string> = {
    planned: 'بدء التنفيذ',
    in_progress: 'إكمال',
    completed: '',
    cancelled: '',
  };

  const columns = [
    { key: 'orderNumber', header: 'رقم الأمر', width: '130px' },
    { key: 'productName', header: 'المنتج', render: (row: WorkOrder) => row.productName || row.productId },
    { key: 'quantity', header: 'الكمية', width: '90px' },
    { key: 'estimatedCost', header: 'التكلفة المقدرة', align: 'right' as const, render: (row: WorkOrder) => row.estimatedCost !== undefined ? formatCurrency(row.estimatedCost) : '—' },
    { key: 'actualCost', header: 'التكلفة الفعلية', align: 'right' as const, render: (row: WorkOrder) => row.actualCost !== undefined ? formatCurrency(row.actualCost) : '—' },
    { key: 'status', header: 'الحالة', width: '120px', render: (row: WorkOrder) => <StatusBadge status={row.status} /> },
    { key: 'actions', header: '', width: '180px', render: (row: WorkOrder) => (
      <div className="flex items-center gap-1">
        <ActionButtons onView={() => openView(row)} onEdit={() => openEdit(row)} onDelete={() => setConfirmDelete(row.id)} showPrint={false} />
        {canAdvance(row.status) && (
          <Button variant="ghost" size="sm" title={statusActionLabel[row.status]} onClick={() => setConfirmStatus({ id: row.id, status: nextStatus(row.status)! })} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
            <ArrowRight size={14} />
          </Button>
        )}
        {row.status === 'completed' && (
          <Button variant="ghost" size="sm" title="تقرير التباين" onClick={() => openVariance(row.id)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
            <FileBarChart size={14} />
          </Button>
        )}
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
        <OwnerFilterToggle isOwnOnly={isOwnOnly} showToggle={showOwnerToggle} onToggle={toggleOwnOnly} />
        <Can action="create" module="manufacturing">
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>
            أمر تشغيل جديد
          </Button>
        </Can>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">جارٍ التحميل...</div>
        ) : filteredWorkOrders.length === 0 ? (
          <EmptyState icon="file" title="لا توجد أوامر تشغيل" description="يمكنك إضافة أمر تشغيل جديد" action={
            <Can action="create" module="manufacturing">
              <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>أمر تشغيل جديد</Button>
            </Can>
          } />
        ) : (
          <Table<WorkOrder>
            data={filteredWorkOrders}
            columns={columns}
            keyExtractor={(row) => row.id}
            emptyMessage="لا توجد أوامر تشغيل"
          />
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editing ? 'تعديل أمر تشغيل' : 'أمر تشغيل جديد'}
        size="lg"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>إلغاء</Button>
            <Button variant="primary" onClick={handleSave}>حفظ</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="رقم الأمر" value={formData.orderNumber} onChange={(e) => setFormData((prev) => ({ ...prev, orderNumber: e.target.value }))} />
            <Input label="معرف المنتج" value={formData.productId} onChange={(e) => setFormData((prev) => ({ ...prev, productId: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="الكمية" type="number" value={formData.quantity} onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))} />
            <Input label="التكلفة المقدرة" type="number" value={formData.estimatedCost} onChange={(e) => setFormData((prev) => ({ ...prev, estimatedCost: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="تاريخ البداية المخطط" type="date" value={formData.plannedStartDate} onChange={(e) => setFormData((prev) => ({ ...prev, plannedStartDate: e.target.value }))} />
            <Input label="تاريخ الانتهاء المخطط" type="date" value={formData.plannedEndDate} onChange={(e) => setFormData((prev) => ({ ...prev, plannedEndDate: e.target.value }))} />
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">مواد التصنيع المخططة</h4>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Input label={idx === 0 ? 'معرف المادة' : ''} value={line.materialId} onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, materialId: e.target.value } : l))} />
                  </div>
                  <div className="col-span-3">
                    <Input label={idx === 0 ? 'الكمية' : ''} type="number" value={String(line.plannedQuantity)} onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, plannedQuantity: Number(e.target.value) } : l))} />
                  </div>
                  <div className="col-span-3">
                    <Input label={idx === 0 ? 'سعر الوحدة' : ''} type="number" value={String(line.unitCost)} onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, unitCost: Number(e.target.value) } : l))} />
                  </div>
                  {lines.length > 1 && (
                    <div className="col-span-1">
                      <Button variant="ghost" size="sm" onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))} className="text-rose-600">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button variant="secondary" className="mt-3" onClick={() => setLines((prev) => [...prev, { materialId: '', plannedQuantity: 1, unitCost: 0 }])}>+ إضافة مادة</Button>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-200">التكلفة المقدرة (تلقائية):</span>
              <span className="font-bold text-primary-600 tabular-nums">{formatCurrency(estimatedTotal)}</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setViewing(null); }}
        title="تفاصيل أمر التشغيل"
        size="lg"
        footer={<Button variant="secondary" onClick={() => { setIsDetailOpen(false); setViewing(null); }}>إغلاق</Button>}
      >
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-slate-50 dark:bg-slate-800 rounded p-3"><span className="text-slate-500">رقم الأمر:</span><p className="font-semibold">{viewing.workOrder.orderNumber}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded p-3"><span className="text-slate-500">المنتج:</span><p className="font-semibold">{viewing.workOrder.productName || viewing.workOrder.productId}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded p-3"><span className="text-slate-500">الحالة:</span><p className="font-semibold"><StatusBadge status={viewing.workOrder.status} /></p></div>
            </div>
            <Table<WorkOrderLine>
              data={viewing.lines}
              columns={[
                { key: 'materialName', header: 'المادة' },
                { key: 'plannedQuantity', header: 'المخطط', width: '100px' },
                { key: 'actualQuantity', header: 'الفعلي', width: '100px', render: (row) => row.actualQuantity !== undefined ? formatCurrency(row.actualQuantity) : '—' },
                { key: 'unitCost', header: 'سعر الوحدة', align: 'right' as const, render: (row) => formatCurrency(row.unitCost || 0) },
              ]}
              keyExtractor={(row) => row.id}
            />
          </div>
        )}
      </Modal>

      {/* Variance Modal */}
      <Modal
        isOpen={isVarianceOpen}
        onClose={() => { setIsVarianceOpen(false); setSelectedVarianceId(null); }}
        title="تقرير تباين أمر التشغيل"
        size="lg"
        footer={<Button variant="secondary" onClick={() => { setIsVarianceOpen(false); setSelectedVarianceId(null); }}>إغلاق</Button>}
      >
        {selectedVarianceId && <VarianceTable workOrderId={selectedVarianceId} />}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="حذف أمر التشغيل"
        message="هل أنت متأكد من حذف أمر التشغيل هذا؟"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!confirmStatus}
        onClose={() => setConfirmStatus(null)}
        onConfirm={handleStatusChange}
        title="تغيير الحالة"
        message={`هل تريد تغيير الحالة إلى "${confirmStatus ? statusLabel(confirmStatus.status) : ''}"؟`}
        variant="warning"
      />
    </div>
  );
};

function VarianceTable({ workOrderId }: { workOrderId: string }) {
  const { variances, isLoading } = useWorkOrderVariance(workOrderId);
  const activeCompany = useAppStore((state) => state.activeCompany);
  const { formatCurrency } = useFormatters(activeCompany?.id || '');
  if (isLoading) return <div className="py-8 text-center text-slate-500">جارٍ التحميل...</div>;
  if (variances.length === 0) return <EmptyState title="لا يوجد تباين" description="لم يتم تسجيل فروقات لهذا الأمر" />;
  return (
    <Table
      data={variances}
      columns={[
        { key: 'materialName', header: 'المادة' },
        { key: 'plannedQty', header: 'المخطط', width: '90px' },
        { key: 'actualQty', header: 'الفعلي', width: '90px' },
        { key: 'varianceQty', header: 'الفروق', width: '90px', render: (row) => <span className={row.varianceQty > 0 ? 'text-rose-600' : row.varianceQty < 0 ? 'text-emerald-600' : ''}>{formatCurrency(row.varianceQty)}</span> },
        { key: 'plannedCost', header: 'التكلفة المخططة', align: 'right' as const, render: (row) => formatCurrency(row.plannedCost) },
        { key: 'actualCost', header: 'التكلفة الفعلية', align: 'right' as const, render: (row) => formatCurrency(row.actualCost) },
        { key: 'varianceCost', header: 'فرق التكلفة', align: 'right' as const, render: (row) => <span className={row.varianceCost > 0 ? 'text-rose-600 font-semibold' : row.varianceCost < 0 ? 'text-emerald-600 font-semibold' : ''}>{formatCurrency(row.varianceCost)}</span> },
      ]}
      keyExtractor={(row, i) => `${row.materialName}-${i}`}
    />
  );
}

function statusLabel(status: WorkOrder['status']): string {
  const labels: Record<string, string> = {
    planned: 'مخطط',
    in_progress: 'قيد التنفيذ',
    completed: 'مكتمل',
    cancelled: 'ملغى',
  };
  return labels[status] || status;
}

export default WorkOrdersPage;
