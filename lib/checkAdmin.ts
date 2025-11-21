import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { supabase } from "@/lib/supabaseClient";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

/**
 * Check if the current user is a super-admin (hardcoded email)
 * @param session - NextAuth session object
 */
export function isSuperAdmin(session: Session | null): boolean {
  if (!session?.user?.email) {
    return false;
  }
  return session.user.email === "a.biletskiy@gmail.com";
}

/**
 * Check if the current user is an admin using NextAuth + Supabase
 * Supports both super-admin (hardcoded email) and admin role from database
 * @param session - Optional session object (will fetch if not provided)
 */
export async function checkAdmin(session?: Session | null): Promise<boolean> {
  try {
    // If session not provided, fetch it
    const userSession = session || (await getServerSession(authOptions));
    
    if (!userSession?.user) {
      return false;
    }

    // Check for super-admin first (hardcoded email)
    if (isSuperAdmin(userSession)) {
      return true;
    }

    const userId = (userSession.user as any)?.id || userSession.user.email;
    if (!userId) {
      return false;
    }

    // Check Supabase profiles table for admin role and admin_level
    // Try to find by email first (NextAuth uses email)
    let profile = null;
    let error = null;

    if (userSession.user.email) {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("role, admin_level")
        .eq("email", userSession.user.email)
        .maybeSingle();
      
      profile = data;
      error = fetchError;
    }

    // If not found by email, try by id
    if (!profile && (userSession.user as any)?.id) {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("role, admin_level")
        .eq("id", (userSession.user as any).id)
        .maybeSingle();
      
      profile = data;
      error = fetchError;
    }

    if (error && error.code !== "PGRST116") {
      console.error("Error checking admin status:", error);
      return false;
    }

    if (!profile) {
      return false;
    }

    // Check both role and admin_level for backward compatibility
    const isAdmin =
      profile.role === "admin" ||
      profile.admin_level === "basic" ||
      profile.admin_level === "super";

    return isAdmin;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * Require admin access - redirect to home if not admin
 * @param session - Optional session object (will fetch if not provided)
 */
export async function requireAdmin(session?: Session | null): Promise<void> {
  const isAdmin = await checkAdmin(session);
  if (!isAdmin) {
    redirect("/");
  }
}

