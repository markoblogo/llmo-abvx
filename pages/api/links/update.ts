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

    const { linkId, url, title, description, category } = req.body as {
      linkId: string;
      url: string;
      title: string;
      description: string;
      category: string;
    };

    if (!linkId || !url || !title || !description || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (description.length < 50) {
      return res.status(400).json({ error: "Description must be at least 50 characters" });
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

    // Update the link
    const { error: updateError } = await supabase
      .from("links")
      .update({
        url,
        title: title || url,
        description,
        category,
        updated_at: new Date().toISOString(),
      })
      .eq("id", linkId);

    if (updateError) {
      console.error("Error updating link:", updateError);
      return res.status(500).json({ error: updateError.message || "Failed to update link" });
    }

    res.status(200).json({ success: true, message: "Link updated successfully" });
  } catch (error: any) {
    console.error("Link update error:", error);
    res.status(500).json({ error: error.message || "Failed to update link" });
  }
}

