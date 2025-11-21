import type React from "react"
import type { Metadata } from "next"
import { IBM_Plex_Mono, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/sonner"
import { WelcomeModal } from "@/components/welcome-modal"
import { AdminEntryHandler } from "@/components/admin-entry-handler"
import { LocaleLang } from "@/components/locale-lang"
import "./globals.css"

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans",
  display: "swap",
  preload: true,
})
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
  preload: true,
})

export const metadata: Metadata = {
  title: "LLMO Directory — Be Visible to AI | Analyzer Pro, Metadata AI & LLM Optimization",
  description:
    "LLMO Directory helps blogs, startups, and creators get discovered by AI. Analyze, optimize metadata, and auto-generate llms.txt for better AI visibility.",
  keywords: [
    "LLMO",
    "AI SEO",
    "Analyzer Pro",
    "Metadata AI",
    "llms.txt generator",
    "AI visibility",
    "AI content optimization",
    "directory for websites",
    "featured listings",
    "LLMO Directory",
  ],
  authors: [{ name: "Anton Biletskyi-Volokh" }],
  creator: "Anton Biletskyi-Volokh",
  publisher: "LLMO Directory",
  metadataBase: new URL("https://llmo.abvx.xyz"),
  alternates: {
    canonical: "https://llmo.abvx.xyz",
    languages: {
      en: "https://llmo.abvx.xyz/en",
      fr: "https://llmo.abvx.xyz/fr",
      es: "https://llmo.abvx.xyz/es",
      uk: "https://llmo.abvx.xyz/uk",
      ru: "https://llmo.abvx.xyz/ru",
      zh: "https://llmo.abvx.xyz/zh",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://llmo.abvx.xyz",
    title: "LLMO Directory — Be Visible to AI",
    description:
      "Get listed, analyze your site, and make your content machine-readable. Join the world's first AI optimization directory.",
    siteName: "LLMO Directory",
    images: [
      {
        url: "/og-cover.png",
        width: 1200,
        height: 630,
        alt: "LLMO Directory - Be Visible to AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LLMO Directory — Be Visible to AI",
    description: "Add your link, run Analyzer Pro, and optimize your content for LLMs.",
    images: ["/og-cover.png"],
    creator: "@llmo_directory",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  generator: "v0.app",
}

// Note: WelcomeModal is already a client component, so we import it directly
// Dynamic import with ssr: false is not needed in Server Components

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "LLMO Directory",
                url: "https://llmo.abvx.xyz",
                logo: "https://llmo.abvx.xyz/og-cover.png",
                sameAs: [
                  "https://x.com/abv_creative",
                  "https://medium.com/@abvcreative",
                  "https://github.com/markoblogo",
                ],
                description:
                  "The world's first LLM Optimization directory for blogs, startups, and creators.",
              },
              {
                "@context": "https://schema.org",
                "@type": "Product",
                name: "LLMO Pro Plan",
                description:
                  "Pro plan includes Analyzer Pro, Metadata AI, and auto llms.txt updates.",
                brand: "LLMO Directory",
                offers: {
                  "@type": "Offer",
                  url: "https://llmo.abvx.xyz/pricing",
                  priceCurrency: "USD",
                  price: "9.00",
                  availability: "https://schema.org/InStock",
                },
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: "4.9",
                  reviewCount: "372",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "Product",
                name: "LLMO Agency Plan",
                description:
                  "Agency plan with up to 50 managed links, team access, and featured boosts.",
                brand: "LLMO Directory",
                offers: {
                  "@type": "Offer",
                  url: "https://llmo.abvx.xyz/pricing",
                  priceCurrency: "USD",
                  price: "30.00",
                  availability: "https://schema.org/InStock",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "Book",
                name: "LLMO: The Next SEO Revolution",
                author: { "@type": "Person", name: "Anton Biletskyi-Volokh" },
                publisher: { "@type": "Organization", name: "LLMO Directory" },
                inLanguage: "en",
                url: "https://amazon.com/dp/B0FYRSSZKL",
                image: "https://llmo.abvx.xyz/og-cover.png",
                bookEdition: "1st Edition",
                description:
                  "A complete guide to mastering AI visibility and Large Language Model Optimization.",
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "LLMO Directory",
                url: "https://llmo.abvx.xyz",
                description:
                  "The world's first AI-optimized directory with Analyzer Pro, Metadata AI, and Featured Listings for LLM visibility and structured content.",
                publisher: {
                  "@type": "Organization",
                  name: "LLMO Directory",
                  logo: {
                    "@type": "ImageObject",
                    url: "https://llmo.abvx.xyz/og-cover.png",
                  },
                },
                sameAs: [
                  "https://x.com/abv_creative",
                  "https://github.com/markoblogo",
                  "https://medium.com/@abvcreative",
                ],
                potentialAction: {
                  "@type": "SearchAction",
                  target: "https://llmo.abvx.xyz/search?q={search_term_string}",
                  "query-input": "required name=search_term_string",
                },
                inLanguage: ["en", "fr", "es", "uk", "ru", "zh"],
              },
            ]),
          }}
        />
      </head>
      <body className={`${inter.variable} ${ibmPlexMono.variable} font-sans antialiased`}>
        <LocaleLang />
        <Providers>
          {children}
          {process.env.NEXT_PUBLIC_BOOK_POPUP_ENABLED === "true" && <WelcomeModal />}
          <AdminEntryHandler />
        </Providers>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
