import { Suspense } from "react";
import { AnalyzerPageClient } from "./AnalyzerPageClient";

export default function AnalyzerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="font-mono text-sm text-muted-foreground">Loading analyzer...</p>
        </div>
      }
    >
      <AnalyzerPageClient />
    </Suspense>
  );
}
