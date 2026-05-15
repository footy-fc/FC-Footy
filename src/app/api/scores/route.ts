import { NextRequest } from "next/server";

import { fetchJSONWithRetry, okJson } from "../lib/http";
import type { ApiResponse } from "../lib/types";

const SCOREBOARD_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer";

function getConfiguredApiKey(): string {
  return (
    process.env.SCORES_API_KEY ||
    process.env.NOTIFICATION_API_KEY ||
    process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY ||
    ""
  );
}

function getBasicAuthCredential(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) {
      return decoded;
    }

    return decoded.slice(separatorIndex + 1);
  } catch {
    return null;
  }
}

function isAuthorized(request: NextRequest): boolean {
  const configuredApiKey = getConfiguredApiKey();
  if (!configuredApiKey) {
    return true;
  }

  const url = new URL(request.url);
  const headerApiKey = request.headers.get("x-api-key");
  const queryApiKey = url.searchParams.get("apiKey");
  const basicAuthCredential = getBasicAuthCredential(
    request.headers.get("authorization")
  );

  return [headerApiKey, queryApiKey, basicAuthCredential].some(
    (candidate) => candidate === configuredApiKey
  );
}

function isValidLeagueSlug(league: string): boolean {
  return /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/i.test(league);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json(
      {
        error:
          "Unauthorized. Provide x-api-key, ?apiKey=..., or HTTP Basic auth.",
      },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const league = searchParams.get("league")?.trim();
  const dates = searchParams.get("dates")?.trim();

  if (!league) {
    return Response.json(
      {
        error: "Missing required query parameter: league",
        example: "/api/scores?league=eng.1",
      },
      { status: 400 }
    );
  }

  if (!isValidLeagueSlug(league)) {
    return Response.json(
      {
        error: "Invalid league parameter",
        league,
      },
      { status: 400 }
    );
  }

  if (dates && !/^\d{8}$/.test(dates)) {
    return Response.json(
      {
        error: "Invalid dates parameter. Expected YYYYMMDD, for example 20260515",
        dates,
      },
      { status: 400 }
    );
  }

  const scoreboardUrl = new URL(`${SCOREBOARD_BASE_URL}/${league}/scoreboard`);
  if (dates) {
    scoreboardUrl.searchParams.set("dates", dates);
  }

  try {
    const data = await fetchJSONWithRetry<ApiResponse & Record<string, unknown>>(
      scoreboardUrl.toString(),
      {
        retries: 3,
        timeoutMs: 8000,
        backoffMs: 500,
      }
    );

    return okJson({
      success: true,
      source: "espn",
      league,
      dates: dates || null,
      eventCount: Array.isArray(data.events) ? data.events.length : 0,
      data,
    });
  } catch (error) {
    console.error("Error fetching scoreboard:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to fetch scoreboard",
        league,
        dates: dates || null,
      },
      { status: 502 }
    );
  }
}

