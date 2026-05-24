import React, { useState } from 'react';
import { Calculator, Plus, ChevronDown, ChevronLeft } from 'lucide-react';
import { Card, Button, Input, Modal } from '@/core/ui/components';
import { useAccounts } from '../hooks/useAccounting';
import { useAppStore } from '@/core/store';
import { cn } from '@/core/utils';
import type { Account } from '../types';

const TYPE_LABELS: Record<string, string> = {
  asset: 'أصول',
  liability: 'التزامات',
  equity: 'حقوق ملكية',
  revenue: 'إيرادات',
  expense: 'مصروفات',
};

const NATURE_COLORS: Record<string, string> = {
  debit: 'text-blue-600',
  credit: 'text-rose-600',
};

function AccountTreeItem({ account, level = 0 }: { account: Account; level?: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = account.children && account.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors',
          level > 0 && 'mr-8 border-r-2 border-slate-200 dark:border-slate-700'
        )}
        style={{ marginRight: `${level * 24}px` }}
      >
        {hasChildren && (
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}
        
        <div className="flex-1 flex items-center gap-3">
          <span className="font-mono text-sm text-slate-500 w-20">{account.code}</span>
          <span className="font-medium text-slate-900 dark:text-slate-50">{account.nameAr}</span>
          {account.nameEn && <span className="text-xs text-slate-400">({account.nameEn})</span>}
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
            {TYPE_LABELS[account.type]}
          </span>
          <span className={cn('font-mono', NATURE_COLORS[account.nature])}>
            {account.nature === 'debit' ? 'مدين' : 'دائن'}
          </span>
          {!account.isGroup && (
            <span className="font-mono text-slate-700 dark:text-slate-200 w-32 text-left tabular-nums">
              {Number(account.balance).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {account.children!.map(child => (
            <AccountTreeItem key={child.id} account={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export const ChartOfAccounts: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { accounts, isLoading } = useAccounts(activeCompany?.id || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Account>>({
    type: 'asset',
    nature: 'debit',
    isGroup: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">شجرة الحسابات</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">دليل الحسابات المحاسبية</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
          حساب جديد
        </Button>
      </div>

      <Card>
        <div className="space-y-1">
          {accounts.map(account => (
            <AccountTreeItem key={account.id} account={account} />
          ))}
          {accounts.length === 0 && (
            <p className="text-center text-slate-400 py-8">لا توجد حسابات</p>
          )}
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="إضافة حساب جديد"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button variant="primary">حفظ</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="الرمز" value={formData.code || ''} onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))} />
          <Input label="الاسم (عربي)" value={formData.nameAr || ''} onChange={e => setFormData(prev => ({ ...prev, nameAr: e.target.value }))} />
          <Input label="الاسم (إنجليزي)" value={formData.nameEn || ''} onChange={e => setFormData(prev => ({ ...prev, nameEn: e.target.value }))} />
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">النوع</label>
            <select
              value={formData.type}
              onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as Account['type'] }))}
              className="form-control"
            >
              <option value="asset">أصول</option>
              <option value="liability">التزامات</option>
              <option value="equity">حقوق ملكية</option>
              <option value="revenue">إيرادات</option>
              <option value="expense">مصروفات</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">الطبيعة</label>
            <select
              value={formData.nature}
              onChange={e => setFormData(prev => ({ ...prev, nature: e.target.value as Account['nature'] }))}
              className="form-control"
            >
              <option value="debit">مدين</option>
              <option value="credit">دائن</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChartOfAccounts;
