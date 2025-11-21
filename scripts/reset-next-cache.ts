#!/usr/bin/env tsx

/**
 * Reset Next.js Cache Script
 *
 * Safely removes Next.js build artifacts and cache directories to fix
 * ENOENT errors related to missing build-manifest.json or other cache issues.
 *
 * Usage:
 *   pnpm run reset
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const root = process.cwd();
const dirs = [".next", ".turbo", "node_modules/.cache"];

console.log("🧹 Cleaning Next.js build artifacts...\n");

let cleaned = 0;

dirs.forEach((dir) => {
  const full = path.join(root, dir);
  if (fs.existsSync(full)) {
    try {
      fs.rmSync(full, { recursive: true, force: true });
      console.log(`✅ Removed ${dir}`);
      cleaned++;
    } catch (error: any) {
      console.warn(`⚠️  Failed to remove ${dir}: ${error.message}`);
    }
  } else {
    console.log(`ℹ️  ${dir} not found (already clean)`);
  }
});

if (cleaned === 0) {
  console.log("✨ Cache already clean!\n");
} else {
  console.log(`\n🧹 Cleaned ${cleaned} directory/directories\n`);
}

// Safety check: ensure .next directory structure exists
const nextPath = path.join(root, ".next");
if (!fs.existsSync(nextPath)) {
  fs.mkdirSync(nextPath, { recursive: true });
  console.log("📁 Created .next directory");
}

// Ensure cache directory exists
const cachePath = path.join(nextPath, "cache");
if (!fs.existsSync(cachePath)) {
  fs.mkdirSync(cachePath, { recursive: true });
  console.log("📁 Created .next/cache directory");
}

console.log("\n" + "=".repeat(80));
console.log("🔧 Rebuilding Next.js manifest...\n");

try {
  console.log("Running: pnpm run build\n");
  execSync("pnpm run build", {
    stdio: "inherit",
    cwd: root,
    env: {
      ...process.env,
      // Ensure clean build
      NODE_ENV: "production",
    },
  });
  console.log("\n✅ Rebuild successful.\n");
} catch (err: any) {
  console.error("\n❌ Build failed:", err.message);
  console.error("\n💡 You may need to fix build errors before running the dev server.\n");
  process.exit(1);
}

console.log("=".repeat(80));
console.log("✅ Next.js cache reset complete!\n");

// Auto-start dev server
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
  }
}

