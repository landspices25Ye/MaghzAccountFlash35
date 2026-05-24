import React from 'react';
import { FileText } from 'lucide-react';

export const BalanceSheetPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <FileText size={28} className="text-primary-600 dark:text-primary-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">الميزانية العمومية</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">تقرير المركز المالي</p>
        </div>
      </div>
      <div className="card p-8 text-center text-slate-400">
        قيد التطوير
      </div>
    </div>
  );
};

export default BalanceSheetPage;
