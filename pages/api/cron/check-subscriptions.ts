import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { getResendClient } from "@/lib/resendClient";

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

interface EmailResult {
  email: string;
  subject: string;
  status: "success" | "failed";
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.authorization;
  const isCronJob = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (req.method !== "GET" && !isCronJob) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const startTime = Date.now();
  console.log("[check-subscriptions] Starting daily subscription and llms.txt checks...");

  const resend = getResendClient();

  const emailResults: EmailResult[] = [];
  let subscriptionEmailsSent = 0;
  let subscriptionEmailsFailed = 0;
  let llmsEmailsSent = 0;
  let llmsEmailsFailed = 0;
  let renewalEmailsSent = 0;
  let renewalEmailsFailed = 0;

  try {
    // 1. Check subscriptions expiring in <7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const now = new Date();

    // Find subscriptions expiring in the next 7 days (but not already expired)
    const { data: expiringSubscriptions, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select(`
        id,
        user_id,
        plan,
        expiry_date,
        stripe_customer_id,
        stripe_subscription_id,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .gte("expiry_date", now.toISOString())
      .lt("expiry_date", sevenDaysFromNow.toISOString())
      .order("expiry_date", { ascending: true });

    if (subscriptionError) {
      console.error("[check-subscriptions] Error fetching expiring subscriptions:", subscriptionError);
    } else {
      console.log(`[check-subscriptions] Found ${expiringSubscriptions?.length || 0} subscriptions expiring in <7 days`);

      if (expiringSubscriptions && expiringSubscriptions.length > 0) {
        for (const subscription of expiringSubscriptions) {
          const profile = subscription.profiles as any;
          const userEmail = profile?.email;
          const userName = profile?.full_name || userEmail?.split("@")[0] || "there";
          const daysUntilExpiry = Math.ceil(
            (new Date(subscription.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (!userEmail) {
            console.warn(`[check-subscriptions] No email found for subscription ${subscription.id}`);
            continue;
          }

          try {
            let subject = "";
            let htmlContent = "";

            if (subscription.plan === "free") {
              // Free trial ending
              subject = "Your trial is ending soon — renew for $1/year";
              htmlContent = `
                <html>
                  <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Your trial is ending soon</h1>
                    <p style="color: #666; font-size: 16px; line-height: 1.5;">
                      Hi ${userName},
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.5;">
                      Your free trial ends in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}. Renew now for just <strong>€1/year</strong> to keep your links active and maintain AI visibility.
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.5;">
                      Renew your subscription:
                    </p>
                    <a href="${siteUrl}/dashboard" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                      Renew Now — €1/year
                    </a>
                    <p style="color: #999; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                      Best regards,<br />
                      The LLMO Directory Team
                    </p>
                  </body>
                </html>
              `;
            } else {
              // Pro subscription expiring
              subject = "Your subscription is expiring soon — renew now";
              htmlContent = `
                <html>
                  <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Subscription expiring soon</h1>
                    <p style="color: #666; font-size: 16px; line-height: 1.5;">
                      Hi ${userName},
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.5;">
                      Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}. Renew now to keep your links active and maintain AI visibility.
                    </p>
                    <a href="${siteUrl}/dashboard" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                      Renew Subscription
                    </a>
                    <p style="color: #999; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                      Best regards,<br />
                      The LLMO Directory Team
                    </p>
                  </body>
                </html>
              `;
            }

            const emailFrom = process.env.EMAIL_FROM;
            if (!emailFrom) {
              console.error("[check-subscriptions] EMAIL_FROM is not configured");
              subscriptionEmailsFailed++;
              emailResults.push({
                email: userEmail,
                subject: subject,
                status: "failed",
                error: "EMAIL_FROM is not configured",
              });
              continue;
            }

            const emailResult = await resend.emails.send({
              from: emailFrom,
              to: userEmail,
              subject: subject,
              html: htmlContent,
            });

            subscriptionEmailsSent++;
            emailResults.push({
              email: userEmail,
              subject: subject,
              status: "success",
            });
            console.log(`[check-subscriptions] ✓ Sent subscription reminder to ${userEmail}`);
          } catch (error: any) {
            subscriptionEmailsFailed++;
            emailResults.push({
              email: userEmail,
              subject: "Subscription reminder",
              status: "failed",
              error: error.message || "Unknown error",
            });
            console.error(`[check-subscriptions] ✗ Failed to send subscription reminder to ${userEmail}:`, error.message);
          }
        }
      }
    }

    // 2. Check links where llms_last_update is older than 80 days or null
    const eightyDaysAgo = new Date();
    eightyDaysAgo.setDate(eightyDaysAgo.getDate() - 80);

    // Get links with null llms_last_update
    const { data: linksWithoutUpdate } = await supabaseAdmin
      .from("links")
      .select(`
        id,
        url,
        title,
        llms_last_update,
        user_id,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .is("llms_last_update", null)
      .eq("status", "approved");

    // Get links with llms_last_update older than 80 days
    const { data: linksWithOldUpdate, error: linksError } = await supabaseAdmin
      .from("links")
      .select(`
        id,
        url,
        title,
        llms_last_update,
        user_id,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .lt("llms_last_update", eightyDaysAgo.toISOString())
      .eq("status", "approved");

    // Combine both results
    const outdatedLinks = [
      ...(linksWithoutUpdate || []),
      ...(linksWithOldUpdate || []),
    ];

    if (linksError) {
      console.error("[check-subscriptions] Error fetching outdated links:", linksError);
    } else {
      // Group links by user to send one email per user
      const linksByUser = new Map<string, Array<{ id: string; url: string; title: string | null }>>();

      if (outdatedLinks && outdatedLinks.length > 0) {
        for (const link of outdatedLinks) {
          const profile = link.profiles as any;
          const userEmail = profile?.email;

          if (!userEmail) {
            console.warn(`[check-subscriptions] No email found for link ${link.id}`);
            continue;
          }

          if (!linksByUser.has(userEmail)) {
            linksByUser.set(userEmail, []);
          }

          linksByUser.get(userEmail)!.push({
            id: link.id,
            url: link.url,
            title: link.title || link.url,
          });
        }

        console.log(`[check-subscriptions] Found ${linksByUser.size} users with outdated llms.txt files`);

        // Send one email per user with all their outdated links
        for (const [userEmail, links] of linksByUser.entries()) {
          const profile = outdatedLinks.find((l: any) => l.profiles?.email === userEmail)?.profiles as any;
          const userName = profile?.full_name || userEmail.split("@")[0] || "there";

          try {
            const subject = "Your llms.txt file needs an update";
            const linksList = links
              .map(
                (link) => `
                  <li style="margin-bottom: 10px;">
                    <strong>${link.title}</strong><br />
                    <a href="${link.url}" style="color: #10b981; text-decoration: none;">${link.url}</a>
                  </li>
                `
              )
              .join("");

            const htmlContent = `
              <html>
                <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Your llms.txt file needs an update</h1>
                  <p style="color: #666; font-size: 16px; line-height: 1.5;">
                    Hi ${userName},
                  </p>
                  <p style="color: #666; font-size: 16px; line-height: 1.5;">
                    Some of your links have llms.txt files that haven't been updated in over 80 days. Keeping your llms.txt files up-to-date helps maintain AI visibility and ensures your content stays discoverable.
                  </p>
                  <p style="color: #666; font-size: 16px; line-height: 1.5;">
                    <strong>Links needing updates (${links.length}):</strong>
                  </p>
                  <ul style="color: #666; font-size: 16px; line-height: 1.8; padding-left: 20px;">
                    ${linksList}
                  </ul>
                  <a href="${siteUrl}/dashboard" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                    Update llms.txt Files
                  </a>
                  <p style="color: #999; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                    Best regards,<br />
                    The LLMO Directory Team
                  </p>
                </body>
              </html>
            `;

            const emailFrom = process.env.EMAIL_FROM;
            if (!emailFrom) {
              console.error("[check-subscriptions] EMAIL_FROM is not configured");
              llmsEmailsFailed++;
              emailResults.push({
                email: userEmail,
                subject: subject,
                status: "failed",
                error: "EMAIL_FROM is not configured",
              });
              continue;
            }

            const emailResult = await resend.emails.send({
              from: emailFrom,
              to: userEmail,
              subject: subject,
              html: htmlContent,
            });

            llmsEmailsSent++;
            emailResults.push({
              email: userEmail,
              subject: subject,
              status: "success",
            });
            console.log(`[check-subscriptions] ✓ Sent llms.txt update reminder to ${userEmail} (${links.length} links)`);
          } catch (error: any) {
            llmsEmailsFailed++;
            emailResults.push({
              email: userEmail,
              subject: "llms.txt update reminder",
              status: "failed",
              error: error.message || "Unknown error",
            });
            console.error(`[check-subscriptions] ✗ Failed to send llms.txt reminder to ${userEmail}:`, error.message);
          }
        }
      }
    }

    // 3. Check for recently renewed subscriptions (renewed in last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: renewedSubscriptions, error: renewedError } = await supabaseAdmin
      .from("subscriptions")
      .select(`
        id,
        user_id,
        plan,
        expiry_date,
        updated_at,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .gte("updated_at", yesterday.toISOString())
      .eq("plan", "pro");

    if (!renewedError && renewedSubscriptions && renewedSubscriptions.length > 0) {
      // Only send if subscription was extended (expiry_date is in the future and updated recently)
      const actuallyRenewed = renewedSubscriptions.filter((sub) => new Date(sub.expiry_date) > now);

      if (actuallyRenewed.length > 0) {
        console.log(`[check-subscriptions] Found ${actuallyRenewed.length} recently renewed subscriptions`);

        for (const subscription of actuallyRenewed) {
          const profile = subscription.profiles as any;
          const userEmail = profile?.email;
          const userName = profile?.full_name || userEmail?.split("@")[0] || "there";

          if (!userEmail) continue;

          try {
            const subject = "Thank you for renewing your subscription";
            const htmlContent = `
              <html>
                <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Thank you for renewing!</h1>
                  <p style="color: #666; font-size: 16px; line-height: 1.5;">
                    Hi ${userName},
                  </p>
                  <p style="color: #666; font-size: 16px; line-height: 1.5;">
                    Thank you for renewing your subscription! Your links will remain active and visible to AI systems.
                  </p>
                  <p style="color: #666; font-size: 16px; line-height: 1.5;">
                    Your subscription is now active until ${new Date(subscription.expiry_date).toLocaleDateString()}.
                  </p>
                  <a href="${siteUrl}/dashboard" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                    View Dashboard
                  </a>
                  <p style="color: #999; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                    Best regards,<br />
                    The LLMO Directory Team
                  </p>
                </body>
              </html>
            `;

            const emailFrom = process.env.EMAIL_FROM;
            if (!emailFrom) {
              console.error("[check-subscriptions] EMAIL_FROM is not configured");
              renewalEmailsFailed++;
              emailResults.push({
                email: userEmail,
                subject: subject,
                status: "failed",
                error: "EMAIL_FROM is not configured",
              });
              continue;
            }

            await resend.emails.send({
              from: emailFrom,
              to: userEmail,
              subject: subject,
              html: htmlContent,
            });

            renewalEmailsSent++;
            emailResults.push({
              email: userEmail,
              subject: subject,
              status: "success",
            });
            console.log(`[check-subscriptions] ✓ Sent renewal confirmation to ${userEmail}`);
          } catch (error: any) {
            renewalEmailsFailed++;
            emailResults.push({
              email: userEmail,
              subject: "Thank you for renewing your subscription",
              status: "failed",
              error: error.message || "Unknown error",
            });
            console.error(`[check-subscriptions] ✗ Failed to send renewal confirmation to ${userEmail}:`, error.message);
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    const totalSent = subscriptionEmailsSent + llmsEmailsSent + renewalEmailsSent;
    const totalFailed = subscriptionEmailsFailed + llmsEmailsFailed + renewalEmailsFailed;

    console.log(`[check-subscriptions] ✓ Completed in ${duration}ms`);
    console.log(`[check-subscriptions] Summary:`);
    console.log(`  • Subscription reminders: ${subscriptionEmailsSent} sent, ${subscriptionEmailsFailed} failed`);
    console.log(`  • llms.txt reminders: ${llmsEmailsSent} sent, ${llmsEmailsFailed} failed`);
    console.log(`  • Renewal confirmations: ${renewalEmailsSent} sent, ${renewalEmailsFailed} failed`);
    console.log(`  • Total: ${totalSent} sent, ${totalFailed} failed`);

    return res.status(200).json({
      success: true,
      summary: {
        subscriptionReminders: {
          sent: subscriptionEmailsSent,
          failed: subscriptionEmailsFailed,
        },
        llmsReminders: {
          sent: llmsEmailsSent,
          failed: llmsEmailsFailed,
        },
        renewalConfirmations: {
          sent: renewalEmailsSent,
          failed: renewalEmailsFailed,
        },
        total: {
          sent: totalSent,
          failed: totalFailed,
        },
        duration: `${duration}ms`,
      },
      results: emailResults,
    });
  } catch (error: any) {
    console.error("[check-subscriptions] Unexpected error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message || "Unknown error",
    });
  }
}

