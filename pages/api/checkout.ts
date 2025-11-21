import type { NextApiRequest, NextApiResponse } from "next"
import { stripe } from "@/lib/stripeClient"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end()

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { priceId, email, userId, type, linkId } = req.body as {
      priceId?: string;
      email: string;
      userId?: string;
      type?: string;
      linkId?: string;
    };
    const isLlmsTxt = priceId === "price_llms_txt" || type === "llms_txt";
    const isLinkPayment = type === "link";
    const isSubscriptionRenewal = type === "subscription";
    const isMetadata = type === "metadata";
    const isBoost = type === "boost";
    const isProSubscription = type === "subscription_pro";
    const isAgencySubscription = type === "subscription_agency";

    // Determine price ID based on type if not provided
    let finalPriceId = priceId;
    if (!finalPriceId && type) {
      switch (type) {
        case "metadata":
          finalPriceId = process.env.STRIPE_PRICE_METADATA || "price_metadata_1usd";
          break;
        case "boost":
          finalPriceId = process.env.STRIPE_PRICE_BOOST || "price_boost_3usd";
          break;
        case "subscription_pro":
          finalPriceId = process.env.STRIPE_PRICE_PRO || "price_pro_annual";
          break;
        case "subscription_agency":
          finalPriceId = process.env.STRIPE_PRICE_AGENCY || "price_agency_annual";
          break;
        default:
          finalPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
      }
    }

    // Check if customer exists in Stripe
    let customerId: string | undefined
    if (email) {
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      })
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id
      }
    }

    // Determine success URL based on payment type
    let successUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    if (isLlmsTxt) {
      successUrl = linkId
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?llms_updated=${linkId}`
        : `${process.env.NEXT_PUBLIC_SITE_URL}/download-llms?paid=true`;
    } else if (isLinkPayment) {
      successUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/add-link?paid=true`;
    } else if (isSubscriptionRenewal || isProSubscription || isAgencySubscription) {
      successUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?renewed=true&plan=${type}`;
    } else if (isMetadata) {
      successUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/metadata?paid=true&session_id={CHECKOUT_SESSION_ID}`;
    } else if (isBoost && linkId) {
      successUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?boosted=${linkId}`;
    }

    // Determine payment mode (one-time vs subscription)
    const isOneTimePayment = isLlmsTxt || isMetadata || isBoost;
    const mode = isOneTimePayment ? "payment" : "subscription";

    // Create checkout session
    const checkoutSessionParams: any = {
      mode: mode,
      payment_method_types: ["card"],
      line_items: [{ price: finalPriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: isLinkPayment
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/add-link`
        : isMetadata
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/metadata`
          : isBoost
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
            : `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
      metadata: {
        user_id: userId || "",
        type: type || "unknown",
        link_id: linkId || "",
      },
    }

    if (customerId) {
      checkoutSessionParams.customer = customerId
    } else {
      checkoutSessionParams.customer_email = email
    }

    const stripeSession = await stripe.checkout.sessions.create(checkoutSessionParams)

    res.status(200).json({ url: stripeSession.url })
  } catch (error: any) {
    console.error("Stripe checkout error:", error)
    res.status(500).json({ error: error.message || "Failed to create checkout session" })
  }
}

