import React, { useState } from 'react';
import { Banknote, Plus, CheckSquare, Truck } from 'lucide-react';
import { printDocument } from '@/core/utils/printDocument';
import { Card, Button, Modal, Input, Table, Badge } from '@/core/ui/components';
import { ConfirmDialog, StatusBadge, ActionButtons } from '@/core/ui/components';
import { SupplierSelect, BankSelect, AccountSelect } from '@/core/ui/components/smart';
import { useAppStore } from '@/core/store';
import { useTranslation } from '@/core/i18n/useTranslation';
import { usePaymentVouchers } from '../hooks/useAccounting';
import { postPaymentVoucher } from '@/core/utils/journalEntryGenerator';
import { useDocumentSequence } from '@/core/utils/useDocumentSequence';
import { useSettings } from '@/core/utils/useSettings';
import { useFormatters } from '@/core/utils/useFormatters';
import { useBranchFilter } from '@/core/utils/useBranchFilter';
import { useOwnerFilter } from '@/core/utils/useOwnerFilter';
import { OwnerFilterToggle } from '@/core/ui/components/OwnerFilterToggle';
import type { PaymentVoucher } from '../types';

export const PaymentVouchersPage: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore(state => state.activeCompany);
  const { vouchers, isLoading, create, update, remove } = usePaymentVouchers(activeCompany?.id || '');
  const { getNextNumber } = useDocumentSequence();
  const { settings } = useSettings(activeCompany?.id || '');
  const { formatCurrency } = useFormatters(activeCompany?.id || '');
  const branchFiltered = useBranchFilter(vouchers);
  const { filtered: filteredVouchers, showToggle: showOwnerToggle, isOwnOnly, toggleOwnOnly } = useOwnerFilter(branchFiltered, 'accounting');
  const currencySymbol = settings?.defaultCurrency || activeCompany?.currency || 'YER';

  const [postingId, setPostingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PaymentVoucher>>({ paymentMethod: 'cash', status: 'draft', date: new Date().toISOString().split('T')[0] });
  const [confirmDelete, setConfirmDelete] = useState<PaymentVoucher | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handlePrint = (voucher: PaymentVoucher) => {
    printDocument({
      type: 'payment-voucher',
      docNumber: voucher.voucherNumber,
      date: voucher.date,
      partyName: voucher.supplierName || voucher.notes || '',
      partyLabel: 'المستفيد',
      lines: [{
        description: voucher.notes || 'سند صرف',
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

  const handlePost = async (voucher: PaymentVoucher) => {
    if (!activeCompany?.id) return;
    setPostingId(voucher.id);
    const result = await postPaymentVoucher(activeCompany.id, {
      voucherNumber: voucher.voucherNumber,
      date: voucher.date,
      supplier: voucher.supplierName || '',
      amount: voucher.amount,
      paymentMethod: voucher.paymentMethod,
      expenseAccount: voucher.expenseAccountId,
    });
    setPostingId(null);
    if (result.success) {
      await update(voucher.id, { status: 'posted' });
    } else {
      alert(`فشل ترحيل السند: ${result.error || 'خطأ غير معروف'}`);
    }
  };

  const handleSave = async () => {
    if (!activeCompany?.id) return;
    if (!form.amount || Number(form.amount) <= 0) {
      alert('يرجى إدخال المبلغ بشكل صحيح');
      return;
    }
    if (!form.supplierId && !form.expenseAccountId) {
      alert('يرجى اختيار المورد أو حساب المصروف');
      return;
    }
    setIsSaving(true);
    
    let voucherNumber = form.voucherNumber || '';
    if (!isEditMode || !editingId) {
      const seq = await getNextNumber('payment_voucher', activeCompany.id);
      voucherNumber = seq.number || `PV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*1000)}`;
    }

    const payload = {
      companyId: activeCompany.id,
      voucherNumber,
      date: form.date || new Date().toISOString().split('T')[0],
      supplierId: form.supplierId,
      supplierName: form.supplierName || '',
      expenseAccountId: form.expenseAccountId,
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

  const handleEdit = (voucher: PaymentVoucher) => {
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
    { key: 'supplierName', header: t('accounting.supplier'), render: (row: PaymentVoucher) => (
      <span className="flex items-center gap-1"><Truck size={14} /> {row.supplierName || '-'}</span>
    )},
    { key: 'amount', header: t('accounting.amount'), align: 'right' as const, render: (row: PaymentVoucher) => formatCurrency(row.amount) },
    { key: 'paymentMethod', header: t('accounting.paymentMethod'), render: (row: PaymentVoucher) => (
      <Badge className={
        row.paymentMethod === 'cash' ? 'bg-emerald-100 text-emerald-700' :
        row.paymentMethod === 'bank' ? 'bg-blue-100 text-blue-700' :
        'bg-amber-100 text-amber-700'
      }>
        {row.paymentMethod === 'cash' ? t('accounting.cash') : row.paymentMethod === 'bank' ? t('accounting.bank') : t('accounting.check')}
      </Badge>
    )},
    { key: 'status', header: t('sales.status'), render: (row: PaymentVoucher) => (
      <StatusBadge status={row.status} size="sm" />
    )},
    { key: 'actions', header: t('edit'), render: (row: PaymentVoucher) => (
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('accounting.paymentVouchers')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('accounting.newPaymentVoucher')}</p>
          </div>
      </div>
      <div className="flex items-center gap-2">
        <OwnerFilterToggle isOwnOnly={isOwnOnly} showToggle={showOwnerToggle} onToggle={toggleOwnOnly} />
        <Button leftIcon={<Plus size={18} />} onClick={() => { resetForm(); setIsOpen(true); }}>{t('accounting.newPaymentVoucher')}</Button>
      </div>
    </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي الصرف النقدي</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totalCash)} {currencySymbol}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي الصرف البنكي</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalBank)} {currencySymbol}</p>
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

      <Modal isOpen={isOpen} title={isEditMode ? t('accounting.editVoucher') : t('accounting.newPaymentVoucher')} onClose={() => setIsOpen(false)} size="md">
        <div className="space-y-4">
          <Input label={t('accounting.voucherNumber')} value={form.voucherNumber || ''} onChange={e => setForm({ ...form, voucherNumber: e.target.value })} />
          <Input label={t('accounting.date')} type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('accounting.supplier')}</label>
            <SupplierSelect companyId={activeCompany?.id || ''} value={form.supplierId || ''} onChange={v => setForm({ ...form, supplierId: v || '' })} />
          </div>
          <Input label={t('accounting.amount')} type="number" value={String(form.amount || '')} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
          <div>
            <label className="block text-sm mb-1">{t('accounting.paymentMethod')}</label>
            <select className="input w-full" value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value as PaymentVoucher['paymentMethod'] })}>
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
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('accounting.expenseAccount')}</label>
            <AccountSelect companyId={activeCompany?.id || ''} value={form.expenseAccountId || ''} onChange={v => setForm({ ...form, expenseAccountId: v || '' })} filterType="expense" placeholder="اختر حساب المصروف..." />
          </div>
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
        message={`هل أنت متأكد من حذف سند الصرف "${confirmDelete?.voucherNumber}"؟`}
        variant="danger"
      />
    </div>
  );
};

export default PaymentVouchersPage;
