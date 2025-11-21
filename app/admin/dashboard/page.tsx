"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Link as LinkIcon,
  Brain,
  DollarSign,
  BookOpen,
  Settings,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Download,
  Mail,
  CreditCard,
  FileText,
  Calendar,
} from "lucide-react";

type SummaryData = {
  usersTotal: number;
  linksTotal: number;
  analyzedTotal: number;
  paidLinksTotal: number;
  unpaidLinksTotal: number;
  activeSubs: number;
  expiredSubs: number;
  llmsUpdated: number;
  llmsOutdated: number;
  bookDownloads: number;
  totalRevenue: number;
  usersTrend?: string;
  linksTrend?: string;
  revenueTrend?: string;
};

type UserData = {
  id: string;
  email: string;
  name: string;
  registeredDate: string;
  linksAdded: number;
  llmsTxtPurchased: number;
  subscriptionExpiry: string | null;
  subscriptionPlan: string;
  status: string;
  role: string;
};

type LinkData = {
  id: string;
  url: string;
  title: string;
  category: string;
  owner_email: string;
  created_at: string;
  status: string;
  llms_file_status: string | null;
  llms_last_update: string | null;
  payment_status: string;
};

type StripeBalanceData = {
  available: number;
  pending: number;
  totalRevenue: number;
  totalRevenueYTD?: number;
  lastPayout: string | null;
  currency: string;
};

