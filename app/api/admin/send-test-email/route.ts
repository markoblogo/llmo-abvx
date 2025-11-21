import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { checkAdmin } from "@/lib/auth"
import { sendTestEmail } from "@/lib/email"

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

    const result = await sendTestEmail(email)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in send-test-email API:", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
