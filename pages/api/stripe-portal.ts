import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { stripe } from "@/lib/stripeClient";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = (session.user as any)?.id || session.user.email;
    if (!userId) {
      return res.status(400).json({ error: "User ID not found" });
    }

    // Get user's Stripe customer ID from Supabase subscriptions
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    let customerId = subscription?.stripe_customer_id;

    // If no customer ID, check Stripe for existing customer by email
    if (!customerId && session.user.email) {
      const existingCustomers = await stripe.customers.list({
        email: session.user.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
        // Update subscription with customer ID
        await supabase
          .from("subscriptions")
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
          });
      }
    }

    if (!customerId) {
      return res.status(400).json({ error: "No Stripe customer found. Please make a payment first." });
    }

    // Create customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
    });

    res.status(200).json({ url: portalSession.url });
  } catch (error: any) {
    console.error("Stripe portal error:", error);
    res.status(500).json({ error: error.message || "Failed to create portal session" });
  }
}

