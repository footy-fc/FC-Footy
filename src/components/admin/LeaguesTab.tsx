// @ts-ignore
import React, { useState } from 'react';
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

interface LeaguesTabProps {
  leagues: League[];
  teams: Team[];
  memberships: {[leagueId: string]: string[]};
  loadingLeagues: boolean;
  createLeague: () => void;
  deleteLeague: (leagueId: string) => void;
  addTeamToLeague: (teamId: string, leagueId: string) => void;
  removeTeamFromLeague: (teamId: string, leagueId: string) => void;
  newLeague: {
    id: string;
    name: string;
    country: string;
    type: "domestic" | "continental" | "international";
    active: boolean;
  };
  setNewLeague: React.Dispatch<React.SetStateAction<{
    id: string;
    name: string;
    country: string;
    type: "domestic" | "continental" | "international";
    active: boolean;
  }>>;
  responseMessage: string;
  setResponseMessage: (message: string) => void;
  refreshAllData?: () => void;
}

export default function LeaguesTab({
  leagues,
  teams,
  memberships,
  loadingLeagues,
  createLeague,
  deleteLeague,
  addTeamToLeague,
  removeTeamFromLeague,
  newLeague,
  setNewLeague,
  setResponseMessage,
  refreshAllData
}: LeaguesTabProps) {
  // Team assignment state
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [showTeamAssignment, setShowTeamAssignment] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedLeagues, setExpandedLeagues] = useState<Set<string>>(new Set());
  const [isAssigningTeams, setIsAssigningTeams] = useState(false);
  const [removingTeams, setRemovingTeams] = useState<Set<string>>(new Set());

  // Toggle league expansion
  const toggleLeagueExpansion = (leagueId: string) => {
    setExpandedLeagues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leagueId)) {
        newSet.delete(leagueId);
      } else {
        newSet.add(leagueId);
      }
      return newSet;
    });
  };

  // Filter teams based on search term - only show teams NOT already in the selected league
  const filteredTeams = teams.filter(team => {
    const isInSelectedLeague = selectedLeague ? memberships[selectedLeague]?.includes(team.id) : false;
    const matchesSearch = team.name.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
                         team.shortName.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
                         team.abbreviation.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
                         team.country.toLowerCase().includes(teamSearchTerm.toLowerCase());
    
    return !isInSelectedLeague && matchesSearch;
  });

  const handleTeamSelection = (teamId: string) => {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleAssignTeams = async () => {
    if (!selectedLeague || selectedTeams.length === 0) {
      setResponseMessage('Please select a league and at least one team');
      return;
    }

    setIsAssigningTeams(true);
    setResponseMessage(`Assigning ${selectedTeams.length} team(s) to league...`);

    try {
      const results = await Promise.allSettled(
        selectedTeams.map(teamId => addTeamToLeague(teamId, selectedLeague))
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      if (failed === 0) {
        setResponseMessage(`Successfully assigned ${successful} team(s) to league`);
      } else if (successful === 0) {
        setResponseMessage(`Failed to assign any teams to league`);
      } else {
        setResponseMessage(`Successfully assigned ${successful} team(s) to league. ${failed} team(s) failed.`);
      }

      // Always refresh data if any assignments were successful
      if (successful > 0) {
        // Add a small delay to ensure database updates are complete
        setTimeout(() => {
          refreshAllData?.();
        }, 500);
      }

      // Reset form only if all assignments were successful
      if (failed === 0) {
        setSelectedTeams([]);
        setSelectedLeague('');
        setTeamSearchTerm('');
        setShowTeamAssignment(false);
      }
    } catch (error) {
      setResponseMessage('Error assigning teams to league');
      console.error('Error assigning teams to league', error);
    } finally {
      setIsAssigningTeams(false);
    }
  };

  const handleRemoveTeamFromLeague = async (teamId: string, leagueId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to remove ${teamName} from this league?`)) return;

    setRemovingTeams(prev => new Set(prev).add(teamId));
    setResponseMessage(`Removing ${teamName} from league...`);

    try {
      await removeTeamFromLeague(teamId, leagueId);
      setResponseMessage(`Successfully removed ${teamName} from league`);
      
      // Refresh data to update counts
      setTimeout(() => {
        refreshAllData?.();
      }, 500);
    } catch (error) {
      setResponseMessage(`Error removing ${teamName} from league`);
      console.error('Error removing team from league', error);
    } finally {
      setRemovingTeams(prev => {
        const newSet = new Set(prev);
        newSet.delete(teamId);
        return newSet;
      });
    }
  };

  const handleCreateLeague = async () => {
    try {
      createLeague();
    } catch {
      console.error('Error creating league');
      setResponseMessage('Error creating league');
    }
  };

  const handleDeleteLeague = async (leagueId: string) => {
    try {
      deleteLeague(leagueId);
    } catch {
      console.error('Error deleting league');
      setResponseMessage('Error deleting league');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-notWhite">League Management</h2>
      </div>

      {/* Create League Form */}
      <div className="mb-8 p-6 bg-darkPurple rounded-lg border border-limeGreenOpacity">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-notWhite">Create New League</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-deepPink focus:ring-offset-2 ${
                showCreateForm ? 'bg-deepPink' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showCreateForm ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {showCreateForm && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="League ID"
                value={newLeague.id}
                onChange={(e) => setNewLeague({...newLeague, id: e.target.value})}
                className="p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
              />
              <input
                type="text"
                placeholder="League Name"
                value={newLeague.name}
                onChange={(e) => setNewLeague({...newLeague, name: e.target.value})}
                className="p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
              />
              <input
                type="text"
                placeholder="Country Code (e.g., ENG)"
                value={newLeague.country}
                onChange={(e) => setNewLeague({...newLeague, country: e.target.value})}
                className="p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
              />
              <select
                value={newLeague.type}
                onChange={(e) => setNewLeague({...newLeague, type: e.target.value as "domestic" | "continental" | "international"})}
                className="p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
              >
                <option value="domestic">Domestic</option>
                <option value="continental">Continental</option>
                <option value="international">International</option>
              </select>
              <div className="flex items-center space-x-3">
                <label htmlFor="active" className="text-sm font-medium text-notWhite">
                  Active
                </label>
                <input
                  id="active"
                  type="checkbox"
                  checked={newLeague.active}
                  onChange={(e) => setNewLeague({...newLeague, active: e.target.checked})}
                  className="h-5 w-5 text-deepPink focus:ring-deepPink border-limeGreenOpacity rounded bg-darkPurple"
                />
              </div>
            </div>
            <button
              onClick={handleCreateLeague}
              className="mt-4 bg-deepPink text-white px-6 py-2 rounded-lg hover:bg-fontRed transition-colors"
            >
              Create League
            </button>
          </>
        )}
      </div>

      {/* Team Assignment Section */}
      <div className="mb-8 p-6 bg-darkPurple rounded-lg border border-limeGreenOpacity">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-notWhite">Assign Teams to Leagues</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTeamAssignment(!showTeamAssignment)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-deepPink focus:ring-offset-2 ${
                showTeamAssignment ? 'bg-deepPink' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showTeamAssignment ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {showTeamAssignment && (
          <div className="space-y-4">
            {/* League Selection */}
            <div>
              <label className="block text-sm font-medium text-notWhite mb-2">
                Select League
              </label>
              <select
                value={selectedLeague}
                onChange={(e) => {
                  setSelectedLeague(e.target.value);
                  setSelectedTeams([]); // Clear selected teams when league changes
                  setTeamSearchTerm(''); // Clear search when league changes
                }}
                className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
              >
                <option value="">Choose a league...</option>
                {leagues
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name} ({league.country}) - {memberships[league.id]?.length || 0} teams
                  </option>
                ))}
              </select>
            </div>

            {/* Team Search */}
            <div>
              <label className="block text-sm font-medium text-notWhite mb-2">
                Search Teams (not already in selected league)
              </label>
              <input
                type="text"
                placeholder="Search teams by name, abbreviation, or country..."
                value={teamSearchTerm}
                onChange={(e) => setTeamSearchTerm(e.target.value)}
                className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
              />
            </div>

            {/* Team Selection */}
            {selectedLeague && (
              <div>
                <label className="block text-sm font-medium text-notWhite mb-2">
                  Select Teams ({selectedTeams.length} selected)
                </label>
                <div className="max-h-60 overflow-y-auto border border-limeGreenOpacity rounded bg-darkPurple p-2">
                  {filteredTeams.length === 0 ? (
                    <p className="text-lightPurple text-sm">
                      {teamSearchTerm ? 'No teams found matching your search' : 'All teams are already assigned to this league'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filteredTeams
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((team) => (
                        <label key={team.id} className="flex items-center space-x-2 cursor-pointer hover:bg-limeGreenOpacity p-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedTeams.includes(team.id)}
                            onChange={() => handleTeamSelection(team.id)}
                            className="h-4 w-4 text-deepPink focus:ring-deepPink border-limeGreenOpacity rounded bg-darkPurple"
                          />
                          <span className="text-lightPurple text-sm">
                            {team.name} ({team.abbreviation}) - {team.country}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Assign Button */}
            {selectedLeague && selectedTeams.length > 0 && (
              <button
                onClick={handleAssignTeams}
                disabled={isAssigningTeams}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  isAssigningTeams 
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isAssigningTeams 
                  ? `Assigning ${selectedTeams.length} Team(s)...` 
                  : `Assign ${selectedTeams.length} Team(s) to League`
                }
              </button>
            )}
          </div>
        )}
      </div>

      {/* Leagues List */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-notWhite">Existing Leagues ({leagues.length})</h3>
        {loadingLeagues ? (
          <div className="text-center py-8 text-lightPurple">Loading leagues...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leagues
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((league) => {
                const leagueTeamIds = memberships?.[league.id] || [];
                const leagueTeams = teams
                  .filter(team => leagueTeamIds.includes(team.id))
                  .sort((a, b) => a.name.localeCompare(b.name));
                const isExpanded = expandedLeagues.has(league.id);
                
                return (
                  <div key={league.id} className="border border-limeGreenOpacity rounded-lg p-4 bg-darkPurple shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-fontRed">{league.name}</h4>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleLeagueExpansion(league.id)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-deepPink focus:ring-offset-1 ${
                            isExpanded ? 'bg-deepPink' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              isExpanded ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleDeleteLeague(league.id)}
                          className="text-fontRed hover:text-deepPink text-sm transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-notWhite">ID: <span className="text-lightPurple">{league.id}</span></p>
                    <p className="text-sm text-notWhite">Country: <span className="text-lightPurple">{league.country}</span></p>
                    <p className="text-sm text-notWhite">Type: <span className="text-lightPurple">{league.type}</span></p>
                    <p className="text-sm text-notWhite">
                      Status: <span className={league.active ? "text-green-400" : "text-red-400"}>
                        {league.active ? "Active" : "Inactive"}
                      </span>
                    </p>
                    <p className="text-sm text-notWhite mb-2">
                      Teams: <span className="text-lightPurple">{leagueTeamIds.length}</span>
                    </p>
                    
                    {/* Teams List - Collapsible */}
                    {isExpanded && leagueTeams.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-limeGreenOpacity">
                        <h5 className="text-sm font-medium text-lightPurple mb-2">Teams in this league:</h5>
                        <div className="space-y-1">
                          {leagueTeams.map((team) => {
                            const isRemoving = removingTeams.has(team.id);
                            return (
                              <div key={team.id} className="flex items-center justify-between p-2 bg-darkPurple border border-limeGreenOpacity rounded text-xs">
                                <div className="flex items-center space-x-2">
                                  {team.logoUrl && (
                                    <img src={team.logoUrl} alt={team.name} className="w-4 h-4" />
                                  )}
                                  <div>
                                    <span className="text-lightPurple font-medium">{team.name}</span>
                                    <span className="text-lightPurple ml-1">({team.abbreviation})</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveTeamFromLeague(team.id, league.id, team.name)}
                                  disabled={isRemoving}
                                  className={`text-fontRed hover:text-deepPink text-xs transition-colors px-2 py-1 rounded border border-fontRed hover:border-deepPink ${
                                    isRemoving ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                  title="Remove team from league"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {isExpanded && leagueTeams.length === 0 && (
                      <div className="mt-3 pt-3 border-t border-limeGreenOpacity">
                        <p className="text-sm text-lightPurple">No teams assigned to this league</p>
                      </div>
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
