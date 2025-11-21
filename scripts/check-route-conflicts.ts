#!/usr/bin/env tsx

/**
 * Check Route Conflicts Script
 *
 * Detects conflicting API routes between App Router (/app/api) and Pages Router (/pages/api).
 * Next.js will fail to build if both versions exist for the same route.
 */

import * as fs from "fs";
import * as path from "path";

const pagesApi = path.join(process.cwd(), "pages", "api");
const appApi = path.join(process.cwd(), "app", "api");

/**
 * Collect API routes from a directory
 * Handles both App Router (route.ts/tsx) and Pages Router (index.ts/tsx, handler.ts/tsx) formats
 */
function collectApiRoutes(baseDir: string, prefix = ""): string[] {
  const routes: string[] = [];

  if (!fs.existsSync(baseDir)) {
    return routes;
  }

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(baseDir, entry.name);
    const routePath = prefix ? path.join(prefix, entry.name) : entry.name;

    if (entry.isDirectory()) {
      // Recursively scan subdirectories
      routes.push(...collectApiRoutes(fullPath, routePath));
    } else if (entry.isFile()) {
      // Check if it's a route file
      const isRouteFile =
        entry.name.endsWith("route.ts") ||
        entry.name.endsWith("route.tsx") ||
        entry.name.endsWith("route.js") ||
        entry.name.endsWith("index.ts") ||
        entry.name.endsWith("index.tsx") ||
        entry.name.endsWith("index.js") ||
        (!entry.name.includes(".") && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") || entry.name.endsWith(".js")));

      if (isRouteFile) {
        // Clean route name
        let routeName = entry.name
          .replace(/route\.(ts|tsx|js)$/, "")
          .replace(/index\.(ts|tsx|js)$/, "")
          .replace(/\.(ts|tsx|js)$/, "");

        // Remove trailing slashes and dots
        routeName = routeName.replace(/[./]+$/, "");

        // Build full route path
        const fullRoute = prefix
          ? path.join(prefix.replace(/\/$/, ""), routeName).replace(/\\/g, "/")
          : routeName.replace(/\\/g, "/");

        if (fullRoute) {
          routes.push(fullRoute);
        }
      }
    }
  }

  return routes.filter((r) => r.length > 0);
}

/**
 * Normalize route paths for comparison
 * Handles both Windows and Unix path separators
 */
function normalizeRoute(route: string): string {
  return route.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/|\/$/g, "").toLowerCase();
}

function main() {
  console.log("🔍 Checking for route conflicts between App Router and Pages Router...\n");

  const pageRoutes = collectApiRoutes(pagesApi).map(normalizeRoute);
  const appRoutes = collectApiRoutes(appApi).map(normalizeRoute);

  // Find conflicts (routes that exist in both)
  const conflicts = pageRoutes.filter((r) => appRoutes.includes(r));

  if (conflicts.length > 0) {
    console.error("\n🚨 Route conflicts detected between App Router and Pages Router:\n");

    conflicts.forEach((route) => {
      // Find original paths (not normalized) for better error messages
      const pageRoute = collectApiRoutes(pagesApi).find((r) => normalizeRoute(r) === route);
      const appRoute = collectApiRoutes(appApi).find((r) => normalizeRoute(r) === route);

      console.error(`  ❌ /api/${route || route}`);
      if (pageRoute) {
        console.error(`     📄 Pages Router: /pages/api/${pageRoute}`);
      }
      if (appRoute) {
        console.error(`     📄 App Router:   /app/api/${appRoute}`);
      }
      console.error("");
    });

    console.error(
      "❌ Next.js will fail to build if both versions exist.\n" +
        "👉 Please remove one of the duplicates (recommended: keep only /app/api/*).\n" +
        "   Delete the conflicting file from /pages/api/ to resolve.\n"
    );

    process.exit(1);
  } else {
    console.log("✅ No App/Pages route conflicts found.");
    console.log(`   Found ${pageRoutes.length} routes in /pages/api`);
    console.log(`   Found ${appRoutes.length} routes in /app/api\n`);
  }
}

main();




