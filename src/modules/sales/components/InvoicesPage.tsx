import React, { useState, useMemo, useCallback } from 'react';
import { FileText, Plus, CheckSquare, Trash2, Printer, Download } from 'lucide-react';
import { Card, Button, Table, Input, Modal } from '@/core/ui/components';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { ActionButtons } from '@/core/ui/components/ActionButtons';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { CustomerSelect, ProductSelect } from '@/core/ui/components/smart';
import { useInvoices } from '../hooks/useSales';
import { useAppStore } from '@/core/store';
import { useAuthStore } from '@/modules/auth/store';
import { useTranslation } from '@/core/i18n/useTranslation';
import { useDocumentSequence } from '@/core/utils/useDocumentSequence';
import { useSettings } from '@/core/utils/useSettings';
import { useFormatters } from '@/core/utils/useFormatters';
import { useUserMap } from '@/core/utils/useUserMap';
import { printDocument } from '@/core/utils/printDocument';
import { exportToExcel, exportToPDF } from '@/core/utils/exportEngine';
import { postSalesInvoice } from '@/core/utils/journalEntryGenerator';
import { logAudit } from '@/core/utils/auditLogger';
import { useBranchFilter } from '@/core/utils/useBranchFilter';
import { useOwnerFilter } from '@/core/utils/useOwnerFilter';
import { OwnerFilterToggle } from '@/core/ui/components/OwnerFilterToggle';
import type { SalesInvoice, SalesInvoiceLine } from '../types';

interface InvoiceLineForm {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  vatPercent: number;
}

const STATUS_FLOW: Record<string, string> = {
  draft: 'مسودة',
  posted: 'مرحّلة',
  partially_paid: 'مدفوعة جزئياً',
  paid: 'مدفوعة',
  cancelled: 'ملغاة',
};

