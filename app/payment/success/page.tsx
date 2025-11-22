import { Suspense } from "react"
import { PaymentSuccessPageClient } from "./PaymentSuccessPageClient"

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="font-mono text-sm text-muted-foreground">Loading payment status...</p>
        </div>
      }
    >
      <PaymentSuccessPageClient />
    </Suspense>
  )
}
