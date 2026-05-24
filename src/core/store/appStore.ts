import { create } from 'zustand';

type ActiveView = 
  | 'dashboard' | 'accounts' | 'inventory' | 'purchases' 
  | 'sales' | 'manufacturing' | 'hr' | 'crm' | 'reports' | 'settings';

interface AppState {
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  activeCompany: string;
  activeCompanyId: string | null;
  activeCompanyCurrency: string;
  activeView: ActiveView;
  // Database connection state
  dbMode: 'postgresql' | 'realm' | 'mock' | 'connecting';
  dbConnected: boolean;
  realmReady: boolean;
  // Actions
  setLanguage: (lang: 'ar' | 'en') => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveCompany: (name: string, id?: string, currency?: string) => void;
  setActiveView: (view: ActiveView) => void;
  setDbStatus: (mode: 'postgresql' | 'realm' | 'mock' | 'connecting', connected: boolean) => void;
  setRealmReady: (ready: boolean) => void;
}

// Read initial values from localStorage or default
const initialLang = (localStorage.getItem('lang') as 'ar' | 'en') || 'ar';
const initialTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';

// Helper to apply language direction
const applyLanguage = (lang: 'ar' | 'en') => {
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  localStorage.setItem('lang', lang);
};

// Helper to apply theme
const applyTheme = (theme: 'light' | 'dark') => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
};

// Apply defaults immediately on store creation
applyLanguage(initialLang);
applyTheme(initialTheme);

export const useAppStore = create<AppState>((set) => ({
  language: initialLang,
  theme: initialTheme,
  sidebarOpen: true,
  activeCompany: 'شركة المغز التجارية المحدودة',
  activeCompanyId: null,
  activeCompanyCurrency: 'YER',
  activeView: 'dashboard',
  dbMode: 'connecting',
  dbConnected: false,
  realmReady: false,

  setLanguage: (lang) => set(() => {
    applyLanguage(lang);
    return { language: lang };
  }),

  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
    return { theme: nextTheme };
  }),

  setSidebarOpen: (open) => set(() => ({ sidebarOpen: open })),

  setActiveCompany: (name, id, currency) => set(() => ({
    activeCompany: name,
    activeCompanyId: id || null,
    activeCompanyCurrency: currency || 'YER',
  })),

  setActiveView: (view) => set(() => ({ activeView: view })),

  setDbStatus: (mode, connected) => set(() => ({ dbMode: mode, dbConnected: connected })),

  setRealmReady: (ready) => set(() => ({ realmReady: ready })),
}));
