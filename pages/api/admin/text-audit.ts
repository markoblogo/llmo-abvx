import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { checkAdmin } from "@/lib/checkAdmin";

interface AuditResult {
  page: string;
  status: "up-to-date" | "outdated" | "missing-features";
  mismatches: string[];
  missingFeatures: string[];
  unwantedMentions: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const isAdmin = await checkAdmin(session);
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    // Trigger the audit script and return results
    // In production, you might want to cache this or run it asynchronously
    const { exec } = require("child_process");
    const { promisify } = require("util");
    const execAsync = promisify(exec);

    try {
      // Run the audit script
      const { stdout, stderr } = await execAsync("pnpm audit-site", {
        cwd: process.cwd(),
        env: { ...process.env, NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3005" }, // DEV-ONLY fallback
      });

      // Parse the JSON output from the script
      // The script outputs JSON at the end
      const lines = stdout.split("\n");
      let jsonStart = false;
      const jsonLines: string[] = [];

      for (const line of lines) {
        if (line.trim().startsWith("[")) {
          jsonStart = true;
        }
        if (jsonStart) {
          jsonLines.push(line);
        }
      }

      let results: AuditResult[] = [];
      if (jsonLines.length > 0) {
        try {
          const jsonOutput = jsonLines.join("\n");
          results = JSON.parse(jsonOutput);
        } catch (parseError) {
          console.error("Error parsing audit results:", parseError);
        }
      }

      return res.status(200).json({
        success: true,
        results: results,
        timestamp: new Date().toISOString(),
      });
    } catch (execError: any) {
      // If script exits with code 1 (has issues), that's expected - return the results
      if (execError.code === 1 && execError.stdout) {
        const lines = execError.stdout.split("\n");
        let jsonStart = false;
        const jsonLines: string[] = [];

        for (const line of lines) {
          if (line.trim().startsWith("[")) {
            jsonStart = true;
          }
          if (jsonStart) {
            jsonLines.push(line);
          }
        }

        let results: AuditResult[] = [];
        if (jsonLines.length > 0) {
          try {
            const jsonOutput = jsonLines.join("\n");
            results = JSON.parse(jsonOutput);
          } catch (parseError) {
            console.error("Error parsing audit results:", parseError);
          }
        }

        return res.status(200).json({
          success: true,
          results: results,
          timestamp: new Date().toISOString(),
        });
      }

      throw execError;
    }
  } catch (error: any) {
    console.error("Text audit error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to run text audit",
      details: error.message || "Unknown error",
    });
  }
}


