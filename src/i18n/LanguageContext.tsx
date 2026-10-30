import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations';
import { Language, TranslationSchema } from './types';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationSchema;
  locale: string;
  formatNumber: (n: number, options?: Intl.NumberFormatOptions) => string;
  formatTime: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  getCompassDirection: (deg: number) => string;
  formatTimeUntil: (target: Date) => string;
}

const LANGUAGE_STORAGE_KEY = 'orbitaltrack_language_v1';

const LanguageContext = createContext<LanguageContextValue | null>(null);

function detectInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'it' || saved === 'en') return saved;
    if (typeof navigator !== 'undefined') {
      const browserLang = (navigator.languages && navigator.languages[0]) || navigator.language;
      if (browserLang && browserLang.toLowerCase().startsWith('it')) {
        return 'it';
      }
      return 'en';
    }
  } catch {
    // fallback
  }
  return 'it';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(detectInitialLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {
      // ignore
    }
  }, [language]);

  const locale = language === 'it' ? 'it-IT' : 'en-US';

  const t = useMemo(() => translations[language], [language]);

  const formatNumber = (n: number, options?: Intl.NumberFormatOptions) => {
    return n.toLocaleString(locale, options);
  };

  const formatTime = (date: Date, options?: Intl.DateTimeFormatOptions) => {
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    });
  };

  const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions) => {
    return date.toLocaleDateString(locale, options);
  };

  const getCompassDirection = (deg: number): string => {
    const keys: Array<keyof typeof t.common.compassDirs> = [
      'N',
      'NE',
      'E',
      'SE',
      'S',
      'SW',
      'W',
      'NW',
    ];
    const key = keys[Math.round(deg / 45) % 8];
    return t.common.compassDirs[key];
  };

  const formatTimeUntil = (target: Date): string => {
    const diffMs = target.getTime() - Date.now();
    if (diffMs <= 0) return t.sightings.nowInProgress;
    const totalMin = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMin / 1440);
    const hours = Math.floor((totalMin % 1440) / 60);
    const mins = totalMin % 60;
    if (days > 0) {
      return t.sightings.inDaysHours
        .replace('{days}', String(days))
        .replace('{hours}', String(hours));
    }
    if (hours > 0) {
      return t.sightings.inHoursMins
        .replace('{hours}', String(hours))
        .replace('{mins}', String(mins));
    }
    return t.sightings.inMins.replace('{mins}', String(mins));
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      locale,
      formatNumber,
      formatTime,
      formatDate,
      getCompassDirection,
      formatTimeUntil,
    }),
    [language, t, locale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
