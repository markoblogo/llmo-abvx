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

    // Get pagination parameters
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Fetch analyzer logs for the user
    const { data: logs, error: logsError } = await supabaseAdmin
      .from("analyzer_logs")
      .select("id, link_id, url, score, recommendations, factors, visibility, created_at")
      .eq("user_id", supabaseUserId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (logsError) {
      console.error("[analyzer/logs] Error fetching logs:", logsError);
      return res.status(500).json({ error: "Failed to fetch analyzer logs" });
    }

    return res.status(200).json({
      logs: logs || [],
      total: logs?.length || 0,
    });
  } catch (error: any) {
    console.error("[analyzer/logs] Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}




