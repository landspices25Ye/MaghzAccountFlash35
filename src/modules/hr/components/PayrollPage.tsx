import React from 'react';
import { Banknote, Plus } from 'lucide-react';
import { Card, Button } from '@/core/ui/components';

export const PayrollPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Banknote size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">مسير الرواتب</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">حساب الرواتب الشهرية</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />}>مسير جديد</Button>
      </div>
      <Card><div className="p-8 text-center text-slate-400">لا يوجد مسير رواتب</div></Card>
    </div>
  );
};

export default PayrollPage;
