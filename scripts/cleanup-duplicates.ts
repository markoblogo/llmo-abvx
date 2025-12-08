#!/usr/bin/env tsx

/**
 * Cleanup Duplicates Script
 *
 * Automatically removes duplicate API routes between App Router and Pages Router.
 * Keeps App Router versions (/app/api/*) and deletes Pages Router duplicates (/pages/api/*).
 * Also cleans Next.js cache to prevent stale route conflicts.
 */

import * as fs from "fs";
import * as path from "path";

const pagesApiDir = path.join(process.cwd(), "pages", "api");
const appApiDir = path.join(process.cwd(), "app", "api");
const nextCache = path.join(process.cwd(), ".next");

/**
 * Collect all route files from a directory
 * Returns a map of normalized route paths to actual file paths
 */
function collectRouteFiles(baseDir: string, prefix = ""): Map<string, string> {
  const routes = new Map<string, string>();

  if (!fs.existsSync(baseDir)) {
    return routes;
  }

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(baseDir, entry.name);
    const routePath = prefix ? path.join(prefix, entry.name) : entry.name;

    if (entry.isDirectory()) {
      // Recursively scan subdirectories
      const subRoutes = collectRouteFiles(fullPath, routePath);
      subRoutes.forEach((filePath, route) => {
        routes.set(route, filePath);
      });
    } else if (entry.isFile()) {
      // Check if it's a route file
      const isRouteFile =
        entry.name.endsWith("route.ts") ||
        entry.name.endsWith("route.tsx") ||
        entry.name.endsWith("route.js") ||
        entry.name.endsWith("index.ts") ||
        entry.name.endsWith("index.tsx") ||
        entry.name.endsWith("index.js") ||
        (entry.name.match(/\.(ts|tsx|js)$/) && !entry.name.includes(".") && entry.name.match(/\.(ts|tsx|js)$/));

      if (isRouteFile) {
        // For App Router: route.ts means the folder is the route
        // For Pages Router: filename.ts means filename is the route
        let routeName: string;

        if (entry.name.includes("route.")) {
          // App Router: route.ts → folder name is the route
          routeName = prefix;
        } else if (entry.name.startsWith("index.")) {
          // Pages Router: index.ts → folder name is the route
          routeName = prefix;
        } else {
          // Pages Router: filename.ts → filename + prefix
          const fileName = entry.name.replace(/\.(ts|tsx|js)$/, "");
          routeName = prefix ? path.join(prefix, fileName).replace(/\\/g, "/") : fileName;
        }

        // Normalize route path for comparison
        const normalizedRoute = normalizeRoute(routeName);

        if (normalizedRoute) {
          routes.set(normalizedRoute, fullPath);
        }
      }
    }
  }

  return routes;
}

/**
 * Normalize route paths for comparison
 */
function normalizeRoute(route: string): string {
  return route
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "")
    .toLowerCase();
}

/**
 * Find all files in a directory tree (for deletion)
 */
function findAllFilesInRoute(baseDir: string, routeName: string): string[] {
  const files: string[] = [];
  const routePath = path.join(baseDir, routeName);

  if (!fs.existsSync(routePath)) {
    return files;
  }

  const entries = fs.readdirSync(routePath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(routePath, entry.name);

    if (entry.isDirectory()) {
      // Recursively find files in subdirectories
      const subFiles = findAllFilesInRoute(baseDir, path.join(routeName, entry.name));
      files.push(...subFiles);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  // Also check for direct file match (Pages Router style: routeName.ts)
  const possibleFilePaths = [
    path.join(baseDir, `${routeName}.ts`),
    path.join(baseDir, `${routeName}.tsx`),
    path.join(baseDir, `${routeName}.js`),
  ];

  for (const filePath of possibleFilePaths) {
    if (fs.existsSync(filePath) && !files.includes(filePath)) {
      files.push(filePath);
    }
  }

  return files;
}

function main() {
  console.log("🔍 Checking for duplicate API routes...\n");

  const pageRoutes = collectRouteFiles(pagesApiDir);
  const appRoutes = collectRouteFiles(appApiDir);

  // Find conflicts (routes that exist in both)
  const conflicts: string[] = [];

  pageRoutes.forEach((_, route) => {
    if (appRoutes.has(route)) {
      conflicts.push(route);
    }
  });

  let deletedCount = 0;

  if (conflicts.length > 0) {
    console.warn(`⚠️  Found ${conflicts.length} duplicate route(s) between App and Pages Router:\n`);

    for (const conflict of conflicts) {
      const pageRoutePath = pageRoutes.get(conflict);
      const appRoutePath = appRoutes.get(conflict);

      if (pageRoutePath && fs.existsSync(pageRoutePath)) {
        try {
          // Get the directory containing the file
          const fileDir = path.dirname(pageRoutePath);
          const fileName = path.basename(pageRoutePath);

          // Delete the file
          fs.unlinkSync(pageRoutePath);
          console.log(`🗑️  Deleted: ${path.relative(process.cwd(), pageRoutePath)}`);

          // If it's an index file, check if the directory is now empty and can be removed
          if (fileName.startsWith("index.") || fileName.includes("route.")) {
            try {
              const dirEntries = fs.readdirSync(fileDir);
              // Only remove if directory is empty or only has .gitkeep
              if (dirEntries.length === 0 || (dirEntries.length === 1 && dirEntries[0] === ".gitkeep")) {
                fs.rmdirSync(fileDir);
              }
            } catch {
              // Ignore errors removing directory
            }
          }

          deletedCount++;
        } catch (error: any) {
          console.error(`❌ Error deleting ${pageRoutePath}: ${error.message}`);
        }
      }
    }
    console.log("");
  } else {
    console.log("✅ No duplicate routes found.\n");
  }

  // Clean Next.js cache
  if (fs.existsSync(nextCache)) {
    try {
      console.log("🧹 Cleaning Next.js cache directory...");
      fs.rmSync(nextCache, { recursive: true, force: true });
      console.log("✅ Removed .next cache directory.\n");
    } catch (error: any) {
      console.warn(`⚠️  Could not remove .next cache: ${error.message}\n`);
    }
  } else {
    console.log("✅ No .next cache found.\n");
  }

  if (deletedCount > 0) {
    console.log(`✅ Cleanup complete! Removed ${deletedCount} duplicate route(s).`);
    console.log("💡 Recommendation: Use App Router (/app/api/*) for all new API routes.\n");
  } else {
    console.log("✅ Cleanup complete! No duplicates found.\n");
  }
}

main();





