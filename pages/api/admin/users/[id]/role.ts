import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { checkAdmin } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check super admin access
    const { adminLevel } = await checkAdmin(session);
    if (adminLevel !== "super") {
      return res.status(403).json({ error: "Forbidden: Super admin access required" });
    }

    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "User ID is required" });
    }

    const { adminLevel: newAdminLevel } = req.body as { adminLevel: "none" | "basic" | "super" };

    if (!["none", "basic", "super"].includes(newAdminLevel)) {
      return res.status(400).json({ error: "Invalid admin level. Must be 'none', 'basic', or 'super'" });
    }

    // Update admin_level and role
    const updates: { admin_level: string; role?: string } = {
      admin_level: newAdminLevel,
    };

    // Update role: 'admin' if level is not 'none', 'user' otherwise
    if (newAdminLevel !== "none") {
      updates.role = "admin";
    } else {
      updates.role = "user";
    }

    const { data, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[admin/users/[id]/role] Error updating role:", updateError);
      return res.status(500).json({ error: "Failed to update user role" });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: data.id,
        email: data.email,
        role: data.role,
        admin_level: data.admin_level,
      },
    });
  } catch (error: any) {
    console.error("[admin/users/[id]/role] Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}


