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

  const { userId } = await safeJsonParse(req)

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  // Delete user profile (cascade will handle related records)
  const { error } = await supabase.from("profiles").delete().eq("id", userId)

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`)
  }

  return NextResponse.json({ success: true })
})
