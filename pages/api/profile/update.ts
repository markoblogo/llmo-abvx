import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return res.status(405).end();

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { full_name, avatar_url } = req.body as {
      full_name?: string;
      avatar_url?: string;
    };

    const userId = (session.user as any)?.id || session.user.email;
    if (!userId) {
      return res.status(400).json({ error: "User ID not found" });
    }

    // Build update object
    const updateData: any = {};
    if (full_name !== undefined) {
      updateData.full_name = full_name;
    }
    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // Update profile in Supabase
    // Try to update by email first, then by id
    let updateError = null;
    
    if (session.user.email) {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("email", session.user.email);
      updateError = error;
    }

    // If update by email failed, try by id
    if (updateError && (session.user as any)?.id) {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", (session.user as any).id);
      updateError = error;
    }

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return res.status(500).json({ error: updateError.message || "Failed to update profile" });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: error.message || "Failed to update profile" });
  }
}

