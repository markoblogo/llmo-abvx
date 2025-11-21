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
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user_id from Supabase - try to find by email from NextAuth session
    let supabaseUserId: string | null = null;
    
    // First, try to get user_id from session (if it's already a Supabase UUID)
    const sessionUserId = (session.user as any)?.id;
    
    // If session.user.id looks like a UUID, use it directly
    // Otherwise, find user in Supabase by email
    if (sessionUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionUserId)) {
      supabaseUserId = sessionUserId;
    } else if (session.user?.email) {
      // Find user in Supabase by email
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", session.user.email)
        .maybeSingle();
      
      if (profile?.id) {
        supabaseUserId = profile.id;
      }
    }

    if (!supabaseUserId) {
      return res.status(400).json({ error: "User ID not found" });
    }

    const { memberId } = req.body as { memberId: string };

    if (!memberId) {
      return res.status(400).json({ error: "Member ID is required" });
    }

    // Check if user has agency subscription
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan")
      .eq("user_id", supabaseUserId)
      .maybeSingle();

    if (subscription?.plan !== "agency") {
      return res.status(403).json({ error: "Agency plan required" });
    }

    // Verify that the member belongs to this agency owner before deleting
    const { data: member } = await supabaseAdmin
      .from("agency_members")
      .select("id, agency_owner_id")
      .eq("id", memberId)
      .maybeSingle();

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    if (member.agency_owner_id !== supabaseUserId) {
      return res.status(403).json({ error: "Not authorized to remove this member" });
    }

    // Remove member by id
    const { error: deleteError } = await supabaseAdmin
      .from("agency_members")
      .delete()
      .eq("id", memberId);

    if (deleteError) {
      throw deleteError;
    }

    return res.status(200).json({ success: true, message: "Member removed successfully" });
  } catch (error: any) {
    console.error("[agency/member] Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}




