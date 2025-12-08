import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { checkAdmin } from "@/lib/auth"
import { getResendClient } from "@/lib/resendClient"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { isAdmin } = await checkAdmin(session)
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Get email from address
    const emailFrom = process.env.EMAIL_FROM;
    if (!emailFrom) {
      console.error("[admin/resend-receipt] EMAIL_FROM is not configured");
      return NextResponse.json({ error: "EMAIL_FROM is not configured" }, { status: 500 });
    }

    // Send receipt email
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: "Your LLMO Directory Payment Receipt",
      html: `
        <body style="font-family: 'IBM Plex Mono', monospace; background-color: #000; color: #00FF9C; padding: 20px;">
          <h2>// PAYMENT RECEIPT</h2>
          <p>Thank you for your payment to LLMO Directory.</p>
          <p>Your Pro subscription is now active.</p>
          <p style="margin-top: 20px;">// SYSTEM MESSAGE: Receipt generated successfully.</p>
        </body>
      `,
    })

    if (error) {
      console.error("[v0] Error sending receipt:", error)
      return NextResponse.json({ error: "Failed to send receipt" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in resend-receipt API:", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
