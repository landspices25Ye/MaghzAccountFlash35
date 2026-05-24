import React from 'react';
import { GitBranch, Plus } from 'lucide-react';
import { Card, Button } from '@/core/ui/components';

export const BomPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">فاتير المواد</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">BOM - Bill of Materials</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />}>BOM جديد</Button>
      </div>
      <Card><div className="p-8 text-center text-slate-400">لا توجد BOMs</div></Card>
    </div>
  );
};

export default BomPage;
