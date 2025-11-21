import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { supabase } from "@/lib/supabaseClient";

type Action = {
  label: string;
  type: "payment" | "link" | "info";
  target?: string;
  tip?: string;
};

type AnalysisResult = {
  score: number;
  summary: string;
  recommendations: string[];
  actions: Action[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<AnalysisResult>) {
  if (req.method !== "POST") return res.status(405).end();
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      score: 0,
      summary: "Invalid URL provided",
      recommendations: [],
      actions: [],
    });
  }

  // Simulate dynamic analysis based on URL characteristics
  // In production, this would analyze the actual website
  const urlLower = url.toLowerCase();
  let score = 3; // Default score
  
  // Context-aware scoring logic
  if (urlLower.includes("github") || urlLower.includes("docs")) {
    score = 4; // GitHub and docs sites typically have better structure
  } else if (urlLower.includes("blog") || urlLower.includes("article")) {
    score = 3; // Blogs are usually moderate
  } else if (urlLower.includes("landing") || urlLower.includes("home")) {
    score = 2; // Landing pages often lack structure
  }

  // Add some randomness for demo purposes (but keep it contextual)
  const randomFactor = Math.floor(Math.random() * 2) - 1; // -1, 0, or 1
  score = Math.max(1, Math.min(5, score + randomFactor));

  const messages = [
    "Excellent! Your content is AI-readable and well-structured.",
    "Good! Your site is mostly AI-readable, but could benefit from llms.txt.",
    "Average — consider clearer structure, metadata, and llms.txt.",
    "Needs work — AI struggles to parse your layout. Add llms.txt and improve structure.",
    "Critical — add schema, simplify text, use llms.txt, and improve meta tags.",
  ];

  const recommendations: string[] = [];
  const actions: Action[] = [];

  // Generate context-aware recommendations and actions
  if (score < 5) {
    recommendations.push("Add llms.txt file");
    actions.push({
      label: "Generate llms.txt for $1",
      type: "payment",
      target: "price_llms_txt",
    });
  }

  if (score < 4) {
    recommendations.push("Improve meta tags and structure");
    actions.push({
      label: "Learn about meta tags",
      type: "info",
      tip: "Add proper <meta> tags including description, keywords, and Open Graph tags. Use semantic HTML5 elements like <article>, <section>, and <header> to improve structure.",
    });
  }

  if (score < 5) {
    recommendations.push("Register your site in LLMO Directory");
    actions.push({
      label: "Add to Directory",
      type: "link",
      target: "/register",
    });
  }

  if (score < 3) {
    recommendations.push("Simplify content structure");
    actions.push({
      label: "Get structure tips",
      type: "info",
      tip: "Use clear headings (h1-h6), short paragraphs, bullet points, and avoid complex nested layouts. Make your content easy to scan and parse.",
    });
  }

  const result: AnalysisResult = {
    score,
    summary: messages[score - 1],
    recommendations,
    actions,
  };

  // Save analysis to database if user is logged in
  try {
    const session = await getServerSession(req, res, authOptions);
    if (session?.user) {
      const userId = (session.user as any)?.id || session.user.email;
      if (userId) {
        // Store recommendations as JSON string
        const recommendationsText = JSON.stringify(recommendations);

        await supabase.from("analyses").insert({
          user_id: userId,
          url: url.trim(),
          score: score,
          recommendations: recommendationsText,
        });
      }
    }
  } catch (error) {
    // Don't fail the request if saving fails
    console.error("Error saving analysis:", error);
  }

  res.status(200).json(result);
}
