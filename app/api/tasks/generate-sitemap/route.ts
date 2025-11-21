import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://llmo.abvx.xyz";

async function generateSitemapContent(): Promise<{ xmlContent: string; urlCount: number }> {
  // Fetch all approved links
  const { data: links, error } = await supabaseAdmin
    .from("links")
    .select("id, url, updated_at")
    .eq("status", "approved")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[v0] Error fetching links for sitemap:", error);
    throw new Error("Database error");
  }

  // Generate XML sitemap with localized URLs
  const locales = ["en", "fr", "es", "uk", "ru", "zh"];
  const baseUrls = ["/", "/directory", "/download-book", "/pricing", "/analyzer"];
  const urls: string[] = [];

  // Add localized URLs for base pages
  locales.forEach((locale) => {
    baseUrls.forEach((baseUrl) => {
      const url = locale === "en" ? `${siteUrl}${baseUrl}` : `${siteUrl}/${locale}${baseUrl}`;
      urls.push(url);
    });
  });

  // Add all approved link URLs with locales
  if (links && links.length > 0) {
    links.forEach((link) => {
      locales.forEach((locale) => {
        const url =
          locale === "en"
            ? `${siteUrl}/directory/${link.id}`
            : `${siteUrl}/${locale}/directory/${link.id}`;
        urls.push(url);
      });
    });
  }

  // Generate XML content
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url}</loc>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return { xmlContent, urlCount: urls.length };
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const isCronJob = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  
  // If not a cron job, serve the sitemap directly
  if (!isCronJob) {
    try {
      const { xmlContent } = await generateSitemapContent();
      return new NextResponse(xmlContent, {
        headers: {
          "Content-Type": "application/xml",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
    } catch (error) {
      console.error("[v0] Error generating sitemap:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  }

  // Cron job: Generate and try to write to public directory
  try {
    console.log("[v0] Starting sitemap generation (cron job)");

    const { xmlContent, urlCount } = await generateSitemapContent();

    // Try to write to public directory (works in local dev, may not work in serverless)
    try {
      const publicDir = join(process.cwd(), "public");
      const sitemapPath = join(publicDir, "sitemap.xml");

      // Ensure public directory exists
      await mkdir(publicDir, { recursive: true });
      
      // Write sitemap file
      await writeFile(sitemapPath, xmlContent, "utf-8");
      
      console.log(`[v0] ✓ Sitemap generated and written successfully with ${urlCount} URLs`);
    } catch (writeError) {
      console.warn("[v0] Warning: Could not write sitemap to public directory (serverless environment)");
      console.warn("[v0] Sitemap is still accessible via /api/tasks/generate-sitemap");
    }

    return NextResponse.json({
      success: true,
      count: urlCount,
      message: "Sitemap generated successfully",
    });
  } catch (error) {
    console.error("[v0] Error generating sitemap:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

