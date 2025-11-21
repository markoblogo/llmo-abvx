import { Suspense } from "react";
import { PricingPageClient } from "./PricingPageClient";

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col">
          <div className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
            <p className="font-mono text-sm text-muted-foreground">Loading pricing...</p>
          </div>
        </div>
      }
    >
      <PricingPageClient />
    </Suspense>
  );
}
