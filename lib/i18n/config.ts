export const locales = ["en", "vi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const localeCookie = "mindbridge-locale";
export function resolveLocale(value: unknown): Locale {
  return value === "vi" ? "vi" : defaultLocale;
}
