import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { checkAdmin } from "@/lib/auth";

/**
 * Test endpoint to verify admin access
 * GET /api/admin/test
 * Returns admin status and user info
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          authenticated: false,
          isAdmin: false,
          error: "Not authenticated",
        },
        { status: 401 },
      );
    }

    const isAdminUser = await checkAdmin(session);

    return NextResponse.json({
      authenticated: true,
      isAdmin: isAdminUser,
      user: {
        email: session.user.email,
        id: (session.user as any)?.id || null,
        name: session.user.name || null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Admin test error:", error);
    return NextResponse.json(
      {
        authenticated: false,
        isAdmin: false,
        error: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}





