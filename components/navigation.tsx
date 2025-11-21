"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getLocaleFromPath } from "@/lib/i18n-constants";

const ADMIN_ENTRY_STORAGE_KEY = "adminEntryChoiceShownForUser";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const user = session?.user;
  const [isAdmin, setIsAdmin] = useState(false);
  const adminCheckRef = useRef(false);

  // Get current locale from pathname
  const locale = getLocaleFromPath(pathname);

  // Helper to create locale-aware href
  const localeHref = (path: string) => {
    // Remove leading slash if present
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    // If path is empty, just return locale
    if (!cleanPath) return `/${locale}`;
    return `/${locale}/${cleanPath}`;
  };

  const isActive = (path: string) => {
    const localePath = localeHref(path);
    return pathname === localePath || pathname === path;
  };

  // Check admin role when user session is available
  useEffect(() => {
    if (status === "loading") return;
    
    if (!user) {
      setIsAdmin(false);
      adminCheckRef.current = false;
      return;
    }

    // Prevent duplicate requests
    if (adminCheckRef.current) return;
    adminCheckRef.current = true;

    // Fetch admin role from API
    const checkAdminRole = async () => {
      try {
        const response = await fetch("/api/user/role");
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin || false);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
        setIsAdmin(false);
      } finally {
        adminCheckRef.current = false;
      }
    };

    checkAdminRole();
  }, [user, status]);

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ADMIN_ENTRY_STORAGE_KEY);
    }
    setIsAdmin(false); // Reset admin status on logout
    adminCheckRef.current = false; // Reset ref to allow future checks
    await signOut({ callbackUrl: "/" });
  };

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href={localeHref("/")} className="flex items-center gap-2">
            <span className="font-mono text-xl font-bold text-accent">&gt;_</span>
            <span className="font-mono text-lg font-semibold">LLMO</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link
              href={localeHref("/")}
              className={`font-mono text-sm transition-colors hover:text-accent ${
                isActive("/")
                  ? "text-accent font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              Home
            </Link>
            <Link
              href={localeHref("/about")}
              className={`font-mono text-sm transition-colors hover:text-accent ${
                isActive("/about")
                  ? "text-accent font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              About
            </Link>
            <Link
              href={localeHref("/directory")}
              className={`font-mono text-sm transition-colors hover:text-accent ${
                isActive("/directory")
                  ? "text-accent font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              Directory
            </Link>
            {user && (
              <>
                <Link
                  href={localeHref("/dashboard")}
                  className={`font-mono text-sm transition-colors hover:text-accent ${
                    isActive("/dashboard")
                      ? "text-accent font-semibold"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href={localeHref("/my-links")}
                  className={`font-mono text-sm transition-colors hover:text-accent ${
                    isActive("/my-links")
                      ? "text-accent font-semibold"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  My Links
                </Link>
              </>
            )}
            <Link
              href={localeHref("/pricing")}
              className={`font-mono text-sm transition-colors hover:text-accent ${
                isActive("/pricing")
                  ? "text-accent font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              Pricing
            </Link>
            <Link
              href={localeHref("/analyzer")}
              className={`font-mono text-sm transition-colors hover:text-accent ${
                isActive("/analyzer")
                  ? "text-accent font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              Analyzer
            </Link>
            <Link
              href={localeHref("/contact")}
              className={`font-mono text-sm transition-colors hover:text-accent ${
                isActive("/contact")
                  ? "text-accent font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              Contact
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {loading ? (
              <div className="font-mono text-sm text-muted-foreground">Loading...</div>
            ) : user ? (
              <>
                <span className="font-mono text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
                  {user.email?.split("@")[0]}
                </span>
                <Link href={localeHref("/profile")}>
                  <Button variant="ghost" size="sm" className="font-mono">
                    Profile
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" className="font-mono" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href={localeHref("/login")}>
                  <Button variant="ghost" size="sm" className="font-mono">
                    Login
                  </Button>
                </Link>
                <Link href={localeHref("/register")}>
                  <Button
                    size="sm"
                    className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent"
                  >
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
