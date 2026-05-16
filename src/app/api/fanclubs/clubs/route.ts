import { NextRequest, NextResponse } from "next/server";
import { getFanclubTeams } from "~/lib/fanclubs/catalog";

function parseType(value: string | null): "club" | "country" | "all" {
  if (value === "country" || value === "all") {
    return value;
  }

  return "club";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get("leagueId");
    const type = parseType(searchParams.get("type"));
    const teams = getFanclubTeams({ leagueId, type });

    return NextResponse.json({
      ok: true,
      count: teams.length,
      filters: {
        leagueId: leagueId || null,
        type,
      },
      clubs: teams,
    });
  } catch (error) {
    console.error("Failed to fetch fanclub teams:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch fanclub teams",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
