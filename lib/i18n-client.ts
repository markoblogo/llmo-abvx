"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getLocaleFromPath } from "./i18n-constants";

type Translations = Record<string, string>;

/**
 * Client-side hook to load translations based on current locale from pathname
 * This is used for client components that need translations
 */
export function useTranslation() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const [translations, setTranslations] = useState<Translations>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        setLoading(true);
        // Load translations from public/locales
        const response = await fetch(`/locales/${locale}.json`);
        if (response.ok) {
          const data = await response.json();
          setTranslations(data);
        } else {
          // Fallback to English
          const fallback = await fetch(`/locales/en.json`);
          if (fallback.ok) {
            const data = await fallback.json();
            setTranslations(data);
          }
        }
      } catch (error) {
        console.error("Error loading translations:", error);
        // Try to load English as fallback
        try {
          const fallback = await fetch(`/locales/en.json`);
          if (fallback.ok) {
            const data = await fallback.json();
            setTranslations(data);
          }
        } catch (fallbackError) {
          console.error("Error loading fallback translations:", fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadTranslations();
  }, [locale]);

  const t = (key: string, fallback?: string): string => {
    return translations[key] || fallback || key;
  };

  return { t, locale, loading, translations };
}