type StripeSummaryData = {
  available: number;
  pending: number;
  totalRevenueYTD: number;
  lastPayout: string | null;
  currency: string;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [links, setLinks] = useState<LinkData[]>([]);
  const [stripeBalance, setStripeBalance] = useState<StripeBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [linksFilter, setLinksFilter] = useState({ category: "all", status: "all", payment: "all" });
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    users: any[];
    links: any[];
    payments: any[];
  } | null>(null);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [auditResults, setAuditResults] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [stripeSummary, setStripeSummary] = useState<StripeSummaryData | null>(null);
  const [stripeSummaryLoading, setStripeSummaryLoading] = useState(false);
  const [adminToolsInputs, setAdminToolsInputs] = useState({
    linkId: "",
    subscriptionId: "",
    userId: "",
    reminderEmail: "",
  });
  const [markingPaid, setMarkingPaid] = useState(false);
  const [grantingFree, setGrantingFree] = useState(false);

  const fetchAuditResults = useCallback(async () => {
    setAuditLoading(true);
    try {
      const response = await fetch("/api/admin/text-audit");
      if (!response.ok) throw new Error("Failed to fetch audit results");
      const data = await response.json();
      setAuditResults(data.results || []);
    } catch (err: any) {
      console.error("Error fetching audit results:", err);
      toast.error("Failed to load audit results");
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login?next=/admin/dashboard");
      return;
    }
    fetchData();

    // Setup Supabase Realtime subscription
    const channel = supabase
      .channel("admin-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "links" },
        () => {
          fetchSummary();
          toast.success("🔄 Dashboard updated", { duration: 1500 });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          fetchSummary();
          toast.success("🔄 Dashboard updated", { duration: 1500 });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions" },
        () => {
          fetchSummary();
          toast.success("🔄 Dashboard updated", { duration: 1500 });
        }
      )
      .subscribe();

    return () => {
      // Cleanup realtime subscription on unmount
      supabase.removeChannel(channel);
    };
  }, [session, status, router]);

  // Handle click outside search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch audit results when Text Audit tab is active
  useEffect(() => {
    if (activeTab === "text-audit") {
      fetchAuditResults();
    }
  }, [activeTab, fetchAuditResults]);

  // Fetch Stripe summary when Admin Tools tab is active
  const fetchStripeSummary = useCallback(async () => {
    setStripeSummaryLoading(true);
    try {
      const response = await fetch("/api/admin/stripe-summary");
      if (!response.ok) throw new Error("Failed to fetch Stripe summary");
      const data = await response.json();
      setStripeSummary(data);
    } catch (err: any) {
      console.error("Error fetching Stripe summary:", err);
      toast.error("Failed to load Stripe summary");
    } finally {
      setStripeSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "admin-tools") {
      fetchStripeSummary();
    }
  }, [activeTab, fetchStripeSummary]);

  // Admin tools handlers
  const handleMarkPaid = async () => {
    const { linkId, subscriptionId } = adminToolsInputs;
    if (!linkId && !subscriptionId) {
      toast.error("Please provide either Link ID or Subscription ID");
      return;
    }

    setMarkingPaid(true);
    try {
      const response = await fetch("/api/admin/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId: linkId || undefined, subscriptionId: subscriptionId || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to mark as paid");
      }

      const data = await response.json();
      toast.success(data.message || "Marked as paid successfully");
      setAdminToolsInputs((prev) => ({ ...prev, linkId: "", subscriptionId: "" }));
      fetchData(); // Refresh dashboard data
    } catch (err: any) {
      console.error("Error marking as paid:", err);
      toast.error(err.message || "Failed to mark as paid");
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleGrantFree = async () => {
    const { userId } = adminToolsInputs;
    if (!userId) {
      toast.error("Please provide User ID");
      return;
    }

    setGrantingFree(true);
    try {
      const response = await fetch("/api/admin/grant-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to grant free year");
      }

      const data = await response.json();
      toast.success(data.message || "Free year granted successfully");
      setAdminToolsInputs((prev) => ({ ...prev, userId: "" }));
      fetchData(); // Refresh dashboard data
    } catch (err: any) {
      console.error("Error granting free year:", err);
      toast.error(err.message || "Failed to grant free year");
    } finally {
      setGrantingFree(false);
    }
  };

  const handleSendReminder = async () => {
    const { reminderEmail } = adminToolsInputs;
    if (!reminderEmail) {
      toast.error("Please provide email address");
      return;
    }

    try {
      const response = await fetch("/api/admin/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: reminderEmail }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send reminder");
      }

      const data = await response.json();
      toast.success(data.message || "Reminder sent successfully");
      setAdminToolsInputs((prev) => ({ ...prev, reminderEmail: "" }));
    } catch (err: any) {
      console.error("Error sending reminder:", err);
      toast.error(err.message || "Failed to send reminder");
    }
  };

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) {
      setSearchResults(null);
      setSearchDropdownOpen(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        setSearchDropdownOpen(true);
      }
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input change with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
    } else {
      setSearchResults(null);
      setSearchDropdownOpen(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSummary(),
        fetchUsers(),
        fetchLinks(),
        fetchStripeBalance(),
      ]);
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    // Fetch from new stats API
    try {
      const statsResponse = await fetch("/api/admin/stats");
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        // Map new stats format to existing summary format
        setSummary({
          usersTotal: statsData.users?.total || 0,
          linksTotal: statsData.links?.total || 0,
          analyzedTotal: statsData.analyzed?.total || 0,
          paidLinksTotal: statsData.subscriptions?.active || 0,
          unpaidLinksTotal: statsData.links?.unpaid || 0,
          activeSubs: statsData.subscriptions?.active || 0,
          expiredSubs: statsData.subscriptions?.expired || 0,
          llmsUpdated: statsData.llms?.updated || 0,
          llmsOutdated: statsData.llms?.outdated || 0,
          bookDownloads: statsData.downloads?.total || 0,
          totalRevenue: statsData.revenue?.total || 0,
          usersTrend: statsData.users?.newLast7Days ? `+${statsData.users.newLast7Days} (7d)` : undefined,
          linksTrend: statsData.links?.featured ? `${statsData.links.featured} featured` : undefined,
          revenueTrend: undefined,
        });
        return; // Use new API data
      } else {
        throw new Error(`API returned ${statsResponse.status}`);
      }
    } catch (err) {
      console.error("Error fetching admin stats:", err);
      toast.error("Failed to load dashboard statistics");
      // Fallback to old method if new API fails
      try {
        const res = await fetch("/api/admin/summary");
        if (res.ok) {
          const data = await res.json();
          setSummary(data);
        }
      } catch (fallbackErr) {
        console.error("Error fetching summary fallback:", fallbackErr);
      }
    }
  };

  const fetchUsers = async (page = 1, search = "") => {
    try {
      const res = await fetch(`/api/admin/users?page=${page}&limit=50&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchLinks = async () => {
    try {
      const { category, status, payment } = linksFilter;
      const res = await fetch(
        `/api/admin/links?category=${category}&status=${status}&payment=${payment}`
      );
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
      }
    } catch (err) {
      console.error("Error fetching links:", err);
    }
  };

  const fetchStripeBalance = async () => {
    try {
      const res = await fetch("/api/admin/stripe-balance");
      if (res.ok) {
        const data = await res.json();
        setStripeBalance(data);
      }
    } catch (err) {
      console.error("Error fetching Stripe balance:", err);
    }
  };

  const handleSendReminderToUser = async (email: string, userId?: string) => {
    setSendingReminder(email);
    try {
      const res = await fetch("/api/admin/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userId }),
      });

      if (res.ok) {
        alert("Reminder email sent successfully!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send reminder");
      }
    } catch (err: any) {
      alert(err.message || "Failed to send reminder");
    } finally {
      setSendingReminder(null);
    }
  };

  const handleExportCSV = async () => {
    try {
      // Generate CSV data
      const csvData = [
        ["Type", "ID", "URL", "Owner", "Category", "Status", "Created"],
        ...links.map((link) => [
          "Link",
          link.id,
          link.url,
          link.owner_email,
          link.category,
          link.status,
          new Date(link.created_at).toLocaleDateString(),
        ]),
      ].map((row) => row.join(",")).join("\n");

      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `llmo-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export CSV");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <Spinner className="h-8 w-8 mx-auto mb-4" />
            <p className="font-mono text-muted-foreground">Loading admin dashboard...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const KPICard = ({ icon: Icon, title, value, trend, subtitle }: any) => (
    <Card className="p-6 border-border hover:border-accent/50 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="rounded-full bg-accent/10 p-3">
          <Icon className="h-5 w-5 text-accent" />
        </div>
        {trend && (
          <span className={`font-mono text-lg ${trend === "↑" ? "text-green-500" : "text-red-500"}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="font-mono text-sm text-muted-foreground mb-1">{title}</p>
      <p className="font-mono text-3xl font-bold text-accent mb-2">{value.toLocaleString()}</p>
      {subtitle && <p className="font-mono text-xs text-muted-foreground">{subtitle}</p>}
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="font-mono text-sm text-accent mb-2">// ADMIN DASHBOARD</p>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="font-mono text-3xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage users, links, payments, and analytics</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={fetchData}
                className="font-mono bg-transparent"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handleExportCSV}
                className="font-mono bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Global Search Bar */}
          <div className="relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users, links, payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults) setSearchDropdownOpen(true);
                }}
                className="font-mono pl-10 pr-10 w-full max-w-md"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults(null);
                    setSearchDropdownOpen(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            {searchDropdownOpen && searchResults && (
              <Card className="absolute top-full mt-2 w-full max-w-2xl z-50 border-border shadow-lg max-h-96 overflow-y-auto">
                <Tabs defaultValue="users" className="p-4">
                  <TabsList className="grid w-full grid-cols-3 font-mono mb-4">
                    <TabsTrigger value="users">
                      Users ({searchResults.users.length})
                    </TabsTrigger>
                    <TabsTrigger value="links">
                      Links ({searchResults.links.length})
                    </TabsTrigger>
                    <TabsTrigger value="payments">
                      Payments ({searchResults.payments.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Users Tab */}
                  <TabsContent value="users" className="space-y-2">
                    {searchResults.users.length === 0 ? (
                      <p className="font-mono text-sm text-muted-foreground text-center py-4">
                        No users found
                      </p>
                    ) : (
                      searchResults.users.map((user) => (
                        <div
                          key={user.id}
                          className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => {
                            setActiveTab("users");
                            setUsersSearch(user.email);
                            setSearchDropdownOpen(false);
                          }}
                        >
                          <p className="font-mono text-sm font-semibold">{user.full_name || user.email}</p>
                          <p className="font-mono text-xs text-muted-foreground">{user.email}</p>
                          <p className="font-mono text-xs text-muted-foreground mt-1">
                            Registered: {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  {/* Links Tab */}
                  <TabsContent value="links" className="space-y-2">
                    {searchResults.links.length === 0 ? (
                      <p className="font-mono text-sm text-muted-foreground text-center py-4">
                        No links found
                      </p>
                    ) : (
                      searchResults.links.map((link) => (
                        <div
                          key={link.id}
                          className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => {
                            setActiveTab("links");
                            setSearchDropdownOpen(false);
                          }}
                        >
                          <p className="font-mono text-sm font-semibold truncate">{link.url}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            Category: {link.category} | Owner: {link.owner_email}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground mt-1">
                            Status: {link.status} | Created: {new Date(link.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  {/* Payments Tab */}
                  <TabsContent value="payments" className="space-y-2">
                    {searchResults.payments.length === 0 ? (
                      <p className="font-mono text-sm text-muted-foreground text-center py-4">
                        No payments found
                      </p>
                    ) : (
                      searchResults.payments.map((payment, index) => (
                        <div
                          key={payment.id || index}
                          className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => {
                            setActiveTab("financial");
                            setSearchDropdownOpen(false);
                          }}
                        >
                          <p className="font-mono text-sm font-semibold">
                            {payment.amount !== null
                              ? `$${payment.amount.toFixed(2)} ${payment.currency || ""}`
                              : payment.type === "subscription"
                                ? `Subscription (${payment.plan})`
                                : "Payment"}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            Stripe ID: {payment.stripe_id}
                          </p>
                          {payment.created_at && (
                            <p className="font-mono text-xs text-muted-foreground mt-1">
                              Date: {new Date(payment.created_at).toLocaleDateString()}
                            </p>
                          )}
                          {payment.customer_email && (
                            <p className="font-mono text-xs text-muted-foreground">
                              Customer: {payment.customer_email}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </Card>
            )}

            {/* Loading indicator */}
            {isSearching && (
              <div className="absolute top-full mt-2 p-4 border border-border rounded-md bg-card">
                <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                  <Spinner className="h-4 w-4" />
                  Searching...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Metrics Summary */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            <KPICard
              icon={Users}
              title="Total Users"
              value={summary.usersTotal}
              trend={summary.usersTrend}
              subtitle="Registered accounts"
            />
            <KPICard
              icon={LinkIcon}
              title="Total Links"
              value={summary.linksTotal}
              trend={summary.linksTrend}
              subtitle="Submitted links"
            />
            <KPICard
              icon={Brain}
              title="Analyzed"
              value={summary.analyzedTotal}
              subtitle="Links analyzed"
            />
            <KPICard
              icon={DollarSign}
              title="Paid Links"
              value={summary.paidLinksTotal}
              subtitle="With active subscription"
            />
            <KPICard
              icon={DollarSign}
              title="Total Revenue"
              value={`$${summary.totalRevenue.toFixed(2)}`}
              trend={summary.revenueTrend}
              subtitle="From Stripe"
            />
            <KPICard
              icon={BookOpen}
              title="Books Downloaded"
              value={summary.bookDownloads}
              subtitle="PDF downloads"
            />
            <KPICard
              icon={Settings}
              title="Active llms.txt"
              value={summary.llmsUpdated}
              subtitle="Updated < 90 days"
            />
            <KPICard
              icon={AlertCircle}
              title="Outdated llms.txt"
              value={summary.llmsOutdated}
              subtitle="Needs update"
            />
            <KPICard
              icon={Clock}
              title="Expired Subs"
              value={summary.expiredSubs}
              subtitle="Inactive subscriptions"
            />
            <KPICard
              icon={CreditCard}
              title="Active Subs"
              value={summary.activeSubs}
              subtitle="Active subscriptions"
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-6 font-mono">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="admin-tools">Admin Tools</TabsTrigger>
            <TabsTrigger value="text-audit">Text Audit</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stripe Summary */}
            {stripeBalance && (
              <Card className="p-6 border-border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-mono text-lg font-semibold">Stripe Summary</h2>
                  <a
                    href="https://dashboard.stripe.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-accent hover:underline flex items-center gap-1"
                  >
                    Open Stripe Dashboard
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="p-4 border border-border rounded-md bg-muted/30">
                    <p className="font-mono text-xs text-muted-foreground mb-1">Available Balance</p>
                    <p className="font-mono text-xl font-bold text-accent">
                      ${stripeBalance.available.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 border border-border rounded-md bg-muted/30">
                    <p className="font-mono text-xs text-muted-foreground mb-1">Pending</p>
                    <p className="font-mono text-xl font-bold">
                      ${stripeBalance.pending.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 border border-border rounded-md bg-muted/30">
                    <p className="font-mono text-xs text-muted-foreground mb-1">Total Revenue</p>
                    <p className="font-mono text-xl font-bold text-accent">
                      ${stripeBalance.totalRevenue.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 border border-border rounded-md bg-muted/30">
                    <p className="font-mono text-xs text-muted-foreground mb-1">Last Payout</p>
                    <p className="font-mono text-sm">
                      {stripeBalance.lastPayout
                        ? new Date(stripeBalance.lastPayout).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Scheduled Tasks */}
            <Card className="p-6 border-border">
              <h2 className="font-mono text-lg font-semibold mb-4">Scheduled Tasks</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                  <div>
                    <p className="font-mono text-sm font-semibold">llms.txt Expiry Check</p>
                    <p className="font-mono text-xs text-muted-foreground mt-1">
                      Last check: {new Date().toLocaleDateString()} | Next check: Daily
                    </p>
                  </div>
                  <span className="font-mono text-xs text-green-500">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                  <div>
                    <p className="font-mono text-sm font-semibold">Book Refresh Reminders</p>
                    <p className="font-mono text-xs text-muted-foreground mt-1">
                      Sent to users with downloads older than 6 months
                    </p>
                  </div>
                  <span className="font-mono text-xs text-green-500">Active</span>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="p-6 border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-mono text-lg font-semibold">Users Management</h2>
                <div className="flex gap-3">
                  <Input
                    placeholder="Search by name/email..."
                    value={usersSearch}
                    onChange={(e) => {
                      setUsersSearch(e.target.value);
                      fetchUsers(1, e.target.value);
                    }}
                    className="font-mono w-64"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-mono">Name / Email</TableHead>
                      <TableHead className="font-mono">Registered</TableHead>
                      <TableHead className="font-mono">Links</TableHead>
                      <TableHead className="font-mono">llms.txt</TableHead>
                      <TableHead className="font-mono">Subscription</TableHead>
                      <TableHead className="font-mono">Status</TableHead>
                      <TableHead className="font-mono">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-mono">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-mono">
                            <div>
                              <p className="font-semibold">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {new Date(user.registeredDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{user.linksAdded}</TableCell>
                          <TableCell className="font-mono text-sm">{user.llmsTxtPurchased}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {user.subscriptionExpiry
                              ? new Date(user.subscriptionExpiry).toLocaleDateString()
                              : "None"}
                            <br />
                            <span className="text-xs text-muted-foreground">{user.subscriptionPlan}</span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                user.status === "Active"
                                  ? "bg-green-500/10 text-green-500"
                                  : "bg-red-500/10 text-red-500"
                              }`}
                            >
                              {user.status}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendReminderToUser(user.email, user.id)}
                                disabled={sendingReminder === user.email}
                                className="h-7 text-xs"
                              >
                                {sendingReminder === user.email ? (
                                  <Spinner className="h-3 w-3" />
                                ) : (
                                  <Mail className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Links Tab */}
          <TabsContent value="links" className="space-y-6">
            <Card className="p-6 border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-mono text-lg font-semibold">Links Management</h2>
                <div className="flex gap-3">
                  <Select
                    value={linksFilter.category}
                    onValueChange={(value) => {
                      setLinksFilter({ ...linksFilter, category: value });
                      // Refetch links after filter change
                      setTimeout(() => fetchLinks(), 100);
                    }}
                  >
                    <SelectTrigger className="font-mono w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="blog">Blog</SelectItem>
                      <SelectItem value="portfolio">Portfolio</SelectItem>
                      <SelectItem value="startup">Startup</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={linksFilter.status}
                    onValueChange={(value) => {
                      setLinksFilter({ ...linksFilter, status: value });
                      // Refetch links after filter change
                      setTimeout(() => fetchLinks(), 100);
                    }}
                  >
                    <SelectTrigger className="font-mono w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-mono">URL</TableHead>
                      <TableHead className="font-mono">Owner</TableHead>
                      <TableHead className="font-mono">Category</TableHead>
                      <TableHead className="font-mono">Status</TableHead>
                      <TableHead className="font-mono">llms.txt</TableHead>
                      <TableHead className="font-mono">Payment</TableHead>
                      <TableHead className="font-mono">Created</TableHead>
                      <TableHead className="font-mono">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground font-mono">
                          No links found. Links API endpoint needs to be implemented.
                        </TableCell>
                      </TableRow>
                    ) : (
                      links.map((link) => {
                        const llmsStatus = link.llms_last_update
                          ? new Date(link.llms_last_update).getTime() > Date.now() - 90 * 24 * 60 * 60 * 1000
                            ? "updated"
                            : "needs-update"
                          : "none";

                        return (
                          <TableRow key={link.id}>
                            <TableCell className="font-mono text-sm">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:underline flex items-center gap-1"
                              >
                                {link.url}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{link.owner_email}</TableCell>
                            <TableCell className="font-mono text-xs capitalize">{link.category}</TableCell>
                            <TableCell className="font-mono text-xs">
                              <span
                                className={`px-2 py-1 rounded ${
                                  link.status === "approved" || link.status === "active"
                                    ? "bg-green-500/10 text-green-500"
                                    : link.status === "pending"
                                      ? "bg-yellow-500/10 text-yellow-500"
                                      : "bg-red-500/10 text-red-500"
                                }`}
                              >
                                {link.status}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {llmsStatus === "updated" ? (
                                <span className="text-green-500">🟢 Updated</span>
                              ) : llmsStatus === "needs-update" ? (
                                <span className="text-red-500">🔴 Needs Update</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {link.payment_status === "paid" ? (
                                <span className="text-green-500">Paid</span>
                              ) : (
                                <span className="text-red-500">Unpaid</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {new Date(link.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              <Button size="sm" variant="outline" className="h-6 text-xs">
                                Actions
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            {stripeBalance && (
              <Card className="p-6 border-border">
                <h2 className="font-mono text-lg font-semibold mb-4">Stripe Balance Details</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 border border-border rounded-md bg-muted/30">
                      <p className="font-mono text-xs text-muted-foreground mb-1">Available Balance</p>
                      <p className="font-mono text-2xl font-bold text-accent">
                        ${stripeBalance.available.toFixed(2)}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground mt-2">
                        Ready for payout
                      </p>
                    </div>
                    <div className="p-4 border border-border rounded-md bg-muted/30">
                      <p className="font-mono text-xs text-muted-foreground mb-1">Pending Balance</p>
                      <p className="font-mono text-2xl font-bold">
                        ${stripeBalance.pending.toFixed(2)}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground mt-2">
                        In transit or on hold
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 border border-border rounded-md bg-muted/30">
                      <p className="font-mono text-xs text-muted-foreground mb-1">Total Revenue</p>
                      <p className="font-mono text-2xl font-bold text-accent">
                        ${stripeBalance.totalRevenue.toFixed(2)}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground mt-2">
                        All-time earnings
                      </p>
                    </div>
                    <div className="p-4 border border-border rounded-md bg-muted/30">
                      <p className="font-mono text-xs text-muted-foreground mb-1">Last Payout</p>
                      <p className="font-mono text-xl font-bold">
                        {stripeBalance.lastPayout
                          ? new Date(stripeBalance.lastPayout).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "No payouts yet"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <a
                    href="https://dashboard.stripe.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Stripe Dashboard
                    </Button>
                  </a>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Admin Tools Tab */}
          <TabsContent value="admin-tools" className="space-y-6">
            {/* Stripe Summary Card */}
            <Card className="p-6 border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-mono text-lg font-semibold">Stripe Summary</h2>
                  <p className="font-mono text-xs text-muted-foreground mt-1">Current Stripe account status</p>
                </div>
                <Button
                  onClick={fetchStripeSummary}
                  disabled={stripeSummaryLoading}
                  variant="outline"
                  className="font-mono bg-transparent"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${stripeSummaryLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {stripeSummaryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner className="h-8 w-8 mr-3" />
                  <span className="font-mono text-sm text-muted-foreground">Loading Stripe summary...</span>
                </div>
              ) : stripeSummary ? (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 border border-border rounded-md bg-muted/30">
                    <p className="font-mono text-xs text-muted-foreground mb-1">Available Balance</p>
                    <p className="font-mono text-2xl font-bold text-accent">
                      ${stripeSummary.available.toFixed(2)}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground mt-2">Ready for payout</p>
                  </div>
                  <div className="p-4 border border-border rounded-md bg-muted/30">
                    <p className="font-mono text-xs text-muted-foreground mb-1">Total Revenue YTD</p>
                    <p className="font-mono text-2xl font-bold text-accent">
                      ${stripeSummary.totalRevenueYTD.toFixed(2)}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground mt-2">Year to date</p>
                  </div>
                  <div className="p-4 border border-border rounded-md bg-muted/30">
                    <p className="font-mono text-xs text-muted-foreground mb-1">Last Payout</p>
                    <p className="font-mono text-xl font-bold">
                      {stripeSummary.lastPayout
                        ? new Date(stripeSummary.lastPayout).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "No payouts yet"}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground mt-2">Most recent payout date</p>
                  </div>
                </div>
              ) : (
                <p className="font-mono text-sm text-muted-foreground text-center py-8">
                  Unable to load Stripe summary
                </p>
              )}
            </Card>

            {/* Admin Tools Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Mark as Paid Card */}
              <Card className="p-6 border-border">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-5 w-5 text-accent" />
                    <h3 className="font-mono text-lg font-semibold">Mark Payment Verified</h3>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    Manually mark a link or subscription as paid
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="linkId" className="font-mono text-xs">
                      Link ID (Optional)
                    </Label>
                    <Input
                      id="linkId"
                      value={adminToolsInputs.linkId}
                      onChange={(e) =>
                        setAdminToolsInputs((prev) => ({ ...prev, linkId: e.target.value }))
                      }
                      placeholder="Link ID"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="subscriptionId" className="font-mono text-xs">
                      Subscription ID (Optional)
                    </Label>
                    <Input
                      id="subscriptionId"
                      value={adminToolsInputs.subscriptionId}
                      onChange={(e) =>
                        setAdminToolsInputs((prev) => ({ ...prev, subscriptionId: e.target.value }))
                      }
                      placeholder="Subscription ID"
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleMarkPaid}
                    disabled={markingPaid || (!adminToolsInputs.linkId && !adminToolsInputs.subscriptionId)}
                    className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 w-full"
                  >
                    {markingPaid ? (
                      <span className="flex items-center gap-2">
                        <Spinner className="h-4 w-4" />
                        Processing...
                      </span>
                    ) : (
                      "Mark as Paid"
                    )}
                  </Button>
                </div>
              </Card>

              {/* Grant Free Year Card */}
              <Card className="p-6 border-border">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-accent" />
                    <h3 className="font-mono text-lg font-semibold">Grant Free Year</h3>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    Grant a user one free year of service
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="userId" className="font-mono text-xs">
                      User ID *
                    </Label>
                    <Input
                      id="userId"
                      value={adminToolsInputs.userId}
                      onChange={(e) =>
                        setAdminToolsInputs((prev) => ({ ...prev, userId: e.target.value }))
                      }
                      placeholder="User ID or Email"
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleGrantFree}
                    disabled={grantingFree || !adminToolsInputs.userId}
                    className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 w-full"
                  >
                    {grantingFree ? (
                      <span className="flex items-center gap-2">
                        <Spinner className="h-4 w-4" />
                        Processing...
                      </span>
                    ) : (
                      "Grant Free Year"
                    )}
                  </Button>
                </div>
              </Card>

              {/* Send Reminder Card */}
              <Card className="p-6 border-border">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-5 w-5 text-accent" />
                    <h3 className="font-mono text-lg font-semibold">Send Reminder</h3>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    Send a reminder email to a user
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="reminderEmail" className="font-mono text-xs">
                      Email Address *
                    </Label>
                    <Input
                      id="reminderEmail"
                      type="email"
                      value={adminToolsInputs.reminderEmail}
                      onChange={(e) =>
                        setAdminToolsInputs((prev) => ({ ...prev, reminderEmail: e.target.value }))
                      }
                      placeholder="user@example.com"
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleSendReminder}
                    disabled={!adminToolsInputs.reminderEmail}
                    className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 w-full"
                  >
                    Send Reminder
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Text Audit Tab */}
          <TabsContent value="text-audit" className="space-y-6">
            <Card className="p-6 border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-mono text-lg font-semibold">Content Text Audit</h2>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    Compare page content against features.json
                  </p>
                </div>
                <Button
                  onClick={fetchAuditResults}
                  disabled={auditLoading}
                  variant="outline"
                  className="font-mono bg-transparent"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${auditLoading ? "animate-spin" : ""}`} />
                  {auditLoading ? "Running..." : "Run Audit"}
                </Button>
              </div>

              {auditLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner className="h-8 w-8 mr-3" />
                  <span className="font-mono text-sm text-muted-foreground">Running content audit...</span>
                </div>
              ) : auditResults.length === 0 ? (
                <div className="text-center py-12">
                  <p className="font-mono text-sm text-muted-foreground mb-4">
                    No issues found. All pages are up-to-date!
                  </p>
                  <Button
                    onClick={fetchAuditResults}
                    variant="outline"
                    className="font-mono bg-transparent"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Run Audit
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <p className="font-mono text-sm text-yellow-500">
                      ⚠️ Found {auditResults.length} page{auditResults.length !== 1 ? "s" : ""} with issues
                    </p>
                  </div>

                  {auditResults.map((result, index) => (
                    <Card key={index} className="p-4 border-border">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-mono text-sm font-semibold mb-1">
                            <Link href={result.page} className="hover:text-accent">
                              {result.page}
                            </Link>
                          </h3>
                          <span
                            className={`font-mono text-xs px-2 py-1 rounded ${
                              result.status === "outdated"
                                ? "bg-red-500/10 text-red-500"
                                : "bg-yellow-500/10 text-yellow-500"
                            }`}
                          >
                            {result.status === "outdated" ? "Outdated" : "Missing Features"}
                          </span>
                        </div>
                      </div>

                      {result.mismatches && result.mismatches.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="font-mono text-xs text-muted-foreground mb-2">Issues:</p>
                          <ul className="space-y-1">
                            {result.mismatches.map((mismatch: string, idx: number) => (
                              <li key={idx} className="font-mono text-xs text-muted-foreground flex items-start gap-2">
                                <AlertCircle className="h-3 w-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                                <span>{mismatch}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}

