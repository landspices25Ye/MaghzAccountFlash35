import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Package, Warehouse } from 'lucide-react';
import { cn } from '@/core/utils';

const inventoryMenu = [
  { id: 'products', label: 'المنتجات', icon: Package, path: '/inventory/products' },
  { id: 'warehouses', label: 'المستودعات', icon: Warehouse, path: '/inventory/warehouses' },
];

export const InventoryPage: React.FC = () => {
  const location = useLocation();
  const isRoot = location.pathname === '/inventory';

  return (
    <div className="space-y-6 animate-fade-in">
      {isRoot ? (
        <>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">المخازن</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">إدارة المنتجات والمستودعات والمخزون</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventoryMenu.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className="card flex items-center gap-4 p-5 hover:border-primary-500 dark:hover:border-primary-400 transition-colors group"
                >
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-primary-200 dark:group-hover:bg-primary-800/40 transition-colors">
                    <Icon size={24} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-50">{item.label}</h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
            {inventoryMenu.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <Outlet />
        </>
      )}
    </div>
  );
};

export default InventoryPage;
