import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://llmo.abvx.xyz";

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

import { withErrorHandling, requireEnvVars } from "@/lib/api-error-wrapper"

export const GET = withErrorHandling(async (req: NextRequest) => {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  requireEnvVars(["RESEND_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"]);

  if (!resend) {
    return NextResponse.json({ error: "Resend API key not configured" }, { status: 500 });
  }
    console.log("[v0] Starting subscription renewal reminder cron job");

  // Calculate date 7 days from now
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const eightDaysFromNow = new Date();
  eightDaysFromNow.setDate(eightDaysFromNow.getDate() + 8);

  // Find Pro subscriptions expiring in 7 days (only active subscriptions with Stripe)
  const { data: subscriptions, error } = await supabaseAdmin
      .from("subscriptions")
      .select("id, user_id, expiry_date, stripe_subscription_id, stripe_customer_id")
      .eq("plan", "pro")
      .eq("payment_status", "active")
      .not("stripe_subscription_id", "is", null)
    .gte("expiry_date", sevenDaysFromNow.toISOString())
    .lt("expiry_date", eightDaysFromNow.toISOString());

  if (error) {
    console.error("[v0] Error fetching subscriptions:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log("[v0] No subscriptions found for renewal reminder");
    return NextResponse.json({ message: "No reminders to send", count: 0 });
  }

  console.log(`[v0] Found ${subscriptions.length} subscriptions for renewal reminder`);

  let successCount = 0;
  let failCount = 0;
  const results: Array<{ email: string; status: "success" | "failed"; error?: string }> = [];

  for (const subscription of subscriptions) {
    try {
      // Get user email from profiles
      const { data: profile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("email, full_name")
          .eq("id", subscription.user_id)
        .single();

      if (profileError || !profile?.email) {
        console.error("[v0] No email found for subscription:", subscription.id);
        failCount++;
        results.push({ email: "unknown", status: "failed", error: "No email address" });
        continue;
      }

      const userName = profile.full_name || profile.email.split("@")[0];
      const daysLeft = Math.ceil(
        (new Date(subscription.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      );

      // Generate email HTML
      const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: 'IBM Plex Mono', monospace; background-color: #000; color: #00FF9C; padding: 20px; line-height: 1.6;">
              <div style="max-width: 600px; margin: 0 auto;">
                <h2 style="color: #00FF9C; margin-bottom: 20px;">// SUBSCRIPTION RENEWAL REMINDER</h2>
                <p style="margin-bottom: 16px;">
                  Hi ${userName},
                </p>
                <p style="margin-bottom: 16px;">
                  Your LLMO Directory Pro subscription will renew in <strong>${daysLeft} days</strong> (${new Date(subscription.expiry_date).toLocaleDateString()}).
                </p>
                <p style="margin-bottom: 24px;">
                  Your subscription will automatically renew and your payment method on file will be charged.
                </p>
                <div style="margin: 30px 0;">
                  <a
                    href="${siteUrl}/dashboard"
                    style="display: inline-block; background-color: #00FF9C; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-right: 12px; margin-bottom: 12px;"
                  >
                    Manage Subscription
                  </a>
                  <a
                    href="${siteUrl}/dashboard"
                    style="display: inline-block; background-color: transparent; color: #00FF9C; border: 2px solid #00FF9C; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-bottom: 12px;"
                  >
                    Update Payment Method
                  </a>
                </div>
                <p style="margin-top: 30px; color: #888; font-size: 12px;">
                  // SYSTEM MESSAGE: Renewal reminder sent successfully.
                </p>
              </div>
            </body>
          </html>
      `;

      // Send email via Resend
      const { data: emailResult, error: emailError } = await resend.emails.send({
          from: process.env.EMAIL_FROM || "LLMO Directory <no-reply@llmo.directory>",
          to: profile.email,
          subject: `Your LLMO Directory Pro subscription renews in ${daysLeft} days`,
        html: emailHtml,
      });

      if (emailError) {
        console.error(`[v0] ✗ Failed to send reminder to ${profile.email}:`, emailError);
        failCount++;
        results.push({ email: profile.email, status: "failed", error: emailError.message });
        continue;
      }

      // Log email in email_logs
      await supabaseAdmin.from("email_logs").insert({
        recipient_email: profile.email,
        subject: `Your LLMO Directory Pro subscription renews in ${daysLeft} days`,
        status: "sent",
        message_id: emailResult?.id || null,
      });

      console.log(`[v0] ✓ Renewal reminder sent successfully to ${profile.email}`);
      successCount++;
      results.push({ email: profile.email, status: "success" });
    } catch (emailError) {
      console.error(`[v0] ✗ Exception sending email for subscription ${subscription.id}:`, emailError);
      failCount++;
      results.push({
        email: "unknown",
        status: "failed",
        error: emailError instanceof Error ? emailError.message : "Unknown error",
      });
    }
  }

  console.log(`[v0] Renewal reminder job complete: ${successCount} sent, ${failCount} failed`);

  return NextResponse.json({
    message: "Renewal reminder emails processed",
    total: subscriptions.length,
    success: successCount,
    failed: failCount,
    results,
  });
})

