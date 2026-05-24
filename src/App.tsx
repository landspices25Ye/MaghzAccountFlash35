import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AccountsModule from './components/Accounts/AccountsModule';
import { useAppStore } from './core/store/appStore';
import { useTranslation } from './core/i18n/useTranslation';
import { isElectron, pgPing, pgGetCompany } from './database/pgClient';
import { isElectronRealm, realmGetCompany } from './database/realmClient';
import { 
  Layers, 
  Settings2, 
  Briefcase, 
  HeartHandshake, 
  BarChart4, 
  Factory,
  ShoppingBag,
  DollarSign
} from 'lucide-react';

export default function App() {
  const { t, language } = useTranslation();
  const activeView = useAppStore((state) => state.activeView);
  const setDbStatus = useAppStore((state) => state.setDbStatus);
  const setRealmReady = useAppStore((state) => state.setRealmReady);
  const setActiveCompany = useAppStore((state) => state.setActiveCompany);

  // Initialise database layers on mount
  useEffect(() => {
    async function initDatabase() {
      setDbStatus('connecting', false);

      // ── Layer 1: PostgreSQL via Drizzle (Electron + local PG server) ──────
      if (isElectron()) {
        console.log('[App] Electron detected. Checking PostgreSQL (Drizzle)...');
        const pingResult = await pgPing();
        if (pingResult.success) {
          console.log('[App] PostgreSQL connected successfully.');
          setDbStatus('postgresql', true);
          const compResult = await pgGetCompany();
          if (compResult.success && compResult.rows && compResult.rows.length > 0) {
            const comp = compResult.rows[0];
            setActiveCompany(comp.name, comp.id, comp.currency);
            console.log('[App] Company loaded from PostgreSQL:', comp.name);
          }
          // Also mark Realm as ready for offline caching alongside PostgreSQL
          try {
            const realmComp = await realmGetCompany();
            if (realmComp.success) {
              setRealmReady(true);
              console.log('[App] Realm local cache is also ready.');
            }
          } catch {
            console.warn('[App] Realm not available alongside PostgreSQL.');
          }
          return;
        }
        console.warn('[App] PostgreSQL unavailable. Falling back to Realm...');
      }

      // ── Layer 2: Realm DB (Electron without PostgreSQL) ───────────────────
      if (isElectronRealm()) {
        console.log('[App] Using Realm DB as primary local store...');
        setDbStatus('realm', true);
        setRealmReady(true);
        const realmResult = await realmGetCompany();
        if (realmResult.success && realmResult.company) {
          const comp = realmResult.company;
          setActiveCompany(comp.name, comp.id, comp.currency);
          console.log('[App] Company loaded from Realm DB:', comp.name);
        }
        return;
      }

      // ── Layer 3: Web Mock adapter (browser only) ──────────────────────────
      console.log('[App] Running in Web mode — using Mock Realm adapter...');
      setDbStatus('mock', false);
      setRealmReady(true);
      const webResult = await realmGetCompany();
      if (webResult.success && webResult.company) {
        const comp = webResult.company;
        setActiveCompany(comp.name, comp.id, comp.currency);
        console.log('[App] Company loaded from Mock adapter:', comp.name);
      }
    }

    initDatabase();
  }, [setDbStatus, setRealmReady, setActiveCompany]);

  // Helper to render placeholders for other modules
  const renderPlaceholderView = (view: string, titleKey: string, icon: React.ComponentType<any>, description: string) => {
    const Icon = icon;
    return (
      <div className="animate-fade-in" data-view={view} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
        <div>
          <h1>{t(titleKey)}</h1>
          <p style={{ color: 'hsl(var(--foreground-muted))', fontSize: '0.875rem' }}>{t('appSubtitle')}</p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center', gap: '1.5rem', flex: 1 }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={40} />
          </div>
          <div style={{ maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>{language === 'ar' ? 'الوحدة قيد التحضير' : 'Module Under Construction'}</h2>
            <p style={{ color: 'hsl(var(--foreground-muted))', fontSize: '0.95rem' }}>
              {description}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" style={{ cursor: 'default' }}>
              {language === 'ar' ? 'مخطط التنفيذ جاهز' : 'Implementation Blueprint Ready'}
            </button>
            <button className="btn btn-secondary" style={{ cursor: 'default' }}>
              {language === 'ar' ? 'إصدار v1.0.0 أساس' : 'Base v1.0.0 Release'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'accounts':
        return <AccountsModule />;
      case 'inventory':
        return renderPlaceholderView(
          'inventory', 
          'sidebar.inventory', 
          Layers, 
          language === 'ar' 
            ? 'وحدة المخازن والمستودعات ستسمح لك بإدارة المنتجات، كميات المخزون، والتحويلات المخزنية بين الفروع والمستودعات المختلفة.'
            : 'The inventory module will allow you to manage products, stock quantities, barcodes, and warehouse transfers across different branches.'
        );
      case 'purchases':
        return renderPlaceholderView(
          'purchases', 
          'sidebar.purchases', 
          ShoppingBag, 
          language === 'ar' 
            ? 'وحدة المشتريات والموردين ستمكنك من تسجيل فواتير المشتريات، مرتجعات المشتريات، وإدارة حسابات الموردين والدفعات الآجلة.'
            : 'The purchasing and vendor module will enable registering purchase invoices, debit notes, and managing vendor accounts and outstanding balances.'
        );
      case 'sales':
        return renderPlaceholderView(
          'sales', 
          'sidebar.sales', 
          DollarSign, 
          language === 'ar' 
            ? 'وحدة المبيعات والعملاء ستوفر إمكانية إنشاء فواتير المبيعات الضريبية، وعروض الأسعار، وتتبع حسابات العملاء ومقبوضاتهم.'
            : 'The sales and customer module will provide capabilities for creating tax-compliant invoices, quotations, and tracking customer statements.'
        );
      case 'manufacturing':
        return renderPlaceholderView(
          'manufacturing', 
          'sidebar.manufacturing', 
          Factory, 
          language === 'ar' 
            ? 'وحدة التصنيع والإنتاج ستساعدك في تحديد فواتير المواد (BOM) وأوامر التشغيل وتكلفة المنتجات المصنعة.'
            : 'The manufacturing module will help define bills of materials (BOM), work orders, and track manufacturing finished goods costing.'
        );
      case 'hr':
        return renderPlaceholderView(
          'hr', 
          'sidebar.hr', 
          Briefcase, 
          language === 'ar' 
            ? 'وحدة الموظفين والموارد البشرية ستشمل شؤون الموظفين، سجلات الحضور، الرواتب، واحتساب مستحقات نهاية الخدمة.'
            : 'The HR and payroll module will cover employee profiles, attendance tracking, monthly salary sheets, and end of service benefits.'
        );
      case 'crm':
        return renderPlaceholderView(
          'crm', 
          'sidebar.crm', 
          HeartHandshake, 
          language === 'ar' 
            ? 'وحدة إدارة علاقات العملاء لتتبع فرص المبيعات، سجل المكالمات والمهام، وخدمة العملاء للحفاظ على ولاء عملائك.'
            : 'CRM module to track sales opportunities, logs of calls and tasks, and support tickets to maximize customer satisfaction.'
        );
      case 'reports':
        return renderPlaceholderView(
          'reports', 
          'sidebar.reports', 
          BarChart4, 
          language === 'ar' 
            ? 'وحدة التقارير المالية والتحليلات ستوفر ميزان المراجعة، الميزانية العمومية، وقائمة الدخل بشكل تلقائي ومحدث.'
            : 'The financial reports module will generate trial balances, balance sheets, and profit & loss statements automatically in real-time.'
        );
      case 'settings':
        return renderPlaceholderView(
          'settings', 
          'sidebar.settings', 
          Settings2, 
          language === 'ar' 
            ? 'إعدادات النظام العامة لإدخال معلومات المؤسسة، تحديد التنسيقات الضريبية، ضبط العملات المتعددة، وإدارة النسخ الاحتياطي.'
            : 'System settings to input corporate identity, tax configurations, currency exchange rates, and data backup controls.'
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Header />
        <main className="content-viewport">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
