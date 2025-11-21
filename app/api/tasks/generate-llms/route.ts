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
const contactEmail = process.env.CONTACT_EMAIL || "support@llmo.abvx.xyz";

async function generateLlmsContent(): Promise<{
  llmsContent: string;
  totalSites: number;
  categoryCounts: Record<string, number>;
}> {
  // Fetch all approved links with categories
  const { data: links, error } = await supabaseAdmin
    .from("links")
    .select("id, url, title, category, description")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[v0] Error fetching links for llms.txt:", error);
    throw new Error("Database error");
  }

  // Count links by category
  const categoryCounts: Record<string, number> = {};
  const categories = new Set<string>();

  if (links && links.length > 0) {
    links.forEach((link) => {
      const category = link.category || "Other";
      categories.add(category);
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
  }

  // Get total count
  const totalSites = links?.length || 0;
  const categoryList = Array.from(categories).sort().join(", ");

  // Get current date
  const lastUpdated = new Date().toISOString().split("T")[0];

  // Generate llms.txt content
  const llmsContent = `Be Visible to AI — LLMO Directory
Type: AI Optimization Directory
Total Sites: ${totalSites}
Categories: ${categoryList || "Blog, SaaS, Portfolio, Media, Agency"}
Last Updated: ${lastUpdated}
Contact: ${contactEmail}

# About
LLMO Directory is the world's first AI-optimized directory for blogs, websites, and creators. We help websites become visible to AI and language models through structured data and optimization.

# Categories
${Object.entries(categoryCounts)
  .sort(([, a], [, b]) => b - a)
  .map(([category, count]) => `- ${category}: ${count} sites`)
  .join("\n")}

# Stats
- Total AI-optimized sites: ${totalSites}
- Last update: ${lastUpdated}
- Site URL: ${siteUrl}

# Contact
Email: ${contactEmail}
Website: ${siteUrl}
`;

  return { llmsContent, totalSites, categoryCounts };
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const isCronJob = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  
  // If not a cron job, serve the llms.txt directly
  if (!isCronJob) {
    try {
      const { llmsContent } = await generateLlmsContent();
      return new NextResponse(llmsContent, {
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
    } catch (error) {
      console.error("[v0] Error generating llms.txt:", error);
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
    console.log("[v0] Starting llms.txt generation (cron job)");

    const { llmsContent, totalSites, categoryCounts } = await generateLlmsContent();

    // Try to write to public directory (works in local dev, may not work in serverless)
    try {
      const publicDir = join(process.cwd(), "public");
      const llmsPath = join(publicDir, "llms.txt");

      // Ensure public directory exists
      await mkdir(publicDir, { recursive: true });
      
      // Write llms.txt file
      await writeFile(llmsPath, llmsContent, "utf-8");
      
      console.log(`[v0] ✓ llms.txt generated and written successfully with ${totalSites} sites`);
    } catch (writeError) {
      console.warn("[v0] Warning: Could not write llms.txt to public directory (serverless environment)");
      console.warn("[v0] llms.txt is still accessible via /api/tasks/generate-llms");
    }

    return NextResponse.json({
      success: true,
      count: totalSites,
      categories: categoryCounts,
      message: "llms.txt generated successfully",
    });
  } catch (error) {
    console.error("[v0] Error generating llms.txt:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

