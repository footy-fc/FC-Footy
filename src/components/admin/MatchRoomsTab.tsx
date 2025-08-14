"use client";
// @ts-nocheck
import React, { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

interface MatchRoomRecord {
  eventId: string;
  parentUrl: string;
  castHash: string;
  createdAt: string;
}

interface League {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  country: string;
}

const MatchRoomsTab: React.FC = () => {
  // Admin-driven eventId inputs
  const [leagueId, setLeagueId] = useState<string>("eng.1");
  const [homeAbbr, setHomeAbbr] = useState<string>("");
  const [awayAbbr, setAwayAbbr] = useState<string>("");

  const [eventId, setEventId] = useState("");
  const [parentUrl, setParentUrl] = useState("");
  const [rooms, setRooms] = useState<MatchRoomRecord[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [response, setResponse] = useState("");
  const [fid, setFid] = useState<number | undefined>(undefined);

  // Admin datasets
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [memberships, setMemberships] = useState<Record<string, string[]>>({});
  const [loadingMeta, setLoadingMeta] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      try {
        await sdk.actions.ready();
        const context = await sdk.context;
        setFid(context?.user?.fid);
      } catch {}
    };
    load();
  }, []);

  // Load existing rooms for display in admin
  useEffect(() => {
    const loadExistingRooms = async () => {
      try {
        const res = await fetch('/api/match-rooms', {
          headers: { 'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || '' },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.rooms)) {
          setRooms(data.rooms);
        }
      } catch {}
    };
    loadExistingRooms();
  }, []);

  // Fetch leagues, teams, memberships for dropdowns
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        setLoadingMeta(true);
        const [leaguesRes, teamsRes, membershipsRes] = await Promise.all([
          fetch('/api/leagues'),
          fetch('/api/teams', { headers: { 'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || '' } }),
          fetch('/api/memberships/all', { headers: { 'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || '' } }),
        ]);
        const leaguesJson = await leaguesRes.json();
        const teamsJson = await teamsRes.json();
        const membershipsJson = await membershipsRes.json();
        setLeagues(leaguesJson.leagues || []);
        setTeams(teamsJson.teams || []);
        setMemberships(membershipsJson.memberships || {});
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load league/team metadata', e);
      } finally {
        setLoadingMeta(false);
        console.log('Loaded league/team metadata', loadingMeta);
      }
    };
    fetchMeta();
  }, []);

  const fetchRoom = async (eId: string) => {
    const res = await fetch(`/api/match-rooms?eventId=${encodeURIComponent(eId)}`);
    const data = await res.json();
    if (data?.room) {
      setRooms((prev) => {
        const others = prev.filter((r) => r.eventId !== eId);
        return [...others, data.room];
      });
    }
  };

  const buildEventId = (): string => {
    // Convert leagueId to underscore format: eng.1 -> eng_1
    const leagueUnderscore = leagueId.includes('.') ? leagueId.replace('.', '_') : leagueId;
    const home = homeAbbr.trim().toUpperCase();
    const away = awayAbbr.trim().toUpperCase();
    // Drop the date; ID becomes league + teams
    return `${leagueUnderscore}_${home}_${away}`;
  };

  const createRoom = async () => {
    const newEventId = buildEventId();
    if (!homeAbbr || !awayAbbr || !leagueId) {
      setResponse("Please select league and provide home/away team abbreviations");
      return;
    }
    setEventId(newEventId);
    const appUrlRaw = process.env.NEXT_PUBLIC_URL || "https://fc-footy.vercel.app";
    const appUrl = appUrlRaw.startsWith("http") ? appUrlRaw : `https://${appUrlRaw}`;
    const defaultParentUrl = `${appUrl}/chat?eventId=${encodeURIComponent(newEventId)}`;
    const finalParent = parentUrl || defaultParentUrl;

    setIsCreating(true);
    setResponse("");
    try {
      await sdk.actions.ready();
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const composeOptions: any = {
        text: `Match Room created for ${newEventId}. Join the chat!`,
        parent: { type: "url", url: finalParent },
        channelKey: "football",
      };
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const cast = await (sdk.actions as any).composeCast(composeOptions);

      const castHash = (cast as any)?.hash || (cast as any)?.cast?.hash || "";
      const res = await fetch("/api/match-rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
        body: JSON.stringify({ eventId: newEventId, parentUrl: finalParent, castHash, fid }),
      });
      const data = await res.json();
      if (res.ok) {
        setResponse("Room created and saved");
        await fetchRoom(newEventId);
      } else {
        setResponse(data?.error || "Failed to save room");
      }
    } catch (e: any) {
      setResponse(e?.message || "Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-notWhite mb-4">Match Rooms</h3>
      <div className="grid gap-3 mb-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-lightPurple">League</label>
            <select
              value={leagueId}
              onChange={(e) => {
                setLeagueId(e.target.value);
                setHomeAbbr("");
                setAwayAbbr("");
              }}
              className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
            >
              {leagues.length === 0 ? (
                <option value="eng.1">EPL</option>
              ) : (
                leagues.map((l) => (
                  <option value={l.id} key={l.id}>{l.name} ({l.id})</option>
                ))
              )}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-lightPurple">Home</label>
            <select
              value={homeAbbr}
              onChange={(e) => setHomeAbbr(e.target.value)}
              className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
            >
              <option value="">Select team</option>
              {(() => {
                const leagueTeamIds = memberships[leagueId] || [];
                const leagueTeams = leagueTeamIds.length > 0
                  ? teams.filter((t) => leagueTeamIds.includes(t.id))
                  : teams;
                return leagueTeams
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((t) => (
                    <option key={t.id} value={t.abbreviation}>{t.name} ({t.abbreviation})</option>
                  ));
              })()}
            </select>
          </div>
          <div>
            <label className="text-xs text-lightPurple">Away</label>
            <select
              value={awayAbbr}
              onChange={(e) => setAwayAbbr(e.target.value)}
              className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
            >
              <option value="">Select team</option>
              {(() => {
                const leagueTeamIds = memberships[leagueId] || [];
                const leagueTeams = leagueTeamIds.length > 0
                  ? teams.filter((t) => leagueTeamIds.includes(t.id))
                  : teams;
                return leagueTeams
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((t) => (
                    <option key={t.id} value={t.abbreviation}>{t.name} ({t.abbreviation})</option>
                  ));
              })()}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-lightPurple">Parent URL (optional)</label>
          <input
          className="p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
          placeholder="Parent URL (optional)"
          value={parentUrl}
          onChange={(e) => setParentUrl(e.target.value)}
          />
        </div>
        <button
          onClick={createRoom}
          disabled={isCreating}
          className={`px-4 py-2 rounded ${isCreating ? "bg-gray-600" : "bg-deepPink hover:bg-fontRed"} text-white`}
        >
          {isCreating ? "Creating..." : "Create Room"}
        </button>
        {response && <div className="text-sm text-lightPurple">{response}</div>}
        {eventId && (
          <div className="text-xs text-lightPurple">Generated eventId: <span className="text-notWhite">{eventId}</span></div>
        )}
      </div>

      <div>
        <h4 className="text-notWhite font-medium mb-2">Existing Rooms</h4>
        {rooms.length === 0 ? (
          <div className="text-lightPurple text-sm">No rooms found</div>
        ) : (
          <ul className="space-y-2">
            {rooms.map((r) => (
              <li key={r.eventId} className="p-2 border border-limeGreenOpacity rounded">
                <div className="text-sm text-lightPurple">Event: <span className="text-notWhite">{r.eventId}</span></div>
                {r.createdAt && (
                  <div className="text-[11px] text-gray-400">Created: {new Date(r.createdAt).toLocaleString()}</div>
                )}
                {r.parentUrl && (
                  <div className="text-sm text-lightPurple break-all">Parent: {r.parentUrl}</div>
                )}
                <div className="text-sm text-lightPurple break-all">Cast: {r.castHash}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MatchRoomsTab;


