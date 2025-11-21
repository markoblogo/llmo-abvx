#!/usr/bin/env tsx

/**
 * Content Audit Script
 * 
 * Crawls site pages and compares content against features.json
 * to identify outdated or missing content.
 */

import * as fs from "fs";
import * as path from "path";

interface FeaturesConfig {
  features: string[];
  requiredFeatures: Record<string, string[]>;
  shouldNotMention: Record<string, string[]>;
}

interface AuditResult {
  page: string;
  status: "up-to-date" | "outdated" | "missing-features";
  mismatches: string[];
  missingFeatures: string[];
  unwantedMentions: string[];
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3005"; // DEV-ONLY fallback
const PAGES_TO_AUDIT = [
  "/",
  "/about",
  "/faq",
  "/pricing",
  "/analyzer",
  "/add-link",
  "/dashboard",
  "/directory",
];

async function fetchPageContent(url: string): Promise<string> {
  try {
    const fullUrl = `${BASE_URL}${url}`;
    console.log(`[audit] Fetching ${fullUrl}...`);
    
    const response = await fetch(fullUrl, {
      headers: {
        "User-Agent": "LLMO-Content-Audit-Bot/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract text content from HTML
    // Remove script and style tags
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ") // Remove all HTML tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    return text.toLowerCase();
  } catch (error: any) {
    console.error(`[audit] Error fetching ${url}:`, error.message);
    throw error;
  }
}

function checkContent(
  pageContent: string,
  requiredFeatures: string[],
  shouldNotMention: string[]
): {
  missingFeatures: string[];
  unwantedMentions: string[];
} {
  const missingFeatures: string[] = [];
  const unwantedMentions: string[] = [];

  // Check for required features
  for (const feature of requiredFeatures) {
    const featureLower = feature.toLowerCase();
    if (!pageContent.includes(featureLower)) {
      missingFeatures.push(`missing "${feature}"`);
    }
  }

  // Check for unwanted mentions
  for (const unwanted of shouldNotMention) {
    const unwantedLower = unwanted.toLowerCase();
    if (pageContent.includes(unwantedLower)) {
      unwantedMentions.push(`mentions "${unwanted}"`);
    }
  }

  return { missingFeatures, unwantedMentions };
}

async function auditPage(
  page: string,
  config: FeaturesConfig
): Promise<AuditResult> {
  const requiredFeatures = config.requiredFeatures[page] || [];
  const shouldNotMention = config.shouldNotMention[page] || [];

  try {
    const pageContent = await fetchPageContent(page);
    
    const { missingFeatures, unwantedMentions } = checkContent(
      pageContent,
      requiredFeatures,
      shouldNotMention
    );

    const mismatches = [...missingFeatures, ...unwantedMentions];
    
    let status: "up-to-date" | "outdated" | "missing-features";
    if (mismatches.length === 0) {
      status = "up-to-date";
    } else if (unwantedMentions.length > 0) {
      status = "outdated";
    } else {
      status = "missing-features";
    }

    return {
      page,
      status,
      mismatches,
      missingFeatures,
      unwantedMentions,
    };
  } catch (error: any) {
    console.error(`[audit] Error auditing ${page}:`, error.message);
    return {
      page,
      status: "outdated",
      mismatches: [`Error: ${error.message}`],
      missingFeatures: [],
      unwantedMentions: [],
    };
  }
}

async function main() {
  console.log("[audit] Starting content audit...");
  console.log(`[audit] Base URL: ${BASE_URL}`);
  console.log(`[audit] Pages to audit: ${PAGES_TO_AUDIT.length}\n`);

  // Load features.json
  const featuresPath = path.join(process.cwd(), "features.json");
  if (!fs.existsSync(featuresPath)) {
    console.error(`[audit] Error: features.json not found at ${featuresPath}`);
    process.exit(1);
  }

  const config: FeaturesConfig = JSON.parse(
    fs.readFileSync(featuresPath, "utf-8")
  );

  console.log(`[audit] Loaded features.json with ${config.features.length} features\n`);

  // Audit all pages
  const results: AuditResult[] = [];
  
  for (const page of PAGES_TO_AUDIT) {
    const result = await auditPage(page, config);
    results.push(result);
    
    // Log result
    if (result.status === "up-to-date") {
      console.log(`[audit] ✓ ${page} - up-to-date`);
    } else {
      console.log(`[audit] ✗ ${page} - ${result.status}`);
      result.mismatches.forEach((mismatch) => {
        console.log(`[audit]   - ${mismatch}`);
      });
    }
    console.log();
    
    // Small delay to avoid overwhelming the server
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Generate report
  const report = results.filter((r) => r.status !== "up-to-date");
  
  // Output JSON report
  console.log("[audit] Audit Report:");
  console.log(JSON.stringify(report, null, 2));
  
  // Summary
  const upToDate = results.filter((r) => r.status === "up-to-date").length;
  const outdated = results.filter((r) => r.status === "outdated").length;
  const missingFeatures = results.filter((r) => r.status === "missing-features").length;

  console.log("\n[audit] Summary:");
  console.log(`  • Up-to-date: ${upToDate}/${results.length}`);
  console.log(`  • Outdated: ${outdated}/${results.length}`);
  console.log(`  • Missing features: ${missingFeatures}/${results.length}`);

  // Exit with error code if there are issues
  if (report.length > 0) {
    console.log("\n[audit] ⚠️  Some pages need updates!");
    process.exit(1);
  } else {
    console.log("\n[audit] ✅ All pages are up-to-date!");
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("[audit] Fatal error:", error);
  process.exit(1);
});


