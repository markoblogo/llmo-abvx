import { Suspense } from "react";
import { LoginPageClient } from "./LoginPageClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="font-mono text-sm text-muted-foreground">Loading login...</p>
        </div>
      }
    >
      <LoginPageClient />
    </Suspense>
  );
}
