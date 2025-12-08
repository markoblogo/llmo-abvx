/**
 * Automatically sync translations in /locales when en.json changes.
 * Requires: OPENAI_API_KEY in .env.local
 */

import fs from "fs";
import path from "path";

// Try to use OpenAI package if available, otherwise use fetch API
let OpenAI: any;
try {
  OpenAI = require("openai").default;
} catch {
  // Fallback to fetch API if openai package is not installed
  OpenAI = null;
}

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("Error: OPENAI_API_KEY environment variable is not set");
  process.exit(1);
}

// Initialize OpenAI client (if package is available)
const openai = OpenAI
  ? new OpenAI({
      apiKey: apiKey,
    })
  : null;

const targetLangs = {
  fr: "French",
  es: "Spanish",
  uk: "Ukrainian",
  ru: "Russian",
  zh: "Chinese (Simplified)",
};

async function translateText(text: string, targetLanguage: string) {
  const languageName = targetLangs[targetLanguage as keyof typeof targetLangs] || targetLanguage;

  try {
    if (openai) {
      // Use OpenAI package if available
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Translate this JSON to ${languageName}. Keep all keys unchanged, only translate the string values. Return valid JSON only.`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        temperature: 0,
      });

      return response.choices[0]?.message?.content || text;
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
              content: `Translate this JSON to ${languageName}. Keep all keys unchanged, only translate the string values. Return valid JSON only.`,
            },
            {
              role: "user",
              content: text,
            },
          ],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || text;
    }
  } catch (error: any) {
    console.error(`Error translating to ${targetLanguage}:`, error.message);
    return text; // Return original on error
  }
}

async function syncTranslations() {
  const localesDir = path.resolve("locales");
  const enFile = path.join(localesDir, "en.json");

  if (!fs.existsSync(enFile)) {
    console.error(`Error: ${enFile} not found`);
    process.exit(1);
  }

  const enData = fs.readFileSync(enFile, "utf8");

  console.log("🔁 Starting translation sync...");
  console.log(`📝 Source: ${enFile}\n`);

  for (const [code, language] of Object.entries(targetLangs)) {
    const targetFile = path.join(localesDir, `${code}.json`);
    console.log(`🌐 Translating to ${language} (${code})...`);

    try {
      const translated = await translateText(enData, code);

      // Validate JSON before writing
      try {
        JSON.parse(translated);
      } catch (parseError) {
        console.error(`⚠️  Warning: Invalid JSON returned for ${code}, skipping...`);
        continue;
      }

      fs.writeFileSync(targetFile, translated, "utf8");
      console.log(`✅ ${code}.json updated successfully\n`);
    } catch (error: any) {
      console.error(`❌ Error updating ${code}.json:`, error.message);
    }

    // Small delay to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("✅ All translations updated successfully.");
}

syncTranslations().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});





