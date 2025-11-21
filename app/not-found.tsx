import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Terminal-style error message */}
        <div className="space-y-4">
          <div className="font-mono text-sm text-muted-foreground">// ERROR_CODE: 404</div>
          <h1 className="text-6xl font-bold font-mono text-accent">404</h1>
          <h2 className="text-2xl font-mono text-foreground">Page Not Found</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The page you're looking for doesn't exist in our directory. It may have been moved or deleted.
          </p>
        </div>

        {/* System message */}
        <div className="border border-border bg-card p-6 rounded-lg font-mono text-sm text-left">
          <div className="text-accent mb-2">// SYSTEM_MESSAGE:</div>
          <div className="text-muted-foreground space-y-1">
            <div>→ Requested URL not found in routing table</div>
            <div>→ Redirecting to available routes...</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="font-mono">
            <Link href="/">→ Return Home</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="font-mono bg-transparent">
            <Link href="/contact">→ Report Issue</Link>
          </Button>
        </div>

        {/* Quick links */}
        <div className="pt-8 border-t border-border">
          <div className="font-mono text-sm text-muted-foreground mb-4">// QUICK_NAVIGATION:</div>
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link href="/pricing" className="text-accent hover:underline font-mono">
              Pricing
            </Link>
            <Link href="/about" className="text-accent hover:underline font-mono">
              About
            </Link>
            <Link href="/faq" className="text-accent hover:underline font-mono">
              FAQ
            </Link>
            <Link href="/contact" className="text-accent hover:underline font-mono">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
