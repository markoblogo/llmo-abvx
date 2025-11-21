import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { checkAdmin } from "@/lib/checkAdmin";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check authentication and admin role
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const isAdminUser = await checkAdmin(session);
    if (!isAdminUser) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    // Run audit script - using audit-site-content.ts as the audit script
    // The audit-bot.ts file doesn't exist, so we use the existing audit-site script
    try {
      const { stdout, stderr } = await execAsync(`pnpm audit-site`, {
        env: process.env,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      return res.status(200).json({
        success: true,
        message: "Audit completed successfully",
        log: stdout + (stderr ? `\n\nErrors:\n${stderr}` : ""),
      });
    } catch (execError: any) {
      console.error("[run-audit] Error executing audit script:", execError);
      return res.status(500).json({
        success: false,
        error: "Failed to execute audit script",
        details: execError.message,
        stdout: execError.stdout,
        stderr: execError.stderr,
      });
    }
  } catch (error: any) {
    console.error("[run-audit] Error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}

