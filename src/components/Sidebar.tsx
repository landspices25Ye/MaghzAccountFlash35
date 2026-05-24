import { 
  LayoutDashboard, 
  Settings, 
  BookOpen, 
  Warehouse, 
  ShoppingBag, 
  DollarSign, 
  Factory, 
  UserCheck, 
  HeartHandshake, 
  BarChart3,
  Menu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '../core/store/appStore';
import { useTranslation } from '../core/i18n/useTranslation';
import '../styles/sidebar.css';

export default function Sidebar() {
  const { t, language } = useTranslation();
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const activeView = useAppStore((state) => state.activeView);
  const setActiveView = useAppStore((state) => state.setActiveView);

  const menuItems = [
    { id: 'dashboard', labelKey: 'dashboard.title', icon: LayoutDashboard },
    { id: 'accounts', labelKey: 'sidebar.accounts', icon: BookOpen },
    { id: 'inventory', labelKey: 'sidebar.inventory', icon: Warehouse },
    { id: 'purchases', labelKey: 'sidebar.purchases', icon: ShoppingBag },
    { id: 'sales', labelKey: 'sidebar.sales', icon: DollarSign },
    { id: 'manufacturing', labelKey: 'sidebar.manufacturing', icon: Factory },
    { id: 'hr', labelKey: 'sidebar.hr', icon: UserCheck },
    { id: 'crm', labelKey: 'sidebar.crm', icon: HeartHandshake },
    { id: 'reports', labelKey: 'sidebar.reports', icon: BarChart3 },
    { id: 'settings', labelKey: 'sidebar.settings', icon: Settings },
  ] as const;

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">م</div>
        <div className="sidebar-brand-info">
          <span className="sidebar-brand-name">{t('appName')}</span>
          <span className="sidebar-brand-sub">{t('appSubtitle')}</span>
        </div>
        <button 
          onClick={toggleSidebar} 
          className="btn-icon" 
          style={{ marginInlineStart: 'auto', color: 'white' }}
          title={sidebarOpen ? 'Collapse' : 'Expand'}
        >
          {sidebarOpen ? (
            language === 'ar' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />
          ) : (
            <Menu size={18} />
          )}
        </button>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              title={!sidebarOpen ? t(item.labelKey) : undefined}
            >
              <span className="sidebar-item-icon">
                <Icon size={20} />
              </span>
              <span className="sidebar-item-text">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-avatar">مد</div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">مدير النظام</span>
          <span className="sidebar-user-role">Administrator</span>
        </div>
      </div>
    </aside>
  );
}