export const InvoicesPage: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore(state => state.activeCompany);
  const currentUser = useAuthStore(state => state.user);
  const { invoices, isLoading, create, update, remove, post } = useInvoices(activeCompany?.id || '');
  const { getNextNumber } = useDocumentSequence();
  const { settings } = useSettings(activeCompany?.id || '');
  const { formatCurrency, formatDate } = useFormatters(activeCompany?.id || '');
  const branchFiltered = useBranchFilter(invoices);
  const { filtered: filteredInvoices, showToggle: showOwnerToggle, isOwnOnly, toggleOwnOnly } = useOwnerFilter(branchFiltered, 'sales');
  const { getUserName } = useUserMap();
  const currencySymbol = settings?.defaultCurrency || activeCompany?.currency || 'YER';

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<SalesInvoice | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning' | 'info'; confirmText?: string } | null>(null);

  const [postingId, setPostingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultLine = useCallback((): InvoiceLineForm => ({
    productId: '', productName: '', quantity: 1, unitPrice: 0, discountPercent: 0, vatPercent: settings?.vatRate || 15,
  }), [settings?.vatRate]);

  const [header, setHeader] = useState({ customerId: '', date: new Date().toISOString().split('T')[0], dueDate: '', notes: '' });
  const [lines, setLines] = useState<InvoiceLineForm[]>([defaultLine()]);

  const resetForm = useCallback(() => {
    setHeader({ customerId: '', date: new Date().toISOString().split('T')[0], dueDate: '', notes: '' });
    setLines([defaultLine()]);
    setEditingId(null);
  }, [defaultLine]);

  const openCreate = useCallback(async () => {
    resetForm();
    if (activeCompany?.id) {
      const seq = await getNextNumber('sales_invoice', activeCompany.id);
      if (seq.success && seq.number) {
        setFormOpen(true);
        return;
      }
    }
    setFormOpen(true);
  }, [activeCompany?.id, getNextNumber, resetForm]);

  const openEdit = useCallback((invoice: SalesInvoice) => {
    if (invoice.status !== 'draft') return;
    setEditingId(invoice.id);
    setHeader({
      customerId: invoice.customerId,
      date: invoice.date,
      dueDate: invoice.dueDate || '',
      notes: invoice.notes || '',
    });
    setLines(invoice.lines.map(l => ({
      productId: l.productId,
      productName: l.productName || l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      vatPercent: l.vatPercent,
    })));
    setFormOpen(true);
  }, []);

  const addLine = () => setLines(prev => [...prev, defaultLine()]);
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof InvoiceLineForm, value: string | number) => {
    setLines(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'productId' && typeof value === 'string') {
        next[idx].productName = value;
      }
      return next;
    });
  };

  const calculations = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + (l.quantity * l.unitPrice * (1 - l.discountPercent / 100)), 0);
    const vatAmount = lines.reduce((s, l) => {
      const lineNet = l.quantity * l.unitPrice * (1 - l.discountPercent / 100);
      return s + (lineNet * (l.vatPercent / 100));
    }, 0);
    const discountAmount = lines.reduce((s, l) => s + (l.quantity * l.unitPrice * (l.discountPercent / 100)), 0);
    const totalAmount = subtotal + vatAmount;
    return { subtotal, vatAmount, discountAmount, totalAmount };
  }, [lines]);

  const buildInvoicePayload = (invoiceNumber: string): Omit<SalesInvoice, 'id'> => {
    const mappedLines: SalesInvoiceLine[] = lines.map(l => {
      const lineNet = l.quantity * l.unitPrice * (1 - l.discountPercent / 100);
      const lineVat = lineNet * (l.vatPercent / 100);
      return {
        productId: l.productId,
        productName: l.productName,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPercent: l.discountPercent,
        vatPercent: l.vatPercent,
        lineTotal: lineNet + lineVat,
      };
    });
    return {
      companyId: activeCompany!.id,
      invoiceNumber,
      customerId: header.customerId,
      date: header.date,
      dueDate: header.dueDate || undefined,
      subtotal: calculations.subtotal,
      discountAmount: calculations.discountAmount,
      vatAmount: calculations.vatAmount,
      totalAmount: calculations.totalAmount,
      paidAmount: 0,
      status: 'draft',
      notes: header.notes,
      lines: mappedLines,
    };
  };

  const handleSave = async () => {
    if (!header.customerId || lines.length === 0 || !activeCompany?.id) return;
    setSaving(true);
    let invoiceNumber: string;
    if (editingId) {
      const existing = invoices.find(i => i.id === editingId);
      invoiceNumber = existing?.invoiceNumber || '';
    } else {
      const seq = await getNextNumber('sales_invoice', activeCompany.id);
      invoiceNumber = seq.number || `INV-${Date.now()}`;
    }
    const payload = buildInvoicePayload(invoiceNumber);
    if (editingId) {
      const res = await update(editingId, { ...payload, status: 'draft' });
      if (res.success) {
        await logAudit({ userId: currentUser?.id || 'system', action: 'update', tableName: 'sales_invoices', recordId: editingId, companyId: activeCompany.id, newValues: payload });
      }
    } else {
      const res = await create(payload);
      if (res.success && res.id) {
        await logAudit({ userId: currentUser?.id || 'system', action: 'create', tableName: 'sales_invoices', recordId: res.id, companyId: activeCompany.id, newValues: payload });
      }
    }
    setSaving(false);
    setFormOpen(false);
    resetForm();
  };

  const handleDelete = (invoice: SalesInvoice) => {
    if (invoice.status !== 'draft') return;
    setConfirmConfig({
      title: t('sales.invoice.deleteTitle') || 'حذف الفاتورة',
      message: `${t('sales.invoice.deleteConfirm') || 'هل أنت متأكد من حذف الفاتورة'} ${invoice.invoiceNumber}؟`,
      variant: 'danger',
      confirmText: t('delete') || 'حذف',
      onConfirm: async () => {
        setConfirmOpen(false);
        const res = await remove(invoice.id);
        if (res.success && activeCompany?.id) {
          await logAudit({ userId: currentUser?.id || 'system', action: 'delete', tableName: 'sales_invoices', recordId: invoice.id, companyId: activeCompany.id });
        }
      },
    });
    setConfirmOpen(true);
  };

  const handlePost = (invoice: SalesInvoice) => {
    if (invoice.status !== 'draft') return;
    setConfirmConfig({
      title: t('sales.invoice.postTitle') || 'ترحيل الفاتورة',
      message: `${t('sales.invoice.postConfirm') || 'سيتم ترحيل الفاتورة وتوليد القيد اليومي تلقائياً. هل أنت متأكد؟'}`,
      variant: 'warning',
      confirmText: t('sales.invoice.post') || 'ترحيل',
      onConfirm: async () => {
        setConfirmOpen(false);
        if (!activeCompany?.id) return;
        setPostingId(invoice.id);
        const postResult = await postSalesInvoice(activeCompany.id, {
          invoiceNumber: invoice.invoiceNumber,
          date: invoice.date,
          customerId: invoice.customerId,
          subtotal: invoice.subtotal,
          vatAmount: invoice.vatAmount,
          totalAmount: invoice.totalAmount,
        });
        if (postResult.success) {
          await post(invoice.id);
          await logAudit({ userId: currentUser?.id || 'system', action: 'post', tableName: 'sales_invoices', recordId: invoice.id, companyId: activeCompany.id });
        } else {
          alert(`فشل ترحيل الفاتورة: ${postResult.error || 'خطأ غير معروف'}`);
        }
        setPostingId(null);
      },
    });
    setConfirmOpen(true);
  };

  const handlePrint = (invoice: SalesInvoice) => {
    printDocument({
      type: 'sales-invoice',
      docNumber: invoice.invoiceNumber,
      date: invoice.date,
      dueDate: invoice.dueDate,
      partyName: invoice.customer?.name || invoice.customerId,
      partyLabel: t('sales.customer.title') || 'العميل',
      lines: invoice.lines.map(l => ({
        description: l.productName || l.productId,
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
  };

  const handleExportExcel = () => {
    const exportColumns = [
      { key: 'invoiceNumber', header: t('sales.invoiceNumber') || 'رقم الفاتورة' },
      { key: 'customerName', header: t('sales.customer.title') || 'العميل' },
      { key: 'date', header: t('sales.date') || 'التاريخ' },
      { key: 'status', header: t('sales.status') || 'الحالة' },
      { key: 'subtotal', header: t('sales.subtotal') || 'المجموع' },
      { key: 'vatAmount', header: t('sales.vat') || 'الضريبة' },
      { key: 'totalAmount', header: t('sales.total') || 'الإجمالي' },
    ];
    const data = filteredInvoices.map(i => ({
      invoiceNumber: i.invoiceNumber,
      customerName: i.customer?.name || i.customerId,
      date: i.date,
      status: STATUS_FLOW[i.status] || i.status,
      subtotal: i.subtotal,
      vatAmount: i.vatAmount,
      totalAmount: i.totalAmount,
    }));
    exportToExcel(data, exportColumns, `sales_invoices_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = () => {
    const exportColumns = [
      { key: 'invoiceNumber', header: t('sales.invoiceNumber') || 'رقم الفاتورة', width: 30 },
      { key: 'customerName', header: t('sales.customer.title') || 'العميل', width: 40 },
      { key: 'date', header: t('sales.date') || 'التاريخ', width: 20 },
      { key: 'status', header: t('sales.status') || 'الحالة', width: 20 },
      { key: 'totalAmount', header: t('sales.total') || 'الإجمالي', width: 20 },
    ];
    const data = filteredInvoices.map(i => ({
      invoiceNumber: i.invoiceNumber,
      customerName: i.customer?.name || i.customerId,
      date: i.date,
      status: STATUS_FLOW[i.status] || i.status,
      totalAmount: formatCurrency(i.totalAmount),
    }));
    exportToPDF(data, exportColumns, `sales_invoices_${new Date().toISOString().split('T')[0]}`, {
      title: t('sales.invoices') || 'فواتير المبيعات',
      rtl: true,
    });
  };

  const tableColumns = [
    { key: 'invoiceNumber', header: t('sales.invoiceNumber') || 'رقم الفاتورة', width: '130px' },
    { key: 'customerName', header: t('sales.customer.title') || 'العميل', render: (row: SalesInvoice) => row.customer?.name || row.customerId },
    { key: 'date', header: t('sales.date') || 'التاريخ', width: '110px', render: (row: SalesInvoice) => formatDate(row.date) },
    { key: 'dueDate', header: t('sales.dueDate') || 'الاستحقاق', width: '110px', render: (row: SalesInvoice) => row.dueDate ? formatDate(row.dueDate) : '-' },
    { key: 'subtotal', header: t('sales.subtotal') || 'المجموع', align: 'right' as const, render: (row: SalesInvoice) => formatCurrency(row.subtotal) },
    { key: 'vatAmount', header: t('sales.vat') || 'الضريبة', align: 'right' as const, render: (row: SalesInvoice) => formatCurrency(row.vatAmount) },
    { key: 'totalAmount', header: t('sales.total') || 'الإجمالي', align: 'right' as const, render: (row: SalesInvoice) => formatCurrency(row.totalAmount) },
    { key: 'paidAmount', header: t('sales.paid') || 'المدفوع', align: 'right' as const, render: (row: SalesInvoice) => formatCurrency(row.paidAmount) },
    { key: 'status', header: t('sales.status') || 'الحالة', render: (row: SalesInvoice) => <StatusBadge status={row.status} /> },
    { key: 'createdBy', header: t('common.createdBy') || 'أنشأها', width: '110px', render: (row: SalesInvoice) => (
      <span className="text-xs text-slate-600 dark:text-slate-400">{getUserName(row.createdBy)}</span>
    ) },
    { key: 'actions', header: t('sales.actions') || 'إجراء', width: '180px', render: (row: SalesInvoice) => (
      <div className="flex items-center gap-1">
        <ActionButtons
          onView={() => { setViewing(row); setDetailOpen(true); }}
          onEdit={row.status === 'draft' ? () => openEdit(row) : undefined}
          onDelete={row.status === 'draft' ? () => handleDelete(row) : undefined}
          onPrint={() => handlePrint(row)}
          showView
          showEdit={row.status === 'draft'}
          showDelete={row.status === 'draft'}
          showPrint
        />
        {row.status === 'draft' && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handlePost(row)}
            disabled={postingId === row.id}
            leftIcon={<CheckSquare size={14} />}
          >
            {postingId === row.id ? (t('loading') || 'جارٍ...') : (t('sales.invoice.post') || 'ترحيل')}
          </Button>
        )}
      </div>
    )},
  ];

  const stats = useMemo(() => {
    const total = filteredInvoices.reduce((s, i) => s + i.totalAmount, 0);
    const paid = filteredInvoices.reduce((s, i) => s + i.paidAmount, 0);
    const draftCount = filteredInvoices.filter(i => i.status === 'draft').length;
    const postedCount = filteredInvoices.filter(i => i.status === 'posted' || i.status === 'partially_paid' || i.status === 'paid').length;
    return { total, paid, draftCount, postedCount };
  }, [filteredInvoices]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('sales.invoices') || 'فواتير المبيعات'}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('sales.invoicesSubtitle') || 'إدارة فواتير المبيعات والضريبة'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <OwnerFilterToggle isOwnOnly={isOwnOnly} showToggle={showOwnerToggle} onToggle={toggleOwnOnly} />
          <Button size="sm" variant="ghost" onClick={handleExportExcel} title={t('export') || 'تصدير Excel'}>
            <Download size={16} className="text-emerald-600" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleExportPDF} title={t('reports.exportPdf') || 'تصدير PDF'}>
            <Printer size={16} className="text-rose-600" />
          </Button>
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>
            {t('sales.invoice.create') || 'فاتورة جديدة'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('sales.invoice.totalInvoices') || 'عدد الفواتير'}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{filteredInvoices.length}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('sales.total') || 'الإجمالي'}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{formatCurrency(stats.total)} <span className="text-sm font-normal text-slate-500">{currencySymbol}</span></p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('sales.paid') || 'المدفوع'}</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.paid)} <span className="text-sm font-normal text-slate-500">{currencySymbol}</span></p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('sales.invoice.drafts') || 'مسودات'}</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.draftCount}</p>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            icon="file"
            title={t('sales.invoice.emptyTitle') || 'لا توجد فواتير'}
            description={t('sales.invoice.emptyDesc') || 'يمكنك إنشاء فاتورة مبيعات جديدة الآن'}
            action={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>{t('sales.invoice.create') || 'فاتورة جديدة'}</Button>}
          />
        ) : (
          <Table<SalesInvoice> data={filteredInvoices} columns={tableColumns} keyExtractor={(row, i) => row.id || String(i)} isLoading={isLoading} />
        )}
      </Card>

      {/* Form Modal */}
      <Modal isOpen={formOpen} onClose={() => { setFormOpen(false); resetForm(); }} size="xl" title={editingId ? (t('sales.invoice.edit') || 'تعديل فاتورة') : (t('sales.invoice.new') || 'فاتورة مبيعات جديدة')}>
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('sales.customer.title') || 'العميل'}</label>
              <CustomerSelect companyId={activeCompany?.id || ''} value={header.customerId} onChange={v => setHeader(prev => ({ ...prev, customerId: v || '' }))} />
            </div>
            <Input label={t('sales.date') || 'التاريخ'} type="date" value={header.date} onChange={e => setHeader(prev => ({ ...prev, date: e.target.value }))} />
            <Input label={t('sales.dueDate') || 'تاريخ الاستحقاق'} type="date" value={header.dueDate} onChange={e => setHeader(prev => ({ ...prev, dueDate: e.target.value }))} />
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">{t('sales.invoice.lines') || 'سطور الفاتورة'}</h4>
              <Button size="sm" variant="secondary" onClick={addLine} leftIcon={<Plus size={14} />}>{t('sales.invoice.addLine') || 'إضافة سطر'}</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-2 py-1 text-right">{t('inventory.productName') || 'المنتج'}</th>
                    <th className="px-2 py-1 text-right w-20">{t('inventory.quantity') || 'الكمية'}</th>
                    <th className="px-2 py-1 text-right w-24">{t('inventory.unitPrice') || 'السعر'}</th>
                    <th className="px-2 py-1 text-right w-20">{t('sales.discount') || 'الخصم %'}</th>
                    <th className="px-2 py-1 text-right w-20">{t('sales.vat') || 'الضريبة %'}</th>
                    <th className="px-2 py-1 text-right w-24">{t('sales.total') || 'الإجمالي'}</th>
                    <th className="px-2 py-1 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const lineNet = line.quantity * line.unitPrice * (1 - line.discountPercent / 100);
                    const lineTotal = lineNet + (lineNet * (line.vatPercent / 100));
                    return (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-2 py-1">
                          <ProductSelect companyId={activeCompany?.id || ''} value={line.productId} onChange={v => updateLine(idx, 'productId', Array.isArray(v) ? (v[0] || '') : (v || ''))} size="sm" module="sales" />
                        </td>
                        <td className="px-2 py-1"><Input type="number" min={1} value={String(line.quantity)} onChange={e => updateLine(idx, 'quantity', Number(e.target.value))} size="sm" /></td>
                        <td className="px-2 py-1"><Input type="number" min={0} value={String(line.unitPrice)} onChange={e => updateLine(idx, 'unitPrice', Number(e.target.value))} size="sm" /></td>
                        <td className="px-2 py-1"><Input type="number" min={0} max={100} value={String(line.discountPercent)} onChange={e => updateLine(idx, 'discountPercent', Number(e.target.value))} size="sm" /></td>
                        <td className="px-2 py-1"><Input type="number" min={0} value={String(line.vatPercent)} onChange={e => updateLine(idx, 'vatPercent', Number(e.target.value))} size="sm" /></td>
                        <td className="px-2 py-1 text-slate-700 dark:text-slate-200 font-medium">{formatCurrency(lineTotal)}</td>
                        <td className="px-2 py-1"><Button size="sm" variant="ghost" onClick={() => removeLine(idx)} leftIcon={<Trash2 size={14} className="text-rose-500" />} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={t('sales.notes') || 'الملاحظات'} value={header.notes} onChange={e => setHeader(prev => ({ ...prev, notes: e.target.value }))} />
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>{t('sales.subtotal') || 'المجموع'}</span><span className="font-medium">{formatCurrency(calculations.subtotal)}</span></div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>{t('sales.discount') || 'الخصم'}</span><span className="font-medium">{formatCurrency(calculations.discountAmount)}</span></div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>{t('sales.vat') || 'الضريبة'}</span><span className="font-medium">{formatCurrency(calculations.vatAmount)}</span></div>
              <div className="flex justify-between text-lg font-bold text-primary-600 dark:text-primary-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>{t('sales.total') || 'الإجمالي'}</span>
                <span>{formatCurrency(calculations.totalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => { setFormOpen(false); resetForm(); }}>{t('cancel') || 'إلغاء'}</Button>
            <Button onClick={handleSave} isLoading={saving} leftIcon={<CheckSquare size={16} />}>{editingId ? (t('save') || 'حفظ') : (t('sales.invoice.saveDraft') || 'حفظ كمسودة')}</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} size="lg" title={`${t('sales.invoice.details') || 'تفاصيل الفاتورة'} - ${viewing?.invoiceNumber}`}>
        {viewing && (
          <div className="space-y-4 p-1">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                <p className="text-slate-500 dark:text-slate-400">{t('sales.customer.title') || 'العميل'}</p>
                <p className="font-semibold text-slate-900 dark:text-slate-50">{viewing.customer?.name || viewing.customerId}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                <p className="text-slate-500 dark:text-slate-400">{t('sales.status') || 'الحالة'}</p>
                <StatusBadge status={viewing.status} />
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                <p className="text-slate-500 dark:text-slate-400">{t('sales.date') || 'التاريخ'}</p>
                <p className="font-semibold text-slate-900 dark:text-slate-50">{formatDate(viewing.date)}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                <p className="text-slate-500 dark:text-slate-400">{t('sales.dueDate') || 'الاستحقاق'}</p>
                <p className="font-semibold text-slate-900 dark:text-slate-50">{viewing.dueDate ? formatDate(viewing.dueDate) : '-'}</p>
              </div>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-right">#</th>
                    <th className="px-3 py-2 text-right">{t('inventory.productName') || 'المنتج'}</th>
                    <th className="px-3 py-2 text-right">{t('inventory.quantity') || 'الكمية'}</th>
                    <th className="px-3 py-2 text-right">{t('inventory.unitPrice') || 'السعر'}</th>
                    <th className="px-3 py-2 text-right">{t('sales.total') || 'الإجمالي'}</th>
                  </tr>
                </thead>
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
                <p className="text-slate-500 dark:text-slate-400">{t('sales.subtotal') || 'المجموع'}: <span className="font-medium text-slate-900 dark:text-slate-50">{formatCurrency(viewing.subtotal)}</span></p>
                <p className="text-slate-500 dark:text-slate-400">{t('sales.vat') || 'الضريبة'}: <span className="font-medium text-slate-900 dark:text-slate-50">{formatCurrency(viewing.vatAmount)}</span></p>
              </div>
              <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
                {t('sales.total') || 'الإجمالي'}: {formatCurrency(viewing.totalAmount)}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDetailOpen(false)}>{t('close') || 'إغلاق'}</Button>
              <Button variant="primary" onClick={() => { handlePrint(viewing); }} leftIcon={<Printer size={16} />}>{t('print') || 'طباعة'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { confirmConfig?.onConfirm(); }}
        title={confirmConfig?.title || ''}
        message={confirmConfig?.message || ''}
        variant={confirmConfig?.variant || 'warning'}
        confirmText={confirmConfig?.confirmText || (t('confirm') || 'تأكيد')}
        cancelText={t('cancel') || 'إلغاء'}
      />
    </div>
  );
};

export default InvoicesPage;
