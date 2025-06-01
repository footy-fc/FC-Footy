import React, { useState, useEffect } from "react";
import Image from "next/image";
import { fetchTeamLogos } from "./utils/fetchTeamLogos";
import { getFansForTeams } from "../lib/kvPerferences";

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
              <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                Team
              </th>
              <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                Followers
              </th>
            </tr>
          </thead>
          <tbody>
            {(topTeams || []).map((team, index) => {
              const teamId = getTeamId(team);
              const isLoading = loadingTeamIds.includes(teamId);
              const fanCount = fanCounts[teamId];
              return (
                <tr
                  key={teamId}
                  onClick={() => {
                    if (!isLoading && loadingTeamIds.length === 0) {
                      handleRowClick(team);
                    }
                  }}
                  className={`hover:bg-purplePanel transition-colors text-lightPurple text-sm cursor-pointer ${
                    favTeams.includes(teamId) ? "bg-purplePanel" : ""
                  }`}
                >
                  <td className="py-1 px-4 border-b border-limeGreenOpacity text-left font-medium">
                    {index + 1}
                  </td>
                  <td className="py-1 px-4 border-b border-limeGreenOpacity text-right font-medium">
                    {isLoading ? (
                      <LoadingIndicator />
                    ) : (
                      <Image src={team.logoUrl} alt={team.name} width={30} height={30} />
                    )}
                  </td>
                  <td className="py-1 px-4 border-b border-limeGreenOpacity text-left font-medium">
                    {team.name}
                  </td>
                  <td className="py-1 px-4 border-b border-limeGreenOpacity text-left font-medium">
                    {fanCount !== undefined ? fanCount : <LoadingIndicator />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FavoriteTeamLeaderboard;
