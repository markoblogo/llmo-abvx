#!/usr/bin/env tsx

/**
 * Fix API Route Conflicts Script
 *
 * Finds and resolves conflicts between App Router (/app/api) and Pages Router (/pages/api)
 * by keeping only App Router versions and removing Pages Router duplicates.
 *
 * Usage:
 *   pnpm run fix-api-conflicts
 */

import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const appApiDir = path.join(root, "app", "api");
const pagesApiDir = path.join(root, "pages", "api");
const reportPath = path.join(root, "scripts", "logs", "api-cleanup-report.txt");

interface RouteConflict {
  route: string;
  appRouterPath: string | null;
  pagesRouterPath: string | null;
  status: "removed" | "kept" | "no-conflict";
  action: string;
}

// Ensure logs directory exists
const logsDir = path.dirname(reportPath);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

console.log("🔍 Scanning for API route conflicts...\n");
console.log("=".repeat(80) + "\n");

// Function to get route path from file path
function getRoutePath(filePath: string, baseDir: string): string {
  const relative = path.relative(baseDir, filePath);
  // Remove file extension and convert to route path
  let route = relative.replace(/\.(ts|tsx|js|jsx)$/, "");
  
  // Handle route.ts/route.tsx files (App Router)
  if (route.endsWith("/route")) {
    route = route.replace("/route", "");
  }
  
  // Convert path separators to URL slashes
  route = route.replace(/\\/g, "/");
  
  // Ensure it starts with /api
  if (!route.startsWith("/api")) {
    route = "/api/" + route;
  }
  
  // Remove index routes
  route = route.replace(/\/index$/, "");
  
  return route;
}

// Function to find all API routes in a directory
function findApiRoutes(dir: string, routerType: "app" | "pages"): Map<string, string[]> {
  const routes = new Map<string, string[]>();
  
  if (!fs.existsSync(dir)) {
    return routes;
  }
  
  function scanDirectory(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
          // Skip non-route files in App Router
          if (routerType === "app" && entry.name !== "route.ts" && entry.name !== "route.tsx") {
            continue;
          }
          
          const routePath = getRoutePath(fullPath, routerType === "app" ? appApiDir : pagesApiDir);
          const existing = routes.get(routePath) || [];
          existing.push(fullPath);
          routes.set(routePath, existing);
        }
      }
    }
  }
  
  scanDirectory(dir);
  return routes;
}

// Find all routes in both routers
const appRoutes = findApiRoutes(appApiDir, "app");
const pagesRoutes = findApiRoutes(pagesApiDir, "pages");

console.log(`📊 Found ${appRoutes.size} App Router routes`);
console.log(`📊 Found ${pagesRoutes.size} Pages Router routes\n`);

// Find conflicts
const conflicts: RouteConflict[] = [];
const allRoutes = new Set([...appRoutes.keys(), ...pagesRoutes.keys()]);

for (const route of allRoutes) {
  const appPaths = appRoutes.get(route) || [];
  const pagesPaths = pagesRoutes.get(route) || [];
  
  const conflict: RouteConflict = {
    route,
    appRouterPath: appPaths[0] || null,
    pagesRouterPath: pagesPaths[0] || null,
    status: "no-conflict",
    action: "",
  };
  
  if (appPaths.length > 0 && pagesPaths.length > 0) {
    // Conflict detected - keep App Router, remove Pages Router
    conflict.status = "removed";
    conflict.action = "Keeping App Router, removing Pages Router";
    conflicts.push(conflict);
  } else if (appPaths.length > 0) {
    conflict.status = "kept";
    conflict.action = "App Router only (no conflict)";
    conflicts.push(conflict);
  } else if (pagesPaths.length > 0) {
    // Only Pages Router exists - mark for potential migration
    conflict.status = "kept";
    conflict.action = "Pages Router only (consider migrating to App Router)";
    conflicts.push(conflict);
  }
}

// Separate actual conflicts from non-conflicts
const actualConflicts = conflicts.filter((c) => c.appRouterPath && c.pagesRouterPath);
const nonConflicts = conflicts.filter((c) => !(c.appRouterPath && c.pagesRouterPath));

console.log(`⚠️  Found ${actualConflicts.length} conflicting routes\n`);

if (actualConflicts.length > 0) {
  console.log("🔧 Resolving conflicts...\n");
  
  // Remove Pages Router duplicates
  for (const conflict of actualConflicts) {
    if (conflict.pagesRouterPath) {
      try {
        // Check if file exists
        if (fs.existsSync(conflict.pagesRouterPath)) {
          fs.unlinkSync(conflict.pagesRouterPath);
          console.log(`   ✅ Removed: ${path.relative(root, conflict.pagesRouterPath)}`);
        }
      } catch (error: any) {
        console.error(`   ❌ Failed to remove ${conflict.pagesRouterPath}: ${error.message}`);
      }
    }
  }
  
  console.log(`\n✅ Resolved ${actualConflicts.length} conflicts\n`);
}

// Generate report
const reportLines: string[] = [];
reportLines.push("API Route Cleanup Report");
reportLines.push("=".repeat(80));
reportLines.push(`Generated: ${new Date().toISOString()}\n`);
reportLines.push(`Total routes scanned: ${allRoutes.size}`);
reportLines.push(`Conflicts found: ${actualConflicts.length}`);
reportLines.push(`Routes kept: ${nonConflicts.length}\n`);

if (actualConflicts.length > 0) {
  reportLines.push("CONFLICTS RESOLVED:");
  reportLines.push("-".repeat(80));
  reportLines.push("Route Path | App Router | Pages Router | Status");
  reportLines.push("-".repeat(80));
  
  for (const conflict of actualConflicts) {
    const appPath = conflict.appRouterPath ? path.relative(root, conflict.appRouterPath) : "N/A";
    const pagesPath = conflict.pagesRouterPath
      ? path.relative(root, conflict.pagesRouterPath)
      : "N/A";
    reportLines.push(`${conflict.route} | ${appPath} | ${pagesPath} | REMOVED (Pages Router)`);
  }
  
  reportLines.push("\n");
}

reportLines.push("ALL ROUTES:");
reportLines.push("-".repeat(80));
reportLines.push("Route Path | Router Type | Status | Action");
reportLines.push("-".repeat(80));

for (const conflict of conflicts) {
  const routerType =
    conflict.appRouterPath && conflict.pagesRouterPath
      ? "Both (CONFLICT)"
      : conflict.appRouterPath
        ? "App Router"
        : "Pages Router";
  const filePath = conflict.appRouterPath || conflict.pagesRouterPath || "N/A";
  const relativePath = filePath !== "N/A" ? path.relative(root, filePath) : "N/A";
  reportLines.push(
    `${conflict.route} | ${routerType} | ${conflict.status.toUpperCase()} | ${conflict.action}`,
  );
}

// Write report
fs.writeFileSync(reportPath, reportLines.join("\n") + "\n");

console.log("=".repeat(80));
console.log(`📄 Report saved to: ${path.relative(root, reportPath)}\n`);

if (actualConflicts.length > 0) {
  console.log("✅ All conflicts resolved!");
  console.log("💡 Run 'pnpm run clean' to clear cache, then 'pnpm run dev --port 3005' to start dev server.\n");
  process.exit(0);
} else {
  console.log("✨ No conflicts found - all routes are clean!\n");
  process.exit(0);
}





