import { Suspense } from "react";
import { AddLinkPageClient } from "./AddLinkPageClient";

export default function AddLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col">
          <div className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
            <p className="font-mono text-sm text-muted-foreground">Loading add-link page...</p>
          </div>
        </div>
      }
    >
      <AddLinkPageClient />
    </Suspense>
  );
}
