"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { User, Upload, Trash2, Key, CheckCircle2, CreditCard, Edit, Calendar, Link as LinkIcon, Brain } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const ADMIN_ENTRY_STORAGE_KEY = "adminEntryChoiceShownForUser";

type ProfileData = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
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

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const user = session?.user;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [linksCount, setLinksCount] = useState(0);
  const [llmsUpdatedCount, setLlmsUpdatedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGoogleAuth = user?.image && user.image.includes("googleusercontent");

  useEffect(() => {
    if (status === "loading") return;

    if (!session || !user) {
      router.push("/login?next=/profile");
      return;
    }

    fetchProfile();
  }, [session, status, router, user]);

  const fetchProfile = async () => {
    try {
      const userId = (user as any)?.id || user?.email;
      if (!userId) {
        router.push("/login");
        return;
      }

      // Fetch profile from Supabase
      // Try to find by email first, then by id
      let profileData = null;
      let profileError = null;

      if (user?.email) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", user.email)
          .single();
        profileData = data;
        profileError = error;
      }

      // If not found by email, try by id
      if (!profileData && (user as any)?.id) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", (user as any).id)
          .single();
        profileData = data;
        profileError = error;
      }

      // If profile doesn't exist, create it
      if (!profileData && profileError?.code === "PGRST116") {
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: (user as any)?.id || userId,
            email: user?.email || "",
            full_name: user?.name || "",
            avatar_url: user?.image || null,
          })
          .select()
          .single();

        if (!createError && newProfile) {
          profileData = newProfile;
        }
      } else if (profileError && profileError.code !== "PGRST116") {
        console.error("Error fetching profile:", profileError);
      }

      const profileInfo: ProfileData = {
        id: profileData?.id || userId,
        email: user?.email || "",
        full_name: profileData?.full_name || user?.name || "",
        avatar_url: profileData?.avatar_url || user?.image || null,
        role: profileData?.role || "user",
      };

      setProfile(profileInfo);
      setFullName(profileInfo.full_name || "");
      setAvatarPreview(profileInfo.avatar_url || user?.image || null);
      
      // Fetch subscription data
      const { data: subscriptionData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .single();

      setSubscription(subscriptionData || null);

      // Fetch links count and llms.txt updated count
      const { data: linksData } = await supabase
        .from("links")
        .select("id, llms_file_status, llms_last_update")
        .eq("user_id", userId);

      const totalLinks = linksData?.length || 0;
      setLinksCount(totalLinks);

      // Count links with updated llms.txt (updated in last 90 days)
      const now = new Date();
      const updatedCount = (linksData || []).filter((link) => {
        if (!link.llms_last_update || link.llms_file_status !== "updated") return false;
        const lastUpdate = new Date(link.llms_last_update);
        const daysOld = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
        return daysOld < 90;
      }).length;

      setLlmsUpdatedCount(updatedCount);

      setLoading(false);

      // Fetch payment data from Stripe after subscription is set
      if (subscriptionData?.stripe_customer_id) {
        await fetchStripePaymentData(subscriptionData.stripe_customer_id);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setLoading(false);
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
      toast.error(err.message || "Failed to open billing portal");
      setPortalLoading(false);
    }
  };

  // Generate Dicebear avatar URL
  const getAvatarUrl = (): string => {
    if (avatarPreview) return avatarPreview;
    if (profile?.avatar_url) return profile.avatar_url;
    if (user?.image) return user.image;
    
    // Fallback to Dicebear
    const seed = user?.email || user?.name || "user";
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !user) return;

    setUploadingAvatar(true);
    try {
      const userId = (user as any)?.id || user.email;
      // Sanitize userId for filename
      const sanitizedUserId = String(userId).replace(/[^a-zA-Z0-9]/g, "_");
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${sanitizedUserId}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Update profile with avatar URL
      const response = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatar_url: publicUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update avatar");
      }

      toast.success("Avatar updated successfully");
      setAvatarFile(null);
      fetchProfile();
      // Refresh session to get updated avatar
      await updateSession();
    } catch (err: any) {
      console.error("Error uploading avatar:", err);
      toast.error(err.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const response = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }

      toast.success("Profile updated successfully");
      fetchProfile();
      // Refresh session
      await updateSession();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      // Note: NextAuth doesn't have a direct password change API
      // This would need to be implemented via Supabase Auth or a custom endpoint
      toast.info("Password change feature coming soon");
      setChangePasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeleting(true);
    try {
      const response = await fetch("/api/profile/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete account");
      }

      toast.success("Account deleted successfully");
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(ADMIN_ENTRY_STORAGE_KEY);
      }
      await signOut({ redirect: true, callbackUrl: "/" });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <Spinner className="h-8 w-8 mx-auto mb-4" />
            <p className="font-mono text-muted-foreground">Loading profile...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!session || !user || !profile) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <p className="font-mono text-sm text-accent mb-2">// MY PROFILE</p>
          <h1 className="font-mono text-3xl font-bold mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account information and preferences</p>
        </div>

        {/* Profile Card */}
        <Card className="p-6 border-border mb-6">
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-start gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 border-2 border-border">
                  <AvatarImage src={getAvatarUrl()} alt="Profile avatar" />
                  <AvatarFallback className="bg-accent/10">
                    <User className="h-12 w-12 text-accent" />
                  </AvatarFallback>
                </Avatar>
                {isGoogleAuth && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-background">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-mono text-lg font-semibold mb-2">Profile Picture</h3>
                <p className="font-mono text-xs text-muted-foreground mb-4">
                  Upload a new avatar image (max 5MB, JPG/PNG)
                </p>
                <div className="flex gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-mono bg-transparent"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Image
                  </Button>
                  {avatarFile && (
                    <Button
                      onClick={handleUploadAvatar}
                      disabled={uploadingAvatar}
                      className="font-mono bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      {uploadingAvatar ? (
                        <span className="flex items-center gap-2">
                          <Spinner className="h-4 w-4" />
                          Uploading...
                        </span>
                      ) : (
                        "Upload"
                      )}
                    </Button>
                  )}
                </div>
                {isGoogleAuth && (
                  <p className="font-mono text-xs text-green-500 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected with Google ✅
                  </p>
                )}
              </div>
            </div>

            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="font-mono text-sm">
                Full Name
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="font-mono"
              />
            </div>

            {/* Email Field (Readonly) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-mono text-sm">
                Email
              </Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="font-mono bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="font-mono text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            {/* Update Button */}
            <div className="pt-4 border-t border-border">
              <Button
                onClick={handleUpdateProfile}
                disabled={saving}
                className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent w-full sm:w-auto"
              >
                <Edit className="h-4 w-4 mr-2" />
                {saving ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Updating...
                  </span>
                ) : (
                  "Edit Profile"
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Subscription & Stats Card */}
        <Card className="p-6 border-border mb-6">
          <h2 className="font-mono text-lg font-semibold mb-4">Subscription & Stats</h2>
          <div className="space-y-4">
            {/* Subscription Status */}
            {subscription ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-muted-foreground">Plan</span>
                  <span className="font-mono text-sm font-semibold capitalize">{subscription.plan}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-muted-foreground">Status</span>
                  <span
                    className={`font-mono text-xs px-2 py-1 rounded ${
                      new Date(subscription.expiry_date) > new Date()
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {new Date(subscription.expiry_date) > new Date() ? "Active" : "Expired"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Expiry Date
                  </span>
                  <span className="font-mono text-sm">
                    {new Date(subscription.expiry_date).toLocaleDateString()}
                  </span>
                </div>
                {paymentData?.hasPaymentMethod && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="font-mono text-sm text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      Payment Method
                    </span>
                    <span className="font-mono text-sm">
                      {paymentData.brand && paymentData.brand.charAt(0).toUpperCase() + paymentData.brand.slice(1)} •••• {paymentData.last4}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="font-mono text-sm text-muted-foreground">No active subscription</p>
            )}

            {/* Links Stats */}
            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-muted-foreground flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" />
                  Total Links
                </span>
                <span className="font-mono text-sm font-semibold">{linksCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-muted-foreground flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  llms.txt Updated
                </span>
                <span className="font-mono text-sm font-semibold">{llmsUpdatedCount}</span>
              </div>
            </div>

            {/* Manage Billing Button */}
            {subscription?.stripe_customer_id && (
              <div className="pt-4 border-t border-border">
                <Button
                  onClick={handleStripePortal}
                  disabled={portalLoading}
                  variant="outline"
                  className="font-mono bg-transparent w-full sm:w-auto"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {portalLoading ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="h-4 w-4" />
                      Loading...
                    </span>
                  ) : (
                    "Manage Billing"
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Account Actions */}
        <Card className="p-6 border-border">
          <h2 className="font-mono text-lg font-semibold mb-4">Account Actions</h2>
          <div className="space-y-4">
            {!isGoogleAuth && (
              <Button
                variant="outline"
                onClick={() => setChangePasswordDialogOpen(true)}
                className="font-mono bg-transparent w-full sm:w-auto"
              >
                <Key className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            )}

            <div className="pt-4 border-t border-border">
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="font-mono w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
              <p className="font-mono text-xs text-muted-foreground mt-2">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
            </div>
          </div>
        </Card>
      </main>

      <Footer />

      {/* Change Password Dialog */}
      <Dialog open={changePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
        <DialogContent className="font-mono">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your new password. It must be at least 8 characters long.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangePasswordDialogOpen(false);
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              className="font-mono bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="font-mono">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your account? This action cannot be undone. All your
              links, subscriptions, and data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="font-mono text-sm text-muted-foreground mb-4">
              This will permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="font-mono"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Deleting...
                </span>
              ) : (
                "Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

