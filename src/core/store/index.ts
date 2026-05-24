import { create } from 'zustand';

interface Company {
  id: string;
  name: string;
  currency: string;
}

interface AppState {
  // UI State
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  language: 'ar' | 'en';
  
  // Company State
  activeCompany: Company | null;
  
  // Database State
  dbStatus: 'connecting' | 'postgresql' | 'realm' | 'mock';
  dbConnected: boolean;
  realmReady: boolean;
  
  // Actions
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setLanguage: (language: 'ar' | 'en') => void;
  setActiveCompany: (name: string, id: string, currency: string) => void;
  setDbStatus: (status: 'connecting' | 'postgresql' | 'realm' | 'mock', connected: boolean) => void;
  setRealmReady: (ready: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  language: 'ar',
  activeCompany: null,
  dbStatus: 'connecting',
  dbConnected: false,
  realmReady: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setTheme: (theme) => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    set({ theme });
  },
  
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
    return { theme: newTheme };
  }),
  
  setLanguage: (language) => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language === 'ar' ? 'ar' : 'en';
    set({ language });
  },
  
  setActiveCompany: (name, id, currency) => set({
    activeCompany: { name, id, currency },
  }),
  
  setDbStatus: (status, connected) => set({ dbStatus: status, dbConnected: connected }),
  setRealmReady: (ready) => set({ realmReady: ready }),
}));
