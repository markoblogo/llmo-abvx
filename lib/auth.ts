import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";
import type { Session } from "next-auth";

// Super admin email (can be moved to env variable)
const SUPER_ADMIN_EMAIL = "a.biletskiy@gmail.com";

// Admin client for server-side operations
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

export type AdminLevel = "none" | "basic" | "super";

export interface AdminCheckResult {
  isAdmin: boolean;
  adminLevel: AdminLevel;
}

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Check if the current user is a super-admin (hardcoded email or admin_level = 'super')
 * @param session - NextAuth session object
 */
export function isSuperAdmin(session: Session | null): boolean {
  if (!session?.user?.email) {
    return false;
  }
  return session.user.email === SUPER_ADMIN_EMAIL;
}

/**
 * Get admin level for a user by email or user ID
 * @param email - User email (optional)
 * @param userId - User ID (optional)
 * @returns Admin level: 'none', 'basic', or 'super'
 */
export async function getAdminLevel(email?: string | null, userId?: string | null): Promise<AdminLevel> {
  try {
    // Check for super-admin email first
    if (email === SUPER_ADMIN_EMAIL) {
      return "super";
    }

    if (!email && !userId) {
      return "none";
    }

    // Query Supabase for admin_level
    let profile = null;
    let error = null;

    if (email) {
      const { data, error: fetchError } = await supabaseAdmin
        .from("profiles")
        .select("admin_level")
        .eq("email", email)
        .maybeSingle();
      
      profile = data;
      error = fetchError;
    }

    // If not found by email, try by id
    if (!profile && userId) {
      const { data, error: fetchError } = await supabaseAdmin
        .from("profiles")
        .select("admin_level")
        .eq("id", userId)
        .maybeSingle();
      
      profile = data;
      error = fetchError;
    }

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching admin level:", error);
      return "none";
    }

    if (!profile || !profile.admin_level) {
      return "none";
    }

    // Validate admin_level value
    const adminLevel = profile.admin_level as string;
    if (adminLevel === "super" || adminLevel === "basic") {
      return adminLevel as AdminLevel;
    }

    return "none";
  } catch (error) {
    console.error("Error getting admin level:", error);
    return "none";
  }
}

/**
 * Check if a user session has admin role and get admin level
 * Supports both super-admin (hardcoded email) and admin_level from database
 * @param session - NextAuth session object (optional, will fetch if not provided)
 * @returns Object with isAdmin boolean and adminLevel
 */
export async function checkAdmin(session?: Session | null): Promise<AdminCheckResult> {
  try {
    // If session not provided, fetch it
    const userSession = session || (await getServerSession(authOptions));
    
    if (!userSession?.user) {
      return { isAdmin: false, adminLevel: "none" };
    }

    // Check for super-admin first (hardcoded email)
    if (isSuperAdmin(userSession)) {
      return { isAdmin: true, adminLevel: "super" };
    }

    const userId = (userSession.user as any)?.id;
    const userEmail = userSession.user.email;

    // Get admin level from database
    const adminLevel = await getAdminLevel(userEmail, userId);

    return {
      isAdmin: adminLevel === "basic" || adminLevel === "super",
      adminLevel,
    };
  } catch (error) {
    console.error("Error checking admin status:", error);
    return { isAdmin: false, adminLevel: "none" };
  }
}

/**
 * Require admin access - throws error if not admin
 * @param session - NextAuth session object (optional)
 * @throws Error if user is not admin
 */
export async function requireAdminAccess(session?: Session | null): Promise<void> {
  const { isAdmin } = await checkAdmin(session);
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }
}

/**
 * Require super admin access - redirect to home if not super admin
 * @param session - NextAuth session object (optional)
 */
export async function requireSuperAdminAccess(session?: Session | null): Promise<void> {
  const { adminLevel } = await checkAdmin(session);
  if (adminLevel !== "super") {
    redirect("/");
  }
}

