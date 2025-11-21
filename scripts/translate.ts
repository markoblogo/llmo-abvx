#!/usr/bin/env tsx

/**
 * Translation Sync Script
 *
 * Translates locales/en.json to other language files using OpenAI
 */

import * as fs from "fs";
import * as path from "path";

// Try to use OpenAI package if available, otherwise use fetch API
let OpenAI: any;
try {
  OpenAI = require("openai").default;
} catch {
  // Fallback to fetch API if openai package is not installed
  OpenAI = null;
}

const SUPPORTED_LANGUAGES = ["fr", "es", "uk", "ru", "zh"];
const LOCALES_DIR = path.join(process.cwd(), "locales");

async function translateText(text: string, targetLang: string): Promise<string> {
  const languageNames: Record<string, string> = {
    fr: "French",
    es: "Spanish",
    uk: "Ukrainian",
    ru: "Russian",
    zh: "Chinese (Simplified)",
  };

  const languageName = languageNames[targetLang] || targetLang;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const prompt = `Translate the following JSON content to ${languageName}. Keep the JSON structure identical, translate all string values but preserve all keys. Do not add explanations, return only valid JSON.

JSON to translate:
${text}`;

  try {
    // Use OpenAI package if available
    if (OpenAI && apiKey) {
      const openai = new OpenAI({
        apiKey: apiKey,
      });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a professional translator. Return only valid JSON, no additional text or explanations. Preserve all keys exactly as they are, translate only the values.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
      });

      const content = completion.choices[0]?.message?.content || text;
      // Try to extract JSON from response (handle markdown code blocks)
      let jsonContent = content.trim();
      // Remove markdown code blocks if present
      jsonContent = jsonContent.replace(/^```json\n?/i, "").replace(/^```\n?/, "").replace(/\n?```$/i, "");
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return jsonMatch[0];
      }
      return jsonContent;
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
                "You are a professional translator. Return only valid JSON, no additional text or explanations. Preserve all keys exactly as they are, translate only the values.",
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
      const content = data.choices[0]?.message?.content || text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return jsonMatch[0];
      }
      return content;
    }
  } catch (error: any) {
    console.error(`Error translating to ${targetLang}:`, error.message);
    throw error;
  }
}

async function syncTranslations() {
  console.log("🌐 Starting translation sync...\n");

  const enFile = path.join(LOCALES_DIR, "en.json");

  if (!fs.existsSync(enFile)) {
    throw new Error(`English locale file not found: ${enFile}`);
  }

  const enContent = fs.readFileSync(enFile, "utf8");
  const enData = JSON.parse(enContent);
  const enJsonString = JSON.stringify(enData, null, 2);

  console.log(`📄 Loaded English locale (${enContent.length} characters)\n`);

  for (const lang of SUPPORTED_LANGUAGES) {
    try {
      console.log(`🔄 Translating to ${lang.toUpperCase()}...`);
      const translated = await translateText(enJsonString, lang);

      // Parse to validate JSON
      const parsed = JSON.parse(translated);
      const formatted = JSON.stringify(parsed, null, 2);

      const targetFile = path.join(LOCALES_DIR, `${lang}.json`);
      fs.writeFileSync(targetFile, formatted, "utf8");

      console.log(`✅ ${lang.toUpperCase()} translation saved to ${targetFile}\n`);
    } catch (error: any) {
      console.error(`❌ Error translating ${lang}:`, error.message);
      console.log(`   Skipping ${lang}...\n`);
    }
  }

  console.log("✅ Translation sync completed!");
}

syncTranslations().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
