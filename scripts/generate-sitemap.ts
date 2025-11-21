#!/usr/bin/env tsx

/**
 * Sitemap Generation Script
 *
 * Generates sitemap.xml with all static routes and approved links from database
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://llmo.abvx.xyz";

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// Static routes
const staticRoutes = [
  "",
  "pricing",
  "analyzer",
  "metadata",
  "dashboard",
  "about",
  "faq",
  "directory",
  "login",
  "add-link",
];

// Locales
const locales = ["en", "fr", "es", "uk", "ru", "zh"];

async function generateSitemap() {
  console.log("🗺️  Generating sitemap...\n");

  const urlEntries: Array<{
    loc: string;
    changefreq: string;
    priority: number;
    lastmod?: string;
  }> = [];

  // Add static routes with all locales
  for (const route of staticRoutes) {
    for (const locale of locales) {
      const fullPath = locale === "en" ? route : `${locale}/${route}`;
      urlEntries.push({
        loc: `${BASE_URL}/${fullPath}`,
        changefreq: "daily",
        priority: route === "" ? 1.0 : 0.8,
      });
    }
  }

  // Add approved links from database
  try {
    console.log("📊 Fetching approved links from database...");
    const { data: links, error } = await supabaseAdmin
      .from("links")
      .select("id, url, status, updated_at, is_featured")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching links:", error.message);
    } else if (links && links.length > 0) {
      console.log(`✅ Found ${links.length} approved links\n`);

      // Add directory listing page
      urlEntries.push({
        loc: `${BASE_URL}/directory`,
        changefreq: "daily",
        priority: 0.9,
      });

      // Add individual link pages (if they exist)
      links.slice(0, 1000).forEach((link) => {
        // Add directory link detail page
        urlEntries.push({
          loc: `${BASE_URL}/directory/${link.id}`,
          changefreq: link.is_featured ? "weekly" : "monthly",
          priority: link.is_featured ? 0.9 : 0.7,
          lastmod: link.updated_at ? new Date(link.updated_at).toISOString().split("T")[0] : undefined,
        });
      });
    } else {
      console.log("⚠️  No approved links found\n");
    }
  } catch (err: any) {
    console.error("❌ Error fetching links from database:", err.message);
    console.log("   Continuing with static routes only...\n");
  }

  // Generate XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries
  .map((entry) => {
    const lastmod = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : "";
    const hreflangLinks = locales
      .map((locale) => {
        const path = entry.loc.replace(BASE_URL, "");
        const isLocalized = path.includes("/");
        if (isLocalized) {
          const basePath = path.split("/").slice(1).join("/");
          return `\n    <xhtml:link rel="alternate" hreflang="${locale}" href="${BASE_URL}/${locale}/${basePath}" />`;
        } else {
          return `\n    <xhtml:link rel="alternate" hreflang="${locale}" href="${BASE_URL}/${locale}${path}" />`;
        }
      })
      .join("");
    return `  <url>
    <loc>${entry.loc}</loc>${lastmod}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>${hreflangLinks}
  </url>`;
  })
  .join("\n")}
</urlset>`;

  // Write to public/sitemap.xml
  const outputPath = path.join(process.cwd(), "public", "sitemap.xml");
  fs.writeFileSync(outputPath, sitemap, "utf8");

  console.log(`✅ Sitemap generated successfully!`);
  console.log(`   📄 Saved to: ${outputPath}`);
  console.log(`   📊 Total URLs: ${urlEntries.length}\n`);
}

generateSitemap().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});




