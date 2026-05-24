import React from 'react';
import { BarChart2, PieChart, TrendingUp, Package, Users, Truck } from 'lucide-react';
import { Card } from '@/core/ui/components';
import { Link } from 'react-router-dom';

const reportModules = [
  {
    id: 'sales-analysis',
    title: 'تحليل المبيعات',
    description: 'أداء المبيعات الشهري، أفضل العملاء، تحليل المنتجات',
    icon: TrendingUp,
    color: 'bg-blue-500',
    path: '/reports/sales-analysis',
  },
  {
    id: 'inventory-analysis',
    title: 'تحليل المخزون',
    description: 'حالة المخزون، دوران البضاعة، منتجات منخفضة',
    icon: Package,
    color: 'bg-amber-500',
    path: '/reports/inventory-analysis',
  },
  {
    id: 'customer-statement',
    title: 'كشف حساب العملاء',
    description: 'حركات العملاء، الأرصدة، الديون المستحقة',
    icon: Users,
    color: 'bg-emerald-500',
    path: '/reports/customer-statement',
  },
  {
    id: 'supplier-statement',
    title: 'كشف حساب الموردين',
    description: 'حركات الموردين، الأرصدة، الالتزامات',
    icon: Truck,
    color: 'bg-purple-500',
    path: '/reports/supplier-statement',
  },
  {
    id: 'profit-analysis',
    title: 'تحليل الربحية',
    description: 'هامش الربح، تحليل التكاليف، ربحية المنتجات',
    icon: PieChart,
    color: 'bg-rose-500',
    path: '/reports/profit-analysis',
  },
  {
    id: 'financial-overview',
    title: 'النظرة المالية',
    description: 'الأصول، الالتزامات، حقوق الملكية، النقدية',
    icon: BarChart2,
    color: 'bg-cyan-500',
    path: '/accounting/balance-sheet',
  },
];

export const ReportsHubPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">التقارير والتحليلات</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">تقارير تحليلية متقدمة لجميع وحدات النظام</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportModules.map((module) => (
          <Link key={module.id} to={module.path}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 ${module.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                    <module.icon size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50">{module.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{module.description}</p>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ReportsHubPage;
