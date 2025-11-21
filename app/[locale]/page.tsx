import { getTranslation, supportedLocales } from "@/lib/i18n";
import { debugLog } from "@/lib/debugLogger";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Card } from "@/components/ui/card";

export default async function LocalePage({ params }: { params: { locale: string } }) {
  try {
    const { locale } = params;
    debugLog("Rendering locale page", locale);

    const t = await getTranslation(locale);
    debugLog("Loaded translation keys", Object.keys(t || {}));

    // ✅ Ensure translation always exists with fallbacks
    const heroTitle = t?.hero_title || "LLMO Directory — Visible to AI";
    const heroSubtitle = t?.hero_subtitle || "Tools to make your site visible inside ChatGPT, Claude, Gemini and other AI assistants — not just in search results.";
    const ctaAnalyze = t?.cta_analyze || "Analyze Your Site";
    const ctaAddLink = t?.cta_add_link || "Add Your Link";

    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-background border-b border-border">
            <div className="container mx-auto px-4 py-10 md:py-14">
              <div className="max-w-3xl mx-auto text-center">
                <h1 className="font-mono text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-foreground">
                  {heroTitle}
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                  {heroSubtitle}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href={`/${locale}/analyzer`}>
                    <Button
                      size="lg"
                      className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent w-full sm:w-auto"
                    >
                      {ctaAnalyze}
                    </Button>
                  </Link>
                  <Link href={`/${locale}/register`}>
                    <Button
                      size="lg"
                      variant="outline"
                      className="font-mono bg-transparent w-full sm:w-auto"
                    >
                      {ctaAddLink}
                    </Button>
                  </Link>
                </div>
                <div className="mt-4 flex items-center justify-center gap-3 text-sm md:text-base text-muted-foreground">
                  <Image
                    src="/images/LLM2small.png"
                    alt="LLMO Quick Start ebook cover"
                    width={40}
                    height={56}
                    className="rounded shadow-sm flex-shrink-0"
                  />
                  <p className="font-mono max-w-md">
                    Get a free LLMO playbook when you sign up — including the book as a downloadable gift.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* One platform, three tools */}
          <section className="container mx-auto px-4 pt-10 pb-12 md:pt-12 md:pb-16">
            <div className="max-w-5xl mx-auto">
              <p className="mt-10 font-mono text-sm md:text-base text-accent tracking-wide font-semibold mb-8 text-center">// One platform, three tools</p>
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="p-6 border-border bg-card">
                  <h3 className="font-mono text-xl font-semibold mb-3">AI Analyzer</h3>
                  <p className="font-mono text-sm text-muted-foreground leading-relaxed mb-2">
                    Get an AI readability score (1–5) and concrete suggestions to make your content easier for language models to understand and reuse.
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    Free analyzer available — no registration required.
                  </p>
                </Card>

                <Card className="p-6 border-border bg-card">
                  <h3 className="font-mono text-xl font-semibold mb-3">LLMO Directory</h3>
                  <p className="font-mono text-sm text-muted-foreground leading-relaxed mb-2">
                    List your site in the first LLM-native directory so ChatGPT, Claude, Gemini and other AI systems can discover and cite your content.
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    Start with a free trial for one link.
                  </p>
                </Card>

                <Card className="p-6 border-border bg-card">
                  <h3 className="font-mono text-xl font-semibold mb-3">llms.txt & Metadata AI</h3>
                  <p className="font-mono text-sm text-muted-foreground leading-relaxed mb-2">
                    Keep your site AI-ready with automatic llms.txt updates and AI-generated metadata suggestions tailored for language models.
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    Included in the Pro plan ($9 / year).
                  </p>
                </Card>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="container mx-auto px-4 py-10 md:py-14">
            <div className="max-w-4xl mx-auto">
              <p className="mt-8 text-base md:text-lg font-mono font-semibold text-center text-accent tracking-wide mb-6">// How it works</p>
              <div className="grid gap-8 md:grid-cols-3">
                <div>
                  <h3 className="font-mono text-lg font-semibold mb-3">1. Analyze your site</h3>
                  <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                    Run the AI Analyzer and get your AI visibility score.
                    <br />
                    See what models understand — and what they ignore.
                  </p>
                </div>

                <div>
                  <h3 className="font-mono text-lg font-semibold mb-3">2. Fix and publish</h3>
                  <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                    Apply the recommendations, generate llms.txt and AI-friendly metadata.
                    <br />
                    Make your content structurally clear for language models.
                  </p>
                </div>

                <div>
                  <h3 className="font-mono text-lg font-semibold mb-3">3. Be visible to AI</h3>
                  <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                    Add your site to the LLMO Directory so ChatGPT, Claude and Gemini can find and reference your brand inside their answers.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Who is LLMO for? */}
          <section className="container mx-auto px-4 py-10 md:py-14">
            <div className="max-w-4xl mx-auto">
              <p className="mt-8 text-base md:text-lg font-mono font-semibold text-center text-accent tracking-wide mb-6">// Who is LLMO for?</p>
              <div className="grid gap-4 md:grid-cols-2">
                <ul className="space-y-3">
                  <li className="font-mono text-sm text-muted-foreground">
                    - Content creators and publishers who don't want to vanish inside AI-generated answers.
                  </li>
                  <li className="font-mono text-sm text-muted-foreground">
                    - SEO and marketing teams exploring the post-SEO, LLM-first landscape.
                  </li>
                </ul>
                <ul className="space-y-3">
                  <li className="font-mono text-sm text-muted-foreground">
                    - Founders and indie hackers who want their projects to be discoverable by AI assistants.
                  </li>
                  <li className="font-mono text-sm text-muted-foreground">
                    - Agencies that want to offer LLM visibility audits and reports to their clients.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Learn the framework behind LLMO */}
          <section className="container mx-auto px-4 pt-8 pb-12 md:pt-10 md:pb-16">
            <div className="max-w-5xl mx-auto">
              <p className="text-base md:text-lg font-mono font-semibold text-center text-accent tracking-wide mb-6">
                // Learn the framework behind LLMO [v3]
              </p>
              <div className="flex justify-center">
                <div className="space-y-6 md:space-y-8 max-w-3xl">
                  <p className="text-sm md:text-base text-muted-foreground">
                    LLMO Directory is built on the ideas from Anton Biletskyi-Volokh&apos;s books about AI visibility and productivity.
                  </p>

                  <div className="space-y-5">
                    {/* Book 1 */}
                    <div className="flex items-start gap-4">
                      <Image
                        src="/images/LLMOd.jpg"
                        alt="LLMO: The Next SEO Revolution"
                        width={64}
                        height={96}
                        className="rounded shadow-sm flex-shrink-0 object-cover"
                      />
                      <div>
                        <h3 className="font-mono text-sm md:text-base font-semibold">
                          LLMO: The Next SEO Revolution
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          How to stay visible inside ChatGPT, Claude, Gemini, and other AI systems when traditional SEO stops working.
                        </p>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="mt-2 font-mono text-xs md:text-sm"
                        >
                          <Link
                            href="https://www.amazon.com/dp/B0FYRSSZKL"
                            target="_blank"
                            rel="noreferrer"
                          >
                            View on Amazon →
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Book 2 */}
                    <div className="flex items-start gap-4">
                      <Image
                        src="/images/FP1.jpg"
                        alt="Future-Proof Your Productivity"
                        width={64}
                        height={96}
                        className="rounded shadow-sm flex-shrink-0 object-cover"
                      />
                      <div>
                        <h3 className="font-mono text-sm md:text-base font-semibold">
                          Future-Proof Your Productivity
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          How to use AI and no-code automation to accelerate your work, innovate your role, and stay relevant in the AI decade.
                        </p>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="mt-2 font-mono text-xs md:text-sm"
                        >
                          <Link
                            href="https://www.amazon.com/dp/B0FQ5SWMTJ"
                            target="_blank"
                            rel="noreferrer"
                          >
                            View on Amazon →
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>


          <section className="container mx-auto px-4 py-16">
            <Card className="max-w-3xl mx-auto p-8 md:p-12 border-accent/50 bg-card">
              <div className="text-center">
                <p className="system-label text-sm mb-4">// READY TO START?</p>
                <h2 className="font-mono text-2xl md:text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                  Join Now — Be Visible to AI
                </h2>
                <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  Get your first link free for 3 months. No credit card required. Upgrade to Pro or Agency for Analyzer Pro, AI Metadata, and automatic llms.txt updates.
                </p>
                <Link href={`/${locale}/register`}>
                  <Button size="lg" className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent">
                    Get Free Book + List Your Site
                  </Button>
                </Link>
              </div>
            </Card>
          </section>
        </main>

        <Footer />
      </div>
    );
  } catch (error: any) {
    console.error("LocalePage error:", error);
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Render Error</h1>
            <p className="text-muted-foreground">{error.message}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
}

export async function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}
