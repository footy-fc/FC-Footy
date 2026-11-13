import { NextRequest } from "next/server";
import { runDispatch } from "../lib/dispatch";
import { okJson } from "../../lib/http";

// Single 1-minute cron entry point for all goal-notification leagues.
// Replaces the 11 per-league crons in vercel.json.
//
// Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when the
// CRON_SECRET env var is set on the project. Enforce it only when it is
// set, so this route keeps working until the secret is configured — set
// CRON_SECRET in the Vercel dashboard to close the route to everyone
// except Vercel Cron. The old per-league routes had no auth at all.
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
  } else {
    console.warn(
      "CRON_SECRET is not set: /api/goal-notification/dispatch is unauthenticated. Set it in Vercel project settings.",
    );
  }
  const summary = await runDispatch();
  return okJson(summary);
}

export const runtime = "edge";

export async function GET(request: NextRequest) {
  return POST(request);
}
