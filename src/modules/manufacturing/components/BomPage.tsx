import React, { useState, useMemo } from 'react';
import { GitBranch, Plus, Printer, Trash2 } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { Pagination } from '@/core/ui/components/Pagination';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { Can } from '@/core/ui/components/PermissionGate';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { ActionButtons } from '@/core/ui/components/ActionButtons';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { ProductSelect } from '@/core/ui/components/smart/fields/ProductSelect';
import { useAppStore } from '@/core/store';
import { useBomsPaginated } from '../hooks/useManufacturing';
import { manufacturingApi } from '../api';
import { useFormatters } from '@/core/utils/useFormatters';
import type { BOM, BOMLine } from '../types';

interface BomFormLine {
  materialId: string;
  materialName: string;
  quantity: number;
  unitCost: number;
}

export const BomPage: React.FC = () => {
  const activeCompany = useAppStore((state) => state.activeCompany);
  const companyId = activeCompany?.id || '';
  const { items: boms, total, page, pageSize, isLoading, goToPage, changePageSize, create, update, remove } = useBomsPaginated(companyId);
  const { formatCurrency } = useFormatters(companyId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editing, setEditing] = useState<BOM | null>(null);
  const [viewing, setViewing] = useState<{ bom: BOM; lines: BOMLine[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({ productId: '', productName: '', version: '1.0', isActive: true, notes: '' });
  const [lines, setLines] = useState<BomFormLine[]>([{ materialId: '', materialName: '', quantity: 1, unitCost: 0 }]);

  const estimatedTotal = useMemo(() =>
    lines.reduce((sum, l) => sum + (l.quantity * l.unitCost), 0),
  [lines]);

  const resetForm = () => {
    setFormData({ productId: '', productName: '', version: '1.0', isActive: true, notes: '' });
    setLines([{ materialId: '', materialName: '', quantity: 1, unitCost: 0 }]);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = async (bom: BOM) => {
    setEditing(bom);
    setFormData({ productId: bom.productId, productName: bom.productName || '', version: bom.version, isActive: bom.isActive, notes: bom.notes || '' });
    const res = await manufacturingApi.getBomById(bom.id, companyId);
    if (res.success && res.data) {
      setLines(res.data.lines.map((l) => ({
        materialId: l.materialId,
        materialName: l.materialName || l.materialId,
        quantity: l.quantity,
        unitCost: l.unitCost || 0,
      })));
    } else {
      setLines([]);
    }
    setIsModalOpen(true);
  };

  const openView = async (bom: BOM) => {
    const res = await manufacturingApi.getBomById(bom.id, companyId);
    if (res.success && res.data) {
      setViewing(res.data);
      setIsDetailOpen(true);
    }
  };

  const handleSave = async () => {
    if (!formData.productId || lines.length === 0 || lines.some((l) => !l.materialId)) return;
    const payload = {
      companyId,
      productId: formData.productId,
      version: formData.version,
      isActive: formData.isActive,
      totalCost: estimatedTotal,
      notes: formData.notes || undefined,
      lines: lines.map((l) => ({ materialId: l.materialId, quantity: l.quantity, unitCost: l.unitCost })),
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

  const handlePrint = () => {
    if (!viewing) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = generateBomPrintHtml(viewing.bom, viewing.lines, formatCurrency);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const addLine = () => setLines((prev) => [...prev, { materialId: '', materialName: '', quantity: 1, unitCost: 0 }]);
  const updateLine = (index: number, field: keyof BomFormLine, value: string | number) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));

  const columns = [
    { key: 'productName', header: 'المنتج' },
    { key: 'version', header: 'الإصدار', width: '100px' },
    { key: 'lines', header: 'المواد', width: '100px', render: (_row: BOM) => _row.linesCount !== undefined ? `${_row.linesCount} مادة` : '—' },
    { key: 'totalCost', header: 'التكلفة', align: 'right' as const, render: (row: BOM) => row.totalCost !== undefined ? formatCurrency(row.totalCost) : '—' },
    { key: 'isActive', header: 'الحالة', width: '100px', render: (row: BOM) => <StatusBadge status={row.isActive ? 'active' : 'inactive'} /> },
    { key: 'actions', header: '', width: '140px', render: (row: BOM) => (
      <ActionButtons
        onView={() => openView(row)}
        onEdit={() => openEdit(row)}
        onDelete={() => setConfirmDelete(row.id)}
        showPrint={false}
      />
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">فاتير المواد</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Bill of Materials - إدارة تكوين المنتجات</p>
          </div>
        </div>
        <Can action="create" module="manufacturing">
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>
            BOM جديد
          </Button>
        </Can>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">جارٍ التحميل...</div>
        ) : boms.length === 0 ? (
          <EmptyState icon="file" title="لا توجد BOMs" description="يمكنك إضافة BOM جديد للبدء" action={
            <Can action="create" module="manufacturing">
              <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>BOM جديد</Button>
            </Can>
          } />
        ) : (
          <>
            <Table<BOM>
              data={boms}
              columns={columns}
              keyExtractor={(row) => row.id}
              emptyMessage="لا توجد BOMs"
            />
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={goToPage} onPageSizeChange={changePageSize} />
          </>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editing ? 'تعديل BOM' : 'BOM جديد'}
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
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">المنتج النهائي</label>
              <ProductSelect companyId={companyId} value={formData.productId} onChange={(v) => setFormData((prev) => ({ ...prev, productId: typeof v === 'string' ? v : '' }))} placeholder="اختر المنتج النهائي..." />
            </div>
            <Input label="الإصدار" value={formData.version} onChange={(e) => setFormData((prev) => ({ ...prev, version: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))} className="rounded" />
              <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-200">نشط</label>
            </div>
            <Input label="ملاحظات" value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} placeholder="ملاحظات اختيارية..." />
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">مواد التصنيع</h4>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <ProductSelect companyId={companyId} value={line.materialId} onChange={(v) => updateLine(idx, 'materialId', typeof v === 'string' ? v : '')} placeholder={idx === 0 ? 'اختر المادة...' : ''} />
                  </div>
                  <div className="col-span-3">
                    <Input label={idx === 0 ? 'اسم المادة' : ''} value={line.materialName} onChange={(e) => updateLine(idx, 'materialName', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Input label={idx === 0 ? 'الكمية' : ''} type="number" value={String(line.quantity)} onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))} />
                  </div>
                  <div className="col-span-2">
                    <Input label={idx === 0 ? 'سعر الوحدة' : ''} type="number" value={String(line.unitCost)} onChange={(e) => updateLine(idx, 'unitCost', Number(e.target.value))} />
                  </div>
                  {lines.length > 1 && (
                    <div className="col-span-1">
                      <Button variant="ghost" size="sm" onClick={() => removeLine(idx)} className="text-rose-600">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button variant="secondary" className="mt-3" onClick={addLine}>+ إضافة مادة</Button>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-200">التكلفة المقدرة:</span>
              <span className="font-bold text-primary-600 tabular-nums">{formatCurrency(estimatedTotal)}</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* View/Print Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setViewing(null); }}
        title="تفاصيل BOM"
        size="lg"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => { setIsDetailOpen(false); setViewing(null); }}>إغلاق</Button>
            <Button variant="primary" leftIcon={<Printer size={16} />} onClick={handlePrint}>طباعة</Button>
          </div>
        }
      >
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 dark:bg-slate-800 rounded p-3">
                <span className="text-slate-500">المنتج:</span>
                <p className="font-semibold text-slate-900 dark:text-slate-50">{viewing.bom.productName || viewing.bom.productId}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded p-3">
                <span className="text-slate-500">الإصدار:</span>
                <p className="font-semibold text-slate-900 dark:text-slate-50">{viewing.bom.version}</p>
              </div>
            </div>
            <Table<BOMLine>
              data={viewing.lines}
              columns={[
                { key: 'materialName', header: 'المادة' },
                { key: 'quantity', header: 'الكمية', width: '100px' },
                { key: 'unitCost', header: 'سعر الوحدة', align: 'right' as const, render: (row) => formatCurrency(row.unitCost || 0) },
                { key: 'totalCost', header: 'الإجمالي', align: 'right' as const, render: (row) => formatCurrency((row.quantity || 0) * (row.unitCost || 0)) },
              ]}
              keyExtractor={(row) => row.id}
            />
            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-700 dark:text-slate-200">التكلفة الإجمالية:</span>
              <span className="font-bold text-primary-600">{viewing.bom.totalCost !== undefined ? formatCurrency(viewing.bom.totalCost) : formatCurrency(estimatedTotal)}</span>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="حذف BOM"
        message="هل أنت متأكد من حذف قائمة المواد هذه؟ لا يمكن التراجع عن هذا الإجراء."
        variant="danger"
      />
    </div>
  );
};

function generateBomPrintHtml(bom: BOM, lines: BOMLine[], formatCurrency: (value: number | string) => string): string {
  const rows = lines.map((l, i) => `
    <tr>
      <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${i + 1}</td>
      <td style="padding:8px;border:1px solid #e2e8f0">${l.materialName || l.materialId}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${l.quantity}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${formatCurrency(l.unitCost || 0)}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${formatCurrency((l.quantity || 0) * (l.unitCost || 0))}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>BOM - ${bom.productName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>body{font-family:'Cairo',sans-serif;background:#f8fafc;padding:24px}.page{max-width:210mm;margin:0 auto;background:white;padding:32px;box-shadow:0 4px 6px rgba(0,0,0,0.1);border-radius:8px}h2{color:#1e40af;border-bottom:2px solid #1e40af;padding-bottom:8px}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px}th{background:#1e40af;color:white;padding:10px;border:1px solid #1e40af}td{border:1px solid #e2e8f0}.total{font-weight:700;color:#1e40af;font-size:16px;text-align:left;margin-top:12px}</style></head><body>
  <div class="page"><h2>فاتير المواد (BOM)</h2>
  <p><strong>المنتج:</strong> ${bom.productName || bom.productId}</p>
  <p><strong>الإصدار:</strong> ${bom.version}</p>
  <table><thead><tr><th>#</th><th>المادة</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="total">التكلفة الإجمالية: ${bom.totalCost !== undefined ? formatCurrency(bom.totalCost) : '—'} ر.ي</div>
  <div style="margin-top:32px;text-align:center;font-size:12px;color:#94a3b8">تم إصدار هذا المستند من نظام maghzaccount-pro</div>
  </div></body></html>`;
}

export default BomPage;
