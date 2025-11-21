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
  if (req.method !== "GET") {
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

    // Check if user has agency subscription
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan")
      .eq("user_id", supabaseUserId)
      .maybeSingle();

    if (subscription?.plan !== "agency") {
      return res.status(403).json({ error: "Agency plan required" });
    }

    // Fetch agency members with profile information
    const { data: members, error: membersError } = await supabaseAdmin
      .from("agency_members")
      .select(`
        id,
        user_id,
        role,
        created_at,
        profiles:user_id (
          id,
          email,
          full_name
        )
      `)
      .eq("agency_owner_id", supabaseUserId)
      .order("created_at", { ascending: false });

    if (membersError) {
      console.error("[agency/members] Error fetching members:", membersError);
      return res.status(500).json({ error: "Failed to fetch agency members" });
    }

    // Transform the data to a cleaner format
    const formattedMembers = (members || []).map((member: any) => ({
      id: member.id,
      userId: member.user_id,
      role: member.role,
      createdAt: member.created_at,
      email: member.profiles?.email || null,
      fullName: member.profiles?.full_name || null,
    }));

    return res.status(200).json({
      members: formattedMembers,
      total: formattedMembers.length,
    });
  } catch (error: any) {
    console.error("[agency/members] Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

