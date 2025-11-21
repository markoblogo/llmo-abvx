import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const { data: link } = await supabaseAdmin
      .from("links")
      .select("title, url, description, category, created_at, llms_file_status, llms_last_update")
      .eq("id", id)
      .eq("status", "approved")
      .single();

    if (!link) {
      return {
        title: "Link Not Found | LLMO Directory",
      };
    }

    const isAiOptimized =
      link.llms_last_update &&
      link.llms_file_status === "updated" &&
      new Date(link.llms_last_update).getTime() > Date.now() - 90 * 24 * 60 * 60 * 1000;

    const title = link.title || link.url;
    const description = link.description || `Visit ${link.url} - ${link.category} website`;

    return {
      title: `${title} | LLMO Directory`,
      description,
      keywords: [
        link.category,
        "AI-optimized",
        "LLM visibility",
        ...(isAiOptimized ? ["AI-ready", "llms.txt"] : []),
      ],
      openGraph: {
        title: `${title} | LLMO Directory`,
        description,
        type: "website",
        url: `https://llmo.abvx.xyz/directory/${id}`,
        siteName: "LLMO Directory",
        images: [
          {
            url: "/og-cover.png",
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | LLMO Directory`,
        description,
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
        canonical: `https://llmo.abvx.xyz/directory/${id}`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for link page:", error);
    return {
      title: "Link | LLMO Directory",
    };
  }
}

export default function DirectoryLinkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}




