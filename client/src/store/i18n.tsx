import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { translations } from './translations';

const LANGUAGE_KEY = 'task-manager-language';

export type TranslateValues = Record<string, string | number>;
export type TranslateFn = (key: string, values?: TranslateValues) => string;

interface I18nContextValue {
  language: string;
  setLanguage: (language: string) => void;
  t: TranslateFn;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const makeTranslate = (language: string): TranslateFn => (key, values = {}) => {
  const template = translations[language]?.[key] || translations.en[key] || key;
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState(
    () => localStorage.getItem(LANGUAGE_KEY) || 'en',
  );

  const setLanguage = useCallback((next: string) => {
    localStorage.setItem(LANGUAGE_KEY, next);
    setLanguageState(next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t: makeTranslate(language) }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};

export const useT = (): TranslateFn => useI18n().t;
