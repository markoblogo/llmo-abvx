import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendEmail, generateExpiryReminderEmail } from "@/lib/email"
import { withErrorHandling, requireEnvVars } from "@/lib/api-error-wrapper"

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
)

export const GET = withErrorHandling(async (req: NextRequest) => {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  requireEnvVars(["RESEND_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"])

  console.log("[v0] Starting reminder email cron job")

  // Calculate date 7 days from now
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  const eightDaysFromNow = new Date()
  eightDaysFromNow.setDate(eightDaysFromNow.getDate() + 8)

  // Find subscriptions expiring in 7 days (free plan only)
  const { data: expiringSubscriptions, error } = await supabaseAdmin
      .from("subscriptions")
      .select(
        `
        *,
        user:user_id (
          email,
          raw_user_meta_data
        )
      `,
      )
      .eq("plan", "free")
    .gte("expiry_date", sevenDaysFromNow.toISOString())
    .lt("expiry_date", eightDaysFromNow.toISOString())

  if (error) {
    console.error("[v0] Error fetching expiring subscriptions:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
    console.log("[v0] No expiring subscriptions found")
    return NextResponse.json({ message: "No reminders to send", count: 0 })
  }

  console.log(`[v0] Found ${expiringSubscriptions.length} expiring subscriptions`)

  let successCount = 0
  let failCount = 0
  const results: Array<{ email: string; status: "success" | "failed"; error?: string }> = []

  for (const subscription of expiringSubscriptions) {
    const user = subscription.user as any
    if (!user?.email) {
      console.error("[v0] No email found for subscription:", subscription.id)
      failCount++
      results.push({ email: "unknown", status: "failed", error: "No email address" })
      continue
    }

    const userName = user.raw_user_meta_data?.name || user.email.split("@")[0]
    const daysLeft = Math.ceil(
      (new Date(subscription.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    )

    try {
      const emailHtml = generateExpiryReminderEmail(userName, subscription.expiry_date, daysLeft)

      const success = await sendEmail({
        to: user.email,
        subject: "Your LLMO Directory listing is about to expire",
        html: emailHtml,
      })

      if (success) {
        console.log(`[v0] ✓ Reminder sent successfully to ${user.email}`)
        successCount++
        results.push({ email: user.email, status: "success" })
      } else {
        console.error(`[v0] ✗ Failed to send reminder to ${user.email}`)
        failCount++
        results.push({ email: user.email, status: "failed", error: "Resend API error" })
      }
    } catch (emailError) {
      console.error(`[v0] ✗ Exception sending email to ${user.email}:`, emailError)
      failCount++
      results.push({
        email: user.email,
        status: "failed",
        error: emailError instanceof Error ? emailError.message : "Unknown error",
      })
    }
  }

  console.log(`[v0] Reminder job complete: ${successCount} sent, ${failCount} failed`)

  return NextResponse.json({
    message: "Reminder emails processed",
    total: expiringSubscriptions.length,
    success: successCount,
    failed: failCount,
    results,
  })
})
