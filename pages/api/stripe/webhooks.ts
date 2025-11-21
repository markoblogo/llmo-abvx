import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

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
);

// Disable body parsing to get raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to get raw body from request
async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const signature = req.headers["stripe-signature"] as string;

  if (!signature) {
    return res.status(400).json({ error: "No signature" });
  }

  let event: Stripe.Event;

  try {
    // Get raw body as buffer for signature verification
    const buf = await getRawBody(req);
    // Stripe webhooks.constructEvent accepts Buffer or string
    event = stripe.webhooks.constructEvent(
      buf,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || "",
    );
  } catch (err: any) {
    console.error("[v0] Webhook signature verification failed:", err);
    return res.status(400).json({ error: `Invalid signature: ${err.message}` });
  }

  console.log("[v0] Webhook event received:", event.type);

  try {
    switch (event.type) {
      case "invoice.payment_succeeded": {
        // Расширяем тип Invoice, чтобы у него было опциональное поле subscription
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };

        const subscriptionField = invoice.subscription;

        const subscriptionId =
          typeof subscriptionField === "string"
            ? subscriptionField
            : (subscriptionField as Stripe.Subscription | null)?.id ?? null;

        if (!subscriptionId) {
          console.error("[v0] No subscription ID found in invoice");
          break;
        }

        // Get subscription details from Stripe
        const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as Stripe.Subscription & {
          current_period_end: number;
        };
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

        // Calculate new expiry date based on subscription period end
        const periodEnd = subscription.current_period_end;
        const expiryDate = new Date(periodEnd * 1000).toISOString();

        // Update subscription in Supabase
        const { data: existingSubscription, error: fetchError } = await supabaseAdmin
          .from("subscriptions")
          .select("id, user_id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (fetchError || !existingSubscription) {
          // Try to find by customer ID
          const { data: subscriptionByCustomer } = await supabaseAdmin
            .from("subscriptions")
            .select("id, user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (subscriptionByCustomer) {
            // Update existing subscription - renew for another period
            const { error: updateError } = await supabaseAdmin
              .from("subscriptions")
              .update({
                plan: "pro",
                links_allowed: 999,
                expiry_date: expiryDate,
                stripe_subscription_id: subscriptionId,
                stripe_customer_id: customerId,
                payment_status: "active",
                updated_at: new Date().toISOString(),
              })
              .eq("id", subscriptionByCustomer.id);

            if (updateError) {
              console.error("[v0] Error renewing subscription:", updateError);
            } else {
              console.log("[v0] Subscription renewed for subscription:", subscriptionId, "Expires:", expiryDate);
            }
          } else {
            console.error("[v0] No subscription found for customer:", customerId);
          }
        } else {
          // Update existing subscription - renew for another period
          const { error: updateError } = await supabaseAdmin
            .from("subscriptions")
            .update({
              plan: "pro",
              links_allowed: 999,
              expiry_date: expiryDate,
              stripe_customer_id: customerId,
              payment_status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingSubscription.id);

          if (updateError) {
            console.error("[v0] Error renewing subscription:", updateError);
          } else {
            console.log("[v0] Subscription renewed for subscription:", subscriptionId, "Expires:", expiryDate);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        // Расширяем тип Invoice, чтобы у него было опциональное поле subscription
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };

        const subscriptionField = invoice.subscription;

        const subscriptionId =
          typeof subscriptionField === "string"
            ? subscriptionField
            : (subscriptionField as Stripe.Subscription | null)?.id ?? null;

        if (!subscriptionId) {
          console.error("[v0] No subscription ID found in failed invoice");
          break;
        }

        // Mark subscription as expired and set payment status to past_due
        // Keep plan as "pro" but mark as expired so user knows payment failed
        const { error: updateError } = await supabaseAdmin
          .from("subscriptions")
          .update({
            payment_status: "past_due",
            expiry_date: new Date().toISOString(), // Set to now (expired)
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (updateError) {
          console.error("[v0] Error marking subscription as expired:", updateError);
        } else {
          console.log("[v0] Subscription marked as expired (payment failed) for subscription:", subscriptionId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

        // Cleanup: Downgrade to free plan, remove Stripe subscription ID, and set expiry to now
        const { error: updateError } = await supabaseAdmin
          .from("subscriptions")
          .update({
            plan: "free",
            links_allowed: 1,
            stripe_subscription_id: null,
            payment_status: "canceled",
            expiry_date: new Date().toISOString(), // Set to now (expired)
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (updateError) {
          console.error("[v0] Error cleaning up subscription:", updateError);
        } else {
          console.log("[v0] Subscription cleaned up and marked as expired for subscription:", subscriptionId);
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const paymentType = session.metadata?.type;
        const linkId = session.metadata?.link_id;
        const subscriptionId = session.subscription as string;
        const mode = session.mode;

        if (!userId) {
          console.error("[v0] No user_id in session metadata");
          break;
        }

        // Handle one-time payments (boost, metadata, etc.)
        if (mode === "payment") {
          if (paymentType === "boost" && linkId) {
            // Update link to featured status (30 days)
            const featuredUntil = new Date();
            featuredUntil.setDate(featuredUntil.getDate() + 30);

            const { error: boostError } = await supabaseAdmin
              .from("links")
              .update({
                is_featured: true,
                featured_until: featuredUntil.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", linkId)
              .eq("user_id", userId);

            if (boostError) {
              console.error("[v0] Error updating link to featured:", boostError);
            } else {
              console.log("[v0] Link boosted for 30 days:", linkId);
            }
          } else if (paymentType === "metadata") {
            // Metadata payment completed - allow download
            // This can be handled by checking payment status in the metadata page
            console.log("[v0] Metadata payment completed for user:", userId);
          } else if (paymentType === "llms_txt" && linkId) {
            // Update llms.txt status
            const { error: llmsError } = await supabaseAdmin
              .from("links")
              .update({
                llms_file_status: "updated",
                llms_last_update: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", linkId)
              .eq("user_id", userId);

            if (llmsError) {
              console.error("[v0] Error updating llms.txt status:", llmsError);
            } else {
              console.log("[v0] llms.txt updated for link:", linkId);
            }
          }
        }

        // Handle subscriptions
        if (mode === "subscription" && subscriptionId) {
          // Get subscription details
          const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as Stripe.Subscription & {
            current_period_end: number;
          };
          const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
          const periodEnd = subscription.current_period_end;
          const expiryDate = new Date(periodEnd * 1000).toISOString();

          // Determine plan based on payment type
          let plan = "pro";
          let linksAllowed = 999;
          const features: Record<string, boolean> = {};

          if (paymentType === "subscription_pro") {
            plan = "pro";
            linksAllowed = 999;
            features.analyzer_pro = true;
            features.metadata_suggestions = true;
            features.auto_llms = false;
          } else if (paymentType === "subscription_agency") {
            plan = "agency";
            linksAllowed = 999;
            features.analyzer_pro = true;
            features.metadata_suggestions = true;
            features.auto_llms = true;
            features.agency_members = true;
          } else {
            // Default to pro
            plan = "pro";
            linksAllowed = 999;
            features.analyzer_pro = true;
            features.metadata_suggestions = true;
          }

          // Update subscription
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({
              plan: plan,
              links_allowed: linksAllowed,
              features: features,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              expiry_date: expiryDate,
              payment_status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          if (error) {
            console.error("[v0] Error updating subscription:", error);
          } else {
            console.log("[v0] Subscription upgraded to", plan, "for user:", userId);
          }
        }
        break;
      }

      default:
        console.log("[v0] Unhandled event type:", event.type);
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("[v0] Error processing webhook:", err);
    return res.status(500).json({ error: `Webhook processing failed: ${err.message}` });
  }
}

