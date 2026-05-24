import { useState, useEffect } from 'react';
import { BookOpen, Receipt, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../core/i18n/useTranslation';
import { useAppStore } from '../../core/store/appStore';
import { pgGetAccounts } from '../../database/pgClient';
import { realmGetAccounts } from '../../database/realmClient';
import ChartOfAccounts from './ChartOfAccounts';
import JournalEntries from './JournalEntries';
import '../../styles/accounts.css';

export default function AccountsModule() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'tree' | 'journal'>('tree');
  
  // App DB connection states
  const dbMode = useAppStore((state) => state.dbMode);
  const dbConnected = useAppStore((state) => state.dbConnected);
  const activeCompanyId = useAppStore((state) => state.activeCompanyId);

  const isPg = dbMode === 'postgresql' && dbConnected;

  // Shared state for accounts
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch accounts from active database layer
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      if (isPg) {
        // Layer 1: PostgreSQL
        const res = await pgGetAccounts(activeCompanyId || undefined);
        if (res.success && res.rows) {
          setAccounts(res.rows.map((row: any) => ({
            id: row.id,
            code: row.code,
            nameAr: row.name_ar,
            nameEn: row.name_en,
            parentId: row.parent_id,
            type: row.type,
            nature: row.nature,
            isGroup: row.is_group,
            balance: parseFloat(row.balance),
          })));
        }
      } else {
        // Layer 2 & 3: Realm DB or Mock adapter
        const res = await realmGetAccounts(activeCompanyId || undefined);
        if (res.success && res.accounts) {
          setAccounts(res.accounts);
        }
      }
    } catch (err) {
      console.error('[AccountsModule] Failed to fetch accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [isPg, activeCompanyId, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{t('accounts.title')}</h1>
          <p style={{ color: 'hsl(var(--foreground-muted))', fontSize: '0.875rem' }}>{t('appSubtitle')}</p>
        </div>
        <button 
          onClick={handleRefresh}
          className={`btn btn-secondary ${loading ? 'loading' : ''}`}
          disabled={loading}
          style={{ padding: '0.5rem 0.75rem' }}
          title="Refresh Data"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="accounts-tabs">
        <button 
          onClick={() => setActiveTab('tree')}
          className={`accounts-tab-btn ${activeTab === 'tree' ? 'active' : ''}`}
        >
          <BookOpen size={18} />
          {t('accounts.chartOfAccounts')}
        </button>
        
        <button 
          onClick={() => setActiveTab('journal')}
          className={`accounts-tab-btn ${activeTab === 'journal' ? 'active' : ''}`}
        >
          <Receipt size={18} />
          {t('accounts.journalEntries')}
        </button>
      </div>

      {/* Dynamic Sub-tab rendering */}
      <div style={{ flex: 1 }}>
        {activeTab === 'tree' ? (
          <ChartOfAccounts accounts={accounts} onRefresh={handleRefresh} />
        ) : (
          <JournalEntries accounts={accounts} onRefresh={handleRefresh} />
        )}
      </div>
    </div>
  );
}
