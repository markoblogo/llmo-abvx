import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { checkAdmin } from "@/lib/checkAdmin";
import { stripe } from "@/lib/stripeClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
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

    // Get Stripe balance
    const balance = await stripe.balance.retrieve();

    // Calculate available and pending amounts
    const available = balance.available[0]?.amount ? balance.available[0].amount / 100 : 0;
    const pending = balance.pending[0]?.amount ? balance.pending[0].amount / 100 : 0;

    // Get last payout
    let lastPayout: string | null = null;
    try {
      const payouts = await stripe.payouts.list({ limit: 1 });
      if (payouts.data.length > 0) {
        lastPayout = new Date(payouts.data[0].created * 1000).toISOString();
      }
    } catch (err) {
      console.error("Error fetching payouts:", err);
    }

    // Calculate total revenue YTD (Year to Date)
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1); // January 1st of current year
    const yearStartTimestamp = Math.floor(yearStart.getTime() / 1000);

    let totalRevenueYTD = 0;
    try {
      const charges = await stripe.charges.list({
        limit: 100,
        created: {
          gte: yearStartTimestamp,
        },
      });

      // Get all charges for the year (paginate if needed)
      let allCharges = charges.data;
      let hasMore = charges.has_more;
      let lastChargeId = charges.data[charges.data.length - 1]?.id;

      while (hasMore && charges.data.length > 0) {
        const nextPage = await stripe.charges.list({
          limit: 100,
          created: {
            gte: yearStartTimestamp,
          },
          starting_after: lastChargeId,
        });
        allCharges = [...allCharges, ...nextPage.data];
        hasMore = nextPage.has_more;
        lastChargeId = nextPage.data[nextPage.data.length - 1]?.id;
      }

      totalRevenueYTD = allCharges
        .filter((charge) => charge.paid && charge.status === "succeeded")
        .reduce((sum, charge) => sum + charge.amount / 100, 0);
    } catch (err) {
      console.error("Error calculating YTD revenue:", err);
    }

    return res.status(200).json({
      success: true,
      available,
      pending,
      totalRevenueYTD,
      lastPayout,
      currency: balance.available[0]?.currency || "usd",
    });
  } catch (error: any) {
    console.error("[stripe-summary] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message || "Unknown error",
    });
  }
}




