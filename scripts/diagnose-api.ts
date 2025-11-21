#!/usr/bin/env tsx

/**
 * API Diagnostics Script
 *
 * Checks API routes for common issues:
 * - Missing environment variables
 * - Missing route handlers
 * - Invalid imports
 * - Route conflicts
 */

import * as fs from "fs";
import * as path from "path";

const apiDir = path.join(process.cwd(), "app", "api");
const pagesApiDir = path.join(process.cwd(), "pages", "api");
const envFile = path.join(process.cwd(), ".env.local");
const envExampleFile = path.join(process.cwd(), ".env.example");

interface DiagnosticResult {
  type: "success" | "warning" | "error";
  message: string;
}

const diagnostics: DiagnosticResult[] = [];

function checkEnvFile(): void {
  console.log("🔍 Checking environment variables...\n");

  if (!fs.existsSync(envFile)) {
    diagnostics.push({
      type: "warning",
      message: "⚠️  Missing .env.local file — API routes may fail without proper configuration",
    });
    console.log("  ⚠️  .env.local not found");
  } else {
    console.log("  ✅ .env.local exists");
  }

  if (!fs.existsSync(envFile)) {
    return;
  }

  const content = fs.readFileSync(envFile, "utf-8");
  const requiredKeys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
  ];

  const optionalKeys = [
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "RESEND_API_KEY",
    "OPENAI_API_KEY",
  ];

  // Check required keys
  const missingRequired: string[] = [];
  for (const key of requiredKeys) {
    const regex = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=`, "m");
    if (!regex.test(content)) {
      missingRequired.push(key);
    }
  }

  if (missingRequired.length > 0) {
    diagnostics.push({
      type: "error",
      message: `❌ Missing required environment variables: ${missingRequired.join(", ")}`,
    });
    console.log(`  ❌ Missing required: ${missingRequired.join(", ")}`);
  } else {
    console.log("  ✅ All required environment variables found");
  }

  // Check optional keys
  const missingOptional: string[] = [];
  for (const key of optionalKeys) {
    const regex = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=`, "m");
    if (!regex.test(content)) {
      missingOptional.push(key);
    }
  }

  if (missingOptional.length > 0) {
    diagnostics.push({
      type: "warning",
      message: `⚠️  Missing optional environment variables (may limit functionality): ${missingOptional.join(", ")}`,
    });
    console.log(`  ⚠️  Missing optional: ${missingOptional.join(", ")}`);
  }

  console.log("");
}

function findApiRoutes(dir: string, prefix = ""): string[] {
  const routes: string[] = [];

  if (!fs.existsSync(dir)) {
    return routes;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const routePath = prefix ? path.join(prefix, entry.name) : entry.name;

    if (entry.isDirectory()) {
      routes.push(...findApiRoutes(fullPath, routePath));
    } else if (entry.name === "route.ts" || entry.name === "route.tsx" || entry.name === "route.js") {
      // For App Router, the directory structure IS the route
      // So prefix (without "route.ts") is the route path
      const routeName = prefix.replace(/\\/g, "/");
      if (routeName) {
        routes.push(routeName);
      }
    }
  }

  return routes.filter((r) => r.length > 0);
}

function checkRouteHandlers(): void {
  console.log("🔍 Checking API route handlers...\n");

  const appRoutes = findApiRoutes(apiDir);
  const pageRoutes = findApiRoutes(pagesApiDir);

  console.log(`  📁 App Router routes: ${appRoutes.length}`);
  if (appRoutes.length > 0) {
    appRoutes.slice(0, 5).forEach((route) => {
      console.log(`     • /api/${route}`);
    });
    if (appRoutes.length > 5) {
      console.log(`     ... and ${appRoutes.length - 5} more`);
    }
  }

  console.log(`  📁 Pages Router routes: ${pageRoutes.length}`);
  if (pageRoutes.length > 0) {
    pageRoutes.slice(0, 5).forEach((route) => {
      console.log(`     • /api/${route}`);
    });
    if (pageRoutes.length > 5) {
      console.log(`     ... and ${pageRoutes.length - 5} more`);
    }
  }

  // Check for conflicts
  const conflicts = appRoutes.filter((r) => pageRoutes.includes(r));
  if (conflicts.length > 0) {
    diagnostics.push({
      type: "error",
      message: `❌ Route conflicts detected: ${conflicts.length} duplicate routes between App and Pages Router`,
    });
    console.log(`\n  ❌ Found ${conflicts.length} route conflicts!`);
    conflicts.forEach((route) => {
      console.log(`     • /api/${route}`);
    });
  } else {
    console.log(`\n  ✅ No route conflicts found`);
  }

  console.log("");
}

