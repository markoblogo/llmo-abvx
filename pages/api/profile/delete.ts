import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { supabase } from "@/lib/supabaseClient";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

    // Soft delete: Mark user data as deleted instead of actually deleting
    // This preserves data integrity and allows for potential recovery

    // 1. Update profile to mark as deleted
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        email: `deleted_${Date.now()}_${session.user.email}`,
        full_name: null,
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("email", session.user.email || "");

    if (profileError) {
      console.error("Error soft-deleting profile:", profileError);
    }

    // 2. Delete user from Prisma (NextAuth)
    try {
      await prisma.user.delete({
        where: { email: session.user.email || undefined },
      });
    } catch (prismaError: any) {
      // User might not exist in Prisma if they only used Supabase auth
      // User might not exist in Prisma if they only used Supabase auth - this is expected
    }

    // 3. Delete user's links (optional - you might want to keep them for analytics)
    // Uncomment if you want to delete links:
    // await supabase.from("links").delete().eq("user_id", userId);

    // 4. Delete user's subscriptions (optional)
    // await supabase.from("subscriptions").delete().eq("user_id", userId);

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error: any) {
    console.error("Account deletion error:", error);
    res.status(500).json({ error: error.message || "Failed to delete account" });
  } finally {
    await prisma.$disconnect();
  }
}

