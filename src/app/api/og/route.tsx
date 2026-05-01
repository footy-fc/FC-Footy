import { ImageResponse } from "next/og";

export const dynamic = "force-dynamic";

const size = {
  width: 600,
  height: 400,
};

const colors = {
  bg: "#050712",
  panel: "#171226",
  panelSoft: "#211834",
  text: "#F4EDFF",
  muted: "#C0B2F0",
  accent: "#BD195D",
  accentSoft: "#FEA282",
  lime: "#A2E634",
};

const chipStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 16px",
  borderRadius: 999,
  border: `1px solid ${colors.lime}55`,
  background: "rgba(17, 12, 28, 0.88)",
  color: colors.text,
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: "-0.03em",
} as const;

const statCardStyle = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  flex: 1,
  minWidth: 0,
  padding: "18px 18px 16px",
  borderRadius: 22,
  border: `1px solid ${colors.lime}3a`,
  background: "rgba(16, 11, 28, 0.96)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
} as const;

type OgMatchContext = {
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  clock: string;
  label: string;
};

type EspnEventLike = {
  id?: string;
  date?: string;
  status?: { type?: { state?: string; detail?: string }; displayClock?: string };
  competitions?: Array<{
    competitors?: Array<{
      homeAway?: string;
      score?: number | string;
      team?: { abbreviation?: string };
    }>;
  }>;
};

function Dot({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 12,
        height: 12,
        borderRadius: 999,
        background: color,
        boxShadow: `0 0 22px ${color}`,
      }}
    />
  );
}

function parseLeagueFromEventId(eventId: string | null): string | null {
  if (!eventId) return null;
  const parts = eventId.split("_");
  if (parts.length < 3) return null;
  return parts.slice(0, parts.length - 2).join(".");
}

function parseTeamsFromEventId(eventId: string | null): { homeTeam: string | null; awayTeam: string | null } {
  if (!eventId) return { homeTeam: null, awayTeam: null };
  const parts = eventId.split("_");
  if (parts.length < 3) return { homeTeam: null, awayTeam: null };
  return {
    homeTeam: parts[parts.length - 2] ?? null,
    awayTeam: parts[parts.length - 1] ?? null,
  };
}

function formatFallbackClock(dateString?: string): string {
  if (!dateString) return "Matchday";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Matchday";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatScore(score?: number | string): string {
  if (typeof score === "number") return String(score);
  if (typeof score === "string" && score.trim().length > 0) return score;
  return "0";
}

