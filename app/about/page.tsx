"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FAQSection } from "@/components/faq-section"

export default function AboutPage() {
  useEffect(() => {
    // Auto-scroll to FAQ section if hash is present
    if (typeof window !== "undefined" && window.location.hash === "#faq") {
      setTimeout(() => {
        const faqElement = document.getElementById("faq");
        if (faqElement) {
          faqElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="system-label text-sm mb-2">// ABOUT</p>
            <h1 className="font-mono text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Be Visible to AI.
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
              The world's first directory built for LLM Optimization.
            </p>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">
            <Card className="p-8 border-border bg-card">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                LLMO Directory is a new kind of website catalog — designed not only for human visitors but for AI
                models, crawlers, and chatbots.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Traditional SEO focuses on search engines. We focus on{" "}
                <em className="text-emerald-600 dark:text-emerald-400">visibility to AI systems</em>.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Each link you add to the LLMO Directory becomes part of a structured, machine-readable ecosystem that
                large language models can easily analyze, reference, and rank.
              </p>
            </Card>

            <Card className="p-8 border-border bg-card">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Whether you're a writer, researcher, developer, or small business owner — if you create knowledge, your
                content deserves to be seen by AI.
              </p>
              <blockquote className="border-l-4 border-emerald-600 dark:border-emerald-400 pl-4 py-2 my-6">
                <p className="font-mono text-emerald-600 dark:text-emerald-400">
                  <span className="text-gray-600 dark:text-gray-400">&gt;</span> Be indexed. Be cited. Be visible to AI.
                </p>
              </blockquote>
            </Card>

            <div>
              <h2 className="font-mono text-2xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <span className="text-emerald-600 dark:text-emerald-400">&gt;</span> Why LLMO
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-6 border-border bg-card">
                  <h3 className="font-mono font-semibold mb-2 text-emerald-600 dark:text-emerald-400">
                    Optimized for AI parsing
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    Structured data, semantic markup, and machine-readable formats
                  </p>
                </Card>
                <Card className="p-6 border-border bg-card">
                  <h3 className="font-mono font-semibold mb-2 text-emerald-600 dark:text-emerald-400">
                    Fast, minimalist interface
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    Terminal-inspired design that's both human and AI friendly
                  </p>
                </Card>
                <Card className="p-6 border-border bg-card">
                  <h3 className="font-mono font-semibold mb-2 text-emerald-600 dark:text-emerald-400">
                    Free listing for 3 months
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    Try LLMO optimization risk-free with no credit card required
                  </p>
                </Card>
                <Card className="p-6 border-border bg-card">
                  <h3 className="font-mono font-semibold mb-2 text-emerald-600 dark:text-emerald-400">
                    Affordable Pro plan
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    Just $9/year for Pro or $30/year for Agency with unlimited submissions
                  </p>
                </Card>
                <Card className="p-6 border-border bg-card">
                  <h3 className="font-mono font-semibold mb-2 text-emerald-600 dark:text-emerald-400">
                    Automatic renewal reminders
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    Never lose your listing with email notifications via Resend
                  </p>
                </Card>
                <Card className="p-6 border-border bg-card">
                  <h3 className="font-mono font-semibold mb-2 text-emerald-600 dark:text-emerald-400">
                    Performance monitoring
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    Track how your content performs in the AI ecosystem
                  </p>
                </Card>
              </div>
            </div>

            <div className="mt-12">
              <h2 className="font-mono text-2xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <span className="text-emerald-600 dark:text-emerald-400">&gt;</span> Integrations
              </h2>

              <Card className="p-8 border-border bg-card mb-8">
                <h3 className="font-mono font-semibold mb-4 text-emerald-600 dark:text-emerald-400">
                  Seamless Integration with Industry-Leading Services
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  LLMO Directory integrates with Google OAuth for authentication, Stripe for secure payment processing, and Resend for email notifications and reminders.
                </p>
                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-4 border border-border rounded-lg">
                    <p className="font-mono font-semibold text-sm mb-2">Google OAuth</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Secure authentication</p>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <p className="font-mono font-semibold text-sm mb-2">Stripe</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Payment processing</p>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <p className="font-mono font-semibold text-sm mb-2">Resend</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Email notifications</p>
                  </div>
                </div>
              </Card>

              <h2 className="font-mono text-2xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-gray-100 mt-12">
                <span className="text-emerald-600 dark:text-emerald-400">&gt;</span> Mentioned In & Blog
              </h2>

              <div className="space-y-4 mb-8">
                <Card className="p-6 border-border bg-card border-l-4 border-l-emerald-600 dark:border-l-emerald-400">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">&gt;</span> "A minimalist yet
                    forward-thinking project for the next era of web visibility."
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">— AI Insider Newsletter</p>
                </Card>

                <Card className="p-6 border-border bg-card border-l-4 border-l-emerald-600 dark:border-l-emerald-400">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">&gt;</span> "Finally, an SEO
                    concept adapted for language models. Smart and overdue."
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">— Product Hunt user</p>
                </Card>

                <Card className="p-6 border-border bg-card border-l-4 border-l-emerald-600 dark:border-l-emerald-400">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">&gt;</span> "Be visible to AI —
                    what an iconic tagline."
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">— Early Adopter Blog</p>
                </Card>
              </div>

              <Card className="p-8 border-border bg-card text-center">
                <p className="system-label text-sm mb-4">// READ MORE ON MEDIUM</p>
                <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  Visit our Medium page for updates, case studies, and LLMO insights.
                </p>
                <a href="https://medium.com/@abvcreative" target="_blank" rel="me noopener noreferrer">
                  <Button className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent">
                    Open Blog →
                  </Button>
                </a>
              </Card>
            </div>

            <div className="mt-12">
              <h2 className="font-mono text-2xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <span className="text-emerald-600 dark:text-emerald-400">&gt;</span> Learning Resources
              </h2>

              <Card className="p-8 border-border bg-card">
                <p className="system-label text-sm mb-4">// LEARNING RESOURCES</p>
                <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  A curated collection of materials on LLMO, AI visibility, and productivity to help you master the next generation of content optimization.
                </p>
                <div className="space-y-6">
                  {/* Free book PDF */}
                  <div className="flex gap-4 items-start">
                    <Image
                      src="/images/LLM2small.png"
                      alt="LLMO Quick Start — free ebook cover"
                      width={64}
                      height={96}
                      className="hidden sm:block w-16 h-auto rounded-md shadow-sm flex-shrink-0"
                    />
                    <div className="flex-1">
                      <p className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                        <span className="text-emerald-600 dark:text-emerald-400">&gt;</span>{" "}
                        <Link
                          href="/download-book"
                          className="hover:underline font-semibold"
                        >
                          Download free book (PDF)
                        </Link>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                        Get your free copy of <strong>LLMO Quick Start: How to Make Your Content Visible in the Age of AI</strong> — a practical guide to AI visibility optimization.
                      </p>
                    </div>
                  </div>

                  {/* LLMO: The Next SEO Revolution */}
                  <div className="flex gap-4 items-start">
                    <Image
                      src="/images/LLMOd.jpg"
                      alt="LLMO: The Next SEO Revolution — book cover"
                      width={64}
                      height={96}
                      className="hidden sm:block w-16 h-auto rounded-md shadow-sm flex-shrink-0"
                    />
                    <div className="flex-1">
                      <p className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                        <span className="text-emerald-600 dark:text-emerald-400">&gt;</span>{" "}
                        <a
                          href="https://www.amazon.com/dp/B0FYRSSZKL"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline font-semibold"
                        >
                          LLMO: The Next SEO Revolution (Kindle Edition)
                        </a>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                        The complete guide to LLM Optimization. Learn how to make your content visible in ChatGPT, Claude, Gemini, and other AI systems. Master the transition from traditional SEO to LLMO.
                      </p>
                    </div>
                  </div>

                  {/* Future-Proof Your Productivity */}
                  <div className="flex gap-4 items-start">
                    <Image
                      src="/images/FP1.jpg"
                      alt="Future-Proof Your Productivity — book cover"
                      width={64}
                      height={96}
                      className="hidden sm:block w-16 h-auto rounded-md shadow-sm flex-shrink-0"
                    />
                    <div className="flex-1">
                      <p className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                        <span className="text-emerald-600 dark:text-emerald-400">&gt;</span>{" "}
                        <a
                          href="https://www.amazon.com/dp/B0FQ5SWMTJ"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline font-semibold"
                        >
                          Future-Proof Your Productivity (Kindle Edition)
                        </a>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                        Build your "second brain" with AI and no-code automation. Learn productivity strategies, workflow optimization, and gain a competitive advantage in the AI era.
                      </p>
                    </div>
                  </div>

                  {/* Medium: coming soon (без обложки) */}
                  <div className="flex gap-4 items-start">
                    <div className="hidden sm:block w-16 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                        <span className="text-emerald-600 dark:text-emerald-400">&gt;</span>{" "}
                        <span className="text-gray-500 dark:text-gray-500 font-semibold">
                          Articles on Medium (coming soon)
                        </span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                        Case studies, tutorials, and insights on AI visibility optimization will be available soon.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-8 border-accent/50 bg-card text-center">
              <p className="system-label text-sm mb-4">// READY TO GET STARTED?</p>
              <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                Join the AI-optimized directory and make your content discoverable to the next generation of search.
              </p>
              <Link href="/register">
                <Button className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent">
                  Create Free Account
                </Button>
              </Link>
            </Card>
          </div>

          {/* FAQ Section */}
          <FAQSection />
        </div>
      </main>

      <Footer />
    </div>
  )
}
