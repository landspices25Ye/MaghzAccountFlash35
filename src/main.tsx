import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AppRouter } from './app/router';
import { OnboardingWizard } from './app/onboarding';
import { useAppStore } from './core/store';
import { useOnboardingStore } from './core/store/onboardingStore';
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
  const setActiveCompany = useAppStore((state) => state.setActiveCompany);
  const completed = useOnboardingStore((state) => state.completed);

  useEffect(() => {
    async function initDb() {
      try {
        setDbStatus('connecting', false);
        const adapter = await getDbAdapter();
        const ping = await adapter.ping();

        if (!ping.success) {
          console.warn('[App] Adapter ping failed, falling back to mock');
        }

        if (ping.success) {
          // Detect which adapter is in use via ping result
          const isPg = ping.message?.includes('PostgreSQL') || !!ping.db;
          setDbStatus(isPg ? 'postgresql' : 'mock', true);

          const companyResult = await adapter.getCompany();

          if (companyResult.success && companyResult.data) {
            setActiveCompany(
              companyResult.data.name,
              companyResult.data.id,
              companyResult.data.currency || 'YER',
              {
                dateFormat: companyResult.data.date_format || companyResult.data.dateFormat,
                decimalPlaces: Number(companyResult.data.decimal_places ?? companyResult.data.decimalPlaces ?? 2),
                calendar: companyResult.data.calendar || 'gregorian',
              }
            );
            console.log('[App] Company loaded:', companyResult.data.name);
          } else {
            console.error('[App] Could not load company');
          }
        }
      } catch (err) {
        console.warn('[App] DB init error:', err);
        try {
          const companyResult = await mockAdapter.getCompany();
          if (companyResult.success && companyResult.data) {
            setActiveCompany(
              companyResult.data.name,
              companyResult.data.id,
              companyResult.data.currency || 'YER',
              {
                dateFormat: companyResult.data.date_format || companyResult.data.dateFormat,
                decimalPlaces: Number(companyResult.data.decimal_places ?? companyResult.data.decimalPlaces ?? 2),
                calendar: companyResult.data.calendar || 'gregorian',
              }
            );
            console.log('[App] Recovered with mock adapter');
            setDbStatus('mock', true);
          }
        } catch {
          console.error('[App] Mock adapter also failed');
          setDbStatus('mock', false);
        }
      }
    }

    if (completed) {
      initDb();
    }
  }, [completed, setDbStatus, setActiveCompany]);

  if (!completed) {
    return <OnboardingWizard />;
  }

  return <AppRouter />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
