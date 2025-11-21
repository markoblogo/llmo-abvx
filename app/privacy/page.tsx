import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card } from "@/components/ui/card"

export const metadata = {
  title: "Privacy Policy — LLMO Directory",
  description: "Privacy policy for LLMO Directory. Learn how we collect, use, and protect your data.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <p className="font-mono text-sm text-accent mb-2">// LEGAL DOCUMENTATION</p>
          <h1 className="font-mono text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-gray-600 dark:text-gray-400">Last updated: 2025-01-23</p>
        </div>

        <Card className="p-8 border-border space-y-8">
          <div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              LLMO Directory ("we", "us", "our") operates https://llmo.abvx.xyz.
            </p>
          </div>

          <section>
            <h2 className="font-mono text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
              1. Information we collect
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Account data (email, name), content data (links, tags), usage analytics, and Stripe billing data.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">2. How we use it</h2>
            <p className="text-gray-700 dark:text-gray-300">
              To operate the service, send reminders (Resend), and process payments (Stripe).
            </p>
          </section>

          <section>
            <h2 className="font-mono text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">3. Sharing</h2>
            <p className="text-gray-700 dark:text-gray-300">
              We only share data with service providers: Supabase, Stripe, Resend.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">4. Retention</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Free listings expire after 3 months. Subscriptions last 1 year by default.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">5. Rights</h2>
            <p className="text-gray-700 dark:text-gray-300">
              You may request deletion or correction via{" "}
              <a href="mailto:a.biletskiy@gmail.com" className="text-accent hover:underline">
                a.biletskiy@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-mono text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">6. Security</h2>
            <p className="text-gray-700 dark:text-gray-300">Standard Supabase + Stripe security.</p>
          </section>

          <section>
            <h2 className="font-mono text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">7. Contact</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Email:{" "}
              <a href="mailto:a.biletskiy@gmail.com" className="text-accent hover:underline">
                a.biletskiy@gmail.com
              </a>
            </p>
          </section>

          <div className="pt-6 border-t border-border">
            <p className="font-mono text-xs text-gray-600 dark:text-gray-400">
              // SYSTEM NOTE: This privacy policy is effective as of January 23, 2025.
            </p>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
