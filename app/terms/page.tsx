import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card } from "@/components/ui/card"

export const metadata = {
  title: "Terms of Use — LLMO Directory",
  description: "Terms of use for LLMO Directory. Learn about our service terms and conditions.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <p className="font-mono text-sm text-accent mb-2">// LEGAL DOCUMENTATION</p>
          <h1 className="font-mono text-4xl font-bold mb-4">Terms of Use</h1>
          <p className="text-gray-600 dark:text-gray-400">Last updated: 2025-01-23</p>
        </div>

        <Card className="p-8 border-border space-y-8">
          <section>
            <h2 className="font-mono text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">1. Services</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Directory of AI-optimized links. Free: 1 link/3 months. Pro: €1 per year per link.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">2. Accounts</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Provide accurate data; you are responsible for your activity.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">3. Payments</h2>
            <p className="text-gray-700 dark:text-gray-300">Processed via Stripe. Refunds per Stripe policy.</p>
          </section>

          <section>
            <h2 className="font-mono text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">4. Content</h2>
            <p className="text-gray-700 dark:text-gray-300">No illegal or copyright-infringing submissions.</p>
          </section>

          <section>
            <h2 className="font-mono text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">5. Termination</h2>
            <p className="text-gray-700 dark:text-gray-300">We may suspend accounts for abuse.</p>
          </section>

          <section>
            <h2 className="font-mono text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">6. Liability</h2>
            <p className="text-gray-700 dark:text-gray-300">Service provided "as is". Limited liability.</p>
          </section>

          <section>
            <h2 className="font-mono text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">7. Contact</h2>
            <p className="text-gray-700 dark:text-gray-300">
              <a href="mailto:a.biletskiy@gmail.com" className="text-accent hover:underline">
                a.biletskiy@gmail.com
              </a>
            </p>
          </section>

          <div className="pt-6 border-t border-border">
            <p className="font-mono text-xs text-gray-600 dark:text-gray-400">
              // SYSTEM NOTE: These terms are effective as of January 23, 2025.
            </p>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
