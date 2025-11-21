#!/usr/bin/env tsx

/**
 * Fix Dev Locks Script
 *
 * Clears stale Next.js dev lock files and optionally finds an available port.
 * This prevents localhost crashes caused by stale lock files.
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const LOCK_PATH = path.join(process.cwd(), ".next", "dev", "lock");
const LOCK_DIR = path.dirname(LOCK_PATH);

function isPortInUse(port: number): boolean {
  try {
    // Try to use netstat/lsof to check if port is in use
    // This works on macOS/Linux
    if (process.platform === "darwin" || process.platform === "linux") {
      try {
        execSync(`lsof -ti:${port}`, { stdio: "ignore" });
        return true;
      } catch {
        // Port is not in use
        return false;
      }
    } else {
      // Windows - use netstat
      try {
        execSync(`netstat -ano | findstr :${port}`, { stdio: "ignore" });
        return true;
      } catch {
        return false;
      }
    }
  } catch {
    // If command fails, assume port might be available
    return false;
  }
}

function findAvailablePort(startPort: number = 3000, maxAttempts: number = 10): number {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (!isPortInUse(port)) {
      return port;
    }
  }
  // If all ports are busy, return the starting port and let Next.js handle it
  return startPort;
}

async function main() {
  console.log("🧹 Checking for stale Next.js dev locks...\n");

  // Ensure .next/dev directory exists
  if (!fs.existsSync(LOCK_DIR)) {
    try {
      fs.mkdirSync(LOCK_DIR, { recursive: true });
    } catch (err) {
      // Directory might already exist or permissions issue
    }
  }

  // Remove dev lock if exists
  if (fs.existsSync(LOCK_PATH)) {
    try {
      fs.rmSync(LOCK_PATH, { force: true });
      console.log("✅ Removed stale Next.js dev lock file.");
    } catch (err: any) {
      console.warn(`⚠️  Could not remove lock file: ${err.message}`);
    }
  } else {
    console.log("✅ No stale lock file found.");
  }

  // Check for available ports (Next.js has built-in retry, but we can provide info)
  const preferredPorts = [3000, 3005, 3010];
  const availablePorts: number[] = [];
  const busyPorts: number[] = [];

  // Check each preferred port
  for (const port of preferredPorts) {
    if (isPortInUse(port)) {
      busyPorts.push(port);
    } else {
      availablePorts.push(port);
    }
  }

  // Report port status
  if (availablePorts.length > 0) {
    console.log(`🚀 Available ports: ${availablePorts.join(", ")}`);
    if (busyPorts.length > 0) {
      console.log(`⚠️  Busy ports: ${busyPorts.join(", ")}`);
    }
    console.log(`   Next.js will use the first available port.\n`);
  } else {
    console.log(`⚠️  All preferred ports (${preferredPorts.join(", ")}) are busy.`);
    console.log(`   Next.js will automatically find the next available port.\n`);
  }

  // Clean up any other potential lock files
  const nextDir = path.join(process.cwd(), ".next");
  if (fs.existsSync(nextDir)) {
    try {
      // Remove any .lock files in .next directory
      const files = fs.readdirSync(nextDir, { recursive: true, withFileTypes: true });
      for (const file of files) {
        if (file.isFile() && file.name.endsWith(".lock")) {
          const lockFile = path.join(file.parentPath || nextDir, file.name);
          if (lockFile !== LOCK_PATH) {
            try {
              fs.rmSync(lockFile, { force: true });
              console.log(`✅ Removed additional lock file: ${path.relative(process.cwd(), lockFile)}`);
            } catch {
              // Ignore errors on additional lock files
            }
          }
        }
      }
    } catch {
      // Ignore errors when cleaning additional locks
    }
  }

  console.log("\n✅ Dev lock cleanup completed!\n");
}

main().catch((error) => {
  console.error("❌ Error in fix-dev-locks:", error);
  process.exit(1);
});

