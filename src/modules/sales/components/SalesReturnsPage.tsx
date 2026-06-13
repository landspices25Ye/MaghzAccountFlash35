import React, { useState, useMemo, useCallback } from 'react';
import { Undo2, Plus, CheckSquare, Trash2, Printer, FileText, Package, BookOpen } from 'lucide-react';
import { Card, Button, Table, Input, Modal, Pagination, Can } from '@/core/ui/components';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { ActionButtons } from '@/core/ui/components/ActionButtons';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { CustomerSelect, ProductSelect } from '@/core/ui/components/smart';
import { useReturnsPaginated, useInvoices } from '../hooks/useSales';
import { useAppStore } from '@/core/store';
import { useAuthStore } from '@/modules/auth/store';
import { useTranslation } from '@/core/i18n/useTranslation';
import { useFormatters } from '@/core/utils/useFormatters';
import { YER_CODE } from '@/core/utils/currencyConverter';
import { useDocumentSequence } from '@/core/utils/useDocumentSequence';
import { printDocument } from '@/core/utils/printDocument';
import { exportToExcel } from '@/core/utils/exportEngine';
import { postSalesReturn } from '@/core/utils/journalEntryGenerator';
import { logAudit } from '@/core/utils/auditLogger';
import { useToastStore } from '@/core/store/toastStore';
import { useOwnerFilter } from '@/core/utils/useOwnerFilter';
import { OwnerFilterToggle } from '@/core/ui/components/OwnerFilterToggle';
import type { SalesReturn } from '../types';

interface ReturnLineForm {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export const SalesReturnsPage: React.FC = () => {
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const activeCompany = useAppStore(state => state.activeCompany);
  const currentUser = useAuthStore(state => state.user);
  const { showToggle: showOwnerToggle, isOwnOnly, toggleOwnOnly } = useOwnerFilter([], 'sales');
  const {
    returns,
    total,
    page,
    pageSize,
    isLoading: returnsLoading,
    goToPage,
    changePageSize,
    create,
    update,
    remove,
    post,
  } = useReturnsPaginated(activeCompany?.id || '');
  const { invoices } = useInvoices(activeCompany?.id || '');
  const { getNextNumber } = useDocumentSequence();
  const { formatCurrency } = useFormatters(activeCompany?.id || '');

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<SalesReturn | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning' | 'info'; confirmText?: string } | null>(null);

