import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { checkAdmin } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripeClient";

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

    // Check admin access using centralized checkAdmin function
    const { isAdmin } = await checkAdmin(session);
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Date calculations (used throughout the handler)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get users count
    const { count: totalUsers } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Get new users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count: newUsers } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    // Get links count
    const { count: totalLinks } = await supabaseAdmin
      .from("links")
      .select("*", { count: "exact", head: true });

    // Get featured links
    const { count: featuredLinks } = await supabaseAdmin
      .from("links")
      .select("*", { count: "exact", head: true })
      .eq("is_featured", true)
      .gt("featured_until", new Date().toISOString());

    // Get subscriptions breakdown
    const { data: subscriptions } = await supabaseAdmin.from("subscriptions").select("plan, expiry_date");

    const activeSubs = subscriptions?.filter((s) => new Date(s.expiry_date) > new Date()) || [];
    const planDistribution = {
      free: subscriptions?.filter((s) => s.plan === "free").length || 0,
      pro: activeSubs.filter((s) => s.plan === "pro").length || 0,
      agency: activeSubs.filter((s) => s.plan === "agency").length || 0,
    };

    // Get llms.txt stats
    const { data: allLinks } = await supabaseAdmin
      .from("links")
      .select("llms_file_status, llms_last_update");

    const llmsUpdated =
      allLinks?.filter((l) => {
        if (!l.llms_last_update) return false;
        const daysSinceUpdate = (Date.now() - new Date(l.llms_last_update).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate < 90;
      }).length || 0;
    const llmsOutdated = (allLinks?.length || 0) - llmsUpdated;
    const llmsUpdatedPercent = allLinks?.length ? ((llmsUpdated / allLinks.length) * 100).toFixed(1) : "0";

    // Get downloads count
    const { count: totalDownloads } = await supabaseAdmin
      .from("downloads")
      .select("*", { count: "exact", head: true });

    const { data: uniqueDownloaders } = await supabaseAdmin
      .from("downloads")
      .select("user_id")
      .not("user_id", "is", null);

    const uniqueDownloadersCount = new Set(uniqueDownloaders?.map((d) => d.user_id) || []).size;

    // Get Stripe balance
    let stripeBalance = { available: 0, pending: 0, lastPayout: null as string | null };
    try {
      const balance = await stripe.balance.retrieve();
      stripeBalance = {
        available: balance.available[0]?.amount || 0,
        pending: balance.pending[0]?.amount || 0,
        lastPayout: null, // Would need to fetch from balance transactions
      };
    } catch (stripeError) {
      console.error("Stripe balance error:", stripeError);
    }

    // Calculate revenue (estimated from subscriptions, excluding trials)
    // Get paid subscriptions (excluding trials) for revenue calculation
    const { data: paidSubscriptionsForRevenue } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, source")
      .in("plan", ["pro", "agency"])
      .gte("expiry_date", new Date().toISOString());

    const paidProCount = (paidSubscriptionsForRevenue || []).filter(
      (sub) => sub.plan === "pro" && sub.source !== "trial"
    ).length;
    const paidAgencyCount = (paidSubscriptionsForRevenue || []).filter(
      (sub) => sub.plan === "agency" && sub.source !== "trial"
    ).length;

    const revenueBreakdown = {
      subscriptions: paidProCount * 9 + paidAgencyCount * 30, // Annual estimates, excluding trials
      metadata: 0, // Would need to track from payments
      boost: (featuredLinks || 0) * 3, // Estimate from featured links
    };

    const totalRevenue = revenueBreakdown.subscriptions + revenueBreakdown.metadata + revenueBreakdown.boost;

    // Average AI score from analyzer_logs (last 30 days)
    // Calculate average score from all analyzer runs in the last 30 days
    const { data: recentAnalyzerLogs } = await supabaseAdmin
      .from("analyzer_logs")
      .select("score")
      .gte("created_at", thirtyDaysAgo.toISOString());

    let avgAiScore = 0;
    if (recentAnalyzerLogs && recentAnalyzerLogs.length > 0) {
      const totalScore = recentAnalyzerLogs.reduce((sum, log) => sum + (log.score || 0), 0);
      avgAiScore = Math.round((totalScore / recentAnalyzerLogs.length) * 10) / 10; // Round to 1 decimal
    }

    // Total analyzer runs (all time)
    const { count: totalAnalyzerRuns } = await supabaseAdmin
      .from("analyzer_logs")
      .select("*", { count: "exact", head: true });

    // Get unique analyzed links count (links that have been analyzed at least once)
    const { data: analyzedLinksData } = await supabaseAdmin
      .from("analyzer_logs")
      .select("link_id")
      .not("link_id", "is", null);
    
    const uniqueAnalyzedLinks = new Set(analyzedLinksData?.map((log) => log.link_id).filter(Boolean) || []).size;
    const analyzedTotal = uniqueAnalyzedLinks;

    // Get unpaid links (links without active subscription)
    // Links are considered "paid" if user has active subscription (expiry_date > NOW())
    const { data: allLinksWithUsers } = await supabaseAdmin
      .from("links")
      .select("user_id, id");
    
    const { data: activeSubscriptions } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id")
      .gt("expiry_date", new Date().toISOString());
    
    const usersWithActiveSubs = new Set(activeSubscriptions?.map((s) => s.user_id) || []);
    const unpaidLinksTotal = allLinksWithUsers?.filter((link) => !usersWithActiveSubs.has(link.user_id)).length || 0;

    // Get expired subscriptions count
    const { count: expiredSubs } = await supabaseAdmin
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .lt("expiry_date", new Date().toISOString());

    // ============================================
    // Services Statistics
    // ============================================

    // Analyzer: runs today
    const { count: runsToday } = await supabaseAdmin
      .from("analyzer_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    // Analyzer: runs last 30 days
    const { count: runsLast30Days } = await supabaseAdmin
      .from("analyzer_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Analyzer: unique users last 30 days
    const { data: analyzerUsersLast30Days } = await supabaseAdmin
      .from("analyzer_logs")
      .select("user_id")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const uniqueAnalyzerUsersLast30Days = new Set(
      analyzerUsersLast30Days?.map((log) => log.user_id).filter(Boolean) || []
    ).size;

    // Metadata stats
    const { count: generatedLast30Days } = await supabaseAdmin
      .from("metadata_suggestions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString());

    const { count: totalGenerated } = await supabaseAdmin
      .from("metadata_suggestions")
      .select("*", { count: "exact", head: true });

    const { data: metadataUsersLast30Days } = await supabaseAdmin
      .from("metadata_suggestions")
      .select("user_id")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const uniqueMetadataUsersLast30Days = new Set(
      metadataUsersLast30Days?.map((m) => m.user_id).filter(Boolean) || []
    ).size;

    // llms.txt stats
    // Count subscriptions with auto_llms = true and active (expiry_date is null or in the future)
    const { data: autoLlmsSubscriptions } = await supabaseAdmin
      .from("subscriptions")
      .select("id, expiry_date")
      .eq("auto_llms", true);

    const autoUsers = (autoLlmsSubscriptions || []).filter((sub) => {
      if (!sub.expiry_date) return true; // No expiry = active
      return new Date(sub.expiry_date) >= new Date(); // Expiry in future = active
    }).length;

    // llms.txt: updated last 30 days (from links table)
    const { data: linksWithLlmsUpdate } = await supabaseAdmin
      .from("links")
      .select("llms_last_update")
      .not("llms_last_update", "is", null)
      .gte("llms_last_update", thirtyDaysAgo.toISOString());

    const updatedLast30Days = linksWithLlmsUpdate?.length || 0;

    // ============================================
    // Billing Statistics
    // ============================================

    // Paid users (active pro/agency subscriptions, excluding trials)
    const { data: paidSubscriptions } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, plan, source, expiry_date")
      .in("plan", ["pro", "agency"])
      .gte("expiry_date", new Date().toISOString());

    // Filter out trial subscriptions - only count regular and gift subscriptions as "paid"
    const paidUsers = new Set(
      (paidSubscriptions || [])
        .filter((sub) => sub.source !== "trial")
        .map((sub) => sub.user_id)
    ).size;

    // Active by plan
    const { data: allActiveSubscriptions } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, user_id, expiry_date")
      .gte("expiry_date", new Date().toISOString());

    const activeByPlan = {
      free: 0,
      pro: 0,
      agency: 0,
    };

    // Count users with paid plans
    const usersWithPaidPlans = new Set<string>();
    allActiveSubscriptions?.forEach((sub) => {
      if (sub.plan === "pro" || sub.plan === "agency") {
        usersWithPaidPlans.add(sub.user_id);
        if (sub.plan === "pro") activeByPlan.pro++;
        if (sub.plan === "agency") activeByPlan.agency++;
      }
    });

    // Free users = total users - users with paid plans
    activeByPlan.free = (totalUsers || 0) - usersWithPaidPlans.size;

    // Upcoming renewals (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: upcomingRenewalsData } = await supabaseAdmin
      .from("subscriptions")
      .select(`
        user_id,
        plan,
        expiry_date,
        profiles:user_id (email)
      `)
      .in("plan", ["pro", "agency"])
      .gte("expiry_date", new Date().toISOString())
      .lte("expiry_date", thirtyDaysFromNow.toISOString())
      .order("expiry_date", { ascending: true })
      .limit(20);

    const upcomingRenewals = (upcomingRenewalsData || []).map((sub) => ({
      userId: sub.user_id,
      email: (sub.profiles as any)?.email || "N/A",
      plan: sub.plan,
      expiryDate: sub.expiry_date,
    }));

    return res.status(200).json({
      users: {
        total: totalUsers || 0,
        newLast7Days: newUsers || 0,
      },
      subscriptions: {
        active: activeSubs.length,
        expired: expiredSubs || 0,
        planDistribution,
      },
      analyzed: {
        total: analyzedTotal,
        totalRuns: totalAnalyzerRuns || 0,
      },
      links: {
        total: totalLinks || 0,
        featured: featuredLinks || 0,
        unpaid: unpaidLinksTotal,
      },
      llms: {
        updated: llmsUpdated,
        outdated: llmsOutdated,
        updatedPercent: llmsUpdatedPercent,
      },
      downloads: {
        total: totalDownloads || 0,
        uniqueDownloaders: uniqueDownloadersCount,
      },
      revenue: {
        total: totalRevenue,
        breakdown: revenueBreakdown,
      },
      aiVisibility: {
        avgScore: avgAiScore,
        llmsUpdatedPercent: parseFloat(llmsUpdatedPercent),
        totalAnalyzerRuns: totalAnalyzerRuns || 0,
      },
      stripe: stripeBalance,
      services: {
        analyzer: {
          runsToday: runsToday || 0,
          runsLast30Days: runsLast30Days || 0,
          totalRuns: totalAnalyzerRuns || 0,
          uniqueUsersLast30Days: uniqueAnalyzerUsersLast30Days,
        },
        metadata: {
          generatedLast30Days: generatedLast30Days || 0,
          totalGenerated: totalGenerated || 0,
          uniqueUsersLast30Days: uniqueMetadataUsersLast30Days,
        },
        llms: {
          autoUsers: autoUsers || 0,
          updatedLast30Days: updatedLast30Days,
        },
      },
      billing: {
        paidUsers,
        activeByPlan,
        upcomingRenewals,
      },
    });
  } catch (error: any) {
    console.error("[admin/stats] Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}




