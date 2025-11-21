import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { linkId } = req.body as { linkId: string };

    if (!linkId) {
      return res.status(400).json({ error: "Link ID is required" });
    }

    const userId = (session.user as any)?.id || session.user.email;
    if (!userId) {
      return res.status(400).json({ error: "User ID not found" });
    }

    // Verify that the link belongs to the user
    const { data: existingLink, error: fetchError } = await supabase
      .from("links")
      .select("user_id")
      .eq("id", linkId)
      .single();

    if (fetchError || !existingLink) {
      return res.status(404).json({ error: "Link not found" });
    }

    if (existingLink.user_id !== userId) {
      return res.status(403).json({ error: "Forbidden: You don't own this link" });
    }

    // Delete the link
    const { error: deleteError } = await supabase.from("links").delete().eq("id", linkId);

    if (deleteError) {
      console.error("Error deleting link:", deleteError);
      return res.status(500).json({ error: deleteError.message || "Failed to delete link" });
    }

    res.status(200).json({ success: true, message: "Link deleted successfully" });
  } catch (error: any) {
    console.error("Link delete error:", error);
    res.status(500).json({ error: error.message || "Failed to delete link" });
  }
}

