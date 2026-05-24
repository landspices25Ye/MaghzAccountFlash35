import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Building2, Coins, Percent, MapPin, Database, ChevronLeft } from 'lucide-react';
import { cn } from '@/core/utils';

const settingsMenu = [
  { id: 'company', label: 'بيانات الشركة', icon: Building2, path: '/settings/company' },
  { id: 'currencies', label: 'العملات', icon: Coins, path: '/settings/currencies' },
  { id: 'vat', label: 'ضريبة القيمة المضافة', icon: Percent, path: '/settings/vat' },
  { id: 'branches', label: 'الفروع', icon: MapPin, path: '/settings/branches' },
  { id: 'backup', label: 'النسخ الاحتياطي', icon: Database, path: '/settings/backup' },
];

export const SettingsPage: React.FC = () => {
  const location = useLocation();
  const isRoot = location.pathname === '/settings';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">الإعدادات</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">إدارة إعدادات النظام والمؤسسة</p>
      </div>

      {isRoot ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {settingsMenu.map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  'card flex items-center gap-4 p-5 hover:border-primary-500 dark:hover:border-primary-400 transition-colors group'
                )}
              >
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-primary-200 dark:group-hover:bg-primary-800/40 transition-colors">
                  <Icon size={24} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-50">{item.label}</h3>
                </div>
                <ChevronLeft size={20} className="text-slate-400" />
              </Link>
            );
          })}
        </div>
      ) : (
        <Outlet />
      )}
    </div>
  );
};

export default SettingsPage;
