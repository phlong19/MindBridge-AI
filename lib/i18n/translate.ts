import vi from "./vi.json";
import type { Locale } from "./config";

export function translate(locale: Locale, message: string): string {
  return locale === "vi" && Object.hasOwn(vi, message)
    ? (vi as Record<string, string>)[message]
    : message;
}
