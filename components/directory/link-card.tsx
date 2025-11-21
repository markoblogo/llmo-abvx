"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle2 } from "lucide-react";

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

type LinkCardProps = {
  link: LinkData;
  isAiOptimized: boolean;
};

export function LinkCard({ link, isAiOptimized }: LinkCardProps) {
  const router = useRouter();

  // Add structured data for SEO
  useEffect(() => {
    if (typeof window === "undefined") return;

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
      ...(isAiOptimized && {
        additionalProperty: {
          "@type": "PropertyValue",
          name: "AI-Optimized",
          value: "true",
        },
      }),
    };

    // Check if script already exists
    const existingScript = document.querySelector(`script[data-link-id="${link.id}"]`);
    if (existingScript) {
      existingScript.remove();
    }

    // Create and append script tag
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-link-id", link.id);
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      const scriptToRemove = document.querySelector(`script[data-link-id="${link.id}"]`);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [link, isAiOptimized]);

  return (
    <Card
        className="p-6 border-border hover:border-accent/50 transition-all flex flex-col cursor-pointer"
        onClick={() => router.push(`/directory/${link.id}`)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <Link href={`/directory/${link.id}`}>
              <h3 className="font-mono text-lg font-semibold mb-2 line-clamp-2 hover:text-accent transition-colors">
                {link.title || link.url}
              </h3>
            </Link>
            <p className="font-mono text-xs text-muted-foreground mb-3 truncate">{link.url}</p>
          </div>
          {isAiOptimized && (
            <span className="ml-2 flex-shrink-0 font-mono text-xs px-2 py-1 rounded bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              AI-Optimized ✅
            </span>
          )}
        </div>

        <p className="font-mono text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">
          {link.short_description || link.description || "No description available."}
        </p>

        {/* Badges for type, platform, and topics */}
        <div className="flex flex-wrap gap-2 mb-4">
          {link.type && (
            <Badge variant="outline" className="font-mono text-xs">
              {link.type}
            </Badge>
          )}
          {link.platform && (
            <Badge variant="outline" className="font-mono text-xs">
              {link.platform}
            </Badge>
          )}
          {link.topics && link.topics.length > 0 && (
            <>
              {link.topics.slice(0, 2).map((topic) => (
                <Badge key={topic} variant="secondary" className="font-mono text-xs">
                  {topic}
                </Badge>
              ))}
              {link.topics.length > 2 && (
                <Badge variant="secondary" className="font-mono text-xs">
                  +{link.topics.length - 2}
                </Badge>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
          <span className="font-mono text-xs text-muted-foreground capitalize">
            {link.category}
          </span>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-xs"
          >
            <Button
              size="sm"
              variant="outline"
              className="font-mono bg-transparent h-8 px-3"
            >
              Visit Site
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </a>
        </div>
      </Card>
  );
}

