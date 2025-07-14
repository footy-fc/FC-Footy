/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Redis } from "@upstash/redis";
import { useEffect, useState } from "react";
import NotificationsTab from "../../components/admin/NotificationsTab";
import TeamsTab from "../../components/admin/TeamsTab";
import LeaguesTab from "../../components/admin/LeaguesTab";

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

// Types for team management
interface Team {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  country: string;
  logoUrl: string;
  roomHash?: string;
  metadata?: { [key: string]: string };
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

export default function AdminPage() {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("notifications");
  
  // Notification state
  const [responseMessage, setResponseMessage] = useState("");
  const [totalNumberOfUsers, setTotalNumberOfUsers] = useState(0);
  const [loading, setLoading] = useState(false);

  // Team management state
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [memberships, setMemberships] = useState<{[leagueId: string]: string[]}>({});
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingTeamCreation, setLoadingTeamCreation] = useState(false);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  // const [loadingMemberships, setLoadingMemberships] = useState(false);
  
  const [dataLoaded, setDataLoaded] = useState({
    teams: false,
    leagues: false,
    memberships: false
  });
  
  // Form states
  const [newTeam, setNewTeam] = useState({
    name: "",
    shortName: "",
    abbreviation: "",
    country: "",
    logoUrl: "",
    roomHash: "",
    metadata: {} as { [key: string]: string }
  });
  
  const [newLeague, setNewLeague] = useState({
    id: "",
    name: "",
    country: "",
    type: "domestic" as "domestic" | "continental" | "international",
    active: true
  });
  
  const [newMembership, setNewMembership] = useState({
    teamId: "",
    leagueId: "",
    season: "2024-25",
    startDate: new Date().toISOString().split('T')[0]
  });

  async function getTotalNumberOfUsers(): Promise<number> {
    const keys = await redis.keys("fc-footy:user:*");
    return keys.length;
  }

  const fetchTotalNumberOfUsers = async () => {
    const totalNumber = await getTotalNumberOfUsers();
    setTotalNumberOfUsers(totalNumber);
  };

