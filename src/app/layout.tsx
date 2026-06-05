import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Calculator,
  Package,
  ShoppingCart,
  Store,
  Factory,
  Users,
  HeartHandshake,
  BarChart3,
  Settings,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Building2,
  LogOut,
  User,
  Moon,
  Sun,
  Globe,
} from 'lucide-react';
import { useAppStore } from '@/core/store';
import { useAuthStore } from '@/modules/auth/store';
import { useCanAccessModule } from '@/modules/auth/hooks/usePermission';
import { cn } from '@/core/utils';
import type { Permission } from '@/modules/auth/types';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  path: string;
  module: 'core' | 'accounting' | 'inventory' | 'sales' | 'purchases' | 'manufacturing' | 'hr' | 'crm' | 'reports' | 'settings';
  children?: { label: string; path: string; permission?: Permission }[];
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, path: '/', module: 'core' },
  {
    id: 'accounting',
    label: 'الحسابات',
    icon: Calculator,
    path: '/accounting',
    module: 'accounting',
    children: [
      { label: 'شجرة الحسابات', path: '/accounting/chart' },
      { label: 'القيود اليومية', path: '/accounting/journal' },
      { label: 'ميزان المراجعة', path: '/accounting/trial' },
      { label: 'الميزانية العمومية', path: '/accounting/balance' },
      { label: 'قائمة الدخل', path: '/accounting/profit' },
      { label: 'التدفقات النقدية', path: '/accounting/cashflow' },
      { label: 'سندات القبض', path: '/accounting/receipt-vouchers' },
      { label: 'سندات الصرف', path: '/accounting/payment-vouchers' },
    ],
  },
  {
    id: 'inventory',
    label: 'المخازن',
    icon: Package,
    path: '/inventory',
    module: 'inventory',
    children: [
      { label: 'المنتجات', path: '/inventory/products' },
      { label: 'المستودعات', path: '/inventory/warehouses' },
      { label: 'المخزون', path: '/inventory/stock' },
      { label: 'الحركات المخزنية', path: '/inventory/transactions' },
      { label: 'التسويات', path: '/inventory/adjustments' },
    ],
  },
  {
    id: 'sales',
    label: 'المبيعات',
    icon: ShoppingCart,
    path: '/sales',
    module: 'sales',
    children: [
      { label: 'فواتير المبيعات', path: '/sales/invoices' },
      { label: 'العملاء', path: '/sales/customers' },
      { label: 'عروض الأسعار', path: '/sales/quotations' },
      { label: 'مردودات المبيعات', path: '/sales/returns' },
    ],
  },
  {
    id: 'purchases',
    label: 'المشتريات',
    icon: Store,
    path: '/purchases',
    module: 'purchases',
    children: [
      { label: 'فواتير المشتريات', path: '/purchases/invoices' },
      { label: 'الموردين', path: '/purchases/suppliers' },
      { label: 'أوامر الشراء', path: '/purchases/orders' },
      { label: 'مردودات المشتريات', path: '/purchases/returns' },
    ],
  },
  {
    id: 'manufacturing',
    label: 'التصنيع',
    icon: Factory,
    path: '/manufacturing',
    module: 'manufacturing',
    children: [
      { label: 'فاتير المواد', path: '/manufacturing/bom' },
      { label: 'أوامر التشغيل', path: '/manufacturing/work-orders' },
    ],
  },
  {
    id: 'hr',
    label: 'الموظفين',
    icon: Users,
    path: '/hr',
    module: 'hr',
    children: [
      { label: 'الموظفين', path: '/hr/employees' },
      { label: 'الحضور', path: '/hr/attendance' },
      { label: 'الرواتب', path: '/hr/payroll' },
      { label: 'الإجازات', path: '/hr/leaves' },
      { label: 'نهاية الخدمة', path: '/hr/end-of-service' },
    ],
  },
  {
    id: 'crm',
    label: 'العملاء',
    icon: HeartHandshake,
    path: '/crm',
    module: 'crm',
    children: [
      { label: 'العملاء المحتملين', path: '/crm/leads' },
      { label: 'الفرص', path: '/crm/opportunities' },
      { label: 'المهام', path: '/crm/tasks' },
      { label: 'النشاطات', path: '/crm/activities' },
    ],
  },
  {
    id: 'reports',
    label: 'التقارير',
    icon: BarChart3,
    path: '/reports',
    module: 'reports',
    children: [
      { label: 'مركز التقارير', path: '/reports' },
      { label: 'تحليل المبيعات', path: '/reports/sales-analysis' },
      { label: 'تحليل المخزون', path: '/reports/inventory-analysis' },
      { label: 'كشف حساب عميل', path: '/reports/customer-statement' },
      { label: 'كشف حساب مورد', path: '/reports/supplier-statement' },
      { label: 'تحليل الأرباح', path: '/reports/profit-analysis' },
      { label: 'تقرير مخصص', path: '/reports/custom-builder' },
    ],
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    icon: Settings,
    path: '/settings',
    module: 'settings',
    children: [
      { label: 'بيانات الشركة', path: '/settings/company' },
      { label: 'العملات', path: '/settings/currencies' },
      { label: 'الضريبة', path: '/settings/vat' },
      { label: 'الفروع', path: '/settings/branches' },
      { label: 'المستخدمين', path: '/settings/users' },
      { label: 'الأدوار', path: '/roles' },
    ],
  },
];

