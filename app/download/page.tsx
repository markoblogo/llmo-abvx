"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"

export default function DownloadPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [downloadCount, setDownloadCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login?redirect=/download")
        return
      }

      setUser(user)
      setLoading(false)
    }

    checkAuth()

    const fetchDownloadCount = async () => {
      const { count } = await supabase.from("downloads").select("*", { count: "exact", head: true })

      setDownloadCount(count || 0)
    }

    fetchDownloadCount()
  }, [router])

  const handleDownloadPDF = async () => {
    setDownloading(true)
    setError(null)

    try {
      if (!user) {
        router.push("/login")
        return
      }

      // Record the download
      await supabase.from("downloads").insert({
        user_id: user.id,
        timestamp: new Date().toISOString(),
      })

      // Increment download count
      setDownloadCount((prev) => prev + 1)

      // Trigger PDF download
      const link = document.createElement("a")
      link.href = "/books/LLMO_Quick_Start.pdf"
      link.download = "LLMO_Quick_Start.pdf"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err: any) {
      setError("Failed to download PDF. Please try again.")
      console.error(err)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="font-mono text-muted-foreground">Loading...</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        {/* Download Banner */}
        <section className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-5xl mx-auto rounded-lg overflow-hidden">
            <Image
              src="/images/downlBllmo.png"
              alt="LLMO Quick Start: Download Free Guide"
              width={1200}
              height={600}
              priority
              className="w-full h-auto"
            />
          </div>
        </section>

        {/* Download Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto">
            <Card className="p-8 md:p-12 border-accent/50">
              <div className="text-center mb-8">
                <p className="font-mono text-sm text-accent mb-3">// FREE EBOOK</p>
                <h1 className="font-mono text-3xl md:text-4xl font-bold mb-4">
                  LLMO Quick Start: How to Make Your Content Visible in the Age of AI
                </h1>
                <p className="text-lg text-muted-foreground">
                  Learn the essential strategies to optimize your content for Large Language Models and earn citations
                  from AI.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm font-mono">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div className="p-6 border border-border rounded-lg bg-muted/30">
                  <h3 className="font-mono font-semibold mb-3">What's Inside:</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-accent font-mono">→</span>
                      <span>Understanding LLM Optimization fundamentals</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent font-mono">→</span>
                      <span>How AI models evaluate and cite your content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent font-mono">→</span>
                      <span>Practical 15-minute optimization guide</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent font-mono">→</span>
                      <span>Real-world case studies and before/after examples</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent font-mono">→</span>
                      <span>Top 10 tools for LLMO success</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent font-mono">→</span>
                      <span>The future of AI search and agentic systems</span>
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                  size="lg"
                  className="w-full font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent text-lg py-6"
                >
                  {downloading ? "Downloading..." : "Download Free PDF"}
                </Button>

                <div className="p-4 border border-border rounded-lg text-center bg-muted/30">
                  <p className="font-mono text-sm text-muted-foreground">
                    Downloaded by <span className="text-accent font-semibold">{downloadCount.toLocaleString()}</span>{" "}
                    creators worldwide
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Amazon Banner */}
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <Card className="overflow-hidden border-accent/50">
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="p-8">
                  <Image
                    src="/images/amazBllmo.png"
                    alt="LLMO: The Next SEO Revolution on Amazon"
                    width={400}
                    height={500}
                    className="w-full h-auto"
                  />
                </div>
                <div className="p-8">
                  <p className="font-mono text-sm text-accent mb-2">// FULL EDITION AVAILABLE</p>
                  <h2 className="font-mono text-2xl font-bold mb-4">Get the Complete LLMO Handbook</h2>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Want the full, in-depth guide with 50+ case studies, advanced strategies, and complete frameworks?
                    The complete edition is available on Amazon with everything you need to master LLM Optimization.
                  </p>
                  <a href="https://www.amazon.com/dp/B0FYRSSZKL" target="_blank" rel="noopener noreferrer">
                    <Button
                      size="lg"
                      className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent w-full"
                    >
                      Read Full Edition on Amazon
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16">
          <Card className="max-w-3xl mx-auto p-8 md:p-12 border-accent/50 bg-muted/30">
            <div className="text-center">
              <h2 className="font-mono text-2xl font-bold mb-4">Ready to Get Listed?</h2>
              <p className="text-muted-foreground mb-6">
                Add your site to the LLMO Directory and start earning AI citations today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent"
                  >
                    Add Your Link
                  </Button>
                </Link>
                <Link href="/analyzer">
                  <Button size="lg" variant="outline" className="font-mono bg-transparent">
                    Test AI Readability
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  )
}
