"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/lib/supabaseClient";
// Stripe is loaded dynamically in the component to avoid build issues
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const categories = ["Blog", "Portfolio", "Startup", "Agency", "Other"]; // Legacy - kept for backward compatibility
const types = ["Blog", "Portfolio", "SaaS", "Agency", "Shop", "AI Tool", "Company", "Media"];
const platforms = ["Stand-alone", "Medium", "Substack", "Notion", "WordPress", "Custom"];
const topics = ["AI & Tech", "Design", "Business", "Lifestyle", "Education", "Science"];

// Hierarchical categories
const categoryLevel1Options = [
  "Blog",
  "Website",
  "Product",
  "Service",
  "Store",
  "Portfolio",
  "Agency",
  "Publication",
  "App",
  "Personal",
  "Social Media",
];

const categoryLevel2Options: Record<string, string[]> = {
  Blog: ["Medium", "Substack", "WordPress", "Notion", "Ghost", "Custom"],
  Website: ["WordPress", "Custom", "Webflow", "Squarespace", "Wix"],
  Product: ["SaaS", "Mobile App", "Web App", "Desktop App", "Plugin"],
  Service: ["Consulting", "Agency", "Freelance", "Marketplace", "Platform"],
  Store: ["Shopify", "WooCommerce", "Etsy", "Custom", "Marketplace"],
  Portfolio: ["Custom", "Behance", "Dribbble", "Carbonmade", "Other"],
  Agency: ["Marketing", "Design", "Development", "Consulting", "Full-service"],
  Publication: ["News", "Magazine", "Journal", "Blog Network", "Other"],
  App: ["Mobile", "Web", "Desktop", "Browser Extension", "Other"],
  Personal: ["Portfolio", "Blog", "Resume", "About", "Other"],
  "Social Media": ["X/Twitter", "Facebook", "Instagram", "TikTok", "LinkedIn", "YouTube", "Other"],
};

const categoryLevel3Options = [
  "AI",
  "Marketing",
  "Design",
  "Tech",
  "Lifestyle",
  "Business",
  "Education",
  "Science",
];

type SubscriptionData = {
  id: string;
  user_id: string;
  expiry_date: string;
  stripe_customer_id: string | null;
  plan: string;
  links_allowed: number;
  start_date: string;
};

