import React, { useState } from 'react';
import { Banknote, Plus, CheckSquare, Users } from 'lucide-react';
import { printDocument } from '@/core/utils/printDocument';
import { Card, Button, Modal, Input, Table, Badge } from '@/core/ui/components';
import { ConfirmDialog, StatusBadge, ActionButtons } from '@/core/ui/components';
import { CustomerSelect, BankSelect } from '@/core/ui/components/smart';
import { useAppStore } from '@/core/store';
import { useTranslation } from '@/core/i18n/useTranslation';
import { useReceiptVouchers } from '../hooks/useAccounting';
import { postReceiptVoucher } from '@/core/utils/journalEntryGenerator';
import { useDocumentSequence } from '@/core/utils/useDocumentSequence';
import { useSettings } from '@/core/utils/useSettings';
import { useBranchFilter } from '@/core/utils/useBranchFilter';
import type { ReceiptVoucher } from '../types';

export const ReceiptVouchersPage: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore(state => state.activeCompany);
  const { vouchers, isLoading, create, update, remove } = useReceiptVouchers(activeCompany?.id || '');
  const { getNextNumber } = useDocumentSequence();
  const { settings } = useSettings(activeCompany?.id || '');
  const filteredVouchers = useBranchFilter(vouchers);
  const currencySymbol = settings?.defaultCurrency || activeCompany?.currency || 'YER';

  const [postingId, setPostingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ReceiptVoucher>>({ paymentMethod: 'cash', status: 'draft', date: new Date().toISOString().split('T')[0] });
  const [confirmDelete, setConfirmDelete] = useState<ReceiptVoucher | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handlePrint = (voucher: ReceiptVoucher) => {
    printDocument({
      type: 'receipt-voucher',
      docNumber: voucher.voucherNumber,
      date: voucher.date,
      partyName: voucher.customerName,
      partyLabel: 'العميل',
      lines: [{
        description: voucher.notes || 'سند قبض',
        total: voucher.amount,
      }],
      subtotal: voucher.amount,
      vatAmount: 0,
      totalAmount: voucher.amount,
      notes: voucher.notes,
      companyName: activeCompany?.name,
      currency: currencySymbol,
    });
  };

  const handlePost = async (voucher: ReceiptVoucher) => {
    if (!activeCompany?.id) return;
    setPostingId(voucher.id);
    const result = await postReceiptVoucher(activeCompany.id, {
      voucherNumber: voucher.voucherNumber,
      date: voucher.date,
      customer: voucher.customerName,
      amount: voucher.amount,
      paymentMethod: voucher.paymentMethod,
    });
    setPostingId(null);
    if (result.success) {
      await update(voucher.id, { status: 'posted' });
    }
  };

  const handleSave = async () => {
    if (!activeCompany?.id || !form.customerId || !form.amount) return;
    setIsSaving(true);
    
    let voucherNumber = form.voucherNumber || '';
    if (!isEditMode || !editingId) {
      const seq = await getNextNumber('receipt_voucher', activeCompany.id);
      voucherNumber = seq.number || `RV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*1000)}`;
    }

    const payload = {
      companyId: activeCompany.id,
      voucherNumber,
      date: form.date || new Date().toISOString().split('T')[0],
      customerId: form.customerId,
      customerName: form.customerName || '',
      amount: Number(form.amount) || 0,
      paymentMethod: form.paymentMethod || 'cash',
      bankAccountId: form.bankAccountId,
      checkNumber: form.checkNumber,
      checkDate: form.checkDate,
      notes: form.notes || '',
      status: (form.status || 'draft') as 'draft' | 'posted' | 'cancelled',
    };

    if (isEditMode && editingId) {
      await update(editingId, payload);
    } else {
      await create(payload);
    }
    
    setIsSaving(false);
    setIsOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setForm({ paymentMethod: 'cash', status: 'draft', date: new Date().toISOString().split('T')[0] });
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (voucher: ReceiptVoucher) => {
    setForm({ ...voucher });
    setEditingId(voucher.id);
    setIsEditMode(true);
    setIsOpen(true);
  };

  const totalCash = filteredVouchers.filter(v => v.status === 'posted' && v.paymentMethod === 'cash').reduce((s, v) => s + v.amount, 0);
  const totalBank = filteredVouchers.filter(v => v.status === 'posted' && v.paymentMethod === 'bank').reduce((s, v) => s + v.amount, 0);

  const columns = [
    { key: 'voucherNumber', header: t('accounting.voucherNumber') },
    { key: 'date', header: t('accounting.date') },
    { key: 'customerName', header: t('accounting.customer'), render: (row: ReceiptVoucher) => (
      <span className="flex items-center gap-1"><Users size={14} /> {row.customerName}</span>
    )},
    { key: 'amount', header: t('accounting.amount'), align: 'right' as const, render: (row: ReceiptVoucher) => row.amount.toLocaleString('ar-SA') },
    { key: 'paymentMethod', header: t('accounting.paymentMethod'), render: (row: ReceiptVoucher) => (
      <Badge className={
        row.paymentMethod === 'cash' ? 'bg-emerald-100 text-emerald-700' :
        row.paymentMethod === 'bank' ? 'bg-blue-100 text-blue-700' :
        'bg-amber-100 text-amber-700'
      }>
        {row.paymentMethod === 'cash' ? t('accounting.cash') : row.paymentMethod === 'bank' ? t('accounting.bank') : t('accounting.check')}
      </Badge>
    )},
    { key: 'status', header: t('sales.status'), render: (row: ReceiptVoucher) => (
      <StatusBadge status={row.status} size="sm" />
    )},
    { key: 'actions', header: t('edit'), render: (row: ReceiptVoucher) => (
      <div className="flex items-center gap-2">
        <ActionButtons
          size="sm"
          onView={() => {}}
          onEdit={() => handleEdit(row)}
          onDelete={() => setConfirmDelete(row)}
          onPrint={() => handlePrint(row)}
          showView={false}
          showPrint
          showExport={false}
          disabled={row.status === 'posted'}
        />
        {row.status === 'draft' && (
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<CheckSquare size={14} />}
            onClick={() => handlePost(row)}
            disabled={postingId === row.id}
          >
            {postingId === row.id ? 'جارٍ الترحيل...' : t('accounting.posted')}
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Banknote size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('accounting.receiptVouchers')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('accounting.newReceiptVoucher')}</p>
          </div>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => { resetForm(); setIsOpen(true); }}>{t('accounting.newReceiptVoucher')}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي القبض النقدي</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalCash.toLocaleString('ar-SA')} {currencySymbol}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي القبض البنكي</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalBank.toLocaleString('ar-SA')} {currencySymbol}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">عدد السندات</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{filteredVouchers.length}</p>
          </div>
        </Card>
      </div>

      <Card>
        <Table
          data={filteredVouchers}
          columns={columns}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage={t('accounting.noData')}
        />
      </Card>

      <Modal isOpen={isOpen} title={isEditMode ? t('accounting.editVoucher') : t('accounting.newReceiptVoucher')} onClose={() => setIsOpen(false)} size="md">
        <div className="space-y-4">
          <Input label={t('accounting.voucherNumber')} value={form.voucherNumber || ''} onChange={e => setForm({ ...form, voucherNumber: e.target.value })} />
          <Input label={t('accounting.date')} type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('accounting.customer')}</label>
            <CustomerSelect companyId={activeCompany?.id || ''} value={form.customerId || ''} onChange={v => setForm({ ...form, customerId: v || '' })} />
          </div>
          <Input label={t('accounting.amount')} type="number" value={String(form.amount || '')} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
          <div>
            <label className="block text-sm mb-1">{t('accounting.paymentMethod')}</label>
            <select className="input w-full" value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value as any })}>
              <option value="cash">{t('accounting.cash')}</option>
              <option value="bank">{t('accounting.bank')}</option>
              <option value="check">{t('accounting.check')}</option>
            </select>
          </div>
          {form.paymentMethod === 'bank' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('accounting.bankAccount')}</label>
              <BankSelect companyId={activeCompany?.id || ''} value={form.bankAccountId || ''} onChange={v => setForm({ ...form, bankAccountId: v || '' })} />
            </div>
          )}
          {form.paymentMethod === 'check' && (
            <>
              <Input label={t('accounting.checkNumber')} value={form.checkNumber || ''} onChange={e => setForm({ ...form, checkNumber: e.target.value })} />
              <Input label={t('accounting.checkDate')} type="date" value={form.checkDate || ''} onChange={e => setForm({ ...form, checkDate: e.target.value })} />
            </>
          )}
          <Input label={t('accounting.notes')} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSave} isLoading={isSaving} leftIcon={<CheckSquare size={16} />}>{t('save')}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) {
            await remove(confirmDelete.id);
            setConfirmDelete(null);
          }
        }}
        title={t('delete')}
        message={`هل أنت متأكد من حذف سند القبض "${confirmDelete?.voucherNumber}"؟`}
        variant="danger"
      />
    </div>
  );
};

export default ReceiptVouchersPage;
