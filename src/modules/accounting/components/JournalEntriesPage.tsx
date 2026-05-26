import React, { useState, useMemo } from 'react';
import { BookOpen, Plus, Save, Send, X } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { ConfirmDialog, StatusBadge, ActionButtons } from '@/core/ui/components';
import { AccountSelect } from '@/core/ui/components/smart';
import { useTransactions } from '../hooks/useAccounting';
import { useAppStore } from '@/core/store';
import { useTranslation } from '@/core/i18n/useTranslation';
import { printDocument } from '@/core/utils/printDocument';
import { useDocumentSequence } from '@/core/utils/useDocumentSequence';
import { useSettings } from '@/core/utils/useSettings';
import { useBranchFilter } from '@/core/utils/useBranchFilter';
import { cn } from '@/core/utils';
import type { Transaction, JournalEntry as JournalEntryType } from '../types';

interface EntryLine {
  accountId: string;
  debit: number;
  credit: number;
  memo: string;
}

const emptyLine = (): EntryLine => ({ accountId: '', debit: 0, credit: 0, memo: '' });

export const JournalEntriesPage: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore(state => state.activeCompany);
  const { transactions, isLoading, create, update, post, remove } = useTransactions(activeCompany?.id || '');
  const { getNextNumber } = useDocumentSequence();
  const { settings } = useSettings(activeCompany?.id || '');
  const filteredTransactions = useBranchFilter(transactions);
  const currencySymbol = settings?.defaultCurrency || activeCompany?.currency || 'YER';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  
  const [entries, setEntries] = useState<EntryLine[]>([emptyLine(), emptyLine()]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null);

  const totalDebit = useMemo(() => entries.reduce((sum, e) => sum + (Number(e.debit) || 0), 0), [entries]);
  const totalCredit = useMemo(() => entries.reduce((sum, e) => sum + (Number(e.credit) || 0), 0), [entries]);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const addEntry = () => setEntries(prev => [...prev, emptyLine()]);
  const removeEntry = (index: number) => setEntries(prev => prev.length > 2 ? prev.filter((_, i) => i !== index) : prev);
  const updateEntry = (index: number, field: keyof EntryLine, value: string | number) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const resetForm = () => {
    setEntries([emptyLine(), emptyLine()]);
    setReference('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleSave = async (status: 'draft' | 'posted') => {
    if (!activeCompany) return;
    if (status === 'posted' && !isBalanced) return;

    setIsSaving(true);
    let ref = reference;
    if (!isEditMode && activeCompany.id) {
      const seq = await getNextNumber('journal_voucher', activeCompany.id);
      if (seq.success && seq.number) {
        ref = seq.number;
      }
    }

    const payload = {
      companyId: activeCompany.id,
      date,
      reference: ref,
      description,
      totalAmount: totalDebit,
      status,
      entries: entries.filter(e => e.accountId).map(e => ({
        id: crypto.randomUUID(),
        transactionId: editingId || '',
        accountId: e.accountId,
        debit: Number(e.debit) || 0,
        credit: Number(e.credit) || 0,
        memo: e.memo,
      })) as JournalEntryType[],
    };

    let result;
    if (isEditMode && editingId) {
      result = await update(editingId, payload);
    } else {
      result = await create(payload as Omit<Transaction, 'id'>);
    }

    if (result.success) {
      setIsModalOpen(false);
      resetForm();
    }
    setIsSaving(false);
  };

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setIsEditMode(true);
    setDate(tx.date);
    setReference(tx.reference || '');
    setDescription(tx.description || '');
    setEntries(tx.entries.length > 0 ? tx.entries.map(e => ({
      accountId: e.accountId,
      debit: e.debit,
      credit: e.credit,
      memo: e.memo || '',
    })) : [emptyLine(), emptyLine()]);
    setIsModalOpen(true);
  };

  const handlePost = async (tx: Transaction) => {
    if (tx.status === 'draft') {
      await post(tx.id);
    }
  };

  const handlePrint = (tx: Transaction) => {
    printDocument({
      type: 'journal-entry',
      docNumber: tx.reference || tx.id,
      date: tx.date,
      partyName: activeCompany?.name || '',
      partyLabel: 'الشركة',
      lines: tx.entries.map(e => ({
        description: `${e.account?.nameAr || e.accountId} - ${e.memo || ''}`,
        total: e.debit || e.credit,
      })),
      subtotal: tx.totalAmount,
      vatAmount: 0,
      totalAmount: tx.totalAmount,
      notes: tx.description,
      companyName: activeCompany?.name,
      currency: currencySymbol,
    });
  };

  const columns = [
    { key: 'date', header: t('accounting.date'), render: (row: Transaction) => row.date },
    { key: 'reference', header: t('accounting.reference'), render: (row: Transaction) => row.reference || '-' },
    { key: 'description', header: t('accounting.description'), render: (row: Transaction) => row.description || '-' },
    { key: 'totalAmount', header: t('accounting.amount'), align: 'right' as const, render: (row: Transaction) => 
      Number(row.totalAmount).toLocaleString('ar-SA', { minimumFractionDigits: 2 })
    },
    { key: 'status', header: t('sales.status'), render: (row: Transaction) => (
      <StatusBadge status={row.status} size="sm" />
    )},
    { key: 'actions', header: t('edit'), render: (row: Transaction) => (
      <ActionButtons
        size="sm"
        onView={() => { setSelectedTx(row); setIsDetailOpen(true); }}
        onEdit={() => handleEdit(row)}
        onDelete={() => setConfirmDelete(row)}
        onPrint={() => handlePrint(row)}
        showPrint
        showExport={false}
        disabled={row.status === 'posted'}
      />
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('accounting.journalEntries')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('accounting.newJournalEntry')}</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { resetForm(); setIsModalOpen(true); }}>
          {t('accounting.newJournalEntry')}
        </Button>
      </div>

      <Card>
        <Table<Transaction>
          data={filteredTransactions}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          isLoading={isLoading}
          emptyMessage={t('accounting.noData')}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? t('accounting.editJournalEntry') : t('accounting.newJournalEntry')}
        size="xl"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>{t('cancel')}</Button>
            <Button 
              variant="secondary" 
              leftIcon={<Save size={16} />} 
              onClick={() => handleSave('draft')}
              isLoading={isSaving}
            >
              {t('accounting.saveDraft')}
            </Button>
            <Button 
              variant="primary" 
              leftIcon={<Send size={16} />} 
              onClick={() => handleSave('posted')}
              disabled={!isBalanced}
              isLoading={isSaving}
            >
              {t('accounting.postEntry')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input label={t('accounting.date')} type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Input label={t('accounting.reference')} value={reference} onChange={e => setReference(e.target.value)} />
            <Input label={t('accounting.description')} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="text-xs font-semibold text-slate-500 p-2 text-right">{t('accounting.accountName')}</th>
                  <th className="text-xs font-semibold text-slate-500 p-2 text-right w-28">{t('accounting.debit')}</th>
                  <th className="text-xs font-semibold text-slate-500 p-2 text-right w-28">{t('accounting.credit')}</th>
                  <th className="text-xs font-semibold text-slate-500 p-2 text-right">{t('accounting.memo')}</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr key={idx} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="p-2">
                      <AccountSelect
                        companyId={activeCompany?.id || ''}
                        value={entry.accountId || ''}
                        onChange={v => updateEntry(idx, 'accountId', v || '')}
                        size="sm"
                      />
                    </td>
                    <td className="p-2">
                      <Input 
                        type="number" 
                        value={String(entry.debit || '')}
                        onChange={e => updateEntry(idx, 'debit', Number(e.target.value))}
                        size="sm"
                      />
                    </td>
                    <td className="p-2">
                      <Input 
                        type="number"
                        value={String(entry.credit || '')}
                        onChange={e => updateEntry(idx, 'credit', Number(e.target.value))}
                        size="sm"
                      />
                    </td>
                    <td className="p-2">
                      <Input 
                        value={entry.memo || ''}
                        onChange={e => updateEntry(idx, 'memo', e.target.value)}
                        size="sm"
                      />
                    </td>
                    <td className="p-2">
                      <button onClick={() => removeEntry(idx)} className="text-rose-500 hover:text-rose-700">
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800 font-semibold">
                <tr>
                  <td className="p-2 text-right">{t('accounting.totalDebit')} / {t('accounting.totalCredit')}</td>
                  <td className={cn('p-2 text-right', totalDebit !== totalCredit ? 'text-danger-600' : '')}>
                    {totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={cn('p-2 text-right', totalDebit !== totalCredit ? 'text-danger-600' : '')}>
                    {totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          
          <Button variant="secondary" onClick={addEntry} size="sm">+ {t('accounting.addLine')}</Button>
          
          {!isBalanced && entries.length > 1 && (
            <p className="text-danger-600 text-sm">{t('accounting.unbalancedEntry')}: {t('accounting.difference')} = {(totalDebit - totalCredit).toLocaleString('ar-SA')}</p>
          )}
        </div>
      </Modal>

      {/* Detail View Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={t('accounting.journalEntryDetails')}
        size="lg"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>{t('close')}</Button>
            {selectedTx?.status === 'draft' && (
              <Button variant="primary" leftIcon={<Send size={16} />} onClick={() => { handlePost(selectedTx); setIsDetailOpen(false); }}>
                {t('accounting.postEntry')}
              </Button>
            )}
          </div>
        }
      >
        {selectedTx && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-slate-500">{t('accounting.date')}:</span> {selectedTx.date}</div>
              <div><span className="text-slate-500">{t('accounting.reference')}:</span> {selectedTx.reference || '-'}</div>
              <div><span className="text-slate-500">{t('sales.status')}:</span> <StatusBadge status={selectedTx.status} size="sm" /></div>
            </div>
            <div className="text-sm"><span className="text-slate-500">{t('accounting.description')}:</span> {selectedTx.description || '-'}</div>
            
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="text-xs font-semibold text-slate-500 p-2 text-right">{t('accounting.accountName')}</th>
                    <th className="text-xs font-semibold text-slate-500 p-2 text-right w-28">{t('accounting.debit')}</th>
                    <th className="text-xs font-semibold text-slate-500 p-2 text-right w-28">{t('accounting.credit')}</th>
                    <th className="text-xs font-semibold text-slate-500 p-2 text-right">{t('accounting.memo')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTx.entries.map((entry, idx) => (
                    <tr key={idx} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="p-2 text-sm">{entry.account?.nameAr || entry.accountId}</td>
                      <td className="p-2 text-sm text-right tabular-nums">{entry.debit > 0 ? entry.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}</td>
                      <td className="p-2 text-sm text-right tabular-nums">{entry.credit > 0 ? entry.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '-'}</td>
                      <td className="p-2 text-sm">{entry.memo || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between text-sm font-semibold">
              <span>{t('accounting.amount')}</span>
              <span className="tabular-nums">{Number(selectedTx.totalAmount).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
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
        message={`هل أنت متأكد من حذف القيد "${confirmDelete?.reference || confirmDelete?.id}"؟`}
        variant="danger"
      />
    </div>
  );
};

export default JournalEntriesPage;
