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
  const [castHash, setCastHash] = useState("");
  const [rooms, setRooms] = useState<MatchRoomRecord[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [response, setResponse] = useState("");
  const [fid, setFid] = useState<number | undefined>(undefined);

  // Edit mode state
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editEventId, setEditEventId] = useState("");
  const [editParentUrl, setEditParentUrl] = useState("");
  const [editCastHash, setEditCastHash] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Admin datasets
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [memberships, setMemberships] = useState<Record<string, string[]>>({});

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
        console.log('Loaded league/team metadata');
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
      let finalCastHash = castHash.trim();
      
      // If no cast hash provided, create a new cast
      if (!finalCastHash) {
        await sdk.actions.ready();
        const composeOptions = {
          text: `Match Room created for ${newEventId}. Join the chat!`,
          embeds: [finalParent] as [] | [string] | [string, string],
          channelKey: "football",
        };
        const cast = await sdk.actions.composeCast(composeOptions);
        finalCastHash = cast?.cast?.hash || "";
      }

      const res = await fetch("/api/match-rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
        body: JSON.stringify({ eventId: newEventId, parentUrl: finalParent, castHash: finalCastHash, fid }),
      });
      const data = await res.json();
      if (res.ok) {
        setResponse("Room created and saved");
        await fetchRoom(newEventId);
      } else {
        setResponse(data?.error || "Failed to save room");
      }
    } catch (e: unknown) {
      setResponse((e as Error)?.message || "Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (room: MatchRoomRecord) => {
    setEditingRoom(room.eventId);
    setEditEventId(room.eventId);
    setEditParentUrl(room.parentUrl || "");
    setEditCastHash(room.castHash || "");
  };

  const cancelEdit = () => {
    setEditingRoom(null);
    setEditEventId("");
    setEditParentUrl("");
    setEditCastHash("");
  };

  const updateRoom = async () => {
    if (!editingRoom || !editEventId.trim()) {
      setResponse("Please provide a valid event ID");
      return;
    }

    setIsUpdating(true);
    setResponse("");
    
    try {
      const res = await fetch("/api/match-rooms", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
        body: JSON.stringify({
          oldEventId: editingRoom,
          newEventId: editEventId.trim(),
          parentUrl: editParentUrl.trim() || undefined,
          castHash: editCastHash.trim() || undefined,
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setResponse("Room updated successfully");
        // Update the rooms list
        setRooms(prev => prev.map(room => 
          room.eventId === editingRoom 
            ? { ...room, eventId: editEventId.trim(), parentUrl: editParentUrl.trim(), castHash: editCastHash.trim() }
            : room
        ));
        cancelEdit();
      } else {
        setResponse(data?.error || "Failed to update room");
      }
    } catch (e: unknown) {
      setResponse((e as Error)?.message || "Failed to update room");
    } finally {
      setIsUpdating(false);
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
        <div>
          <label className="text-xs text-lightPurple">Cast Hash (optional - will create new cast if empty)</label>
          <input
            className="p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
            placeholder="0x..."
            value={castHash}
            onChange={(e) => setCastHash(e.target.value)}
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
                {editingRoom === r.eventId ? (
                  // Edit mode
                  <div className="space-y-2">
                    <div className="text-sm text-lightPurple font-medium">Editing: {r.eventId}</div>
                    <div className="grid gap-2">
                      <div>
                        <label className="text-xs text-lightPurple">New Event ID</label>
                        <input
                          className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
                          value={editEventId}
                          onChange={(e) => setEditEventId(e.target.value)}
                          placeholder="e.g., eng_1_MNC_TOT"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-lightPurple">Parent URL (optional)</label>
                        <input
                          className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
                          value={editParentUrl}
                          onChange={(e) => setEditParentUrl(e.target.value)}
                          placeholder="Parent URL"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-lightPurple">Cast Hash (optional)</label>
                        <input
                          className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
                          value={editCastHash}
                          onChange={(e) => setEditCastHash(e.target.value)}
                          placeholder="0x..."
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={updateRoom}
                        disabled={isUpdating}
                        className={`px-3 py-1 rounded text-xs ${isUpdating ? "bg-gray-600" : "bg-deepPink hover:bg-fontRed"} text-white`}
                      >
                        {isUpdating ? "Updating..." : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isUpdating}
                        className="px-3 py-1 rounded text-xs bg-gray-600 hover:bg-gray-500 text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm text-lightPurple">Event: <span className="text-notWhite">{r.eventId}</span></div>
                      {r.createdAt && (
                        <div className="text-[11px] text-gray-400">Created: {new Date(r.createdAt).toLocaleString()}</div>
                      )}
                      {r.parentUrl && (
                        <div className="text-sm text-lightPurple break-all">Parent: {r.parentUrl}</div>
                      )}
                      <div className="text-sm text-lightPurple break-all">Cast: {r.castHash}</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(r)}
                        className="text-blue-400 hover:text-blue-300 text-xs border border-blue-400/40 rounded px-2 py-0.5"
                        title="Edit room"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/match-rooms?eventId=${encodeURIComponent(r.eventId)}`, {
                              method: 'DELETE',
                              headers: { 'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || '' },
                            });
                            if (res.ok) {
                              setRooms(prev => prev.filter(x => x.eventId !== r.eventId));
                            }
                          } catch {}
                        }}
                        className="text-fontRed hover:text-deepPink text-xs border border-fontRed/40 rounded px-2 py-0.5"
                        title="Remove room"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MatchRoomsTab;