  // Team management functions
  const fetchTeams = async () => {
    if (dataLoaded.teams && teams.length > 0) {
      return; // Skip if already loaded
    }
    
    setLoadingTeams(true);
    try {
      // Use the API endpoint instead of calling teamService directly
      const response = await fetch('/api/teams', {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams);
        setDataLoaded(prev => ({ ...prev, teams: true }));
      } else {
        console.error('Failed to fetch teams:', response.status);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const refreshTeams = async () => {
    setLoadingTeams(true);
    try {
      // Use the API endpoint instead of calling teamService directly
      const response = await fetch('/api/teams', {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams);
    } else {
        console.error('Failed to refresh teams:', response.status);
      }
    } catch (error) {
      console.error('Error refreshing teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const fetchLeagues = async () => {
    if (dataLoaded.leagues && leagues.length > 0) {
      return; // Skip if already loaded
    }
    
    setLoadingLeagues(true);
    try {
      const activeLeagues = await redis.smembers('league:active');
      
      // Fetch all league data in parallel
      const leagueDataPromises = activeLeagues.map(leagueId => 
        redis.get(`league:${leagueId}`)
      );
      const leagueDataResults = await Promise.all(leagueDataPromises);
      
      const leaguesData: League[] = [];
      leagueDataResults.forEach(leagueData => {
        if (leagueData) {
          const league = typeof leagueData === 'string' ? JSON.parse(leagueData) : leagueData;
          leaguesData.push(league);
        }
      });
      
      setLeagues(leaguesData);
      setDataLoaded(prev => ({ ...prev, leagues: true }));
    } catch (error) {
      console.error('Error fetching leagues:', error);
    } finally {
      setLoadingLeagues(false);
    }
  };

  const refreshLeagues = async () => {
    setLoadingLeagues(true);
    try {
      const response = await fetch('/api/leagues');
      if (response.ok) {
        const data = await response.json();
        setLeagues(data.leagues || []);
        setDataLoaded(prev => ({ ...prev, leagues: true }));
      } else {
        console.error('Failed to fetch leagues:', response.status);
      }
    } catch (error) {
      console.error('Error fetching leagues:', error);
    } finally {
      setLoadingLeagues(false);
    }
  };

  const fetchMemberships = async () => {
    try {
      const response = await fetch('/api/memberships/all', {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setMemberships(data.memberships || {});
        setDataLoaded(prev => ({ ...prev, memberships: true }));
      } else {
        console.error('Failed to fetch memberships:', response.status);
      }
    } catch (error) {
      console.error('Error fetching memberships:', error);
    }
  };

  const refreshMemberships = async () => {
    try {
      const response = await fetch('/api/memberships/all', {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setMemberships(data.memberships || {});
      } else {
        console.error('Failed to refresh memberships:', response.status);
      }
    } catch (error) {
      console.error('Error refreshing memberships:', error);
    }
  };



  const createTeam = async () => {
    // Validate required fields
    if (!newTeam.name || !newTeam.shortName || !newTeam.abbreviation || !newTeam.country) {
      setResponseMessage('Error: Please fill in all required fields (Name, Short Name, Abbreviation, Country)');
      return;
    }

    setResponseMessage('Creating team...');
    setLoadingTeamCreation(true);
    
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
        const createdTeam = await response.json();
        setResponseMessage(`Team "${newTeam.name}" created successfully! Team ID: ${createdTeam.id}`);
        setNewTeam({ name: "", shortName: "", abbreviation: "", country: "", logoUrl: "", roomHash: "", metadata: {} });
        
        // Force refresh teams data
        await refreshTeams();
        
        // Also refresh memberships in case teams are needed there
        if (dataLoaded.memberships) {
          await refreshMemberships();
        }
      } else {
        const error = await response.json();
        setResponseMessage(`Error creating team: ${error.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      setResponseMessage(`Error creating team: ${error.message || 'Network error'}`);
    } finally {
      setLoadingTeamCreation(false);
    }
  };

  const createLeague = async () => {
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
        setResponseMessage('League created successfully!');
        setNewLeague({ id: "", name: "", country: "", type: "domestic", active: true });
        fetchLeagues();
      } else {
        const error = await response.json();
        setResponseMessage(`Error: ${error.error}`);
      }
    } catch (error: any) {
      setResponseMessage(`Error: ${error.message}`);
    }
  };

  const removeTeamFromLeague = async (teamId: string, leagueId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/memberships`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
        body: JSON.stringify({
          teamId,
          leagueId,
          season: "2024-25"
        }),
      });
      
      if (response.ok) {
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove team from league');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const addTeamToLeague = async (teamId: string, leagueId: string) => {
    try {
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
        body: JSON.stringify({ 
          teamId,
          leagueId,
          season: "2024-25",
          startDate: new Date().toISOString().split('T')[0]
        }),
      });

      if (response.ok) {
        // Don't refresh immediately - let the bulk operation handle it
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add team to league');
      }
    } catch (error: any) {
      throw error;
    }
  };


  const addTeamToLeagueFromForm = async () => {
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
        setResponseMessage('Team added to league successfully!');
        setNewMembership({ teamId: "", leagueId: "", season: "2024-25", startDate: new Date().toISOString().split('T')[0] });
        await Promise.all([refreshTeams(), refreshLeagues(), refreshMemberships()]);
      } else {
        const error = await response.json();
        setResponseMessage(`Error: ${error.error}`);
      }
    } catch (error: any) {
      setResponseMessage(`Error: ${error.message}`);
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
      });
      
      if (response.ok) {
        setResponseMessage('Team deleted successfully!');
        await refreshTeams();
      } else {
        const error = await response.json();
        setResponseMessage(`Error: ${error.error}`);
      }
    } catch (error: any) {
      setResponseMessage(`Error: ${error.message}`);
    }
  };

  const updateTeam = async (teamId: string, updates: any): Promise<boolean> => {
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
        body: JSON.stringify(updates),
      });
      
