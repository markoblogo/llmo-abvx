import { NextRequest } from "next/server"
import { NextResponse } from "next/server"
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

  const { subscriptionId } = await safeJsonParse(req)

  if (!subscriptionId) {
    return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 })
  }

  // Update payment status to active
  const { error } = await supabase.from("subscriptions").update({ payment_status: "active" }).eq("id", subscriptionId)

  if (error) {
    throw new Error(`Failed to mark as paid: ${error.message}`)
  }

  return NextResponse.json({ success: true })
})
