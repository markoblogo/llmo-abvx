export const supportedLocales = ["en", "fr", "es", "uk", "ru", "zh"] as const;
export type Locale = (typeof supportedLocales)[number];

export function getLocaleFromPath(pathname: string | null): Locale {
  if (!pathname) return "en";
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  if (firstSegment && supportedLocales.includes(firstSegment as Locale)) {
    return firstSegment as Locale;
  }
  return "en";
}

