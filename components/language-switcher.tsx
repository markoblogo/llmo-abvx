"use client";

import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
];

export function LanguageSwitcher() {
  const pathname = usePathname();

  // Extract current locale from pathname
  const currentLocale =
    pathname?.split("/")[1] && languages.find((l) => l.code === pathname.split("/")[1])
      ? pathname.split("/")[1]
      : "en";

  const currentLanguage = languages.find((l) => l.code === currentLocale) || languages[0];

  const switchLanguage = (locale: string) => {
    // Remove current locale prefix if present
    if (!pathname) return;
    let pathWithoutLocale = pathname.replace(/^\/(en|fr|es|uk|ru|zh)(\/|$)/, "/");
    
    // Handle root path
    if (pathWithoutLocale === "" || pathWithoutLocale === "/") {
      pathWithoutLocale = "";
    }

    // Build new path with locale
    const newPath = locale === "en" 
      ? (pathWithoutLocale || "/")
      : `/${locale}${pathWithoutLocale || ""}`;
    
    // Use window.location for full page reload to ensure translations are loaded
    // This is necessary because Next.js router.push() doesn't always trigger
    // a full re-render with new translations for dynamic [locale] segments
    window.location.href = newPath;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="font-mono gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLanguage.flag}</span>
          <span className="hidden md:inline">{currentLanguage.code.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="font-mono">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className={`cursor-pointer ${currentLocale === lang.code ? "bg-accent/10" : ""}`}
          >
            <span className="mr-2">{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

