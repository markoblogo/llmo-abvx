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

    const { plan, durationMonths } = req.body as {
      plan: "pro" | "agency";
      durationMonths: number;
    };

    if (!["pro", "agency"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan. Must be 'pro' or 'agency'" });
    }

    if (!durationMonths || durationMonths < 1 || durationMonths > 12) {
      return res.status(400).json({ error: "Duration must be between 1 and 12 months" });
    }

    // Get existing subscription
    const { data: existingSubscription } = await supabaseAdmin
      .from("subscriptions")
      .select("expiry_date")
      .eq("user_id", id)
      .maybeSingle();

    // Calculate new expiry_date
    const now = new Date();
    const existingExpiry = existingSubscription?.expiry_date
      ? new Date(existingSubscription.expiry_date)
      : null;

    // Use GREATEST(NOW(), expiry_date) + durationMonths
    const baseDate = existingExpiry && existingExpiry > now ? existingExpiry : now;
    const newExpiryDate = new Date(baseDate);
    newExpiryDate.setMonth(newExpiryDate.getMonth() + durationMonths);

    // Upsert subscription
    const { data: subscription, error: upsertError } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: id,
          plan: plan,
          expiry_date: newExpiryDate.toISOString(),
          source: "gift",
          links_allowed: plan === "agency" ? 50 : 1,
          start_date: now.toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("[admin/users/[id]/gift-subscription] Error upserting subscription:", upsertError);
      return res.status(500).json({ error: "Failed to create gift subscription" });
    }

    return res.status(200).json({
      success: true,
      subscription: {
        id: subscription.id,
        user_id: subscription.user_id,
        plan: subscription.plan,
        expiry_date: subscription.expiry_date,
        source: subscription.source,
      },
    });
  } catch (error: any) {
    console.error("[admin/users/[id]/gift-subscription] Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

