import React, { useState, useMemo } from 'react';
import { Banknote, Plus, CheckSquare, Truck } from 'lucide-react';
import { printDocument } from '@/core/utils/printDocument';
import { Card, Button, Modal, Input, Table, Badge } from '@/core/ui/components';
import { ConfirmDialog, StatusBadge, ActionButtons } from '@/core/ui/components';
import { SupplierSelect, BankSelect, CashBoxSelect, AccountSelect, CurrencySelect } from '@/core/ui/components/smart';
import { useAppStore } from '@/core/store';
import { useTranslation } from '@/core/i18n/useTranslation';
import { usePaymentVouchersPaginated } from '../hooks/useAccounting';
import { postPaymentVoucher } from '@/core/utils/journalEntryGenerator';
import { useDocumentSequence } from '@/core/utils/useDocumentSequence';
import { useSettings } from '@/core/utils/useSettings';
import { useFormatters } from '@/core/utils/useFormatters';
import { YER_CODE } from '@/core/utils/currencyConverter';
import { useCurrencyDisplay } from '@/core/utils/useCurrencyDisplay';
import { Can } from '@/core/ui/components/PermissionGate';
import { Pagination } from '@/core/ui/components/Pagination';
import type { PaymentVoucher } from '../types';
import { useToastStore } from '@/core/store/toastStore';

