import { supabase } from "@/lib/supabaseClient"
import { SubscriptionsTable } from "@/components/admin/subscriptions-table"

async function getSubscriptions() {
  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(
      `
      *,
      profiles:user_id (email)
    `,
    )
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching subscriptions:", error)
    return []
  }

  return subscriptions
}

/**
 * CHANGES MADE:
 * 1. Added calculation of subscription statistics:
 *    - totalSubscriptions: total count
 *    - activeSubscriptions: subscriptions with expiry_date >= now
 *    - expiredSubscriptions: subscriptions with expiry_date < now
 *    - proSubscriptions: count of Pro plans
 *    - agencySubscriptions: count of Agency plans
 * 2. Updated system message to show: "{totalSubscriptions} subscriptions total ({active} active, {expired} expired)"
 * 3. Added second line showing plan breakdown: "// PLANS: {pro} Pro, {agency} Agency"
 */
export default async function AdminSubscriptionsPage() {
  const subscriptions = await getSubscriptions()

  // Calculate statistics
  const totalSubscriptions = subscriptions.length

  const now = new Date()
  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.expiry_date && new Date(sub.expiry_date) >= now
  )
  const expiredSubscriptions = subscriptions.filter(
    (sub) => sub.expiry_date && new Date(sub.expiry_date) < now
  )

  const proSubscriptions = subscriptions.filter((sub) => sub.plan === "pro")
  const agencySubscriptions = subscriptions.filter((sub) => sub.plan === "agency")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-3xl font-bold">// SUBSCRIPTIONS MANAGEMENT</h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          // SYSTEM MESSAGE: {totalSubscriptions} subscriptions total ({activeSubscriptions.length} active,{" "}
          {expiredSubscriptions.length} expired)
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          // PLANS: {proSubscriptions.length} Pro, {agencySubscriptions.length} Agency
        </p>
      </div>

      <SubscriptionsTable subscriptions={subscriptions} />
    </div>
  )
}
