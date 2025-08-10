import React, { useState, useEffect, useCallback } from 'react';
import { fetchFanUserData } from '../utils/fetchFCProfile';
import { getFansForTeamAbbr } from '../../lib/kvPerferences';

interface UserData {
  fid: number;
  username?: string;
  pfp?: string;
  loading?: boolean;
}

interface Team {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  country: string;
  logoUrl: string;
}

interface League {
  id: string;
  name: string;
  country: string;
  type: "domestic" | "continental" | "international";
  active: boolean;
}

interface NotificationsTabProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setResponseMessage: (message: string) => void;
}

export default function NotificationsTab({ 
  loading, 
  setLoading, 
  setResponseMessage 
}: NotificationsTabProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("matches");
  const [adminOnly, setAdminOnly] = useState(false);
  const [customTargetUrl, setCustomTargetUrl] = useState("");
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  
  // New state for user data
  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserTable, setShowUserTable] = useState(false);
  
  // New state for team filtering
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [memberships, setMemberships] = useState<{[leagueId: string]: string[]}>({});
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [notificationMode, setNotificationMode] = useState<'all' | 'team'>('all');

  const categories = [
    { value: "matches", label: "Matches" },
    // { value: "contests", label: "Contests" },
    { value: "rewards", label: "Rewards" },
    { value: "moneyGames", label: "ScoreSquare" },
    { value: "forYou", label: "For You" },
    { value: "scoutPlayers", label: "Scout Players" },
    { value: "extraTime", label: "Extra Time" },
    { value: "settings", label: "Settings" },
  ];

  // Fetch leagues and teams data
  const fetchLeaguesAndTeams = useCallback(async () => {
    setLoadingLeagues(true);
    setLoadingTeams(true);
    
    try {
      let leaguesData: { leagues?: League[] } | null = null;
      
      // Fetch leagues
      const leaguesResponse = await fetch('/api/leagues');
      if (leaguesResponse.ok) {
        leaguesData = await leaguesResponse.json();
        setLeagues(leaguesData?.leagues || []);
      }

      // Fetch teams
      const teamsResponse = await fetch('/api/teams');
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json();
        setTeams(teamsData.teams || []);
      }

      // Fetch memberships using the all endpoint
      const membershipsResponse = await fetch('/api/memberships/all', {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
      });
      
      if (membershipsResponse.ok) {
        const membershipsData = await membershipsResponse.json();
        setMemberships(membershipsData.memberships || {});
      } else {
        console.error('Failed to fetch memberships:', membershipsResponse.status);
      }
    } catch (error) {
      console.error('Error fetching leagues and teams:', error);
    } finally {
      setLoadingLeagues(false);
      setLoadingTeams(false);
    }
  }, []);

  // Get teams for selected league
  const getTeamsForLeague = (leagueId: string): Team[] => {
    if (!leagueId || !memberships[leagueId]) {
  
      return [];
    }
    
    const teamIds = memberships[leagueId];
    const leagueTeams = teams.filter(team => teamIds.includes(team.id));
    return leagueTeams;
  };

  // Get all teams (fallback when no league is selected)
  const getAllTeams = (): Team[] => {
    return teams.sort((a, b) => a.name.localeCompare(b.name));
  };

  // Function to fetch users who will receive notifications
  const fetchNotificationUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      let userFids: number[] = [];

      if (notificationMode === 'team' && selectedTeam) {
        // Get team followers
        const selectedTeamData = teams.find(t => t.id === selectedTeam);
        if (selectedTeamData) {
          // Get team follower FIDs using the team abbreviation
          userFids = await getFansForTeamAbbr(selectedTeamData.abbreviation);
        }
      } else {
        // Fetch all users or admin users
        const response = await fetch("/api/notification-users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
          },
          body: JSON.stringify({ adminOnly }),
        });

        if (response.ok) {
          const data = await response.json();
          userFids = data.userFids || [];
        }
      }
      
      // Initialize users with loading state
      const initialUsers: UserData[] = userFids.map((fid: number) => ({
        fid,
        loading: true
      }));
      setUsers(initialUsers);

      // Fetch user details in batches
      const batchSize = 10;
      for (let i = 0; i < userFids.length; i += batchSize) {
        const batch = userFids.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (fid: number) => {
          try {
            const userData = await fetchFanUserData(fid);
            return {
              fid,
              username: userData?.USER_DATA_TYPE_USERNAME?.[0] || `FID ${fid}`,
              pfp: userData?.USER_DATA_TYPE_PFP?.[0] || '/512.png',
              loading: false
            };
          } catch (error) {
            console.error(`Error fetching user data for FID ${fid}:`, error);
            return {
              fid,
              username: `FID ${fid}`,
              pfp: '/512.png',
              loading: false
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        setUsers(prevUsers => {
          const updatedUsers = [...prevUsers];
          batchResults.forEach((userData, index) => {
            const userIndex = i + index;
            if (userIndex < updatedUsers.length) {
              updatedUsers[userIndex] = userData;
            }
          });
          return updatedUsers;
        });

        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error fetching notification users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, [adminOnly, notificationMode, selectedTeam, teams]);

  // Fetch leagues and teams on component mount
  useEffect(() => {
    fetchLeaguesAndTeams();
  }, [fetchLeaguesAndTeams]);

  // Fetch users when relevant state changes
  useEffect(() => {
    if (showUserTable) {
      fetchNotificationUsers();
    }
  }, [showUserTable, fetchNotificationUsers]);

  // Reset team selection when league changes
  useEffect(() => {
    setSelectedTeam('');
  }, [selectedLeague]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponseMessage("");
    setLoading(true);
    
    const targetURL = useCustomUrl && customTargetUrl 
      ? customTargetUrl 
      : `${process.env.NEXT_PUBLIC_URL}?tab=${category}`;
    
    // Get selected team data early for use in success message
    const selectedTeamData = selectedTeam ? teams.find(t => t.id === selectedTeam) : null;
    
    try {
      let response;
      
      if (notificationMode === 'team' && selectedTeam) {
        // Send to team followers
        if (!selectedTeamData) {
          setResponseMessage('Error: Selected team not found');
          setLoading(false);
          return;
        }
        
        response = await fetch("/api/notify-team", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
          },
          body: JSON.stringify({ 
            title, 
            body,
            targetURL,
            teamAbbreviation: selectedTeamData.abbreviation
          }),
        });
      } else {
        // Send to all users or admins
        response = await fetch("/api/notify-all", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
          },
          body: JSON.stringify({ 
            title, 
            body,
            targetURL,
            adminOnly
          }),
        });
      }

      if (response.ok) {
        const data = await response.json();
        const targetText = notificationMode === 'team' && selectedTeam 
          ? `team followers (${selectedTeamData?.name})` 
          : adminOnly ? "admins only" : "all users";
        setResponseMessage(`Notification sent successfully to ${targetText}! (${data.totalSent} users)`);
        setTitle("");
        setBody("");
        setCategory("matches");
        setAdminOnly(false);
        setCustomTargetUrl("");
        setUseCustomUrl(false);
        setNotificationMode('all');
        setSelectedTeam('');
        setSelectedLeague('');
      } else {
        const errorData = await response.json();
        setResponseMessage(`Error: ${errorData.error || "Failed to send notification"}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResponseMessage(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-notWhite text-center mb-6">
        Send Notification
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-lightPurple mb-1">
            Notification Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full p-3 border border-limeGreenOpacity rounded-lg text-lightPurple bg-darkPurple focus:outline-none focus:ring-2 focus:ring-deepPink transition-all duration-200"
          />
        </div>
        <div>
          <label htmlFor="body" className="block text-sm font-medium text-lightPurple mb-1">
            Notification Body
          </label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={4}
            className="w-full p-3 border border-limeGreenOpacity rounded-lg text-lightPurple bg-darkPurple focus:outline-none focus:ring-2 focus:ring-deepPink transition-all duration-200"
          />
        </div>
        
        <div className="flex items-center space-x-3">
          <label htmlFor="useCustomUrl" className="text-sm font-medium text-lightPurple">
            Use Custom URL
          </label>
          <input
            id="useCustomUrl"
            type="checkbox"
            checked={useCustomUrl}
            onChange={(e) => setUseCustomUrl(e.target.checked)}
            className="h-5 w-5 text-deepPink focus:ring-deepPink border-limeGreenOpacity rounded bg-darkPurple"
          />
        </div>
        
        {useCustomUrl && (
          <div>
            <label htmlFor="customTargetUrl" className="block text-sm font-medium text-lightPurple mb-1">
              Custom Target URL
            </label>
            <input
              id="customTargetUrl"
              type="url"
              value={customTargetUrl}
              onChange={(e) => setCustomTargetUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full p-3 border border-limeGreenOpacity rounded-lg text-lightPurple bg-darkPurple focus:outline-none focus:ring-2 focus:ring-deepPink transition-all duration-200"
            />
          </div>
        )}
        
        {!useCustomUrl && (
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-lightPurple mb-1">
              Target Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 border border-limeGreenOpacity rounded-lg text-lightPurple bg-darkPurple focus:outline-none focus:ring-2 focus:ring-deepPink transition-all duration-200"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="flex items-center space-x-3">
          <label htmlFor="adminOnly" className="text-sm font-medium text-lightPurple">
            Send to Admins Only (FIDs: 4163, 420564)
          </label>
          <input
            id="adminOnly"
            type="checkbox"
            checked={adminOnly}
            onChange={(e) => setAdminOnly(e.target.checked)}
            className="h-5 w-5 text-deepPink focus:ring-deepPink border-limeGreenOpacity rounded bg-darkPurple"
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-deepPink text-white p-3 rounded-lg hover:bg-fontRed flex items-center justify-center transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? (
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            `Send to ${adminOnly ? "Admins" : notificationMode === 'team' ? selectedTeam ? `Team Followers` : "All Users" : "All Users"}`
          )}
        </button>
      </form>

      {/* User Table Section */}
      <div className="mt-8 p-6 bg-darkPurple rounded-lg border border-limeGreenOpacity">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-notWhite">
            Users Who Will Receive Notifications
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowUserTable(!showUserTable)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-deepPink focus:ring-offset-2 ${
                showUserTable ? 'bg-deepPink' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showUserTable ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {showUserTable && (
          <div>
            {/* Notification Mode Selection */}
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <label className="text-sm font-medium text-lightPurple">Notification Mode:</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setNotificationMode('all')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      notificationMode === 'all'
                        ? 'bg-deepPink text-white'
                        : 'bg-gray-600 text-lightPurple hover:bg-gray-500'
                    }`}
                  >
                    All Users
                  </button>
                  <button
                    onClick={() => setNotificationMode('team')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      notificationMode === 'team'
                        ? 'bg-deepPink text-white'
                        : 'bg-gray-600 text-lightPurple hover:bg-gray-500'
                    }`}
                  >
                    Team Followers
                  </button>
                </div>
              </div>

              {/* Team Selection (only show when team mode is selected) */}
              {notificationMode === 'team' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-lightPurple mb-1">
                      Select League
                    </label>
                    <select
                      value={selectedLeague}
                      onChange={(e) => setSelectedLeague(e.target.value)}
                      className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
                      disabled={loadingLeagues}
                    >
                      <option value="">Choose a league...</option>
                      {leagues
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((league) => (
                        <option key={league.id} value={league.id}>
                          {league.name} ({league.country})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-lightPurple mb-1">
                      Select Team
                    </label>
                    <select
                      value={selectedTeam}
                      onChange={(e) => setSelectedTeam(e.target.value)}
                      className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
                      disabled={loadingTeams}
                    >
                      <option value="">Choose a team...</option>
                      {(() => {
                        const availableTeams = selectedLeague 
                          ? getTeamsForLeague(selectedLeague)
                          : getAllTeams();
                        
                        return availableTeams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name} ({team.abbreviation})
                          </option>
                        ));
                      })()}
                    </select>
                    {selectedLeague && (
                      <p className="text-xs text-gray-400 mt-1">
                        {getTeamsForLeague(selectedLeague).length} teams in {leagues.find(l => l.id === selectedLeague)?.name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {loadingUsers ? (
              <div className="text-center py-8 text-lightPurple">
                <div className="animate-spin h-8 w-8 border-4 border-deepPink border-t-transparent rounded-full mx-auto mb-4"></div>
                Loading users...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full bg-darkPurple">
                  <thead>
                    <tr className="border-b border-limeGreenOpacity">
                      <th className="text-left py-3 px-4 text-lightPurple font-medium">Avatar</th>
                      <th className="text-left py-3 px-4 text-lightPurple font-medium">Username</th>
                      <th className="text-left py-3 px-4 text-lightPurple font-medium">FID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.fid} className="border-b border-limeGreenOpacity hover:bg-limeGreenOpacity/10">
                        <td className="py-3 px-4">
                          {user.loading ? (
                            <div className="animate-pulse bg-gray-600 rounded-full w-8 h-8"></div>
                          ) : (
                            <img
                              src={user.pfp || '/512.png'}
                              alt={user.username || `FID ${user.fid}`}
                              className="w-8 h-8 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/512.png';
                              }}
                            />
                          )}
                        </td>
                        <td className="py-3 px-4 text-lightPurple">
                          {user.loading ? (
                            <div className="animate-pulse bg-gray-600 h-4 w-24 rounded"></div>
                          ) : (
                            <span className="font-medium">@{user.username}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-lightPurple">
                          {user.loading ? (
                            <div className="animate-pulse bg-gray-600 h-4 w-16 rounded"></div>
                          ) : (
                            <span className="text-sm text-gray-400">{user.fid}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 text-sm text-lightPurple text-center">
                  Total users: {users.length}
                  {notificationMode === 'team' && selectedTeam && (
                    <span className="ml-2 text-deepPink">
                      (Team followers)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 