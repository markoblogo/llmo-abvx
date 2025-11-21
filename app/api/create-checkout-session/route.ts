import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { supabase } from "@/lib/supabaseClient"
import { withErrorHandling, requireEnvVars, safeJsonParse } from "@/lib/api-error-wrapper"

export const POST = withErrorHandling(async (req: NextRequest) => {
  requireEnvVars(["STRIPE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"])

  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured. Please check STRIPE_SECRET_KEY." }, { status: 500 })
  }

  const { userId, priceId } = await safeJsonParse(req)

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  if (!priceId && !process.env.NEXT_PUBLIC_STRIPE_PRICE_ID) {
    return NextResponse.json({ error: "Price ID is required" }, { status: 400 })
  }

  // Get user email from Supabase
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Check if user already has a Stripe customer ID
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single()

  let customerId = subscription?.stripe_customer_id

  // Create Stripe customer if doesn't exist
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        supabase_user_id: userId,
      },
    })
    customerId = customer.id

    // Update subscription with customer ID
    await supabase.from("subscriptions").update({ stripe_customer_id: customerId }).eq("user_id", userId)
  }

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${req.headers.get("origin") || process.env.NEXTAUTH_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.headers.get("origin") || process.env.NEXTAUTH_URL}/pricing`,
    metadata: {
      user_id: userId,
    },
  })

  return NextResponse.json({ sessionId: session.id, url: session.url })
})
