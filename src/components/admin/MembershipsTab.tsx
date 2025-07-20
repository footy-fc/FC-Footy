import React from 'react';

interface Team {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  country: string;
  logoUrl: string;
  roomHash?: string;
  createdAt: string;
  updatedAt: string;
}

interface League {
  id: string;
  name: string;
  country: string;
  type: "domestic" | "continental" | "international";
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MembershipsTabProps {
  teams: Team[];
  leagues: League[];
  memberships: {[leagueId: string]: string[]};
  loadingMemberships: boolean;
  addTeamToLeague: (teamId: string, leagueId: string) => void;
  newMembership: {
    teamId: string;
    leagueId: string;
    season: string;
    startDate: string;
  };
  setNewMembership: React.Dispatch<React.SetStateAction<{
    teamId: string;
    leagueId: string;
    season: string;
    startDate: string;
  }>>;
}

export default function MembershipsTab({
  teams,
  leagues,
  memberships,
  loadingMemberships,
  addTeamToLeague,
  newMembership,
  setNewMembership
}: MembershipsTabProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-lightPurple">Team-League Memberships</h2>
        <button
          onClick={() => {}}
          className="bg-deepPink text-white px-4 py-2 rounded-lg hover:bg-fontRed transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Add Team to League Form */}
      <div className="mb-8 p-6 bg-darkPurple rounded-lg border border-limeGreenOpacity">
        <h3 className="text-lg font-semibold mb-4 text-lightPurple">Add Team to League</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <select
            value={newMembership.teamId}
            onChange={(e) => setNewMembership({...newMembership, teamId: e.target.value})}
            className="p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
          >
            <option value="">Select Team</option>
            {teams
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.abbreviation})
              </option>
            ))}
          </select>
          <select
            value={newMembership.leagueId}
            onChange={(e) => setNewMembership({...newMembership, leagueId: e.target.value})}
            className="p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
          >
            <option value="">Select League</option>
            {leagues
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((league) => (
              <option key={league.id} value={league.id}>
                {league.name} ({league.country})
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Season (e.g., 2024-25)"
            value={newMembership.season}
            onChange={(e) => setNewMembership({...newMembership, season: e.target.value})}
            className="p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
          />
          <input
            type="date"
            value={newMembership.startDate}
            onChange={(e) => setNewMembership({...newMembership, startDate: e.target.value})}
            className="p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
          />
        </div>
        <button
          onClick={() => addTeamToLeague(newMembership.teamId, newMembership.leagueId)}
          className="mt-4 bg-deepPink text-white px-6 py-2 rounded-lg hover:bg-fontRed transition-colors"
        >
          Add Team to League
        </button>
      </div>

      {/* Memberships List */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-lightPurple">Existing Memberships</h3>
        {loadingMemberships ? (
          <div className="text-center py-8 text-lightPurple">Loading memberships...</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(memberships)
              .sort(([leagueIdA], [leagueIdB]) => {
                const leagueA = leagues.find(l => l.id === leagueIdA);
                const leagueB = leagues.find(l => l.id === leagueIdB);
                return (leagueA?.name || leagueIdA).localeCompare(leagueB?.name || leagueIdB);
              })
              .map(([leagueId, teamIds]) => {
              const league = leagues.find(l => l.id === leagueId);
              const leagueTeams = teams
                .filter(team => teamIds.includes(team.id))
                .sort((a, b) => a.name.localeCompare(b.name));
              
              return (
                <div key={leagueId} className="border border-limeGreenOpacity rounded-lg p-4 bg-darkPurple shadow">
                  <h4 className="text-lg font-semibold mb-3 text-lightPurple">
                    {league ? league.name : `League ${leagueId}`} 
                    <span className="text-sm font-normal text-lightPurple ml-2">
                      ({teamIds.length} teams)
                    </span>
                  </h4>
                  {leagueTeams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {leagueTeams.map((team) => (
                        <div key={team.id} className="flex items-center justify-between p-2 bg-darkPurple border border-limeGreenOpacity rounded">
                          <div>
                            <p className="text-sm font-medium text-notWhite">Name: <span className="text-lightPurple">{team.name}</span></p>
                            <p className="text-xs text-notWhite">Abbr: <span className="text-lightPurple">{team.abbreviation}</span> • Country: <span className="text-lightPurple">{team.country}</span></p>
                          </div>
                          {team.logoUrl && (
                            <img src={team.logoUrl} alt={team.name} className="w-6 h-6" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-lightPurple">No teams in this league</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
