import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Types ---

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

interface ESPNDetail {
  athletesInvolved?: { displayName: string; shortName?: string }[];
  type?: { text: string };
  clock?: { displayValue: string };
  team?: { abbreviation?: string };
  scoreValue?: number;
}

interface ESPNCompetition {
  competitors?: ESPNCompetitor[];
  details?: ESPNDetail[];
  status?: {
    type: {
      state: string;
      name: string;
      shortDetail: string;
    };
  };
}

interface ESPNEvent {
  id: string;
  name: string;
  competitions?: ESPNCompetition[];
}

interface ESPNResponse {
  events?: ESPNEvent[];
  leagues?: { abbreviation?: string; name?: string; logos?: { href?: string }[] }[];
}

interface HighlightEvent {
  type: string;
  player: string;
  team: string;
  time: string;
}

export interface MatchHighlight {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  homeLogo: string;
  awayLogo: string;
  leagueName: string;
  leagueLogo: string;
  summary: string;
  keyEvents: HighlightEvent[];
}

// --- Leagues to fetch ---
const HIGHLIGHT_LEAGUES = [
  { name: "Premier League", id: "eng.1" },
  { name: "Champions League", id: "uefa.champions" },
  { name: "La Liga", id: "esp.1" },
  { name: "Serie A", id: "ita.1" },
  { name: "Bundesliga", id: "ger.1" },
];

// --- ESPN fetch ---
async function fetchCompletedMatches(): Promise<{ league: string; leagueLogo: string; event: ESPNEvent; comp: ESPNCompetition }[]> {
  const results: { league: string; leagueLogo: string; event: ESPNEvent; comp: ESPNCompetition }[] = [];

  await Promise.all(
    HIGHLIGHT_LEAGUES.map(async (league) => {
      try {
        const res = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.id}/scoreboard`,
          { cache: "no-store", signal: AbortSignal.timeout(4000) }
        );
        if (!res.ok) return;

        const data = (await res.json()) as ESPNResponse;
        const leagueName = data.leagues?.[0]?.abbreviation ?? league.name;
        const leagueLogo = data.leagues?.[0]?.logos?.[0]?.href ?? "";

        for (const event of data.events ?? []) {
          const comp = event.competitions?.[0];
          if (!comp) continue;
          if (comp.status?.type?.state !== "post") continue;
          if (!comp.competitors || comp.competitors.length < 2) continue;
          // Only include matches with at least some details
          results.push({ league: leagueName, leagueLogo, event, comp });
        }
      } catch {
        // skip on error
      }
    })
  );

  return results.slice(0, 6);
}

// --- Build Groq prompt ---
function buildPrompt(
  homeTeam: string,
  awayTeam: string,
  homeScore: string,
  awayScore: string,
  league: string,
  events: HighlightEvent[]
): string {
  const eventLines = events
    .slice(0, 10)
    .map((e) => `${e.time}' — ${e.type}: ${e.player} (${e.team})`)
    .join("\n");

  return `You are a world-class football commentator. Write a 2-sentence match summary in an exciting, punchy, Peter Drury style.

Match: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam} (${league})
Key events:
${eventLines || "No detailed events recorded."}

Write exactly 2 vivid sentences. Focus on the scoreline, drama, key moments, and what it means. Do not add any preamble or labels.`;
}

// --- Groq call ---
async function generateSummary(prompt: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GROQKEY;
  if (!apiKey) return "An enthralling contest settled on the night.";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 120,
      temperature: 0.8,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return "An enthralling contest settled on the night.";
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "An enthralling contest settled on the night.";
}

// --- Build key events list from ESPN details ---
function parseKeyEvents(details: ESPNDetail[]): HighlightEvent[] {
  const important = ["Goal", "Yellow Card", "Red Card", "Penalty - Scored", "Penalty - Missed", "Own Goal"];
  return details
    .filter((d) => important.some((t) => d.type?.text?.includes(t)))
    .map((d) => ({
      type: d.type?.text ?? "Event",
      player: d.athletesInvolved?.[0]?.shortName ?? d.athletesInvolved?.[0]?.displayName ?? "Unknown",
      team: d.team?.abbreviation ?? "",
      time: d.clock?.displayValue ?? "?",
    }))
    .slice(0, 10);
}

// --- GET handler ---
export async function GET() {
  try {
    const matches = await fetchCompletedMatches();

    if (matches.length === 0) {
      return NextResponse.json([], {
        headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
      });
    }

    // Generate summaries concurrently but limit to 4 to respect Groq rate limits
    const limited = matches.slice(0, 4);

    const highlights = await Promise.all(
      limited.map(async ({ league, leagueLogo, event, comp }) => {
        const home = comp.competitors!.find((c) => c.homeAway === "home")!;
        const away = comp.competitors!.find((c) => c.homeAway === "away")!;

        const homeTeam = (home.team.abbreviation || home.team.shortDisplayName || home.team.displayName).toUpperCase();
        const awayTeam = (away.team.abbreviation || away.team.shortDisplayName || away.team.displayName).toUpperCase();
        const homeScore = home.score ?? "0";
        const awayScore = away.score ?? "0";
        const homeLogo = home.team.logo ?? "";
        const awayLogo = away.team.logo ?? "";

        const keyEvents = parseKeyEvents(comp.details ?? []);
        const prompt = buildPrompt(homeTeam, awayTeam, homeScore, awayScore, league, keyEvents);

        let summary = "An enthralling contest settled on the night.";
        try {
          summary = await generateSummary(prompt);
        } catch {
          // fallback summary
        }

        const highlight: MatchHighlight = {
          id: event.id,
          homeTeam,
          awayTeam,
          homeScore,
          awayScore,
          homeLogo,
          awayLogo,
          leagueName: league,
          leagueLogo,
          summary,
          keyEvents,
        };

        return highlight;
      })
    );

    return NextResponse.json(highlights, {
      headers: {
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("[/api/highlights]", err);
    return NextResponse.json([], { status: 500 });
  }
}