export const PaymentVouchersPage: React.FC = () => {
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const activeCompany = useAppStore(state => state.activeCompany);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const voucherFilters = useMemo(() => ({ status: statusFilter || undefined }), [statusFilter]);
  const { vouchers, total, page, pageSize, isLoading, goToPage, changePageSize, create, update, remove } = usePaymentVouchersPaginated(activeCompany?.id || '', voucherFilters);
  const { getNextNumber } = useDocumentSequence();
  const { settings } = useSettings(activeCompany?.id || '');
  const { formatCurrency } = useFormatters(activeCompany?.id || '');
  const { currencies, defaultCurrency } = useCurrencyDisplay();
  const currencySymbol = settings?.defaultCurrency || activeCompany?.currency || YER_CODE;

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
      partyLabel: t('accounting.beneficiary'),
      lines: [{
        description: voucher.notes || t('accounting.paymentVouchers'),
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
      addToast('success', t('accounting.paymentVoucher.posted'));
    } else {
      addToast('error', `${t('accounting.postFailed')}: ${result.error || t('error')}`);
    }
  };

  const handleSave = async () => {
    if (!activeCompany?.id) return;
    if (!form.amount || Number(form.amount) <= 0) {
      addToast('error', t('accounting.enterAmount'));
      return;
    }
    if (!form.supplierId && !form.expenseAccountId) {
      addToast('error', t('accounting.selectSupplierOrExpense'));
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
      currencyCode: form.currencyCode || YER_CODE,
      exchangeRate: form.exchangeRate ?? 1,
      baseCurrencyAmount: (Number(form.amount) || 0) * (form.exchangeRate ?? 1),
      paymentMethod: form.paymentMethod || 'cash',
      bankAccountId: form.bankAccountId,
      cashBoxId: form.cashBoxId,
      checkNumber: form.checkNumber,
      checkDate: form.checkDate,
      notes: form.notes || '',
      status: (form.status || 'draft') as 'draft' | 'posted' | 'cancelled',
    };

    let result;
    if (isEditMode && editingId) {
      result = await update(editingId, payload);
    } else {
      result = await create(payload);
    }
    
    setIsSaving(false);
    if (result?.success) {
      addToast('success', t(isEditMode ? 'accounting.paymentVoucher.updated' : 'accounting.paymentVoucher.created'));
      setIsOpen(false);
      resetForm();
    } else {
      addToast('error', result?.error || t('common.error'));
    }
  };

  const handleCurrencyChange = (code: string | null) => {
    if (!code) {
      setForm(prev => ({ ...prev, currencyCode: YER_CODE, exchangeRate: 1 }));
      return;
    }
    const c = currencies.find((x) => x.code === code);
    setForm(prev => ({ ...prev, currencyCode: code, exchangeRate: c ? c.exchangeRate : 1 }));
  };

  const resetForm = () => {
    setForm({ paymentMethod: 'cash', status: 'draft', date: new Date().toISOString().split('T')[0], currencyCode: defaultCurrency?.code || YER_CODE, exchangeRate: 1 });
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (voucher: PaymentVoucher) => {
    setForm({ ...voucher });
    setEditingId(voucher.id);
    setIsEditMode(true);
    setIsOpen(true);
  };

  const totalCash = vouchers.filter(v => v.status === 'posted' && v.paymentMethod === 'cash').reduce((s, v) => s + v.amount, 0);
  const totalBank = vouchers.filter(v => v.status === 'posted' && v.paymentMethod === 'bank').reduce((s, v) => s + v.amount, 0);

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
    { key: 'status', header: t('sales.status.label'), render: (row: PaymentVoucher) => (
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
            {postingId === row.id ? t('accounting.posting') : t('accounting.posted')}
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
        <select className="input text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} title={t('accounting.status')}>
          <option value="">{t('accounting.all')}</option>
          <option value="draft">{t('accounting.draft')}</option>
          <option value="posted">{t('accounting.posted')}</option>
        </select>
        <Can action="create" module="accounting">
          <Button leftIcon={<Plus size={18} />} onClick={() => { resetForm(); setIsOpen(true); }}>{t('accounting.newPaymentVoucher')}</Button>
        </Can>
      </div>
    </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('accounting.totalCashPayments')}</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totalCash)} {currencySymbol}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('accounting.totalBankPayments')}</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalBank)} {currencySymbol}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('accounting.voucherCount')}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{vouchers.length}</p>
          </div>
        </Card>
      </div>

      <Card>
        <Table
          data={vouchers}
          columns={columns}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage={t('accounting.noData')}
        />
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={goToPage} onPageSizeChange={changePageSize} />
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('sales.currency')}</label>
              <CurrencySelect companyId={activeCompany?.id || ''} value={form.currencyCode || YER_CODE} onChange={handleCurrencyChange} />
            </div>
            <Input
              label={t('sales.exchangeRate')}
              type="number"
              min={0}
              step="0.0001"
              value={String(form.exchangeRate ?? 1)}
              onChange={e => setForm({ ...form, exchangeRate: Number(e.target.value) || 1 })}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('sales.baseCurrency')}</label>
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200">
                {formatCurrency((Number(form.amount) || 0) * (form.exchangeRate ?? 1))} <span className="text-slate-500">{currencySymbol}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">{t('accounting.paymentMethod')}</label>
            <select className="input w-full" value={form.paymentMethod} onChange={e => {
              const paymentMethod = e.target.value as PaymentVoucher['paymentMethod'];
              setForm({
                ...form,
                paymentMethod,
                bankAccountId: paymentMethod === 'bank' ? form.bankAccountId : undefined,
                cashBoxId: paymentMethod === 'cash' ? form.cashBoxId : undefined,
                checkNumber: paymentMethod === 'check' ? form.checkNumber : undefined,
                checkDate: paymentMethod === 'check' ? form.checkDate : undefined,
              });
            }}>
              <option value="cash">{t('accounting.cash')}</option>
              <option value="bank">{t('accounting.bank')}</option>
              <option value="check">{t('accounting.check')}</option>
            </select>
          </div>
          {form.paymentMethod === 'cash' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('accounting.cashBox')}</label>
              <CashBoxSelect companyId={activeCompany?.id || ''} value={form.cashBoxId || ''} onChange={v => setForm({ ...form, cashBoxId: v || '' })} />
            </div>
          )}
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
            <AccountSelect companyId={activeCompany?.id || ''} value={form.expenseAccountId || ''} onChange={v => setForm({ ...form, expenseAccountId: v || '' })} filterType="expense" placeholder={t('accounting.selectExpenseAccount')} />
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
            const result = await remove(confirmDelete.id);
            if (result?.success) {
              addToast('success', t('accounting.paymentVoucher.deleted'));
            } else {
              addToast('error', result?.error || t('common.error'));
            }
            setConfirmDelete(null);
          }
        }}
        title={t('delete')}
        message={`${t('accounting.deletePaymentVoucherConfirm')} "${confirmDelete?.voucherNumber}"?`}
        variant="danger"
      />
    </div>
  );
};

export default PaymentVouchersPage;
