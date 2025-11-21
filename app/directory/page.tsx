"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { Search, ExternalLink, CheckCircle2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Category options matching add-link form
const categoryLevel1Options = [
  "Blog",
  "Website",
  "Product",
  "Service",
  "Store",
  "Portfolio",
  "Agency",
  "Publication",
  "App",
  "Personal",
  "Social Media",
];

const categoryLevel3Options = [
  "AI",
  "Marketing",
  "Design",
  "Tech",
  "Lifestyle",
  "Business",
  "Education",
  "Science",
];

type LinkData = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  category: string;
  category_level1: string | null;
  category_level2: string | null;
  category_level3: string | null;
  type: string | null;
  platform: string | null;
  topics: string[] | null;
  keywords: string[] | null;
  short_description: string | null;
  status: string;
  created_at: string;
  llms_file_status: string | null;
  llms_last_update: string | null;
  is_featured?: boolean;
  featured_until?: string | null;
};

const ITEMS_PER_PAGE = 20;

export default function DirectoryPage() {
  const router = useRouter();
  const [links, setLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryLevel1, setSelectedCategoryLevel1] = useState<string>("all");
  const [selectedCategoryLevel2, setSelectedCategoryLevel2] = useState<string>("all");
  const [selectedCategoryLevel3, setSelectedCategoryLevel3] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchApprovedLinks();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategoryLevel1, selectedCategoryLevel2, selectedCategoryLevel3]);

  const fetchApprovedLinks = async () => {
    try {
      const { data: linksData, error } = await supabase
        .from("links")
        .select("*, category_level1, category_level2, category_level3, is_featured, featured_until")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setLinks(linksData || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching approved links:", err);
      setLoading(false);
    }
  };

  // Get unique category level 2 options based on selected level 1
  const categoryLevel2Options = useMemo(() => {
    if (selectedCategoryLevel1 === "all") return [];
    
    const linksWithLevel1 = links.filter(
      (link) => link.category_level1 === selectedCategoryLevel1
    );
    
    const level2Set = new Set<string>();
    linksWithLevel1.forEach((link) => {
      if (link.category_level2) {
        level2Set.add(link.category_level2);
      }
    });
    
    return Array.from(level2Set).sort();
  }, [links, selectedCategoryLevel1]);

  // Filter and sort links based on search and category filters
  const filteredLinks = useMemo(() => {
    let filtered = links;

    // Filter by category level 1
    if (selectedCategoryLevel1 !== "all") {
      filtered = filtered.filter(
        (link) => link.category_level1 === selectedCategoryLevel1
      );
    }

    // Filter by category level 2
    if (selectedCategoryLevel2 !== "all") {
      filtered = filtered.filter(
        (link) => link.category_level2 === selectedCategoryLevel2
      );
    }

    // Filter by category level 3
    if (selectedCategoryLevel3 !== "all") {
      filtered = filtered.filter(
        (link) => link.category_level3 === selectedCategoryLevel3
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (link) =>
          link.url.toLowerCase().includes(query) ||
          link.title?.toLowerCase().includes(query) ||
          link.description?.toLowerCase().includes(query) ||
          link.short_description?.toLowerCase().includes(query) ||
          link.keywords?.some((k) => k.toLowerCase().includes(query)) ||
          link.topics?.some((t) => t.toLowerCase().includes(query)) ||
          link.category_level1?.toLowerCase().includes(query) ||
          link.category_level2?.toLowerCase().includes(query) ||
          link.category_level3?.toLowerCase().includes(query)
      );
    }

    // Sort: featured links first, then by creation date
    filtered.sort((a, b) => {
      const aFeatured = a.is_featured && a.featured_until && new Date(a.featured_until) > new Date();
      const bFeatured = b.is_featured && b.featured_until && new Date(b.featured_until) > new Date();

      if (aFeatured && !bFeatured) return -1;
      if (!aFeatured && bFeatured) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return filtered;
  }, [links, selectedCategoryLevel1, selectedCategoryLevel2, selectedCategoryLevel3, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredLinks.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedLinks = filteredLinks.slice(startIndex, endIndex);

  const getLlmsStatus = (link: LinkData): { status: "updated" | "needs-update"; text: string } => {
    if (!link.llms_last_update || link.llms_file_status !== "updated") {
      return { status: "needs-update", text: "Needs Update" };
    }

    const lastUpdate = new Date(link.llms_last_update);
    const now = new Date();
    const daysOld = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOld < 90) {
      return { status: "updated", text: "Updated" };
    }

    return { status: "needs-update", text: "Needs Update" };
  };

  const truncateDescription = (text: string | null, maxLength: number = 150): string => {
    if (!text) return "No description available.";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  const getCategoryPath = (link: LinkData): string[] => {
    const parts: string[] = [];
    if (link.category_level1) parts.push(link.category_level1);
    if (link.category_level2) parts.push(link.category_level2);
    if (link.category_level3) parts.push(link.category_level3);
    
    // Fallback to legacy category if no hierarchical categories
    if (parts.length === 0) {
      parts.push(link.category || "Other");
    }
    
    return parts;
  };

  // Add JSON-LD structured data
  useEffect(() => {
    if (typeof window === "undefined") return;

    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "LLMO Directory — AI-Optimized Sites",
      description: "Explore blogs, startups, and creators optimized for LLM visibility.",
      numberOfItems: filteredLinks.length,
      itemListElement: paginatedLinks.map((link, index) => ({
        "@type": "ListItem",
        position: startIndex + index + 1,
        item: {
          "@type": "WebSite",
          name: link.title || link.url,
          url: link.url,
          description: link.short_description || link.description || "",
          ...(link.category_level1 && { category: link.category_level1 }),
        },
      })),
    };

    const creativeWorkSeries = {
      "@context": "https://schema.org",
      "@type": "CreativeWorkSeries",
      name: "LLMO Directory",
      description: "The world's first AI-optimized directory for blogs, websites, and creators.",
      url: typeof window !== "undefined" ? window.location.href : "",
    };

    // Remove existing scripts
    const existingItemList = document.querySelector('script[data-schema="itemlist"]');
    const existingSeries = document.querySelector('script[data-schema="series"]');
    if (existingItemList) existingItemList.remove();
    if (existingSeries) existingSeries.remove();

    // Add new scripts
    const script1 = document.createElement("script");
    script1.type = "application/ld+json";
    script1.setAttribute("data-schema", "itemlist");
    script1.text = JSON.stringify(itemList);
    document.head.appendChild(script1);

    const script2 = document.createElement("script");
    script2.type = "application/ld+json";
    script2.setAttribute("data-schema", "series");
    script2.text = JSON.stringify(creativeWorkSeries);
    document.head.appendChild(script2);

    return () => {
      const script1ToRemove = document.querySelector('script[data-schema="itemlist"]');
      const script2ToRemove = document.querySelector('script[data-schema="series"]');
      if (script1ToRemove) script1ToRemove.remove();
      if (script2ToRemove) script2ToRemove.remove();
    };
  }, [filteredLinks, paginatedLinks, startIndex]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <Spinner className="h-8 w-8 mx-auto mb-4" />
            <p className="font-mono text-muted-foreground">Loading directory...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
        <Navigation />

        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <p className="font-mono text-sm text-accent mb-2">// DIRECTORY</p>
            <h1 className="font-mono text-3xl font-bold mb-2">Discover AI-Optimized Sites</h1>
            <p className="text-muted-foreground mb-4">
              Explore blogs, startups, and creators optimized for LLM visibility.
            </p>
            <p className="font-mono text-sm text-accent">
              Now listing <strong className="text-foreground">{filteredLinks.length}</strong> AI-ready sites
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8 space-y-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by keyword, URL, title, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="font-mono pl-10 w-full bg-background border-border"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select value={selectedCategoryLevel1} onValueChange={setSelectedCategoryLevel1}>
                <SelectTrigger className="font-mono w-full bg-background border-border">
                  <SelectValue placeholder="Category Level 1" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-mono">All Categories</SelectItem>
                  {categoryLevel1Options.map((cat) => (
                    <SelectItem key={cat} value={cat} className="font-mono">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedCategoryLevel1 !== "all" && categoryLevel2Options.length > 0 && (
                <Select value={selectedCategoryLevel2} onValueChange={setSelectedCategoryLevel2}>
                  <SelectTrigger className="font-mono w-full bg-background border-border">
                    <SelectValue placeholder="Category Level 2" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="font-mono">All Level 2</SelectItem>
                    {categoryLevel2Options.map((cat) => (
                      <SelectItem key={cat} value={cat} className="font-mono">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={selectedCategoryLevel3} onValueChange={setSelectedCategoryLevel3}>
                <SelectTrigger className="font-mono w-full bg-background border-border">
                  <SelectValue placeholder="Category Level 3" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-mono">All Topics</SelectItem>
                  {categoryLevel3Options.map((cat) => (
                    <SelectItem key={cat} value={cat} className="font-mono">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Featured Section */}
          {!searchQuery && selectedCategoryLevel1 === "all" && filteredLinks.some(
            (link) => link.is_featured && link.featured_until && new Date(link.featured_until) > new Date()
          ) && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Badge className="font-mono bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                  ⭐ Featured
                </Badge>
                <h2 className="font-mono text-xl font-semibold">Featured Listings</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {filteredLinks
                  .filter(
                    (link) => link.is_featured && link.featured_until && new Date(link.featured_until) > new Date()
                  )
                  .slice(0, 6)
                  .map((link) => {
                    const llmsStatus = getLlmsStatus(link);
                    const categoryPath = getCategoryPath(link);

                    return (
                      <Card
                        key={link.id}
                        className="p-6 border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50 transition-all flex flex-col bg-background"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="font-mono text-xs bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                                ⭐ Featured
                              </Badge>
                            </div>
                            <Link href={`/directory/${link.id}`}>
                              <h3 className="font-mono text-lg font-semibold mb-2 line-clamp-2 hover:text-accent transition-colors">
                                {link.title || link.url}
                              </h3>
                            </Link>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-muted-foreground hover:text-accent transition-colors truncate block"
                            >
                              {link.url}
                            </a>
                          </div>
                        </div>

                        <p className="font-mono text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">
                        {truncateDescription(link.short_description || link.description)}
                      </p>

                        {/* Category Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {categoryPath.map((cat, index) => (
                            <Badge
                              key={`${cat}-${index}`}
                              variant={index === 0 ? "default" : "outline"}
                              className="font-mono text-xs"
                            >
                              {cat}
                            </Badge>
                          ))}
                        </div>

                        {/* LLMS Status */}
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                          <div className="flex items-center gap-2">
                            {llmsStatus.status === "updated" ? (
                              <span className="font-mono text-xs px-2 py-1 rounded bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {llmsStatus.text}
                              </span>
                            ) : (
                              <span className="font-mono text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {llmsStatus.text}
                              </span>
                            )}
                          </div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs"
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="font-mono bg-transparent h-8 px-3 border-border hover:border-accent"
                            >
                              Visit
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </a>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Regular Links Grid */}
          {paginatedLinks.length === 0 ? (
            <Card className="p-12 border-border text-center bg-background">
              <p className="font-mono text-lg text-muted-foreground mb-2">
                {searchQuery || selectedCategoryLevel1 !== "all"
                  ? "No links found matching your filters"
                  : "No approved links available yet"}
              </p>
              {!searchQuery && selectedCategoryLevel1 === "all" && (
                <p className="font-mono text-sm text-muted-foreground">
                  Check back soon or add your own link to get started!
                </p>
              )}
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {paginatedLinks
                  .filter(
                    (link) => !link.is_featured || !link.featured_until || new Date(link.featured_until) <= new Date()
                  )
                  .map((link) => {
                    const llmsStatus = getLlmsStatus(link);
                    const categoryPath = getCategoryPath(link);

                    return (
                      <Card
                        key={link.id}
                        className="p-6 border-border hover:border-accent/50 transition-all flex flex-col bg-background"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <Link href={`/directory/${link.id}`}>
                              <h3 className="font-mono text-lg font-semibold mb-2 line-clamp-2 hover:text-accent transition-colors">
                                {link.title || link.url}
                              </h3>
                            </Link>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-muted-foreground hover:text-accent transition-colors truncate block"
                            >
                              {link.url}
                            </a>
                          </div>
                        </div>

                        <p className="font-mono text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">
                          {truncateDescription(link.short_description || link.description)}
                        </p>

                        {/* Category Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {categoryPath.map((cat, index) => (
                            <Badge
                              key={`${cat}-${index}`}
                              variant={index === 0 ? "default" : "outline"}
                              className="font-mono text-xs"
                            >
                              {cat}
                            </Badge>
                          ))}
                        </div>

                        {/* LLMS Status */}
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                          <div className="flex items-center gap-2">
                            {llmsStatus.status === "updated" ? (
                              <span className="font-mono text-xs px-2 py-1 rounded bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {llmsStatus.text}
                              </span>
                            ) : (
                              <span className="font-mono text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {llmsStatus.text}
                              </span>
                            )}
                          </div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs"
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="font-mono bg-transparent h-8 px-3 border-border hover:border-accent"
                            >
                              Visit
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </a>
                        </div>
                      </Card>
                    );
                  })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="font-mono bg-background border-border"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="font-mono text-sm text-muted-foreground px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="font-mono bg-background border-border"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </main>

        <Footer />
      </div>
  );
}
