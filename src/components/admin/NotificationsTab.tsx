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

interface FantasyManager {
  entry_id: number;
  fid: number;
  team_name: string;
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
  const [notificationMode, setNotificationMode] = useState<'all' | 'team' | 'fepl' | 'nonFepl' | 'custom'>('all');
  // Quick audience size estimator (does not require preview table)
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [audienceLoading, setAudienceLoading] = useState<boolean>(false);
  const [allUsersTotal, setAllUsersTotal] = useState<number | null>(null);
  const [feplTotal, setFeplTotal] = useState<number | null>(null);
  const [showCountDetails, setShowCountDetails] = useState<boolean>(false);
  // Audience builder: custom lists
  const [customFidsText, setCustomFidsText] = useState<string>("");
  const [savedLists, setSavedLists] = useState<Record<string, number[]>>({});
  const [selectedSavedList, setSelectedSavedList] = useState<string>("");
  const [newListName, setNewListName] = useState<string>("");

  const categories = [
    { value: "matches", label: "Matches" },
    { value: "contests", label: "Fantasy" },
    { value: "rewards", label: "Rewards" },
    { value: "moneyGames", label: "ScoreSquare" },
    { value: "forYou", label: "For You" },
    { value: "scoutPlayers", label: "Scout Players" },
    { value: "extraTime", label: "Extra Time" },
    { value: "settings", label: "Settings" },
  ];

  // Function to get FEPL manager FIDs
  const getFEPLManagerFIDs = async (): Promise<number[]> => {
    try {
      const fantasyManagersLookup = await import('../../data/fantasy-managers-lookup.json');
      const managers = Array.isArray(fantasyManagersLookup.default) 
        ? fantasyManagersLookup.default 
        : fantasyManagersLookup;
      
      return (managers as FantasyManager[])
        .filter(manager => manager.fid)
        .map(manager => manager.fid);
    } catch (error) {
      console.error('Error loading FEPL managers:', error);
      return [];
    }
  };

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

