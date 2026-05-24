import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  Moon,
  Sun,
  Globe,
  Building2,
  LogOut,
  User,
} from 'lucide-react';
import { useAppStore } from '@/core/store';
import { useTranslation } from '@/core/i18n/useTranslation';
import { useAuthStore } from '@/modules/auth/store';
import { cn } from '@/core/utils';

const menuItems = [
  { id: 'dashboard', labelKey: 'sidebar.dashboard', icon: LayoutDashboard, path: '/', permission: 'core.view' },
  { id: 'accounting', labelKey: 'sidebar.accounting', icon: Calculator, path: '/accounting', permission: 'accounting.view' },
  { id: 'inventory', labelKey: 'sidebar.inventory', icon: Package, path: '/inventory', permission: 'inventory.view' },
  { id: 'sales', labelKey: 'sidebar.sales', icon: ShoppingCart, path: '/sales', permission: 'sales.view' },
  { id: 'purchases', labelKey: 'sidebar.purchases', icon: Store, path: '/purchases', permission: 'purchases.view' },
  { id: 'manufacturing', labelKey: 'sidebar.manufacturing', icon: Factory, path: '/manufacturing', permission: 'manufacturing.view' },
  { id: 'hr', labelKey: 'sidebar.hr', icon: Users, path: '/hr', permission: 'hr.view' },
  { id: 'crm', labelKey: 'sidebar.crm', icon: HeartHandshake, path: '/crm', permission: 'crm.view' },
  { id: 'reports', labelKey: 'sidebar.reports', icon: BarChart3, path: '/reports', permission: 'reports.view' },
  { id: 'settings', labelKey: 'sidebar.settings', icon: Settings, path: '/settings', permission: 'settings.view' },
];

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const location = useLocation();
  const hasPermission = useAuthStore((state) => state.hasPermission);

  return (
    <aside
      className={cn(
        'h-screen bg-slate-900 text-slate-100 flex flex-col transition-all duration-300 ease-in-out shrink-0',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800">
        {sidebarOpen ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg">{t('appName')}</span>
          </div>
        ) : (
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mx-auto">
            <Building2 size={18} className="text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          
          // Check permission
          if (!hasPermission(item.permission)) return null;
          
          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-600/20 text-primary-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              )}
              title={!sidebarOpen ? t(item.labelKey) : undefined}
            >
              <Icon size={20} className="shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{t(item.labelKey)}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Toggle */}
      <div className="p-2 border-t border-slate-800">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          {sidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </aside>
  );
};

export const Header: React.FC = () => {
  const { t } = useTranslation();
  const { theme, toggleTheme, language, setLanguage, activeCompany } = useAppStore();
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
        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 pl-2">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <User size={16} />
              <span className="font-medium">{user.username}</span>
              <span className="text-xs text-slate-400">({user.role})</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
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
          title={t('settings.language')}
        >
          <Globe size={18} />
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          title={t('settings.theme')}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
