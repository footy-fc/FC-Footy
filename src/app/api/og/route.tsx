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

async function fetchBestMatch(): Promise<MatchCard | null> {
  // Try each league in priority order until we find a live → post → pre match
  let bestLive: MatchCard | null = null;
  let bestPost: MatchCard | null = null;
  let bestPre: MatchCard | null = null;

  for (const league of LEAGUES) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.id}/scoreboard`;
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as ESPNResponse;
      if (!data.events?.length) continue;

      const leagueName =
        data.leagues?.[0]?.abbreviation ?? league.name;

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
          // pre
          statusLabel = comp.status.type.shortDetail || "Upcoming";
        }

        const card: MatchCard = {
          homeAbbr:
            home.team.abbreviation ||
            (home.team.shortDisplayName || home.team.displayName)
              .substring(0, 3)
              .toUpperCase(),
          awayAbbr:
            away.team.abbreviation ||
            (away.team.shortDisplayName || away.team.displayName)
              .substring(0, 3)
              .toUpperCase(),
          homeScore: home.score ?? "0",
          awayScore: away.score ?? "0",
          statusLabel,
          isLive,
          leagueName,
        };

        if (state === "in" && !bestLive) {
          bestLive = card;
        } else if (state === "post" && !bestPost) {
          bestPost = card;
        } else if (state === "pre" && !bestPre) {
          bestPre = card;
        }
      }

      // Prefer live matches – break early if we found one
      if (bestLive) break;
    } catch {
      // network error – skip league
      continue;
    }
  }

  return bestLive ?? bestPost ?? bestPre ?? null;
}

/* ------------------------------------------------------------------ */
/*  OG Image route                                                    */
/* ------------------------------------------------------------------ */

export async function GET() {
  let match: MatchCard | null = null;

  try {
    match = await fetchBestMatch();
  } catch {
    // Fail silently, use fallback
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
            {/* ---- Score card ---- */}
            <div
              style={{
                ...statCardStyle,
                minHeight: 156,
                background:
                  "linear-gradient(180deg, rgba(33,24,52,0.96), rgba(15,11,26,0.98))",
              }}
            >
              {match ? (
                /* ---------- Dynamic match card ---------- */
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    height: "100%",
                    gap: 6,
                  }}
                >
                  {/* Header row: league + status */}
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
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                      }}
                    >
                      {match.leagueName}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {match.isLive && <Dot color={colors.lime} />}
                      <div
                        style={{
                          color: match.isLive
                            ? colors.lime
                            : match.statusLabel === "FT"
                              ? colors.accentSoft
                              : colors.muted,
                          fontSize: 12,
                          fontWeight: 800,
                          letterSpacing: "0.12em",
                        }}
                      >
                        {match.statusLabel}
                      </div>
                    </div>
                  </div>

                  {/* Scoreline */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 14,
                      padding: "6px 0",
                    }}
                  >
                    {/* Home */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 38,
                          fontWeight: 800,
                          letterSpacing: "-0.04em",
                          lineHeight: 1,
                        }}
                      >
                        {match.homeScore}
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: colors.muted,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {match.homeAbbr}
                      </div>
                    </div>

                    {/* Separator */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <div
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 999,
                          background: colors.muted,
                        }}
                      />
                      <div
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 999,
                          background: colors.muted,
                        }}
                      />
                    </div>

                    {/* Away */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 38,
                          fontWeight: 800,
                          letterSpacing: "-0.04em",
                          lineHeight: 1,
                        }}
                      >
                        {match.awayScore}
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: colors.muted,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {match.awayAbbr}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ---------- Fallback: no live/recent match ---------- */
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
                        color: colors.accent,
                        fontSize: 13,
                        fontWeight: 800,
                        letterSpacing: "0.18em",
                      }}
                    >
                      MATCH DAY
                    </div>
                    <Dot color={colors.accentSoft} />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        letterSpacing: "-0.05em",
                      }}
                    >
                      Live scores
                    </div>
                    <div
                      style={{
                        color: colors.muted,
                        fontSize: 15,
                        fontWeight: 700,
                        lineHeight: 1.3,
                      }}
                    >
                      Real-time scorelines across top leagues, updated every
                      matchday.
                    </div>
                  </div>
                </div>
              )}
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
    {
      ...size,
      headers: {
        "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=60",
      },
    }
  );
}
