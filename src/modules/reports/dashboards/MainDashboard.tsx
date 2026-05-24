import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, FileText } from 'lucide-react';
import { Card } from '@/core/ui/components';
import { useTranslation } from '@/core/i18n/useTranslation';

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: Icon, trend = 'neutral', change }) => {
  const trendColors = {
    up: 'text-emerald-500',
    down: 'text-rose-500',
    neutral: 'text-slate-500',
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-50 tabular-nums">{value}</p>
          {change && (
            <p className={cn('text-sm mt-1', trendColors[trend])}>
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

import { cn } from '@/core/utils';

const MainDashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('sidebar.dashboard')}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">نظرة عامة على أداء المؤسسة</p>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="الإيرادات اليومية" 
          value="0.00 YER" 
          icon={TrendingUp}
          trend="up"
          change="12%"
        />
        <KpiCard 
          title="المصروفات" 
          value="0.00 YER" 
          icon={TrendingDown}
          trend="down"
          change="5%"
        />
        <KpiCard 
          title="صافي الربح" 
          value="0.00 YER" 
          icon={DollarSign}
        />
        <KpiCard 
          title="الفواتير" 
          value="0" 
          icon={FileText}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">المبيعات الشهرية</h3>
            <div className="h-64 flex items-center justify-center text-slate-400">
              <BarChartPlaceholder />
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">أعلى المنتجات مبيعاً</h3>
            <div className="h-64 flex items-center justify-center text-slate-400">
              <PieChartPlaceholder />
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <div className="p-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">عمر الديون (A/R)</h3>
              <div className="h-48 flex items-center justify-center text-slate-400">
                قيد التطوير
              </div>
            </div>
          </Card>
        </div>
        <div>
          <Card>
            <div className="p-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">التنبيهات</h3>
              <div className="space-y-3">
                <AlertItem icon={Package} color="amber" text="منتجات مخزون منخفض" count={3} />
                <AlertItem icon={FileText} color="blue" text="فواتير مستحقة" count={5} />
                <AlertItem icon={ShoppingCart} color="purple" text="طلبات جديدة" count={2} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

function AlertItem({ icon: Icon, color, text, count }: { icon: any; color: string; text: string; count: number }) {
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    rose: 'bg-rose-500',
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white', colorClasses[color])}>
        <Icon size={14} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{text}</p>
      </div>
      <span className="text-sm font-bold text-slate-900 dark:text-slate-50">{count}</span>
    </div>
  );
}

function BarChartPlaceholder() {
  return (
    <div className="flex items-end gap-2 h-48">
      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((h, i) => (
        <div key={i} className="flex-1 bg-primary-200 dark:bg-primary-900/40 rounded-t" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

function PieChartPlaceholder() {
  return (
    <div className="w-32 h-32 rounded-full border-8 border-primary-200 dark:border-primary-900/40 relative">
      <div className="absolute inset-0 rounded-full border-8 border-primary-500 dark:border-primary-600" style={{ clipPath: 'polygon(0 0, 60% 0, 60% 100%, 0 100%)' }} />
    </div>
  );
}

export default MainDashboard;
