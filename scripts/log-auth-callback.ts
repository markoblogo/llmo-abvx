import dotenv from "dotenv";
import { resolve } from "path";

// Load .env.local first, then .env
dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config();

console.log("🔍 OAuth / Auth Debug Info");
console.log("----------------------------------");
console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
console.log("NEXT_PUBLIC_SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL);
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("Authorized redirect URI:", `${process.env.NEXTAUTH_URL}/api/auth/callback/google`);
console.log("Local ports likely in use: 3000, 3005, 3010");
console.log("----------------------------------");
console.log("✅ Use this script to verify redirect_uri before running dev server.");

