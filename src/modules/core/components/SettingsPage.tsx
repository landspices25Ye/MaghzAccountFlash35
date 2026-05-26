import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Building2,
  Coins,
  Receipt,
  GitBranch,
  Hash,
  Users,
  Shield,
  DatabaseBackup,
  ChevronLeft,
  Settings,
} from 'lucide-react';
import { cn } from '@/core/utils';

interface SettingsMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
}

const menuItems: SettingsMenuItem[] = [
  { id: 'company', label: 'بيانات الشركة', icon: Building2, path: '/settings/company' },
  { id: 'currencies', label: 'العملات', icon: Coins, path: '/settings/currencies' },
  { id: 'vat', label: 'إعدادات الضريبة', icon: Receipt, path: '/settings/vat' },
  { id: 'branches', label: 'الفروع', icon: GitBranch, path: '/settings/branches' },
  { id: 'document-sequences', label: 'الترقيم المتسلسل', icon: Hash, path: '/settings/document-sequences' },
  { id: 'users', label: 'المستخدمين', icon: Users, path: '/settings/users' },
  { id: 'roles', label: 'الأدوار والصلاحيات', icon: Shield, path: '/roles' },
  { id: 'backup', label: 'النسخ الاحتياطي', icon: DatabaseBackup, path: '/settings/backup' },
];

export const SettingsPage: React.FC = () => {
  const location = useLocation();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Settings size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">الإعدادات</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة إعدادات النظام والشركة</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Menu */}
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  <Icon size={18} />
                  <span className="text-sm">{item.label}</span>
                  {isActive && <ChevronLeft size={16} className="mr-auto" />}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
