import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { checkAdmin } from "@/lib/checkAdmin";
import { supabase } from "@/lib/supabaseClient";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const isAdmin = await checkAdmin(session);
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const { userId, email } = req.body;

    const targetEmail = email || "";
    if (!targetEmail) {
      return res.status(400).json({ error: "Email required" });
    }

    // Send reminder email about LLMO Quick Start guide update
    const emailResult = await resend.emails.send({
      from: process.env.EMAIL_FROM || "LLMO Directory <noreply@llmo.abvx.xyz>",
      to: targetEmail,
      subject: "Your LLMO Quick Start guide has been updated",
      html: `
        <html>
          <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Your LLMO Quick Start guide has been updated</h1>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Hi there,
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              It's been a while since you downloaded the LLMO Quick Start guide. We've made significant updates with new strategies, tools, and insights to help you make your content visible in the age of AI.
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Download the latest version to stay up-to-date:
            </p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/download-book" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Download Latest Version
            </a>
            <p style="color: #999; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              Best regards,<br />
              The LLMO Directory Team
            </p>
          </body>
        </html>
      `,
      text: `Your LLMO Quick Start guide has been updated\n\nIt's been a while since you downloaded the guide. We've made significant updates with new strategies, tools, and insights.\n\nDownload the latest version: ${process.env.NEXT_PUBLIC_SITE_URL}/download-book\n\nBest regards,\nThe LLMO Directory Team`,
    });

    // Log email in downloads table (if userId provided)
    if (userId) {
      await supabase.from("downloads").insert({
        user_id: userId,
        email: targetEmail,
        downloaded_at: new Date().toISOString(),
        reminder_sent: true,
      });
    }

    return res.status(200).json({
      success: true,
      messageId: emailResult.data?.id || null,
      message: "Reminder email sent successfully",
    });
  } catch (error: any) {
    console.error("Send reminder error:", error);
    return res.status(500).json({ error: error.message || "Failed to send reminder" });
  }
}




