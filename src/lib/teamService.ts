// Team Service for FC-Footy
// Handles team, league, and membership operations using Upstash Redis

import { Redis } from '@upstash/redis';
import { 
  Team, 
  League, 
  TeamLeagueMembership, 
  TeamWithLeagues,
  LeagueWithTeams,
  CreateTeamData,
  CreateLeagueData,
  CreateMembershipData
} from '../types/teamTypes';
import { ESPNLogoService } from './espnLogoService';

export class TeamService {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      url: process.env.NEXT_PUBLIC_KV_REST_API_URL!,
      token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN!,
    });
  }
  
  // Redis key generators
  private getTeamKey(teamId: string): string {
    return `team:${teamId}`;
  }
  
  private getTeamByAbbrKey(abbreviation: string): string {
    return `team:abbr:${abbreviation.toLowerCase()}`;
  }
  
  private getTeamByNameKey(name: string): string {
    return `team:name:${name.toLowerCase().replace(/\s+/g, '-')}`;
  }
  
  private getLeagueKey(leagueId: string): string {
    return `league:${leagueId}`;
  }
  
  private getActiveLeaguesKey(): string {
    return 'league:active';
  }
  
  private getMembershipKey(membershipId: string): string {
    return `membership:${membershipId}`;
  }
  
  private getTeamLeaguesKey(teamId: string): string {
    return `team:${teamId}:leagues`;
  }
  
  private getLeagueTeamsKey(leagueId: string): string {
    return `league:${leagueId}:teams`;
  }
  
  private getActiveMembershipsKey(teamId: string): string {
    return `membership:active:${teamId}`;
  }
  
  // Team CRUD operations
  async createTeam(teamData: CreateTeamData): Promise<Team> {
    const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    // Generate ESPN logo URL if not provided
    const logoUrl = teamData.logoUrl || ESPNLogoService.getLogoUrl(teamData.abbreviation);
    
    const team: Team = {
      id: teamId,
      name: teamData.name,
      shortName: teamData.shortName,
      abbreviation: teamData.abbreviation.toLowerCase(),
      country: teamData.country,
      logoUrl,
      roomHash: teamData.roomHash,
      metadata: teamData.metadata || {},
      createdAt: now,
      updatedAt: now
    };
    
    // Store team data
    await this.redis.set(this.getTeamKey(teamId), JSON.stringify(team));
    
    // Store lookup keys
    await this.redis.set(this.getTeamByAbbrKey(team.abbreviation), teamId);
    await this.redis.set(this.getTeamByNameKey(team.name), teamId);
    
    return team;
  }
  
  async getTeam(teamId: string): Promise<Team | null> {
    try {
      const teamData = await this.redis.get(this.getTeamKey(teamId));
      if (!teamData) return null;
      
      // Handle both string and object cases
      if (typeof teamData === 'string') {
        return JSON.parse(teamData);
      } else {
        return teamData as Team;
      }
    } catch (error) {
      console.error(`Error parsing team data for ${teamId}:`, error);
      return null;
    }
  }
  
  async getTeamByAbbr(abbreviation: string): Promise<Team | null> {
    try {
      const teamId = await this.redis.get(this.getTeamByAbbrKey(abbreviation));
      if (!teamId) return null;
      
      // Ensure teamId is a string
      const teamIdStr = typeof teamId === 'string' ? teamId : String(teamId);
      return await this.getTeam(teamIdStr);
    } catch (error) {
      console.error(`Error getting team by abbreviation ${abbreviation}:`, error);
      return null;
    }
  }

  /**
   * Get team by abbreviation with comprehensive lookup including fplMappings
   * This method checks both the primary abbreviation and the fplMappings array
   */
  async getTeamByAbbrComprehensive(abbreviation: string): Promise<Team | null> {
    try {
      const normalizedAbbr = abbreviation.toLowerCase();
      
      // First, try the direct abbreviation lookup
      const team = await this.getTeamByAbbr(normalizedAbbr);
      if (team) {
        return team;
      }
      
      // If not found, search through all teams for fplMappings
      const allTeams = await this.getAllTeams();
      
      for (const team of allTeams) {
        const fplMappingsRaw = team.metadata?.fplMappings;
        if (fplMappingsRaw) {
          let fplMappings: string[] = [];
          
          // Handle both string and array formats
          if (typeof fplMappingsRaw === 'string') {
            try {
              fplMappings = JSON.parse(fplMappingsRaw);
            } catch (error) {
              console.warn(`Failed to parse fplMappings for team ${team.name}:`, error);
              continue;
            }
          } else if (Array.isArray(fplMappingsRaw)) {
            fplMappings = fplMappingsRaw;
          }
          
          // Check if the abbreviation matches any in the fplMappings array
          if (fplMappings.some(mapping => mapping.toLowerCase() === normalizedAbbr)) {
            return team;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting team by comprehensive abbreviation lookup ${abbreviation}:`, error);
      return null;
    }
  }
  
  async getTeamByName(name: string): Promise<Team | null> {
    try {
      const teamId = await this.redis.get(this.getTeamByNameKey(name));
      if (!teamId) return null;
      
      // Ensure teamId is a string
      const teamIdStr = typeof teamId === 'string' ? teamId : String(teamId);
      return await this.getTeam(teamIdStr);
    } catch (error) {
      console.error(`Error getting team by name ${name}:`, error);
      return null;
    }
  }
  
  /**
   * Get all teams from Redis
   */
  async getAllTeams(): Promise<Team[]> {
    try {
      // Scan for all team keys (excluding lookup keys and league sets)
      const allTeamKeys = await this.redis.keys('team:team_*');
      
      // Filter out keys that end with ':leagues' (these are sets, not team data)
      const teamKeys = allTeamKeys.filter(key => !key.endsWith(':leagues'));
            
      // Fetch all team data in parallel
      const teamDataPromises = teamKeys.map(async (key) => {
        const teamData = await this.redis.get(key);
        if (teamData) {
          if (typeof teamData === 'string') {
            return JSON.parse(teamData);
          } else {
            return teamData as Team;
          }
        }
        return null;
      });
      
      const teamDataResults = await Promise.all(teamDataPromises);
      
      // Filter out null results and return teams
      return teamDataResults.filter(team => team !== null) as Team[];
    } catch (error) {
      console.error('Error getting all teams:', error);
      return [];
    }
  }
  
  async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team | null> {
    const team = await this.getTeam(teamId);
    if (!team) return null;
    
    const updatedTeam: Team = {
      ...team,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await this.redis.set(this.getTeamKey(teamId), JSON.stringify(updatedTeam));
    
    // Update lookup keys if name or abbreviation changed
    if (updates.name && updates.name !== team.name) {
      await this.redis.del(this.getTeamByNameKey(team.name));
      await this.redis.set(this.getTeamByNameKey(updatedTeam.name), teamId);
    }
    
    if (updates.abbreviation && updates.abbreviation !== team.abbreviation) {
      await this.redis.del(this.getTeamByAbbrKey(team.abbreviation));
      await this.redis.set(this.getTeamByAbbrKey(updatedTeam.abbreviation), teamId);
    }
    
    return updatedTeam;
  }
  
  async deleteTeam(teamId: string): Promise<boolean> {
    try {
      console.log(`Starting deletion of team: ${teamId}`);
      
      const team = await this.getTeam(teamId);
      if (!team) {
        console.log(`Team not found: ${teamId}`);
        return false;
      }
      
      console.log(`Found team: ${team.name}, proceeding with deletion`);
      
      // Remove all memberships
      try {
        const memberships = await this.getActiveTeamMemberships(teamId);
        console.log(`Found ${memberships.length} active memberships for team ${teamId}`);
        
        for (const membership of memberships) {
          try {
            console.log(`Removing membership ${membership.id} from league ${membership.leagueId}`);
            await this.removeTeamFromLeague(teamId, membership.leagueId, membership.season);
          } catch (membershipError) {
            console.error(`Error removing membership ${membership.id}:`, membershipError);
            // Continue with other memberships even if one fails
          }
        }
      } catch (membershipsError) {
        console.error(`Error getting team memberships:`, membershipsError);
        // Continue with deletion even if memberships fail
      }
      
      // Remove lookup keys
      try {
        await this.redis.del(this.getTeamByAbbrKey(team.abbreviation));
        await this.redis.del(this.getTeamByNameKey(team.name));
        await this.redis.del(this.getTeamKey(teamId));
        console.log(`Successfully deleted team data for: ${teamId}`);
      } catch (redisError) {
        console.error(`Error deleting team data from Redis:`, redisError);
        throw redisError;
      }
      
      return true;
    } catch (error) {
      console.error(`Error in deleteTeam for ${teamId}:`, error);
      throw error;
    }
  }
  
  // League operations
  async createLeague(leagueData: CreateLeagueData): Promise<League> {
    const now = new Date().toISOString();
    
    const league: League = {
      id: leagueData.id,
      name: leagueData.name,
      country: leagueData.country,
      type: leagueData.type,
      active: leagueData.active ?? true,
      createdAt: now,
      updatedAt: now
    };
    
    await this.redis.set(this.getLeagueKey(league.id), JSON.stringify(league));
    
    // Add to active leagues if active
    if (league.active) {
      await this.redis.sadd(this.getActiveLeaguesKey(), league.id);
    }
    
    return league;
  }
  
  async getLeague(leagueId: string): Promise<League | null> {
    try {
      const leagueData = await this.redis.get(this.getLeagueKey(leagueId));
      if (!leagueData) return null;
      
      // Handle both string and object cases
      if (typeof leagueData === 'string') {
        return JSON.parse(leagueData);
      } else {
        return leagueData as League;
      }
    } catch (error) {
      console.error(`Error parsing league data for ${leagueId}:`, error);
      return null;
    }
  }
  
  async getActiveLeagues(): Promise<League[]> {
    const activeLeagueIds = await this.redis.smembers<string[]>(this.getActiveLeaguesKey());
    const leagues: League[] = [];
    
    for (const leagueId of activeLeagueIds) {
      try {
        const league = await this.getLeague(leagueId);
        if (league) leagues.push(league);
      } catch (error) {
        console.warn(`Failed to get league data for ${leagueId}:`, error);
      }
    }
    
    return leagues;
  }
  
  async updateLeague(leagueId: string, updates: Partial<League>): Promise<League | null> {
    const league = await this.getLeague(leagueId);
    if (!league) return null;
    
    const updatedLeague: League = {
      ...league,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await this.redis.set(this.getLeagueKey(leagueId), JSON.stringify(updatedLeague));
    
    // Update active leagues set
    if (updates.active !== undefined) {
      if (updates.active) {
        await this.redis.sadd(this.getActiveLeaguesKey(), leagueId);
      } else {
        await this.redis.srem(this.getActiveLeaguesKey(), leagueId);
      }
    }
    
    return updatedLeague;
  }
  
  // Membership operations
  async addTeamToLeague(membershipData: CreateMembershipData): Promise<TeamLeagueMembership> {
    const membershipId = `membership_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const membership: TeamLeagueMembership = {
      id: membershipId,
      teamId: membershipData.teamId,
      leagueId: membershipData.leagueId,
      season: membershipData.season,
      startDate: membershipData.startDate,
      active: true,
      createdAt: now,
      updatedAt: now
    };
    
    // Store membership
    await this.redis.set(this.getMembershipKey(membershipId), JSON.stringify(membership));
    
    // Add to team's leagues
    await this.redis.sadd(this.getTeamLeaguesKey(membershipData.teamId), membershipData.leagueId);
    
    // Add to league's teams
    await this.redis.sadd(this.getLeagueTeamsKey(membershipData.leagueId), membershipData.teamId);
    
    // Add to active memberships
    await this.redis.sadd(this.getActiveMembershipsKey(membershipData.teamId), membershipId);
    
    return membership;
  }
  
  async removeTeamFromLeague(teamId: string, leagueId: string, season: string): Promise<void> {
    // Find and deactivate membership
    const memberships = await this.getActiveTeamMemberships(teamId);
    const membership = memberships.find(m => m.leagueId === leagueId && m.season === season);
    
    if (membership) {
      const updatedMembership: TeamLeagueMembership = {
        ...membership,
        active: false,
        endDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await this.redis.set(this.getMembershipKey(membership.id), JSON.stringify(updatedMembership));
      await this.redis.srem(this.getActiveMembershipsKey(teamId), membership.id);
    }
    
    // Remove from sets
    await this.redis.srem(this.getTeamLeaguesKey(teamId), leagueId);
    await this.redis.srem(this.getLeagueTeamsKey(leagueId), teamId);
  }
  
  async getTeamLeagues(teamId: string): Promise<League[]> {
    const leagueIds = await this.redis.smembers<string[]>(this.getTeamLeaguesKey(teamId));
    const leagues: League[] = [];
    
    for (const leagueId of leagueIds) {
      const league = await this.getLeague(leagueId);
      if (league) leagues.push(league);
    }
    
    return leagues;
  }
  
  async getLeagueTeams(leagueId: string): Promise<Team[]> {
    const teamIds = await this.redis.smembers<string[]>(this.getLeagueTeamsKey(leagueId));
    const teams: Team[] = [];
    
    for (const teamId of teamIds) {
      const team = await this.getTeam(teamId);
      if (team) teams.push(team);
    }
    
    return teams;
  }
  
  async getActiveTeamMemberships(teamId: string): Promise<TeamLeagueMembership[]> {
    const membershipIds = await this.redis.smembers<string[]>(this.getActiveMembershipsKey(teamId));
    const memberships: TeamLeagueMembership[] = [];
    
    for (const membershipId of membershipIds) {
      try {
        const membershipData = await this.redis.get(this.getMembershipKey(membershipId));
        if (membershipData) {
          // Handle both string and object cases
          let membership: TeamLeagueMembership;
          if (typeof membershipData === 'string') {
            membership = JSON.parse(membershipData);
          } else {
            membership = membershipData as TeamLeagueMembership;
          }
          
          if (membership && membership.active) {
            memberships.push(membership);
          }
        }
      } catch (error) {
        console.error(`Error parsing membership ${membershipId}:`, error);
        // Continue with other memberships
      }
    }
    
    return memberships;
  }
  
  // Utility methods
  async getTeamLogo(teamId: string, leagueId?: string): Promise<string> {
    const team = await this.getTeam(teamId);
    console.log('leagueId', team, leagueId);
    if (!team) return ESPNLogoService.getFallbackLogo();
    
    // Validate ESPN logo
    const isValid = await ESPNLogoService.validateLogo(team.abbreviation);
    if (isValid) {
      return team.logoUrl || '';
    }
    
    // Return fallback
    return ESPNLogoService.getFallbackLogo();
  }
  
  async validateTeamInLeague(teamId: string, leagueId: string): Promise<boolean> {
    const memberships = await this.getActiveTeamMemberships(teamId);
    return memberships.some(m => m.leagueId === leagueId && m.active);
  }
  
  async getTeamWithLeagues(teamId: string): Promise<TeamWithLeagues | null> {
    const team = await this.getTeam(teamId);
    if (!team) return null;
    
    const leagues = await this.getTeamLeagues(teamId);
    return { ...team, leagues };
  }
  
  async getLeagueWithTeams(leagueId: string): Promise<LeagueWithTeams | null> {
    const league = await this.getLeague(leagueId);
    if (!league) return null;
    
    const teams = await this.getLeagueTeams(leagueId);
    return { ...league, teams };
  }
}

// Export singleton instance
export const teamService = new TeamService(); 