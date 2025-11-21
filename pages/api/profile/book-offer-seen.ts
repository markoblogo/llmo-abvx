import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";

// Use service role key for server-side operations to bypass RLS
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

// Helper function to get Supabase user ID from NextAuth session
async function getSupabaseUserId(session: any): Promise<string | null> {
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

  return supabaseUserId;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const supabaseUserId = await getSupabaseUserId(session);

    if (!supabaseUserId) {
      return res.status(404).json({ error: "User profile not found" });
    }

    // GET: Check book_offer_seen status
    if (req.method === "GET") {
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from("profiles")
        .select("book_offer_seen")
        .eq("id", supabaseUserId)
        .maybeSingle();

      if (fetchError) {
        console.error("[book-offer-seen] Error fetching profile:", fetchError);
        return res.status(500).json({ error: "Failed to fetch profile" });
      }

      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      return res.status(200).json({
        book_offer_seen: profile.book_offer_seen || false,
      });
    }

    // POST: Update book_offer_seen to true
    if (req.method === "POST") {
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ book_offer_seen: true })
        .eq("id", supabaseUserId);

      if (updateError) {
        console.error("[book-offer-seen] Error updating profile:", updateError);
        return res.status(500).json({ error: "Failed to update profile" });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("[book-offer-seen] Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

