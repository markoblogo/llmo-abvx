import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

// Try to use OpenAI package if available, otherwise use fetch API
let OpenAI: any;
try {
  OpenAI = require("openai").default;
} catch {
  OpenAI = null;
}

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

    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    // Fetch URL content
    let content = "";
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "LLMO-Directory-Bot/1.0",
        },
      });
      if (response.ok) {
        content = await response.text();
        // Extract text from HTML (basic extraction)
        content = content
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 5000); // Limit to 5000 chars
      }
    } catch (fetchError) {
      console.error("Error fetching URL:", fetchError);
      // Continue with empty content
    }

    const prompt = `You are an SEO assistant specializing in LLM (Large Language Model) optimization. 

Analyze the following website content and suggest:
1. SEO title (max 60 characters)
2. Meta description (max 160 characters)
3. 5 relevant keywords (comma-separated)
4. Short description for directory listing (max 280 characters)

Make the suggestions LLM-friendly and optimized for AI visibility.

Website content:
${content || "No content available. Please provide the URL."}

Return your response as a JSON object with the following structure:
{
  "title": "SEO title here",
  "description": "Meta description here",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "shortDescription": "Short description for directory listing"
}`;

    let result: any;

    if (OpenAI && apiKey) {
      // Use OpenAI package if available
      const openai = new OpenAI({
        apiKey: apiKey,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert SEO assistant. Return only valid JSON, no additional text or explanations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
      });

      const content = completion.choices[0]?.message?.content || "{}";
      try {
        result = JSON.parse(content);
      } catch (parseError) {
        // Try to extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Failed to parse AI response");
        }
      }
    } else {
      // Fallback to direct API call
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an expert SEO assistant. Return only valid JSON, no additional text or explanations.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const aiContent = data.choices[0]?.message?.content || "{}";
      try {
        result = JSON.parse(aiContent);
      } catch (parseError) {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Failed to parse AI response");
        }
      }
    }

    // Ensure result has all required fields
    result = {
      title: result.title || "Untitled",
      description: result.description || "",
      keywords: result.keywords || [],
      shortDescription: result.shortDescription || result.description || "",
    };

    return res.status(200).json({
      success: true,
      result,
      url,
    });
  } catch (error: any) {
    console.error("[metadata] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message || "Unknown error",
    });
  }
}




