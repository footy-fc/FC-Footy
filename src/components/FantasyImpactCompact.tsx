import React, { useMemo } from 'react';
import Image from 'next/image';

interface EnrichedPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  element_type: number;
  player?: {
    id: number;
    name: string;
    web_name: string;
    code: number;
    team?: {
      id: number;
      name: string;
      short_name: string;
    } | null;
    element_type: number;
    form: number;
    selected_by_percent: number;
    expected_goals: number;
    expected_assists: number;
    total_points: number;
    points_per_game: number;
  } | null;
}

interface FantasyImpactCompactProps {
  relevantPicks: EnrichedPick[];
  homeTeam: string;
  awayTeam: string;
  teams: Array<{ abbreviation: string; logoUrl: string }>;
}

const FantasyImpactCompact: React.FC<FantasyImpactCompactProps> = ({
  relevantPicks,
  homeTeam,
  awayTeam,
  teams
}) => {
  // Separate picks by team
  const homePicks = relevantPicks.filter(pick => 
    pick.player?.team?.short_name?.toLowerCase() === homeTeam.toLowerCase()
  );
  
  const awayPicks = relevantPicks.filter(pick => 
    pick.player?.team?.short_name?.toLowerCase() === awayTeam.toLowerCase()
  );

  // Helper function to get position name
  const getPositionName = (elementType: number) => {
    switch (elementType) {
      case 1: return 'GK';
      case 2: return 'DEF';
      case 3: return 'MID';
      case 4: return 'FWD';
      default: return 'N/A';
    }
  };

  // Helper function to get status
  const getStatus = (pick: EnrichedPick) => {
    if (pick.is_captain) return 'C';
    if (pick.is_vice_captain) return 'VC';
    if (pick.multiplier === 0) return 'B';
    return '';
  };

  // Memoized team logo mapping to prevent flashing
  const teamLogoMap = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach(team => {
      map.set(team.abbreviation.toLowerCase(), team.logoUrl);
    });
    return map;
  }, [teams]);

  // Helper function to get team logo
  const getTeamLogo = (teamShortName: string) => {
    return teamLogoMap.get(teamShortName.toLowerCase()) || '/defifa_spinner.gif';
  };

  // Player card component
  const PlayerCard = React.memo(({ pick }: { pick: EnrichedPick }) => {
    const player = pick.player;
    if (!player || !player.team) return null;

    const status = getStatus(pick);
    const position = getPositionName(player.element_type);

    return (
      <div className="bg-darkPurple border border-gray-600 rounded-lg p-2 flex items-center space-x-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-lightPurple truncate">
            {player.web_name}
          </div>
          <div className="text-xs text-gray-400">
            {position} • {player.selected_by_percent?.toFixed(1) || '0.0'}%
          </div>
        </div>
        {status && (
          <div className={`text-xs font-bold px-1 py-0.5 rounded ${
            status === 'C' ? 'bg-yellow-500 text-black' :
            status === 'VC' ? 'bg-orange-500 text-black' :
            'bg-gray-500 text-white'
          }`}>
            {status}
          </div>
        )}
      </div>
    );
  });

  // Add display name for PlayerCard
  PlayerCard.displayName = 'PlayerCard';

  // Team section component
  const TeamSection = React.memo(({ 
    teamName, 
    picks
  }: { 
    teamName: string; 
    picks: EnrichedPick[]; 
  }) => {
    const teamLogo = getTeamLogo(teamName);
    
    return (
      <div className="flex items-center gap-3">
        <Image
          src={teamLogo}
          alt={`${teamName} logo`}
          width={24}
          height={24}
          className="w-6 h-6 rounded-full flex-shrink-0"
        />
        <div className="grid grid-cols-3 gap-2 flex-1">
          {picks.map((pick, index) => (
            <PlayerCard key={`${pick.element}-${index}`} pick={pick} />
          ))}
        </div>
      </div>
    );
  });

  // Add display name for TeamSection
  TeamSection.displayName = 'TeamSection';

  if (relevantPicks.length === 0) {
    return (
      <div className="text-center text-gray-400 text-sm py-4">
        No fantasy players in this match
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {homePicks.length > 0 && (
        <TeamSection 
          teamName={homeTeam} 
          picks={homePicks} 
        />
      )}
      {awayPicks.length > 0 && (
        <TeamSection 
          teamName={awayTeam} 
          picks={awayPicks} 
        />
      )}
    </div>
  );
};

export default FantasyImpactCompact;
