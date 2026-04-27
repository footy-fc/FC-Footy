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
  const live: MatchCard[] = [];
  const post: MatchCard[] = [];
  const pre: MatchCard[] = [];

  // Reduce league count for faster response
  const priorityLeagues = LEAGUES.slice(0, 5);

  try {
    await Promise.all(
      priorityLeagues.map(async (league) => {
        try {
          const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.id}/scoreboard`;
          const res = await fetch(url, {
            cache: "no-store",
            signal: AbortSignal.timeout(2500),
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
              homeAbbr: (home.team.abbreviation || home.team.displayName?.substring(0, 3) || "???").toUpperCase(),
              awayAbbr: (away.team.abbreviation || away.team.displayName?.substring(0, 3) || "???").toUpperCase(),
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
  } catch {
    // top level fail
  }

  return [...live, ...post, ...pre].slice(0, 6);
}

/* ------------------------------------------------------------------ */
/*  OG Image route                                                    */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const home = searchParams.get("home") || "FC";
    const away = searchParams.get("away") || "FOOTY";
    const score = `${searchParams.get("homeScore") || "0"} - ${searchParams.get("awayScore") || "0"}`;

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "#050712",
            color: "#fff",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ fontSize: 60, fontWeight: "bold", marginBottom: 20 }}>{home} vs {away}</div>
          <div style={{ fontSize: 80, fontWeight: "bold", color: "#A2E634" }}>{score}</div>
          <div style={{ fontSize: 24, marginTop: 40, color: "#C0B2F0" }}>Live on FC Footy</div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    return new Response(`Failed to generate image`, { status: 500 });
  }
}
