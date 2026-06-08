import React, { useState } from 'react';
import { Scale, Plus, CheckSquare, BookOpen, Printer, Download, Pencil } from 'lucide-react';
import { Card, Button, Modal, Input, Table } from '@/core/ui/components';
import { ActionButtons } from '@/core/ui/components/ActionButtons';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { ProductSelect, WarehouseSelect } from '@/core/ui/components/smart';
import { useStockAdjustments } from '../hooks/useInventory';
import { useAppStore } from '@/core/store';
import { useAuthStore } from '@/modules/auth/store';
import { useTranslation } from '@/core/i18n/useTranslation';
import { postStockAdjustment } from '@/core/utils/journalEntryGenerator';
import { logAudit } from '@/core/utils/auditLogger';
import { exportToExcel, exportToPDF } from '@/core/utils/exportEngine';
import { useOwnerFilter } from '@/core/utils/useOwnerFilter';
import { OwnerFilterToggle } from '@/core/ui/components/OwnerFilterToggle';
import type { StockAdjustment } from '../types';
import { Can } from '@/core/ui/components/PermissionGate';

export const StockAdjustmentPage: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore(state => state.activeCompany);
  const user = useAuthStore((state) => state.user);
  const { adjustments, isLoading, create, approve, remove } = useStockAdjustments(activeCompany?.id || '');
  const { filtered: filteredAdjustments, showToggle: showOwnerToggle, isOwnOnly, toggleOwnOnly } = useOwnerFilter(adjustments, 'inventory');

  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState<Partial<StockAdjustment>>({
    date: new Date().toISOString().split('T')[0],
    status: 'draft',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmPost, setConfirmPost] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = filteredAdjustments.filter(a =>
    a.productId?.toLowerCase().includes(search.toLowerCase()) ||
    a.reason?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!activeCompany || !form.productId) return;
    const sys = Number(form.systemQty) || 0;
    const act = Number(form.actualQty) || 0;
    await create({
      companyId: activeCompany.id,
      date: form.date || new Date().toISOString().split('T')[0],
      productId: form.productId,
      warehouseId: form.warehouseId || '',
      systemQty: sys,
      actualQty: act,
      difference: act - sys,
      reason: form.reason || '',
      status: 'draft',
      unitCost: Number(form.unitCost) || 0,
    });
    setIsOpen(false);
    setForm({ date: new Date().toISOString().split('T')[0], status: 'draft' });
  };

  const handleUpdate = async () => {
    if (!editingId || !activeCompany) return;
    setIsEditOpen(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    setConfirmDelete(null);
  };

  const handleApprove = async (id: string) => {
    if (!user?.id) return;
    await approve(id, user.id);
    setConfirmApprove(null);
  };

  const handlePost = async (adj: StockAdjustment) => {
    if (!activeCompany?.id || adj.difference === 0) return;
    setPostingId(adj.id);
    const result = await postStockAdjustment(activeCompany.id, {
      id: adj.id,
      date: adj.date,
      product: adj.productId,
      difference: adj.difference * (adj.unitCost || 0),
      reason: adj.reason,
    });
    setPostingId(null);
    setConfirmPost(null);
    if (result.success) {
      await logAudit({
        userId: user?.id || '',
        action: 'post',
        tableName: 'stock_adjustments',
        recordId: adj.id,
        companyId: activeCompany.id,
      });
    }
  };

  const handleExportExcel = () => {
    exportToExcel(
      filtered,
      [
        { key: 'date', header: t('inventory.date') },
        { key: 'productId', header: t('inventory.productName') },
        { key: 'warehouseId', header: t('inventory.warehouse') },
        { key: 'systemQty', header: t('inventory.systemQty') },
        { key: 'actualQty', header: t('inventory.actualQty') },
        { key: 'difference', header: t('inventory.difference') },
        { key: 'reason', header: t('inventory.reason') },
        { key: 'status', header: t('inventory.status') },
      ],
      `stock-adjustments-${new Date().toISOString().split('T')[0]}`
    );
  };

  const handleExportPDF = () => {
    exportToPDF(
      filtered,
      [
        { key: 'date', header: t('inventory.date') },
        { key: 'productId', header: t('inventory.productName') },
        { key: 'warehouseId', header: t('inventory.warehouse') },
        { key: 'systemQty', header: t('inventory.systemQty') },
        { key: 'actualQty', header: t('inventory.actualQty') },
        { key: 'difference', header: t('inventory.difference') },
        { key: 'reason', header: t('inventory.reason') },
      ],
      `stock-adjustments-${new Date().toISOString().split('T')[0]}`,
      { title: t('inventory.adjustments'), subtitle: activeCompany?.name, rtl: true }
    );
  };

  const handlePrint = () => {
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>${t('inventory.adjustments')}</title>
<style>
body{font-family:'Cairo',sans-serif;padding:24px;color:#1e293b}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:#4f46e5;color:#fff;padding:10px 12px;border:1px solid #4f46e5}
td{border:1px solid #e2e8f0;padding:8px 12px}
tr:nth-child(even){background:#f8fafc}
.header{text-align:center;margin-bottom:16px}
.header h1{font-size:18px;font-weight:700;color:#4f46e5}
</style>
</head>
<body>
<div class="header"><h1>${t('inventory.adjustments')}</h1><p>${activeCompany?.name || ''}</p></div>
<table>
<thead><tr>
<th>${t('inventory.date')}</th>
<th>${t('inventory.productName')}</th>
<th>${t('inventory.warehouse')}</th>
<th>${t('inventory.systemQty')}</th>
<th>${t('inventory.actualQty')}</th>
<th>${t('inventory.difference')}</th>
<th>${t('inventory.reason')}</th>
<th>${t('inventory.status')}</th>
</tr></thead>
<tbody>
${filtered.map(a => `<tr>
<td>${a.date}</td>
<td>${a.productId}</td>
<td>${a.warehouseId}</td>
<td>${a.systemQty}</td>
<td>${a.actualQty}</td>
<td>${a.difference}</td>
<td>${a.reason}</td>
<td>${a.status}</td>
</tr>`).join('')}
</tbody>
</table>
<script>window.print()</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Scale size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('inventory.adjustments')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('inventory.adjustments')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
          <OwnerFilterToggle isOwnOnly={isOwnOnly} showToggle={showOwnerToggle} onToggle={toggleOwnOnly} />
          <Button variant="secondary" size="sm" leftIcon={<Printer size={16} />} onClick={handlePrint}>{t('print')}</Button>
          <Button variant="secondary" size="sm" leftIcon={<Download size={16} />} onClick={handleExportExcel}>Excel</Button>
          <Button variant="secondary" size="sm" leftIcon={<Download size={16} />} onClick={handleExportPDF}>PDF</Button>
          <Can action="create" module="inventory"><Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={() => setIsOpen(true)}>{t('inventory.newAdjustment')}</Button></Can>
        </div>
      </div>

      <Card>
        {filtered.length === 0 && !isLoading ? (
          <EmptyState icon="inbox" title="لا توجد تسويات" description="لم يتم إنشاء تسويات مخزنية بعد" />
        ) : (
          <Table<StockAdjustment>
            data={filtered}
            columns={[
              { key: 'date', header: t('inventory.date') },
              { key: 'productId', header: t('inventory.productName') },
              { key: 'warehouseId', header: t('inventory.warehouse') },
              { key: 'systemQty', header: t('inventory.systemQty'), align: 'right' as const },
              { key: 'actualQty', header: t('inventory.actualQty'), align: 'right' as const },
              { key: 'difference', header: t('inventory.difference'), align: 'right' as const, render: (row) => (
                <span className={row.difference > 0 ? 'text-emerald-600 font-bold' : row.difference < 0 ? 'text-rose-600 font-bold' : ''}>
                  {row.difference > 0 ? '+' : ''}{row.difference}
                </span>
              )},
              { key: 'reason', header: t('inventory.reason') },
              { key: 'status', header: t('inventory.status'), render: (row) => <StatusBadge status={row.status} /> },
              { key: 'actions', header: '', width: '140px', render: (row) => (
                <div className="flex items-center gap-1">
                  {row.status === 'draft' && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => { setForm(row); setEditingId(row.id); setIsEditOpen(true); }} title={t('edit')}>
                        <Pencil size={14} className="text-amber-600" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmApprove(row.id)} title={t('inventory.approve')}>
                        <CheckSquare size={14} className="text-blue-600" />
                      </Button>
                    </>
                  )}
                  {row.status === 'approved' && row.difference !== 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmPost(row.id)}
                      disabled={postingId === row.id}
                      title={t('inventory.post')}
                    >
                      <BookOpen size={14} className="text-emerald-600" />
                    </Button>
                  )}
                  <ActionButtons
                    onView={undefined}
                    onEdit={undefined}
                    onDelete={() => setConfirmDelete(row.id)}
                    showView={false}
                    showEdit={false}
                    showPrint={false}
                    showExport={false}
                  />
                </div>
              )},
            ]}
            keyExtractor={(row) => row.id}
            isLoading={isLoading}
            emptyMessage=""
          />
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('inventory.newAdjustment')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>{t('cancel')}</Button>
            <Button variant="primary" onClick={handleAdd} leftIcon={<CheckSquare size={16} />}>{t('save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('inventory.productName')}</label>
            <ProductSelect companyId={activeCompany?.id || ''} value={form.productId || ''} onChange={v => setForm({ ...form, productId: Array.isArray(v) ? (v[0] || '') : (v || '') })} module="inventory" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('inventory.warehouse')}</label>
            <WarehouseSelect companyId={activeCompany?.id || ''} value={form.warehouseId || ''} onChange={v => setForm({ ...form, warehouseId: Array.isArray(v) ? (v[0] || '') : (v || '') })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('inventory.systemQty')} type="number" value={String(form.systemQty || '')} onChange={e => setForm({ ...form, systemQty: Number(e.target.value) })} />
            <Input label={t('inventory.actualQty')} type="number" value={String(form.actualQty || '')} onChange={e => setForm({ ...form, actualQty: Number(e.target.value) })} />
          </div>
          <Input label={t('inventory.costPrice')} type="number" value={String(form.unitCost || '')} onChange={e => setForm({ ...form, unitCost: Number(e.target.value) })} />
          <Input label={t('inventory.reason')} value={form.reason || ''} onChange={e => setForm({ ...form, reason: e.target.value })} />
        </div>
      </Modal>

      {/* Edit Modal (simplified) */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={t('edit')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>{t('cancel')}</Button>
            <Button variant="primary" onClick={handleUpdate}>{t('save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label={t('inventory.systemQty')} type="number" value={String(form.systemQty || '')} onChange={e => setForm({ ...form, systemQty: Number(e.target.value) })} />
          <Input label={t('inventory.actualQty')} type="number" value={String(form.actualQty || '')} onChange={e => setForm({ ...form, actualQty: Number(e.target.value) })} />
          <Input label={t('inventory.reason')} value={form.reason || ''} onChange={e => setForm({ ...form, reason: e.target.value })} />
        </div>
      </Modal>

      {/* Confirm dialogs */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title={t('delete')}
        message={t('inventory.deleteConfirm')}
        variant="danger"
      />
      <ConfirmDialog
        isOpen={!!confirmApprove}
        onClose={() => setConfirmApprove(null)}
        onConfirm={() => confirmApprove && handleApprove(confirmApprove)}
        title={t('inventory.approve')}
        message="هل أنت متأكد من اعتماد هذه التسوية؟"
        variant="info"
      />
      <ConfirmDialog
        isOpen={!!confirmPost}
        onClose={() => setConfirmPost(null)}
        onConfirm={() => {
          const adj = adjustments.find(a => a.id === confirmPost);
          if (adj) handlePost(adj);
        }}
        title={t('inventory.postAdjustment')}
        message={t('inventory.postAdjustmentConfirm')}
        variant="warning"
      />
    </div>
  );
};

export default StockAdjustmentPage;
