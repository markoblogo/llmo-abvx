import { supportedLocales } from "./i18n-constants";
import { debugLog } from "./debugLogger";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Load translations for a given locale
 * Files are stored in public/locales/ and can be accessed via file system in server components
 */
export async function getTranslation(locale: string) {
  const validLocale = supportedLocales.includes(locale as any) ? locale : "en";
  
  try {
    // In Next.js, public folder is served statically, but for server-side imports
    // we need to read from the file system
    // Try to read from public/locales first (for server components)
    const publicPath = join(process.cwd(), "public", "locales", `${validLocale}.json`);
    try {
      const fileContents = readFileSync(publicPath, "utf-8");
      const translations = JSON.parse(fileContents);
      debugLog(`Translations loaded for ${validLocale} from file system`);
      return translations;
    } catch (fsError) {
      // If file system read fails, try reading from locales folder in root (if exists)
      debugLog(`File system read from public failed, trying locales folder for ${validLocale}`);
      try {
        const localesPath = join(process.cwd(), "locales", `${validLocale}.json`);
        const fileContents = readFileSync(localesPath, "utf-8");
        const translations = JSON.parse(fileContents);
        debugLog(`Translations loaded for ${validLocale} from locales folder`);
        return translations;
      } catch (localesError) {
        debugLog(`Locales folder read failed for ${validLocale}, using empty object`);
        return {}; // Return empty object if all methods fail
      }
    }
  } catch (err) {
    debugLog(`Failed to load ${validLocale}. Falling back to en`, err);
    try {
      // Fallback to English
      const fallbackPath = join(process.cwd(), "public", "locales", "en.json");
      try {
        const fileContents = readFileSync(fallbackPath, "utf-8");
        const translations = JSON.parse(fileContents);
        return translations;
      } catch (fsError) {
        // Try locales folder in root as fallback
        try {
          const localesPath = join(process.cwd(), "locales", "en.json");
          const fileContents = readFileSync(localesPath, "utf-8");
          const translations = JSON.parse(fileContents);
          return translations;
        } catch (localesError) {
          debugLog(`All fallback methods failed, returning empty object`);
          return {}; // Return empty object if all methods fail
        }
      }
    } catch (err2) {
      console.error("Critical: failed to load fallback translation", err2);
      return {}; // never throw
    }
  }
}

export { supportedLocales };


