import React from "react";
import { Users } from "lucide-react";

interface Pick { element: number; position: number; is_captain?: boolean; player?: { web_name?: string; name?: string } | null }
interface Athlete { id?: string | number; displayName?: string; shortName?: string; starter?: boolean; subbedIn?: boolean; subbedOut?: boolean }
interface Roster { homeAway?: "home" | "away"; team?: { displayName?: string; abbreviation?: string }; roster?: Array<{ athlete?: Athlete; starter?: boolean; subbedIn?: boolean }> }

const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function MatchLineups({ eventId, league, picks }: { eventId: string; league: string; picks: Pick[] }) {
  const [rosters, setRosters] = React.useState<Roster[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/match-lineups?league=${encodeURIComponent(league)}&event=${eventId}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => { if (!cancelled) setRosters(data.rosters ?? []); })
      .catch(() => { if (!cancelled) setRosters([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [eventId, league]);

  if (loading) return <div className="mt-4 rounded-xl border border-lightPurple/10 px-3 py-3 text-xs text-lightPurple/70">Loading lineups…</div>;
  const hasPlayers = rosters.some((r) => (r.roster?.length ?? 0) > 0);
  if (!hasPlayers) return <div className="mt-4 rounded-xl border border-dashed border-lightPurple/15 px-3 py-3 text-xs text-lightPurple/60">Lineups will appear when teams publish them.</div>;

  return <section className="mt-4" aria-label="Match lineups">
    <div className="mb-2 flex items-center gap-2"><Users className="h-4 w-4 text-deepPink" /><h4 className="font-semibold text-notWhite">Lineups</h4><span className="text-[10px] text-lightPurple/60">FPL picks highlighted</span></div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {rosters.map((roster) => {
        const players = roster.roster ?? [];
        const starters = players.filter((p) => p.starter !== false && !p.subbedIn);
        const bench = players.filter((p) => p.starter === false || p.subbedIn);
        const render = (player: { athlete?: Athlete }, index: number) => {
          const name = player.athlete?.displayName ?? player.athlete?.shortName ?? "Unknown player";
          const pick = picks.find((p) => p.player && [p.player.web_name, p.player.name].filter(Boolean).some((n) => clean(n!) === clean(name) || clean(name).includes(clean(n!))));
          return <div key={`${name}-${index}`} className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs ${pick ? "bg-limeGreenOpacity/15 text-notWhite ring-1 ring-limeGreenOpacity/40" : "text-lightPurple"}`}><span className="truncate">{name}</span>{pick ? <span className="ml-2 shrink-0 text-[10px] font-bold text-limeGreenOpacity">FPL{pick.is_captain ? " · C" : ""}</span> : null}</div>;
        };
        return <div key={roster.homeAway ?? roster.team?.abbreviation} className="rounded-xl border border-lightPurple/10 bg-black/10 p-2"><div className="mb-1 flex justify-between text-xs font-semibold text-notWhite"><span>{roster.team?.displayName ?? roster.team?.abbreviation}</span><span className="text-[10px] text-lightPurple/60">{starters.length} starters</span></div><div className="space-y-1">{starters.map(render)}</div>{bench.length > 0 ? <><div className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wide text-lightPurple/50">Bench</div><div className="space-y-1">{bench.map(render)}</div></> : null}</div>;
      })}
    </div>
  </section>;
}
