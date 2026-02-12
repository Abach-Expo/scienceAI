import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, Language } from '../i18n/translations';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Helper function to get nested value from object with fallback
const getNestedValue = (obj: Record<string, unknown>, path: string): string | null => {
  const keys = path.split('.');
  let result: unknown = obj;
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return null; // Not found
    }
  }
  
  return typeof result === 'string' ? result : null;
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: (localStorage.getItem('app_language') as Language) || 'ru',
      
      setLanguage: (lang: Language) => {
        localStorage.setItem('app_language', lang);
        set({ language: lang });
      },
      
      t: (key: string): string => {
        const { language } = get();
        const trans = translations[language];
        
        // Try to get translation in current language
        let result = getNestedValue(trans, key);
        
        // Fallback to English if not found
        if (result === null && language !== 'en') {
          result = getNestedValue(translations.en, key);
        }
        
        // Fallback to Russian if still not found
        if (result === null && language !== 'ru') {
          result = getNestedValue(translations.ru, key);
        }
        
        return result ?? key;
      },
    }),
    {
      name: 'language-storage',
    }
  )
);

// Hook for easy translation access
export const useTranslation = () => {
  const { language, setLanguage, t } = useLanguageStore();
  
  return {
    language,
    setLanguage,
    t,
    isRussian: language === 'ru',
    isEnglish: language === 'en',
    isKazakh: language === 'kz',
    isGerman: language === 'de',
    isSpanish: language === 'es',
    isChinese: language === 'zh',
  };
};

export default useLanguageStore;
