#!/usr/bin/env tsx

/**
 * Debug Internal Error Script
 *
 * Scans all API routes for potential 500 errors:
 * - Checks for error handling
 * - Validates environment variables
 * - Detects missing Stripe/Supabase configuration
 * - Suggests fixes without modifying files
 */

import * as fs from "fs";
import * as path from "path";

const apiDir = path.join(process.cwd(), "app", "api");
const envPath = path.join(process.cwd(), ".env.local");

interface RouteIssue {
  file: string;
  issues: string[];
  severity: "error" | "warning" | "info";
}

function findRouteFiles(dir: string, prefix = ""): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const routes: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const routePath = prefix ? path.join(prefix, entry.name) : entry.name;

    if (entry.isDirectory()) {
      routes.push(...findRouteFiles(fullPath, routePath));
    } else if (entry.name === "route.ts" || entry.name === "route.tsx" || entry.name === "route.js") {
      routes.push(fullPath);
    }
  }

  return routes;
}

function checkEnvVars(): { missing: string[]; present: string[] } {
  const requiredVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
  ];

  const optionalVars = [
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "RESEND_API_KEY",
    "OPENAI_API_KEY",
  ];

  const allVars = [...requiredVars, ...optionalVars];

  if (!fs.existsSync(envPath)) {
    return {
      missing: allVars,
      present: [],
    };
  }

  const content = fs.readFileSync(envPath, "utf8");
  const missing: string[] = [];
  const present: string[] = [];

  for (const varName of requiredVars) {
    const regex = new RegExp(`^${varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=`, "m");
    if (!regex.test(content)) {
      missing.push(varName);
    } else {
      present.push(varName);
    }
  }

  return { missing, present };
}

