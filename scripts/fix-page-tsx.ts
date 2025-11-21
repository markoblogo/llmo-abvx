#!/usr/bin/env tsx

/**
 * Fix Page.tsx Script
 *
 * Ensures /app/page.tsx exists with a safe, minimal implementation
 * to fix ENOENT build-manifest.json errors caused by missing or corrupted page files.
 *
 * Usage:
 *   pnpm run fix-page
 */

import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const appDir = path.join(root, "app");
const pagePath = path.join(appDir, "page.tsx");

const safePageContent = `"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        padding: "4rem",
        fontFamily: "monospace",
        lineHeight: 1.6,
        color: "#fff",
        backgroundColor: "#0d0d0d",
        minHeight: "100vh",
      }}
    >
      <h1>🚀 LLMO Directory</h1>
      <p>Welcome to the world's first AI Visibility Directory.</p>
      <p>
        <Link href="/login">Login</Link> | <Link href="/register">Register</Link> |{" "}
        <Link href="/pricing">Pricing</Link>
      </p>
      <p>
        Your portal to <strong>LLM Optimization</strong> — Analyze, Improve, and Be Visible to
        AI.
      </p>
    </main>
  );
}
`;

console.log("🔧 Fixing /app/page.tsx...\n");

// Ensure app directory exists
if (!fs.existsSync(appDir)) {
  fs.mkdirSync(appDir, { recursive: true });
  console.log("📁 Created /app directory");
} else {
  console.log("✅ /app directory exists");
}

// Check if page.tsx exists
const pageExists = fs.existsSync(pagePath);

if (pageExists) {
  console.log("📄 /app/page.tsx already exists");
  
  // Read existing content to check if it's valid
  try {
    const existingContent = fs.readFileSync(pagePath, "utf8");
    
    // Basic validation: check if it exports a default component
    if (
      existingContent.includes("export default") ||
      existingContent.includes("export default function") ||
      existingContent.includes("export default async")
    ) {
      console.log("✅ Existing page.tsx appears valid");
      console.log("💡 If you still have build issues, consider running: pnpm run reset\n");
    } else {
      console.warn("⚠️  Existing page.tsx may be invalid - backing up and creating new one");
      // Backup existing file
      const backupPath = `${pagePath}.backup.${Date.now()}`;
      fs.writeFileSync(backupPath, existingContent);
      console.log(`📦 Backup saved to: ${path.relative(root, backupPath)}`);
      
      // Write safe content
      fs.writeFileSync(pagePath, safePageContent);
      console.log("✅ Created new /app/page.tsx with safe content");
    }
  } catch (error: any) {
    console.error(`❌ Error reading existing page.tsx: ${error.message}`);
    console.log("📝 Creating new page.tsx...");
    fs.writeFileSync(pagePath, safePageContent);
    console.log("✅ Created /app/page.tsx with safe content");
  }
} else {
  // Create new page.tsx
  fs.writeFileSync(pagePath, safePageContent);
  console.log("✅ Created /app/page.tsx successfully");
}

console.log("\n" + "=".repeat(80));
console.log("✅ Page.tsx fix complete!\n");

// Optionally auto-start dev server (uncomment if needed)
const AUTO_START = process.env.AUTO_START !== "false";

if (AUTO_START && process.argv.includes("--start")) {
  console.log("🚀 Starting dev server on port 3005...\n");
  const { execSync } = require("child_process");
  try {
    execSync("pnpm run dev -- --port 3005", {
      stdio: "inherit",
      cwd: root,
    });
  } catch (err: any) {
    if (err.signal === "SIGINT" || err.signal === "SIGTERM") {
      console.log("\n✅ Dev server stopped by user.\n");
    } else {
      console.error("\n❌ Dev server error:", err.message);
      console.error("\n💡 You can start it manually with: pnpm run dev -- --port 3005\n");
    }
  }
} else {
  console.log("💡 Run 'pnpm run dev -- --port 3005' to start the dev server.");
  console.log("💡 Or run 'pnpm run fix-page -- --start' to auto-start.\n");
}




