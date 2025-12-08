import dotenv from "dotenv";
import { config } from "dotenv";

// Load .env.local file
config({ path: ".env.local" });

const required = [
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "DATABASE_URL",
];

const missing = required.filter((key) => !process.env[key] || process.env[key]?.startsWith("your-") || process.env[key] === "");

if (missing.length) {
  console.error("❌ Missing or placeholder environment variables:");
  missing.forEach((key) => {
    console.error(`   - ${key}: ${process.env[key] ? "placeholder detected" : "not set"}`);
  });
  console.error("\n💡 Please update .env.local with actual values.");
  process.exit(1);
} else {
  console.log("✅ All required environment variables are configured correctly.");
  console.log("\n📋 Configuration summary:");
  console.log(`   - NextAuth: ${process.env.NEXTAUTH_URL || "not set"}`);
  console.log(`   - Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? "✓ configured" : "✗ missing"}`);
  console.log(`   - Resend: ${process.env.RESEND_API_KEY ? "✓ configured" : "✗ missing"}`);
  console.log(`   - Stripe: ${process.env.STRIPE_SECRET_KEY ? "✓ configured" : "✗ missing"}`);
  console.log(`   - Database: ${process.env.DATABASE_URL || "not set"}`);
}





