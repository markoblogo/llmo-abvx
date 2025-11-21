"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/lib/supabaseClient";
import {
  Crown,
  Calendar,
  LinkIcon,
  Plus,
  Brain,
  CreditCard,
  ExternalLink,
  AlertCircle,
  Star,
  Zap,
  RefreshCcw,
  Users,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
// Stripe loaded dynamically to avoid build issues

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
// stripePromise initialized in component

type LinkData = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  category: string;
  category_level1?: string | null;
  category_level2?: string | null;
  category_level3?: string | null;
  tags: string[];
  status: string;
  created_at: string;
  updated_at: string;
  llms_file_status?: string | null;
  llms_last_update?: string | null;
  is_featured?: boolean;
  featured_until?: string | null;
};

type SubscriptionData = {
  id: string;
  plan: string;
  links_allowed: number;
  expiry_date: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  start_date: string;
};

type PaymentData = {
  hasPaymentMethod: boolean;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const user = session?.user;

  const [links, setLinks] = useState<LinkData[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);
  const [boostLoading, setBoostLoading] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [analyzerScore, setAnalyzerScore] = useState<number | null>(null);
  const [metadataReport, setMetadataReport] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [analyzerLoading, setAnalyzerLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (!session || !user) {
      router.push("/login?next=/dashboard");
      return;
    }

    fetchDashboardData();
  }, [session, status, router, user, searchParams]);

  useEffect(() => {
    if (!user || loading) return;

    // Handle successful renewal
    const renewed = searchParams?.get("renewed");
    if (renewed === "true") {
      // Refresh subscription data
      fetchDashboardData();
      // Clean URL
      router.replace("/dashboard");
    }

    // Handle successful llms.txt update
    const llmsUpdated = searchParams?.get("llms_updated");
    if (llmsUpdated) {
      // Update the link's llms_last_update field
      updateLlmsStatus(llmsUpdated);
      // Clean URL
      router.replace("/dashboard");
    }

    // Handle successful boost
    const boosted = searchParams?.get("boosted");
    if (boosted) {
      // Refresh links to show updated featured status
      fetchDashboardData();
      // Clean URL
      router.replace("/dashboard");
    }
  }, [searchParams, router, user, loading]);

  const updateLlmsStatus = async (linkId: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("links")
        .update({
          llms_file_status: "updated",
          llms_last_update: now,
        })
        .eq("id", linkId);

      if (!error) {
        // Refresh links
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Error updating llms status:", err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const userId = (user as any)?.id || user?.email;
      if (!userId) {
        router.push("/login");
        return;
      }

      // Fetch subscription
      const { data: subscriptionData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .single();

      setSubscription(subscriptionData || null);

      // Fetch links
      const { data: linksData } = await supabase
        .from("links")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      setLinks(linksData || []);
      setSubscription(subscriptionData || null);

      setLoading(false);

      // Fetch payment data from Stripe after subscription is set
      if (subscriptionData?.stripe_customer_id) {
        await fetchStripePaymentData(subscriptionData.stripe_customer_id);
      }

      // Fetch stats
      await fetchStats();

      // Fetch team members if agency plan
      if (subscriptionData?.plan === "agency") {
        await fetchTeamMembers();
      }
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/user/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchTeamMembers = async () => {
    // Only fetch if user has agency plan
    // Check subscription from state or pass it as parameter
    const currentSubscription = subscription;
    if (currentSubscription?.plan !== "agency") {
      setTeamMembers([]);
      return;
    }

    try {
      const response = await fetch("/api/agency/members");
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.members || []);
      } else if (response.status === 403) {
        // User doesn't have agency plan
        setTeamMembers([]);
      } else {
        console.error("Failed to fetch team members");
        setTeamMembers([]);
      }
    } catch (err) {
      console.error("Error fetching team members:", err);
      setTeamMembers([]);
    }
  };

  const handleRunAnalyzer = async () => {
    if (!links.length) {
      alert("Please add a link first");
      return;
    }
    setAnalyzerLoading(true);
    try {
      const firstLink = links[0];
      const response = await fetch("/api/analyzer-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: firstLink.url }),
      });
      if (response.ok) {
        const data = await response.json();
        setAnalyzerScore(data.score);
        await fetchStats();
      }
    } catch (err: any) {
      alert(err.message || "Failed to run analyzer");
    } finally {
      setAnalyzerLoading(false);
    }
  };

  const handleGenerateMetadata = async () => {
    if (!links.length) {
      alert("Please add a link first");
      return;
    }
    router.push("/metadata");
  };

  const handleInviteMember = async () => {
    if (!inviteEmail) {
      alert("Please enter an email address");
      return;
    }
    setInviteLoading(true);
    try {
      const response = await fetch("/api/agency/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      if (response.ok) {
        setInviteEmail("");
        setInviteDialogOpen(false);
        await fetchStats();
        await fetchTeamMembers(); // Refresh team members list
        alert("Member invited successfully");
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to invite member");
      }
    } catch (err: any) {
      alert(err.message || "Failed to invite member");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      const response = await fetch("/api/agency/member", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (response.ok) {
        await fetchStats();
        await fetchTeamMembers(); // Refresh team members list
        alert("Member removed successfully");
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove member");
      }
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    }
  };

  const fetchStripePaymentData = async (customerId: string) => {
    try {
      const response = await fetch("/api/stripe-payment-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentData(data);
      }
    } catch (err) {
      console.error("Error fetching payment data:", err);
    }
  };

  const handleStripePortal = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/stripe-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create portal session");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      alert(err.message || "Failed to open billing portal");
      setPortalLoading(false);
    }
  };

  const handleRenewal = async () => {
    setRenewalLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "price_llms_txt",
          email: user?.email || "",
          userId: (user as any)?.id || user?.email,
          type: "subscription",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create checkout session");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      alert(err.message || "Failed to start checkout");
      setRenewalLoading(false);
    }
  };

  const handleUpdateLlms = async (linkId: string) => {
    if (!stripePublishableKey) {
      alert("Stripe is not configured. Please contact support.");
      return;
    }

    setUpdateLoading(linkId);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: "price_llms_txt",
          email: user?.email || "",
          userId: (user as any)?.id || user?.email,
          type: "llms_txt",
          linkId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create checkout session");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      alert(err.message || "Failed to start checkout");
      setUpdateLoading(null);
    }
  };

  const handleBoostLink = async (linkId: string) => {
    if (!stripePublishableKey) {
      alert("Stripe is not configured. Please contact support.");
      return;
    }

    setBoostLoading(linkId);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email || "",
          userId: (user as any)?.id || user?.email,
          type: "boost",
          linkId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create checkout session");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      alert(err.message || "Failed to start checkout");
      setBoostLoading(null);
    }
  };

  const checkLlmsStatus = (link: LinkData): { status: "updated" | "needs-update"; daysOld: number } => {
    if (!link.llms_last_update) {
      return { status: "needs-update", daysOld: Infinity };
    }

    const lastUpdate = new Date(link.llms_last_update);
    const now = new Date();
    const daysOld = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      status: daysOld < 90 ? "updated" : "needs-update",
      daysOld,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <Spinner className="h-8 w-8 mx-auto mb-4" />
            <p className="font-mono text-muted-foreground">Loading dashboard...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!session || !user) {
    return null; // Will redirect
  }

  const isExpired = subscription ? new Date(subscription.expiry_date) < new Date() : false;
  const daysUntilExpiry = subscription
    ? Math.ceil((new Date(subscription.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const totalLinks = links.length;
  const activeLinks = links.filter((link) => link.status === "approved" || link.status === "active").length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <p className="font-mono text-sm text-accent mb-2">// MY DASHBOARD</p>
          <h1 className="font-mono text-3xl font-bold mb-2">My Dashboard</h1>
          <p className="text-muted-foreground mb-6">
            Manage your links, subscriptions, and AI optimization status.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/add-link">
              <Button className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent">
                <Plus className="h-4 w-4 mr-2" />
                Add New Link
              </Button>
            </Link>
            <Link href="/my-links">
              <Button variant="outline" className="font-mono bg-transparent">
                <LinkIcon className="h-4 w-4 mr-2" />
                My Links
              </Button>
            </Link>
            <Button
              variant="outline"
              className="font-mono bg-transparent"
              onClick={handleRunAnalyzer}
              disabled={analyzerLoading || !links.length}
            >
              {analyzerLoading ? (
                <Spinner className="h-4 w-4 mr-2" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              Run Analyzer Pro
            </Button>
            <Button
              variant="outline"
              className="font-mono bg-transparent"
              onClick={handleGenerateMetadata}
              disabled={!links.length}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Metadata
            </Button>
            {subscription?.plan === "free" && (
              <Link href="/pricing">
                <Button className="font-mono bg-accent/20 text-accent hover:bg-accent/30">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro ($9/year)
                </Button>
              </Link>
            )}
            {subscription?.stripe_customer_id && (
              <Button
                variant="outline"
                className="font-mono bg-transparent"
                onClick={handleStripePortal}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Loading...
                  </span>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Change Card
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Expiration Banner */}
        {isExpired && (
          <Card className="p-4 border-red-500/50 bg-red-500/10 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-mono text-sm font-semibold text-red-500 mb-1">
                  ⚠️ Your subscription expired.
                </p>
                <p className="text-sm text-red-500/80 mb-3">
                  Renew for $1/year to keep your links active.
                </p>
                <Button
                  size="sm"
                  onClick={handleRenewal}
                  disabled={renewalLoading}
                  className="font-mono bg-red-500 text-white hover:bg-red-600"
                >
                  {renewalLoading ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="h-4 w-4" />
                      Processing...
                    </span>
                  ) : (
                    "Renew for $1/year"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Subscription Status Card */}
        {subscription && (
          <Card className="p-6 border-accent/50 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-5 w-5 text-accent" />
                  <h2 className="font-mono text-lg font-semibold">Subscription Status</h2>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-mono font-semibold ${
                isExpired
                  ? "bg-red-500/10 text-red-500"
                  : "bg-green-500/10 text-green-500"
              }`}>
                {isExpired ? "🔴 Expired" : "🟢 Active"}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 border border-border rounded-md">
                <p className="font-mono text-xs text-muted-foreground mb-2">Plan</p>
                <p className="font-mono text-xl font-bold capitalize">
                  {subscription.plan === "free" ? "Free Trial" : "Pro (Paid)"}
                </p>
              </div>

              <div className="p-4 border border-border rounded-md">
                <p className="font-mono text-xs text-muted-foreground mb-2">Expiration</p>
                <p className="font-mono text-sm font-bold">
                  {new Date(subscription.expiry_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  {isExpired ? "Expired" : `${daysUntilExpiry} days left`}
                </p>
              </div>

              <div className="p-4 border border-border rounded-md">
                <p className="font-mono text-xs text-muted-foreground mb-2">Links</p>
                <p className="font-mono text-xl font-bold">
                  {totalLinks} / {subscription.links_allowed === 999 ? "∞" : subscription.links_allowed}
                </p>
              </div>
            </div>

            {isExpired && (
              <Button
                onClick={handleRenewal}
                disabled={renewalLoading}
                className="w-full font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent mb-3"
              >
                {renewalLoading ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Processing...
                  </span>
                ) : (
                  "Renew for $1/year"
                )}
              </Button>
            )}

            {/* Auto-renewal info for Pro/Agency */}
            {(subscription.plan === "pro" || subscription.plan === "agency") && !isExpired && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCcw className="h-4 w-4 text-accent" />
                  <p className="font-mono text-xs text-muted-foreground">Auto-renewal enabled</p>
                  <Badge className="font-mono text-xs bg-green-500/10 text-green-500">Active</Badge>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  Your subscription will automatically renew on {new Date(subscription.expiry_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}

            {/* Change Card Button - Show for Pro users with Stripe customer */}
            {subscription.stripe_customer_id && (subscription.plan === "pro" || subscription.plan === "agency") && !isExpired && (
              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={handleStripePortal}
                  disabled={portalLoading}
                  className="font-mono bg-transparent w-full sm:w-auto"
                >
                  {portalLoading ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="h-4 w-4" />
                      Loading...
                    </span>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Manage Billing
                    </>
                  )}
                </Button>
                <p className="font-mono text-xs text-muted-foreground mt-2">
                  Update your payment method or manage your subscription
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Stats Overview Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Links"
              value={stats.totalLinks || 0}
              icon={LinkIcon}
              subtitle={`${stats.approvedLinks || 0} approved`}
            />
            <StatCard
              title="Featured"
              value={stats.featuredLinks || 0}
              icon={Star}
              subtitle="Active boosts"
            />
            <StatCard
              title="llms.txt Updated"
              value={stats.llmsUpdated || 0}
              icon={RefreshCcw}
              subtitle={`${stats.llmsOutdated || 0} need update`}
            />
            <StatCard
              title="Metadata Reports"
              value={stats.metadataGenerations || 0}
              icon={Sparkles}
              subtitle="Generated"
            />
          </div>
        )}

        {/* AI Performance Block */}
        <Card className="p-6 border-border mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-accent" />
              <h2 className="font-mono text-lg font-semibold">AI Performance (Analyzer Pro)</h2>
            </div>
            {subscription?.plan === "free" && (
              <Badge className="font-mono text-xs bg-accent/10 text-accent">Pro Feature</Badge>
            )}
          </div>

          {analyzerScore !== null ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-mono text-xs text-muted-foreground mb-1">AI Visibility Score</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-3xl font-bold text-foreground">{analyzerScore}</p>
                    <Badge
                      className={`font-mono text-xs ${
                        analyzerScore > 70
                          ? "bg-green-500/10 text-green-500"
                          : analyzerScore > 40
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {analyzerScore > 70 ? "High" : analyzerScore > 40 ? "Medium" : "Low"}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRunAnalyzer}
                  disabled={analyzerLoading || !links.length}
                  className="font-mono"
                >
                  {analyzerLoading ? (
                    <Spinner className="h-4 w-4 mr-2" />
                  ) : (
                    <RefreshCcw className="h-4 w-4 mr-2" />
                  )}
                  Run Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="font-mono text-sm text-muted-foreground mb-4">
                {subscription?.plan === "free"
                  ? "Upgrade to Pro to access AI Performance Analyzer"
                  : "Run Analyzer Pro to see your AI visibility score"}
              </p>
              <Button
                onClick={handleRunAnalyzer}
                disabled={analyzerLoading || !links.length || subscription?.plan === "free"}
                className="font-mono bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {analyzerLoading ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                Run Analyzer Pro
              </Button>
            </div>
          )}
        </Card>

        {/* Metadata Insights */}
        <Card className="p-6 border-border mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <h2 className="font-mono text-lg font-semibold">Metadata Insights</h2>
            </div>
            {subscription?.plan !== "free" && (
              <Badge className="font-mono text-xs bg-green-500/10 text-green-500">
                Auto-updates every 90 days
              </Badge>
            )}
          </div>

          {stats?.metadataGenerations > 0 ? (
            <div className="space-y-3">
              <p className="font-mono text-sm text-muted-foreground">
                You have generated {stats.metadataGenerations} metadata report(s)
              </p>
              <Link href="/metadata">
                <Button variant="outline" className="font-mono bg-transparent w-full">
                  <Sparkles className="h-4 w-4 mr-2" />
                  View Metadata Generator
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="font-mono text-sm text-muted-foreground mb-4">
                Generate AI-powered metadata suggestions for better SEO
              </p>
              <Link href="/metadata">
                <Button className="font-mono bg-accent text-accent-foreground hover:bg-accent/90">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Metadata ($1)
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Boost & Promotion */}
        {stats?.featuredLinks > 0 && (
          <Card className="p-6 border-yellow-500/30 bg-yellow-500/5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-yellow-500" />
              <h2 className="font-mono text-lg font-semibold">Boost & Promotion</h2>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="font-mono text-sm bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                ⭐ {stats.featuredLinks} Active Feature(s)
              </Badge>
              <p className="font-mono text-xs text-muted-foreground">
                Featured links appear at the top of the directory for 30 days
              </p>
            </div>
          </Card>
        )}

        {/* Auto llms.txt Updates */}
        {subscription && (
          <Card className="p-6 border-border mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <RefreshCcw className="h-5 w-5 text-accent" />
                <h2 className="font-mono text-lg font-semibold">Auto llms.txt Updates</h2>
              </div>
               {subscription.plan !== "free" && (
                <Badge className="font-mono text-xs bg-green-500/10 text-green-500">
                  Auto-update enabled ✅
                </Badge>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold">Last Update</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {links.find((l) => l.llms_last_update)?.llms_last_update
                      ? new Date(links.find((l) => l.llms_last_update)!.llms_last_update!).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )
                      : "Never"}
                  </p>
                </div>
                {subscription.plan !== "free" && (
                  <Badge className="font-mono text-xs bg-yellow-500/10 text-yellow-500">
                    Enable in settings
                  </Badge>
                )}
              </div>
              {subscription.plan === "free" && (
                <p className="font-mono text-xs text-muted-foreground">
                  Upgrade to Pro or Agency to enable automatic llms.txt regeneration every 90 days
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Enhanced Subscription Summary */}
        {subscription && (
          <Card className="p-6 border-border mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="h-5 w-5 text-accent" />
              <h2 className="font-mono text-lg font-semibold">Subscription Summary</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 border border-border rounded-md">
                <p className="font-mono text-xs text-muted-foreground mb-2">Current Plan</p>
                <p className="font-mono text-xl font-bold capitalize">{subscription.plan}</p>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  {subscription.plan === "free"
                    ? "Free Trial"
                    : subscription.plan === "pro"
                      ? "$9/year"
                      : "$30/year"}
                </p>
              </div>
              <div className="p-4 border border-border rounded-md">
                <p className="font-mono text-xs text-muted-foreground mb-2">Next Renewal</p>
                <p className="font-mono text-sm font-bold">
                  {new Date(subscription.expiry_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  {isExpired ? "Expired" : `${daysUntilExpiry} days left`}
                </p>
              </div>
            </div>
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="font-mono text-xs text-muted-foreground mb-1">Total Links</p>
                  <p className="font-mono text-lg font-bold">{stats.totalLinks || 0}</p>
                </div>
                <div>
                  <p className="font-mono text-xs text-muted-foreground mb-1">Paid Boosts</p>
                  <p className="font-mono text-lg font-bold">{stats.featuredLinks || 0}</p>
                </div>
                <div>
                  <p className="font-mono text-xs text-muted-foreground mb-1">Analyzer Runs</p>
                  <p className="font-mono text-lg font-bold">{stats.analyzerProRuns || 0}</p>
                </div>
                <div>
                  <p className="font-mono text-xs text-muted-foreground mb-1">Metadata</p>
                  <p className="font-mono text-lg font-bold">{stats.metadataGenerations || 0}</p>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Team Section (Agency only) */}
        {subscription?.plan === "agency" && (
          <Card className="p-6 border-border mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                <h2 className="font-mono text-lg font-semibold">Team Members</h2>
              </div>
              <Button
                size="sm"
                onClick={() => setInviteDialogOpen(true)}
                className="font-mono bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </div>
            {teamMembers.length > 0 ? (
              <div className="space-y-3">
                <p className="font-mono text-sm text-muted-foreground">
                  {teamMembers.length} team member(s) with shared access to agency links
                </p>
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-mono text-sm font-semibold">
                            {member.fullName || member.email || "Unknown User"}
                          </p>
                          {member.role === "owner" && (
                            <Badge variant="outline" className="font-mono text-xs">
                              Owner
                            </Badge>
                          )}
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">{member.email}</p>
                        <p className="font-mono text-xs text-muted-foreground mt-1">
                          Added {new Date(member.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {member.role !== "owner" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveMember(member.id)}
                          className="font-mono text-xs ml-4"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="font-mono text-sm text-muted-foreground mb-4">
                  You don't have team members yet. Invite team members to collaborate on your agency links.
                </p>
                <Button
                  onClick={() => setInviteDialogOpen(true)}
                  className="font-mono bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Invite First Member
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Links Table */}
        <Card className="p-6 border-border mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-mono text-lg font-semibold mb-1">My Links</h2>
              <p className="text-sm text-muted-foreground">{totalLinks} total • {activeLinks} active</p>
            </div>
            <Link href="/add-link">
              <Button size="sm" className="font-mono bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </Link>
          </div>

          {links.length === 0 ? (
            <div className="text-center py-12">
              <LinkIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-mono text-muted-foreground mb-4">No links yet</p>
              <Link href="/add-link">
                <Button className="font-mono bg-accent text-accent-foreground hover:bg-accent/90">
                  Add Your First Link
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-mono text-xs text-muted-foreground uppercase">URL</th>
                    <th className="text-left py-3 px-4 font-mono text-xs text-muted-foreground uppercase">Category</th>
                    <th className="text-left py-3 px-4 font-mono text-xs text-muted-foreground uppercase">Status</th>
                    <th className="text-left py-3 px-4 font-mono text-xs text-muted-foreground uppercase">
                      llms.txt File
                    </th>
                    <th className="text-left py-3 px-4 font-mono text-xs text-muted-foreground uppercase">Boost</th>
                    <th className="text-left py-3 px-4 font-mono text-xs text-muted-foreground uppercase">Added On</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((link) => {
                    const llmsStatus = checkLlmsStatus(link);
                    return (
                      <tr key={link.id} className="border-b border-border hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm text-accent hover:underline flex items-center gap-1"
                          >
                            {link.url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs text-muted-foreground">
                            {(() => {
                              // Build full category path from hierarchical categories
                              const parts: string[] = [];
                              if (link.category_level1) parts.push(link.category_level1);
                              if (link.category_level2) parts.push(link.category_level2);
                              if (link.category_level3) parts.push(link.category_level3);
                              
                              // If hierarchical categories exist, use them
                              if (parts.length > 0) {
                                return parts.join(" → ");
                              }
                              
                              // Fallback to legacy category or "Other"
                              return link.category || "Other";
                            })()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-mono text-xs px-2 py-1 rounded ${
                              link.status === "approved" || link.status === "active"
                                ? "bg-green-500/10 text-green-500"
                                : link.status === "pending"
                                  ? "bg-yellow-500/10 text-yellow-500"
                                  : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            {link.status === "approved" || link.status === "active"
                              ? "🟢 Active"
                              : link.status === "pending"
                                ? "🕓 Pending approval"
                                : "🔴 Expired or unpaid"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {llmsStatus.status === "updated" ? (
                              <span className="font-mono text-xs text-green-500">🟢 Updated</span>
                            ) : (
                              <>
                                <span className="font-mono text-xs text-red-500">🔴 Needs Update</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateLlms(link.id)}
                                  disabled={updateLoading === link.id}
                                  className="font-mono text-xs h-6 px-2"
                                >
                                  {updateLoading === link.id ? (
                                    <Spinner className="h-3 w-3" />
                                  ) : (
                                    "Update File ($1)"
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {link.is_featured && link.featured_until && new Date(link.featured_until) > new Date() ? (
                            <span className="font-mono text-xs text-yellow-500 flex items-center gap-1">
                              ⭐ Featured until {new Date(link.featured_until).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleBoostLink(link.id)}
                              disabled={boostLoading === link.id || link.status !== "approved"}
                              className="font-mono text-xs h-6 px-2"
                            >
                              {boostLoading === link.id ? (
                                <Spinner className="h-3 w-3" />
                              ) : (
                                "Boost ($3)"
                              )}
                            </Button>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs text-muted-foreground">
                            {new Date(link.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Payment Summary Card */}
        <Card className="p-6 border-border">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-accent" />
            <h2 className="font-mono text-lg font-semibold">Payment Summary</h2>
          </div>

          {paymentData?.hasPaymentMethod ? (
            <div className="space-y-4">
              <div className="p-4 border border-border rounded-md bg-muted/30">
                <p className="font-mono text-xs text-muted-foreground mb-2">Payment Method</p>
                <p className="font-mono text-sm font-semibold">
                  •••• •••• •••• {paymentData.last4} ({paymentData.brand})
                </p>
                {paymentData.expiryMonth && paymentData.expiryYear && (
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    Expires {paymentData.expiryMonth}/{paymentData.expiryYear}
                  </p>
                )}
              </div>

              {paymentData.lastPaymentDate && (
                <div className="p-4 border border-border rounded-md bg-muted/30">
                  <p className="font-mono text-xs text-muted-foreground mb-2">Last Payment</p>
                  <p className="font-mono text-sm font-semibold">
                    ${((paymentData.lastPaymentAmount || 0) / 100).toFixed(2)} on{" "}
                    {new Date(paymentData.lastPaymentDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                onClick={handleStripePortal}
                disabled={portalLoading}
                className="font-mono bg-transparent w-full"
              >
                {portalLoading ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Loading...
                  </span>
                ) : (
                  "View in Stripe Portal"
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="font-mono text-sm text-muted-foreground mb-4">
                No payment method added yet.
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                Add a payment method when you make your first purchase.
              </p>
            </div>
          )}
        </Card>

        {/* Invite Member Dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent className="font-mono">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Add a team member by email. They'll have shared access to all agency links.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
                className="font-mono bg-transparent"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteMember}
                disabled={inviteLoading || !inviteEmail}
                className="font-mono bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {inviteLoading ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Inviting...
                  </span>
                ) : (
                  "Invite Member"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  );
}
