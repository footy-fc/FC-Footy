import React, { useState, useEffect } from 'react';
import { Trash2, Edit, Plus, X } from 'lucide-react';

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
  metadata?: { [key: string]: string };
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

interface TeamsTabProps {
  teams: Team[];
  leagues: League[];
  memberships: {[leagueId: string]: string[]};
  loadingTeams: boolean;
  loadingTeamCreation: boolean;
  createTeam: () => void;
  deleteTeam: (teamId: string) => void;
  addTeamToLeague: (teamId: string, leagueId: string) => Promise<boolean>;
  newTeam: {
    name: string;
    shortName: string;
    abbreviation: string;
    country: string;
    logoUrl: string;
    roomHash: string;
  };
  setNewTeam: (team: any) => void;
  responseMessage: string;
  setResponseMessage: (message: string) => void;
  updateTeam?: (teamId: string, updates: any) => Promise<boolean>;
  refreshAllData?: () => void;
}

export default function TeamsTab({
  teams,
  leagues,
  memberships,
  loadingTeams,
  loadingTeamCreation,
  createTeam,
  deleteTeam,
  addTeamToLeague,
  newTeam,
  setNewTeam,
  responseMessage,
  setResponseMessage,
  updateTeam,
  refreshAllData
}: TeamsTabProps) {
  // Pagination and search state
  const [currentPage, setCurrentPage] = useState(1);
  const [teamsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    shortName: '',
    abbreviation: '',
    country: '',
    logoUrl: '',
    roomHash: '',
    metadata: {} as { [key: string]: string }
  });
  const [newMetadataKey, setNewMetadataKey] = useState('');
  const [newMetadataValue, setNewMetadataValue] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // League assignment state
  const [showLeagueAssignment, setShowLeagueAssignment] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [isAssigningTeams, setIsAssigningTeams] = useState(false);

  // Function to get leagues for a specific team - MOVED HERE BEFORE USE
  const getTeamLeagues = (teamId: string): League[] => {
    const teamLeagues: League[] = [];
    
    // Check which leagues this team belongs to
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

  // Debug logging
  console.log('TeamsTab render:', {
    teamsLength: teams.length,
    loadingTeams,
    searchTerm,
    teams: teams.slice(0, 3) // Show first 3 teams
  });

  // Computed values for teams
  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.abbreviation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort teams by country, then by name
  const sortedTeams = [...filteredTeams].sort((a, b) => {
    // First sort by country
    const countryComparison = a.country.localeCompare(b.country);
    if (countryComparison !== 0) {
      return countryComparison;
    }
    // Then sort by team name within the same country
    return a.name.localeCompare(b.name);
  });

  // Filter to only show one team per unique (name, abbreviation) pair
  // Prefer teams with leagues assigned
  const uniqueTeamsMap = new Map();
  sortedTeams.forEach(team => {
    const key = `${team.name.toLowerCase()}_${team.abbreviation.toLowerCase()}`;
    const existingTeam = uniqueTeamsMap.get(key);
    
    if (!existingTeam) {
      // No existing team, add this one
      uniqueTeamsMap.set(key, team);
    } else {
      // Check if current team has leagues and existing doesn't
      const currentTeamLeagues = getTeamLeagues(team.id);
      const existingTeamLeagues = getTeamLeagues(existingTeam.id);
      
      if (currentTeamLeagues.length > 0 && existingTeamLeagues.length === 0) {
        // Current team has leagues, existing doesn't - replace
        uniqueTeamsMap.set(key, team);
      }
      // Otherwise keep the existing team
    }
  });
  
  const uniqueTeams = Array.from(uniqueTeamsMap.values());

  // Debug logging for filtered teams
  console.log('Filtered teams:', {
    searchTerm,
    filteredLength: filteredTeams.length,
    uniqueLength: uniqueTeams.length,
    filteredTeams: filteredTeams.slice(0, 3) // Show first 3 filtered teams
  });

  const totalPages = Math.ceil(uniqueTeams.length / teamsPerPage);
  const startIndex = (currentPage - 1) * teamsPerPage;
  const endIndex = startIndex + teamsPerPage;
  const currentTeams = uniqueTeams.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // League assignment handlers
  const handleTeamSelection = (teamId: string) => {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleSelectAllTeams = () => {
    if (selectedTeams.length === currentTeams.length) {
      setSelectedTeams([]);
    } else {
      setSelectedTeams(currentTeams.map(team => team.id));
    }
  };

  const handleAssignTeamsToLeague = async () => {
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
        setSelectedTeams([]);
        setSelectedLeague('');
        setShowLeagueAssignment(false);
        
        // Refresh data to update league assignments
        setTimeout(() => {
          refreshAllData?.();
        }, 500);
      } else if (successful === 0) {
        setResponseMessage(`Failed to assign any teams to league`);
      } else {
        setResponseMessage(`Successfully assigned ${successful} team(s) to league. ${failed} team(s) failed.`);
        
        // Refresh data even if some assignments failed
        setTimeout(() => {
          refreshAllData?.();
        }, 500);
      }
    } catch (error) {
      setResponseMessage('Error assigning teams to league');
    } finally {
      setIsAssigningTeams(false);
    }
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setEditForm({
      name: team.name,
      shortName: team.shortName,
      abbreviation: team.abbreviation,
      country: team.country,
      logoUrl: team.logoUrl || '',
      roomHash: team.roomHash || '',
      metadata: { ...team.metadata }
    });
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam || !updateTeam) return;

    // Validate required fields
    if (!editForm.name || !editForm.shortName || !editForm.abbreviation || !editForm.country) {
      setResponseMessage('Error: Please fill in all required fields (Name, Short Name, Abbreviation, Country)');
      return;
    }

    setIsUpdating(true);
    setResponseMessage('Updating team...');

    try {
      const success = await updateTeam(editingTeam.id, {
        name: editForm.name,
        shortName: editForm.shortName,
        abbreviation: editForm.abbreviation.toLowerCase(),
        country: editForm.country,
        logoUrl: editForm.logoUrl,
        roomHash: editForm.roomHash,
        metadata: editForm.metadata
      });

      if (success) {
        setResponseMessage(`Team "${editForm.name}" updated successfully!`);
        setEditingTeam(null);
        setEditForm({
          name: '',
          shortName: '',
          abbreviation: '',
          country: '',
          logoUrl: '',
          roomHash: '',
          metadata: {}
        });
        if (refreshAllData) {
          refreshAllData();
        }
      } else {
        setResponseMessage('Error updating team');
      }
    } catch (error: any) {
      setResponseMessage(`Error updating team: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const addMetadata = () => {
    if (newMetadataKey.trim() && newMetadataValue.trim()) {
      setEditForm(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          [newMetadataKey.trim()]: newMetadataValue.trim()
        }
      }));
      setNewMetadataKey('');
      setNewMetadataValue('');
    }
  };

  const removeMetadata = (key: string) => {
    setEditForm(prev => {
      const newMetadata = { ...prev.metadata };
      delete newMetadata[key];
      return {
        ...prev,
        metadata: newMetadata
      };
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-notWhite">Team Management</h2>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search teams by name, abbreviation, or country..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-limeGreenOpacity rounded-lg text-lightPurple bg-darkPurple focus:outline-none focus:ring-2 focus:ring-deepPink transition-all duration-200"
        />
      </div>

      {/* Create Team Form - Collapsible */}
      <div className="mb-8 p-6 bg-darkPurple rounded-lg border border-limeGreenOpacity">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-notWhite">Create New Team</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-lightPurple">Show form</span>
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
                placeholder="Team Name"
                value={newTeam.name}
                onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                className="p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
              />
              <input
                type="text"
                placeholder="Short Name"
                value={newTeam.shortName}
                onChange={(e) => setNewTeam({...newTeam, shortName: e.target.value})}
                className="p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
              />
              <input
                type="text"
                placeholder="Abbreviation (3 letters)"
                value={newTeam.abbreviation}
                onChange={(e) => setNewTeam({...newTeam, abbreviation: e.target.value})}
                className="p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
              />
              <input
                type="text"
                placeholder="Country Code (e.g., ENG)"
                value={newTeam.country}
                onChange={(e) => setNewTeam({...newTeam, country: e.target.value})}
                className="p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
              />
              <input
                type="url"
                placeholder="Logo URL"
                value={newTeam.logoUrl}
                onChange={(e) => setNewTeam({...newTeam, logoUrl: e.target.value})}
                className="p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
              />
              <input
                type="text"
                placeholder="Room Hash (optional)"
                value={newTeam.roomHash}
                onChange={(e) => setNewTeam({...newTeam, roomHash: e.target.value})}
                className="p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
              />
            </div>
            <button
              onClick={createTeam}
              disabled={loadingTeamCreation}
              className={`mt-4 px-6 py-2 rounded-lg transition-colors ${
                loadingTeamCreation 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-deepPink text-white hover:bg-fontRed'
              }`}
            >
              {loadingTeamCreation ? 'Creating...' : 'Create Team'}
            </button>
          </>
        )}
      </div>

      {/* League Assignment Section */}
      <div className="mb-8 p-6 bg-darkPurple rounded-lg border border-limeGreenOpacity">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-notWhite">Assign Teams to Leagues</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-lightPurple">Show assignment</span>
            <button
              onClick={() => setShowLeagueAssignment(!showLeagueAssignment)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-deepPink focus:ring-offset-2 ${
                showLeagueAssignment ? 'bg-deepPink' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showLeagueAssignment ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {showLeagueAssignment && (
          <div className="space-y-4">
            {/* League Selection */}
            <div>
              <label className="block text-sm font-medium text-lightPurple mb-2">
                Select League
              </label>
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
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

            {/* Team Selection Info */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-lightPurple">
                {selectedTeams.length} team(s) selected
              </span>
              <button
                onClick={handleSelectAllTeams}
                className="text-sm text-deepPink hover:text-fontRed transition-colors"
              >
                {selectedTeams.length === currentTeams.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Assign Button */}
            {selectedLeague && selectedTeams.length > 0 && (
              <button
                onClick={handleAssignTeamsToLeague}
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

      {/* Teams List */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-notWhite">
          Existing Teams ({uniqueTeams.length} of {teams.length})
        </h3>
        {loadingTeams ? (
          <div className="text-center py-8 text-lightPurple">Loading teams...</div>
        ) : (
          <>
            {/* Group teams by country */}
            {(() => {
              const teamsByCountry: { [country: string]: typeof sortedTeams } = {};
              
              // Group current page teams by country
              currentTeams.forEach(team => {
                if (!teamsByCountry[team.country]) {
                  teamsByCountry[team.country] = [];
                }
                teamsByCountry[team.country].push(team);
              });
              
              return Object.entries(teamsByCountry)
                .sort(([countryA], [countryB]) => countryA.localeCompare(countryB))
                .map(([country, countryTeams]) => (
                <div key={country} className="mb-6">
                  <h4 className="text-md font-semibold mb-3 text-deepPink border-b border-limeGreenOpacity pb-1">
                    {country} ({countryTeams.length} teams)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {countryTeams
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((team) => (
                      <div key={team.id} className="border border-limeGreenOpacity rounded-lg p-3 bg-darkPurple shadow w-full min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedTeams.includes(team.id)}
                              onChange={() => handleTeamSelection(team.id)}
                              className={`h-4 w-4 text-deepPink focus:ring-deepPink border-limeGreenOpacity rounded bg-darkPurple transition-opacity flex-shrink-0 ${
                                showLeagueAssignment ? 'opacity-100' : 'opacity-0 pointer-events-none'
                              }`}
                            />
                            <h4 className="font-semibold text-notWhite text-md truncate min-w-0">{team.name}</h4>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <button
                              onClick={() => handleEditTeam(team)}
                              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                              title="Edit team"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteTeam(team.id)}
                              className="text-fontRed hover:text-deepPink text-xs transition-colors ml-2 flex-shrink-0"
                              title="Delete team"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-notWhite mb-1">Short Name: <span className="text-lightPurple">{team.shortName}</span> (<span className="text-lightPurple">{team.abbreviation}</span>)</p>
                        <p className="text-xs text-notWhite mb-2">Country: <span className="text-lightPurple">{team.country}</span></p>
                        
                        {/* League Pills */}
                        {(() => {
                          const teamLeagues = getTeamLeagues(team.id);
                          if (teamLeagues.length > 0) {
                            return (
                              <div className="mb-2">
                                <p className="text-xs text-notWhite mb-1">Leagues:</p>
                                <div className="flex flex-wrap gap-1">
                                  {teamLeagues.map((league) => (
                                    <span
                                      key={league.id}
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        league.type === 'domestic' 
                                          ? 'bg-blue-900 text-blue-200' 
                                          : league.type === 'continental'
                                          ? 'bg-green-900 text-green-200'
                                          : 'bg-purple-900 text-purple-200'
                                      }`}
                                    >
                                      {league.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="mb-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                                No leagues
                              </span>
                            </div>
                          );
                        })()}
                        
                        {team.logoUrl && (
                          <img src={team.logoUrl} alt={team.name} className="w-6 h-6 mt-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple disabled:opacity-50 disabled:cursor-not-allowed hover:bg-limeGreenOpacity transition-colors"
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-1 border rounded transition-colors ${
                      currentPage === page
                        ? "border-deepPink bg-deepPink text-white"
                        : "border-limeGreenOpacity bg-darkPurple text-lightPurple hover:bg-limeGreenOpacity"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple disabled:opacity-50 disabled:cursor-not-allowed hover:bg-limeGreenOpacity transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-darkPurple rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-limeGreenOpacity">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-lightPurple">Edit Team: {editingTeam.name}</h3>
              <button
                onClick={() => setEditingTeam(null)}
                className="text-lightPurple hover:text-deepPink transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Basic Team Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-notWhite mb-1">Team Name *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-notWhite mb-1">Short Name *</label>
                  <input
                    type="text"
                    value={editForm.shortName}
                    onChange={(e) => setEditForm({...editForm, shortName: e.target.value})}
                    className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-notWhite mb-1">Abbreviation *</label>
                  <input
                    type="text"
                    value={editForm.abbreviation}
                    onChange={(e) => setEditForm({...editForm, abbreviation: e.target.value})}
                    className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-notWhite mb-1">Country *</label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm({...editForm, country: e.target.value})}
                    className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-notWhite mb-1">Logo URL</label>
                  <input
                    type="text"
                    value={editForm.logoUrl}
                    onChange={(e) => setEditForm({...editForm, logoUrl: e.target.value})}
                    className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-notWhite mb-1">Room Hash</label>
                  <input
                    type="text"
                    value={editForm.roomHash}
                    onChange={(e) => setEditForm({...editForm, roomHash: e.target.value})}
                    className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
                  />
                </div>
              </div>

              {/* Metadata Section */}
              <div className="border-t border-limeGreenOpacity pt-4">
                <h4 className="text-md font-semibold text-notWhite mb-3">Custom Metadata</h4>
                
                {/* Add New Metadata */}
                <div className="flex space-x-2 mb-4">
                  <input
                    type="text"
                    placeholder="Key"
                    value={newMetadataKey}
                    onChange={(e) => setNewMetadataKey(e.target.value)}
                    className="flex-1 p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={newMetadataValue}
                    onChange={(e) => setNewMetadataValue(e.target.value)}
                    className="flex-1 p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
                  />
                  <button
                    onClick={addMetadata}
                    disabled={!newMetadataKey.trim() || !newMetadataValue.trim()}
                    className={`px-3 py-2 rounded transition-colors ${
                      !newMetadataKey.trim() || !newMetadataValue.trim()
                        ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Existing Metadata */}
                {Object.keys(editForm.metadata).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(editForm.metadata).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-darkPurple border border-limeGreenOpacity rounded">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-notWhite">{key}:</span>
                          <span className="text-sm text-lightPurple ml-2">{value}</span>
                        </div>
                        <button
                          onClick={() => removeMetadata(key)}
                          className="text-fontRed hover:text-deepPink transition-colors ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-notWhite italic">No custom metadata added yet.</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-limeGreenOpacity">
                <button
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 border border-limeGreenOpacity text-lightPurple rounded hover:bg-limeGreenOpacity transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTeam}
                  disabled={isUpdating}
                  className={`px-4 py-2 rounded transition-colors ${
                    isUpdating
                      ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                      : 'bg-deepPink text-white hover:bg-fontRed'
                  }`}
                >
                  {isUpdating ? 'Updating...' : 'Update Team'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
