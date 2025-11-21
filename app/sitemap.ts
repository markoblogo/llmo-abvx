import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // Fetch all approved links
    const { data: links, error } = await supabaseAdmin
      .from("links")
      .select("id, url, updated_at")
      .eq("status", "approved")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching links for sitemap:", error);
    }

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
      {
        url: siteUrl,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1.0,
      },
      {
        url: `${siteUrl}/directory`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.9,
      },
      {
        url: `${siteUrl}/download-book`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: `${siteUrl}/pricing`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
      },
      {
        url: `${siteUrl}/analyzer`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
      },
      {
        url: `${siteUrl}/hidden-knowledge`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      },
    ];

    // Dynamic pages from approved links
    const dynamicPages: MetadataRoute.Sitemap = (links || []).map((link) => ({
      url: `${siteUrl}/directory/${link.id}`,
      lastModified: link.updated_at ? new Date(link.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    // Combine all pages
    return [...staticPages, ...dynamicPages];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    // Return at least static pages on error
    return [
      {
        url: siteUrl,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1.0,
      },
      {
        url: `${siteUrl}/directory`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.9,
      },
      {
        url: `${siteUrl}/download-book`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      },
    ];
  }
}

