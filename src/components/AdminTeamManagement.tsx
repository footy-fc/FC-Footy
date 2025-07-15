// @ts-ignore
import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

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

export default function AdminTeamManagement() {
  const [activeTab, setActiveTab] = useState("teams");
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [memberships, setMemberships] = useState<{[leagueId: string]: string[]}>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // Form states
  const [newTeam, setNewTeam] = useState({
    name: "",
    shortName: "",
    abbreviation: "",
    country: "",
    logoUrl: "",
    roomHash: ""
  });
  
  const [newLeague, setNewLeague] = useState({
    id: "",
    name: "",
    country: "",
    type: "domestic" as const,
    active: true
  });
  
  const [newMembership, setNewMembership] = useState({
    teamId: "",
    leagueId: "",
    season: "2024-25",
    startDate: new Date().toISOString().split('T')[0]
  });

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/teams', {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeagues = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/leagues', {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setLeagues(data.leagues || []);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberships = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/leagues', {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const leagues = data.leagues || [];
        const membershipsData: {[leagueId: string]: string[]} = {};
        
        // For each league, fetch its teams
        for (const league of leagues) {
          const teamsResponse = await fetch(`/api/leagues/${league.id}/teams`, {
            headers: {
              'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
            },
          });
          
          if (teamsResponse.ok) {
            const teamsData = await teamsResponse.json();
            membershipsData[league.id] = teamsData.teams || [];
          }
        }
        
        setMemberships(membershipsData);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
        body: JSON.stringify(newTeam),
      });
      
      if (response.ok) {
        setMessage('Team created successfully!');
        setNewTeam({ name: "", shortName: "", abbreviation: "", country: "", logoUrl: "", roomHash: "" });
        fetchTeams();
      } else {
        const error = await response.json();
        setMessage(`Error: ${error.error}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const createLeague = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/leagues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
        body: JSON.stringify(newLeague),
      });
      
      if (response.ok) {
        setMessage('League created successfully!');
        setNewLeague({ id: "", name: "", country: "", type: "domestic", active: true });
        fetchLeagues();
      } else {
        const error = await response.json();
        setMessage(`Error: ${error.error}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const addTeamToLeague = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
        body: JSON.stringify(newMembership),
      });
      
      if (response.ok) {
        setMessage('Team added to league successfully!');
        setNewMembership({ teamId: "", leagueId: "", season: "2024-25", startDate: new Date().toISOString().split('T')[0] });
        fetchTeams();
        fetchLeagues();
        fetchMemberships();
      } else {
        const error = await response.json();
        setMessage(`Error: ${error.error}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
      });
      
      if (response.ok) {
        setMessage('Team deleted successfully!');
        await fetchTeams();
      } else {
        const error = await response.json();
        setMessage(`Error: ${error.error}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteLeague = async (leagueId: string) => {
    if (!confirm('Are you sure you want to delete this league?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/leagues/${leagueId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
      });
      
      if (response.ok) {
        setMessage('League deleted successfully!');
        await fetchLeagues();
      } else {
        const error = await response.json();
        setMessage(`Error: ${error.error}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const getTeamLeagues = (teamId: string): League[] => {
    const teamLeagues: League[] = [];
    
    Object.entries(memberships).forEach(([leagueId, teamIds]) => {
      if (teamIds.includes(teamId)) {
        const league = leagues.find(l => l.id === leagueId);
        if (league) {
          teamLeagues.push(league);
        }
      }
    });
    
    return teamLeagues.sort((a, b) => a.name.localeCompare(b.name));
  };

  useEffect(() => {
    fetchTeams();
    fetchLeagues();
    fetchMemberships();
  }, []);

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: "teams", label: "Teams" },
              { id: "leagues", label: "Leagues" },
              { id: "memberships", label: "Memberships" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-deepPink text-deepPink"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 text-center p-3 rounded-lg transition-all duration-200 ${
            message.startsWith("Error")
              ? "bg-red-50 text-red-600"
              : "bg-green-50 text-green-600"
          }`}
        >
          {message}
        </div>
      )}

      {/* Teams Tab */}
      {activeTab === "teams" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Team Management</h2>
            <button
              onClick={fetchTeams}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          {/* Create Team Form */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Create New Team</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Team Name"
                value={newTeam.name}
                onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                className="p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Short Name"
                value={newTeam.shortName}
                onChange={(e) => setNewTeam({...newTeam, shortName: e.target.value})}
                className="p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Abbreviation (3 letters)"
                value={newTeam.abbreviation}
                onChange={(e) => setNewTeam({...newTeam, abbreviation: e.target.value})}
                className="p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Country Code (e.g., ENG)"
                value={newTeam.country}
                onChange={(e) => setNewTeam({...newTeam, country: e.target.value})}
                className="p-2 border rounded"
              />
              <input
                type="url"
                placeholder="Logo URL"
                value={newTeam.logoUrl}
                onChange={(e) => setNewTeam({...newTeam, logoUrl: e.target.value})}
                className="p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Room Hash (optional)"
                value={newTeam.roomHash}
                onChange={(e) => setNewTeam({...newTeam, roomHash: e.target.value})}
                className="p-2 border rounded"
              />
            </div>
            <button
              onClick={createTeam}
              className="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Team'}
            </button>
          </div>

          {/* Teams List */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Existing Teams ({teams.length})</h3>
            {loading ? (
              <div className="text-center py-8">Loading teams...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <div key={team.id} className="border rounded-lg p-4 bg-white shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{team.name}</h4>
                      <button
                        onClick={() => deleteTeam(team.id)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50"
                        disabled={loading}
                        title="Delete team"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">{team.shortName} ({team.abbreviation})</p>
                    <p className="text-sm text-gray-600">Country: {team.country}</p>
                    {team.logoUrl && (
                      <img src={team.logoUrl} alt={team.name} className="w-8 h-8 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leagues Tab */}
      {activeTab === "leagues" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">League Management</h2>
            <button
              onClick={fetchLeagues}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          {/* Create League Form */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Create New League</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="League ID (e.g., eng.1)"
                value={newLeague.id}
                onChange={(e) => setNewLeague({...newLeague, id: e.target.value})}
                className="p-2 border rounded"
              />
              <input
                type="text"
                placeholder="League Name"
                value={newLeague.name}
                onChange={(e) => setNewLeague({...newLeague, name: e.target.value})}
                className="p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Country Code"
                value={newLeague.country}
                onChange={(e) => setNewLeague({...newLeague, country: e.target.value})}
                className="p-2 border rounded"
              />
              <select
                value={newLeague.type}
                onChange={(e) => setNewLeague({...newLeague, type: e.target.value as any})}
                className="p-2 border rounded"
              >
                <option value="domestic">Domestic</option>
                <option value="continental">Continental</option>
                <option value="international">International</option>
              </select>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newLeague.active}
                  onChange={(e) => setNewLeague({...newLeague, active: e.target.checked})}
                  className="mr-2"
                />
                <label>Active</label>
              </div>
            </div>
            <button
              onClick={createLeague}
              className="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create League'}
            </button>
          </div>

          {/* Leagues List */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Existing Leagues ({leagues.length})</h3>
            {loading ? (
              <div className="text-center py-8">Loading leagues...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leagues.map((league) => (
                  <div key={league.id} className="border rounded-lg p-4 bg-white shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{league.name}</h4>
                      <button
                        onClick={() => deleteLeague(league.id)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50"
                        disabled={loading}
                        title="Delete league"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">ID: {league.id}</p>
                    <p className="text-sm text-gray-600">Country: {league.country}</p>
                    <p className="text-sm text-gray-600">Type: {league.type}</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded ${
                      league.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {league.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Memberships Tab */}
      {activeTab === "memberships" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Team-League Memberships</h2>
            <button
              onClick={fetchMemberships}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          {/* Add Membership Form */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Add Team to League</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <select
                value={newMembership.teamId}
                onChange={(e) => setNewMembership({...newMembership, teamId: e.target.value})}
                className="p-2 border rounded"
              >
                <option value="">Select Team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.abbreviation})
                  </option>
                ))}
              </select>
              <select
                value={newMembership.leagueId}
                onChange={(e) => setNewMembership({...newMembership, leagueId: e.target.value})}
                className="p-2 border rounded"
              >
                <option value="">Select League</option>
                {leagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Season (e.g., 2024-25)"
                value={newMembership.season}
                onChange={(e) => setNewMembership({...newMembership, season: e.target.value})}
                className="p-2 border rounded"
              />
              <input
                type="date"
                value={newMembership.startDate}
                onChange={(e) => setNewMembership({...newMembership, startDate: e.target.value})}
                className="p-2 border rounded"
              />
            </div>
            <button
              onClick={addTeamToLeague}
              className="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Team to League'}
            </button>
          </div>

          {/* Memberships Overview */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Current Memberships</h3>
            <div className="space-y-4">
              {leagues.map((league) => {
                const leagueTeamIds = memberships[league.id] || [];
                const leagueTeams = teams.filter(team => leagueTeamIds.includes(team.id));
                
                return (
                  <div key={league.id} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">
                      {league.name} ({leagueTeams.length} teams)
                    </h4>
                    {leagueTeams.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {leagueTeams.map((team) => (
                          <div key={team.id} className="text-sm bg-gray-100 p-2 rounded">
                            {team.name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No teams in this league</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 