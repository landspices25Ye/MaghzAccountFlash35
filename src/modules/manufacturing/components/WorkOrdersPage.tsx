import React, { useState, useMemo } from 'react';
import { Wrench, Plus, Trash2, ArrowRight, FileBarChart, Printer } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { Pagination } from '@/core/ui/components/Pagination';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { ActionButtons } from '@/core/ui/components/ActionButtons';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { ProductSelect } from '@/core/ui/components/smart/fields/ProductSelect';
import { useAppStore } from '@/core/store';
import { useWorkOrdersPaginated, useWorkOrderVariance } from '../hooks/useManufacturing';
import { manufacturingApi } from '../api';
import { useFormatters } from '@/core/utils/useFormatters';
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
  const [statusFilter, setStatusFilter] = useState('');
  const filters = useMemo(() => ({ status: statusFilter || undefined }), [statusFilter]);
  const { items: workOrders, total, page, pageSize, isLoading, goToPage, changePageSize, create, update, remove, changeStatus } = useWorkOrdersPaginated(companyId, filters);
  const { formatCurrency } = useFormatters(companyId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isVarianceOpen, setIsVarianceOpen] = useState(false);
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [viewing, setViewing] = useState<{ workOrder: WorkOrder; lines: WorkOrderLine[] } | null>(null);
  const [selectedVarianceId, setSelectedVarianceId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<{ id: string; status: WorkOrder['status'] } | null>(null);
  const [producedQty, setProducedQty] = useState('');
  const [isEditingActual, setIsEditingActual] = useState(false);

  const [formData, setFormData] = useState({ orderNumber: '', productId: '', bomId: '', quantity: '', plannedStartDate: '', plannedEndDate: '', totalCost: '', notes: '' });
  const [availableBoms, setAvailableBoms] = useState<{ id: string; version: string; totalCost?: number }[]>([]);
  const [lines, setLines] = useState<WorkOrderFormLine[]>([{ materialId: '', plannedQuantity: 1, unitCost: 0 }]);

  const estimatedTotal = useMemo(() =>
    lines.reduce((sum, l) => sum + (l.plannedQuantity * l.unitCost), 0),
  [lines]);

  const resetForm = () => {
    setFormData({ orderNumber: '', productId: '', bomId: '', quantity: '', plannedStartDate: '', plannedEndDate: '', totalCost: '', notes: '' });
    setAvailableBoms([]);
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
      bomId: wo.bomId || '',
      quantity: String(wo.quantity),
      plannedStartDate: wo.plannedStartDate || '',
      plannedEndDate: wo.plannedEndDate || '',
      totalCost: String(wo.totalCost || ''),
      notes: wo.notes || '',
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
      bomId: formData.bomId || undefined,
      quantity: Number(formData.quantity) || 0,
      status: (editing ? editing.status : 'planned') as WorkOrder['status'],
      plannedStartDate: formData.plannedStartDate || undefined,
      plannedEndDate: formData.plannedEndDate || undefined,
      totalCost: Number(formData.totalCost) || estimatedTotal || undefined,
      notes: formData.notes || undefined,
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
    if (confirmStatus.status === 'completed' && producedQty) {
      await update(confirmStatus.id, { producedQuantity: Number(producedQty) });
    }
    await changeStatus(confirmStatus.id, confirmStatus.status);
    setConfirmStatus(null);
    setProducedQty('');
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
    { key: 'totalCost', header: 'التكلفة', align: 'right' as const, render: (row: WorkOrder) => row.totalCost !== undefined ? formatCurrency(row.totalCost) : '—' },
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
        <div className="flex items-center gap-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} title="تصفية حسب الحالة" aria-label="تصفية حسب الحالة" className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm">
            <option value="">الكل</option>
            <option value="planned">مخطط</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="completed">مكتمل</option>
            <option value="cancelled">ملغى</option>
          </select>
          <Can action="create" module="manufacturing">
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>
              أمر تشغيل جديد
            </Button>
          </Can>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">جارٍ التحميل...</div>
        ) : workOrders.length === 0 ? (
          <EmptyState icon="file" title="لا توجد أوامر تشغيل" description="يمكنك إضافة أمر تشغيل جديد" action={
            <Can action="create" module="manufacturing">
              <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>أمر تشغيل جديد</Button>
            </Can>
          } />
        ) : (
          <>
            <Table<WorkOrder>
              data={workOrders}
              columns={columns}
              keyExtractor={(row) => row.id}
              emptyMessage="لا توجد أوامر تشغيل"
            />
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={goToPage} onPageSizeChange={changePageSize} />
          </>
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
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">المنتج</label>
              <ProductSelect companyId={companyId} value={formData.productId} onChange={async (v) => {
                const productId = typeof v === 'string' ? v : '';
                setFormData((prev) => ({ ...prev, productId, bomId: '' }));
                if (productId) {
                  const res = await manufacturingApi.getBoms(companyId);
                  if (res.success && res.data) setAvailableBoms(res.data.filter((b) => b.productId === productId));
                  else setAvailableBoms([]);
                } else {
                  setAvailableBoms([]);
                }
              }} placeholder="اختر المنتج..." />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">BOM</label>
              <select value={formData.bomId} onChange={(e) => setFormData((prev) => ({ ...prev, bomId: e.target.value }))} disabled={availableBoms.length === 0} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm">
                <option value="">{availableBoms.length === 0 ? 'لا يوجد BOM' : 'بدون BOM'}</option>
                {availableBoms.map((b) => (
                  <option key={b.id} value={b.id}>الإصدار {b.version}</option>
                ))}
              </select>
            </div>
            <Input label="الكمية" type="number" value={formData.quantity} onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))} />
            <Input label="التكلفة الإجمالية" type="number" value={formData.totalCost} onChange={(e) => setFormData((prev) => ({ ...prev, totalCost: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="تاريخ البداية المخطط" type="date" value={formData.plannedStartDate} onChange={(e) => setFormData((prev) => ({ ...prev, plannedStartDate: e.target.value }))} />
            <Input label="تاريخ الانتهاء المخطط" type="date" value={formData.plannedEndDate} onChange={(e) => setFormData((prev) => ({ ...prev, plannedEndDate: e.target.value }))} />
          </div>
          <Input label="ملاحظات" value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} placeholder="ملاحظات اختيارية..." />

          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">مواد التصنيع المخططة</h4>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <ProductSelect companyId={companyId} value={line.materialId} onChange={(v) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, materialId: typeof v === 'string' ? v : '' } : l))} placeholder={idx === 0 ? 'اختر المادة...' : ''} />
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
        onClose={() => { setIsDetailOpen(false); setViewing(null); setIsEditingActual(false); }}
        title="تفاصيل أمر التشغيل"
        size="lg"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            {(viewing?.workOrder.status === 'in_progress' || viewing?.workOrder.status === 'completed') && (
              <Button variant={isEditingActual ? 'primary' : 'secondary'} onClick={async () => {
                if (isEditingActual && viewing) {
                  for (const line of viewing.lines) {
                    const input = document.getElementById(`actual-qty-${line.id}`) as HTMLInputElement;
                    const costInput = document.getElementById(`actual-cost-${line.id}`) as HTMLInputElement;
                    if (input) {
                      await manufacturingApi.updateConsumption(line.id, {
                        actualQuantity: Number(input.value) || 0,
                        actualUnitCost: costInput ? Number(costInput.value) || line.unitCost : line.unitCost,
                      });
                    }
                  }
                  const res = await manufacturingApi.getWorkOrderById(viewing.workOrder.id, companyId);
                  if (res.success && res.data) setViewing(res.data);
                  setIsEditingActual(false);
                } else {
                  setIsEditingActual(true);
                }
              }}>
                {isEditingActual ? 'حفظ الفعلي' : 'تسجيل الفعلي'}
              </Button>
            )}
            <Button variant="secondary" leftIcon={<Printer size={16} />} onClick={() => {
              if (!viewing) return;
              const win = window.open('', '_blank');
              if (!win) return;
              const rows = viewing.lines.map((l, i) => `<tr><td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${i + 1}</td><td style="padding:8px;border:1px solid #e2e8f0">${l.materialName || l.materialId}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${l.plannedQuantity}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${l.actualQuantity ?? '—'}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${formatCurrency(l.unitCost)}</td></tr>`).join('');
              win.document.open();
              win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>أمر تشغيل ${viewing.workOrder.orderNumber}</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:'Cairo',sans-serif;background:#f8fafc;padding:24px}.page{max-width:210mm;margin:0 auto;background:white;padding:32px;box-shadow:0 4px 6px rgba(0,0,0,0.1);border-radius:8px}h2{color:#1e40af;border-bottom:2px solid #1e40af;padding-bottom:8px}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px}th{background:#1e40af;color:white;padding:10px;border:1px solid #1e40af}</style></head><body><div class="page"><h2>أمر تشغيل #${viewing.workOrder.orderNumber}</h2><p><strong>المنتج:</strong> ${viewing.workOrder.productName || viewing.workOrder.productId}</p><p><strong>الحالة:</strong> ${viewing.workOrder.status}</p><p><strong>الكمية المخططة:</strong> ${viewing.workOrder.quantity}</p><table><thead><tr><th>#</th><th>المادة</th><th>المخطط</th><th>الفعلي</th><th>سعر الوحدة</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:32px;text-align:center;font-size:12px;color:#94a3b8">تم إصدار هذا المستند من نظام maghzaccount-pro</div></div></body></html>`);
              win.document.close();
            }}>طباعة</Button>
            <Button variant="secondary" onClick={() => { setIsDetailOpen(false); setViewing(null); setIsEditingActual(false); }}>إغلاق</Button>
          </div>
        }
      >
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-slate-50 dark:bg-slate-800 rounded p-3"><span className="text-slate-500">رقم الأمر:</span><p className="font-semibold">{viewing.workOrder.orderNumber}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded p-3"><span className="text-slate-500">المنتج:</span><p className="font-semibold">{viewing.workOrder.productName || viewing.workOrder.productId}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded p-3"><span className="text-slate-500">الحالة:</span><p className="font-semibold"><StatusBadge status={viewing.workOrder.status} /></p></div>
            </div>
            {viewing.workOrder.notes && (
              <div className="bg-slate-50 dark:bg-slate-800 rounded p-3 text-sm">
                <span className="text-slate-500">ملاحظات:</span>
                <p className="mt-1 text-slate-700 dark:text-slate-300">{viewing.workOrder.notes}</p>
              </div>
            )}
            <Table<WorkOrderLine>
              data={viewing.lines}
              columns={[
                { key: 'materialName', header: 'المادة' },
                { key: 'plannedQuantity', header: 'المخطط', width: '100px' },
                {
                  key: 'actualQuantity',
                  header: 'الفعلي',
                  width: '120px',
                  render: (row) => isEditingActual && (viewing.workOrder.status === 'in_progress' || viewing.workOrder.status === 'completed')
                    ? <input id={`actual-qty-${row.id}`} type="number" defaultValue={row.actualQuantity ?? 0} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm" />
                    : row.actualQuantity !== undefined && row.actualQuantity !== null && Number(row.actualQuantity) > 0
                      ? formatCurrency(row.actualQuantity)
                      : '—',
                },
                { key: 'unitCost', header: 'سعر الوحدة', align: 'right' as const, render: (row) => formatCurrency(row.unitCost || 0) },
                {
                  key: 'actualUnitCost',
                  header: 'سعر الفعلي',
                  align: 'right' as const,
                  width: '120px',
                  render: (row) => isEditingActual && (viewing.workOrder.status === 'in_progress' || viewing.workOrder.status === 'completed')
                    ? <input id={`actual-cost-${row.id}`} type="number" defaultValue={row.actualUnitCost ?? row.unitCost} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm" />
                    : row.actualUnitCost !== undefined && row.actualUnitCost !== null && Number(row.actualUnitCost) > 0
                      ? formatCurrency(row.actualUnitCost)
                      : '—',
                },
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
        {selectedVarianceId && <VarianceTable workOrderId={selectedVarianceId} companyId={companyId} />}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="حذف أمر التشغيل"
        message="هل أنت متأكد من حذف أمر التشغيل هذا؟"
        variant="danger"
      />

      {/* Status Change Modal */}
      <Modal
        isOpen={!!confirmStatus}
        onClose={() => { setConfirmStatus(null); setProducedQty(''); }}
        title="تغيير الحالة"
        size="sm"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => { setConfirmStatus(null); setProducedQty(''); }}>إلغاء</Button>
            <Button variant="primary" onClick={handleStatusChange}>
              {confirmStatus?.status === 'in_progress' ? 'بدء التنفيذ' : confirmStatus?.status === 'completed' ? 'إكمال' : 'تأكيد'}
            </Button>
          </div>
        }
      >
        {confirmStatus && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              هل تريد تغيير الحالة إلى <span className="font-semibold">"{statusLabel(confirmStatus.status)}"</span>؟
            </p>
            {confirmStatus.status === 'completed' && (
              <div>
                <Input
                  label="الكمية المنتجة الفعلية"
                  type="number"
                  value={producedQty}
                  onChange={(e) => setProducedQty(e.target.value)}
                  placeholder="أدخل الكمية الفعلية..."
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

function VarianceTable({ workOrderId, companyId }: { workOrderId: string; companyId: string }) {
  const { variances, isLoading } = useWorkOrderVariance(workOrderId, companyId);
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
