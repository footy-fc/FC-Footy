import { NextRequest, NextResponse } from "next/server";
import { fetchUsersByFids } from "~/lib/hypersnap";
import { getPrimaryFansForTeam, getFansForTeams, getTeamPreferences } from "~/lib/kvPerferences";
import { getFanclubTeamById, getFanclubTeamByLeagueAndAbbr } from "~/lib/fanclubs/catalog";
import { getWorldCupTeamByPreferenceId } from "~/lib/worldCupData";

function parseBoolean(value: string | null, defaultValue: boolean): boolean {
  if (value == null) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no"].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function normalizeTeamIdFromRequest(searchParams: URLSearchParams): string | null {
  const teamId = searchParams.get("teamId");
  if (teamId) {
    return teamId.trim().toLowerCase();
  }

  const leagueId = searchParams.get("leagueId");
  const abbr = searchParams.get("abbr");
  if (leagueId && abbr) {
    return `${leagueId.trim().toLowerCase()}-${abbr.trim().toLowerCase()}`;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const normalizedTeamId = normalizeTeamIdFromRequest(searchParams);
    const primaryOnly = parseBoolean(searchParams.get("primaryOnly"), true);
    const includePreferences = parseBoolean(searchParams.get("includePreferences"), false);

    if (!normalizedTeamId) {
      return NextResponse.json(
        { ok: false, error: "Provide `teamId` or both `leagueId` and `abbr`." },
        { status: 400 }
      );
    }

    const worldCupTeam = getWorldCupTeamByPreferenceId(normalizedTeamId);
    const resolvedTeam =
      (worldCupTeam
        ? {
            teamId: normalizedTeamId,
            name: worldCupTeam.name,
            abbreviation: worldCupTeam.fifaCode.toLowerCase(),
            leagueId: "fifa.world",
            leagueName: "FIFA World Cup",
            logoUrl: "",
            roomHash: null,
            type: "country" as const,
          }
        : null) ??
      getFanclubTeamById(normalizedTeamId) ??
      (() => {
        const [leagueId, abbr] = normalizedTeamId.split("-");
        return leagueId && abbr ? getFanclubTeamByLeagueAndAbbr(leagueId, abbr) : null;
      })();

    if (!resolvedTeam) {
      return NextResponse.json(
        { ok: false, error: `Unknown teamId: ${normalizedTeamId}` },
        { status: 404 }
      );
    }

    const supporterFids = primaryOnly
      ? await getPrimaryFansForTeam(resolvedTeam.teamId)
      : await getFansForTeams([resolvedTeam.teamId]);

    const uniqueFids = Array.from(
      new Set(supporterFids.map((fid) => Number(fid)).filter((fid) => Number.isFinite(fid) && fid > 0))
    );

    const [users, preferencesEntries] = await Promise.all([
      fetchUsersByFids(uniqueFids),
      includePreferences
        ? Promise.all(
            uniqueFids.map(async (fid) => [fid, (await getTeamPreferences(fid)) ?? []] as const)
          )
        : Promise.resolve([] as Array<readonly [number, string[]]>),
    ]);

    const preferencesByFid = new Map<number, string[]>(
      preferencesEntries.map(([fid, preferences]) => [fid, preferences])
    );

    const supporters = uniqueFids.map((fid) => {
      const user = users.find((entry) => entry.fid === fid);
      const preferences = preferencesByFid.get(fid) ?? undefined;

      return {
        fid,
        username: user?.username?.toLowerCase() ?? null,
        displayName: user?.display_name || user?.displayName || null,
        pfpUrl: user?.pfp_url ?? null,
        primaryTeamId: preferences?.[0] ?? (primaryOnly ? resolvedTeam.teamId : null),
        supportsTargetAsPrimary: preferences ? preferences[0]?.toLowerCase() === resolvedTeam.teamId : primaryOnly,
        teamPreferences: includePreferences ? preferences ?? [] : undefined,
      };
    });

    return NextResponse.json({
      ok: true,
      team: resolvedTeam,
      filters: {
        primaryOnly,
        includePreferences,
      },
      count: supporters.length,
      supporters,
    });
  } catch (error) {
    console.error("Failed to fetch fanclub supporters:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch fanclub supporters",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
