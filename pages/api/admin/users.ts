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
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check admin access
    const { isAdmin } = await checkAdmin(session);
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    // Get query parameters
    const { q, limit = "50", offset = "0" } = req.query;

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // Build query for profiles
    let profilesQuery = supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, role, admin_level, created_at, last_login", { count: "exact" });

    // Search filter
    if (q && typeof q === "string" && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      profilesQuery = profilesQuery.or(`email.ilike.${searchTerm},full_name.ilike.${searchTerm}`);
    }

    // Order by created_at desc
    profilesQuery = profilesQuery.order("created_at", { ascending: false });

    // Pagination
    profilesQuery = profilesQuery.range(offsetNum, offsetNum + limitNum - 1);

    const { data: profiles, error: profilesError, count } = await profilesQuery;

    if (profilesError) {
      console.error("[admin/users] Error fetching profiles:", profilesError);
      throw profilesError;
    }

    // Get subscriptions for all users
    const userIds = (profiles || []).map((p) => p.id);
    let subscriptions: any[] = [];
    
    if (userIds.length > 0) {
      const { data: subsData } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id, plan, expiry_date")
        .in("user_id", userIds);
      subscriptions = subsData || [];
    }

    // Map subscriptions by user_id
    const subscriptionsMap = new Map(
      (subscriptions || []).map((sub) => [sub.user_id, { plan: sub.plan, expiry_date: sub.expiry_date }])
    );

    // Enrich profiles with subscription data
    const users = (profiles || []).map((profile) => {
      const subscription = subscriptionsMap.get(profile.id);
      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        admin_level: profile.admin_level || "none",
        created_at: profile.created_at,
        last_login: profile.last_login || null,
        plan: subscription?.plan || "free",
        expiry_date: subscription?.expiry_date || null,
      };
    });

    return res.status(200).json({
      users,
      total: count || 0,
    });
  } catch (error: any) {
    console.error("[admin/users] Error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch users" });
  }
}
