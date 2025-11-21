import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";

// Try to use OpenAI package if available
let OpenAI: any;
try {
  OpenAI = require("openai").default;
} catch {
  OpenAI = null;
}

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

const apiKey = process.env.OPENAI_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { url } = req.body as { url: string };

    if (!url || !url.trim()) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Check if link exists in database
    const { data: link } = await supabaseAdmin
      .from("links")
      .select("id, llms_file_status, llms_last_update")
      .eq("url", url)
      .maybeSingle();

    // Fetch URL content for analysis
    let content = "";
    let hasLlmsTxt = false;
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "LLMO-Directory-Bot/1.0",
        },
      });
      if (response.ok) {
        content = await response.text();
        // Check for llms.txt
        const llmsTxtResponse = await fetch(`${url.replace(/\/$/, "")}/llms.txt`, {
          headers: {
            "User-Agent": "LLMO-Directory-Bot/1.0",
          },
        }).catch(() => null);
        hasLlmsTxt = llmsTxtResponse?.ok || false;
      }
    } catch (fetchError) {
      console.error("Error fetching URL:", fetchError);
    }

    // Extract text content (basic)
    const textContent = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);

    // Calculate visibility score based on various factors
    let score = 0;
    const factors: Record<string, number> = {};

    // Check 1: Has llms.txt (30 points)
    if (hasLlmsTxt) {
      score += 30;
      factors.hasLlmsTxt = 30;
    }

    // Check 2: Recent llms.txt update (20 points)
    if (link?.llms_last_update) {
      const daysSinceUpdate =
        (Date.now() - new Date(link.llms_last_update).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 90) {
        score += 20;
        factors.recentLlmsUpdate = 20;
      } else if (daysSinceUpdate < 180) {
        score += 10;
        factors.recentLlmsUpdate = 10;
      }
    }

    // Check 3: Structured content (25 points) - analyzed via AI if available
    if (apiKey && textContent) {
      try {
        const prompt = `Analyze this website content for LLM visibility. Evaluate:
1. Clear structure and organization (0-10 points)
2. Semantic markup and meaningful content (0-10 points)
3. Machine-readable format (0-5 points)

Return a JSON object with scores and brief reasons:
{
  "structureScore": number,
  "semanticScore": number,
  "machineReadableScore": number,
  "reasons": ["reason1", "reason2"]
}

Content sample:
${textContent.slice(0, 1500)}`;

        let aiScore = 0;
        if (OpenAI) {
          const openai = new OpenAI({ apiKey });
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
          });

          const aiContent = completion.choices[0]?.message?.content || "{}";
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const aiResult = JSON.parse(jsonMatch[0]);
            aiScore =
              (aiResult.structureScore || 0) +
              (aiResult.semanticScore || 0) +
              (aiResult.machineReadableScore || 0);
          }
        } else {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.3,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const aiContent = data.choices[0]?.message?.content || "{}";
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const aiResult = JSON.parse(jsonMatch[0]);
              aiScore =
                (aiResult.structureScore || 0) +
                (aiResult.semanticScore || 0) +
                (aiResult.machineReadableScore || 0);
            }
          }
        }

        score += Math.min(aiScore, 25);
        factors.structuredContent = Math.min(aiScore, 25);
      } catch (aiError) {
        console.error("AI analysis error:", aiError);
        // Fallback scoring
        score += 15;
        factors.structuredContent = 15;
      }
    } else {
      // Fallback scoring without AI
      score += 15;
      factors.structuredContent = 15;
    }

    // Check 4: Meta tags (15 points)
    const hasTitle = /<title[^>]*>[\s\S]*?<\/title>/i.test(content);
    const hasDescription = /<meta[^>]*name=["']description["'][^>]*>/i.test(content);
    if (hasTitle && hasDescription) {
      score += 15;
      factors.metaTags = 15;
    } else if (hasTitle || hasDescription) {
      score += 8;
      factors.metaTags = 8;
    }

    // Check 5: Backlinks/Directory presence (10 points)
    if (link) {
      score += 10;
      factors.directoryPresence = 10;
    }

    // Ensure score is between 0-100
    score = Math.min(Math.max(score, 0), 100);

    // Determine visibility level
    let visibility: "high" | "medium" | "low";
    if (score > 70) {
      visibility = "high";
    } else if (score > 40) {
      visibility = "medium";
    } else {
      visibility = "low";
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (!hasLlmsTxt) {
      recommendations.push("Create and upload an llms.txt file to improve AI discoverability");
    }

    if (link && link.llms_last_update) {
      const daysSinceUpdate =
        (Date.now() - new Date(link.llms_last_update).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > 90) {
        recommendations.push("Update your llms.txt file (last updated more than 90 days ago)");
      }
    }

    if (!hasTitle || !hasDescription) {
      recommendations.push("Add comprehensive meta tags (title and description)");
    }

    if (factors.structuredContent < 20) {
      recommendations.push("Improve content structure and semantic markup for better AI parsing");
    }

    if (recommendations.length === 0) {
      recommendations.push("Your site is well-optimized for AI visibility! Keep maintaining it.");
    }

    // Prepare response
    const responseData = {
      success: true,
      score,
      visibility,
      factors,
      recommendations,
      hasLlmsTxt,
      linkId: link?.id || null,
    };

    // Save analysis result to analyzer_logs table
    // Get user_id from Supabase - try to find by email from NextAuth session
    try {
      let supabaseUserId: string | null = null;
      
      // First, try to get user_id from session (if it's already a Supabase UUID)
      const sessionUserId = (session.user as any)?.id;
      
      // If session.user.id looks like a UUID, use it directly
      // Otherwise, find user in Supabase by email
      if (sessionUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionUserId)) {
        supabaseUserId = sessionUserId;
      } else if (session.user?.email) {
        // Find user in Supabase by email
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", session.user.email)
          .maybeSingle();
        
        if (profile?.id) {
          supabaseUserId = profile.id;
        }
      }

      // If we have a valid user_id, save the log
      if (supabaseUserId) {
        const { error: logError } = await supabaseAdmin
          .from("analyzer_logs")
          .insert({
            user_id: supabaseUserId,
            link_id: link?.id || null,
            url: url.trim(),
            score: score,
            recommendations: recommendations,
            factors: factors,
            visibility: visibility,
          });

        if (logError) {
          // Log error but don't fail the request
          console.error("[analyzer-pro] Error saving analyzer log:", logError);
        }
      } else {
        console.warn("[analyzer-pro] Could not determine Supabase user_id for logging");
      }
    } catch (logError: any) {
      // Log error but don't fail the request
      console.error("[analyzer-pro] Error saving analyzer log:", logError);
    }

    return res.status(200).json(responseData);
  } catch (error: any) {
    console.error("[analyzer-pro] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message || "Unknown error",
    });
  }
}




