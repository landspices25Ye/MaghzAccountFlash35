import React, { useState, useMemo, useCallback } from 'react';
import { FileText, Plus, CheckSquare, BookOpen, Trash2, Printer } from 'lucide-react';
import { printDocument } from '@/core/utils/printDocument';
import { exportToExcel, exportToPDF } from '@/core/utils/exportEngine';
import { useDocumentSequence } from '@/core/utils/useDocumentSequence';
import { useSettings } from '@/core/utils/useSettings';
import { logAudit } from '@/core/utils/auditLogger';
import { Card, Button, Modal, Input } from '@/core/ui/components';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { ActionButtons } from '@/core/ui/components/ActionButtons';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { DataTablePro } from '@/core/ui/components/DataTablePro';
import { SupplierSelect, ProductSelect } from '@/core/ui/components/smart';
import { useTranslation } from '@/core/i18n/useTranslation';
import { usePurchaseInvoices } from '../hooks/usePurchases';
import { usePurchaseOrders } from '../hooks/usePurchases';
import { useAppStore } from '@/core/store';
import { useAuthStore } from '@/modules/auth/store';
import { postPurchaseInvoice } from '@/core/utils/journalEntryGenerator';
import { useBranchFilter } from '@/core/utils/useBranchFilter';
import type { PurchaseInvoice } from '../types';
import type { ColumnDef } from '@tanstack/react-table';

interface InvoiceFormLine {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  vatPercent: number;
  lineTotal: number;
}

interface InvoiceForm {
  supplierId: string;
  purchaseOrderId: string;
  date: string;
  dueDate: string;
  notes: string;
  lines: InvoiceFormLine[];
}

const initialLine = (): InvoiceFormLine => ({
  productId: '',
  description: '',
  quantity: 1,
  unitPrice: 0,
  discountPercent: 0,
  vatPercent: 15,
  lineTotal: 0,
});

const initialForm = (): InvoiceForm => ({
  supplierId: '',
  purchaseOrderId: '',
  date: new Date().toISOString().split('T')[0],
  dueDate: new Date().toISOString().split('T')[0],
  notes: '',
  lines: [initialLine()],
});

