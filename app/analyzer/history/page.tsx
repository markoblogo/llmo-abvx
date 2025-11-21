"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Analysis = {
  id: string;
  url: string;
  score: number;
  recommendations: string;
  created_at: string;
};

type AnalysisWithChange = Analysis & {
  change?: number;
  previousScore?: number;
};

export default function AnalyzerHistoryPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;

  const [analyses, setAnalyses] = useState<AnalysisWithChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (!session || !user) {
      router.push("/login?next=/analyzer/history");
      return;
    }

    fetchAnalyses();
  }, [session, status, router, user]);

  const fetchAnalyses = async () => {
    try {
      const userId = (user as any)?.id || user?.email;
      if (!userId) {
        setError("Unable to identify user");
        setLoading(false);
        return;
      }

      const { data: analysesData, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate changes since last analysis for each URL
      // Group analyses by URL and calculate changes
      const urlMap = new Map<string, Analysis[]>();
      (analysesData || []).forEach((analysis) => {
        if (!urlMap.has(analysis.url)) {
          urlMap.set(analysis.url, []);
        }
        urlMap.get(analysis.url)!.push(analysis);
      });

      // Sort each URL's analyses by date (newest first) and calculate changes
      const analysesWithChanges: AnalysisWithChange[] = (analysesData || []).map((analysis) => {
        const urlAnalyses = urlMap.get(analysis.url) || [];
        // Sort by date descending
        const sortedAnalyses = [...urlAnalyses].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Find current analysis index
        const currentIndex = sortedAnalyses.findIndex((a) => a.id === analysis.id);
        const previousAnalysis = currentIndex >= 0 && currentIndex < sortedAnalyses.length - 1
          ? sortedAnalyses[currentIndex + 1]
          : undefined;

        const change = previousAnalysis
          ? analysis.score - previousAnalysis.score
          : undefined;

        return {
          ...analysis,
          change,
          previousScore: previousAnalysis?.score,
        };
      });

      setAnalyses(analysesWithChanges);
      setLoading(false);
    } catch (err: any) {
      console.error("Error fetching analyses:", err);
      toast.error(err.message || "Failed to fetch analysis history");
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-500";
    if (score >= 3) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 4) return "bg-green-500/10 text-green-500";
    if (score >= 3) return "bg-yellow-500/10 text-yellow-500";
    return "bg-red-500/10 text-red-500";
  };

  const getChangeIcon = (change?: number) => {
    if (change === undefined || change === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getChangeText = (change?: number, previousScore?: number) => {
    if (change === undefined) return "First analysis";
    if (change === 0) return "No change";
    const sign = change > 0 ? "+" : "";
    return `${sign}${change} (was ${previousScore})`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <Spinner className="h-8 w-8 mx-auto mb-4" />
            <p className="font-mono text-muted-foreground">Loading analysis history...</p>
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
          <Link href="/analyzer">
            <Button variant="ghost" className="font-mono mb-4 bg-transparent">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Analyzer
            </Button>
          </Link>
          <p className="font-mono text-sm text-accent mb-2">// ANALYSIS HISTORY</p>
          <h1 className="font-mono text-3xl font-bold mb-2">Analysis History</h1>
          <p className="text-muted-foreground">
            View all your website analyses and track improvements over time
          </p>
        </div>

        {/* Analyses Table */}
        <Card className="p-6 border-border">
          {analyses.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-mono text-lg text-muted-foreground mb-4">
                No analyses found
              </p>
              <p className="font-mono text-sm text-muted-foreground mb-6">
                Start analyzing websites to see your history here
              </p>
              <Link href="/analyzer">
                <Button className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent">
                  Analyze a Website
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs text-muted-foreground uppercase">
                      URL
                    </TableHead>
                    <TableHead className="font-mono text-xs text-muted-foreground uppercase">
                      Score
                    </TableHead>
                    <TableHead className="font-mono text-xs text-muted-foreground uppercase">
                      Date
                    </TableHead>
                    <TableHead className="font-mono text-xs text-muted-foreground uppercase">
                      Change
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyses.map((analysis) => {
                    let recommendationsArray: string[] = [];
                    try {
                      recommendationsArray = JSON.parse(analysis.recommendations);
                    } catch {
                      recommendationsArray = [analysis.recommendations];
                    }

                    return (
                      <TableRow key={analysis.id} className="hover:bg-muted/30">
                        <TableCell>
                          <a
                            href={analysis.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm text-accent hover:underline flex items-center gap-1 max-w-md truncate"
                            title={analysis.url}
                          >
                            {analysis.url}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-mono text-sm font-semibold px-2 py-1 rounded ${getScoreBgColor(
                              analysis.score
                            )}`}
                          >
                            {analysis.score}/5
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">
                            {new Date(analysis.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getChangeIcon(analysis.change)}
                            <span className="font-mono text-xs text-muted-foreground">
                              {getChangeText(analysis.change, analysis.previousScore)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </main>

      <Footer />
    </div>
  );
}

