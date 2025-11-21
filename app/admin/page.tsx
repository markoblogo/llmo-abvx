"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";

type AdminStats = {
  users: {
    total: number;
    newLast7Days: number;
  };
  subscriptions: {
    active: number;
    expired: number;
    planDistribution: {
      free: number;
      pro: number;
      agency: number;
    };
  };
  analyzed: {
    total: number;
    totalRuns: number;
  };
  links: {
    total: number;
    featured: number;
    unpaid: number;
  };
  llms: {
    updated: number;
    outdated: number;
    updatedPercent: string;
  };
  downloads: {
    total: number;
    uniqueDownloaders: number;
  };
  revenue: {
    total: number;
    breakdown: {
      subscriptions: number;
      metadata: number;
      boost: number;
    };
  };
  aiVisibility: {
    avgScore: number;
    llmsUpdatedPercent: number;
    totalAnalyzerRuns: number;
  };
  stripe: {
    available: number;
    pending: number;
    lastPayout: string | null;
  };
  services?: {
    analyzer: {
      runsToday: number;
      runsLast30Days: number;
      totalRuns: number;
      uniqueUsersLast30Days: number;
    };
    metadata: {
      generatedLast30Days: number;
      totalGenerated: number;
      uniqueUsersLast30Days: number;
    };
    llms: {
      autoUsers: number;
      updatedLast30Days: number;
    };
  };
  billing?: {
    paidUsers: number;
    activeByPlan: {
      free: number;
      pro: number;
      agency: number;
    };
    upcomingRenewals: Array<{
      userId: string;
      email: string;
      plan: string;
      expiryDate: string;
    }>;
  };
};

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/stats", {
          credentials: "include",
        });
        if (!response.ok) {
          // Try to read error message from response JSON
          let errorMessage = `Failed to fetch stats: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (jsonError) {
            // If JSON parsing fails, use default error message
            console.warn("[admin/page] Could not parse error response as JSON:", jsonError);
          }
          
          // Log status and error message for debugging
          console.error("[admin/page] API error:", {
            status: response.status,
            statusText: response.statusText,
            error: errorMessage,
          });
          
          throw new Error(errorMessage);
        }
        const data = await response.json();
        setStats(data);
      } catch (err: any) {
        console.error("Error fetching admin stats:", err);
        setError(err.message || "Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
          <p className="font-mono text-sm text-muted-foreground">Loading admin statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-mono text-3xl font-bold">// ADMIN PANEL</h1>
          <p className="mt-2 font-mono text-sm text-muted-foreground">// SYSTEM ERROR</p>
        </div>
        <Card className="p-6 border-red-500/50 bg-red-500/10">
          <p className="font-mono text-sm text-red-500">// ERROR: {error}</p>
          <p className="font-mono text-xs text-muted-foreground mt-2">
            If you believe this is an error, please contact support.
          </p>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-mono text-3xl font-bold">// ADMIN PANEL</h1>
          <p className="mt-2 font-mono text-sm text-muted-foreground">// SYSTEM MESSAGE: No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-3xl font-bold">// ADMIN PANEL</h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">// SYSTEM MESSAGE: Overview loaded</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="font-mono">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6 border-border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-muted-foreground">Total Users</p>
                  <p className="mt-2 font-mono text-3xl font-bold text-accent">{stats.users.total}</p>
                  {stats.users.newLast7Days > 0 && (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      +{stats.users.newLast7Days} last 7 days
                    </p>
                  )}
                </div>
                <div className="rounded-full bg-accent/10 p-3">
                  <span className="font-mono text-2xl">👥</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-muted-foreground">Active Subscriptions</p>
                  <p className="mt-2 font-mono text-3xl font-bold text-accent">{stats.subscriptions.active}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {stats.subscriptions.expired} expired
                  </p>
                </div>
                <div className="rounded-full bg-accent/10 p-3">
                  <span className="font-mono text-2xl">💳</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-muted-foreground">Avg AI Score</p>
                  <p className="mt-2 font-mono text-3xl font-bold text-accent">
                    {stats.aiVisibility.avgScore > 0 ? stats.aiVisibility.avgScore.toFixed(1) : "—"}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {stats.aiVisibility.totalAnalyzerRuns} runs
                  </p>
                </div>
                <div className="rounded-full bg-accent/10 p-3">
                  <span className="font-mono text-2xl">🧠</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-muted-foreground">Total Analyzer Runs</p>
                  <p className="mt-2 font-mono text-3xl font-bold text-accent">
                    {stats.aiVisibility.totalAnalyzerRuns}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {stats.analyzed.total} unique links
                  </p>
                </div>
                <div className="rounded-full bg-accent/10 p-3">
                  <span className="font-mono text-2xl">📊</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Services Section */}
          {stats.services && (
            <div>
              <h2 className="font-mono text-xl font-bold mb-4">// SERVICES</h2>
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="p-6 border-border bg-card">
                  <h3 className="font-mono text-lg font-semibold mb-4">Analyzer Pro</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                      <p className="font-mono text-sm">Runs (30d)</p>
                      <p className="font-mono font-bold text-accent">{stats.services.analyzer.runsLast30Days}</p>
                    </div>
                    <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                      <p className="font-mono text-sm">Unique Users (30d)</p>
                      <p className="font-mono font-bold text-accent">
                        {stats.services.analyzer.uniqueUsersLast30Days}
                      </p>
                    </div>
                    <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                      <p className="font-mono text-sm">Runs Today</p>
                      <p className="font-mono font-bold text-accent">{stats.services.analyzer.runsToday}</p>
                    </div>
                    <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                      <p className="font-mono text-sm">Total Runs</p>
                      <p className="font-mono font-bold text-accent">{stats.services.analyzer.totalRuns}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-border bg-card">
                  <h3 className="font-mono text-lg font-semibold mb-4">Metadata AI</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                      <p className="font-mono text-sm">Generated (30d)</p>
                      <p className="font-mono font-bold text-accent">
                        {stats.services.metadata.generatedLast30Days}
                      </p>
                    </div>
                    <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                      <p className="font-mono text-sm">Unique Users (30d)</p>
                      <p className="font-mono font-bold text-accent">
                        {stats.services.metadata.uniqueUsersLast30Days}
                      </p>
                    </div>
                    <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                      <p className="font-mono text-sm">Total Generated</p>
                      <p className="font-mono font-bold text-accent">{stats.services.metadata.totalGenerated}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-border bg-card">
                  <h3 className="font-mono text-lg font-semibold mb-4">llms.txt</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                      <p className="font-mono text-sm">Auto Users</p>
                      <p className="font-mono font-bold text-accent">{stats.services.llms.autoUsers}</p>
                    </div>
                    <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                      <p className="font-mono text-sm">Updated (30d)</p>
                      <p className="font-mono font-bold text-accent">{stats.services.llms.updatedLast30Days}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Billing Summary Section */}
          {stats.billing && (
            <div>
              <h2 className="font-mono text-xl font-bold mb-4">// BILLING SUMMARY</h2>
              <div className="grid gap-6 md:grid-cols-3 mb-6">
                <Card className="p-6 border-border bg-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm text-muted-foreground">Total Users</p>
                      <p className="mt-2 font-mono text-3xl font-bold text-accent">{stats.users.total}</p>
                    </div>
                    <div className="rounded-full bg-accent/10 p-3">
                      <span className="font-mono text-2xl">👥</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-border bg-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm text-muted-foreground">Paid Users</p>
                      <p className="mt-2 font-mono text-3xl font-bold text-accent">{stats.billing.paidUsers}</p>
                    </div>
                    <div className="rounded-full bg-accent/10 p-3">
                      <span className="font-mono text-2xl">💳</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-border bg-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm text-muted-foreground">Active Plans</p>
                      <p className="mt-2 font-mono text-lg font-bold text-accent">
                        F:{stats.billing.activeByPlan.free} P:{stats.billing.activeByPlan.pro} A:
                        {stats.billing.activeByPlan.agency}
                      </p>
                    </div>
                    <div className="rounded-full bg-accent/10 p-3">
                      <span className="font-mono text-2xl">📊</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Upcoming Renewals Table */}
              {stats.billing.upcomingRenewals && stats.billing.upcomingRenewals.length > 0 && (
                <Card className="p-6 border-border bg-card">
                  <h3 className="font-mono text-lg font-semibold mb-4">Upcoming Renewals (Next 30 Days)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="p-3 text-left font-mono text-sm font-semibold">Email</th>
                          <th className="p-3 text-left font-mono text-sm font-semibold">Plan</th>
                          <th className="p-3 text-left font-mono text-sm font-semibold">Expiry Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.billing.upcomingRenewals.slice(0, 10).map((renewal, index) => (
                          <tr key={index} className="border-b border-border hover:bg-accent/5">
                            <td className="p-3 font-mono text-sm">{renewal.email}</td>
                            <td className="p-3 font-mono text-sm">
                              <span className="rounded px-2 py-1 bg-accent/20 text-accent text-xs font-semibold">
                                {renewal.plan.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-sm">
                              {new Date(renewal.expiryDate).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {stats.billing.upcomingRenewals.length > 10 && (
                    <p className="font-mono text-xs text-muted-foreground mt-4">
                      Showing top 10 of {stats.billing.upcomingRenewals.length} upcoming renewals
                    </p>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* Additional Stats */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6 border-border bg-card">
              <h2 className="font-mono text-lg font-bold mb-4">Links Overview</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                  <p className="font-mono text-sm">Total Links</p>
                  <p className="font-mono font-bold text-accent">{stats.links.total}</p>
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                  <p className="font-mono text-sm">Featured Links</p>
                  <p className="font-mono font-bold text-accent">{stats.links.featured}</p>
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                  <p className="font-mono text-sm">Unpaid Links</p>
                  <p className="font-mono font-bold text-accent">{stats.links.unpaid}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border bg-card">
              <h2 className="font-mono text-lg font-bold mb-4">Subscription Plans</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                  <p className="font-mono text-sm">Free</p>
                  <p className="font-mono font-bold text-accent">{stats.subscriptions.planDistribution.free}</p>
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                  <p className="font-mono text-sm">Pro</p>
                  <p className="font-mono font-bold text-accent">{stats.subscriptions.planDistribution.pro}</p>
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                  <p className="font-mono text-sm">Agency</p>
                  <p className="font-mono font-bold text-accent">{stats.subscriptions.planDistribution.agency}</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <Card className="p-6 border-border bg-card">
            <p className="font-mono text-sm text-muted-foreground">// TODO: Users management</p>
            <p className="font-mono text-xs text-muted-foreground mt-2">
              Users management will be implemented here. For now, visit{" "}
              <Link href="/admin/users" className="text-accent hover:underline">
                /admin/users
              </Link>
              .
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card className="p-6 border-border bg-card">
            <p className="font-mono text-sm text-muted-foreground">// TODO: Subscriptions management</p>
            <p className="font-mono text-xs text-muted-foreground mt-2">
              Subscriptions management will be implemented here. For now, visit{" "}
              <Link href="/admin/subscriptions" className="text-accent hover:underline">
                /admin/subscriptions
              </Link>
              .
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="emails">
          <Card className="p-6 border-border bg-card">
            <p className="font-mono text-sm text-muted-foreground">// TODO: Email logs</p>
            <p className="font-mono text-xs text-muted-foreground mt-2">
              Email logs will be implemented here. For now, visit{" "}
              <Link href="/admin/emails" className="text-accent hover:underline">
                /admin/emails
              </Link>
              .
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
