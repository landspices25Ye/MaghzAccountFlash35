import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AppRouter } from './app/router';
import { useAppStore } from './core/store';
import { getDbAdapter } from './core/database/adapters';
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
        const adapter = await getDbAdapter();
        const ping = await adapter.ping();
        
        if (ping.success) {
          setDbStatus('postgresql', true);
          setRealmReady(true);
          
          // Load company
          const companyResult = await adapter.getCompany();
          if (companyResult.success && companyResult.data) {
            setActiveCompany(
              companyResult.data.name,
              companyResult.data.id,
              companyResult.data.currency || 'YER'
            );
          }
        }
      } catch (err) {
        console.warn('[App] DB init error:', err);
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
