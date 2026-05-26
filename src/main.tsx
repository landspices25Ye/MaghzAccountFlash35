import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AppRouter } from './app/router';
import { useAppStore } from './core/store';
import { getDbAdapter } from './core/database/adapters';
import { mockAdapter } from './core/database/adapters/mockAdapter';
import { initAuth } from './modules/auth/store';

// Set RTL and Arabic as default
document.documentElement.dir = 'rtl';
document.documentElement.lang = 'ar';

// Initialize auth from localStorage
initAuth();

function App() {
  const setDbStatus = useAppStore((state) => state.setDbStatus);
  const setRealmReady = useAppStore((state) => state.setRealmReady);
  const setActiveCompany = useAppStore((state) => state.setActiveCompany);

  useEffect(() => {
    async function initDb() {
      try {
        setDbStatus('connecting', false);
        let adapter = await getDbAdapter();
        let ping = await adapter.ping();

        // If ping failed or we're in browser without Electron, use mock
        if (!ping.success || typeof window !== 'undefined' && !(window as any).electronEnv?.isElectron) {
          console.log('[App] Using Mock adapter for demo data');
          adapter = mockAdapter;
          ping = await adapter.ping();
        }

        if (ping.success) {
          setDbStatus('mock', true);
          setRealmReady(false);

          // Try to load company - mockAdapter auto-creates demo company if none exists
          let companyResult = await adapter.getCompany();

          // If getCompany failed (e.g. electron IPC unavailable), force mockAdapter
          if (!companyResult.success || !companyResult.data) {
            console.log('[App] getCompany failed, forcing mockAdapter...');
            adapter = mockAdapter;
            companyResult = await adapter.getCompany();
          }

          if (companyResult.success && companyResult.data) {
            setActiveCompany(
              companyResult.data.name,
              companyResult.data.id,
              companyResult.data.currency || 'YER'
            );
            console.log('[App] Demo company loaded:', companyResult.data.name, '| ID:', companyResult.data.id);
          } else {
            console.error('[App] CRITICAL: Could not load or create company');
          }
        }
      } catch (err) {
        console.warn('[App] DB init error:', err);
        // Even on error, try mock adapter as last resort
        try {
          const companyResult = await mockAdapter.getCompany();
          if (companyResult.success && companyResult.data) {
            setActiveCompany(
              companyResult.data.name,
              companyResult.data.id,
              companyResult.data.currency || 'YER'
            );
            console.log('[App] Recovered with mock adapter');
          }
        } catch {
          console.error('[App] Mock adapter also failed');
        }
        setDbStatus('mock', false);
        setRealmReady(false);
      }
    }

    initDb();
  }, [setDbStatus, setRealmReady, setActiveCompany]);

  return <AppRouter />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
