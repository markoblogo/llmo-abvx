"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { Edit2, Trash2, RefreshCw, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
// Stripe loaded dynamically to avoid build issues

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
// stripePublishableKey initialized in component

const categories = ["Blog", "Portfolio", "Startup", "Agency", "Other"];

type LinkData = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  created_at: string;
  llms_file_status: string | null;
  llms_last_update: string | null;
};

export default function MyLinksPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;

  const [links, setLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<LinkData | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingLlms, setUpdatingLlms] = useState<string | null>(null);

  // Edit form state
  const [editUrl, setEditUrl] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    if (!session || !user) {
      router.push("/login?next=/my-links");
      return;
    }

    fetchLinks();
  }, [session, status, router, user]);

  const fetchLinks = async () => {
    try {
      const userId = (user as any)?.id || user?.email;
      if (!userId) {
        router.push("/login");
        return;
      }

      const { data: linksData, error } = await supabase
        .from("links")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setLinks(linksData || []);
      setLoading(false);
    } catch (err: any) {
      console.error("Error fetching links:", err);
      toast.error("Failed to load links");
      setLoading(false);
    }
  };

  const handleEditClick = (link: LinkData) => {
    setSelectedLink(link);
    setEditUrl(link.url);
    setEditTitle(link.title || link.url);
    setEditDescription(link.description || "");
    setEditCategory(link.category);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedLink) return;

    setUpdating(true);
    try {
      const response = await fetch("/api/links/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkId: selectedLink.id,
          url: editUrl,
          title: editTitle || editUrl,
          description: editDescription,
          category: editCategory,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update link");
      }

      toast.success("Link updated successfully");
      setEditDialogOpen(false);
      fetchLinks();
    } catch (err: any) {
      toast.error(err.message || "Failed to update link");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (link: LinkData) => {
    setSelectedLink(link);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLink) return;

    setDeleting(true);
    try {
      const response = await fetch("/api/links/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkId: selectedLink.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete link");
      }

      toast.success("Link deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedLink(null);
      fetchLinks();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete link");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateLlms = async (linkId: string) => {
    if (!stripePublishableKey || !user) {
      toast.error("Stripe is not configured. Please contact support.");
      return;
    }
    
    // Payment is handled via redirect, no need for Stripe client-side

    setUpdatingLlms(linkId);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: "price_llms_txt",
          email: user.email || "",
          userId: (user as any)?.id || user.email,
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
      toast.error(err.message || "Failed to start checkout");
      setUpdatingLlms(null);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "active":
        return (
          <span className="font-mono text-xs px-2 py-1 rounded bg-green-500/10 text-green-500">
            🟢 Active
          </span>
        );
      case "pending":
        return (
          <span className="font-mono text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-500">
            🟡 Pending
          </span>
        );
      case "expired":
      case "rejected":
        return (
          <span className="font-mono text-xs px-2 py-1 rounded bg-red-500/10 text-red-500">
            🔴 Expired
          </span>
        );
      default:
        return (
          <span className="font-mono text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <Spinner className="h-8 w-8 mx-auto mb-4" />
            <p className="font-mono text-muted-foreground">Loading your links...</p>
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

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="font-mono text-sm text-accent mb-2">// MY LINKS</p>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-mono text-3xl font-bold mb-2">My Links</h1>
              <p className="text-muted-foreground">Manage your submitted links</p>
            </div>
            <Link href="/add-link">
              <Button className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent">
                <Plus className="h-4 w-4 mr-2" />
                Add New Link
              </Button>
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {links.length === 0 ? (
          <Card className="p-12 border-border text-center">
            <p className="font-mono text-lg text-muted-foreground mb-4">
              You haven't added any links yet
            </p>
            <p className="font-mono text-sm text-muted-foreground mb-6">Add one now!</p>
            <Link href="/add-link">
              <Button className="font-mono bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Link
              </Button>
            </Link>
          </Card>
        ) : (
          /* Links Table */
          <Card className="p-6 border-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono">URL</TableHead>
                    <TableHead className="font-mono">Title</TableHead>
                    <TableHead className="font-mono">Category</TableHead>
                    <TableHead className="font-mono">Status</TableHead>
                    <TableHead className="font-mono">llms.txt</TableHead>
                    <TableHead className="font-mono">Created</TableHead>
                    <TableHead className="font-mono text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => {
                    const llmsStatus = checkLlmsStatus(link);
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
                        <TableCell className="font-mono text-sm">{link.title}</TableCell>
                        <TableCell className="font-mono text-xs capitalize text-muted-foreground">
                          {link.category}
                        </TableCell>
                        <TableCell>{getStatusBadge(link.status)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {llmsStatus.status === "updated" ? (
                            <span className="text-green-500">🟢 Updated</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-red-500">🔴 Needs Update</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateLlms(link.id)}
                                disabled={updatingLlms === link.id}
                                className="font-mono text-xs h-6 px-2"
                              >
                                {updatingLlms === link.id ? (
                                  <Spinner className="h-3 w-3" />
                                ) : (
                                  <>
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Update ($1)
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {new Date(link.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditClick(link)}
                              className="font-mono h-8 px-2"
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteClick(link)}
                              className="font-mono h-8 px-2 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>

      <Footer />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="font-mono max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Link</DialogTitle>
            <DialogDescription>Update your link information</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-url">Website URL *</Label>
              <Input
                id="edit-url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="My Awesome Blog"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describe your website..."
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">Minimum 50 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category *</Label>
              <Select value={editCategory} onValueChange={setEditCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat.toLowerCase()} className="font-mono">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updating || !editUrl || !editCategory || (editDescription?.length || 0) < 50}
              className="font-mono bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {updating ? (
                <span className="flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Updating...
                </span>
              ) : (
                "Update Link"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="font-mono">
          <DialogHeader>
            <DialogTitle>Delete Link</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this link? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedLink && (
            <div className="py-4">
              <p className="font-mono text-sm text-muted-foreground">
                <strong>URL:</strong> {selectedLink.url}
              </p>
              <p className="font-mono text-sm text-muted-foreground mt-2">
                <strong>Title:</strong> {selectedLink.title}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              variant="destructive"
              className="font-mono"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Deleting...
                </span>
              ) : (
                "Delete Link"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}




