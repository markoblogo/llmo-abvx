"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/ui/spinner";
import { Download, Sparkles, Loader2, AlertCircle } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);

  // Check if paid from URL params
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("paid") === "true") {
          setPaid(true);
        }
      }
    } catch (err) {
      console.error("[metadata] Error reading URL params:", err);
    }
  }, []);

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

  const handleGenerate = async () => {
    if (!url || !url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to generate metadata";
        try {
          const errorData = await response.json();
          errorMessage = errorData?.error || errorData?.details || errorMessage;
        } catch (parseError) {
          console.error("[metadata] Error parsing error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("[metadata] Error parsing response:", parseError);
        throw new Error("Invalid response from server");
      }

      // Validate response structure
      if (!data || typeof data !== "object") {
        console.error("[metadata] Invalid response data:", data);
        throw new Error("Invalid response format");
      }

      const metadataResult = data.result;
      if (!metadataResult || typeof metadataResult !== "object") {
        console.error("[metadata] Invalid result data:", metadataResult);
        throw new Error("Metadata result is unavailable");
      }

      // Validate required fields with safe defaults
      const validatedResult: MetadataResult = {
        title: metadataResult.title || "Untitled",
        description: metadataResult.description || "",
        keywords: Array.isArray(metadataResult.keywords) ? metadataResult.keywords : [],
        shortDescription: metadataResult.shortDescription || metadataResult.description || "",
      };

      setResult(validatedResult);
      toast.success("Metadata generated successfully!");
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to generate metadata";
      console.error("[metadata] Error generating metadata:", error);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result) {
      toast.error("No metadata to download");
      return;
    }

    // Check if user has paid
    if (!paid) {
      // Redirect to checkout
      try {
        const userEmail = session?.user?.email;
        const userId = (session?.user as any)?.id;

        if (!userEmail) {
          toast.error("User email is required for checkout");
          return;
        }

        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userEmail,
            userId: userId || null,
            type: "metadata",
          }),
        });

        if (!response.ok) {
          let errorMessage = "Failed to create checkout session";
          try {
            const errorData = await response.json();
            errorMessage = errorData?.error || errorMessage;
          } catch (parseError) {
            console.error("[metadata] Error parsing checkout error:", parseError);
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (data?.url && typeof window !== "undefined") {
          window.location.href = data.url;
        } else {
          throw new Error("Checkout URL not received");
        }
      } catch (error: any) {
        console.error("[metadata] Checkout error:", error);
        toast.error(error?.message || "Failed to start checkout");
      }
      return;
    }

    // Download JSON file
    try {
      if (typeof window === "undefined" || typeof document === "undefined") {
        throw new Error("Browser APIs not available");
      }

      const safeUrl = url || "unknown";
      const sanitizedUrl = safeUrl.replace(/^https?:\/\//, "").replace(/[^a-z0-9]/gi, "-");
      const filename = `metadata-${sanitizedUrl}-${Date.now()}.json`;

      const metadataJson = JSON.stringify(
        {
          url: safeUrl,
          title: result.title || "",
          description: result.description || "",
          keywords: Array.isArray(result.keywords) ? result.keywords : [],
          shortDescription: result.shortDescription || "",
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
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success("Metadata report downloaded!");
    } catch (error: any) {
      console.error("[metadata] Download error:", error);
      toast.error(error?.message || "Failed to download metadata");
    }
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

          {error && (
            <Card className="p-6 border-border mb-6 border-destructive/50 bg-destructive/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-mono text-sm font-semibold text-destructive mb-1">
                    Metadata is temporarily unavailable
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground">{error}</p>
                </div>
              </div>
            </Card>
          )}

          {result && (
            <Card className="p-6 border-border mb-6">
              <h2 className="font-mono text-xl font-semibold mb-4">Generated Metadata</h2>
              <div className="space-y-4">
                <div>
                  <Label className="font-mono text-xs text-muted-foreground">Title</Label>
                  <p className="font-mono text-sm mt-1 p-3 bg-muted rounded-md">
                    {result.title || "N/A"}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    {(result.title || "").length}/60 characters
                  </p>
                </div>

                <div>
                  <Label className="font-mono text-xs text-muted-foreground">Description</Label>
                  <p className="font-mono text-sm mt-1 p-3 bg-muted rounded-md">
                    {result.description || "N/A"}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    {(result.description || "").length}/160 characters
                  </p>
                </div>

                <div>
                  <Label className="font-mono text-xs text-muted-foreground">Keywords</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Array.isArray(result.keywords) && result.keywords.length > 0 ? (
                      result.keywords.map((keyword, index) => {
                        const safeKeyword = String(keyword || "").trim();
                        if (!safeKeyword) return null;
                        return (
                          <span
                            key={index}
                            className="font-mono text-xs px-2 py-1 bg-accent/10 text-accent rounded"
                          >
                            {safeKeyword}
                          </span>
                        );
                      })
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">No keywords available</span>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="font-mono text-xs text-muted-foreground">Short Description</Label>
                  <p className="font-mono text-sm mt-1 p-3 bg-muted rounded-md">
                    {result.shortDescription || "N/A"}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    {(result.shortDescription || "").length}/280 characters
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




