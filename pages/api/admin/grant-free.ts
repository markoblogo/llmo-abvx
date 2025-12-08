import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { checkAdmin } from "@/lib/checkAdmin";
import { createClient } from "@supabase/supabase-js";

// Create Supabase admin client
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

    const isAdmin = await checkAdmin(session);
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const { userId } = req.body as { userId: string };

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Check if subscription exists
    const { data: existingSubscription, error: fetchError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const now = new Date();
    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    if (existingSubscription) {
      // Update existing subscription
      const { error: updateError } = await supabaseAdmin
        .from("subscriptions")
        .update({
          plan: "free",
          expiry_date: oneYearFromNow.toISOString(),
          links_allowed: 999, // Unlimited for free grant
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("[grant-free] Error updating subscription:", updateError);
        return res.status(500).json({
          error: "Failed to grant free year",
          details: updateError.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Free year granted successfully (subscription updated)",
        userId,
        expiryDate: oneYearFromNow.toISOString(),
      });
    } else {
      // Create new subscription
      const { error: createError } = await supabaseAdmin.from("subscriptions").insert({
        user_id: userId,
        plan: "free",
        expiry_date: oneYearFromNow.toISOString(),
        links_allowed: 999, // Unlimited for free grant
        start_date: now.toISOString(),
      });

      if (createError) {
        console.error("[grant-free] Error creating subscription:", createError);
        return res.status(500).json({
          error: "Failed to grant free year",
          details: createError.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Free year granted successfully (subscription created)",
        userId,
        expiryDate: oneYearFromNow.toISOString(),
      });
    }
  } catch (error: any) {
    console.error("[grant-free] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message || "Unknown error",
    });
  }
}





