"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { CheckCircle2 } from "lucide-react"

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  if (!searchParams) return null;
  const sessionId = searchParams.get("session_id")
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!sessionId) {
      router.push("/dashboard")
      return
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push("/dashboard")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [sessionId, router])

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 border-accent/50 text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle2 className="h-16 w-16 text-accent" />
          </div>

          <h1 className="font-mono text-2xl font-bold mb-4">Payment Successful!</h1>

          <p className="text-muted-foreground mb-6 leading-relaxed">
            Your subscription has been activated. You now have access to Pro features.
          </p>

          <Card className="p-4 border-border bg-muted/30 mb-6">
            <p className="font-mono text-xs text-accent">// SYSTEM MESSAGE: Payment confirmed. Subscription active.</p>
          </Card>

          <div className="space-y-3">
            <Link href="/dashboard">
              <Button className="w-full font-mono bg-accent text-accent-foreground hover:bg-accent/90">
                Go to Dashboard
              </Button>
            </Link>

            <p className="text-xs text-muted-foreground font-mono">Redirecting in {countdown} seconds...</p>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
