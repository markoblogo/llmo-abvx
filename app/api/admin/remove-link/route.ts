import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { checkAdmin } from "@/lib/auth"
import { supabase } from "@/lib/supabaseClient"
import { withErrorHandling, requireEnvVars, safeJsonParse } from "@/lib/api-error-wrapper"

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)
  const { isAdmin } = await checkAdmin(session)
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  requireEnvVars(["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"])

  const { linkId } = await safeJsonParse(req)

  if (!linkId) {
    return NextResponse.json({ error: "Link ID is required" }, { status: 400 })
  }

  // Delete link
  const { error } = await supabase.from("links").delete().eq("id", linkId)

  if (error) {
    throw new Error(`Failed to remove link: ${error.message}`)
  }

  return NextResponse.json({ success: true })
})
