import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { checkAdmin } from "@/lib/checkAdmin";
import { supabase } from "@/lib/supabaseClient";

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

    const { category = "all", status = "all", payment = "all" } = req.query;

    // Build query
    let query = supabase.from("links").select(`
      id,
      url,
      title,
      category,
      status,
      created_at,
      llms_file_status,
      llms_last_update,
      user_id,
      profiles:user_id (
        email
      )
    `);

    // Filters
    if (category !== "all") {
      query = query.eq("category", category);
    }

    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Sort by newest first
    query = query.order("created_at", { ascending: false });

    const { data: links, error } = await query;

    if (error) throw error;

    // Enrich with payment status and owner email
    const enrichedLinks = (links || []).map((link: any) => {
      // Get subscription for payment status
      // For now, we'll check if user has active subscription
      // This would need to be enhanced with actual payment tracking
      const paymentStatus = "unpaid"; // Simplified - would need actual payment tracking

      return {
        id: link.id,
        url: link.url,
        title: link.title,
        category: link.category,
        owner_email: link.profiles?.email || "Unknown",
        created_at: link.created_at,
        status: link.status,
        llms_file_status: link.llms_file_status,
        llms_last_update: link.llms_last_update,
        payment_status: paymentStatus,
      };
    });

    // Filter by payment status if needed
    let filteredLinks = enrichedLinks;
    if (payment !== "all") {
      filteredLinks = enrichedLinks.filter(
        (link) => link.payment_status === payment
      );
    }

    res.status(200).json({ links: filteredLinks });
  } catch (error: any) {
    console.error("Admin links error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch links" });
  }
}

