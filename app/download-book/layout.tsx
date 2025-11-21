import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download LLMO Quick Start Guide — Free AI SEO Guide | LLMO Directory",
  description:
    "Download your free copy of LLMO Quick Start: How to Make Your Content Visible in the Age of AI. Learn practical tips for optimizing your content for AI visibility and citation. Get started with LLM optimization today.",
  keywords: [
    "LLMO guide",
    "AI SEO guide",
    "AI visibility guide",
    "LLM optimization guide",
    "free AI guide",
    "content optimization",
    "AI citation",
    "structured data guide",
  ],
  openGraph: {
    title: "Download LLMO Quick Start Guide — Free AI SEO Guide",
    description:
      "Download your free copy of LLMO Quick Start: How to Make Your Content Visible in the Age of AI.",
    type: "website",
    url: "https://llmo.abvx.xyz/download-book",
    siteName: "LLMO Directory",
    images: [
      {
        url: "/og-cover.png",
        width: 1200,
        height: 630,
        alt: "LLMO Quick Start Guide - LLMO Directory",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Download LLMO Quick Start Guide — Free AI SEO Guide",
    description:
      "Download your free copy of LLMO Quick Start: How to Make Your Content Visible in the Age of AI.",
    images: ["/og-cover.png"],
    creator: "@llmo_directory",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://llmo.abvx.xyz/download-book",
  },
};

export default function DownloadBookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}




