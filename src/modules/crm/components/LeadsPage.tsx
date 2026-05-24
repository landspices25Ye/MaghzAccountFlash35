import React from 'react';
import { Target, Plus } from 'lucide-react';
import { Card, Button } from '@/core/ui/components';

export const LeadsPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">العملاء المحتملين</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة العملاء المحتملين</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />}>عميل محتمل جديد</Button>
      </div>
      <Card><div className="p-8 text-center text-slate-400">لا يوجد عملاء محتملين</div></Card>
    </div>
  );
};

export default LeadsPage;
