"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supportedLocales } from "@/lib/i18n-constants";

export function LocaleLang() {
  const pathname = usePathname();

  useEffect(() => {
    // Extract locale from pathname
    if (!pathname) return;
    const segments = pathname.split("/").filter(Boolean);
    const firstSegment = segments[0];
    
    const locale = supportedLocales.includes(firstSegment as any)
      ? firstSegment
      : "en";

    // Update the html lang attribute
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [pathname]);

  return null;
}