async function resolveMatchContext(request: Request): Promise<OgMatchContext | null> {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const league = searchParams.get("league") || parseLeagueFromEventId(eventId);
  const fallbackTeams = parseTeamsFromEventId(eventId);
  const fallbackHomeTeam = searchParams.get("homeTeam") || fallbackTeams.homeTeam;
  const fallbackAwayTeam = searchParams.get("awayTeam") || fallbackTeams.awayTeam;
  const fallbackHomeScore = searchParams.get("homeScore") || "0";
  const fallbackAwayScore = searchParams.get("awayScore") || "0";
  const fallbackClock = searchParams.get("clock") || "Matchday";

  if (!league || !fallbackHomeTeam || !fallbackAwayTeam) {
    return null;
  }

  const upcomingDates = Array.from({ length: 5 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}${month}${day}`;
  });

  try {
    for (const dateKey of upcomingDates) {
      const response = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${dateKey}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as { events?: EspnEventLike[] };
      const events = Array.isArray(data.events) ? data.events : [];
      const matched = events.find((event) => {
        const competitors = event.competitions?.[0]?.competitors || [];
        const homeTeam = competitors.find((competitor) => competitor.homeAway === "home")?.team?.abbreviation?.toUpperCase();
        const awayTeam = competitors.find((competitor) => competitor.homeAway === "away")?.team?.abbreviation?.toUpperCase();
        return homeTeam === fallbackHomeTeam.toUpperCase() && awayTeam === fallbackAwayTeam.toUpperCase();
      });

      if (matched) {
        const competitors = matched.competitions?.[0]?.competitors || [];
        const homeCompetitor = competitors.find((competitor) => competitor.homeAway === "home");
        const awayCompetitor = competitors.find((competitor) => competitor.homeAway === "away");
        return {
          homeTeam: homeCompetitor?.team?.abbreviation?.toUpperCase() || fallbackHomeTeam.toUpperCase(),
          awayTeam: awayCompetitor?.team?.abbreviation?.toUpperCase() || fallbackAwayTeam.toUpperCase(),
          homeScore: formatScore(homeCompetitor?.score),
          awayScore: formatScore(awayCompetitor?.score),
          clock: matched.status?.type?.detail || matched.status?.displayClock || formatFallbackClock(matched.date),
          label: matched.status?.type?.state === "in" ? "LIVE NOW" : "UP NEXT",
        };
      }
    }
  } catch (error) {
    console.error("[api/og] failed to resolve live match context", error);
  }

  return {
    homeTeam: fallbackHomeTeam.toUpperCase(),
    awayTeam: fallbackAwayTeam.toUpperCase(),
    homeScore: fallbackHomeScore,
    awayScore: fallbackAwayScore,
    clock: fallbackClock,
    label: "MATCHDAY",
  };
}

export async function GET(request: Request) {
  const matchContext = await resolveMatchContext(request);

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: colors.bg,
          color: colors.text,
          fontFamily:
            'Manrope, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 14% 10%, rgba(189,25,93,0.34), transparent 32%), radial-gradient(circle at 86% 22%, rgba(162,230,52,0.12), transparent 24%), linear-gradient(140deg, #060713 0%, #100B1C 46%, #171226 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 260,
            height: 260,
            borderRadius: 999,
            background: "rgba(189,25,93,0.18)",
            filter: "blur(18px)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: -50,
            bottom: -80,
            width: 230,
            height: 230,
            borderRadius: 999,
            background: "rgba(254,162,130,0.12)",
            filter: "blur(16px)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "28px",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "64%",
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 44,
                    height: 44,
                    borderRadius: 16,
                    background:
                      "linear-gradient(135deg, rgba(189,25,93,0.96), rgba(254,162,130,0.82))",
                    color: "#fff",
                    fontSize: 22,
                    fontWeight: 800,
                  }}
                >
                  F
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <div
                    style={{
                      color: colors.accent,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.28em",
                    }}
                  >
                    FOOTY APP
                  </div>
                  <div
                    style={{
                      color: colors.muted,
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    Mini app for football fandom
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    fontSize: 46,
                    fontWeight: 800,
                    lineHeight: 0.94,
                    letterSpacing: "-0.06em",
                  }}
                >
                  <span>Scores, fan clubs,</span>
                  <span>fantasy.</span>
                </div>
                <div
                  style={{
                    maxWidth: 320,
                    color: colors.muted,
                    fontSize: 20,
                    fontWeight: 700,
                    lineHeight: 1.25,
                    letterSpacing: "-0.03em",
                  }}
                >
                  Follow your club, get match alerts, and track the Farcaster
                  FEPL table.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={chipStyle}>Live scores</div>
              <div style={chipStyle}>Club alerts</div>
              <div style={chipStyle}>FEPL socials</div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              width: "36%",
              minWidth: 0,
            }}
          >
            <div
              style={{
                ...statCardStyle,
                minHeight: 156,
                background:
                  "linear-gradient(180deg, rgba(33,24,52,0.96), rgba(15,11,26,0.98))",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    color: colors.accent,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: "0.18em",
                  }}
                >
                  {matchContext?.label || "LIVE NOW"}
                </div>
                <Dot color={colors.lime} />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    fontSize: 36,
                    fontWeight: 800,
                    letterSpacing: "-0.06em",
                  }}
                >
                  <span>{matchContext?.homeScore || "2"}</span>
                  <span style={{ color: colors.muted, fontSize: 16 }}>-</span>
                  <span>{matchContext?.awayScore || "1"}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: colors.muted,
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  <span>{matchContext?.homeTeam || "LIV"}</span>
                  <span>{matchContext?.clock || "81'"}</span>
                  <span>{matchContext?.awayTeam || "ARS"}</span>
                </div>
              </div>
            </div>

            <div style={{ ...statCardStyle, minHeight: 156 }}>
              <div
                style={{
                  color: colors.accentSoft,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.18em",
                }}
              >
                FAN CLUBS
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    letterSpacing: "-0.05em",
                  }}
                >
                  Favorite club
                </div>
                <div
                  style={{
                    color: colors.muted,
                    fontSize: 16,
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  Follow teams and get score notifications on matchday.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
