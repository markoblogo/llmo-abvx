import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const amazonUrl = process.env.NEXT_PUBLIC_AMAZON_BOOK_URL || "https://amazon.com/dp/B0FYRSSZKL";
const downloadUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://llmo.abvx.xyz";

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

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!resend) {
    return NextResponse.json({ error: "Resend API key not configured" }, { status: 500 });
  }

  try {
    console.log("[v0] Starting book reminder email cron job");

    // Calculate date 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Find users who downloaded the book at least 6 months ago
    // and haven't received a reminder in the last 6 months
    const { data: downloads, error } = await supabaseAdmin
      .from("downloads")
      .select("id, user_id, email, timestamp, last_reminder_sent")
      .lte("timestamp", sixMonthsAgo.toISOString())
      .or(
        `last_reminder_sent.is.null,last_reminder_sent.lt.${sixMonthsAgo.toISOString()}`,
      );

    if (error) {
      console.error("[v0] Error fetching downloads:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!downloads || downloads.length === 0) {
      console.log("[v0] No users found for book reminder");
      return NextResponse.json({ message: "No reminders to send", count: 0 });
    }

    console.log(`[v0] Found ${downloads.length} users to send reminders to`);

    let successCount = 0;
    let failCount = 0;
    const results: Array<{ email: string; status: "success" | "failed"; error?: string }> = [];

    for (const download of downloads) {
      const email = download.email;

      if (!email) {
        console.error("[v0] No email found for download:", download.id);
        failCount++;
        results.push({ email: "unknown", status: "failed", error: "No email address" });
        continue;
      }

      try {
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
                <h2 style="color: #00FF9C; margin-bottom: 20px;">// BOOK UPDATE</h2>
                <p style="margin-bottom: 16px;">
                  A new edition of <strong>LLMO: The Next SEO Revolution</strong> is out!
                </p>
                <p style="margin-bottom: 24px;">
                  Download the updated PDF or get the full version on Amazon.
                </p>
                <div style="margin: 30px 0;">
                  <a
                    href="${downloadUrl}/download-book"
                    style="display: inline-block; background-color: #00FF9C; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-right: 12px; margin-bottom: 12px;"
                  >
                    Download Updated PDF
                  </a>
                  <a
                    href="${amazonUrl}"
                    style="display: inline-block; background-color: transparent; color: #FFD700; border: 2px solid #FFD700; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-bottom: 12px;"
                  >
                    Get Full Edition on Amazon
                  </a>
                </div>
                <p style="margin-top: 30px; color: #888; font-size: 12px;">
                  // SYSTEM MESSAGE: Book reminder sent successfully.
                </p>
              </div>
            </body>
          </html>
        `;

        // Send email via Resend
        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: process.env.EMAIL_FROM || "LLMO Directory <no-reply@llmo.directory>",
          to: email,
          subject: "New Edition: LLMO: The Next SEO Revolution",
          html: emailHtml,
        });

        if (emailError) {
          console.error(`[v0] ✗ Failed to send reminder to ${email}:`, emailError);
          failCount++;
          results.push({ email, status: "failed", error: emailError.message });
          continue;
        }

        // Update last_reminder_sent timestamp
        await supabaseAdmin
          .from("downloads")
          .update({
            last_reminder_sent: new Date().toISOString(),
          })
          .eq("id", download.id);

        // Log email in email_logs
        await supabaseAdmin.from("email_logs").insert({
          recipient_email: email,
          subject: "New Edition: LLMO: The Next SEO Revolution",
          status: "sent",
          message_id: emailResult?.id || null,
        });

        console.log(`[v0] ✓ Reminder sent successfully to ${email}`);
        successCount++;
        results.push({ email, status: "success" });
      } catch (emailError) {
        console.error(`[v0] ✗ Exception sending email to ${email}:`, emailError);
        failCount++;
        results.push({
          email,
          status: "failed",
          error: emailError instanceof Error ? emailError.message : "Unknown error",
        });
      }
    }

    console.log(
      `[v0] Book reminder job complete: ${successCount} sent, ${failCount} failed`,
    );

    return NextResponse.json({
      message: "Book reminder emails processed",
      total: downloads.length,
      success: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    console.error("[v0] Book reminder cron job error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