  // Helper function to get button text
  const getButtonText = (): string => {
    if (adminOnly) return "Admins";
    if (notificationMode === 'team' && selectedTeam) return "Team Followers";
    if (notificationMode === 'fepl') return "FC FEPL Managers";
    if (notificationMode === 'nonFepl') return "Non-FEPL Users";
    if (notificationMode === 'custom') return "Custom List";
    return "All Users";
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
      } else if (notificationMode === 'fepl') {
        // Get FEPL manager FIDs
        userFids = await getFEPLManagerFIDs();
      } else if (notificationMode === 'nonFepl') {
        // All app users excluding FEPL managers
        const response = await fetch("/api/notification-users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
          },
          body: JSON.stringify({ adminOnly: false }),
        });
        if (response.ok) {
          const data = await response.json();
          const allFids: number[] = data.userFids || [];
          const fepl = new Set(await getFEPLManagerFIDs());
          userFids = allFids.filter((fid: number) => !fepl.has(fid));
        }
      } else if (notificationMode === 'custom') {
        // Build from saved list or textarea
        const fromSaved = selectedSavedList && savedLists[selectedSavedList] ? savedLists[selectedSavedList] : [];
        const fromText = customFidsText
          .split(/[^0-9]+/)
          .map((s) => Number(s))
          .filter((n) => Number.isFinite(n) && n > 0);
        const merged = [...fromSaved, ...fromText];
        userFids = Array.from(new Set(merged));
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
  }, [adminOnly, notificationMode, selectedTeam, teams, customFidsText, savedLists, selectedSavedList]);

  // Load saved lists from localStorage
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('notifSavedLists') : null;
      if (raw) setSavedLists(JSON.parse(raw));
    } catch {}
  }, []);

  const persistSavedLists = (lists: Record<string, number[]>) => {
    try {
      setSavedLists(lists);
      if (typeof window !== 'undefined') localStorage.setItem('notifSavedLists', JSON.stringify(lists));
    } catch {}
  };

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

  // Compute audience size for current mode (without fetching profiles)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setAudienceLoading(true);
      try {
        let count = 0;
        if (notificationMode === 'team' && selectedTeam) {
          const selectedTeamData = teams.find(t => t.id === selectedTeam);
          if (selectedTeamData) {
            const fids = await getFansForTeamAbbr(selectedTeamData.abbreviation);
            count = (fids || []).length;
          }
        } else if (notificationMode === 'fepl') {
          const fids = await getFEPLManagerFIDs();
          count = fids.length;
        } else if (notificationMode === 'nonFepl') {
          const allResp = await fetch("/api/notification-users", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
            },
            body: JSON.stringify({ adminOnly: false }),
          });
          if (allResp.ok) {
            const allData = await allResp.json();
            const allFids: number[] = allData.userFids || [];
            const fepl = new Set(await getFEPLManagerFIDs());
            count = allFids.filter((fid: number) => !fepl.has(fid)).length;
          } else {
            count = 0;
          }
        } else if (notificationMode === 'custom') {
          const fromSaved = selectedSavedList && savedLists[selectedSavedList] ? savedLists[selectedSavedList] : [];
          const fromText = customFidsText
            .split(/[^0-9]+/)
            .map((s) => Number(s))
            .filter((n) => Number.isFinite(n) && n > 0);
          count = Array.from(new Set([...fromSaved, ...fromText])).length;
        } else {
          // all/admins
          const resp = await fetch("/api/notification-users", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
            },
            body: JSON.stringify({ adminOnly }),
          });
          if (resp.ok) {
            const data = await resp.json();
            count = (data.userFids || []).length;
          }
        }
        if (!cancelled) setAudienceCount(count);
      } catch {
        if (!cancelled) setAudienceCount(null);
      } finally {
        if (!cancelled) setAudienceLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [notificationMode, selectedTeam, teams, adminOnly, customFidsText, savedLists, selectedSavedList]);

  // Fetch global counts for detail math (all users and FEPL)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // All app users (not admins only)
        const allResp = await fetch("/api/notification-users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
          },
          body: JSON.stringify({ adminOnly: false }),
        });
        if (allResp.ok) {
          const allData = await allResp.json();
          if (!cancelled) setAllUsersTotal((allData.userFids || []).length);
        } else {
          if (!cancelled) setAllUsersTotal(null);
        }

        const feplFids = await getFEPLManagerFIDs();
        if (!cancelled) setFeplTotal(feplFids.length);
      } catch {
        if (!cancelled) {
          setAllUsersTotal(null);
          setFeplTotal(null);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

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
      } else if (notificationMode === 'fepl') {
        // Send to FEPL managers
        const feplFids = await getFEPLManagerFIDs();
        
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
            customFids: feplFids
          }),
        });
      } else if (notificationMode === 'nonFepl') {
        // Send to all non-FEPL users
        let customFids: number[] = [];
        const allResp = await fetch("/api/notification-users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
          },
          body: JSON.stringify({ adminOnly: false }),
        });
        if (allResp.ok) {
          const allData = await allResp.json();
          const allFids: number[] = allData.userFids || [];
          const fepl = new Set(await getFEPLManagerFIDs());
          customFids = allFids.filter((fid: number) => !fepl.has(fid));
        }
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
            customFids
          }),
        });
      } else if (notificationMode === 'custom') {
        // Send to custom list
        const fromSaved = selectedSavedList && savedLists[selectedSavedList] ? savedLists[selectedSavedList] : [];
        const fromText = customFidsText
          .split(/[^0-9]+/)
          .map((s) => Number(s))
          .filter((n) => Number.isFinite(n) && n > 0);
        const customFids = Array.from(new Set([...fromSaved, ...fromText]));
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
            customFids
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
          : notificationMode === 'fepl'
          ? "FC FEPL managers"
          : notificationMode === 'nonFepl'
          ? 'non-FEPL users'
          : notificationMode === 'custom'
          ? 'custom list'
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
            maxLength={32}
            className="w-full p-3 border border-limeGreenOpacity rounded-lg text-lightPurple bg-darkPurple focus:outline-none focus:ring-2 focus:ring-deepPink transition-all duration-200"
          />
          <div className="flex justify-between items-center mt-1">
            <span className={`text-xs ${title.length > 32 ? 'text-red-400' : 'text-gray-400'}`}>
              {title.length}/32 characters
            </span>
            {title.length > 32 && (
              <span className="text-xs text-red-400 font-medium">
                Title too long!
              </span>
            )}
          </div>
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
            maxLength={128}
            rows={4}
            className="w-full p-3 border border-limeGreenOpacity rounded-lg text-lightPurple bg-darkPurple focus:outline-none focus:ring-2 focus:ring-deepPink transition-all duration-200"
          />
          <div className="flex justify-between items-center mt-1">
            <span className={`text-xs ${body.length > 128 ? 'text-red-400' : 'text-gray-400'}`}>
              {body.length}/128 characters
            </span>
            {body.length > 128 && (
              <span className="text-xs text-red-400 font-medium">
                Message too long!
              </span>
            )}
          </div>
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
            `Send to ${getButtonText()}`
          )}
        </button>
      </form>

      {/* User Table Section */}
      <div className="mt-8 p-6 bg-darkPurple rounded-lg border border-limeGreenOpacity">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-notWhite">
            Filter Who Will Receive Notifications
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
                  <button
                    onClick={() => setNotificationMode('fepl')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      notificationMode === 'fepl'
                        ? 'bg-deepPink text-white'
                        : 'bg-gray-600 text-lightPurple hover:bg-gray-500'
                    }`}
                  >
                    FC FEPL Managers
                  </button>
                  <button
                    onClick={() => setNotificationMode('nonFepl')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      notificationMode === 'nonFepl'
                        ? 'bg-deepPink text-white'
                        : 'bg-gray-600 text-lightPurple hover:bg-gray-500'
                    }`}
                  >
                    Non-FEPL Users
                  </button>
                  <button
                    onClick={() => setNotificationMode('custom')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      notificationMode === 'custom'
                        ? 'bg-deepPink text-white'
                        : 'bg-gray-600 text-lightPurple hover:bg-gray-500'
                    }`}
                  >
                    Custom List
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

              {/* FC FEPL Managers Info */}
              {notificationMode === 'fepl' && (
                <div className="p-3 bg-blue-900/30 border border-blue-600 rounded-lg">
                  <p className="text-sm text-blue-300">
                    📊 Sending to all FC FEPL Fantasy League managers ({audienceLoading ? '…' : (audienceCount ?? 0)} users)
                  </p>
                  <p className="text-xs text-blue-400 mt-1">
                    Based on the fantasy-managers-lookup.json data
                  </p>
                </div>
              )}

              {/* Non-FEPL Users Info */}
              {notificationMode === 'nonFepl' && (
                <div className="p-3 bg-amber-900/30 border border-amber-600 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm text-amber-300">
                        🧭 Sending to all app users excluding FEPL managers
                        {feplTotal !== null ? ` (${feplTotal} FEPL managers excluded)` : ''}
                      </p>
                      <p className="text-xs text-amber-400 mt-1">
                        Dynamically computed from all users minus FEPL list
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-amber-300 underline underline-offset-4 hover:text-amber-200"
                      onClick={() => setShowCountDetails(v => !v)}
                    >
                      {showCountDetails ? 'Hide count details' : 'Show count details'}
                    </button>
                  </div>
                  {showCountDetails && (
                    <div className="mt-2 text-xs text-amber-200">
                      <p>All users: {allUsersTotal ?? '…'}</p>
                      <p>FEPL managers: {feplTotal ?? '…'}</p>
                      <p>
                        Non‑FEPL = All users − FEPL managers = {
                          allUsersTotal !== null && feplTotal !== null ? (allUsersTotal - feplTotal) : '…'
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Custom List Builder */}
              {notificationMode === 'custom' && (
                <div className="p-3 bg-gray-800/50 border border-gray-600 rounded-lg space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-lightPurple mb-1">Paste FIDs (comma, space, or newline separated)</label>
                      <textarea
                        value={customFidsText}
                        onChange={(e) => setCustomFidsText(e.target.value)}
                        rows={5}
                        className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
                        placeholder="123, 456 789\n101112"
                      />
                      <p className="text-xs text-gray-400 mt-1">We dedupe and ignore invalid entries.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-lightPurple mb-1">Saved Lists</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedSavedList}
                          onChange={(e) => setSelectedSavedList(e.target.value)}
                          className="flex-1 p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
                        >
                          <option value="">Select a saved list…</option>
                          {Object.keys(savedLists).sort().map((name) => (
                            <option key={name} value={name}>{name} ({savedLists[name].length})</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="px-3 py-1 rounded text-sm bg-gray-600 text-lightPurple hover:bg-gray-500"
                          onClick={() => {
                            const list = selectedSavedList ? savedLists[selectedSavedList] : [];
                            const asText = list.join(', ');
                            setCustomFidsText(asText);
                          }}
                        >
                          Load →
                        </button>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="text"
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          placeholder="New list name"
                          className="flex-1 p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple"
                        />
                        <button
                          type="button"
                          className="px-3 py-1 rounded text-sm bg-deepPink text-white hover:bg-fontRed"
                          onClick={() => {
                            const fids = customFidsText
                              .split(/[^0-9]+/)
                              .map((s) => Number(s))
                              .filter((n) => Number.isFinite(n) && n > 0);
                            if (!newListName || fids.length === 0) return;
                            const next = { ...savedLists, [newListName]: Array.from(new Set(fids)) };
                            persistSavedLists(next);
                            setSelectedSavedList(newListName);
                            setNewListName("");
                          }}
                        >
                          Save List
                        </button>
                      </div>
                    </div>
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
                  {notificationMode === 'fepl' && (
                    <span className="ml-2 text-blue-400">
                      (FC FEPL managers)
                    </span>
                  )}
                  {notificationMode === 'nonFepl' && (
                    <span className="ml-2 text-amber-400">
                      (Non-FEPL users)
                    </span>
                  )}
                  {notificationMode === 'custom' && (
                    <span className="ml-2 text-gray-400">
                      (Custom list)
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
