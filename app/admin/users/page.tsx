"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight, MoreVertical, Gift, User, Shield, Crown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type User = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  admin_level: string;
  created_at: string;
  last_login: string | null;
  plan: string;
  expiry_date: string | null;
};

type AdminLevel = "none" | "basic" | "super";

/**
 * CHANGES MADE:
 * 1. Added showAdminsOnly state for filtering admins
 * 2. Created visibleUsers computed array that filters users based on showAdminsOnly flag
 * 3. Updated system message to show: "{total} users total (showing {visibleUsers.length})"
 * 4. Added "Show only admins" checkbox filter in the search panel
 * 5. Updated table rendering to use visibleUsers instead of users
 * 6. Updated "No users found" check to use visibleUsers.length
 */
export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentAdminLevel, setCurrentAdminLevel] = useState<AdminLevel>("none");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [showAdminsOnly, setShowAdminsOnly] = useState(false);

  const limit = 50;

  // Fetch current admin level
  useEffect(() => {
    const fetchAdminLevel = async () => {
      try {
        const response = await fetch("/api/user/role");
        if (response.ok) {
          const data = await response.json();
          setCurrentAdminLevel(data.adminLevel || "none");
        }
      } catch (error) {
        console.error("Error fetching admin level:", error);
      }
    };

    fetchAdminLevel();
  }, []);

  // Fetch users
  const fetchUsers = async (offset: number, query: string = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (query.trim()) {
        params.append("q", query.trim());
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        let message = `Failed to fetch users: ${response.status}`;
        try {
          const err = await response.json();
          if (err?.error) {
            message = err.error;
          }
        } catch (e) {
          console.warn("[/admin/users] Failed to parse error JSON", e);
        }
        console.warn("[/admin/users] API error", {
          status: response.status,
          statusText: response.statusText,
          message,
        });
        // Возвращаем пустой результат, чтобы не падала страница
        setUsers([]);
        setTotal(0);
        toast.error(message);
        return;
      }

      const data = await response.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      console.warn("Error fetching users:", error);
      toast.error("Failed to load users");
      // Устанавливаем пустые значения при ошибке
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage * limit, searchQuery);
  }, [currentPage]);

  const handleSearch = () => {
    setCurrentPage(0);
    fetchUsers(0, searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleChangeRole = async (userId: string, newAdminLevel: AdminLevel) => {
    setUpdatingUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminLevel: newAdminLevel }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update role");
      }

      toast.success(`User role updated to ${newAdminLevel}`);
      // Refresh users list
      fetchUsers(currentPage * limit, searchQuery);
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error(error.message || "Failed to update user role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleGiftSubscription = async (userId: string, plan: "pro" | "agency", durationMonths: number) => {
    setUpdatingUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/gift-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan, durationMonths }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to gift subscription");
      }

      toast.success(`Gifted ${plan} subscription for ${durationMonths} months`);
      // Refresh users list
      fetchUsers(currentPage * limit, searchQuery);
    } catch (error: any) {
      console.error("Error gifting subscription:", error);
      toast.error(error.message || "Failed to gift subscription");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "pro":
        return "bg-blue-500/20 text-blue-500";
      case "agency":
        return "bg-purple-500/20 text-purple-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  const getAdminLevelBadge = (level: string) => {
    switch (level) {
      case "super":
        return { label: "Super Admin", icon: Crown, color: "bg-red-500/20 text-red-500" };
      case "basic":
        return { label: "Admin", icon: Shield, color: "bg-yellow-500/20 text-yellow-500" };
      default:
        return { label: "User", icon: User, color: "bg-gray-500/20 text-gray-500" };
    }
  };

  const isSuperAdmin = currentAdminLevel === "super";

  // Filter users based on showAdminsOnly flag
  const visibleUsers = showAdminsOnly
    ? users.filter((u) => u.role === "admin" || u.admin_level === "basic" || u.admin_level === "super")
    : users;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-3xl font-bold">// USERS MANAGEMENT</h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          // SYSTEM MESSAGE: {total || 0} users total (showing {visibleUsers.length})
        </p>
      </div>

      {/* Search and Filter */}
      <Card className="p-4 border-border bg-card">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 font-mono"
              />
            </div>
            <Button onClick={handleSearch} className="font-mono bg-accent text-accent-foreground hover:bg-accent/90">
              Search
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-admins-only"
              checked={showAdminsOnly}
              onCheckedChange={(checked) => setShowAdminsOnly(checked === true)}
            />
            <Label
              htmlFor="show-admins-only"
              className="font-mono text-sm text-muted-foreground cursor-pointer"
            >
              Show only admins
            </Label>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner className="mx-auto" />
        </div>
      ) : (
        <Card className="border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono">Email</TableHead>
                  <TableHead className="font-mono">Name</TableHead>
                  <TableHead className="font-mono">Plan</TableHead>
                  <TableHead className="font-mono">Expiry</TableHead>
                  <TableHead className="font-mono">Role</TableHead>
                  <TableHead className="font-mono">Admin Level</TableHead>
                  {isSuperAdmin && <TableHead className="font-mono">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleUsers.map((user) => {
                    const adminBadge = getAdminLevelBadge(user.admin_level);
                    const BadgeIcon = adminBadge.icon;
                    const isUpdating = updatingUserId === user.id;

                    return (
                      <TableRow key={user.id} className={isUpdating ? "opacity-50" : ""}>
                        <TableCell className="font-mono text-sm">{user.email}</TableCell>
                        <TableCell className="font-mono text-sm">{user.full_name || "—"}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-mono font-semibold ${getPlanBadgeColor(
                              user.plan
                            )}`}
                          >
                            {user.plan.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{formatDate(user.expiry_date)}</TableCell>
                        <TableCell className="font-mono text-sm">{user.role}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-semibold ${adminBadge.color}`}
                          >
                            <BadgeIcon className="h-3 w-3" />
                            {adminBadge.label}
                          </span>
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isUpdating}
                                  className="font-mono"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="font-mono">
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                  Change Role
                                </div>
                                <DropdownMenuItem
                                  onClick={() => handleChangeRole(user.id, "none")}
                                  disabled={isUpdating || user.admin_level === "none"}
                                >
                                  <User className="h-4 w-4 mr-2" />
                                  Make user
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleChangeRole(user.id, "basic")}
                                  disabled={isUpdating || user.admin_level === "basic"}
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Make basic admin
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleChangeRole(user.id, "super")}
                                  disabled={isUpdating || user.admin_level === "super"}
                                  className="text-red-500 focus:text-red-500"
                                >
                                  <Crown className="h-4 w-4 mr-2" />
                                  Make super admin
                                </DropdownMenuItem>
                                <div className="border-t border-border my-1" />
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                  Gift Subscription
                                </div>
                                <DropdownMenuItem
                                  onClick={() => handleGiftSubscription(user.id, "pro", 3)}
                                  disabled={isUpdating}
                                >
                                  <Gift className="h-4 w-4 mr-2" />
                                  Gift Pro (3 months)
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleGiftSubscription(user.id, "agency", 3)}
                                  disabled={isUpdating}
                                >
                                  <Gift className="h-4 w-4 mr-2" />
                                  Gift Agency (3 months)
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="font-mono text-sm text-muted-foreground">
              Showing {currentPage * limit + 1} - {Math.min((currentPage + 1) * limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0 || loading}
                className="font-mono"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={(currentPage + 1) * limit >= total || loading}
                className="font-mono"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
