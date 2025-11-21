import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { createClient } from "@supabase/supabase-js"
import { isSuperAdmin, checkAdmin } from "@/lib/checkAdmin"

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

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only super-admin can promote users to admin
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ 
        error: "Forbidden: Only super-admin can promote users" 
      }, { status: 403 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Update user role to admin
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", userId)

    if (error) {
      console.error("[promote-user] Error promoting user:", error)
      return NextResponse.json({ error: "Failed to promote user" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: "User promoted to admin successfully"
    })
  } catch (error) {
    console.error("[promote-user] Error in promote-user API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