export function AddLinkPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const user = session?.user;

  const [loading, setLoading] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(""); // Legacy - kept for backward compatibility
  const [categoryLevel1, setCategoryLevel1] = useState<string>("");
  const [categoryLevel2, setCategoryLevel2] = useState<string>("");
  const [categoryLevel3, setCategoryLevel3] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [platform, setPlatform] = useState<string>("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string>("");
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Reset level2 when level1 changes
  useEffect(() => {
    if (categoryLevel1) {
      setCategoryLevel2(""); // Reset level2 when level1 changes
    }
  }, [categoryLevel1]);

  // Redirect if not authenticated and fetch subscription
  useEffect(() => {
    if (status === "loading") return;
    if (!session || !user) {
      router.push("/login?next=/add-link");
      return;
    }

    const fetchSubscription = async () => {
      try {
        const userId = (user as any)?.id || user?.email;
        if (!userId) {
          setError("Unable to identify user");
          setCheckingSubscription(false);
          return;
        }

        // Check subscription in Supabase
        const { data: subscriptionData, error: subError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (subError && subError.code !== "PGRST116") {
          // PGRST116 = no rows returned
          console.error("Error fetching subscription:", subError);
        }

        setSubscription(subscriptionData || null);

        // Check for payment success
        const paid = searchParams?.get("paid");
        if (paid === "true") {
          setPaymentModalOpen(false);
          // Refresh subscription to get updated expiry_date
          if (subscriptionData) {
            setSubscription(subscriptionData);
          }
        }
      } catch (err: any) {
        console.error("Error checking subscription:", err);
      } finally {
        setCheckingSubscription(false);
      }
    };

    fetchSubscription();
  }, [session, status, router, user, searchParams]);

  const checkTrialStatus = (): { isValid: boolean; needsPayment: boolean } => {
    if (!subscription) {
      // No subscription = first link, allow it (will create trial)
      return { isValid: true, needsPayment: false };
    }

    const now = new Date();
    const expiryDate = new Date(subscription.expiry_date);

    // If subscription hasn't expired, allow submission
    if (expiryDate > now) {
      return { isValid: true, needsPayment: false };
    }

    // Subscription/trial expired, needs payment
    return { isValid: false, needsPayment: true };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const url = formData.get("url") as string;
    const description = formData.get("description") as string;
    const title = formData.get("title") as string || url; // Use URL if title not provided
    const shortDescription = formData.get("short_description") as string || "";

    // Parse keywords from comma-separated string
    const keywordsArray = keywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    // Validation
    if (!url || !description || !type || !categoryLevel1) {
      setError("Please fill in all required fields (URL, Description, Type, Category Level 1)");
      setLoading(false);
      return;
    }

    if (description.length < 50) {
      setError("Description must be at least 50 characters");
      setLoading(false);
      return;
    }

    if (keywordsArray.length > 5) {
      setError("Maximum 5 keywords allowed");
      setLoading(false);
      return;
    }

    if (shortDescription && shortDescription.length > 280) {
      setError("Short description must be 280 characters or less");
      setLoading(false);
      return;
    }

    // Check trial status
    const trialStatus = checkTrialStatus();
    if (trialStatus.needsPayment) {
      setPaymentModalOpen(true);
      setLoading(false);
      return;
    }

    // Proceed with submission
    await submitLink(
      url,
      description,
      category,
      title,
      type,
      platform,
      selectedTopics,
      keywordsArray,
      shortDescription,
      categoryLevel1,
      categoryLevel2,
      categoryLevel3,
    );
  };

  const submitLink = async (
    url: string,
    description: string,
    category: string,
    title: string,
    type: string,
    platform: string,
    topics: string[],
    keywords: string[],
    shortDescription: string,
    categoryLevel1: string,
    categoryLevel2: string,
    categoryLevel3: string,
  ) => {
    try {
      const userId = (user as any)?.id || user?.email;
      if (!userId) {
        throw new Error("Unable to identify user");
      }

      // Check if this is the first link (no subscription exists)
      const isFirstLink = !subscription;

      // Calculate expiration dates
      const now = new Date();
      const trialEndsAt = isFirstLink
        ? new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 3 months
        : null;

      // Calculate link expiration (same as subscription expiry or 1 year from now)
      const expiresAt = subscription?.expiry_date
        ? new Date(subscription.expiry_date)
        : isFirstLink
          ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // Default 1 year
          : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // Default 1 year

      // Create subscription if first link
      if (isFirstLink && trialEndsAt) {
        const { error: subError } = await supabase.from("subscriptions").upsert({
          user_id: userId,
          plan: "free",
          links_allowed: 1,
          start_date: now.toISOString(),
          expiry_date: trialEndsAt.toISOString(), // 3-month free trial
        });

        if (subError) {
          console.error("Error creating subscription:", subError);
          // Continue anyway - link can still be added
        }
      }

      // Insert link with all new fields
      // Use hierarchical categories if provided, otherwise fall back to legacy category
      const finalCategory = categoryLevel1 || category || "Other";

      const { error: insertError } = await supabase.from("links").insert({
        user_id: userId,
        url,
        title: title || url,
        description,
        category: finalCategory, // Legacy field for backward compatibility
        category_level1: categoryLevel1 || null,
        category_level2: categoryLevel2 || null,
        category_level3: categoryLevel3 || null,
        type: type || null,
        platform: platform || null,
        topics: topics.length > 0 ? topics : null,
        keywords: keywords.length > 0 ? keywords : null,
        short_description: shortDescription || null,
        status: "pending", // Default to pending for admin review
        created_at: now.toISOString(),
      });

      if (insertError) throw insertError;

      setSuccessModalOpen(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "An error occurred while adding the link");
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!stripePublishableKey || !user) {
      setError("Stripe is not configured. Please contact support.");
      return;
    }
    
    // Dynamically load Stripe on payment attempt (using any to avoid type issues during build)
    const stripeModule: any = await import("@stripe/stripe-js");
    const loadStripe = stripeModule.loadStripe;
    if (!loadStripe) {
      setError("Failed to load Stripe library. Please try again.");
      return;
    }
    const stripe = await loadStripe(stripePublishableKey);
    
    if (!stripe) {
      setError("Failed to load Stripe. Please try again.");
      return;
    }

    setCheckoutLoading(true);
    setError(null);

    try {
      // Use the directory subscription price ID (€1/year per link)
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "price_llms_txt", // Should be set to €1/year price
          email: user.email || "",
          userId: (user as any)?.id || user.email,
          type: "link", // Indicate this is for adding a link
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
      setCheckoutLoading(false);
    }
  };

  if (status === "loading" || checkingSubscription) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <Spinner className="h-8 w-8 mx-auto mb-4" />
            <p className="font-mono text-muted-foreground">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!session || !user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <p className="font-mono text-sm text-accent mb-2">// ADD NEW ENTRY</p>
            <h1 className="font-mono text-3xl font-bold mb-2">Add Link</h1>
            <p className="text-sm text-muted-foreground">Submit your website or blog to the LLMO Directory</p>
          </div>

          <Card className="p-6 border-border">
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm font-mono">
                {error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="url" className="font-mono text-sm">
                  Website URL *
                </Label>
                <Input
                  id="url"
                  name="url"
                  type="url"
                  placeholder="https://example.com"
                  className="font-mono"
                  required
                />
                <p className="text-xs text-muted-foreground">Full URL including https://</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="font-mono text-sm">
                  Title (Optional)
                </Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="My Awesome Blog"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Leave empty to use URL as title</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="font-mono text-sm">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe your website or blog..."
                  className="font-mono resize-none"
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  A clear description helps AI understand your content (min. 50 characters)
                </p>
              </div>

              {/* Hierarchical Category System */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category_level1" className="font-mono text-sm">
                    Category Level 1 *
                  </Label>
                  <Select value={categoryLevel1} onValueChange={setCategoryLevel1} required>
                    <SelectTrigger className="font-mono">
                      <SelectValue placeholder="Select category level 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryLevel1Options.map((cat) => (
                        <SelectItem key={cat} value={cat} className="font-mono">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Main category type</p>
                </div>

                {categoryLevel1 && categoryLevel2Options[categoryLevel1] && (
                  <div className="space-y-2">
                    <Label htmlFor="category_level2" className="font-mono text-sm">
                      Category Level 2 (Optional)
                    </Label>
                    <Select value={categoryLevel2} onValueChange={setCategoryLevel2}>
                      <SelectTrigger className="font-mono">
                        <SelectValue placeholder="Select category level 2" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="" className="font-mono">
                          None
                        </SelectItem>
                        {categoryLevel2Options[categoryLevel1].map((cat) => (
                          <SelectItem key={cat} value={cat} className="font-mono">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Platform or subcategory</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="category_level3" className="font-mono text-sm">
                    Category Level 3 (Optional)
                  </Label>
                  <Select value={categoryLevel3} onValueChange={setCategoryLevel3}>
                    <SelectTrigger className="font-mono">
                      <SelectValue placeholder="Select category level 3" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="font-mono">
                        None
                      </SelectItem>
                       {categoryLevel3Options.map((cat) => (
                        <SelectItem key={cat} value={cat} className="font-mono">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Topic or theme</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="font-mono text-sm">
                  Type *
                </Label>
                <Select value={type} onValueChange={setType} required>
                  <SelectTrigger className="font-mono">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t} value={t.toLowerCase()} className="font-mono">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">What type of website is this?</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform" className="font-mono text-sm">
                  Platform (Optional)
                </Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="font-mono">
                    <SelectValue placeholder="Select a platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((p) => (
                      <SelectItem key={p} value={p.toLowerCase()} className="font-mono">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">What platform is this built on?</p>
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-sm">Topics (Optional)</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {topics.map((topic) => (
                    <div key={topic} className="flex items-center space-x-2">
                      <Checkbox
                        id={`topic-${topic}`}
                        checked={selectedTopics.includes(topic)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTopics([...selectedTopics, topic]);
                          } else {
                            setSelectedTopics(selectedTopics.filter((t) => t !== topic));
                          }
                        }}
                      />
                      <Label
                        htmlFor={`topic-${topic}`}
                        className="font-mono text-sm font-normal cursor-pointer"
                      >
                        {topic}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Select relevant topics for your site</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords" className="font-mono text-sm">
                  Keywords (Optional, max 5)
                </Label>
                <Input
                  id="keywords"
                  name="keywords"
                  type="text"
                  placeholder="keyword1, keyword2, keyword3"
                  className="font-mono"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated keywords (max 5). Current: {keywords.split(",").filter((k) => k.trim().length > 0).length}/5
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="short_description" className="font-mono text-sm">
                  Short Description (Optional, max 280 characters)
                </Label>
                <Textarea
                  id="short_description"
                  name="short_description"
                  placeholder="A brief summary of your website..."
                  className="font-mono resize-none"
                  rows={3}
                  maxLength={280}
                />
                <p className="text-xs text-muted-foreground">
                  A concise description (max 280 characters) for quick previews
                </p>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="bg-muted/30 p-4 rounded-md mb-4">
                  <p className="font-mono text-xs text-muted-foreground">
                    // SYSTEM MESSAGE: First link is free for 3 months. After that, €1/year per link.
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="h-4 w-4" />
                      Submitting...
                    </span>
                  ) : (
                    "Add My Site"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>

      <Footer />

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="font-mono">
          <DialogHeader>
            <DialogTitle>Trial Period Expired</DialogTitle>
            <DialogDescription className="text-muted-foreground leading-relaxed">
              Your free period has ended. Add more links for $1/year per link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-4">
            <Button
              onClick={handlePayment}
              disabled={checkoutLoading}
              className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent flex-1"
            >
              {checkoutLoading ? (
                <span className="flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Processing...
                </span>
              ) : (
                "Pay $1 Now"
              )}
            </Button>
            <Button
              onClick={() => setPaymentModalOpen(false)}
              variant="outline"
              className="font-mono bg-transparent flex-1"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="font-mono">
          <DialogHeader>
            <DialogTitle className="text-2xl">🎉 Your link was added to the LLMO Directory!</DialogTitle>
            <DialogDescription className="text-muted-foreground leading-relaxed mt-2">
              Your website has been submitted and will be reviewed. You'll receive a confirmation email shortly.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-6">
            <Button
              onClick={() => router.push("/dashboard")}
              className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent flex-1"
            >
              View My Links
            </Button>
            <Button
              onClick={() => {
                setSuccessModalOpen(false);
                // Reset form
                const form = document.querySelector("form");
                form?.reset();
                setCategory("");
                setType("");
                setPlatform("");
                setSelectedTopics([]);
                setKeywords("");
              }}
              variant="outline"
              className="font-mono bg-transparent flex-1"
            >
              Add Another Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

