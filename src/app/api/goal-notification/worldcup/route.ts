// Thin wrapper kept for manual triggers and rollback. The shared runner
// in ../lib/runLeague.ts implements this league; scheduled polling now
// goes through the fixture-gated dispatcher at
// /api/goal-notification/dispatch, so this route is no longer cronned.
import { NextRequest } from "next/server";
import { runLeague } from "../lib/runLeague";
import { LEAGUES } from "../lib/leagues";
import { errorAsOk, okJson } from "../../lib/http";

export const runtime = "edge";

export async function POST(_request: NextRequest) {
  const league = LEAGUES.find((l) => l.id === "worldcup");
  if (!league) {
    return errorAsOk("Unknown league", { league: "worldcup" });
  }
  const result = await runLeague(league);
  if (!result.success) {
    return errorAsOk("Failed to fetch scoreboard", {
      league: league.errorLeague,
    });
  }
  return okJson({
    success: true,
    notificationsSent: result.notificationsSent,
    goalNotifications: result.goalNotifications,
    ...(league.mode === "full"
      ? { otherNotifications: result.otherNotifications }
      : {}),
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
