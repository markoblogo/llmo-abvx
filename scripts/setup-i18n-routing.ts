#!/usr/bin/env tsx

/**
 * Setup i18n Routing Script
 *
 * Creates locale-based routing structure for Next.js 16 App Router.
 * Each core route becomes accessible under /[locale]/ route prefix.
 *
 * Usage:
 *   pnpm run setup-i18n
 */

import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const appDir = path.join(root, "app");
const localeDir = path.join(appDir, "[locale]");
const reportPath = path.join(root, "scripts", "logs", "i18n-sync-report.txt");

const locales = ["en", "fr", "es", "ru", "uk", "zh"];
const corePages = ["about", "pricing", "faq", "contact", "analyzer", "dashboard"];
const authPages = ["login", "register"];
const otherPages = ["directory", "my-links", "add-link", "admin", "profile"];

// Ensure logs directory exists
const logsDir = path.dirname(reportPath);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

interface PageCreated {
  locale: string;
  route: string;
  file: string;
  type: "core" | "auth" | "other" | "home";
}

const createdPages: PageCreated[] = [];

console.log("🌍 Setting up i18n routing structure...\n");
console.log("=".repeat(80) + "\n");

// 1. Create [locale] directory structure
if (!fs.existsSync(localeDir)) {
  fs.mkdirSync(localeDir, { recursive: true });
  console.log("📁 Created app/[locale] directory\n");
} else {
  console.log("✅ app/[locale] directory already exists\n");
}

// Helper function to create a page file that re-exports from base
// Uses dynamic [locale] segment, not specific locale directories
function createLocalePage(route: string, baseRoute: string, isHome = false) {
  // Use [locale] dynamic segment, not specific locale directories
  const routeDir = isHome ? localeDir : path.join(localeDir, route);
  const pageFile = path.join(routeDir, "page.tsx");

  // Ensure directory exists
  if (!fs.existsSync(routeDir)) {
    fs.mkdirSync(routeDir, { recursive: true });
  }

  // Check if page already exists
  if (fs.existsSync(pageFile)) {
    return; // Skip if already exists
  }

  // For home page, create a wrapper that uses locale
  if (isHome) {
    const homeContent = `import HomePage from "@/app/page";

export default function LocalizedHomePage({ params }: { params: { locale: string } }) {
  // The base HomePage component handles locale detection
  return <HomePage />;
}

export async function generateStaticParams() {
  return ${JSON.stringify(locales)}.map((locale) => ({ locale }));
}
`;
    fs.writeFileSync(pageFile, homeContent);
    
    createdPages.push({
      locale: "[locale]",
      route: "",
      file: pageFile,
      type: "home",
    });
  } else {
    // For other pages, re-export from base route
    const relativePath = path.relative(
      path.dirname(pageFile),
      path.join(appDir, baseRoute, "page.tsx"),
    );

    const pageContent = `// Re-export from base page component
// Locale is handled by middleware and context

export { default } from "${relativePath.startsWith(".") ? relativePath : `@/app/${baseRoute}/page`}";
export { metadata } from "${relativePath.startsWith(".") ? relativePath : `@/app/${baseRoute}/page`}";

export async function generateStaticParams() {
  return ${JSON.stringify(locales)}.map((locale) => ({ locale }));
}
`;
    fs.writeFileSync(pageFile, pageContent);
    
    createdPages.push({
      locale: "[locale]",
      route,
      file: pageFile,
      type: corePages.includes(route) ? "core" : authPages.includes(route) ? "auth" : "other",
    });
  }
}

// 2. Create home page with [locale] dynamic segment
console.log("📄 Creating home page with [locale] segment...");
createLocalePage("", "", true);
console.log(`   ✅ Created home page (accessible for all ${locales.length} locales)\n`);

// 3. Create core pages
console.log("📄 Creating core pages...");
for (const page of corePages) {
  const basePagePath = path.join(appDir, page, "page.tsx");
  if (fs.existsSync(basePagePath)) {
    createLocalePage(page, page);
    console.log(`   ✅ Created ${page} page (accessible for all ${locales.length} locales)`);
  } else {
    console.warn(`   ⚠️  Base page not found: ${page}`);
  }
}
console.log("");

