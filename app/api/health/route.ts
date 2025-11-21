import { NextResponse } from "next/server";

/**
 * Health check endpoint for monitoring and deployment verification
 * Returns simple JSON status without authentication
 */
export async function GET() {
  return NextResponse.json(
    { 
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