function SidebarItem({ item, sidebarOpen }: { item: MenuItem; sidebarOpen: boolean }) {
  const location = useLocation();
  const canView = useCanAccessModule(item.module);
  const user = useAuthStore((state) => state.user);
  const visibleChildren = React.useMemo(
    () =>
      (item.children ?? []).filter((c) => !c.permission || useAuthStore.getState().hasPermission(c.permission)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item.children, user]
  );
  const hasChildren = visibleChildren.length > 0;
  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  const [isExpanded, setIsExpanded] = useState(isActive);

  if (!canView) return null;

  return (
    <div className="space-y-0.5">
      <Link
        to={item.path}
        onClick={(e) => {
          if (hasChildren) {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
          isActive
            ? 'bg-primary-600/20 text-primary-400'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
        )}
        title={!sidebarOpen ? item.label : undefined}
      >
        <item.icon size={20} className="shrink-0" />
        {sidebarOpen && (
          <>
            <span className="text-sm font-medium flex-1">{item.label}</span>
            {hasChildren && (
              <ChevronDown
                size={14}
                className={cn('transition-transform duration-200', isExpanded && 'rotate-180')}
              />
            )}
          </>
        )}
      </Link>

      {hasChildren && sidebarOpen && isExpanded && (
        <div className="mr-6 space-y-0.5 border-r border-slate-800 pr-2">
          {visibleChildren.map((child) => {
            const childActive = location.pathname === child.path;
            return (
              <Link
                key={child.path}
                to={child.path}
                className={cn(
                  'flex items-center px-3 py-2 rounded-lg text-sm transition-colors',
                  childActive
                    ? 'bg-primary-600/10 text-primary-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const Sidebar: React.FC = () => {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  return (
    <aside
      className={cn(
        'h-screen bg-slate-900 text-slate-100 flex flex-col transition-all duration-300 ease-in-out shrink-0',
        sidebarOpen ? 'w-72' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800">
        {sidebarOpen ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg">محاسبة المهذب</span>
          </div>
        ) : (
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mx-auto">
            <Building2 size={18} className="text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <SidebarItem key={item.id} item={item} sidebarOpen={sidebarOpen} />
        ))}
      </nav>

      {/* Toggle */}
      <div className="p-2 border-t border-slate-800">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
    </aside>
  );
};

export const Header: React.FC = () => {
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const activeCompany = useAppStore((state) => state.activeCompany);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        {activeCompany && (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Building2 size={16} />
            <span className="font-medium">{activeCompany.name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {user && (
          <div className="flex items-center gap-3 pl-2">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <User size={16} />
              <span className="font-medium">{user.username}</span>
              <span className="text-xs text-slate-400">({user.role})</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

        <button
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
        >
          <Globe size={18} />
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};

export const AppLayout = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Sidebar;
