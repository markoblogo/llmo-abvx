import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

// Create Supabase admin client for webhook operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET || "whsec_test")
  } catch (err) {
    console.error("[v0] Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  console.log("[v0] Webhook event received:", event.type)

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id

        if (!userId) {
          console.error("[v0] No user_id in session metadata")
          break
        }

        // Update subscription to Pro plan
        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            plan: "pro",
            links_allowed: 999, // Unlimited links for Pro
            stripe_subscription_id: session.subscription as string,
            expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
          })
          .eq("user_id", userId)

        if (error) {
          console.error("[v0] Error updating subscription:", error)
        } else {
          console.log("[v0] Subscription upgraded to Pro for user:", userId)
        }
        break
      }

     case "invoice.payment_succeeded": {
  const invoice = event.data.object as Stripe.Invoice
  // @ts-ignore – Stripe type definitions omit the subscription field
  const subscriptionId =
    (invoice as any)?.subscription ||
    // @ts-ignore – also cover nested subscription case
    (invoice as any)?.lines?.data?.[0]?.subscription ||
    null

  if (!subscriptionId) break

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId)

  if (error) {
    console.error("[v0] Error extending subscription:", error)
  } else {
    console.log("[v0] Subscription extended for subscription:", subscriptionId)
  }
  break
}

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId =
          (invoice as any)?.subscription || (invoice as any)?.lines?.data?.[0]?.subscription || null

        if (!subscriptionId) break

        // Mark subscription as expired
        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            plan: "free",
            links_allowed: 1,
            expiry_date: new Date().toISOString(), // Set to now (expired)
          })
          .eq("stripe_subscription_id", subscriptionId)

        if (error) {
          console.error("[v0] Error marking subscription as expired:", error)
        } else {
          console.log("[v0] Subscription marked as expired for subscription:", subscriptionId)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const subscriptionId = subscription.id

        // Downgrade to free plan
        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            plan: "free",
            links_allowed: 1,
            expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 3 months from now
            stripe_subscription_id: null,
          })
          .eq("stripe_subscription_id", subscriptionId)

        if (error) {
          console.error("[v0] Error downgrading subscription:", error)
        } else {
          console.log("[v0] Subscription downgraded to free for subscription:", subscriptionId)
        }
        break
      }

      default:
        console.log("[v0] Unhandled event type:", event.type)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[v0] Error processing webhook:", err)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
