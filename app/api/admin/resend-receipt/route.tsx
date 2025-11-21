import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { checkAdmin } from "@/lib/auth"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

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

    // Send receipt email
    const { error } = await resend.emails.send({
      from: "LLMO Directory <no-reply@llmo.directory>",
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
