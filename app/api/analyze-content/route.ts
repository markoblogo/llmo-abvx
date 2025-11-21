import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { withErrorHandling, requireEnvVars, safeJsonParse } from "@/lib/api-error-wrapper"

export const POST = withErrorHandling(async (req: NextRequest) => {
  requireEnvVars(["OPENAI_API_KEY"])

  const { content } = await safeJsonParse(req)

  if (!content || content.trim().length < 100) {
    return NextResponse.json({ error: "Content must be at least 100 words" }, { status: 400 })
  }

  // Call AI model to analyze content
  const { text } = await generateText({
    model: "openai/gpt-4o-mini",
      prompt: `You are an expert in Large Language Model Optimization (LLMO). Analyze the following content and provide a detailed assessment of its machine legibility for LLMs.

Evaluate the content on three key metrics:
1. Clarity Score (0-100): How clear and unambiguous is the content for AI parsing?
2. Chunk Density (0-100): How well is information organized in digestible chunks (100-300 tokens)?
3. Semantic Rating (0-100): How well-structured is the semantic meaning and concept relationships?

Then provide:
- A specific recommendation for improvement
- List of 2-3 key strengths
- List of 2-3 areas for improvement

Format your response as JSON with this structure:
{
  "clarityScore": number,
  "chunkDensity": number,
  "semanticRating": number,
  "recommendation": "string",
  "strengths": ["string"],
  "issues": ["string"]
}

Content to analyze:
${content}`,
    })

    // Parse the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Invalid response format")
    }

    const result = JSON.parse(jsonMatch[0])

    return NextResponse.json(result)
})
