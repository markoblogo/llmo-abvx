/**
 * API Error Wrapper
 *
 * Universal error handling wrapper for Next.js App Router API routes.
 * Provides consistent error logging and response formatting.
 */

import { NextRequest, NextResponse } from "next/server";

export type RouteHandler = (req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => Promise<NextResponse> | NextResponse;

/**
 * Wraps an API route handler with error handling and logging
 *
 * @param handler - The route handler function
 * @returns Wrapped handler with error handling
 *
 * @example
 * ```ts
 * export const POST = withErrorHandling(async (req: NextRequest) => {
 *   const data = await req.json();
 *   // ... your logic
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const startTime = Date.now();
    const url = req.url || "unknown";
    const method = req.method || "UNKNOWN";

    try {
      const response = await handler(req, context);
      const duration = Date.now() - startTime;

      // Log successful requests in dev mode
      if (process.env.NODE_ENV === "development") {
        console.log(`✅ ${method} ${url} - ${response.status} (${duration}ms)`);
      }

      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Extract meaningful error information
      const errorMessage = error?.message || String(error) || "Internal Server Error";
      const errorStack = error?.stack || undefined;
      const errorName = error?.name || "Error";

      // Log detailed error information
      console.error("\n" + "=".repeat(80));
      console.error(`❌ API ERROR at ${method} ${url}`);
      console.error(`   Error: ${errorName}`);
      console.error(`   Message: ${errorMessage}`);
      console.error(`   Duration: ${duration}ms`);

      if (errorStack) {
        console.error(`   Stack trace:`);
        // Print only relevant stack lines (not node_modules)
        const stackLines = errorStack.split("\n").slice(0, 10);
        stackLines.forEach((line: string) => {
          if (!line.includes("node_modules") || line.includes("app/api")) {
            console.error(`     ${line.trim()}`);
          }
        });
      }

      // Check for common error patterns
      if (errorMessage.includes("Cannot read properties") || errorMessage.includes("undefined")) {
        console.error(`   💡 Possible cause: Missing environment variable or undefined value`);
      }

      if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("connection")) {
        console.error(`   💡 Possible cause: Database or external service connection issue`);
      }

      if (errorMessage.includes("Authentication") || errorMessage.includes("Unauthorized")) {
        console.error(`   💡 Possible cause: Missing or invalid authentication token`);
      }

      console.error("=".repeat(80) + "\n");

      // Return error response
      // In production, don't expose stack traces
      const isDevelopment = process.env.NODE_ENV === "development";

      return NextResponse.json(
        {
          error: errorMessage,
          ...(isDevelopment && errorStack ? { stack: errorStack } : {}),
          ...(isDevelopment ? { url, method, duration } : {}),
        },
        {
          status: error?.status || error?.statusCode || 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  };
}

/**
 * Validates required environment variables
 * Throws an error if any are missing
 *
 * @param requiredVars - Array of required environment variable names
 * @throws Error if any required variables are missing
 */
export function requireEnvVars(requiredVars: string[]): void {
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Please check your .env.local file.`
    );
  }
}

/**
 * Safe JSON parsing with error handling
 *
 * @param req - NextRequest object
 * @returns Parsed JSON data
 * @throws Error if JSON parsing fails
 */
export async function safeJsonParse(req: NextRequest): Promise<any> {
  try {
    return await req.json();
  } catch (error: any) {
    throw new Error(`Invalid JSON in request body: ${error.message}`);
  }
}




