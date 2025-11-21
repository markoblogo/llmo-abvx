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

    // Fetch user's links
    const { data: links, error: linksError } = await supabaseAdmin
      .from("links")
      .select("id, url, is_featured, featured_until, llms_file_status, llms_last_update, status")
      .eq("user_id", supabaseUserId);

    if (linksError) {
      throw linksError;
    }

    // Fetch subscription
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", supabaseUserId)
      .maybeSingle();

    // Fetch metadata suggestions count
    const { count: metadataCount } = await supabaseAdmin
      .from("metadata_suggestions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", supabaseUserId)
      .eq("payment_status", "paid");

    // Calculate metrics
    const totalLinks = links?.length || 0;
    const approvedLinks = links?.filter((l) => l.status === "approved" || l.status === "active").length || 0;
    const featuredLinks = links?.filter(
      (l) => l.is_featured && l.featured_until && new Date(l.featured_until) > new Date(),
    ).length || 0;
    const llmsUpdated = links?.filter((l) => l.llms_file_status === "updated").length || 0;
    const llmsOutdated = links?.filter((l) => {
      if (!l.llms_last_update) return true;
      const daysSinceUpdate = (Date.now() - new Date(l.llms_last_update).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 90;
    }).length || 0;

    // Get latest analyzer result from analyzer_logs
    // Fetch the most recent analysis for this user
    const { data: latestAnalyzerLog } = await supabaseAdmin
      .from("analyzer_logs")
      .select("score, created_at")
      .eq("user_id", supabaseUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestAnalyzerScore: number | null = latestAnalyzerLog?.score ?? null;
    const latestAnalyzerDate: string | null = latestAnalyzerLog?.created_at ?? null;

    // Get total analyzer runs count (all time)
    // Count all analyzer_logs entries for this user
    const { count: analyzerProRuns } = await supabaseAdmin
      .from("analyzer_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", supabaseUserId);

    // Get agency members if agency plan
    let teamMembers: any[] = [];
    if (subscription?.plan === "agency") {
      const { data: members } = await supabaseAdmin
        .from("agency_members")
        .select("*, profiles:user_id(email, name)")
        .eq("agency_owner_id", supabaseUserId);
      teamMembers = members || [];
    }

    return res.status(200).json({
      totalLinks,
      approvedLinks,
      featuredLinks,
      llmsUpdated,
      llmsOutdated,
      metadataGenerations: metadataCount || 0,
      analyzerProRuns: analyzerProRuns || 0,
      latestAnalyzerScore,
      latestAnalyzerDate,
      subscription: subscription
        ? {
            plan: subscription.plan,
            expiryDate: subscription.expiry_date,
            features: subscription.features || {},
            autoLlms: subscription.auto_llms || false,
          }
        : null,
      teamMembers: teamMembers.length,
    });
  } catch (error: any) {
    console.error("[user/stats] Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}