  const [postingId, setPostingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [header, setHeader] = useState({ invoiceId: '', customerId: '', date: new Date().toISOString().split('T')[0], reason: '', notes: '' });
  const [lines, setLines] = useState<ReturnLineForm[]>([{ productId: '', productName: '', quantity: 1, unitPrice: 0 }]);

  const defaultLine = (): ReturnLineForm => ({ productId: '', productName: '', quantity: 1, unitPrice: 0 });

  const resetForm = useCallback(() => {
    setHeader({ invoiceId: '', customerId: '', date: new Date().toISOString().split('T')[0], reason: '', notes: '' });
    setLines([defaultLine()]);
    setEditingId(null);
  }, []);

  const addLine = () => setLines(prev => [...prev, defaultLine()]);
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof ReturnLineForm, value: string | number) => {
    setLines(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'productId' && typeof value === 'string') next[idx].productName = value;
      return next;
    });
  };

  const calculations = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + (l.quantity * l.unitPrice), 0);
    const vatAmount = Math.floor(subtotal * 0.15); // simplified VAT 15%
    const totalAmount = subtotal + vatAmount;
    return { subtotal, vatAmount, totalAmount };
  }, [lines]);

  const handleInvoiceSelect = (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (inv) {
      setHeader(prev => ({ ...prev, invoiceId, customerId: inv.customerId }));
      setLines(inv.lines.map(l => ({ productId: l.productId, productName: l.productName || l.productId, quantity: 1, unitPrice: l.unitPrice })));
    } else {
      setHeader(prev => ({ ...prev, invoiceId, customerId: '' }));
      setLines([defaultLine()]);
    }
  };

  const buildPayload = (returnNumber: string): Omit<SalesReturn, 'id'> => ({
    companyId: activeCompany!.id,
    returnNumber,
    invoiceId: header.invoiceId,
    customerId: header.customerId,
    date: header.date,
    subtotal: calculations.subtotal,
    vatAmount: calculations.vatAmount,
    totalAmount: calculations.totalAmount,
    reason: header.reason,
    status: 'draft',
    notes: header.notes,
    lines: lines.map(l => ({
      productId: l.productId,
      productName: l.productName,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.quantity * l.unitPrice,
    })),
  });

  const handleSave = async () => {
    if (!header.customerId || !header.invoiceId || lines.length === 0 || !activeCompany?.id) return;
    setSaving(true);
    let returnNumber: string;
    if (editingId) {
      const existing = returns.find(r => r.id === editingId);
      returnNumber = existing?.returnNumber || '';
      const res = await update(editingId, buildPayload(returnNumber));
      if (res.success && activeCompany.id) {
        await logAudit({ userId: currentUser?.id || 'system', action: 'update', tableName: 'sales_returns', recordId: editingId, companyId: activeCompany.id });
        addToast('success', t('sales.return.updated'));
      } else {
        addToast('error', res.error || t('error'));
      }
    } else {
      const seq = await getNextNumber('sales_return', activeCompany.id);
      returnNumber = seq.number || `SR-${Date.now()}`;
      const res = await create(buildPayload(returnNumber));
      if (res.success && res.id && activeCompany.id) {
        await logAudit({ userId: currentUser?.id || 'system', action: 'create', tableName: 'sales_returns', recordId: res.id, companyId: activeCompany.id });
        addToast('success', t('sales.return.created'));
      } else {
        addToast('error', res.error || t('error'));
      }
    }
    setSaving(false);
    setFormOpen(false);
    resetForm();
  };

  const handleDelete = (ret: SalesReturn) => {
    if (ret.status !== 'draft') return;
    setConfirmConfig({
      title: t('sales.return.deleteTitle'),
      message: `${t('sales.return.deleteConfirm')} ${ret.returnNumber}؟`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmOpen(false);
        const res = await remove(ret.id);
        if (res.success && activeCompany?.id) {
          await logAudit({ userId: currentUser?.id || 'system', action: 'delete', tableName: 'sales_returns', recordId: ret.id, companyId: activeCompany.id });
          addToast('success', t('sales.return.deleted'));
        } else {
          addToast('error', res.error || t('error'));
        }
      },
    });
    setConfirmOpen(true);
  };

  const handlePost = (ret: SalesReturn) => {
    if (ret.status !== 'draft') return;
    setConfirmConfig({
      title: t('sales.return.postTitle'),
      message: `${t('sales.return.postConfirm')}`,
      variant: 'warning',
      confirmText: t('sales.return.post'),
      onConfirm: async () => {
        setConfirmOpen(false);
        if (!activeCompany?.id) return;
        setPostingId(ret.id);
        const postResult = await postSalesReturn(activeCompany.id, {
          returnNumber: ret.returnNumber,
          date: ret.date,
          customer: ret.customer?.name || ret.customerId,
          amount: ret.totalAmount,
        });
        if (postResult.success) {
          await post(ret.id);
          await logAudit({ userId: currentUser?.id || 'system', action: 'post', tableName: 'sales_returns', recordId: ret.id, companyId: activeCompany.id });
          addToast('success', t('sales.return.posted'));
        } else {
          addToast('error', postResult.error || t('error'));
        }
        setPostingId(null);
      },
    });
    setConfirmOpen(true);
  };

  const handlePrint = (ret: SalesReturn) => {
    printDocument({
      type: 'sales-invoice',
      docNumber: ret.returnNumber,
      date: ret.date,
      partyName: ret.customer?.name || ret.customerId,
      partyLabel: t('sales.customer.title'),
      lines: ret.lines.map(l => ({
        description: l.productName || l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        total: l.lineTotal,
      })),
      subtotal: ret.subtotal,
      vatAmount: ret.vatAmount,
      totalAmount: ret.totalAmount,
      notes: `${ret.reason}\n${ret.notes || ''}`,
      companyName: activeCompany?.name,
      currency: activeCompany?.currency,
    });
  };

  const handleExportExcel = () => {
    const cols = [
      { key: 'returnNumber', header: t('sales.return.number') },
      { key: 'invoiceNumber', header: t('sales.invoiceNumber') },
      { key: 'customerName', header: t('sales.customer.title') },
      { key: 'date', header: t('sales.date') },
      { key: 'totalAmount', header: t('sales.total') },
      { key: 'status', header: t('sales.status.label') },
    ];
    exportToExcel(returns.map(r => ({ returnNumber: r.returnNumber, invoiceNumber: r.invoice?.invoiceNumber || r.invoiceId, customerName: r.customer?.name || r.customerId, date: r.date, totalAmount: r.totalAmount, status: r.status })), cols, `sales_returns_${new Date().toISOString().split('T')[0]}`);
  };

  const tableColumns = [
    { key: 'returnNumber', header: t('sales.return.number'), width: '130px' },
    { key: 'invoiceNumber', header: t('sales.return.originalInvoice'), width: '140px', render: (row: SalesReturn) => (
      <span className="flex items-center gap-1 text-blue-600"><FileText size={14} /> {row.invoice?.invoiceNumber || row.invoiceId}</span>
    )},
    { key: 'customerName', header: t('sales.customer.title'), render: (row: SalesReturn) => row.customer?.name || row.customerId },
    { key: 'date', header: t('sales.date'), width: '110px' },
    { key: 'reason', header: t('sales.return.reason') },
    { key: 'totalAmount', header: t('sales.total'), align: 'right' as const, render: (row: SalesReturn) => formatCurrency(row.totalAmount) },
    { key: 'status', header: t('sales.status.label'), render: (row: SalesReturn) => <StatusBadge status={row.status} /> },
    { key: 'actions', header: t('sales.actions'), width: '200px', render: (row: SalesReturn) => (
      <div className="flex items-center gap-1">
        <ActionButtons
          onView={() => { setViewing(row); setDetailOpen(true); }}
          onEdit={row.status === 'draft' ? () => {
            setEditingId(row.id);
            setHeader({ invoiceId: row.invoiceId, customerId: row.customerId, date: row.date, reason: row.reason, notes: row.notes || '' });
            setLines(row.lines.map(l => ({ productId: l.productId, productName: l.productName || l.productId, quantity: l.quantity, unitPrice: l.unitPrice })));
            setFormOpen(true);
          } : undefined}
          onDelete={row.status === 'draft' ? () => handleDelete(row) : undefined}
          onPrint={() => handlePrint(row)}
          showView
          showEdit={row.status === 'draft'}
          showDelete={row.status === 'draft'}
          showPrint
        />
        {row.status === 'draft' && (
          <Button size="sm" variant="secondary" onClick={() => handlePost(row)} disabled={postingId === row.id} leftIcon={<CheckSquare size={14} />}>
            {postingId === row.id ? (t('loading')) : (t('sales.return.post'))}
          </Button>
        )}
      </div>
    )},
  ];

  const stats = useMemo(() => {
    const total = returns.filter(r => r.status === 'posted').reduce((s, r) => s + r.totalAmount, 0);
    const draftCount = returns.filter(r => r.status === 'draft').length;
    const postedCount = returns.filter(r => r.status === 'posted').length;
    return { total, draftCount, postedCount };
  }, [returns]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Undo2 size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('sales.returns')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('sales.returnsSubtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <OwnerFilterToggle isOwnOnly={isOwnOnly} showToggle={showOwnerToggle} onToggle={toggleOwnOnly} />
          <Button size="sm" variant="ghost" onClick={handleExportExcel} title={t('export')}>
            <FileText size={16} className="text-emerald-600" />
          </Button>
          <Can action="create" module="sales">
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { resetForm(); setFormOpen(true); }}>{t('sales.return.create')}</Button>
          </Can>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><div className="p-4"><p className="text-sm text-slate-500 dark:text-slate-400">{t('sales.return.total')}</p><p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{total}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-slate-500 dark:text-slate-400">{t('sales.return.postedTotal')}</p><p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(stats.total)} <span className="text-sm font-normal text-slate-500">{activeCompany?.currency || YER_CODE}</span></p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-slate-500 dark:text-slate-400">{t('sales.return.drafts')}</p><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.draftCount}</p></div></Card>
      </div>

      <Card>
        {returnsLoading ? (
          <div className="space-y-3 p-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}
          </div>
        ) : returns.length === 0 ? (
          <EmptyState
            icon="inbox"
            title={t('sales.return.emptyTitle')}
            description={t('sales.return.emptyDesc')}
            action={<Can action="create" module="sales"><Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { resetForm(); setFormOpen(true); }}>{t('sales.return.create')}</Button></Can>}
          />
        ) : (
          <>
            <Table<SalesReturn> data={returns} columns={tableColumns} keyExtractor={(row, i) => row.id || String(i)} isLoading={returnsLoading} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
            />
          </>
        )}
      </Card>

      {/* Form Modal */}
      <Modal isOpen={formOpen} onClose={() => { setFormOpen(false); resetForm(); }} size="xl" title={editingId ? (t('sales.return.edit')) : (t('sales.return.new'))}>
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('sales.return.originalInvoice')}</label>
              <select
                className="form-control w-full"
                value={header.invoiceId}
                onChange={e => handleInvoiceSelect(e.target.value)}
              >
                <option value="">{t('sales.invoice.select')}</option>
                {invoices.filter(i => i.status === 'posted' || i.status === 'partially_paid' || i.status === 'paid').map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.invoiceNumber} - {inv.customer?.name || inv.customerId}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('sales.customer.title')}</label>
              <CustomerSelect companyId={activeCompany?.id || ''} value={header.customerId} onChange={v => setHeader(p => ({ ...p, customerId: v || '' }))} />
            </div>
            <Input label={t('sales.date')} type="date" value={header.date} onChange={e => setHeader(p => ({ ...p, date: e.target.value }))} />
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">{t('sales.invoice.lines')}</h4>
              <Button size="sm" variant="secondary" onClick={addLine} leftIcon={<Plus size={14} />}>{t('sales.invoice.addLine')}</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-2 py-1 text-right">{t('inventory.productName')}</th>
                    <th className="px-2 py-1 text-right w-20">{t('inventory.quantity')}</th>
                    <th className="px-2 py-1 text-right w-24">{t('inventory.unitPrice')}</th>
                    <th className="px-2 py-1 text-right w-24">{t('sales.total')}</th>
                    <th className="px-2 py-1 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const lineTotal = line.quantity * line.unitPrice;
                    return (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-2 py-1"><ProductSelect companyId={activeCompany?.id || ''} value={line.productId} onChange={v => updateLine(idx, 'productId', Array.isArray(v) ? (v[0] || '') : (v || ''))} size="sm" module="sales" /></td>
                        <td className="px-2 py-1"><Input type="number" min={1} value={String(line.quantity)} onChange={e => updateLine(idx, 'quantity', Number(e.target.value))} size="sm" /></td>
                        <td className="px-2 py-1"><Input type="number" min={0} value={String(line.unitPrice)} onChange={e => updateLine(idx, 'unitPrice', Number(e.target.value))} size="sm" /></td>
                        <td className="px-2 py-1 text-slate-700 dark:text-slate-200 font-medium">{formatCurrency(lineTotal)}</td>
                        <td className="px-2 py-1"><Button size="sm" variant="ghost" onClick={() => removeLine(idx)} leftIcon={<Trash2 size={14} className="text-rose-500" />} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label={t('sales.return.reason')} value={header.reason} onChange={e => setHeader(p => ({ ...p, reason: e.target.value }))} />
            <Input label={t('sales.notes')} value={header.notes} onChange={e => setHeader(p => ({ ...p, notes: e.target.value }))} />
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-300 font-medium">{t('sales.total')}</span>
              <span className="text-xl font-bold text-primary-600 dark:text-primary-400">{formatCurrency(calculations.totalAmount)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => { setFormOpen(false); resetForm(); }}>{t('cancel')}</Button>
            <Button onClick={handleSave} isLoading={saving} leftIcon={<CheckSquare size={16} />}>{editingId ? (t('save')) : (t('sales.return.saveDraft'))}</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} size="lg" title={`${t('sales.return.details')} - ${viewing?.returnNumber}`}>
        {viewing && (
          <div className="space-y-4 p-1">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3"><p className="text-slate-500 dark:text-slate-400">{t('sales.customer.title')}</p><p className="font-semibold">{viewing.customer?.name || viewing.customerId}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3"><p className="text-slate-500 dark:text-slate-400">{t('sales.status.label')}</p><StatusBadge status={viewing.status} /></div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3"><p className="text-slate-500 dark:text-slate-400">{t('sales.return.originalInvoice')}</p><p className="font-semibold flex items-center gap-1"><FileText size={14} /> {viewing.invoice?.invoiceNumber || viewing.invoiceId}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3"><p className="text-slate-500 dark:text-slate-400">{t('sales.return.reason')}</p><p className="font-semibold">{viewing.reason}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3"><p className="text-slate-500 dark:text-slate-400">{t('sales.date')}</p><p className="font-semibold">{viewing.date}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3"><p className="text-slate-500 dark:text-slate-400">{t('sales.total')}</p><p className="font-semibold">{formatCurrency(viewing.totalAmount)}</p></div>
            </div>

            {/* Impact badges */}
            <div className="flex gap-2">
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg px-3 py-2 text-sm">
                <BookOpen size={16} /> {t('sales.return.accountingEffect')}
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg px-3 py-2 text-sm">
                <Package size={16} /> {t('sales.return.inventoryEffect')}
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><tr><th className="px-3 py-2 text-right">#</th><th className="px-3 py-2 text-right">{t('inventory.productName')}</th><th className="px-3 py-2 text-right">{t('inventory.quantity')}</th><th className="px-3 py-2 text-right">{t('inventory.unitPrice')}</th><th className="px-3 py-2 text-right">{t('sales.total')}</th></tr></thead>
                <tbody>
                  {(viewing.lines || []).map((l, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{l.productName || l.productId}</td>
                      <td className="px-3 py-2">{l.quantity}</td>
                      <td className="px-3 py-2">{formatCurrency(l.unitPrice)}</td>
                      <td className="px-3 py-2 font-medium">{formatCurrency(l.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <div className="space-y-1 text-sm">
                <p className="text-slate-500 dark:text-slate-400">{t('sales.subtotal')}: <span className="font-medium text-slate-900 dark:text-slate-50">{formatCurrency(viewing.subtotal)}</span></p>
                <p className="text-slate-500 dark:text-slate-400">{t('sales.vat')}: <span className="font-medium text-slate-900 dark:text-slate-50">{formatCurrency(viewing.vatAmount)}</span></p>
              </div>
              <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
                {t('sales.total')}: {formatCurrency(viewing.totalAmount)}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDetailOpen(false)}>{t('close')}</Button>
              <Button variant="primary" onClick={() => handlePrint(viewing)} leftIcon={<Printer size={16} />}>{t('print')}</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { confirmConfig?.onConfirm(); }}
        title={confirmConfig?.title || ''}
        message={confirmConfig?.message || ''}
        variant={confirmConfig?.variant || 'warning'}
        confirmText={confirmConfig?.confirmText || (t('confirm'))}
        cancelText={t('cancel')}
      />
    </div>
  );
};

export default SalesReturnsPage;
