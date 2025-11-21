"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/ui/spinner";
import { Download, Sparkles, Loader2 } from "lucide-react";
// Stripe loaded dynamically to avoid build issues
import { toast } from "sonner";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
// stripePromise initialized in component

interface MetadataResult {
  title: string;
  description: string;
  keywords: string[];
  shortDescription: string;
}

export default function MetadataPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MetadataResult | null>(null);
  const [paid, setPaid] = useState(false);

  // Check authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Spinner className="h-8 w-8" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!session?.user) {
    router.push("/login?next=/metadata");
    return null;
  }

  // Check if paid from URL params
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "true") {
      setPaid(true);
    }
  });

  const handleGenerate = async () => {
    if (!url || !url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate metadata");
      }

      const data = await response.json();
      setResult(data.result);
      toast.success("Metadata generated successfully!");
    } catch (error: any) {
      console.error("Error generating metadata:", error);
      toast.error(error.message || "Failed to generate metadata");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;

    // Check if user has paid
    if (!paid) {
      // Redirect to checkout
      try {
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: session.user?.email || "",
            userId: (session.user as any)?.id,
            type: "metadata",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create checkout session");
        }

        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to start checkout");
      }
      return;
    }

    // Download JSON file
    const metadataJson = JSON.stringify(
      {
        url,
        ...result,
        generatedAt: new Date().toISOString(),
        generatedBy: "LLMO Directory AI Metadata Generator",
      },
      null,
      2,
    );

    const blob = new Blob([metadataJson], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `metadata-${url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]/gi, "-")}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);

    toast.success("Metadata report downloaded!");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 text-accent" />
              <h1 className="font-mono text-4xl font-bold">AI Metadata Suggestion</h1>
            </div>
            <p className="text-muted-foreground mt-2">
              Generate SEO-optimized metadata for your website using AI. Perfect for LLM visibility.
            </p>
          </div>

          <Card className="p-6 border-border mb-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url" className="font-mono text-sm">
                  Website URL
                </Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="font-mono"
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={loading || !url}
                className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 w-full"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </span>
                ) : (
                  "Generate Metadata"
                )}
              </Button>
            </div>
          </Card>

          {result && (
            <Card className="p-6 border-border mb-6">
              <h2 className="font-mono text-xl font-semibold mb-4">Generated Metadata</h2>
              <div className="space-y-4">
                <div>
                  <Label className="font-mono text-xs text-muted-foreground">Title</Label>
                  <p className="font-mono text-sm mt-1 p-3 bg-muted rounded-md">{result.title}</p>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    {result.title.length}/60 characters
                  </p>
                </div>

                <div>
                  <Label className="font-mono text-xs text-muted-foreground">Description</Label>
                  <p className="font-mono text-sm mt-1 p-3 bg-muted rounded-md">{result.description}</p>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    {result.description.length}/160 characters
                  </p>
                </div>

                <div>
                  <Label className="font-mono text-xs text-muted-foreground">Keywords</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {result.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="font-mono text-xs px-2 py-1 bg-accent/10 text-accent rounded"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="font-mono text-xs text-muted-foreground">Short Description</Label>
                  <p className="font-mono text-sm mt-1 p-3 bg-muted rounded-md">
                    {result.shortDescription}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    {result.shortDescription.length}/280 characters
                  </p>
                </div>

                <Button
                  onClick={handleDownload}
                  className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {paid ? "Download Metadata Report" : "Download Metadata Report ($1)"}
                </Button>

                {!paid && (
                  <p className="font-mono text-xs text-center text-muted-foreground">
                    Payment required to download the full report
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}




