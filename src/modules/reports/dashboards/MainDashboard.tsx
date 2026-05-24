import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, FileText, Package, ShoppingCart, Users, AlertTriangle } from 'lucide-react';
import { Card } from '@/core/ui/components';
import { useTranslation } from '@/core/i18n/useTranslation';
import { useAppStore } from '@/core/store';
import { useDashboard } from './useDashboard';
import { MonthlyRevenueChart, TopProductsChart, ArAgingChart, CashFlowChart } from './charts';
import { Link } from 'react-router-dom';

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
  onClick?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: Icon, trend = 'neutral', change, onClick }) => {
  const trendColors = {
    up: 'text-emerald-500',
    down: 'text-rose-500',
    neutral: 'text-slate-500',
  };

  return (
    <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-50 tabular-nums">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${trendColors[trend]}`}>
              {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{change}
            </p>
          )}
        </div>
        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>
      </div>
    </div>
  );
};

const MainDashboard: React.FC = () => {
  const { t } = useTranslation();
  const activeCompany = useAppStore(state => state.activeCompany);
  const { data, isLoading } = useDashboard(activeCompany?.id || '');

  const formatCurrency = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M YER`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K YER`;
    return `${n} YER`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const kpi = data || {
    totalRevenue: 0, totalExpenses: 0, netProfit: 0, invoicesCount: 0,
    productsCount: 0, customersCount: 0, suppliersCount: 0, employeesCount: 0,
    lowStockCount: 0, overdueInvoicesCount: 0,
    monthlyRevenue: [], topProducts: [], arAging: [], cashFlow: [],
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('sidebar.dashboard')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">نظرة عامة على أداء المؤسسة</p>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {activeCompany?.name || 'شركة المغزى'}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/sales/invoices">
          <KpiCard
            title="إجمالي الإيرادات"
            value={formatCurrency(kpi.totalRevenue)}
            icon={TrendingUp}
            trend="up"
            change="من فواتير المبيعات"
          />
        </Link>
        <Link to="/accounting/profit-loss">
          <KpiCard
            title="إجمالي المصروفات"
            value={formatCurrency(kpi.totalExpenses)}
            icon={TrendingDown}
            trend="down"
            change="من قائمة الدخل"
          />
        </Link>
        <Link to="/accounting/profit-loss">
          <KpiCard
            title="صافي الربح"
            value={formatCurrency(kpi.netProfit)}
            icon={DollarSign}
            trend={kpi.netProfit >= 0 ? 'up' : 'down'}
            change="ربحية المؤسسة"
          />
        </Link>
        <Link to="/sales/invoices">
          <KpiCard
            title="الفواتير"
            value={`${kpi.invoicesCount}`}
            icon={FileText}
          />
        </Link>
        <Link to="/inventory/products">
          <KpiCard
            title="المنتجات"
            value={`${kpi.productsCount}`}
            icon={Package}
          />
        </Link>
        <Link to="/sales/customers">
          <KpiCard
            title="العملاء"
            value={`${kpi.customersCount}`}
            icon={Users}
          />
        </Link>
        <Link to="/purchases/suppliers">
          <KpiCard
            title="الموردين"
            value={`${kpi.suppliersCount}`}
            icon={ShoppingCart}
          />
        </Link>
        <Link to="/hr/employees">
          <KpiCard
            title="الموظفين"
            value={`${kpi.employeesCount}`}
            icon={Users}
          />
        </Link>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonthlyRevenueChart data={kpi.monthlyRevenue} />
        <TopProductsChart data={kpi.topProducts} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ArAgingChart data={kpi.arAging} />
        <CashFlowChart data={kpi.cashFlow} />
      </div>

      {/* Alerts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <Card>
            <div className="p-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">التنبيهات</h3>
              <div className="space-y-3">
                <AlertItem icon={Package} color="amber" text="منتجات مخزون منخفض" count={kpi.lowStockCount} link="/inventory/products" />
                <AlertItem icon={FileText} color="blue" text="فواتير مستحقة" count={kpi.overdueInvoicesCount} link="/sales/invoices" />
                <AlertItem icon={AlertTriangle} color="rose" text="ديون متأخرة +90 يوم" count={kpi.arAging[3]?.amount ? Math.floor(kpi.arAging[3].amount / 100000) : 0} link="/sales/customers" />
                <AlertItem icon={Users} color="purple" text="موظفين نشطين" count={kpi.employeesCount} link="/hr/employees" />
              </div>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <div className="p-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">إجراءات سريعة</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <QuickActionButton label="فاتورة جديدة" color="bg-blue-500" link="/sales/invoices" />
                <QuickActionButton label="قيد يومي" color="bg-emerald-500" link="/accounting/journal" />
                <QuickActionButton label="منتج جديد" color="bg-amber-500" link="/inventory/products" />
                <QuickActionButton label="عميل جديد" color="bg-purple-500" link="/sales/customers" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

function AlertItem({ icon: Icon, color, text, count, link }: { icon: any; color: string; text: string; count: number; link: string }) {
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    rose: 'bg-rose-500',
  };

  return (
    <Link to={link} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${colorClasses[color]}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{text}</p>
      </div>
      <span className="text-sm font-bold text-slate-900 dark:text-slate-50">{count}</span>
    </Link>
  );
}

function QuickActionButton({ label, color, link }: { label: string; color: string; link: string }) {
  return (
    <Link to={link} className={`${color} text-white py-3 px-4 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity text-center block`}>
      {label}
    </Link>
  );
}

export default MainDashboard;
