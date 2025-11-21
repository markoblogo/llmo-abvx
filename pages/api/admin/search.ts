import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { checkAdmin } from "@/lib/checkAdmin";
import { supabase } from "@/lib/supabaseClient";
import { stripe } from "@/lib/stripeClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const isAdmin = await checkAdmin(session);
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const { q } = req.query;

    if (!q || typeof q !== "string" || q.trim().length === 0) {
      return res.status(400).json({ error: "Missing search query" });
    }

    const searchTerm = q.trim();

    // Search users (profiles)
    const { data: usersData, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
      .limit(5);

    // Search links
    const { data: linksData, error: linksError } = await supabase
      .from("links")
      .select("id, url, title, category, user_id, created_at, status")
      .or(`url.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
      .limit(5);

    // Get owner emails for links
    const enrichedLinks = await Promise.all(
      (linksData || []).map(async (link) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", link.user_id)
          .single();

        return {
          ...link,
          owner_email: profile?.email || "Unknown",
        };
      })
    );

    // Search payments from Stripe charges
    let paymentsData: any[] = [];
    try {
      const charges = await stripe.charges.list({
        limit: 100,
      });

      const matchingCharges = charges.data
        .filter((charge) => {
          const chargeId = charge.id.toLowerCase();
          const customerId = charge.customer?.toString().toLowerCase() || "";
          const searchLower = searchTerm.toLowerCase();
          return chargeId.includes(searchLower) || customerId.includes(searchLower);
        })
        .slice(0, 5)
        .map((charge) => ({
          id: charge.id,
          amount: charge.amount / 100, // Convert from cents
          created_at: new Date(charge.created * 1000).toISOString(),
          stripe_id: charge.id,
          currency: charge.currency.toUpperCase(),
          customer_email: charge.billing_details?.email || null,
        }));

      paymentsData = matchingCharges;
    } catch (stripeError) {
      console.error("Error searching Stripe charges:", stripeError);
      // Continue without payments if Stripe fails
    }

    // Search subscriptions (as additional payment context)
    const { data: subscriptionsData } = await supabase
      .from("subscriptions")
      .select("id, user_id, stripe_customer_id, stripe_subscription_id, expiry_date, plan")
      .or(`stripe_customer_id.ilike.%${searchTerm}%,stripe_subscription_id.ilike.%${searchTerm}%`)
      .limit(5);

    // Combine payments with subscription data
    const allPayments = [...paymentsData];
    if (subscriptionsData) {
      subscriptionsData.forEach((sub) => {
        if (sub.stripe_customer_id && !allPayments.find((p) => p.stripe_id === sub.stripe_customer_id)) {
          allPayments.push({
            id: sub.id,
            amount: null,
            created_at: null,
            stripe_id: sub.stripe_customer_id,
            type: "subscription",
            plan: sub.plan,
          });
        }
      });
    }

    res.status(200).json({
      users: usersData || [],
      links: enrichedLinks,
      payments: allPayments.slice(0, 5),
    });
  } catch (error: any) {
    console.error("Admin search error:", error);
    res.status(500).json({ error: error.message || "Failed to perform search" });
  }
}

