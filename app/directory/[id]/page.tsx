"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/lib/supabaseClient";
import { ExternalLink, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type LinkData = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  category: string;
  type: string | null;
  platform: string | null;
  topics: string[] | null;
  keywords: string[] | null;
  short_description: string | null;
  status: string;
  created_at: string;
  llms_file_status: string | null;
  llms_last_update: string | null;
};

export default function DirectoryLinkPage() {
  const params = useParams();
  const router = useRouter();
  const linkId = params?.id as string;

  const [link, setLink] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (linkId) {
      fetchLink();
    }
  }, [linkId]);

  const fetchLink = async () => {
    try {
      const { data: linkData, error } = await supabase
        .from("links")
        .select("*")
        .eq("id", linkId)
        .eq("status", "approved")
        .single();

      if (error) throw error;

      if (!linkData) {
        toast.error("Link not found or not approved");
        router.push("/directory");
        return;
      }

      setLink(linkData);
      setLoading(false);
    } catch (err: any) {
      console.error("Error fetching link:", err);
      toast.error("Failed to load link");
      router.push("/directory");
    }
  };

  const isAiOptimized = (link: LinkData): boolean => {
    if (!link.llms_last_update) return false;

    const lastUpdate = new Date(link.llms_last_update);
    const now = new Date();
    const daysOld = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

    return daysOld < 90 && link.llms_file_status === "updated";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <Spinner className="h-8 w-8 mx-auto mb-4" />
            <p className="font-mono text-muted-foreground">Loading link...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!link) {
    return null; // Will redirect
  }

  const aiOptimized = isAiOptimized(link);

  // Add structured data for SEO
  useEffect(() => {
    if (!link || typeof window === "undefined") return;

    // Combine topics and keywords for structured data
    const allKeywords = [
      ...(link.topics || []),
      ...(link.keywords || []),
    ];

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: link.title || link.url,
      url: link.url,
      description: link.short_description || link.description || "",
      category: link.category,
      datePublished: link.created_at,
      ...(link.type && {
        additionalType: link.type,
      }),
      ...(link.platform && {
        applicationCategory: link.platform,
      }),
      ...(allKeywords.length > 0 && {
        keywords: allKeywords.join(", "),
      }),
      ...(aiOptimized && {
        additionalProperty: {
          "@type": "PropertyValue",
          name: "AI-Optimized",
          value: "true",
        },
      }),
    };

    // Check if script already exists
    const existingScript = document.querySelector(`script[data-link-page="${link.id}"]`);
    if (existingScript) {
      existingScript.remove();
    }

    // Create and append script tag
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-link-page", link.id);
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      const scriptToRemove = document.querySelector(`script[data-link-page="${link.id}"]`);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [link, aiOptimized]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Link href="/directory">
          <Button variant="ghost" className="font-mono mb-6 bg-transparent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Directory
          </Button>
        </Link>

        {/* Link Details Card */}
        <Card className="p-8 border-border">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <h1 className="font-mono text-3xl font-bold">{link.title || link.url}</h1>
                {aiOptimized && (
                  <span className="font-mono text-xs px-3 py-1 rounded bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    AI-Optimized ✅
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-accent hover:underline flex items-center gap-1"
                >
                  {link.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span className="font-mono text-xs text-muted-foreground capitalize">
                  {link.category}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  Added: {new Date(link.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Badges for type, platform, and topics */}
              <div className="flex flex-wrap gap-2 mb-4">
                {link.type && (
                  <Badge variant="outline" className="font-mono text-xs">
                    Type: {link.type}
                  </Badge>
                )}
                {link.platform && (
                  <Badge variant="outline" className="font-mono text-xs">
                    Platform: {link.platform}
                  </Badge>
                )}
                {link.topics && link.topics.length > 0 && (
                  <>
                    {link.topics.map((topic) => (
                      <Badge key={topic} variant="secondary" className="font-mono text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </>
                )}
              </div>

              {/* Keywords */}
              {link.keywords && link.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="font-mono text-xs text-muted-foreground">Keywords:</span>
                  {link.keywords.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="font-mono text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Short description */}
          {link.short_description && (
            <div className="mb-6">
              <h2 className="font-mono text-lg font-semibold mb-3">Summary</h2>
              <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                {link.short_description}
              </p>
            </div>
          )}

          {/* Full description */}
          {link.description && (
            <div className="mb-6">
              <h2 className="font-mono text-lg font-semibold mb-3">Description</h2>
              <p className="font-mono text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {link.description}
              </p>
            </div>
          )}

          <div className="pt-6 border-t border-border">
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent w-full sm:w-auto"
              >
                Visit Site
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}

