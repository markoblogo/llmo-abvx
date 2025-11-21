import { supabase } from "@/lib/supabaseClient"
import { LinksTable } from "@/components/admin/links-table"

async function getLinks() {
  const { data: links, error } = await supabase
    .from("links")
    .select(
      `
      *,
      profiles:user_id (email)
    `,
    )
    .order("created_at", { ascending: false })

  // Log error only if it's a real error (has message or code)
  if (error && ((error as any).message || (error as any).code)) {
    console.warn("[v0] Error fetching links:", error)
    return []
  }

  // Return links array or empty array if links is null/undefined
  return links || []
}

/**
 * CHANGES MADE:
 * 1. Added calculation of totalLinks and featuredLinks statistics
 * 2. Updated system message to show: "{totalLinks} links total ({featuredLinks} featured)"
 */
export default async function AdminLinksPage() {
  const links = await getLinks()

  // Calculate statistics
  const totalLinks = links.length
  const featuredLinks = links.filter((link) => link.is_featured).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-3xl font-bold">// LINKS MANAGEMENT</h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          // SYSTEM MESSAGE: {totalLinks} links total ({featuredLinks} featured)
        </p>
      </div>

      <LinksTable links={links} />
    </div>
  )
}
