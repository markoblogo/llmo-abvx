#!/usr/bin/env tsx

/**
 * Fix Router Conflict Script
 *
 * Resolves "App Router and Pages Router both match path" errors and
 * ENOENT build-manifest.json issues by:
 * 1. Removing legacy /pages directory (keeping /app only)
 * 2. Cleaning Next.js cache and rebuild manifest
 * 3. Ensuring /app/page.tsx exists (safe fallback)
 * 4. Restarting dev server on port 3005
 *
 * Usage:
 *   pnpm run fix-router
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const root = process.cwd();
const pagesDir = path.join(root, "pages");
const appDir = path.join(root, "app");
const pagePath = path.join(appDir, "page.tsx");

console.log("🔧 Fixing Next.js Router conflicts...\n");
console.log("=".repeat(80) + "\n");

// 1️⃣ Remove legacy /pages directory
if (fs.existsSync(pagesDir)) {
  console.log("🧹 Removing legacy /pages directory...");

  // List files in pages directory before deletion
  try {
    const files = fs.readdirSync(pagesDir, { recursive: true });
    if (files.length > 0) {
      console.log(`   Found ${files.length} file(s) in /pages directory:`);
      files.slice(0, 10).forEach((file) => {
        console.log(`   • ${file}`);
      });
      if (files.length > 10) {
        console.log(`   ... and ${files.length - 10} more`);
      }
    }
  } catch (error) {
    console.warn("   Could not list pages directory contents");
  }

  try {
    // Backup pages directory before deletion (optional safety measure)
    const backupDir = path.join(root, ".pages-backup");
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    fs.cpSync(pagesDir, backupDir, { recursive: true, force: true });
    console.log(`   📦 Backup saved to: ${path.relative(root, backupDir)}`);

    // Remove pages directory
    fs.rmSync(pagesDir, { recursive: true, force: true });
    console.log("   ✅ /pages directory removed successfully.\n");
  } catch (error: any) {
    console.error(`   ❌ Failed to remove /pages directory: ${error.message}`);
    console.error("   💡 You may need to manually remove it or check permissions.\n");
    process.exit(1);
  }
} else {
  console.log("ℹ️  No /pages directory found — skipping.\n");
}

// 2️⃣ Ensure /app/page.tsx exists
if (!fs.existsSync(pagePath)) {
  console.log("⚠️  No /app/page.tsx found — creating safe fallback page...");

  // Ensure app directory exists
  if (!fs.existsSync(appDir)) {
    fs.mkdirSync(appDir, { recursive: true });
    console.log("   📁 Created /app directory");
  }

  // Create safe fallback page
  const safePageContent = `export default function HomePage() {
  return (
    <main style={{ padding: "4rem", fontFamily: "monospace" }}>
      <h1>🚀 LLMO Directory is live</h1>
      <p>Your AI visibility starts here.</p>
    </main>
  );
}
`;

  try {
    fs.writeFileSync(pagePath, safePageContent);
    console.log("   ✅ Safe /app/page.tsx created.\n");
  } catch (error: any) {
    console.error(`   ❌ Failed to create /app/page.tsx: ${error.message}`);
    process.exit(1);
  }
} else {
  // Validate existing page.tsx
  try {
    const content = fs.readFileSync(pagePath, "utf8");
    if (!content.includes("export default")) {
      console.warn("   ⚠️  /app/page.tsx exists but may be invalid");
      console.warn("   💡 Consider running: pnpm run fix-page\n");
    } else {
      console.log("   ✅ /app/page.tsx exists and appears valid.\n");
    }
  } catch (error) {
    console.warn("   ⚠️  Could not validate /app/page.tsx\n");
  }
}

// 3️⃣ Clean Next.js cache and build artifacts
console.log("🧹 Cleaning Next.js cache and build artifacts...\n");

const dirs = [".next", ".turbo", "node_modules/.cache"];
let cleanedCount = 0;

dirs.forEach((dir) => {
  const fullPath = path.join(root, dir);
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`   ✅ Removed ${dir}`);
      cleanedCount++;
    } catch (error: any) {
      console.warn(`   ⚠️  Failed to remove ${dir}: ${error.message}`);
    }
  } else {
    console.log(`   ℹ️  ${dir} not found (already clean)`);
  }
});

if (cleanedCount > 0) {
  console.log(`\n   🧹 Cleaned ${cleanedCount} directory/directories\n`);
} else {
  console.log("\n   ✨ Cache already clean!\n");
}

// Ensure .next directory structure exists
const nextPath = path.join(root, ".next");
if (!fs.existsSync(nextPath)) {
  fs.mkdirSync(nextPath, { recursive: true });
  console.log("   📁 Created .next directory");
}

const cachePath = path.join(nextPath, "cache");
if (!fs.existsSync(cachePath)) {
  fs.mkdirSync(cachePath, { recursive: true });
  console.log("   📁 Created .next/cache directory\n");
}

// 4️⃣ Rebuild and restart
console.log("=".repeat(80) + "\n");
console.log("🔧 Rebuilding Next.js manifest...\n");

try {
  execSync("pnpm run build", {
    stdio: "inherit",
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
    },
  });
  console.log("\n✅ Rebuild successful.\n");
} catch (err: any) {
  console.error("\n❌ Build failed:", err.message);
  console.error("\n💡 You may need to fix build errors before running the dev server.\n");
  process.exit(1);
}

console.log("=".repeat(80) + "\n");
console.log("🚀 Starting dev server on port 3005...\n");

try {
  execSync("pnpm run dev -- --port 3005", {
    stdio: "inherit",
    cwd: root,
  });
} catch (err: any) {
  // Dev server may be stopped by user (Ctrl+C), which is fine
  if (err.signal === "SIGINT" || err.signal === "SIGTERM") {
    console.log("\n✅ Dev server stopped by user.\n");
  } else {
    console.error("\n❌ Dev server error:", err.message);
    console.error("\n💡 You can start it manually with: pnpm run dev -- --port 3005\n");
    process.exit(1);
  }
}





