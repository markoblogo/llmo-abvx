import { Suspense } from "react";
import { DashboardClient } from "./DashboardClient";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col">
          <div className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
            <p className="font-mono text-sm text-muted-foreground">Loading dashboard…</p>
          </div>
        </div>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
