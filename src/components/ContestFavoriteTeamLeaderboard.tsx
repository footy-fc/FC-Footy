import React, { useState, useEffect } from "react";
import Image from "next/image";
import { fetchTeamLogos } from "./utils/fetchTeamLogos";
import { getFansForTeams } from "../lib/kvPerferences";
import { PRIVILEGED_FIDS } from '~/config/privileged';
import { sdk } from '@farcaster/miniapp-sdk';

interface Team {
  fid?: number; // Now optional
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
}

// Generate a unique team ID (e.g. "eng.1-ars")
const getTeamId = (team: Team) => `${team.league}-${team.abbreviation}`;

// A simple component to animate loading dots.
const LoadingDots = () => {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return <span className="text-sm">{dots}</span>;
};

// Loading indicator combining the spinner and animated dots.
const LoadingIndicator = () => {
  return (
    <div className="flex items-center space-x-1">
      <Image src="/defifa_spinner.gif" alt="loading" width={30} height={30} />
      <LoadingDots />
    </div>
  );
};

interface TeamRowProps {
  team: Team;
  index: number;
  favTeams: string[];
  loadingTeamIds: string[];
  fanCount?: number;
  onRowClick: (team: Team) => void;
}

const TeamRow: React.FC<TeamRowProps> = ({ team, index, favTeams, loadingTeamIds, fanCount, onRowClick }) => {
  const teamId = getTeamId(team);
  const isLoading = loadingTeamIds.includes(teamId);

  const [hasRoom, setHasRoom] = useState<boolean | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [currentFid, setCurrentFid] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const ctx = await sdk.context;
        if (!cancelled) setCurrentFid(ctx?.user?.fid ?? null);
      } catch {
        if (!cancelled) setCurrentFid(null);
      }
      try {
        const res = await fetch(`/api/fanclub-chat?teamId=${encodeURIComponent(teamId)}`);
        if (!cancelled) {
          if (res.ok) {
            const j = await res.json();
            setHasRoom(true);
            setInviteUrl(j?.inviteLinkUrl || null);
          } else {
            setHasRoom(false);
            setInviteUrl(null);
          }
        }
      } catch {
        if (!cancelled) {
          setHasRoom(false);
          setInviteUrl(null);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  return (
    <tr
      onClick={() => {
        if (!isLoading && loadingTeamIds.length === 0) {
          onRowClick(team);
        }
      }}
      className={`hover:bg-purplePanel transition-colors text-lightPurple text-sm cursor-pointer ${
        favTeams.includes(teamId) ? "bg-purplePanel" : ""
      }`}
    >
      <td className="py-1 px-4 border-b border-limeGreenOpacity text-left font-medium">{index + 1}</td>
      <td className="py-1 px-4 border-b border-limeGreenOpacity text-right font-medium">
        {isLoading ? <LoadingIndicator /> : <Image src={team.logoUrl} alt={team.name} width={30} height={30} />}
      </td>
      <td className="py-1 px-4 border-b border-limeGreenOpacity text-left font-medium">{team.name}</td>
      <td className="py-1 px-4 border-b border-limeGreenOpacity text-left font-medium">
        {fanCount !== undefined ? fanCount : <LoadingIndicator />}
      </td>
      <td className="py-1 px-4 border-b border-limeGreenOpacity text-center">
        {hasRoom === null ? (
          <span className="text-xs text-gray-400">…</span>
        ) : hasRoom ? (
          <button
            title="Open Chat"
            className="px-2 py-1 text-xs rounded border border-limeGreenOpacity hover:bg-deepPink"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await sdk.actions.ready();
              } catch {}
              if (inviteUrl) {
                try {
                  await sdk.actions.openUrl(inviteUrl);
                } catch {}
              }
            }}
          >
            💬
          </button>
        ) : (
          <button
            title="Create Chat"
            className="px-2 py-1 text-xs rounded border border-fontRed text-fontRed hover:bg-deepPink hover:text-white"
            onClick={async (e) => {
              e.stopPropagation();
              if (!currentFid || !PRIVILEGED_FIDS.includes(currentFid)) return;
              try {
                const name = `${team.abbreviation.toUpperCase()} Fan Chat`;
                const payload = {
                  name,
                  imageUrl: team.logoUrl,
                  generateInviteLink: true,
                  settings: { messageTTLDays: 30, membersCanInvite: true },
                  teamId,
                  invitees: [{ fid: currentFid, role: 'admin' as const }],
                };
                const res = await fetch('/api/admin/create-group', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                const j = await res.json().catch(() => ({}));
                if (res.ok) {
                  setHasRoom(true);
                  setInviteUrl(j?.result?.inviteLinkUrl || j?.inviteLinkUrl || null);
                  if (j?.result?.inviteLinkUrl || j?.inviteLinkUrl) {
                    try {
                      await sdk.actions.openUrl(j.result?.inviteLinkUrl || j.inviteLinkUrl);
                    } catch {}
                  }
                }
              } catch {}
            }}
            disabled={!currentFid || !PRIVILEGED_FIDS.includes(currentFid)}
          >
            💬
          </button>
        )}
      </td>
    </tr>
  );
};

