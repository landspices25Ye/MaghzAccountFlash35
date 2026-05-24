import React from 'react';
import { Scale } from 'lucide-react';
import { Card } from '@/core/ui/components';
import { useTrialBalance } from '../hooks/useAccounting';
import { useAppStore } from '@/core/store';
import { Table } from '@/core/ui/components';

export const TrialBalancePage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { rows, isLoading } = useTrialBalance(activeCompany?.id || '');

  const columns = [
    { key: 'accountCode', header: 'الرمز', width: '100px' },
    { key: 'accountName', header: 'اسم الحساب' },
    { key: 'debit', header: 'مدين', align: 'right' as const, render: (row: any) => 
      Number(row.debit).toLocaleString('ar-SA', { minimumFractionDigits: 2 })
    },
    { key: 'credit', header: 'دائن', align: 'right' as const, render: (row: any) => 
      Number(row.credit).toLocaleString('ar-SA', { minimumFractionDigits: 2 })
    },
    { key: 'balance', header: 'الرصيد', align: 'right' as const, render: (row: any) => 
      Number(row.balance).toLocaleString('ar-SA', { minimumFractionDigits: 2 })
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Scale size={28} className="text-primary-600 dark:text-primary-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">ميزان المراجعة</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">تقرير ميزان المراجعة التفصيلي</p>
        </div>
      </div>

      <Card>
        <Table
          data={rows}
          columns={columns}
          keyExtractor={(row, i) => row.accountId || String(i)}
          emptyMessage="لا توجد بيانات"
        />
      </Card>
    </div>
  );
};

export default TrialBalancePage;
