import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
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

    const userId = (session.user as any)?.id || session.user?.email;
    const { email } = req.body as { email: string };

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if user has agency subscription
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, agency_id")
      .eq("user_id", userId)
      .single();

    if (subscription?.plan !== "agency") {
      return res.status(403).json({ error: "Agency plan required" });
    }

    // Find user by email
    const { data: targetUser } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .single();

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser.id === userId) {
      return res.status(400).json({ error: "Cannot invite yourself" });
    }

    // Check if already a member
    const { data: existingMember } = await supabaseAdmin
      .from("agency_members")
      .select("id")
      .eq("agency_owner_id", userId)
      .eq("user_id", targetUser.id)
      .maybeSingle();

    if (existingMember) {
      return res.status(400).json({ error: "User is already a member" });
    }

    // Add member
    const { error: insertError } = await supabaseAdmin.from("agency_members").insert({
      agency_owner_id: userId,
      user_id: targetUser.id,
      role: "member",
    });

    if (insertError) {
      throw insertError;
    }

    return res.status(200).json({ success: true, message: "Member added successfully" });
  } catch (error: any) {
    console.error("[agency/invite] Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}




