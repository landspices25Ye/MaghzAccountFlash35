import { 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  Globe, 
  Building2,
  Wifi
} from 'lucide-react';
import { useAppStore } from '../core/store/appStore';
import { useTranslation } from '../core/i18n/useTranslation';
import '../styles/header.css';

export default function Header() {
  const { t, language } = useTranslation();
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const activeCompany = useAppStore((state) => state.activeCompany);
  const setLanguage = useAppStore((state) => state.setLanguage);

  const dbMode = useAppStore((state) => state.dbMode);
  const dbConnected = useAppStore((state) => state.dbConnected);

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const renderStatus = () => {
    if (dbMode === 'postgresql' && dbConnected) {
      return (
        <div className="status-indicator success" title={language === 'ar' ? 'متصل بقاعدة البيانات PostgreSQL (Drizzle ORM)' : 'Connected to PostgreSQL via Drizzle ORM'}>
          <span className="status-dot"></span>
          <span>{language === 'ar' ? 'PostgreSQL نشط' : 'PostgreSQL Live'}</span>
          <Wifi size={12} style={{ marginInlineStart: '0.25rem' }} />
        </div>
      );
    }

    if (dbMode === 'realm') {
      return (
        <div className="status-indicator success" title={language === 'ar' ? 'قاعدة بيانات Realm المحلية نشطة' : 'Realm local database active'}>
          <span className="status-dot"></span>
          <span>{language === 'ar' ? 'Realm محلي' : 'Realm Local'}</span>
          <Wifi size={12} style={{ marginInlineStart: '0.25rem' }} />
        </div>
      );
    }

    if (dbMode === 'connecting') {
      return (
        <div className="status-indicator connecting" title={language === 'ar' ? 'جاري محاولة الاتصال بالخادم المحلي...' : 'Connecting to database server...'}>
          <span className="status-dot animate-pulse"></span>
          <span>{language === 'ar' ? 'جاري الاتصال...' : 'Connecting...'}</span>
          <Wifi size={12} style={{ marginInlineStart: '0.25rem' }} />
        </div>
      );
    }

    // 'mock' mode - Web browser without Electron
    return (
      <div className="status-indicator warning" title={language === 'ar' ? 'وضع الويب - محاكي Realm المحلي' : 'Web mode - Mock Realm adapter'}>
        <span className="status-dot"></span>
        <span>{language === 'ar' ? 'وضع الويب' : 'Web Mode'}</span>
        <Wifi size={12} style={{ marginInlineStart: '0.25rem' }} />
      </div>
    );
  };


  return (
    <header className="header animate-fade-in">
      <div className="header-left">
        <div className="company-badge">
          <span className="company-badge-icon">
            <Building2 size={16} />
          </span>
          <span>{activeCompany}</span>
        </div>

        <div className="search-container">
          <span className="search-icon">
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder={t('search')} 
            className="search-input" 
          />
        </div>
      </div>

      <div className="header-right">
        {renderStatus()}

        <button 
          onClick={toggleLanguage} 
          className="btn-icon" 
          title={language === 'ar' ? 'Switch to English' : 'تحويل للعربية'}
        >
          <Globe size={18} />
        </button>

        <button 
          onClick={toggleTheme} 
          className="btn-icon" 
          title={theme === 'light' ? t('themeDark') : t('themeLight')}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button className="btn-icon badge-wrapper" title="Notifications">
          <Bell size={18} />
          <span className="badge">3</span>
        </button>
      </div>
    </header>
  );
}
