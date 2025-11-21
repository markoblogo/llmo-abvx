"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FAQPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to /about#faq to preserve SEO and old links
    router.replace("/about#faq");
  }, [router]);

  // Show loading state during redirect
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="font-mono text-muted-foreground">Redirecting to About page...</p>
    </div>
  );
}
