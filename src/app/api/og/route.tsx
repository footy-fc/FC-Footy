import { ImageResponse } from "next/og";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

/* ------------------------------------------------------------------ */
/*  ESPN data fetching helpers                                        */
/* ------------------------------------------------------------------ */

interface ESPNTeam {
  abbreviation?: string;
  displayName: string;
  shortDisplayName?: string;
  logo?: string;
}

interface ESPNCompetitor {
  homeAway: "home" | "away";
  score: string;
  team: ESPNTeam;
}

interface ESPNStatusType {
  state: string; // "pre" | "in" | "post"
  name: string;
  shortDetail: string;
  detail: string;
}

interface ESPNCompetition {
  competitors?: ESPNCompetitor[];
  status?: {
    clock: number;
    displayClock: string;
    type: ESPNStatusType;
  };
}

interface ESPNEvent {
  id: string;
  name: string;
  competitions?: ESPNCompetition[];
}

interface ESPNResponse {
  events?: ESPNEvent[];
  leagues?: { abbreviation?: string }[];
}

interface MatchCard {
  homeAbbr: string;
  awayAbbr: string;
  homeScore: string;
  awayScore: string;
  statusLabel: string; // e.g. "LIVE", "HT", "FT", "KO 15:00"
  isLive: boolean;
  leagueName: string;
}

const LEAGUES = [
  { name: "EPL", id: "eng.1" },
  { name: "UCL", id: "uefa.champions" },
  { name: "La Liga", id: "esp.1" },
  { name: "Serie A", id: "ita.1" },
  { name: "Bundesliga", id: "ger.1" },
  { name: "Ligue 1", id: "fra.1" },
  { name: "FA Cup", id: "eng.fa" },
  { name: "UEL", id: "uefa.europa" },
  { name: "CWC", id: "fifa.cwc" },
];

async function fetchTopMatches(): Promise<MatchCard[]> {
  const allMatches: MatchCard[] = [];
  const live: MatchCard[] = [];
  const post: MatchCard[] = [];
  const pre: MatchCard[] = [];

  // Limit the number of concurrent league fetches to avoid timeouts
  const priorityLeagues = LEAGUES.slice(0, 6);

  await Promise.all(
    priorityLeagues.map(async (league) => {
      try {
        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.id}/scoreboard`;
        const res = await fetch(url, {
          cache: "no-store",
          signal: AbortSignal.timeout(3500),
        });
        if (!res.ok) return;
        const data = (await res.json()) as ESPNResponse;
        if (!data.events?.length) return;

        const leagueName = data.leagues?.[0]?.abbreviation ?? league.name;

        for (const event of data.events) {
          const comp = event.competitions?.[0];
          if (!comp?.competitors || !comp.status) continue;

          const home = comp.competitors.find((c) => c.homeAway === "home");
          const away = comp.competitors.find((c) => c.homeAway === "away");
          if (!home || !away) continue;

          const state = comp.status.type.state;
          const statusName = comp.status.type.name;

          let statusLabel = "";
          let isLive = false;

          if (state === "in") {
            isLive = true;
            if (statusName === "STATUS_HALFTIME") {
              statusLabel = "HT";
            } else {
              statusLabel = comp.status.type.shortDetail || "LIVE";
            }
          } else if (state === "post") {
            statusLabel = "FT";
          } else {
            statusLabel = comp.status.type.shortDetail || "KO";
          }

          const card: MatchCard = {
            homeAbbr: (home.team.abbreviation || home.team.displayName.substring(0, 3)).toUpperCase(),
            awayAbbr: (away.team.abbreviation || away.team.displayName.substring(0, 3)).toUpperCase(),
            homeScore: home.score ?? "0",
            awayScore: away.score ?? "0",
            statusLabel,
            isLive,
            leagueName,
          };

          if (state === "in") live.push(card);
          else if (state === "post") post.push(card);
          else pre.push(card);
        }
      } catch {
        // skip
      }
    })
  );

  return [...live, ...post, ...pre].slice(0, 6);
}

/* ------------------------------------------------------------------ */
/*  OG Image route                                                    */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Check for override params
  const homeParam = searchParams.get("home");
  const awayParam = searchParams.get("away");
  const homeScoreParam = searchParams.get("homeScore");
  const awayScoreParam = searchParams.get("awayScore");
  const statusParam = searchParams.get("status");
  const leagueParam = searchParams.get("league");
  const isLiveParam = searchParams.get("isLive");

  let featuredMatch: MatchCard | null = null;
  let otherMatches: MatchCard[] = [];

  try {
    const topMatches = await fetchTopMatches();
    if (homeParam && awayParam) {
      featuredMatch = {
        homeAbbr: homeParam.substring(0, 3).toUpperCase(),
        awayAbbr: awayParam.substring(0, 3).toUpperCase(),
        homeScore: homeScoreParam || "0",
        awayScore: awayScoreParam || "0",
        statusLabel: statusParam || "LIVE",
        isLive: isLiveParam === "true",
        leagueName: leagueParam || "MATCH",
      };
      // Filter out the featured match from others if it exists
      otherMatches = topMatches.filter(m => m.homeAbbr !== featuredMatch?.homeAbbr).slice(0, 4);
    } else {
      featuredMatch = topMatches[0] || null;
      otherMatches = topMatches.slice(1, 5);
    }
  } catch {
    // fallback
  }

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
              width: "60%",
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
                    fontSize: 44,
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
                    maxWidth: 300,
                    color: colors.muted,
                    fontSize: 18,
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
              width: "40%",
              minWidth: 0,
            }}
          >
            {/* ---- Featured Match Card ---- */}
            <div
              style={{
                ...statCardStyle,
                minHeight: 150,
                background:
                  "linear-gradient(180deg, rgba(33,24,52,0.96), rgba(15,11,26,0.98))",
              }}
            >
              {featuredMatch ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    height: "100%",
                    gap: 6,
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
                        color: colors.muted,
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                      }}
                    >
                      {featuredMatch.leagueName}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {featuredMatch.isLive && <Dot color={colors.lime} />}
                      <div
                        style={{
                          color: featuredMatch.isLive ? colors.lime : colors.muted,
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: "0.12em",
                        }}
                      >
                        {featuredMatch.statusLabel}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <div style={{ fontSize: 34, fontWeight: 800 }}>{featuredMatch.homeScore}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.muted }}>{featuredMatch.homeAbbr}</div>
                    </div>
                    <div style={{ fontSize: 20, color: colors.muted, fontWeight: 800 }}>:</div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <div style={{ fontSize: 34, fontWeight: 800 }}>{featuredMatch.awayScore}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.muted }}>{featuredMatch.awayAbbr}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", height: "100%", justifyContent: "center", color: colors.muted }}>
                  Loading scores...
                </div>
              )}
            </div>

            {/* ---- Live Now Sidebar ---- */}
            <div style={{ ...statCardStyle, minHeight: 180, padding: "14px" }}>
              <div
                style={{
                  color: colors.accentSoft,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.18em",
                  marginBottom: 10,
                }}
              >
                LIVE NOW
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {otherMatches.length > 0 ? (
                  otherMatches.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: i < otherMatches.length - 1 ? `1px solid ${colors.panelSoft}` : "none",
                        paddingBottom: i < otherMatches.length - 1 ? 8 : 0,
                      }}
                    >
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>{m.homeAbbr}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: colors.lime }}>{m.homeScore}-{m.awayScore}</div>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>{m.awayAbbr}</div>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: colors.muted }}>
                        {m.statusLabel}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: colors.muted, fontSize: 14 }}>Check app for more games</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=60",
      },
    }
  );
}
