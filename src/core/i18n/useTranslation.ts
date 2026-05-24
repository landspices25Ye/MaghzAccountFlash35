import { useAppStore } from '@/core/store';
import ar from './ar.json';
import en from './en.json';

const translations = { ar, en } as const;

export function useTranslation() {
  const language = useAppStore((state) => state.language);
  const currentTranslations = translations[language] as Record<string, unknown>;
  
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: unknown = currentTranslations;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    return typeof value === 'string' ? value : key;
  };
  
  return { t, language };
}

export type Lang = 'ar' | 'en';
