import React, { useState } from 'react';
import { ArrowRightLeft, Plus, Printer, Download, CheckSquare } from 'lucide-react';
import { Card, Button, Modal, Input, Table, Badge } from '@/core/ui/components';
import { ActionButtons } from '@/core/ui/components/ActionButtons';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { ProductSelect, WarehouseSelect } from '@/core/ui/components/smart';
import { useInventoryTransactions } from '../hooks/useInventory';
import { useAppStore } from '@/core/store';
import { useTranslation } from '@/core/i18n/useTranslation';
import { exportToExcel, exportToPDF } from '@/core/utils/exportEngine';
import { useFormatters } from '@/core/utils/useFormatters';
// import { printDocument } from '@/core/utils/printDocument';
import type { InventoryTransaction } from '../types';

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  in: { label: 'inventory.in', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  out: { label: 'inventory.out', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
  adjustment: { label: 'inventory.adjustment', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  transfer: { label: 'inventory.transfer', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
};

export const InventoryTransactionsPage: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore(state => state.activeCompany);
  const { transactions, isLoading, create, remove } = useInventoryTransactions(activeCompany?.id || '');
  const { formatCurrency } = useFormatters(activeCompany?.id || '');

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<Partial<InventoryTransaction>>({
    date: new Date().toISOString().split('T')[0],
    type: 'in',
  });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = transactions.filter(tx =>
    tx.reference?.toLowerCase().includes(search.toLowerCase()) ||
    tx.notes?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!activeCompany || !form.productId || !form.warehouseId) return;
    await create({
      companyId: activeCompany.id,
      date: form.date || new Date().toISOString().split('T')[0],
      type: form.type || 'in',
      productId: form.productId,
      warehouseId: form.warehouseId,
      quantity: Number(form.quantity) || 0,
      reference: form.reference || '',
      notes: form.notes || '',
      unitCost: Number(form.unitCost) || 0,
    });
    setIsOpen(false);
    setForm({ date: new Date().toISOString().split('T')[0], type: 'in' });
  };

  const handleExportExcel = () => {
    exportToExcel(
      filtered,
      [
        { key: 'date', header: t('inventory.date') },
        { key: 'type', header: t('inventory.type') },
        { key: 'productId', header: t('inventory.productName') },
        { key: 'warehouseId', header: t('inventory.warehouse') },
        { key: 'quantity', header: t('inventory.quantity') },
        { key: 'unitCost', header: t('inventory.costPrice') },
        { key: 'reference', header: t('inventory.reference') },
      ],
      `inventory-transactions-${new Date().toISOString().split('T')[0]}`
    );
  };

  const handleExportPDF = () => {
    exportToPDF(
      filtered,
      [
        { key: 'date', header: t('inventory.date') },
        { key: 'type', header: t('inventory.type') },
        { key: 'productId', header: t('inventory.productName') },
        { key: 'warehouseId', header: t('inventory.warehouse') },
        { key: 'quantity', header: t('inventory.quantity') },
        { key: 'reference', header: t('inventory.reference') },
      ],
      `inventory-transactions-${new Date().toISOString().split('T')[0]}`,
      {
        title: t('inventory.transactions'),
        subtitle: activeCompany?.name,
        rtl: true,
      }
    );
  };

  const handlePrint = () => {
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>${t('inventory.transactions')}</title>
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
<div class="header"><h1>${t('inventory.transactions')}</h1><p>${activeCompany?.name || ''}</p></div>
<table>
<thead><tr>
<th>${t('inventory.date')}</th>
<th>${t('inventory.type')}</th>
<th>${t('inventory.productName')}</th>
<th>${t('inventory.warehouse')}</th>
<th>${t('inventory.quantity')}</th>
<th>${t('inventory.reference')}</th>
</tr></thead>
<tbody>
${filtered.map(tx => `<tr>
<td>${tx.date}</td>
<td>${t(TYPE_CONFIG[tx.type]?.label || tx.type)}</td>
<td>${tx.productId}</td>
<td>${tx.warehouseId}</td>
<td>${tx.quantity}</td>
<td>${tx.reference}</td>
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
          <ArrowRightLeft size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('inventory.transactions')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('inventory.transactions')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder={t('search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-48"
          />
          <Button variant="secondary" size="sm" leftIcon={<Printer size={16} />} onClick={handlePrint}>
            {t('print')}
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Download size={16} />} onClick={handleExportExcel}>
            Excel
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Download size={16} />} onClick={handleExportPDF}>
            PDF
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={() => setIsOpen(true)}>
            {t('inventory.newTransaction')}
          </Button>
        </div>
      </div>

      <Card>
        {filtered.length === 0 && !isLoading ? (
          <EmptyState icon="inbox" title="لا توجد حركات" description="لم يتم تسجيل أي حركات مخزنية" />
        ) : (
          <Table<InventoryTransaction>
            data={filtered}
            columns={[
              { key: 'date', header: t('inventory.date') },
              { key: 'type', header: t('inventory.type'), render: (row) => {
                const cfg = TYPE_CONFIG[row.type] || TYPE_CONFIG.in;
                return <Badge className={cfg.color}>{t(cfg.label)}</Badge>;
              }},
              { key: 'productId', header: t('inventory.productName') },
              { key: 'warehouseId', header: t('inventory.warehouse') },
              { key: 'quantity', header: t('inventory.quantity'), align: 'right' as const },
              { key: 'unitCost', header: t('inventory.costPrice'), align: 'right' as const, render: (row) => row.unitCost !== undefined ? formatCurrency(row.unitCost) : '-' },
              { key: 'reference', header: t('inventory.reference') },
              { key: 'actions', header: '', width: '80px', render: (row) => (
                <ActionButtons
                  onView={undefined}
                  onEdit={undefined}
                  onDelete={() => setConfirmDelete(row.id)}
                  showView={false}
                  showEdit={false}
                  showPrint={false}
                  showExport={false}
                />
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
        title={t('inventory.newTransaction')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>{t('cancel')}</Button>
            <Button variant="primary" onClick={handleAdd} leftIcon={<CheckSquare size={16} />}>{t('save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">{t('inventory.type')}</label>
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={form.type || 'in'}
                onChange={e => setForm({ ...form, type: e.target.value as InventoryTransaction['type'] })}
              >
                <option value="in">{t('inventory.in')}</option>
                <option value="out">{t('inventory.out')}</option>
                <option value="adjustment">{t('inventory.adjustment')}</option>
                <option value="transfer">{t('inventory.transfer')}</option>
              </select>
            </div>
            <Input label={t('inventory.date')} type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('inventory.productName')}</label>
            <ProductSelect companyId={activeCompany?.id || ''} value={form.productId || ''} onChange={v => setForm({ ...form, productId: Array.isArray(v) ? (v[0] || '') : (v || '') })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('inventory.warehouse')}</label>
            <WarehouseSelect companyId={activeCompany?.id || ''} value={form.warehouseId || ''} onChange={v => setForm({ ...form, warehouseId: Array.isArray(v) ? (v[0] || '') : (v || '') })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('inventory.quantity')} type="number" value={String(form.quantity || '')} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} />
            <Input label={t('inventory.costPrice')} type="number" value={String(form.unitCost || '')} onChange={e => setForm({ ...form, unitCost: Number(e.target.value) })} />
          </div>
          <Input label={t('inventory.reference')} value={form.reference || ''} onChange={e => setForm({ ...form, reference: e.target.value })} />
          <Input label={t('inventory.notes')} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove(confirmDelete)}
        title={t('delete')}
        message={t('inventory.deleteConfirm')}
        variant="danger"
      />
    </div>
  );
};

export default InventoryTransactionsPage;
