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

    // Get current subscriptions for this user
    const { data: existingSubscriptions, error: fetchError } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, source, expiry_date")
      .eq("user_id", supabaseUserId);

    if (fetchError) {
      console.error("[trial/pro] Error fetching subscriptions:", fetchError);
      return res.status(500).json({ error: "Failed to start Pro trial" });
    }

    const now = new Date();
    const activeSubscriptions = (existingSubscriptions || []).filter((sub) => {
      if (!sub.expiry_date) return false;
      return new Date(sub.expiry_date) >= now;
    });

    // Check if user already has an active paid subscription (not trial)
    const hasActivePaidSubscription = activeSubscriptions.some(
      (sub) =>
        (sub.plan === "pro" || sub.plan === "agency") &&
        sub.source !== "trial" &&
        new Date(sub.expiry_date) >= now
    );

    if (hasActivePaidSubscription) {
      return res.status(400).json({ error: "You already have an active paid subscription" });
    }

    // Check if user already has an active Pro trial
    const hasActiveProTrial = activeSubscriptions.some(
      (sub) => sub.plan === "pro" && sub.source === "trial" && new Date(sub.expiry_date) >= now
    );

    if (hasActiveProTrial) {
      return res.status(400).json({ error: "You have already used a Pro trial" });
    }

    // Calculate expiry date: now + 7 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    expiryDate.setHours(23, 59, 59, 999); // End of day

    // Create or update subscription with trial
    const { data: subscription, error: upsertError } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: supabaseUserId,
          plan: "pro",
          source: "trial",
          links_allowed: 999, // Same as paid Pro plan
          auto_llms: false, // Auto llms.txt is not included in trial
          start_date: new Date().toISOString(),
          expiry_date: expiryDate.toISOString(),
          payment_status: "active", // Trial is considered active
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("[trial/pro] Error creating trial subscription:", upsertError);
      return res.status(500).json({ error: "Failed to start Pro trial" });
    }

    return res.status(200).json({
      success: true,
      plan: "pro",
      source: "trial",
      expiryDate: expiryDate.toISOString(),
    });
  } catch (error: any) {
    console.error("[trial/pro] Error:", error);
    return res.status(500).json({ error: "Failed to start Pro trial" });
  }
}

/**
 * CHECKLIST - Test scenarios:
 *
 * 1. Unauthenticated user → clicks "Start 7-day free trial" → redirects to /login?next=/pricing&trial=pro
 *
 * 2. Authenticated user without subscription → clicks → creates subscription
 *    (plan = 'pro', source = 'trial', expiry +7 days) → redirects to /dashboard
 *
 * 3. User with active Pro/Agency subscription → clicks → receives toast:
 *    "You already have an active paid subscription"
 *
 * 4. User who already used trial (active) → clicks → receives toast:
 *    "You have already used a Pro trial"
 *
 * 5. User with expired trial → can start new trial (trial is checked only if active)
 */

