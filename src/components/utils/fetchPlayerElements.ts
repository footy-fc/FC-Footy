// fetchPlayers.ts
import { teamService } from '../../lib/teamService';

interface Player {
  id: number;
  web_name: string;
  xgi90: string | number;
  xgc90: string | number;
  expected_goals_conceded_per_90: string | number;
  expected_goal_involvements_per_90: string | number;
  expected_goals_per_90: string | number;
  saves_per_90: string | number;
  expected_assists_per_90: string | number;
  minutes: number;
  element_type: number;
  team: number | string;
  code: number | string;
  photo: string;
}

interface Team {
  id: number | string;
  name: string;
}

export const fetchPlayerElements = async () => {
  try {
    // Use our cached API endpoint instead of Supabase
    const response = await fetch('/api/fpl-bootstrap');
    
    if (!response.ok) {
      throw new Error(`FPL API failed: ${response.status}`);
    }
    
    const data = await response.json();

    // Define position names for elements
    const positionNames: { [key: number]: string } = { 1: 'Gk', 2: 'Def', 3: 'Mid', 4: 'Fwd' };

    // Get all Premier League teams from our team service
    const premierLeagueTeams = await teamService.getLeagueTeams('eng.1');
    
    // Create a mapping from team names to team data
    const teamNameToTeam = new Map();
    premierLeagueTeams.forEach(team => {
      teamNameToTeam.set(team.name, team);
    });

    // Extract teams from the API
    const teams = data.teams.reduce((acc: { [x: string]: unknown; }, team: Team) => {
      acc[team.id] = team.name;
      return acc;
    }, {});
    


    // Process the players and add necessary data
    const playersWithStats = data.elements.map((player: Player) => {
      const teamName = teams[player.team]; // Get the full team name from FPL API
      const teamData = teamNameToTeam.get(teamName); // Get team data from our service
      
      return {
        id: player.id,
        webName: player.web_name,
        xgi90: parseFloat(String(player.expected_goal_involvements_per_90)) || 0,
        xgc90: parseFloat(String(player.expected_goals_conceded_per_90)) || 0,
        expected_goals_per_90: parseFloat(String(player.expected_goals_per_90)) || 0,
        saves_per_90: parseFloat(String(player.saves_per_90)) || 0,
        expected_assists_per_90: parseFloat(String(player.expected_assists_per_90)) || 0,
        minutes: player.minutes,
        position: positionNames[player.element_type],
        photo: player.code
          ? `https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.code}.png`
          : '/defifa_spinner.gif',
        team: teamName,
        teamLogo: teamData?.logoUrl || '/assets/default-team-logo.png'
      };
    });

    return playersWithStats;
  } catch (error) {
    console.error('Error fetching player data:', error);
    throw new Error('Error fetching player data');
  }
};
