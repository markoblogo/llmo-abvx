import { supabase } from "@/lib/supabaseClient"

export async function GET() {
  // Fetch recent approved links from the database
  const { data: links } = await supabase
    .from("links")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50)

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>LLMO Directory — Recent Listings</title>
    <link>https://llmo.abvx.xyz</link>
    <description>The world's first AI-optimized directory for LLM visibility and structured content.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://llmo.abvx.xyz/feed.xml" rel="self" type="application/rss+xml"/>
    ${
      links
        ?.map(
          (link) => `
    <item>
      <title>${escapeXml(link.title)}</title>
      <link>${escapeXml(link.url)}</link>
      <description>${escapeXml(link.description || "")}</description>
      <pubDate>${new Date(link.created_at).toUTCString()}</pubDate>
      <guid isPermaLink="false">${link.id}</guid>
      <category>${escapeXml(link.category)}</category>
    </item>
    `,
        )
        .join("") || ""
    }
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
