import React from "react";
import { ChevronDown, Users } from "lucide-react";

interface Pick { is_captain?: boolean; player?: { web_name?: string; name?: string } | null }
interface Athlete { displayName?: string; shortName?: string }
interface Player { athlete?: Athlete; starter?: boolean; subbedIn?: boolean }
interface Roster { homeAway?: "home" | "away"; team?: { displayName?: string; abbreviation?: string; id?: string }; roster?: Player[] }
interface Moment { playerName: string; action: string; times: string[] }

const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const iconFor = (action: string) => action.includes("Goal") ? "⚽" : action.includes("Assist") ? "🅰" : action.includes("Yellow") ? "🟨" : action.includes("Red") ? "🟥" : action.includes("Sub") ? "↔" : "•";

export default function MatchLineups({ eventId, league, picks, moments }: { eventId: string; league: string; picks: Pick[]; moments: Moment[] }) {
  const [rosters, setRosters] = React.useState<Roster[]>([]);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/match-lineups?league=${encodeURIComponent(league)}&event=${eventId}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (!cancelled) setRosters(data.rosters ?? []); })
      .catch(() => { if (!cancelled) setRosters([]); });
    return () => { cancelled = true; };
  }, [eventId, league]);

  const renderRoster = (roster: Roster) => {
    const players = roster.roster ?? [];
    const starters = players.filter((player) => player.starter !== false && !player.subbedIn);
    const bench = players.filter((player) => player.starter === false || player.subbedIn);
    const renderPlayer = (player: Player, index: number) => {
      const name = player.athlete?.displayName ?? player.athlete?.shortName ?? "Unknown player";
      const pick = picks.find((item) => item.player && [item.player.web_name, item.player.name].filter(Boolean).some((value) => clean(value!) === clean(name) || clean(name).includes(clean(value!))));
      const playerMoments = moments.filter((moment) => clean(moment.playerName) === clean(name) || clean(name).includes(clean(moment.playerName)));
      return <div key={`${name}-${index}`} className={`rounded-lg px-2 py-1.5 text-xs ${pick ? "bg-limeGreenOpacity/15 text-notWhite ring-1 ring-limeGreenOpacity/40" : "text-lightPurple"}`}><div className="flex items-center justify-between gap-2"><span className="truncate">{name}</span><span className="flex shrink-0 items-center gap-1">{pick ? <span className="font-bold text-limeGreenOpacity">FPL{pick.is_captain ? " · C" : ""}</span> : null}{playerMoments.map((moment, momentIndex) => <span key={momentIndex} title={`${moment.action} ${moment.times.join(", ")}`}>{iconFor(moment.action)}</span>)}</span></div></div>;
    };
    return <div key={roster.homeAway ?? roster.team?.id} className="min-w-0 rounded-xl border border-lightPurple/10 bg-black/10 p-2"><div className="mb-1 flex justify-between gap-2 text-xs font-semibold text-notWhite"><span className="truncate">{roster.team?.displayName ?? roster.team?.abbreviation}</span><span className="shrink-0 text-[10px] text-lightPurple/60">{starters.length} starters</span></div><div className="space-y-1">{starters.map(renderPlayer)}</div>{bench.length > 0 ? <><div className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wide text-lightPurple/50">Bench</div><div className="space-y-1">{bench.map(renderPlayer)}</div></> : null}</div>;
  };

  const hasPlayers = rosters.some((roster) => (roster.roster?.length ?? 0) > 0);
  return <section className="mt-4" aria-label="Match lineups"><button type="button" onClick={() => setVisible((current) => !current)} aria-expanded={visible} className="flex w-full items-center gap-2 rounded-xl border border-lightPurple/10 px-3 py-2 text-left hover:bg-lightPurple/5"><Users className="h-4 w-4 text-deepPink" /><span className="font-semibold text-notWhite">Lineups</span><span className="text-[10px] text-lightPurple/60">XI · bench · events</span><ChevronDown className={`ml-auto h-4 w-4 text-lightPurple transition-transform ${visible ? "rotate-180" : ""}`} /></button>{visible ? !hasPlayers ? <div className="mt-2 rounded-xl border border-dashed border-lightPurple/15 px-3 py-3 text-xs text-lightPurple/60">Lineups will appear when teams publish them.</div> : <div className="mt-2 grid grid-cols-2 gap-2">{rosters.slice().sort((left) => left.homeAway === "home" ? -1 : 1).map(renderRoster)}</div> : null}</section>;
}
