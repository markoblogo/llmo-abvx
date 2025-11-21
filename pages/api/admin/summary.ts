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

    // Fetch all data in parallel
    const [
      usersResult,
      linksResult,
      subscriptionsResult,
      downloadsResult,
      analyzedLinks,
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("links").select("*", { count: "exact", head: true }),
      supabase.from("subscriptions").select("*"),
      supabase.from("downloads").select("*", { count: "exact", head: true }),
      supabase.from("links").select("*").eq("status", "approved"),
    ]);

    // Get links with llms.txt data
    const allLinks = await supabase.from("links").select("llms_file_status, llms_last_update, created_at");
    const linksWithLlms = allLinks.data || [];

    // Calculate llms.txt stats
    const now = new Date();
    const llmsUpdated = linksWithLlms.filter((link) => {
      if (!link.llms_last_update) return false;
      const lastUpdate = new Date(link.llms_last_update);
      const daysDiff = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff < 90;
    }).length;

    const llmsOutdated = linksWithLlms.filter((link) => {
      if (!link.llms_last_update) return true;
      const lastUpdate = new Date(link.llms_last_update);
      const daysDiff = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff >= 90;
    }).length;

    // Calculate subscription stats
    const subscriptions = subscriptionsResult.data || [];
    const activeSubs = subscriptions.filter(
      (sub) => new Date(sub.expiry_date) > now
    ).length;
    const expiredSubs = subscriptions.filter(
      (sub) => new Date(sub.expiry_date) <= now
    ).length;

    // Count paid links (links with active subscriptions)
    const paidLinksTotal = subscriptions.filter(
      (sub) => sub.plan === "pro" || (sub.plan === "free" && new Date(sub.expiry_date) > now)
    ).length;

    // Calculate total revenue from Stripe
    let totalRevenue = 0;
    try {
      const balance = await stripe.balance.retrieve();
      totalRevenue = balance.available[0].amount / 100; // Convert from cents
    } catch (err) {
      console.error("Error fetching Stripe balance:", err);
    }

    // Get last month's stats for trends (simplified - would need historical data)
    const summary = {
      usersTotal: usersResult.count || 0,
      linksTotal: linksResult.count || 0,
      analyzedTotal: analyzedLinks.data?.length || 0,
      paidLinksTotal,
      unpaidLinksTotal: (linksResult.count || 0) - paidLinksTotal,
      activeSubs,
      expiredSubs,
      llmsUpdated,
      llmsOutdated,
      bookDownloads: downloadsResult.count || 0,
      totalRevenue,
      // Trends (simplified - would need historical data for real trends)
      usersTrend: "↑", // Would calculate from historical data
      linksTrend: "↑",
      revenueTrend: "↑",
    };

    res.status(200).json(summary);
  } catch (error: any) {
    console.error("Admin summary error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch summary" });
  }
}

