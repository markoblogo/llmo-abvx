"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function WelcomeModal() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Only check if user is authenticated
    if (status !== "authenticated" || !session?.user) {
      setChecking(false);
      return;
    }

    const checkBookOfferSeen = async () => {
      try {
        const user = session.user;
        const userId = (user as any)?.id || user?.email;

        if (!userId) {
          setChecking(false);
          return;
        }

        // Check book_offer_seen via API endpoint
        const response = await fetch("/api/profile/book-offer-seen", {
          method: "GET",
        });

        let hasSeenOffer = false;
        if (response.ok) {
          const data = await response.json();
          hasSeenOffer = data.book_offer_seen === true;
        } else if (response.status === 404) {
          // Profile doesn't exist yet, show the modal
          hasSeenOffer = false;
        } else {
          // On error, don't show the modal to avoid annoying users
          hasSeenOffer = true;
        }
        
        // If user hasn't seen the offer, show the modal
        if (!hasSeenOffer) {
          setOpen(true);
        }
      } catch (error) {
        console.error("[WelcomeModal] Error checking book offer status:", error);
        // On error, don't show the modal to avoid annoying users
      } finally {
        setChecking(false);
      }
    };

    checkBookOfferSeen();
  }, [session, status]);

  const markBookOfferAsSeen = async () => {
    try {
      // Call API endpoint to mark book offer as seen
      const response = await fetch("/api/profile/book-offer-seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("[WelcomeModal] Error marking book offer as seen:", error);
      // Don't fail silently, but don't block the UI
    }
  };

  const handleClose = async () => {
    await markBookOfferAsSeen();
    setOpen(false);
  };

  const handleDownload = async () => {
    await markBookOfferAsSeen();
    setOpen(false);
    router.push("/download-book");
  };

  // Don't render anything while checking or if user is not authenticated
  if (checking || status !== "authenticated" || !session?.user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="font-mono max-w-md dark:bg-background dark:border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold mb-2">Welcome to LLMO Directory!</DialogTitle>
          <DialogDescription className="text-muted-foreground leading-relaxed">
            You can now download your free digital guide: <strong>LLMO Quick Start — How to Make Your Content Visible in the Age of AI</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 mb-6 flex justify-center">
          <Image
            src="/images/miniBllmo.png"
            alt="LLMO Quick Start book cover"
            width={200}
            height={280}
            className="rounded shadow-lg"
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleDownload}
            className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent w-full"
          >
            Download Free PDF
          </Button>
          <Button
            onClick={handleClose}
            variant="outline"
            className="font-mono bg-transparent w-full"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
