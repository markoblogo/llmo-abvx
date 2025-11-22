import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
// @ts-ignore — PrismaClient тип не виден на Vercel, но модуль есть в рантайме
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripeClient";

const prisma = new PrismaClient();

// Supabase admin client for server-side operations
// NOTE: Supabase subscriptions table is the PRIMARY source of truth for Stripe customer IDs
// Prisma is kept as fallback for backward compatibility
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { email, userId } = req.body as { email: string; userId: string };

    // Get user_id from Supabase - try to find by email from NextAuth session
    // This is the primary way to identify users in Supabase
    let supabaseUserId: string | null = null;
    
    // First, try to get user_id from session (if it's already a Supabase UUID)
    const sessionUserId = (session.user as any)?.id;
    
    // If session.user.id looks like a UUID, use it directly
    // Otherwise, find user in Supabase by email
    if (sessionUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionUserId)) {
      supabaseUserId = sessionUserId;
    } else if (session.user?.email || email) {
      // Find user in Supabase by email
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", session.user?.email || email)
        .maybeSingle();
      
      if (profile?.id) {
        supabaseUserId = profile.id;
      }
    }

    // Also try userId from request body if provided
    if (!supabaseUserId && userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      supabaseUserId = userId;
    }

    let hasStripeCustomer = false;
    let stripeCustomerId: string | null = null;

    // PRIMARY: Check Supabase subscriptions table for existing Stripe customer
    // This is the main source of truth for Stripe customer IDs
    if (supabaseUserId) {
      try {
        const { data: subscription, error: supabaseError } = await supabaseAdmin
          .from("subscriptions")
          .select("stripe_customer_id")
          .eq("user_id", supabaseUserId)
          .maybeSingle();

        if (supabaseError) {
          console.error("[check-customer] Supabase error:", supabaseError);
          // Continue to fallback, don't fail
        } else if (subscription?.stripe_customer_id) {
          hasStripeCustomer = true;
          stripeCustomerId = subscription.stripe_customer_id;
        }
      } catch (supabaseErr) {
        console.error("[check-customer] Error checking Supabase:", supabaseErr);
        // Continue to fallback, don't fail
      }
    }

    // FALLBACK: Check Prisma for existing Stripe customer (backward compatibility)
    // This is kept for legacy support, but Supabase is preferred
    if (!hasStripeCustomer) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: email || session.user?.email || undefined },
          include: {
            accounts: {
              where: {
                provider: "stripe",
              },
            },
          },
        });

        const hasCustomer = user?.accounts?.some(
          (account) => account.provider === "stripe" && account.providerAccountId
        );

        if (hasCustomer && user?.accounts?.[0]?.providerAccountId) {
          hasStripeCustomer = true;
          stripeCustomerId = user.accounts[0].providerAccountId;

          // Sync to Supabase if we have supabaseUserId
          if (supabaseUserId && stripeCustomerId) {
            try {
              await supabaseAdmin
                .from("subscriptions")
                .update({ stripe_customer_id: stripeCustomerId })
                .eq("user_id", supabaseUserId);
              
              // Successfully synced Stripe customer ID from Prisma to Supabase
            } catch (syncError) {
              console.error("[check-customer] Error syncing to Supabase:", syncError);
              // Don't fail, just log
            }
          }
        }
      } catch (prismaError) {
        console.error("[check-customer] Prisma error:", prismaError);
        // Continue, don't fail
      }
    }

    // If still no customer found, create a new one in Stripe
    // This ensures we always have a customer ID for checkout
    if (!hasStripeCustomer && stripe) {
      try {
        const userEmail = email || session.user?.email;
        if (!userEmail) {
          console.error("[check-customer] Cannot create customer: no email provided");
        } else {
          const customer = await stripe.customers.create({
            email: userEmail,
            metadata: {
              supabase_user_id: supabaseUserId || "",
              nextauth_email: userEmail,
            },
          });

          stripeCustomerId = customer.id;
          hasStripeCustomer = true;

          // Store in Supabase (primary)
          if (supabaseUserId) {
            try {
              // Update or insert subscription with customer ID
              const { error: updateError } = await supabaseAdmin
                .from("subscriptions")
                .upsert({
                  user_id: supabaseUserId,
                  stripe_customer_id: customer.id,
                  plan: "free", // Default plan
                  links_allowed: 1,
                  start_date: new Date().toISOString(),
                  expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
                }, {
                  onConflict: "user_id",
                });

              if (updateError) {
                console.error("[check-customer] Error storing customer in Supabase:", updateError);
              } else {
                // Successfully created new Stripe customer and stored in Supabase
              }
            } catch (supabaseStoreError) {
              console.error("[check-customer] Error storing in Supabase:", supabaseStoreError);
              // Don't fail, customer was created in Stripe
            }
          }

          // Also store in Prisma for backward compatibility
          try {
            const prismaUser = await prisma.user.findUnique({
              where: { email: userEmail },
            });

            if (prismaUser) {
              await prisma.account.upsert({
                where: {
                  provider_providerAccountId: {
                    provider: "stripe",
                    providerAccountId: customer.id,
                  },
                },
                update: {},
                create: {
                  userId: prismaUser.id,
                  type: "oauth",
                  provider: "stripe",
                  providerAccountId: customer.id,
                },
              });
              // Successfully synced new customer to Prisma
            }
          } catch (prismaStoreError) {
            console.error("[check-customer] Error storing in Prisma:", prismaStoreError);
            // Don't fail, customer was created in Stripe and stored in Supabase
          }
        }
      } catch (stripeError) {
        console.error("[check-customer] Error creating Stripe customer:", stripeError);
        // Return false, but don't fail the request
      }
    }

    res.status(200).json({ 
      hasCustomer: hasStripeCustomer,
      customerId: stripeCustomerId || null,
    });
  } catch (error: any) {
    console.error("[check-customer] Error:", error);
    res.status(500).json({ error: error.message || "Failed to check customer" });
  } finally {
    // Prisma connection cleanup is handled automatically
  }
}
