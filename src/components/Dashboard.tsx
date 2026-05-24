import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft,
  Receipt,
  FileSpreadsheet,
  Activity,
  RefreshCw
} from 'lucide-react';
import { useTranslation } from '../core/i18n/useTranslation';
import { useAppStore } from '../core/store/appStore';
import { pgGetAccounts, pgGetRecentLogs, pgTransaction } from '../database/pgClient';
import { realmGetAccounts, realmGetLogs, realmUpdateBalance, realmAddLog } from '../database/realmClient';
import '../styles/dashboard.css';

export default function Dashboard() {
  const { t, language } = useTranslation();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // ── App state ─────────────────────────────────────────────────────────────
  const dbMode = useAppStore((state) => state.dbMode);
  const dbConnected = useAppStore((state) => state.dbConnected);
  const activeCompanyId = useAppStore((state) => state.activeCompanyId);
  const activeCompanyCurrency = useAppStore((state) => state.activeCompanyCurrency);

  const isPg = dbMode === 'postgresql' && dbConnected;

  // ── Unified data state ────────────────────────────────────────────────────
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [logsList, setLogsList] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ── Fetch data from the active DB layer ────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      if (isPg) {
        // Layer 1: PostgreSQL (Drizzle)
        const [accRes, logRes] = await Promise.all([
          pgGetAccounts(activeCompanyId || undefined),
          pgGetRecentLogs(5),
        ]);
        if (!isMounted) return;
        if (accRes.success && accRes.rows) {
          setAccountsList(accRes.rows.map((row: any) => ({
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
        if (logRes.success && logRes.rows) {
          setLogsList(logRes.rows.map((row: any) => ({
            id: row.id,
            timestamp: new Date(row.created_at),
            userName: row.user_name,
            action: row.action,
            module: row.module,
            details: row.details,
          })));
        }
      } else {
        // Layer 2 & 3: Realm DB or Mock adapter
        const [accRes, logRes] = await Promise.all([
          realmGetAccounts(activeCompanyId || undefined),
          realmGetLogs(5),
        ]);
        if (!isMounted) return;
        if (accRes.success) setAccountsList(accRes.accounts);
        if (logRes.success) setLogsList(logRes.logs.map(l => ({ ...l, timestamp: new Date(l.timestamp) })));
      }
    }

    fetchData();
    return () => { isMounted = false; };
  }, [isPg, activeCompanyId, refreshTrigger]);


  // Calculations
  // 1. Cash and Banks: code starting with '111'
  const cashAccounts = accountsList.filter(acc => acc.code.startsWith('111') && !acc.isGroup);
  const totalCash = cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  // 2. Revenues: type 'revenue'
  const revenueAccounts = accountsList.filter(acc => acc.type === 'revenue' && !acc.isGroup);
  const totalRevenues = revenueAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  // 3. Expenses: type 'expense'
  const expenseAccounts = accountsList.filter(acc => acc.type === 'expense' && !acc.isGroup);
  const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  // 4. Net Profit
  const netProfit = totalRevenues - totalExpenses;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-YE' : 'en-US', {
      style: 'currency',
      currency: activeCompanyCurrency || 'YER',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Helper to add a mock financial transaction
  const handleQuickTransaction = async (type: 'deposit' | 'expense') => {
    setLoadingAction(type);
    try {
      if (isPg) {
        if (type === 'deposit') {
          const queries = [
            {
              sql: `UPDATE accounts SET balance = balance + 1000000, updated_at = NOW() WHERE code = '111001' AND company_id = $1`,
              params: [activeCompanyId]
            },
            {
              sql: `UPDATE accounts SET balance = balance + 1000000, updated_at = NOW() WHERE code = '411001' AND company_id = $1`,
              params: [activeCompanyId]
            },
            {
              sql: `INSERT INTO activity_logs (company_id, user_name, action, module, details)
                    VALUES ($1, $2, $3, $4, $5)`,
              params: [
                activeCompanyId,
                'مدير النظام',
                'تسجيل عملية مبيعات نقدية سريعة',
                'الحسابات (GL)',
                'فاتورة مبيعات نقدية بقيمة 1,000,000 ر.ي تم ترحيلها للصندوق الرئيسي وصافي الإيرادات.'
              ]
            }
          ];
          const txRes = await pgTransaction(queries);
          if (txRes.success) {
            setRefreshTrigger(prev => prev + 1);
          } else {
            console.error('[Dashboard] Quick transaction failed:', txRes.error);
          }
        } else {
          // Expense
          const queries = [
            {
              sql: `UPDATE accounts SET balance = balance - 300000, updated_at = NOW() WHERE code = '111002' AND company_id = $1`,
              params: [activeCompanyId]
            },
            {
              sql: `UPDATE accounts SET balance = balance + 300000, updated_at = NOW() WHERE code = '511001' AND company_id = $1`,
              params: [activeCompanyId]
            },
            {
              sql: `INSERT INTO activity_logs (company_id, user_name, action, module, details)
                    VALUES ($1, $2, $3, $4, $5)`,
              params: [
                activeCompanyId,
                'مدير النظام',
                'صرف دفعة إيجار سريعة',
                'الحسابات (GL)',
                'صرف شيك مصروف إيجار بقيمة 300,000 ر.ي من حساب بنك الكريمي.'
              ]
            }
          ];
          const txRes = await pgTransaction(queries);
          if (txRes.success) {
            setRefreshTrigger(prev => prev + 1);
          } else {
            console.error('[Dashboard] PG transaction failed:', txRes.error);
          }
        }
      } else {
        // Layer 2 & 3: Realm DB or Mock adapter
        if (type === 'deposit') {
          await realmUpdateBalance(activeCompanyId || '', '111001', 1_000_000);
          await realmUpdateBalance(activeCompanyId || '', '411001', 1_000_000);
          await realmAddLog(
            activeCompanyId || '',
            'مدير النظام',
            'تسجيل عملية مبيعات نقدية سريعة',
            'الحسابات (GL)',
            'فاتورة مبيعات نقدية بقيمة 1,000,000 ر.ي تم ترحيلها للصندوق الرئيسي وصافي الإيرادات.'
          );
        } else {
          await realmUpdateBalance(activeCompanyId || '', '111002', -300_000);
          await realmUpdateBalance(activeCompanyId || '', '511001', 300_000);
          await realmAddLog(
            activeCompanyId || '',
            'مدير النظام',
            'صرف دفعة إيجار سريعة',
            'الحسابات (GL)',
            'صرف شيك مصروف إيجار بقيمة 300,000 ر.ي من حساب بنك الكريمي.'
          );
        }
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setLoadingAction(null), 400);
    }
  };


  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title Bar */}
      <div className="dashboard-title-bar">
        <h1>{t('dashboard.title')}</h1>
        <p>{t('appSubtitle')}</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card primary">
          <div className="kpi-details">
            <span className="kpi-label">{language === 'ar' ? 'النقدية وما يعادلها' : 'Cash & Equivalents'}</span>
            <span className="kpi-value">{formatCurrency(totalCash)}</span>
          </div>
          <div className="kpi-icon-wrapper">
            <Wallet size={24} />
          </div>
        </div>

        <div className="kpi-card success">
          <div className="kpi-details">
            <span className="kpi-label">{t('dashboard.salesThisMonth')}</span>
            <span className="kpi-value">{formatCurrency(totalRevenues)}</span>
          </div>
          <div className="kpi-icon-wrapper">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="kpi-card danger">
          <div className="kpi-details">
            <span className="kpi-label">{t('dashboard.purchasesThisMonth')}</span>
            <span className="kpi-value">{formatCurrency(totalExpenses)}</span>
          </div>
          <div className="kpi-icon-wrapper">
            <TrendingDown size={24} />
          </div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-details">
            <span className="kpi-label">{t('dashboard.netProfit')}</span>
            <span className="kpi-value">{formatCurrency(netProfit)}</span>
          </div>
          <div className="kpi-icon-wrapper">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Main Layout Columns */}
      <div className="dashboard-sections">
        {/* Left Column: Quick Actions & Ledger overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{t('quickActions')}</h3>
              <Activity size={18} style={{ color: 'hsl(var(--primary))' }} />
            </div>
            
            <div className="quick-actions-list">
              <button 
                onClick={() => handleQuickTransaction('deposit')} 
                className="quick-action-btn"
                disabled={loadingAction !== null}
              >
                <span className="quick-action-icon">
                  {loadingAction === 'deposit' ? <RefreshCw className="animate-spin" size={18} /> : <ArrowUpRight size={18} />}
                </span>
                <div className="quick-action-details">
                  <span className="quick-action-title">
                    {language === 'ar' ? 'مبيعات نقدية واردة' : 'Cash Sales Influx'}
                  </span>
                  <span className="quick-action-desc">
                    {language === 'ar' ? 'إيداع +1,000,000 ر.ي مبيعات' : 'Deposit +1,000,000 YER sales'}
                  </span>
                </div>
              </button>

              <button 
                onClick={() => handleQuickTransaction('expense')} 
                className="quick-action-btn"
                disabled={loadingAction !== null}
              >
                <span className="quick-action-icon" style={{ color: 'hsl(var(--danger))' }}>
                  {loadingAction === 'expense' ? <RefreshCw className="animate-spin" size={18} /> : <ArrowDownLeft size={18} />}
                </span>
                <div className="quick-action-details">
                  <span className="quick-action-title">
                    {language === 'ar' ? 'صرف شيك مصروفات' : 'Expense Check Payout'}
                  </span>
                  <span className="quick-action-desc">
                    {language === 'ar' ? 'خصم -300,000 ر.ي إيجار' : 'Deduct -300,000 YER rent'}
                  </span>
                </div>
              </button>

              <div className="quick-action-btn" style={{ cursor: 'default', opacity: 0.8 }}>
                <span className="quick-action-icon">
                  <Receipt size={18} />
                </span>
                <div className="quick-action-details">
                  <span className="quick-action-title">
                    {language === 'ar' ? 'الفواتير المستحقة' : 'Receivables Invoices'}
                  </span>
                  <span className="quick-action-desc">
                    {language === 'ar' ? 'قيد التطوير في المبيعات' : 'Sales module coming next'}
                  </span>
                </div>
              </div>

              <div className="quick-action-btn" style={{ cursor: 'default', opacity: 0.8 }}>
                <span className="quick-action-icon">
                  <FileSpreadsheet size={18} />
                </span>
                <div className="quick-action-details">
                  <span className="quick-action-title">
                    {language === 'ar' ? 'التقارير الضريبية' : 'Tax Auditing Reports'}
                  </span>
                  <span className="quick-action-desc">
                    {language === 'ar' ? 'جاهز للتصدير كـ PDF' : 'Ready for PDF generation'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Accounts Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                {language === 'ar' ? 'أرصدة دليل الحسابات الأساسية' : 'Core General Ledger Balances'}
              </h3>
            </div>
            
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>{language === 'ar' ? 'رمز الحساب' : 'Code'}</th>
                    <th>{language === 'ar' ? 'اسم الحساب' : 'Account Name'}</th>
                    <th>{language === 'ar' ? 'النوع' : 'Type'}</th>
                    <th style={{ textAlign: 'end' }}>{language === 'ar' ? 'الرصيد الحالي' : 'Balance'}</th>
                  </tr>
                </thead>
                <tbody>
                  {accountsList.filter(acc => !acc.isGroup).map((acc) => (
                    <tr key={acc.id}>
                      <td style={{ fontFamily: 'monospace' }}>{acc.code}</td>
                      <td>{language === 'ar' ? acc.nameAr : acc.nameEn}</td>
                      <td>
                        <span className={`status-indicator ${acc.type === 'asset' || acc.type === 'revenue' ? '' : 'danger'}`} 
                              style={{ display: 'inline-block', backgroundColor: 'transparent', padding: 0 }}>
                          {acc.type.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'end', fontWeight: 600, fontFamily: 'monospace' }}>
                        {formatCurrency(acc.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Recent activity log & visual charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                {language === 'ar' ? 'توزيع النقدية المتاحة' : 'Available Cash Allocation'}
              </h3>
            </div>
            <div className="budget-progress-container">
              <div className="flex justify-between" style={{ fontSize: '0.8rem' }}>
                <span>{language === 'ar' ? 'الخزينة الرئيسية' : 'Main Cash Box'}</span>
                <span style={{ fontWeight: 600 }}>
                  {formatCurrency(accountsList.find(a => a.code === '111001')?.balance || 0)}
                </span>
              </div>
              <div className="budget-bar-bg">
                <div 
                  className="budget-bar-fill" 
                  style={{ width: `${Math.min(100, ((accountsList.find(a => a.code === '111001')?.balance || 0) / totalCash) * 100)}%` }}
                ></div>
              </div>

              <div className="flex justify-between" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                <span>{language === 'ar' ? 'بنك الكريمي' : 'Al Karimi Bank'}</span>
                <span style={{ fontWeight: 600 }}>
                  {formatCurrency(accountsList.find(a => a.code === '111002')?.balance || 0)}
                </span>
              </div>
              <div className="budget-bar-bg">
                <div 
                  className="budget-bar-fill" 
                  style={{ 
                    width: `${Math.min(100, ((accountsList.find(a => a.code === '111002')?.balance || 0) / totalCash) * 100)}%`,
                    background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--warning)))'
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{t('dashboard.recentTransactions')}</h3>
              <Activity size={16} style={{ color: 'hsl(var(--foreground-muted))' }} />
            </div>
            
            <div className="activity-feed">
              {logsList && logsList.length > 0 ? (
                logsList.map((log) => (
                  <div key={log.id} className="activity-item">
                    <span className="activity-dot"></span>
                    <div className="activity-info">
                      <span className="activity-text" style={{ fontWeight: 600 }}>{log.action}</span>
                      {log.details && <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>{log.details}</span>}
                      <span className="activity-meta">
                        {log.userName} • {new Date(log.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--foreground-muted))' }}>
                  {t('dashboard.noTransactions')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
