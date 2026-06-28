import React from 'react';
import { BarChart2, PieChart, TrendingUp, Package, Users, Truck, Settings } from 'lucide-react';
import { Card } from '@/core/ui/components';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/core/i18n/useTranslation';
import { usePermission } from '@/modules/auth/hooks/usePermission';

const reportModules = [
  {
    id: 'sales-analysis',
    titleKey: 'reports.salesAnalysis',
    descriptionKey: 'reports.hub.salesAnalysis.desc',
    icon: TrendingUp,
    color: 'bg-blue-500',
    path: '/reports/sales-analysis',
  },
  {
    id: 'inventory-analysis',
    titleKey: 'reports.inventoryAnalysis',
    descriptionKey: 'reports.hub.inventoryAnalysis.desc',
    icon: Package,
    color: 'bg-amber-500',
    path: '/reports/inventory-analysis',
  },
  {
    id: 'customer-statement',
    titleKey: 'reports.customerStatement',
    descriptionKey: 'reports.hub.customerStatement.desc',
    icon: Users,
    color: 'bg-emerald-500',
    path: '/reports/customer-statement',
  },
  {
    id: 'supplier-statement',
    titleKey: 'reports.supplierStatement',
    descriptionKey: 'reports.hub.supplierStatement.desc',
    icon: Truck,
    color: 'bg-purple-500',
    path: '/reports/supplier-statement',
  },
  {
    id: 'profit-analysis',
    titleKey: 'reports.profitAnalysis',
    descriptionKey: 'reports.hub.profitAnalysis.desc',
    icon: PieChart,
    color: 'bg-rose-500',
    path: '/reports/profit-analysis',
  },
  {
    id: 'custom-builder',
    titleKey: 'reports.customReportBuilder',
    descriptionKey: 'reports.hub.customReportBuilder.desc',
    icon: Settings,
    color: 'bg-cyan-500',
    path: '/reports/custom-builder',
  },
  {
    id: 'financial-overview',
    titleKey: 'accounting.balanceSheet.title',
    descriptionKey: 'reports.hub.financialOverview.desc',
    icon: BarChart2,
    color: 'bg-indigo-500',
    path: '/accounting/balance',
  },
];

export const ReportsHubPage: React.FC = () => {
  const { t } = useTranslation();
  const canView = usePermission('reports.view');
  const canCustom = usePermission('reports.custom');

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <BarChart2 size={48} className="mx-auto mb-4 text-slate-400" />
          <p className="text-lg font-medium text-slate-700 dark:text-slate-200">{t('reports.noPermission')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('sidebar.reports')}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('reports.hub.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportModules.map((module) => {
          // Hide the custom builder if user lacks reports.custom permission
          if (module.id === 'custom-builder' && !canCustom) return null;
          return (
            <Link key={module.id} to={module.path}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 ${module.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                      <module.icon size={28} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50">{t(module.titleKey)}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t(module.descriptionKey)}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ReportsHubPage;
