import { supabase } from "./supabaseClient"

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: "user" | "admin"
  admin_level?: "none" | "basic" | "super"
  last_login: string | null
  created_at: string
  updated_at: string
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return false

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, admin_level")
      .eq("id", user.id)
      .single()

    if (error || !profile) return false

    const isAdminUser =
      profile &&
      (profile.role === "admin" ||
        profile.admin_level === "basic" ||
        profile.admin_level === "super")

    return isAdminUser
  } catch (error) {
    console.error("[v0] Error checking admin status:", error)
    return false
  }
}

/**
 * Get the current user's profile
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (error || !profile) return null

    return profile as Profile
  } catch (error) {
    console.error("[v0] Error fetching profile:", error)
    return null
  }
}

/**
 * Require admin access - redirect to login if not admin
 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile()

  const isAdmin =
    profile &&
    (profile.role === "admin" ||
      profile.admin_level === "basic" ||
      profile.admin_level === "super")

  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }

  return profile
}
