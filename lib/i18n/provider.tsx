"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { localeCookie, type Locale } from "./config";
import { translate } from "./translate";

type I18n = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (message: string | null | undefined) => string;
};
const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({
  initialLocale,
  children,
}: Readonly<{
  initialLocale: Locale;
  children: ReactNode;
}>) {
  const [locale, updateLocale] = useState(initialLocale);
  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    document.documentElement.lang = next;
    updateLocale(next);
  }, []);
  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (message: string | null | undefined) =>
        translate(locale, message ?? ""),
    }),
    [locale, setLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("Translations require I18nProvider.");
  return context;
}

export function LocalizedText({
  children,
}: {
  children: string | null | undefined;
}) {
  const { t } = useI18n();
  return children ? <>{t(children)}</> : null;
}