function checkRouteFile(filePath: string): RouteIssue | null {
  const code = fs.readFileSync(filePath, "utf8");
  const relativePath = path.relative(process.cwd(), filePath);
  const issues: string[] = [];
  let severity: "error" | "warning" | "info" = "info";

  // Check if route uses error wrapper
  const usesErrorWrapper = code.includes("withErrorHandling") || code.includes("@/lib/api-error-wrapper");
  
  // Check for try-catch blocks
  const hasTryCatch = /try\s*\{[\s\S]*?\}\s*catch/.test(code);

  // Check for common error-prone patterns
  const usesStripe = code.includes("stripe") || code.includes("Stripe");
  const usesSupabase = code.includes("supabase") || code.includes("Supabase");
  const usesResend = code.includes("resend") || code.includes("Resend");
  const usesOpenAI = code.includes("openai") || code.includes("OpenAI");

  // Check if Stripe is accessed without checking
  const unsafeStripeAccess = usesStripe && 
    !code.includes("STRIPE_SECRET_KEY") && 
    !code.includes("process.env.STRIPE") &&
    !code.includes("stripe?");

  // Check if Supabase is accessed without checking
  const unsafeSupabaseAccess = usesSupabase && 
    !code.includes("SUPABASE") && 
    !code.includes("supabase?") &&
    !code.includes("createClient");

  // Build issues list
  if (!usesErrorWrapper && !hasTryCatch) {
    issues.push("No error handling wrapper detected — consider using withErrorHandling()");
    severity = "error";
  }

  if (unsafeStripeAccess) {
    issues.push("Stripe accessed without ENV check — may fail if STRIPE_SECRET_KEY missing");
    severity = "error";
  }

  if (unsafeSupabaseAccess) {
    issues.push("Supabase accessed without ENV check — may fail if SUPABASE keys missing");
    severity = "error";
  }

  if (usesResend && !code.includes("RESEND_API_KEY")) {
    issues.push("Resend used but RESEND_API_KEY not checked — may fail if missing");
    severity = "warning";
  }

  if (usesOpenAI && !code.includes("OPENAI_API_KEY")) {
    issues.push("OpenAI used but OPENAI_API_KEY not checked — may fail if missing");
    severity = "warning";
  }

  // Check for common undefined access patterns
  const unsafePropertyAccess = /\.(stripe|supabase|resend|openai)\s*[\.\[]/g.test(code);
  if (unsafePropertyAccess && !hasTryCatch) {
    issues.push("Potential undefined property access — wrap with error handling");
    severity = "warning";
  }

  if (issues.length === 0) {
    return null;
  }

  return {
    file: relativePath,
    issues,
    severity,
  };
}

function generateSafeWrapperExample(routePath: string): string {
  return `
// Example: Wrap your route handler with error handling
import { withErrorHandling, requireEnvVars, safeJsonParse } from "@/lib/api-error-wrapper";
import { NextRequest, NextResponse } from "next/server";

export const POST = withErrorHandling(async (req: NextRequest) => {
  // Validate required env vars
  requireEnvVars(["STRIPE_SECRET_KEY"]);
  
  // Safe JSON parsing
  const data = await safeJsonParse(req);
  
  // Your logic here...
  
  return NextResponse.json({ success: true });
});
`;
}

function main() {
  console.log("🩺 Scanning API routes for potential 500 errors...\n");
  console.log("=" .repeat(80) + "\n");

  // Check environment variables
  console.log("🔍 Checking environment variables...\n");
  const envCheck = checkEnvVars();

  if (!fs.existsSync(envPath)) {
    console.error("❌ Missing .env.local file — API routes may fail without configuration\n");
    console.log("💡 Create .env.local with required variables:\n");
    console.log("   NEXT_PUBLIC_SUPABASE_URL=your_url");
    console.log("   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key");
    console.log("   SUPABASE_SERVICE_ROLE_KEY=your_key");
    console.log("   NEXTAUTH_SECRET=your_secret");
    console.log("   NEXTAUTH_URL=http://localhost:3005\n");
  } else {
    if (envCheck.missing.length > 0) {
      console.error(`❌ Missing required environment variables:\n`);
      envCheck.missing.forEach((v) => {
        console.error(`   • ${v}`);
      });
      console.log("");
    } else {
      console.log("✅ All required environment variables found.\n");
    }

    if (envCheck.present.length > 0) {
      console.log("✅ Present variables:\n");
      envCheck.present.forEach((v) => {
        console.log(`   • ${v}`);
      });
      console.log("");
    }
  }

  // Check route files
  console.log("=" .repeat(80) + "\n");
  console.log("🔍 Scanning API route files...\n");

  const routeFiles = findRouteFiles(apiDir);
  
  if (routeFiles.length === 0) {
    console.warn("⚠️  No route files found under /app/api\n");
    return;
  }

  console.log(`📁 Found ${routeFiles.length} route file(s)\n`);

  const issues: RouteIssue[] = [];
  let routesWithErrors = 0;
  let routesWithWarnings = 0;
  let routesOk = 0;

  for (const file of routeFiles) {
    const issue = checkRouteFile(file);
    if (issue) {
      issues.push(issue);
      if (issue.severity === "error") routesWithErrors++;
      if (issue.severity === "warning") routesWithWarnings++;
    } else {
      routesOk++;
    }
  }

  // Report findings
  if (issues.length === 0) {
    console.log("✅ All routes have proper error handling!\n");
  } else {
    console.log("⚠️  Issues found:\n");

    const errorIssues = issues.filter((i) => i.severity === "error");
    const warningIssues = issues.filter((i) => i.severity === "warning");

    if (errorIssues.length > 0) {
      console.log("❌ Errors (may cause 500 errors):\n");
      errorIssues.forEach((issue) => {
        console.log(`   ${issue.file}`);
        issue.issues.forEach((i) => {
          console.log(`     • ${i}`);
        });
        console.log("");
      });
    }

    if (warningIssues.length > 0) {
      console.log("⚠️  Warnings (may cause issues if ENV missing):\n");
      warningIssues.forEach((issue) => {
        console.log(`   ${issue.file}`);
        issue.issues.forEach((i) => {
          console.log(`     • ${i}`);
        });
        console.log("");
      });
    }

    // Show example
    if (errorIssues.length > 0) {
      console.log("💡 Solution: Wrap routes with error handling:\n");
      console.log(generateSafeWrapperExample("example"));
      console.log("   See: /lib/api-error-wrapper.ts for withErrorHandling() utility\n");
    }
  }

  // Summary
  console.log("=" .repeat(80) + "\n");
  console.log("📊 Summary:\n");
  console.log(`   Total routes: ${routeFiles.length}`);
  console.log(`   ✅ OK: ${routesOk}`);
  console.log(`   ⚠️  Warnings: ${routesWithWarnings}`);
  console.log(`   ❌ Errors: ${routesWithErrors}\n`);

  if (routesWithErrors > 0 || envCheck.missing.length > 0) {
    console.log("❌ Fix errors before running dev server to prevent 500 errors.\n");
    console.log("💡 Quick fix: Wrap problematic routes with withErrorHandling()");
    console.log("   Example: export const POST = withErrorHandling(async (req) => {...})\n");
    process.exit(1);
  } else if (routesWithWarnings > 0) {
    console.log("⚠️  Warnings found — API routes may fail if ENV variables are missing.\n");
    process.exit(0);
  } else {
    console.log("✅ All routes are properly configured!\n");
    process.exit(0);
  }
}

main();