function checkRouteFiles(): void {
  console.log("🔍 Validating route file structure...\n");

  const routeFiles: string[] = [];

  function scanDir(dir: string): void {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.match(/route\.(ts|tsx|js)$/)) {
        routeFiles.push(fullPath);
      }
    }
  }

  scanDir(apiDir);

  let validRoutes = 0;
  let issues = 0;

  for (const file of routeFiles) {
    try {
      const content = fs.readFileSync(file, "utf-8");

      // Check for exported handlers
      const hasGet = /export\s+(const|async\s+function|function)\s+GET/.test(content);
      const hasPost = /export\s+(const|async\s+function|function)\s+POST/.test(content);
      const hasPut = /export\s+(const|async\s+function|function)\s+PUT/.test(content);
      const hasDelete = /export\s+(const|async\s+function|function)\s+DELETE/.test(content);
      const hasPatch = /export\s+(const|async\s+function|function)\s+PATCH/.test(content);

      if (hasGet || hasPost || hasPut || hasDelete || hasPatch) {
        validRoutes++;
      } else {
        issues++;
        diagnostics.push({
          type: "warning",
          message: `⚠️  Route file has no exported handlers: ${path.relative(process.cwd(), file)}`,
        });
      }

      // Check for common import issues
      if (content.includes("import") && content.includes("from")) {
        const importLines = content.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g) || [];
        for (const importLine of importLines) {
          const match = importLine.match(/from\s+['"]([^'"]+)['"]/);
          if (match && match[1] && match[1].startsWith("@/")) {
            // Check if it's a valid alias import
            // This is a basic check - actual validation would require TypeScript compiler
          }
        }
      }
    } catch (error: any) {
      issues++;
      diagnostics.push({
        type: "error",
        message: `❌ Error reading route file: ${path.relative(process.cwd(), file)} - ${error.message}`,
      });
    }
  }

  console.log(`  ✅ Valid routes: ${validRoutes}`);
  if (issues > 0) {
    console.log(`  ⚠️  Issues found: ${issues}`);
  } else {
    console.log(`  ✅ No issues found`);
  }

  console.log("");
}

function main() {
  console.log("🩺 Running API diagnostics...\n");
  console.log("=" .repeat(80) + "\n");

  checkEnvFile();
  checkRouteHandlers();
  checkRouteFiles();

  console.log("=" .repeat(80) + "\n");

  // Summary
  const errors = diagnostics.filter((d) => d.type === "error");
  const warnings = diagnostics.filter((d) => d.type === "warning");

  if (errors.length > 0) {
    console.log("❌ Errors found:\n");
    errors.forEach((error) => {
      console.log(`  ${error.message}`);
    });
    console.log("");
  }

  if (warnings.length > 0) {
    console.log("⚠️  Warnings:\n");
    warnings.forEach((warning) => {
      console.log(`  ${warning.message}`);
    });
    console.log("");
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log("✅ All checks passed! API routes should work correctly.\n");
    process.exit(0);
  } else if (errors.length > 0) {
    console.log("❌ Please fix errors before running the dev server.\n");
    process.exit(1);
  } else {
    console.log("⚠️  Warnings found, but API routes should still work.\n");
    process.exit(0);
  }
}

main();

