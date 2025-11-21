import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supportedLocales } from "@/lib/i18n-constants";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static & API
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Detect browser language
  const browserLang = req.headers.get("accept-language")?.split(",")[0]?.slice(0, 2) || "en";
  const locale = supportedLocales.includes(browserLang as any) ? browserLang : "en";

  // Redirect root only
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
