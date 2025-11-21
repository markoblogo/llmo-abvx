"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Card } from "@/components/ui/card";
import { PlanCard } from "@/components/pricing/plan-card";
import { supabase } from "@/lib/supabaseClient";
// Stripe loaded dynamically to avoid build issues

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
// stripePublishableKey initialized in component

export function PricingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trialAutoStarted, setTrialAutoStarted] = useState(false);

  const handleStartProTrial = async () => {
    // If user is not authenticated, redirect to login
    if (status !== "authenticated" || !session?.user) {
      router.push("/login?next=/pricing&trial=pro");
      return;
    }

    try {
      setTrialLoading(true);
      setError(null);

      const response = await fetch("/api/user/start-pro-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || "Failed to start trial";
        toast.error(errorMessage);
        setError(errorMessage);
        return;
      }

      // Success: show message and redirect to dashboard
      const expiryDate = new Date(data.expiryDate);
      const formattedDate = expiryDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      toast.success(`Pro trial activated until ${formattedDate}`);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err) {
      console.error("[pricing] Error starting Pro trial:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to start trial";
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setTrialLoading(false);
    }
  };

  // Auto-start trial if user just logged in with trial=pro parameter
  useEffect(() => {
    if (status === "authenticated" && session?.user && !trialAutoStarted) {
      const trialParam = searchParams?.get("trial");
      if (trialParam === "pro") {
        setTrialAutoStarted(true);
        // Remove the parameter from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
        // Auto-start trial
        handleStartProTrial();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user, searchParams, trialAutoStarted]);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!stripePublishableKey) {
        throw new Error("Stripe is not configured. Please contact support.");
      }

      // Проверяем, залогинен ли пользователь
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.push("/login");
        return;
      }

      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
      if (!priceId) {
        throw new Error("Pricing is not configured. Please contact support.");
      }

      // Создаём checkout-сессию
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.user.id,
          priceId: priceId,
        }),
      });

      const dataResponse = await response.json();

      if (!response.ok) {
        throw new Error(dataResponse.error || "Failed to create checkout session");
      }

      // Payment redirect is handled by Stripe Checkout URL
      if (dataResponse.url) {
        window.location.href = dataResponse.url;
      } else if (dataResponse.sessionId) {
        // Fallback: use Stripe redirect if URL not provided
        window.location.href = `/api/checkout?session_id=${dataResponse.sessionId}`;
      }
    } catch (err) {
      console.error("[v0] Pricing page checkout error:", err);
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Заголовок */}
          <div className="text-center mb-12">
            <p className="font-mono text-sm text-accent mb-2">// PRICING</p>
            <h1 className="font-mono text-4xl font-bold mb-4">Choose Your Plan</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Start free, then upgrade to Pro or Agency for deeper AI visibility and automation.
            </p>
          </div>

          {/* Ошибка */}
          {error && (
            <Card className="p-4 border-red-500/50 bg-red-500/10 mb-6">
              <p className="font-mono text-xs text-red-500">// ERROR: {error}</p>
            </Card>
          )}

          {/* Раздел 1: Free tools and trials */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <p className="font-mono text-sm text-accent mb-2">// FREE TOOLS AND TRIALS</p>
              <h2 className="font-mono text-3xl font-bold">Free Tools and Trials</h2>
              <p className="text-muted-foreground mt-2">
                Try our tools for free, no credit card required
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Free Trial for One Link */}
              <PlanCard
                title="Free Trial for One Link"
                price="$0"
                priceSubtext="/ 3 months"
                description="3-month free trial to list one link in the directory. Perfect for trying out LLMO."
                features={[
                  "3-month free trial for one link",
                  "Manual llms.txt generation",
                  "Analyzer Basic access",
                  "Basic AI analysis",
                  "Directory listing",
                ]}
                ctaText="Start Free Trial"
                ctaHref="/register"
                variant="outline"
              />

              {/* Analyzer Free */}
              <PlanCard
                title="Analyzer (Free)"
                price="Free"
                description="Get a free AI readability score (1–5) and detailed recommendations for your website."
                features={[
                  "AI readability score (1–5)",
                  "Detailed recommendations",
                  "No registration required",
                  "Unlimited analyses",
                ]}
                ctaText="Try Now"
                ctaHref="/analyzer"
                variant="outline"
              />
            </div>
          </div>

          {/* Раздел 2: One-time tools */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <p className="font-mono text-sm text-accent mb-2">// ONE-TIME TOOLS</p>
              <h2 className="font-mono text-3xl font-bold">One-Time Tools</h2>
              <p className="text-muted-foreground mt-2">
                Pay once, use forever. No subscriptions required.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <PlanCard
                title="Generate llms.txt"
                price="$1"
                priceSubtext="/ per site"
                description="Automatically create a compliant llms.txt file and installation guide for your website."
                features={[
                  "Compliant llms.txt file",
                  "Installation guide",
                  "One-time payment",
                  "No subscription required",
                ]}
                ctaText="Generate"
                ctaHref="/analyzer"
                variant="highlighted"
              />
            </div>
          </div>

          {/* Раздел 3: Full plans */}
          <div className="mb-12">
            <div className="text-center mb-8">
              <p className="font-mono text-sm text-accent mb-2">// FULL PLANS</p>
              <h2 className="font-mono text-3xl font-bold">Full Plans</h2>
              <p className="text-muted-foreground mt-2">
                Upgrade to unlock automation, advanced features, and priority support
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Pro Plan */}
              <PlanCard
                title="Pro"
                price="$9"
                priceSubtext="/ year"
                description="For serious content creators. Simple $9/year plan. Cancel anytime."
                features={[
                  "Auto llms.txt updates every 90 days",
                  "Analyzer Pro access",
                  "AI Metadata suggestions",
                  "Priority directory listing",
                  "Email insights report",
                  "Featured boost option",
                ]}
                ctaText="Get Started"
                ctaOnClick={handleUpgrade}
                ctaLoading={loading}
                variant="highlighted"
                badge="RECOMMENDED"
              />

              {/* Agency Plan */}
              <PlanCard
                title="Agency"
                price="$30"
                priceSubtext="/ year"
                description="For teams and agencies managing multiple websites and clients."
                features={[
                  "Manage up to 50 links",
                  "Team access (3 members)",
                  "Auto llms.txt updates",
                  "Analyzer Pro and Metadata AI",
                  "Featured placement for top links",
                  "Analytics dashboard",
                  "Priority support",
                ]}
                ctaText="Get Started"
                ctaOnClick={handleUpgrade}
                ctaLoading={loading}
                variant="highlighted"
              />
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-12 text-center">
            <Card className="p-6 border-border bg-muted/30 inline-block">
              <p className="font-mono text-xs text-muted-foreground">
                // SYSTEM NOTE: All prices in USD. Cancel anytime. No refunds for partial periods.
              </p>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