const FavoriteTeamLeaderboard = () => {
  const [teams, setTeams] = useState<Team[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("favoriteTeams");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  // favTeams now stores unique team IDs (e.g. "eng.1-ars")
  const [favTeams] = useState<string[]>([]);
  // loadingTeamIds will store team IDs that are processing an update.
  const [loadingTeamIds] = useState<string[]>([]);
  // fanCounts maps each team’s unique ID to its fan count.
  const [fanCounts, setFanCounts] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("fanCounts");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          return {};
        }
      }
    }
    return {};
  });

  // Fetch the team data once on mount and update cache
  useEffect(() => {
    async function fetchAndCacheTeams() {
      const data = await fetchTeamLogos();
      setTeams(data);
      if (typeof window !== "undefined") {
        localStorage.setItem("favoriteTeams", JSON.stringify(data));
      }
    }
    fetchAndCacheTeams();
  }, []);

  // Once teams are loaded, fetch each team’s fan count from Redis and update cache.
  useEffect(() => {
    async function fetchFanCounts() {
      const counts: Record<string, number> = {};
      const teamIds = teams.map(getTeamId);
      const fansByTeam = await Promise.all(teamIds.map((id) => getFansForTeams([id])));
      teamIds.forEach((id, i) => {
        counts[id] = fansByTeam[i].length;
      });
      setFanCounts(counts);
      if (typeof window !== "undefined") {
        localStorage.setItem("fanCounts", JSON.stringify(counts));
      }
    }

    if (teams.length > 0) {
      fetchFanCounts();
    }
  }, [teams]);

  const handleRowClick = async (team: Team) => {
    // Add logic to show all fans or further details for the team
    console.log("Row clicked:", team);
  };

  // Order teams by fan count (highest first)
  const orderedTeams = [...(teams || [])].sort((a, b) => {
    const countA = fanCounts[getTeamId(a)] || 0;
    const countB = fanCounts[getTeamId(b)] || 0;
    return countB - countA;
  });

  // Only display the top 10 teams
  const topTeams = (orderedTeams || []).slice(0, 10);

  return (
    <div className="w-full h-full">
      {/* Scrollable table container */}
      <div className="w-full h-[500px] overflow-y-auto">
        <table className="w-full bg-darkPurple">
          <thead className="bg-darkPurple">
            <tr>
              <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                Rank
              </th>
              <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                Badge
              </th>
              <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-left font-medium">
                Team
              </th>
              <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                Followers
              </th>
              <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                Chat
              </th>
            </tr>
          </thead>
          <tbody>
            {(topTeams || []).map((team, index) => (
              <TeamRow
                key={getTeamId(team)}
                team={team}
                index={index}
                favTeams={favTeams}
                loadingTeamIds={loadingTeamIds}
                fanCount={fanCounts[getTeamId(team)]}
                onRowClick={handleRowClick}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FavoriteTeamLeaderboard;
