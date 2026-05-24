import React, { useState } from 'react';
import { BookOpen, Plus, Save } from 'lucide-react';
import { Card, Button, Input, Modal, Table } from '@/core/ui/components';
import { AccountSelect } from '@/core/ui/components/smart';
import { useTransactions } from '../hooks/useAccounting';
import { useAppStore } from '@/core/store';
import { cn } from '@/core/utils';
import type { Transaction, JournalEntry } from '../types';

export const JournalEntriesPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { transactions, isLoading, create } = useTransactions(activeCompany?.id || '');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entries, setEntries] = useState<Partial<JournalEntry>[]>([
    { accountId: '', debit: 0, credit: 0, memo: '' }
  ]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const addEntry = () => {
    setEntries(prev => [...prev, { accountId: '', debit: 0, credit: 0, memo: '' }]);
  };

  const updateEntry = (index: number, field: string, value: any) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const totalDebit = entries.reduce((sum, e) => sum + (Number(e.debit) || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (Number(e.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSave = async () => {
    if (!activeCompany || !isBalanced) return;
    
    const result = await create({
      companyId: activeCompany.id,
      date,
      reference,
      description,
      totalAmount: totalDebit,
      status: 'posted',
      entries: entries as JournalEntry[],
    });
    
    if (result.success) {
      setIsModalOpen(false);
      setEntries([{ accountId: '', debit: 0, credit: 0, memo: '' }]);
      setReference('');
      setDescription('');
    }
  };

  const columns = [
    { key: 'date', header: 'التاريخ', render: (row: Transaction) => row.date },
    { key: 'reference', header: 'المرجع', render: (row: Transaction) => row.reference || '-' },
    { key: 'description', header: 'البيان', render: (row: Transaction) => row.description || '-' },
    { key: 'totalAmount', header: 'المبلغ', align: 'right' as const, render: (row: Transaction) => 
      Number(row.totalAmount).toLocaleString('ar-SA', { minimumFractionDigits: 2 })
    },
    { key: 'status', header: 'الحالة', render: (row: Transaction) => (
      <span className={cn(
        'px-2 py-0.5 rounded-full text-xs',
        row.status === 'posted' ? 'bg-success-100 text-success-700' : 
        row.status === 'draft' ? 'bg-warning-100 text-warning-700' :
        'bg-slate-100 text-slate-700'
      )}>
        {row.status === 'posted' ? 'مرحل' : row.status === 'draft' ? 'مسودة' : 'ملغي'}
      </span>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">القيود اليومية</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">تسجيل القيود المحاسبية المزدوجة</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
          قيد جديد
        </Button>
      </div>

      <Card>
        <Table<Transaction>
          data={transactions}
          columns={columns}
          keyExtractor={(row, i) => row.id || String(i)}
          isLoading={isLoading}
          emptyMessage="لا توجد قيود"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="قيد يومي جديد"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button 
              variant="primary" 
              leftIcon={<Save size={16} />} 
              onClick={handleSave}
              disabled={!isBalanced}
            >
              حفظ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="التاريخ" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Input label="المرجع" value={reference} onChange={e => setReference(e.target.value)} />
          </div>
          <Input label="البيان" value={description} onChange={e => setDescription(e.target.value)} />
          
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="text-xs font-semibold text-slate-500 p-2 text-right">الحساب</th>
                  <th className="text-xs font-semibold text-slate-500 p-2 text-right w-32">مدين</th>
                  <th className="text-xs font-semibold text-slate-500 p-2 text-right w-32">دائن</th>
                  <th className="text-xs font-semibold text-slate-500 p-2 text-right">ملاحظات</th>
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
                      />
                    </td>
                    <td className="p-2">
                      <Input 
                        type="number"
                        value={String(entry.credit || '')}
                        onChange={e => updateEntry(idx, 'credit', Number(e.target.value))}
                      />
                    </td>
                    <td className="p-2">
                      <Input 
                        value={entry.memo || ''}
                        onChange={e => updateEntry(idx, 'memo', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800 font-semibold">
                <tr>
                  <td className="p-2 text-right">المجموع</td>
                  <td className={cn('p-2 text-right', totalDebit !== totalCredit ? 'text-danger-600' : '')}>
                    {totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={cn('p-2 text-right', totalDebit !== totalCredit ? 'text-danger-600' : '')}>
                    {totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          
          <Button variant="secondary" onClick={addEntry}>+ إضافة سطر</Button>
          
          {!isBalanced && entries.length > 1 && (
            <p className="text-danger-600 text-sm">القيد غير متوازن: الفرق = {(totalDebit - totalCredit).toLocaleString('ar-SA')}</p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default JournalEntriesPage;
