import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LLMO Directory — Discover AI-Optimized Sites",
  description: "Explore blogs, startups, and creators optimized for LLM visibility.",
  keywords: [
    "AI optimization",
    "LLM visibility",
    "directory",
    "blogs",
    "startups",
    "creators",
    "AI SEO",
    "LLMO",
  ],
  openGraph: {
    title: "LLMO Directory — Discover AI-Optimized Sites",
    description: "Explore blogs, startups, and creators optimized for LLM visibility.",
    type: "website",
    url: "https://llmo.abvx.xyz/directory",
  },
  twitter: {
    card: "summary_large_image",
    title: "LLMO Directory — Discover AI-Optimized Sites",
    description: "Explore blogs, startups, and creators optimized for LLM visibility.",
  },
};

export default function DirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
