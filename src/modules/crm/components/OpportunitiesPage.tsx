import React from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import { Card, Button } from '@/core/ui/components';

export const OpportunitiesPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckSquare size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">الفرص</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة فرص المبيعات</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />}>فرصة جديدة</Button>
      </div>
      <Card><div className="p-8 text-center text-slate-400">لا توجد فرص</div></Card>
    </div>
  );
};

export default OpportunitiesPage;
