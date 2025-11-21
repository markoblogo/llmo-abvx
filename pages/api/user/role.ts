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
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    // If no session, return user role (not admin)
    if (!session?.user) {
      return res.status(200).json({ 
        role: "user", 
        isAdmin: false, 
        adminLevel: "none" 
      });
    }

    // Use checkAdmin to get admin status and level
    const adminCheck = await checkAdmin(session);

    // Get profile role from Supabase
    const userId = (session.user as any)?.id;
    const userEmail = session.user.email;

    let profile = null;
    if (userEmail) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("email", userEmail)
        .maybeSingle();
      profile = data;
    }

    // If not found by email, try by id
    if (!profile && userId) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      profile = data;
    }

    return res.status(200).json({ 
      role: profile?.role ?? "user",
      isAdmin: adminCheck.isAdmin,
      adminLevel: adminCheck.adminLevel,
    });
  } catch (error: any) {
    console.error("[user/role] Error:", error);
    // On error, default to user role
    return res.status(200).json({ 
      role: "user", 
      isAdmin: false, 
      adminLevel: "none" 
    });
  }
}