// 4. Create auth pages
console.log("📄 Creating auth pages...");
for (const page of authPages) {
  const basePagePath = path.join(appDir, page, "page.tsx");
  if (fs.existsSync(basePagePath)) {
    createLocalePage(page, page);
    console.log(`   ✅ Created ${page} page (accessible for all ${locales.length} locales)`);
  } else {
    console.warn(`   ⚠️  Base page not found: ${page}`);
  }
}
console.log("");

// 5. Create other pages
console.log("📄 Creating other pages...");
for (const page of otherPages) {
  const basePagePath = path.join(appDir, page, "page.tsx");
  if (fs.existsSync(basePagePath)) {
    createLocalePage(page, page);
    console.log(`   ✅ Created ${page} page (accessible for all ${locales.length} locales)`);
  } else {
    console.warn(`   ⚠️  Base page not found: ${page}`);
  }
}
console.log("");

// 6. Create root redirect page (app/page.tsx wrapper)
console.log("📄 Creating root redirect...");
const rootPagePath = path.join(appDir, "page.tsx");
if (fs.existsSync(rootPagePath)) {
  // Read existing root page to keep it as fallback
  const rootPageContent = fs.readFileSync(rootPagePath, "utf8");
  
  // Create a redirect wrapper if it doesn't already handle locales
  if (!rootPageContent.includes("[locale]") && !rootPageContent.includes("middleware")) {
    // Keep the original, it will be used as fallback
    console.log("   ℹ️  Root page exists - middleware will handle redirects\n");
  }
}

// 7. Update middleware to handle root redirect
console.log("📝 Checking middleware configuration...");
const middlewarePath = path.join(root, "middleware.ts");
if (fs.existsSync(middlewarePath)) {
  const middlewareContent = fs.readFileSync(middlewarePath, "utf8");
  
  // Check if root redirect is handled
  if (!middlewareContent.includes("pathname === '/'")) {
    console.warn("   ⚠️  Middleware may need root redirect handling");
  } else {
    console.log("   ✅ Middleware handles root redirect\n");
  }
}

// 8. Generate report
const reportLines: string[] = [];
reportLines.push("i18n Routing Setup Report");
reportLines.push("=".repeat(80));
reportLines.push(`Generated: ${new Date().toISOString()}\n`);
reportLines.push(`Locales configured: ${locales.join(", ")}`);
reportLines.push(`Default locale: en`);
reportLines.push(`Total pages created: ${createdPages.length}\n`);

reportLines.push("CREATED PAGES:");
reportLines.push("-".repeat(80));
reportLines.push("Locale | Route | Type | File Path");
reportLines.push("-".repeat(80));

for (const page of createdPages) {
  const relativePath = path.relative(root, page.file);
  reportLines.push(`${page.locale.padEnd(6)} | ${(page.route || "/").padEnd(20)} | ${page.type.padEnd(6)} | ${relativePath}`);
}

reportLines.push("\n");
reportLines.push("ROUTE MAPPING:");
reportLines.push("-".repeat(80));
reportLines.push("Original Route | Localized Routes");
reportLines.push("-".repeat(80));

const routeGroups = new Map<string, string[]>();
for (const page of createdPages) {
  const route = page.route || "/";
  const localized = routeGroups.get(route) || [];
  localized.push(`/${page.locale}${route || ""}`);
  routeGroups.set(route, localized);
}

for (const [route, localized] of routeGroups.entries()) {
  reportLines.push(`${(route || "/").padEnd(15)} | ${localized.join(", ")}`);
}

// Write report
fs.writeFileSync(reportPath, reportLines.join("\n") + "\n");

console.log("=".repeat(80));
console.log(`📄 Report saved to: ${path.relative(root, reportPath)}\n`);
console.log(`✅ Created ${createdPages.length} localized page routes\n`);
console.log("💡 Next steps:");
console.log("   1. Update navigation components to use locale-aware links");
console.log("   2. Test routes: http://localhost:3005/en/pricing, /fr/about, etc.");
console.log("   3. Verify middleware redirects /pricing → /en/pricing\n");

