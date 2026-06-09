import React, { useState, useMemo, useCallback } from 'react';
import { Users, Plus, Phone, Mail, MapPin, FileText, Receipt } from 'lucide-react';
import { Card, Button, Table, Input, Modal } from '@/core/ui/components';
import { ConfirmDialog } from '@/core/ui/components/ConfirmDialog';
import { StatusBadge } from '@/core/ui/components/StatusBadge';
import { ActionButtons } from '@/core/ui/components/ActionButtons';
import { EmptyState } from '@/core/ui/components/EmptyState';
import { Pagination } from '@/core/ui/components/Pagination';
import { useCustomersPaginated, useCustomerStatement, useCustomerArAging } from '../hooks/useSales';
import { useAppStore } from '@/core/store';
import { useAuthStore } from '@/modules/auth/store';
import { useTranslation } from '@/core/i18n/useTranslation';
import { exportToExcel } from '@/core/utils/exportEngine';
import { useFormatters } from '@/core/utils/useFormatters';
import { YER_CODE } from '@/core/utils/currencyConverter';
import { logAudit } from '@/core/utils/auditLogger';
import type { Customer } from '../types';
import { Can } from '@/core/ui/components/PermissionGate';

type TabKey = 'details' | 'statement' | 'aging';

export const CustomersPage: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore(state => state.activeCompany);
  const { formatCurrency } = useFormatters(activeCompany?.id || '');
  const currentUser = useAuthStore(state => state.user);
  const [search, setSearch] = useState('');
  const customerFilters = useMemo(() => ({ search: search || undefined }), [search]);
  const { customers, total, page, pageSize, isLoading, goToPage, changePageSize, create, update, remove } = useCustomersPaginated(activeCompany?.id || '', customerFilters);
  const { data: arAging, reload: reloadAging } = useCustomerArAging(activeCompany?.id || '');

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('details');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning' | 'info' } | null>(null);

  const [formData, setFormData] = useState({ code: '', name: '', phone: '', email: '', address: '', taxNumber: '', creditLimit: '', isActive: true });
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setFormData({ code: '', name: '', phone: '', email: '', address: '', taxNumber: '', creditLimit: '', isActive: true });
    setEditingId(null);
  }, []);

  const openCreate = () => { resetForm(); setFormOpen(true); };
  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setFormData({ code: c.code || '', name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', taxNumber: c.taxNumber || '', creditLimit: String(c.creditLimit || ''), isActive: c.isActive });
    setFormOpen(true);
  };

  const openDetail = async (c: Customer) => {
    setViewing(c);
    setActiveTab('details');
    setDetailOpen(true);
    await reloadAging();
  };

  const handleSave = async () => {
    if (!activeCompany) return;
    setSaving(true);
    const payload = {
      companyId: activeCompany.id,
      code: formData.code,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      taxNumber: formData.taxNumber,
      creditLimit: Number(formData.creditLimit) || 0,
      balance: 0,
      isActive: formData.isActive,
    };
    if (editingId) {
      const res = await update(editingId, { ...payload, balance: undefined });
      if (res.success && activeCompany.id) {
        await logAudit({ userId: currentUser?.id || 'system', action: 'update', tableName: 'customers', recordId: editingId, companyId: activeCompany.id, newValues: payload });
      }
    } else {
      const res = await create(payload);
      if (res.success && res.id && activeCompany.id) {
        await logAudit({ userId: currentUser?.id || 'system', action: 'create', tableName: 'customers', recordId: res.id, companyId: activeCompany.id, newValues: payload });
      }
    }
    setSaving(false);
    setFormOpen(false);
    resetForm();
  };

  const handleDelete = (c: Customer) => {
    setConfirmConfig({
      title: t('sales.customer.deleteTitle') || 'حذف العميل',
      message: `${t('sales.customer.deleteConfirm') || 'هل أنت متأكد من حذف العميل'} "${c.name}"؟`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmOpen(false);
        const res = await remove(c.id);
        if (res.success && activeCompany?.id) {
          await logAudit({ userId: currentUser?.id || 'system', action: 'delete', tableName: 'customers', recordId: c.id, companyId: activeCompany.id });
        }
      },
    });
    setConfirmOpen(true);
  };

  const handleExportExcel = () => {
    const cols = [
      { key: 'name', header: t('sales.customer.name') || 'الاسم' },
      { key: 'phone', header: t('sales.customer.phone') || 'الهاتف' },
      { key: 'email', header: t('sales.customer.email') || 'البريد' },
      { key: 'address', header: t('sales.customer.address') || 'العنوان' },
      { key: 'balance', header: t('accounting.balance') || 'الرصيد' },
    ];
    exportToExcel(customers.map(c => ({ name: c.name, phone: c.phone || '-', email: c.email || '-', address: c.address || '-', balance: c.balance })), cols, `customers_${new Date().toISOString().split('T')[0]}`);
  };

  const customerColumns = [
    { key: 'code', header: t('sales.customer.code') || 'الكود', width: '100px', render: (row: Customer) => row.code || '-' },
    { key: 'name', header: t('sales.customer.name') || 'الاسم' },
    { key: 'phone', header: t('sales.customer.phone') || 'الهاتف', render: (row: Customer) => (
      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300"><Phone size={14} /> {row.phone || '-'}</span>
    )},
    { key: 'email', header: t('sales.customer.email') || 'البريد', render: (row: Customer) => (
      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300"><Mail size={14} /> {row.email || '-'}</span>
    )},
    { key: 'balance', header: t('accounting.balance') || 'الرصيد', align: 'right' as const, render: (row: Customer) => (
      <span className={row.balance > 0 ? 'text-rose-600 font-semibold' : 'text-slate-700 dark:text-slate-200'}>{formatCurrency(row.balance)}</span>
    )},
    { key: 'isActive', header: t('sales.customer.isActive') || 'الحالة', render: (row: Customer) => <StatusBadge status={row.isActive ? 'active' : 'inactive'} /> },
    { key: 'actions', header: t('sales.actions') || 'إجراء', width: '140px', render: (row: Customer) => (
      <ActionButtons
        onView={() => openDetail(row)}
        onEdit={() => openEdit(row)}
        onDelete={() => handleDelete(row)}
        showView
        showEdit
        showDelete
      />
    )},
  ];

  const totalBalance = useMemo(() => customers.reduce((s, c) => s + c.balance, 0), [customers]);
  const activeCount = useMemo(() => customers.filter(c => c.isActive).length, [customers]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('sales.customers') || 'العملاء'}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('sales.customersSubtitle') || 'إدارة بيانات العملاء وكشوفات الحسابات'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder={t('search') || 'بحث...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Button size="sm" variant="ghost" onClick={handleExportExcel} title={t('export') || 'تصدير Excel'}>
            <FileText size={16} className="text-emerald-600" />
          </Button>
          <Can action="create" module="sales"><Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>{t('sales.customer.create') || 'عميل جديد'}</Button></Can>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><div className="p-4"><p className="text-sm text-slate-500 dark:text-slate-400">{t('sales.customer.total') || 'إجمالي العملاء'}</p><p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{total}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-slate-500 dark:text-slate-400">{t('sales.customer.active') || 'العملاء النشطون'}</p><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-slate-500 dark:text-slate-400">{t('sales.customer.totalBalance') || 'إجمالي الذمم'}</p><p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totalBalance)} <span className="text-sm font-normal text-slate-500">{activeCompany?.currency || YER_CODE}</span></p></div></Card>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon="inbox"
            title={t('sales.customer.emptyTitle') || 'لا يوجد عملاء'}
            description={t('sales.customer.emptyDesc') || 'يمكنك إضافة عميل جديد للبدء'}
            action={<Can action="create" module="sales"><Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>{t('sales.customer.create') || 'عميل جديد'}</Button></Can>}
          />
        ) : (
          <>
            <Table<Customer> data={customers} columns={customerColumns} keyExtractor={(row, i) => row.id || String(i)} isLoading={isLoading} />
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
      <Modal isOpen={formOpen} onClose={() => { setFormOpen(false); resetForm(); }} size="md" title={editingId ? (t('sales.customer.edit') || 'تعديل عميل') : (t('sales.customer.new') || 'عميل جديد')}>
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('sales.customer.code') || 'الكود'} value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value }))} />
            <Input label={t('sales.customer.name') || 'الاسم *'} value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('sales.customer.phone') || 'الهاتف'} value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
            <Input label={t('sales.customer.email') || 'البريد الإلكتروني'} type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
          </div>
          <Input label={t('sales.customer.address') || 'العنوان'} value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('sales.customer.taxNumber') || 'الرقم الضريبي'} value={formData.taxNumber} onChange={e => setFormData(p => ({ ...p, taxNumber: e.target.value }))} />
            <Input label={t('sales.customer.creditLimit') || 'حد الائتمان'} type="number" value={formData.creditLimit} onChange={e => setFormData(p => ({ ...p, creditLimit: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
            <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-200">{t('sales.customer.isActive') || 'نشط'}</label>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => { setFormOpen(false); resetForm(); }}>{t('cancel') || 'إلغاء'}</Button>
            <Button onClick={handleSave} isLoading={saving}>{editingId ? (t('save') || 'حفظ') : (t('create') || 'إنشاء')}</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} size="xl" title={viewing ? `${t('sales.customer.card') || 'بطاقة العميل'} - ${viewing.name}` : ''}>
        {viewing && (
          <div className="space-y-4 p-1">
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              {([
                { key: 'details', label: t('sales.customer.details') || 'التفاصيل' },
                { key: 'statement', label: t('sales.customer.statement') || 'كشف الحساب' },
                { key: 'aging', label: t('sales.customer.aging') || 'A/R Aging' },
              ] as { key: TabKey; label: string }[]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-lg">
                      {viewing.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">{viewing.name}</h3>
                      <StatusBadge status={viewing.isActive ? 'active' : 'inactive'} />
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                    <p className="flex items-center gap-2"><Phone size={16} className="text-slate-400" /> {viewing.phone || '-'}</p>
                    <p className="flex items-center gap-2"><Mail size={16} className="text-slate-400" /> {viewing.email || '-'}</p>
                    <p className="flex items-center gap-2"><MapPin size={16} className="text-slate-400" /> {viewing.address || '-'}</p>
                    <p className="flex items-center gap-2"><Receipt size={16} className="text-slate-400" /> {t('sales.customer.taxNumber') || 'الرقم الضريبي'}: {viewing.taxNumber || '-'}</p>
                  </div>
                </Card>
                <div className="space-y-4">
                  <Card className="p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('accounting.balance') || 'الرصيد الحالي'}</p>
                    <p className={`text-2xl font-bold ${viewing.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatCurrency(viewing.balance)} {activeCompany?.currency || YER_CODE}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('sales.customer.creditLimit') || 'حد الائتمان'}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{formatCurrency(viewing.creditLimit || 0)} {activeCompany?.currency || YER_CODE}</p>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'statement' && <CustomerStatementTab customerId={viewing.id} />}
            {activeTab === 'aging' && <CustomerAgingTab aging={arAging?.find(a => a.customerId === viewing.id)} />}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { confirmConfig?.onConfirm(); }}
        title={confirmConfig?.title || ''}
        message={confirmConfig?.message || ''}
        variant={confirmConfig?.variant || 'danger'}
      />
    </div>
  );
};

function CustomerStatementTab({ customerId }: { customerId: string }) {
  const { t } = useTranslation();
  const activeCompany = useAppStore(state => state.activeCompany);
  const { formatCurrency } = useFormatters(activeCompany?.id || '');
  const { rows, isLoading } = useCustomerStatement(customerId);

  const columns = [
    { key: 'date', header: t('sales.date') || 'التاريخ' },
    { key: 'documentType', header: t('sales.documentType') || 'نوع المستند' },
    { key: 'documentNumber', header: t('sales.documentNumber') || 'رقم المستند' },
    { key: 'debit', header: t('accounting.debit') || 'مدين', align: 'right' as const, render: (row: typeof rows[0]) => row.debit > 0 ? formatCurrency(row.debit) : '-' },
    { key: 'credit', header: t('accounting.credit') || 'دائن', align: 'right' as const, render: (row: typeof rows[0]) => row.credit > 0 ? formatCurrency(row.credit) : '-' },
    { key: 'balance', header: t('accounting.balance') || 'الرصيد', align: 'right' as const, render: (row: typeof rows[0]) => formatCurrency(row.balance) },
  ];

  return (
    <Card>
      {isLoading ? (
        <div className="space-y-3 p-4">
          {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon="search" title={t('sales.customer.noTransactions') || 'لا توجد حركات'} description={t('sales.customer.noTransactionsDesc') || 'لم يتم العثور على أي حركات لهذا العميل'} />
      ) : (
        <Table data={rows} columns={columns} keyExtractor={(_r, i) => String(i)} />
      )}
    </Card>
  );
}

function CustomerAgingTab({ aging }: { aging?: { customerId: string; customerName: string; totalDue: number; buckets: { period: string; amount: number; count: number }[] } }) {
  const { t } = useTranslation();
  const activeCompany = useAppStore(state => state.activeCompany);
  const { formatCurrency } = useFormatters(activeCompany?.id || '');
  if (!aging) return <EmptyState icon="search" title={t('sales.customer.noAging') || 'لا توجد بيانات Aging'} description={t('sales.customer.noAgingDesc') || 'لا توجد فواتير مستحقة لهذا العميل'} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {aging.buckets.map(b => (
          <Card key={b.period} className="p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">{b.period} {t('sales.customer.days') || 'يوم'}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{formatCurrency(b.amount)}</p>
            <p className="text-xs text-slate-400">{b.count} {t('sales.customer.invoices') || 'فاتورة'}</p>
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-slate-700 dark:text-slate-200 font-medium">{t('sales.customer.totalDue') || 'إجمالي المستحق'}</p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(aging.totalDue)}</p>
        </div>
      </Card>
    </div>
  );
}

export default CustomersPage;