      if (response.ok) {
        await refreshTeams();
        return true;
      } else {
        const error = await response.json();
        setResponseMessage(`Error updating team: ${error.error || 'Unknown error'}`);
        return false;
      }
    } catch (error: any) {
      setResponseMessage(`Error updating team: ${error.message || 'Network error'}`);
      return false;
    }
  };

  const deleteLeague = async (leagueId: string) => {
    if (!confirm('Are you sure you want to delete this league?')) return;
    
    try {
      const response = await fetch(`/api/leagues/${leagueId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
      });
      
      if (response.ok) {
        setResponseMessage('League deleted successfully!');
        await refreshLeagues();
      } else {
        const error = await response.json();
        setResponseMessage(`Error: ${error.error}`);
      }
    } catch (error: any) {
      setResponseMessage(`Error: ${error.message}`);
    }
  };

  const refreshAllData = async () => {
    await Promise.all([refreshTeams(), refreshLeagues(), refreshMemberships()]);
  };

  useEffect(() => {
    fetchTotalNumberOfUsers();
  }, [authenticated]);

  // Lazy load data when tabs are accessed
  useEffect(() => {
    if (authenticated && activeTab === "teams" && !dataLoaded.teams) {
      fetchTeams();
    }
    // Also load leagues and memberships when teams tab is accessed for league display
    if (authenticated && activeTab === "teams" && !dataLoaded.leagues) {
      fetchLeagues();
    }
    if (authenticated && activeTab === "teams" && !dataLoaded.memberships) {
      fetchMemberships();
    }
  }, [authenticated, activeTab, dataLoaded.teams, dataLoaded.leagues, dataLoaded.memberships]);

  useEffect(() => {
    if (authenticated && activeTab === "leagues" && !dataLoaded.leagues) {
      fetchLeagues();
    }
    // Also load teams when leagues tab is accessed for team assignment feature
    if (authenticated && activeTab === "leagues" && !dataLoaded.teams) {
      fetchTeams();
    }
    // Also load memberships when leagues tab is accessed for team display feature
    if (authenticated && activeTab === "leagues" && !dataLoaded.memberships) {
      fetchMemberships();
    }
  }, [authenticated, activeTab, dataLoaded.leagues, dataLoaded.teams, dataLoaded.memberships]);

  const handleAuthenticate = () => {
    if (apiKeyInput === process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
      setAuthenticated(true);
    } else {
      alert("Invalid Pass key");
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-darkPurple flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-purplePanel rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl border border-limeGreenOpacity">
          <h2 className="text-2xl font-bold text-notWhite text-center mb-6">
            Admin Login
          </h2>
          <input
            type="password"
            placeholder="Enter Pass Key"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            className="w-full p-3 border border-limeGreenOpacity rounded-lg text-lightPurple bg-darkPurple focus:outline-none focus:ring-2 focus:ring-deepPink transition-all duration-200"
          />
          <button
            onClick={handleAuthenticate}
            className="w-full mt-6 bg-deepPink text-white p-3 rounded-lg hover:bg-fontRed transform transition-all duration-200 hover:scale-105"
          >
            Authenticate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darkPurple p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 p-4 bg-purplePanel rounded-lg shadow-inner border border-limeGreenOpacity">
          <h1 className="text-2xl font-bold text-notWhite mb-2">Footy App Admin Dashboard</h1>
          <p className="text-sm text-lightPurple">
            Total Users: <span className="font-medium text-notWhite">{totalNumberOfUsers}</span>
          </p>
        </div>

        {/* Response Message */}
        {responseMessage && (
          <div className="mb-6 p-4 bg-purplePanel rounded-lg border border-limeGreenOpacity">
            <p className="text-lightPurple">{responseMessage}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-limeGreenOpacity">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "notifications", label: "Notifications" },
                { id: "teams", label: "Teams" },
                { id: "leagues", label: "Leagues" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-deepPink text-deepPink"
                      : "border-transparent text-lightPurple hover:text-notWhite hover:border-limeGreenOpacity"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          </div>
          
        {/* Tab Content */}
        <div className="bg-purplePanel rounded-xl shadow-lg p-8 border border-limeGreenOpacity">
          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <NotificationsTab
              loading={loading}
              setLoading={setLoading}
              setResponseMessage={setResponseMessage}
            />
          )}

          {/* Teams Tab */}
          {activeTab === "teams" && (
            <TeamsTab
              teams={teams}
              leagues={leagues}
              memberships={memberships}
              loadingTeams={loadingTeams}
              loadingTeamCreation={loadingTeamCreation}
              createTeam={createTeam}
              deleteTeam={deleteTeam}
              addTeamToLeague={addTeamToLeague}
              updateTeam={updateTeam}
              newTeam={newTeam}
              setNewTeam={setNewTeam}
              setResponseMessage={setResponseMessage}
              refreshAllData={refreshAllData}
            />
          )}

          {/* Leagues Tab */}
          {activeTab === "leagues" && (
            <LeaguesTab
              leagues={leagues}
              teams={teams}
              memberships={memberships}
              loadingLeagues={loadingLeagues}
              createLeague={createLeague}
              deleteLeague={deleteLeague}
              addTeamToLeague={addTeamToLeague}
              removeTeamFromLeague={removeTeamFromLeague}
              newLeague={newLeague}
              setNewLeague={setNewLeague}
              responseMessage={responseMessage}
              setResponseMessage={setResponseMessage}
              refreshAllData={refreshAllData}
            />
          )}
          </div>
      </div>
    </div>
  );
}
