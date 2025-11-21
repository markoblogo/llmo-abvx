"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface Subscription {
  id: string
  user_id: string
  plan: "free" | "pro"
  links_allowed: number
  start_date: string
  expiry_date: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  payment_status: string
  created_at: string
  profiles: { email: string }
}

export function SubscriptionsTable({ subscriptions: initialSubscriptions }: { subscriptions: Subscription[] }) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions)
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 3000)
  }

  const handleMarkAsPaid = async (subscriptionId: string) => {
    setLoading(subscriptionId)
    try {
      const response = await fetch("/api/admin/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      })

      if (response.ok) {
        showMessage("// SYSTEM MESSAGE: Subscription marked as paid")
        router.refresh()
      } else {
        showMessage("// SYSTEM ERROR: Failed to mark as paid")
      }
    } catch (error) {
      showMessage("// SYSTEM ERROR: Request failed")
    } finally {
      setLoading(null)
    }
  }

  const handleCancelSubscription = async (subscriptionId: string, email: string) => {
    if (!confirm(`Cancel subscription for ${email}? This will downgrade them to free plan.`)) return

    setLoading(subscriptionId)
    try {
      const response = await fetch("/api/admin/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      })

      if (response.ok) {
        showMessage("// SYSTEM MESSAGE: Subscription canceled")
        router.refresh()
      } else {
        showMessage("// SYSTEM ERROR: Failed to cancel subscription")
      }
    } catch (error) {
      showMessage("// SYSTEM ERROR: Request failed")
    } finally {
      setLoading(null)
    }
  }

  const handleResendReceipt = async (email: string) => {
    setLoading(email)
    try {
      const response = await fetch("/api/admin/resend-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        showMessage("// SYSTEM MESSAGE: Receipt sent")
      } else {
        showMessage("// SYSTEM ERROR: Failed to send receipt")
      }
    } catch (error) {
      showMessage("// SYSTEM ERROR: Request failed")
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-accent/20 text-accent"
      case "past_due":
        return "bg-yellow-500/20 text-yellow-500"
      case "canceled":
        return "bg-destructive/20 text-destructive"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getPlanColor = (plan: string) => {
    return plan === "pro" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-md border border-accent bg-accent/10 p-3 font-mono text-sm text-accent">{message}</div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead className="border-b border-border bg-card">
            <tr>
              <th className="p-4 text-left font-mono text-sm font-semibold">User Email</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Plan</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Stripe ID</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Renewal Date</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Payment Status</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((subscription) => (
              <tr
                key={subscription.id}
                className="border-b border-border transition-colors hover:bg-accent/5 last:border-0"
              >
                <td className="p-4 font-mono text-sm">{subscription.profiles?.email || "N/A"}</td>
                <td className="p-4">
                  <span className={`rounded px-2 py-1 font-mono text-xs ${getPlanColor(subscription.plan)}`}>
                    {subscription.plan}
                  </span>
                </td>
                <td className="p-4 font-mono text-xs">
                  {subscription.stripe_subscription_id
                    ? subscription.stripe_subscription_id.substring(0, 20) + "..."
                    : "—"}
                </td>
                <td className="p-4 font-mono text-sm">{formatDate(subscription.expiry_date)}</td>
                <td className="p-4">
                  <span
                    className={`rounded px-2 py-1 font-mono text-xs ${getStatusColor(subscription.payment_status)}`}
                  >
                    {subscription.payment_status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    {subscription.payment_status !== "active" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="font-mono text-xs"
                        onClick={() => handleMarkAsPaid(subscription.id)}
                        disabled={loading === subscription.id}
                      >
                        Mark Paid
                      </Button>
                    )}
                    {subscription.plan === "pro" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="font-mono text-xs"
                        onClick={() => handleCancelSubscription(subscription.id, subscription.profiles?.email)}
                        disabled={loading === subscription.id}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="font-mono text-xs"
                      onClick={() => handleResendReceipt(subscription.profiles?.email)}
                      disabled={loading === subscription.profiles?.email}
                    >
                      Receipt
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
