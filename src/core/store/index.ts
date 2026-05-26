import { create } from 'zustand';

interface Company {
  id: string;
  name: string;
  currency: string;
  nameEn?: string;
  taxNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  stampUrl?: string;
  fiscalYearStart?: string;
  dateFormat?: string;
  decimalPlaces?: number;
}

interface AppState {
  // UI State
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  language: 'ar' | 'en';
  
  // Company State
  activeCompany: Company | null;
  selectedBranchId: string | null;
  
  // Database State
  dbStatus: 'connecting' | 'postgresql' | 'realm' | 'mock';
  dbConnected: boolean;
  realmReady: boolean;
  
  // Actions
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setLanguage: (language: 'ar' | 'en') => void;
  setActiveCompany: (name: string, id: string, currency: string, extra?: Partial<Company>) => void;
  setSelectedBranchId: (id: string | null) => void;
  setDbStatus: (status: 'connecting' | 'postgresql' | 'realm' | 'mock', connected: boolean) => void;
  setRealmReady: (ready: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  language: 'ar',
  activeCompany: null,
  selectedBranchId: null,
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
  
  setActiveCompany: (name, id, currency, extra) => set({
    activeCompany: { name, id, currency, ...extra },
  }),
  
  setSelectedBranchId: (id) => set({ selectedBranchId: id }),
  
  setDbStatus: (status, connected) => set({ dbStatus: status, dbConnected: connected }),
  setRealmReady: (ready) => set({ realmReady: ready }),
}));