export const PurchaseInvoicesPage: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore(state => state.activeCompany);
  const user = useAuthStore(state => state.user);
  const { invoices, isLoading, create, update, remove, post } = usePurchaseInvoices(activeCompany?.id || '');
  const { orders } = usePurchaseOrders(activeCompany?.id || '');
  const { settings } = useSettings(activeCompany?.id || '');
  const { getNextNumber } = useDocumentSequence();
  const filteredInvoices = useBranchFilter(invoices);
  const currencySymbol = settings?.defaultCurrency || activeCompany?.currency || 'YER';

  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InvoiceForm>(initialForm());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmPost, setConfirmPost] = useState<string | null>(null);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);

  const vatRate = settings?.vatRate ?? 15;

  const calculateLine = useCallback((line: InvoiceFormLine): InvoiceFormLine => {
    const gross = line.quantity * line.unitPrice;
    const discount = gross * (line.discountPercent / 100);
    const net = gross - discount;
    const vat = net * (line.vatPercent / 100);
    const total = net + vat;
    return { ...line, lineTotal: Number(total.toFixed(2)) };
  }, []);

  const formTotals = useMemo(() => {
    const subtotal = form.lines.reduce((s, l) => s + (l.quantity * l.unitPrice * (1 - l.discountPercent / 100)), 0);
    const vatAmount = form.lines.reduce((s, l) => {
      const net = l.quantity * l.unitPrice * (1 - l.discountPercent / 100);
      return s + net * (l.vatPercent / 100);
    }, 0);
    const totalAmount = subtotal + vatAmount;
    return { subtotal: Number(subtotal.toFixed(2)), vatAmount: Number(vatAmount.toFixed(2)), totalAmount: Number(totalAmount.toFixed(2)) };
  }, [form.lines]);

  const updateLine = useCallback((idx: number, patch: Partial<InvoiceFormLine>) => {
    setForm(prev => {
      const newLines = [...prev.lines];
      newLines[idx] = calculateLine({ ...newLines[idx], ...patch });
      return { ...prev, lines: newLines };
    });
  }, [calculateLine]);

  const addLine = useCallback(() => {
    setForm(prev => ({ ...prev, lines: [...prev.lines, { ...initialLine(), vatPercent: vatRate }] }));
  }, [vatRate]);

  const removeLine = useCallback((idx: number) => {
    setForm(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }));
  }, []);

  const openCreate = useCallback(async () => {
    setEditingId(null);
    setForm({ ...initialForm(), lines: [{ ...initialLine(), vatPercent: vatRate }] });
    if (activeCompany?.id) {
      const seq = await getNextNumber('purchase_invoice', activeCompany.id);
      if (seq.success && seq.number) {
        setForm(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
      }
    }
    setModalOpen(true);
  }, [activeCompany?.id, getNextNumber, vatRate]);

  const openEdit = useCallback((invoice: PurchaseInvoice) => {
    setEditingId(invoice.id);
    setForm({
      supplierId: invoice.supplierId,
      purchaseOrderId: invoice.purchaseOrderId || '',
      date: invoice.date,
      dueDate: invoice.dueDate || invoice.date,
      notes: invoice.notes || '',
      lines: invoice.lines.length > 0
        ? invoice.lines.map(l => ({
            productId: l.productId || '',
            description: l.description || '',
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPercent: l.discountPercent || 0,
            vatPercent: l.vatPercent || vatRate,
            lineTotal: l.lineTotal,
          }))
        : [initialLine()],
    });
    setModalOpen(true);
  }, [vatRate]);

  const openView = useCallback((invoice: PurchaseInvoice) => {
    setSelectedInvoice(invoice);
    setViewModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!activeCompany?.id || !form.supplierId) return;
    const payload = {
      companyId: activeCompany.id,
      invoiceNumber: editingId ? (invoices.find(i => i.id === editingId)?.invoiceNumber || '') : `PINV-${Date.now()}`,
      supplierId: form.supplierId,
      purchaseOrderId: form.purchaseOrderId || undefined,
      date: form.date,
      dueDate: form.dueDate,
      subtotal: formTotals.subtotal,
      discountAmount: 0,
      vatAmount: formTotals.vatAmount,
      totalAmount: formTotals.totalAmount,
      paidAmount: 0,
      status: 'draft' as const,
      notes: form.notes,
      lines: form.lines.map(l => ({
        productId: l.productId,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPercent: l.discountPercent,
        vatPercent: l.vatPercent,
        lineTotal: l.lineTotal,
      })),
    };

    if (editingId) {
      await update(editingId, payload);
      await logAudit({
        userId: user?.id || '',
        action: 'update',
        tableName: 'purchase_invoices',
        recordId: editingId,
        companyId: activeCompany.id,
      });
    } else {
      const seq = await getNextNumber('purchase_invoice', activeCompany.id);
      if (seq.success && seq.number) {
        payload.invoiceNumber = seq.number;
      }
      const result = await create(payload);
      if (result.success && result.id) {
        await logAudit({
          userId: user?.id || '',
          action: 'create',
          tableName: 'purchase_invoices',
          recordId: result.id,
          companyId: activeCompany.id,
        });
      }
    }
    setModalOpen(false);
    setEditingId(null);
    setForm(initialForm());
  }, [activeCompany, form, formTotals, editingId, invoices, create, update, user, getNextNumber]);

  const handleDelete = useCallback(async (id: string) => {
    setConfirmDelete(id);
  }, []);

  const confirmDeleteAction = useCallback(async () => {
    if (!confirmDelete || !activeCompany?.id) return;
    await remove(confirmDelete);
    await logAudit({
      userId: user?.id || '',
      action: 'delete',
      tableName: 'purchase_invoices',
      recordId: confirmDelete,
      companyId: activeCompany.id,
    });
    setConfirmDelete(null);
  }, [confirmDelete, activeCompany, remove, user]);

  const handlePost = useCallback(async (invoice: PurchaseInvoice) => {
    setConfirmPost(invoice.id);
  }, []);

  const confirmPostAction = useCallback(async () => {
    if (!confirmPost || !activeCompany?.id) return;
    setPostingId(confirmPost);
    const invoice = invoices.find(i => i.id === confirmPost);
    if (!invoice) return;

    const result = await postPurchaseInvoice(activeCompany.id, {
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date,
      supplierId: invoice.supplierId,
      subtotal: invoice.subtotal,
      vatAmount: invoice.vatAmount,
      totalAmount: invoice.totalAmount,
    });

    if (result.success) {
      await post(confirmPost);
      await logAudit({
        userId: user?.id || '',
        action: 'post',
        tableName: 'purchase_invoices',
        recordId: confirmPost,
        companyId: activeCompany.id,
      });
    }
    setPostingId(null);
    setConfirmPost(null);
  }, [confirmPost, activeCompany, invoices, post, user]);

  const handlePrint = useCallback((invoice: PurchaseInvoice) => {
    printDocument({
      type: 'purchase-invoice',
      docNumber: invoice.invoiceNumber,
      date: invoice.date,
      dueDate: invoice.dueDate,
      partyName: invoice.supplier?.name || invoice.supplierId,
      partyLabel: t('purchases.supplier'),
      lines: invoice.lines.map(l => ({
        description: l.description || l.productId || t('inventory.productName'),
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        total: l.lineTotal,
      })),
      subtotal: invoice.subtotal,
      vatAmount: invoice.vatAmount,
      totalAmount: invoice.totalAmount,
      notes: invoice.notes,
      companyName: activeCompany?.name,
      currency: currencySymbol,
    });
  }, [activeCompany, t, currencySymbol]);

  const handleExportExcel = useCallback(() => {
    exportToExcel(filteredInvoices, [
      { key: 'invoiceNumber', header: t('purchases.invoiceNumber'), width: 20 },
      { key: 'supplierName', header: t('purchases.supplier'), width: 25 },
      { key: 'date', header: t('purchases.date'), width: 15 },
      { key: 'subtotal', header: t('purchases.subtotal'), width: 15 },
      { key: 'vatAmount', header: t('purchases.vat'), width: 15 },
      { key: 'totalAmount', header: t('purchases.total'), width: 15 },
      { key: 'status', header: t('purchases.status'), width: 15 },
    ], 'purchase_invoices');
  }, [invoices, t]);

  const handleExportPdf = useCallback(() => {
    exportToPDF(filteredInvoices, [
      { key: 'invoiceNumber', header: t('purchases.invoiceNumber') },
      { key: 'supplierName', header: t('purchases.supplier') },
      { key: 'date', header: t('purchases.date') },
      { key: 'subtotal', header: t('purchases.subtotal') },
      { key: 'totalAmount', header: t('purchases.total') },
      { key: 'status', header: t('purchases.status') },
    ], 'purchase_invoices', {
      title: t('purchases.invoices'),
      rtl: true,
      companyName: activeCompany?.name,
    });
  }, [invoices, t, activeCompany]);

  const columns = useMemo<ColumnDef<PurchaseInvoice>[]>(() => [
    {
      accessorKey: 'invoiceNumber',
      header: t('purchases.invoiceNumber'),
      cell: ({ row }) => <span className="font-medium text-slate-900 dark:text-slate-100">{row.original.invoiceNumber}</span>,
    },
    {
      accessorKey: 'supplier',
      header: t('purchases.supplier'),
      cell: ({ row }) => <span>{row.original.supplier?.name || row.original.supplierId}</span>,
    },
    {
      accessorKey: 'date',
      header: t('purchases.date'),
      cell: ({ row }) => <span>{row.original.date}</span>,
    },
    {
      accessorKey: 'totalAmount',
      header: t('purchases.total'),
      cell: ({ row }) => <span className="text-slate-900 dark:text-slate-100 font-medium">{Number(row.original.totalAmount).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>,
    },
    {
      accessorKey: 'status',
      header: t('purchases.status'),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'actions',
      header: t('purchases.actions'),
      cell: ({ row }) => {
        const inv = row.original;
        const isPosting = postingId === inv.id;
        return (
          <div className="flex items-center gap-1">
            <ActionButtons
              onView={() => openView(inv)}
              onEdit={inv.status === 'draft' ? () => openEdit(inv) : undefined}
              onDelete={inv.status === 'draft' ? () => handleDelete(inv.id) : undefined}
              onPrint={() => handlePrint(inv)}
              onExport={undefined}
              showView
              showEdit={inv.status === 'draft'}
              showDelete={inv.status === 'draft'}
              showPrint
              showExport={false}
              disabled={isPosting}
            />
            {inv.status === 'draft' && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<CheckSquare size={14} />}
                onClick={() => handlePost(inv)}
                disabled={isPosting}
                className="mr-1"
              >
                {isPosting ? t('loading') : t('accounting.post')}
              </Button>
            )}
            {inv.status !== 'draft' && (
              <span className="text-xs text-slate-400 flex items-center gap-1 mr-2">
                <BookOpen size={12} /> {t('accounting.posted')}
              </span>
            )}
          </div>
        );
      },
    },
  ], [t, postingId, openView, openEdit, handleDelete, handlePrint, handlePost]);

  const canSave = form.supplierId && form.lines.length > 0 && form.lines.every(l => l.productId && l.quantity > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('purchases.invoices')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('purchases.invoicesSubtitle')}</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>
          {t('purchases.invoice.create')}
        </Button>
      </div>

      <Card>
        <DataTablePro<PurchaseInvoice>
          data={filteredInvoices}
          columns={columns}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage={t('purchases.invoice.emptyTitle')}
          title={t('purchases.invoices')}
          onExportExcel={handleExportExcel}
          onExportPdf={handleExportPdf}
          onPrint={() => window.print()}
          searchable
          searchPlaceholder={t('search') + '...'}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        title={editingId ? t('purchases.invoice.edit') : t('purchases.invoice.new')}
        onClose={() => { setModalOpen(false); setEditingId(null); setForm(initialForm()); }}
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditingId(null); setForm(initialForm()); }}>
              {t('cancel')}
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!canSave} leftIcon={<CheckSquare size={16} />}>
              {editingId ? t('save') : t('create')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('purchases.supplier')}</label>
              <SupplierSelect companyId={activeCompany?.id || ''} value={form.supplierId} onChange={v => setForm(prev => ({ ...prev, supplierId: v || '' }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('purchases.invoice.linkOrder')}</label>
              <select
                className="form-control w-full"
                value={form.purchaseOrderId}
                onChange={e => setForm(prev => ({ ...prev, purchaseOrderId: e.target.value }))}
              >
                <option value="">{t('all')}</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>{o.orderNumber} - {o.supplier?.name || o.supplierId}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('purchases.date')} type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} />
            <Input label={t('purchases.dueDate')} type="date" value={form.dueDate} onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))} />
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">{t('purchases.invoice.lines')}</h4>
              <Button size="sm" variant="secondary" onClick={addLine} leftIcon={<Plus size={14} />}>
                {t('purchases.invoice.addLine')}
              </Button>
            </div>
            {form.lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  <label className="text-xs text-slate-500">{t('inventory.productName')}</label>
                  <ProductSelect companyId={activeCompany?.id || ''} value={line.productId} onChange={v => updateLine(idx, { productId: Array.isArray(v) ? (v[0] || '') : (v || '') })} size="sm" />
                </div>
                <div className="col-span-2">
                  <Input type="text" placeholder={t('description')} value={line.description} onChange={e => updateLine(idx, { description: e.target.value })} />
                </div>
                <div className="col-span-1">
                  <Input type="number" placeholder={t('inventory.quantity')} value={String(line.quantity)} onChange={e => updateLine(idx, { quantity: Number(e.target.value) })} />
                </div>
                <div className="col-span-2">
                  <Input type="number" placeholder={t('inventory.unitPrice')} value={String(line.unitPrice)} onChange={e => updateLine(idx, { unitPrice: Number(e.target.value) })} />
                </div>
                <div className="col-span-2">
                  <Input type="number" placeholder={t('purchases.vat') + '%'} value={String(line.vatPercent)} onChange={e => updateLine(idx, { vatPercent: Number(e.target.value) })} />
                </div>
                <div className="col-span-1 text-sm font-medium text-slate-700 dark:text-slate-200 text-center">
                  {line.lineTotal.toLocaleString('ar-SA')}
                </div>
                <div className="col-span-1">
                  <Button size="sm" variant="ghost" onClick={() => removeLine(idx)} leftIcon={<Trash2 size={14} className="text-rose-500" />} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label={t('notes')} value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} />
          </div>

          <div className="flex justify-between text-sm border-t border-slate-200 dark:border-slate-700 pt-3">
            <span className="text-slate-500">{t('purchases.vat')}: {vatRate}%</span>
            <div className="space-y-1 text-end">
              <p>{t('purchases.subtotal')}: <strong>{formTotals.subtotal.toLocaleString('ar-SA')}</strong></p>
              <p>{t('purchases.vat')}: <strong>{formTotals.vatAmount.toLocaleString('ar-SA')}</strong></p>
              <p className="text-lg font-bold text-primary-600">{t('purchases.total')}: {formTotals.totalAmount.toLocaleString('ar-SA')}</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={viewModalOpen}
        title={t('purchases.invoice.details')}
        onClose={() => setViewModalOpen(false)}
        size="lg"
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">{t('purchases.invoiceNumber')}:</span> <strong>{selectedInvoice.invoiceNumber}</strong></div>
              <div><span className="text-slate-500">{t('purchases.supplier')}:</span> <strong>{selectedInvoice.supplier?.name || selectedInvoice.supplierId}</strong></div>
              <div><span className="text-slate-500">{t('purchases.date')}:</span> {selectedInvoice.date}</div>
              <div><span className="text-slate-500">{t('purchases.dueDate')}:</span> {selectedInvoice.dueDate}</div>
              <div><span className="text-slate-500">{t('purchases.status')}:</span> <StatusBadge status={selectedInvoice.status} /></div>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="p-2 text-right">#</th>
                    <th className="p-2 text-right">{t('inventory.productName')}</th>
                    <th className="p-2 text-right">{t('inventory.quantity')}</th>
                    <th className="p-2 text-right">{t('inventory.unitPrice')}</th>
                    <th className="p-2 text-right">{t('purchases.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.lines.map((line, idx) => (
                    <tr key={idx} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2">{line.description || line.productId}</td>
                      <td className="p-2">{line.quantity}</td>
                      <td className="p-2">{line.unitPrice.toLocaleString('ar-SA')}</td>
                      <td className="p-2 font-medium">{line.lineTotal.toLocaleString('ar-SA')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-4 text-sm">
              <span>{t('purchases.subtotal')}: <strong>{selectedInvoice.subtotal.toLocaleString('ar-SA')}</strong></span>
              <span>{t('purchases.vat')}: <strong>{selectedInvoice.vatAmount.toLocaleString('ar-SA')}</strong></span>
              <span className="text-primary-600 font-bold">{t('purchases.total')}: {selectedInvoice.totalAmount.toLocaleString('ar-SA')}</span>
            </div>
            {selectedInvoice.notes && (
              <div className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                {t('notes')}: {selectedInvoice.notes}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setViewModalOpen(false)}>{t('close')}</Button>
              <Button variant="primary" leftIcon={<Printer size={16} />} onClick={() => handlePrint(selectedInvoice)}>{t('print')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteAction}
        title={t('purchases.invoice.deleteTitle')}
        message={t('purchases.invoice.deleteConfirm')}
        variant="danger"
      />

      {/* Confirm Post */}
      <ConfirmDialog
        isOpen={!!confirmPost}
        onClose={() => setConfirmPost(null)}
        onConfirm={confirmPostAction}
        title={t('purchases.invoice.postTitle')}
        message={t('purchases.invoice.postConfirm')}
        variant="warning"
      />
    </div>
  );
};

export default PurchaseInvoicesPage;
