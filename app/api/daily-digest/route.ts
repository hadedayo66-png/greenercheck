import { NextResponse } from "next/server";

/**
 * Placeholder for scheduled digest (see vercel.json cron).
 * Cron runs 14:00 UTC ≈ 9:00 AM Eastern Standard Time (adjust for DST if needed).
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Daily digest not implemented yet",
  });
}
