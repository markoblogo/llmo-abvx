import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { checkAdmin } from "@/lib/checkAdmin";
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

    // Get Stripe balance
    const balance = await stripe.balance.retrieve();

    // Calculate available and pending amounts
    const available = balance.available[0]?.amount ? balance.available[0].amount / 100 : 0;
    const pending = balance.pending[0]?.amount ? balance.pending[0].amount / 100 : 0;

    // Get total revenue from all charges (approximation)
    let totalRevenue = 0;
    try {
      const charges = await stripe.charges.list({ limit: 100 });
      totalRevenue = charges.data.reduce((sum, charge) => {
        if (charge.paid) {
          return sum + charge.amount / 100;
        }
        return sum;
      }, 0);
    } catch (err) {
      console.error("Error fetching charges:", err);
    }

    // Get last payout
    let lastPayout = null;
    try {
      const payouts = await stripe.payouts.list({ limit: 1 });
      if (payouts.data.length > 0) {
        lastPayout = new Date(payouts.data[0].created * 1000).toISOString();
      }
    } catch (err) {
      console.error("Error fetching payouts:", err);
    }

    res.status(200).json({
      available,
      pending,
      totalRevenue,
      lastPayout,
      currency: balance.available[0]?.currency || "usd",
    });
  } catch (error: any) {
    console.error("Stripe balance error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch Stripe balance" });
  }
}

