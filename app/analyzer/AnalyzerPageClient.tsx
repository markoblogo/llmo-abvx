"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
// Stripe loaded dynamically to avoid build issues
import { useSession } from "next-auth/react";
import { History } from "lucide-react";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
// stripePromise initialized in component

type Action = {
  label: string;
  type: "payment" | "link" | "info";
  target?: string;
  tip?: string;
};

type AnalysisResult = {
  score: number;
  summary: string;
  recommendations: string[];
  actions: Action[];
};

export function AnalyzerPageClient() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  if (!searchParams) return null;
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;
  const [infoDialog, setInfoDialog] = useState<{ open: boolean; tip?: string }>({ open: false });
  const [confirmPaymentDialog, setConfirmPaymentDialog] = useState<{ open: boolean; action?: Action }>({ open: false });

  useEffect(() => {
    const success = searchParams.get("success");
    const paid = searchParams.get("paid");
    if (success || paid) {
      setError(null);
      setPaymentSuccess(true);
    }
  }, [searchParams]);

  const checkAuthAndRedirect = (action: () => void, redirectPath?: string) => {
    if (!user || !session) {
      const currentPath = redirectPath || pathname || "/analyzer";
      router.push(`/login?next=${encodeURIComponent(currentPath)}`);
      return;
    }
    action();
  };

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setPaymentSuccess(false);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze URL");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while analyzing your site");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: Action) => {
    if (action.type === "payment") {
      if (!user || !session) {
        const currentPath = window.location.pathname;
        router.push(`/login?next=${encodeURIComponent(currentPath)}`);
        return;
      }

      // Check if user has existing Stripe customer
      try {
        const checkResponse = await fetch("/api/checkout/check-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email || "",
            userId: user.id,
          }),
        });

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.hasCustomer) {
            // Show confirmation dialog for existing customers
            setConfirmPaymentDialog({ open: true, action });
            return;
          }
        }

        // If no existing customer, proceed directly to checkout
        proceedToCheckout(action);
      } catch (err) {
        // If check fails, proceed with new checkout
        proceedToCheckout(action);
      }
    } else if (action.type === "link") {
      if (!user || !session) {
        const currentPath = window.location.pathname;
        router.push(`/login?next=${encodeURIComponent(currentPath)}`);
        return;
      }
      // If authenticated, redirect to add-link page
      router.push(action.target === "/register" ? "/add-link" : action.target || "/add-link");
    } else if (action.type === "info") {
      setInfoDialog({ open: true, tip: action.tip });
    }
  };

  const proceedToCheckout = async (action: Action) => {
    if (!stripePublishableKey) {
      setError("Stripe is not configured. Please contact support.");
      return;
    }
    
    // Dynamically load Stripe
    const stripeModule: any = await import("@stripe/stripe-js");
    const loadStripe = stripeModule.loadStripe;
    if (!loadStripe) {
      setError("Failed to load Stripe library. Please try again.");
      return;
    }
    const stripe = await loadStripe(stripePublishableKey);
    if (!stripe) {
      setError("Failed to initialize Stripe. Please try again.");
      return;
    }

    setCheckoutLoading(action.target || "");
    setError(null);
    setConfirmPaymentDialog({ open: false });

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: action.target || "price_llms_txt",
          email: user?.email || "",
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create checkout session");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      setError(err.message || "Failed to start checkout");
      setCheckoutLoading(null);
    }
  };

  const handleConfirmPayment = () => {
    if (confirmPaymentDialog.action) {
      proceedToCheckout(confirmPaymentDialog.action);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-500";
    if (score >= 3) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 4) return "bg-green-500/10 border-green-500/20";
    if (score >= 3) return "bg-yellow-500/10 border-yellow-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1"></div>
                <div className="flex-1 text-center">
                  <p className="font-mono text-sm text-accent mb-3">// SITE ANALYZER</p>
                  <h1 className="font-mono text-3xl md:text-4xl font-bold mb-4">Analyze Your Site</h1>
                  <p className="text-lg text-muted-foreground">
                    Enter your website URL to get an AI readability score and recommendations
                  </p>
                </div>
                <div className="flex-1 flex justify-end">
                  {user && (
                    <Link href="/analyzer/history">
                      <Button variant="outline" className="font-mono bg-transparent">
                        <History className="h-4 w-4 mr-2" />
                        View History
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <Card className="p-8 border-border mb-8">
              <div className="space-y-4">
                <div>
                  <label htmlFor="url" className="font-mono text-sm font-semibold mb-2 block">
                    Enter your website URL:
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://yourdomain.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="font-mono flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAnalyze();
                        }
                      }}
                    />
                    <Button
                      onClick={handleAnalyze}
                      disabled={loading || !url.trim()}
                      size="lg"
                      className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Spinner className="h-4 w-4" />
                          Analyzing...
                        </span>
                      ) : (
                        "Analyze"
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm font-mono">
                    {error}
                  </div>
                )}

                {paymentSuccess && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded text-green-500 text-sm font-mono">
                    Payment successful! Redirecting to download page...
                  </div>
                )}
              </div>
            </Card>

            {result && (
              <div className="space-y-6">
                <Card className="p-8 border-accent/50">
                  <div className="text-center mb-8">
                    <p className="font-mono text-sm text-accent mb-3">// ANALYSIS COMPLETE</p>
                    <div className={`inline-block p-8 border-2 rounded-lg ${getScoreBgColor(result.score)}`}>
                      <h2 className={`font-mono text-4xl md:text-5xl font-bold ${getScoreColor(result.score)}`}>
                        {result.score}/5
                      </h2>
                      <p className="font-mono text-sm text-muted-foreground mt-2">AI Readability Score</p>
                    </div>
                  </div>

                  <div className="p-6 border border-border rounded-lg bg-muted/30 mb-6">
                    <p className="font-mono text-sm font-semibold mb-2">Summary:</p>
                    <p className="text-muted-foreground leading-relaxed">{result.summary}</p>
                  </div>

                  <div className="mb-6">
                    <p className="font-mono text-sm font-semibold mb-3">Recommendations:</p>
                    <ul className="space-y-2 mb-6">
                      {result.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-accent font-mono">→</span>
                          <span className="text-muted-foreground">{rec}</span>
                        </li>
                      ))}
                    </ul>

                    {result.actions.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-border">
                        <p className="font-mono text-sm font-semibold mb-4">Take Action:</p>
                        <div className="flex flex-col gap-3">
                          {result.actions.map((action, i) => (
                            <Button
                              key={i}
                              onClick={() => handleAction(action)}
                              disabled={checkoutLoading === action.target}
                              size="lg"
                              variant={action.type === "payment" ? "default" : "outline"}
                              className={`font-mono w-full ${
                                action.type === "payment"
                                  ? "bg-accent text-accent-foreground hover:bg-accent/90 glow-accent"
                                  : "bg-transparent"
                              }`}
                            >
                              {checkoutLoading === action.target ? (
                                <span className="flex items-center gap-2">
                                  <Spinner className="h-4 w-4" />
                                  Processing...
                                </span>
                              ) : (
                                action.label
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* Info Dialog */}
      <Dialog open={infoDialog.open} onOpenChange={(open) => setInfoDialog({ open })}>
        <DialogContent className="font-mono">
          <DialogHeader>
            <DialogTitle>Quick Tip</DialogTitle>
            <DialogDescription className="text-muted-foreground leading-relaxed">
              {infoDialog.tip || "No tip available."}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Payment Confirmation Dialog */}
      <Dialog open={confirmPaymentDialog.open} onOpenChange={(open) => setConfirmPaymentDialog({ open })}>
        <DialogContent className="font-mono">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription className="text-muted-foreground leading-relaxed">
              You already have a Stripe account. Confirm $1 purchase for llms.txt generation?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={handleConfirmPayment}
              disabled={checkoutLoading !== null}
              className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent flex-1"
            >
              {checkoutLoading ? (
                <span className="flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Processing...
                </span>
              ) : (
                "Confirm $1 Purchase"
              )}
            </Button>
            <Button
              onClick={() => setConfirmPaymentDialog({ open: false })}
              variant="outline"
              className="font-mono bg-transparent flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


