"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { useSession } from "next-auth/react";
import { Twitter, Linkedin, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function DownloadBook() {
  const { data: session } = useSession();
  const user = session?.user;
  const [trackingDownload, setTrackingDownload] = useState(false);

  const bookUrl = process.env.NEXT_PUBLIC_BOOK_DOWNLOAD_URL || "/books/LLMO_Quick_Start.pdf";
  const amazonUrl = process.env.NEXT_PUBLIC_AMAZON_BOOK_URL || "https://amazon.com/dp/B0FYRSSZKL";
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = encodeURIComponent(
    "Just downloaded the free LLMO Quick Start guide! Learn how to make your content visible in the Age of AI. 🚀 #LLMO #AI #SEO"
  );
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`;
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  const handleDownload = async () => {
    if (!trackingDownload) {
      setTrackingDownload(true);

      try {
        // Track download in database
        if (user) {
          const userId = (user as any)?.id || user.email;
          const userEmail = user.email || "";

          // Check if user already has a download record
          const { data: existingDownload } = await supabase
            .from("downloads")
            .select("id, download_count")
            .eq("user_id", userId)
            .maybeSingle();

          if (existingDownload) {
            // Update existing download count
            await supabase
              .from("downloads")
              .update({
                download_count: (existingDownload.download_count || 1) + 1,
                timestamp: new Date().toISOString(),
              })
              .eq("id", existingDownload.id);
          } else {
            // Create new download record
            await supabase.from("downloads").insert({
              user_id: userId,
              email: userEmail,
              download_count: 1,
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          // For non-authenticated users, we can't track by user_id
          // But we can still track the download if needed
        }
      } catch (error) {
        console.error("Error tracking download:", error);
        // Don't block download if tracking fails
      }
    }

    // Trigger download
    const link = document.createElement("a");
    link.href = bookUrl;
    link.download = "LLMO_Quick_Start.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="max-w-2xl mx-auto">
          <Image
            src="/images/miniBllmo.png"
            alt="LLMO Quick Start book cover"
            width={256}
            height={360}
            className="w-64 mb-6 rounded shadow-lg mx-auto"
            priority
            loading="eager"
          />

          <h1 className="font-mono text-3xl font-bold mb-4">Download Your Free Guide</h1>
          <p className="max-w-md mx-auto text-muted-foreground mb-8 leading-relaxed">
            Get your free copy of <strong>LLMO Quick Start: How to Make Your Content Visible in the Age of AI</strong>.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button
              onClick={handleDownload}
              size="lg"
              className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent w-full sm:w-auto"
            >
              Download PDF
            </Button>
            <a
              href={amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button
                size="lg"
                variant="outline"
                className="font-mono bg-transparent border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 w-full sm:w-auto"
              >
                Buy Full Edition
              </Button>
            </a>
          </div>

          {/* Share Buttons */}
          <div className="mb-8">
            <p className="font-mono text-sm text-muted-foreground mb-3">Share this book:</p>
            <div className="flex gap-3 justify-center">
              <a
                href={twitterShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono bg-transparent"
                >
                  <Twitter className="h-4 w-4 mr-2" />
                  Twitter
                </Button>
              </a>
              <a
                href={linkedinShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono bg-transparent"
                >
                  <Linkedin className="h-4 w-4 mr-2" />
                  LinkedIn
                </Button>
              </a>
            </div>
          </div>

          {/* Full Edition Block */}
          <Card className="p-6 border-border bg-muted/30 max-w-md mx-auto mb-6">
            <div className="flex items-start gap-4">
              <span className="text-3xl">📘</span>
              <div className="text-left flex-1">
                <h3 className="font-mono font-semibold mb-2">Also available: The Full Edition</h3>
                <p className="font-mono text-xs text-muted-foreground mb-3">
                  Get the complete guide with advanced strategies and case studies on Amazon.
                </p>
                <a
                  href={amazonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-sm text-accent hover:underline"
                >
                  View on Amazon
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </Card>

          <div className="mt-6 p-6 bg-muted/30 rounded-lg border border-border max-w-md mx-auto">
            <p className="font-mono text-sm text-muted-foreground">
              // The guide includes practical tips for optimizing your content for AI visibility and citation.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

