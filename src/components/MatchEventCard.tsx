import React, { useState, useRef, useEffect } from 'react';
//import { useApolloClient } from '@apollo/client';
import Image from 'next/image';
// import Link from 'next/link';
// import { FaTrophy, FaTicketAlt } from 'react-icons/fa';
// import RefereeIcon from '../components/ui/RefereeIcon';
// import RAGameContext from './ai/RAGameContext';
import FantasyImpactCompact from './FantasyImpactCompact';
import { WarpcastShareButton } from './ui/WarpcastShareButton';
import { fetchTeamLogos } from './utils/fetchTeamLogos';
//import { GET_SS_GAMES } from '../lib/graphql/queries';
import { createRichMatchData } from '~/utils/matchDataUtils';
// import FarcasterAvatar from './FarcasterAvatar';
import { sdk } from '@farcaster/miniapp-sdk';
// import { fetchNativeTokenPrice } from '~/utils/fetchUsdPrice';
// import ContestScoreSquare from './ContestScoreSquare';
// import ContestScoreSquareCreate from './ContestScoreSquareCreate';

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

interface Detail {
  athletesInvolved: Array<{ displayName: string }>;
  type: { text: string };
  clock: { displayValue: string };
  team: { id: string; abbreviation: string };
}

interface KeyMoment {
  action: string;
  teamName?: string;
  logo: string;
  playerName: string;
  times: string[];
}

interface EventCardProps {
  sportId: string;
  event: {
    id: string;
    shortName: string;
    name: string;
    date: string;
    status: { displayClock: string; type: { detail: string } };
    competitions: {
      competitors: {
        team: { logo: string; id: string; abbreviation: string };
        score: number;
      }[];
      details: Detail[];
    }[];
  };
  isOpen?: boolean;
  onToggle?: () => void;
}

interface SelectedMatch {
  homeTeam: string;
  awayTeam: string;
  competitorsLong: string;
  homeLogo: string;
  awayLogo: string;
  homeScore: number;
  awayScore: number;
  clock: string;
  eventStarted: boolean;
  keyMoments: string[];
  // Rich match data for Peter Drury integration
  matchEvents?: Detail[];
  competition?: string;
  eventId?: string;
}

// Extended Team interface (from fetchTeamLogos) including league information.
interface Team {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
}

// Types for formatted FPL picks enrichment
const MatchEventCard: React.FC<EventCardProps> = ({ event, sportId, isOpen = false, onToggle }) => {
  const [selectedMatch, setSelectedMatch] = useState<SelectedMatch | null>(null);

  const [isInFantasyLeague, setIsInFantasyLeague] = useState<boolean | null>(null);
  // const [isTempOff, setTempOff] = useState<boolean | null>(true);
  const [hasRelevantPlayers, setHasRelevantPlayers] = useState<boolean | null>(null);
  const [relevantPicks, setRelevantPicks] = useState<EnrichedPick[]>([]);

  const [teams, setTeams] = useState<Team[]>([]);
  //const [isLoadingFans, setIsLoadingFans] = useState(false);
  const [loadingDots, setLoadingDots] = useState('');
  const elementRef = useRef<HTMLDivElement | null>(null);
  //const client = useApolloClient();
  //const [hasQueried, setHasQueried] = useState(false);
  // const [ethPrice, setEthPrice] = useState<number | null>(null);
  // const [ssGames, setSsGames] = useState<
  //   Array<{ eventId: string; gameId: string; referee: string; prizePool: string; squarePrice: string; deployerFeePercent: string }>>([]);

  // Animate three dots every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    console.log(loadingDots);
    return () => clearInterval(interval);
  }, [loadingDots]);

  // Fetch team logos (which include league information) on mount.
  useEffect(() => {
    fetchTeamLogos().then((data) => setTeams(data));
  }, []);

  // Reset relevant players state when selected match changes
  useEffect(() => {
    setHasRelevantPlayers(null);
  }, [selectedMatch]);

  // Check if user's FID belongs to a manager in the FPL league (eng.1)
  useEffect(() => {
    const checkFantasyLeague = async () => {
      try {
        const context = await sdk.context;
        const fid = context?.user?.fid;
        
        if (fid) {
          // setUserFid(fid); // Removed as per edit hint
          
                    // Check if user is in fantasy league (use current gameweek)
          const response = await fetch(`/api/manager-picks?fid=${fid}`);
          
          if (response.ok) {
            setIsInFantasyLeague(true);
            
            // If we have a selected match, also check for relevant players
            if (selectedMatch) {
              const picksData = await response.json();
              const currentMatchTeams = [
                selectedMatch.homeTeam.toLowerCase(),
                selectedMatch.awayTeam.toLowerCase()
              ];
              
              const relevantPicks = picksData.picks?.filter((pick: EnrichedPick) => {
                const player = pick.player;
                if (!player || !player.team) return false;
                
                const playerTeam = player.team.short_name?.toLowerCase() || '';
                return currentMatchTeams.includes(playerTeam);
              }) || [];
              
              setHasRelevantPlayers(relevantPicks.length > 0);
              setRelevantPicks(relevantPicks);
            }
          } else {
            console.log(`Fantasy league check failed: ${response.status} - ${response.statusText}`);
            setIsInFantasyLeague(false);
            setHasRelevantPlayers(false);
            setRelevantPicks([]);
          }
        } else {
          setIsInFantasyLeague(false);
          setHasRelevantPlayers(false);
        }
      } catch (error) {
        console.error('Error checking fantasy league:', error);
        setIsInFantasyLeague(false);
        setHasRelevantPlayers(false);
        setRelevantPicks([]);
      }
    };
    
    if (sportId === 'eng.1') {
      checkFantasyLeague();
    }
  }, [sportId, selectedMatch]);

  // Check for existing chat room when component mounts
  useEffect(() => {
    const checkExistingChatRoom = async () => {
      try {
        // Use match data utilities for consistent processing
        const matchData = createRichMatchData(event, teams, sportId);
        // const leagueId = matchData.competition;
        const baseId = matchData.eventId;
        
        console.log("Checking for existing chat room:", baseId);
        setCheckingRoom(true);
        
        const candidates = [baseId, `${baseId}_`];
        let found: string | null = null;
        
        // First, try to find existing room
        for (const id of candidates) {
          const res = await fetch(`/api/match-rooms?eventId=${encodeURIComponent(id)}`);
          const data = await res.json();
          if (data?.room?.castHash) {
            found = data.room.castHash;
            break;
          }
        }
        
        setChatRoomHash(found);
        setCheckingRoom(false);
        
        if (found) {
          console.log(`✅ Found existing chat room for ${baseId}:`, found);
        } else {
          console.log(`❌ No existing chat room for ${baseId}`);
        }
      } catch (error) {
        console.error('Error checking for existing chat room:', error);
        setChatRoomHash(null);
        setCheckingRoom(false);
      }
    };
    
    // Check for existing room when component mounts
    checkExistingChatRoom();
  }, [event, teams, sportId]);

  // Function to refresh chat room status (can be called after successful cast)
  const refreshChatRoomStatus = async () => {
    try {
      const matchData = createRichMatchData(event, teams, sportId);
      const baseId = matchData.eventId;
      
      console.log("Refreshing chat room status for:", baseId);
      setCheckingRoom(true);
      
      const candidates = [baseId, `${baseId}_`];
      let found: string | null = null;
      
      for (const id of candidates) {
        const res = await fetch(`/api/match-rooms?eventId=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (data?.room?.castHash) {
          found = data.room.castHash;
          break;
        }
      }
      
      setChatRoomHash(found);
      setCheckingRoom(false);
      
      if (found) {
        console.log(`✅ Room found after refresh for ${baseId}:`, found);
      }
    } catch (error) {
      console.error('Error refreshing chat room status:', error);
      setChatRoomHash(null);
      setCheckingRoom(false);
    }
  };
   // useEffect(() => {
   //   const fetchPrice = async () => {
   //     try {
   //       const price = await fetchNativeTokenPrice('base');
   //       setEthPrice(price);
   //     } catch (error) {
   //       console.error('Failed to fetch ETH price:', error);
   //       setEthPrice(null);
   //       // Consider adding retry logic here
   //     }
   //   };
   
   //   fetchPrice();
   // }, []);

  // Extract match info from event data using utilities
  const competitorsLong = event.name;
  
  const eventStarted = new Date() >= new Date(event.date);
  const clock = event.status.displayClock + ' ' + event.status.type.detail || '00:00';

  // Use match data utilities for consistent processing
  const matchData = createRichMatchData(event, teams, sportId);
  const homeTeam = matchData.homeTeam;
  const awayTeam = matchData.awayTeam;
  const homeScore = matchData.homeScore;
  const awayScore = matchData.awayScore;
  
  const homeTeamLogo = event.competitions[0]?.competitors[0]?.team.logo;
  const awayTeamLogo = event.competitions[0]?.competitors[1]?.team.logo;
  const [chatRoomHash, setChatRoomHash] = useState<string | null>(null);
  const [checkingRoom, setCheckingRoom] = useState<boolean>(false);

  const keyMoments: KeyMoment[] = event.competitions[0]?.details
    ?.sort((a: Detail, b: Detail) => {
      const timeA = a.clock.displayValue || "00:00";
      const timeB = b.clock.displayValue || "00:00";
      const secondsA = timeA.split(":").reduce((min, sec) => min * 60 + parseInt(sec, 10), 0);
      const secondsB = timeB.split(":").reduce((min, sec) => min * 60 + parseInt(sec, 10), 0);
      return secondsA - secondsB;
    })
    ?.reduce((acc: KeyMoment[], detail: Detail) => {
      const playerName = detail.athletesInvolved?.[0]?.displayName || "Coaching staff";
      const action = detail.type.text;
      const time = detail.clock.displayValue || "00:00";
      const teamId = detail.team.id;

      let teamLogo = "";
      let teamName = "";
      if (teamId === event.competitions[0]?.competitors[0]?.team.id) {
        teamLogo = homeTeamLogo;
        teamName = homeTeam;
      } else {
        teamLogo = awayTeamLogo;
        teamName = awayTeam;
      }

      acc.push({
        playerName,
        times: [time],
        action:
          action === "Goal" || action === "Goal - Header" || action === "Penalty - Scored" ||
          action === "Goal - Volley" || action === "Goal - Free-kick" || action === "Own Goal"
            ? action === "Own Goal" ? `🔴` : `⚽️`
            : action === "Yellow Card"
            ? `🟨`
            : action === "Red Card"
            ? `🟥`
            : `${action} ${teamName}`,
        logo: teamLogo,
        teamName,
      });
      return acc;
    }, []) || [];

    const handleSelectMatch = () => {
      const keyMomentStrings = keyMoments.map((moment) => {
        const formattedTime = moment.times?.join(", ") || "No time provided";
        return `${moment.action} ${moment.teamName} by ${moment.playerName} at ${formattedTime}`;
      });
    
      // Use match data utilities for consistent processing
      const leagueId = matchData.competition;
      const baseId = matchData.eventId;
      console.log("Event ID (canonical):", baseId);
    
      setSelectedMatch({
        homeTeam,
        awayTeam,
        competitorsLong,
        homeLogo: homeTeamLogo,
        awayLogo: awayTeamLogo,
        homeScore,
        awayScore,
        clock,
        eventStarted,
        keyMoments: keyMomentStrings,
        // Add rich match data for commentator integration
        matchEvents: matchData.matchEvents,
        competition: leagueId,
        eventId: baseId,
      });
    
      // Finally toggle the dropdown
      if (onToggle) {
        onToggle();
      }
    };







  // Removed unused readMatchSummary to satisfy linter

  const toggleDetails = () => {
    if (onToggle) {
      onToggle();
    }
  };





  return (
    <div key={event.id} className="sidebar">
      <div className="cursor-pointer border border-darkPurple">
        <div className="flex items-center mb-2 w-full">
          {/* Chat Room Affordance - positioned outside button */}
          {(() => {
            try {
              // Use the sportId prop which contains the actual competition (e.g., eng.league_cup)
              const leagueId = sportId || 'eng.1';
              
              // Only show chat affordance for Premier League matches (eng.1)
              if (leagueId !== 'eng.1') return null;
              
              const home = event.competitions[0]?.competitors[0]?.team.abbreviation?.toUpperCase() || '';
              const away = event.competitions[0]?.competitors[1]?.team.abbreviation?.toUpperCase() || '';
              const baseId = `${leagueId.replace('.', '_')}_${home}_${away}`;
              const appUrlRaw = process.env.NEXT_PUBLIC_URL || 'https://fc-footy.vercel.app';
              const appUrl = appUrlRaw.startsWith('http') ? appUrlRaw : `https://${appUrlRaw}`;
              const chatUrl = `${appUrl}/chat?eventId=${encodeURIComponent(baseId)}`;
              const isChatPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/chat');

              if (isChatPage) return null;
              if (checkingRoom) {
                return (
                  <div className="flex flex-col items-center w-8 opacity-90 mr-2">
                    <div className="inline-flex items-center justify-center w-5 h-5 bg-yellow-400 rounded-full">
                      <span className="text-sm">💬</span>
                    </div>
                  </div>
                );
              }
              if (chatRoomHash) {
                return (
                  <div className="flex flex-col items-center w-8 opacity-90 mr-2">
                  <a
                    href={chatUrl}
                      className="inline-flex items-center justify-center w-5 h-5 bg-limeGreen hover:bg-limeGreen/90 rounded-full transition-colors"
                      title="Join match chat"
                  >
                      💬
                  </a>
                  </div>
                );
              }
                            // No room exists - show share prompt
              return (
                <div className="flex flex-col items-center w-8 opacity-90 mr-2">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation(); // Prevent triggering the dropdown toggle
                      
                      // If dropdown is closed, open it first
                      if (!isOpen) {
                        handleSelectMatch();
                        if (onToggle) {
                          onToggle();
                        }
                        return;
                      }
                      
                      // If dropdown is open, do nothing - user should use the create room button
                      // This prevents the forever checking state
                    }}
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors ${
                      isOpen 
                        ? 'bg-gray-500 cursor-not-allowed opacity-50' 
                        : 'bg-fontRed hover:bg-fontRed/90 cursor-pointer'
                    }`}
                    title={isOpen ? "Use the 'Create room' button below" : "Tap to open match details"}
                    disabled={isOpen}
                  >
                    <span className="text-sm">💬</span>
                  </button>
                </div>
              );
            } catch {
              return null;
            }
          })()}
          
          <button
            onClick={() => {
              handleSelectMatch();
              toggleDetails();
            }}
            className="dropdown-button cursor-pointer flex items-center flex-1"
          >
            <div className="cursor-pointer text-lightPurple mr-4">
              {isOpen ? "▼" : "▷"}
            </div>
          <span className="flex justify-center items-center space-x-4 ml-2 mr-2">
            <div className="flex flex-col items-center space-y-1">
              <Image
                src={homeTeamLogo || "/assets/defifa_spinner.gif"}
                alt="Home Team Logo"
                className="w-8 h-8"
                width={20}
                height={20}
              />
              <span>{homeTeam}</span>
            </div>
            <div className="flex flex-col items-center space-y-1 w-20">
              {eventStarted ? (
                <>
                  <span className="text-white font-bold text-2xl">
                    {homeScore} - {awayScore}
                  </span>
                  <span className="text-lightPurple text-xs text-center">{clock}</span>
                </>
              ) : (
                <span className="flex flex-col items-center">
                  <span>Kickoff:</span>
                  <span className="text-sm text-lightPurple text-center">
                    {new Date(event.date).toLocaleString("en-GB", {
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                     
                    })}
                  </span>
                </span>
              )}
            </div>
            <div className="flex flex-col items-center space-y-1">
              <Image
                src={awayTeamLogo || "/assets/defifa_spinner.gif"}
                alt="Away Team Logo"
                className="w-8 h-8"
                width={20}
                height={20}
              />
              <span>{awayTeam}</span>
            </div>
          </span>
        </button>
        </div>

       
      {isOpen && selectedMatch && (
        <div ref={elementRef} className="mt-2 bg-purplePanel p-2 rounded-lg">
          {keyMoments.length > 0 && (
            <>
              <h4 className="text-notWhite font-semibold mb-2">Key Moments:</h4>
              <div className="space-y-1">
                {keyMoments.map((moment, index) => (
                  <div key={index} className="text-sm text-lightPurple flex items-center">
                    <span className="mr-2 font-bold">{moment.action}</span>
                    <Image
                      src={moment.logo || "/assets/defifa_spinner.gif"}
                      alt={`${moment.teamName} Logo`}
                      className="w-6 h-6 mr-2"
                      width={15}
                      height={15}
                    />
                    <span>{moment.playerName}</span>
                    <span className="text-xs ml-1">{moment.times.join(", ")}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {/* Fantasy Impact Section - Only show for Premier League matches with relevant players that have started */}
          {sportId === 'eng.1' && isInFantasyLeague === true && hasRelevantPlayers === true && relevantPicks.length > 0 && selectedMatch.eventStarted && (
            <div className="mt-4">
              <FantasyImpactCompact
                relevantPicks={relevantPicks}
                homeTeam={selectedMatch.homeTeam}
                awayTeam={selectedMatch.awayTeam}
                teams={teams}
              />
            </div>
          )}
          
          {/* Combined Fan Avatars Section */}

          {/* Following section temporarily disabled
          {isTempOff ? (
          <div className="mt-4">
            <h3 className="text-notWhite font-semibold mb-1">
              Following ({matchFanAvatarsTeam1.length + matchFanAvatarsTeam2.length})
            </h3>
          <div className="flex items-center gap-4 text-xs text-lightPurple mb-2">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-blue-500 rounded-full"></span>
              <span>Home ({matchFanAvatarsTeam1.length})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-yellow-500 rounded-full"></span>
              <span>Away ({matchFanAvatarsTeam2.length})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-purple-500 rounded-full"></span>
              Both ({
                matchFanAvatarsTeam1.filter(fan1 =>
                  matchFanAvatarsTeam2.some(fan2 => fan2.fid === fan1.fid)
                ).length
              })
            </div>
          </div>
          <div className="grid grid-cols-10 gap-1">
            ):()}
  {isLoadingFans ? (
    <span className="text-sm text-gray-400">Loading{loadingDots}</span>
  ) : combinedFanAvatars.length > 0 ? (
    combinedFanAvatars
      .sort((a, b) => {
        const borderColorA = getBorderColor(a.fid);
        const borderColorB = getBorderColor(b.fid);

        // Define the order: purple (Both) > blue (Home) > yellow (Away)
        const colorPriority: { [key: string]: number } = {
          'border-purple-500': 1, // Both (highest priority)
          'border-blue-500': 2,   // Home
          'border-yellow-500': 3, // Away
          'border-gray-400': 4,   // Fallback (lowest priority)
        };

        return colorPriority[borderColorA] - colorPriority[borderColorB];
      })
      .map((fan) => (
        <button
          key={fan.fid}
          onClick={() => sdk.actions.viewProfile({ fid: fan.fid })}
          className={`rounded-full border-2 ${getBorderColor(fan.fid)} focus:outline-none w-6 h-6 flex items-center justify-center`}
        >
          <Image
            src={fan.pfp}
            alt={`Fan ${fan.fid}`}
            width={20}
            height={20}
            className="rounded-full aspect-square object-cover w-5 h-5"
          />
        </button>
      ))
  ) : (
    <span className="text-sm text-gray-400">No fans found.</span>
  )}
</div>
          </div>

          {/* AI Summary Section */}
          <div className="mt-4 flex flex-row gap-4 justify-center items-center">
            <WarpcastShareButton
              selectedMatch={selectedMatch}
              compositeImage={true}
              leagueId={(() => {
                const homeAbbr = event.competitions[0]?.competitors[0]?.team.abbreviation.toLowerCase();
                const awayAbbr = event.competitions[0]?.competitors[1]?.team.abbreviation.toLowerCase();
                const homeTeamData = teams.find((t) => t.abbreviation.toLowerCase() === homeAbbr);
                const awayTeamData = teams.find((t) => t.abbreviation.toLowerCase() === awayAbbr);
                return homeTeamData?.league || awayTeamData?.league || '';
              })()}
              chatRoomExists={!!chatRoomHash}
              checkingChatRoom={checkingRoom}
              isPremierLeague={sportId === 'eng.1'}
              onRoomCreated={(castHash?: string) => {
                if (castHash) {
                  // Directly set the chat room hash without re-checking the database
                  setChatRoomHash(castHash);
                  console.log(`✅ Room created, setting hash directly:`, castHash);
                } else {
                  // Fallback to refresh if no castHash provided
                  refreshChatRoomStatus();
                }
              }}
            />
          </div>



          {/* {ssGames.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-notWhite font-semibold mb-2">ScoreSquare Games:</h4>
              {ssGames.map((game) => (
                <Link
                  key={game.gameId}
                  href={`/?tab=moneyGames&gameType=scoreSquare&eventId=${game.eventId}`}
                  className="block"
                >
                <div className="mt-4 relative group">
                    <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <span className="text-white text-sm font-semibold">👆 Tap to Play</span>
                  
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg shadow-md z-0">
                      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                        <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-0.5 opacity-5">
                          {Array.from({ length: 25 }).map((_, i) => {
                            const isEven = i % 2 === 0;
                            const logoSrc = isEven ? homeTeamLogo : awayTeamLogo;
                            return (
                              <Image
                                key={i}
                                src={logoSrc || "/assets/defifa_spinner.gif"}
                                alt="Team Logo"
                                className="w-full h-full object-cover rounded-sm"
                                width={40}
                                height={40}
                                style={{
                                  animationDelay: `${i * 0.1}s`,
                                  animationDuration: '1.5s',
                                  animationName: 'fall-in',
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                      {(() => {
                        
                          const squarePrice = parseFloat(game.squarePrice) / 1e18;
                          const deployerFee = parseFloat(game.deployerFeePercent || "0");
                          const communityFeeRate = 4; // percent
                          const netMultiplier = (100 - deployerFee - communityFeeRate) / 100;
                          const totalPool = 25 * squarePrice;
                          const netPrizePool = totalPool * netMultiplier;
                          const refereeFee = totalPool * (deployerFee / 100);
                          const communityFee = totalPool * (communityFeeRate / 100);
                          const usdPrizePool = ethPrice ? netPrizePool * ethPrice : null;


                        
                        return (
                          <>
                            <div className="flex justify-between items-start text-notWhite text-md font-bold border-b border-gray-700 pb-2">
                              <div className="flex items-center gap-2">
                                <FaTrophy className="text-orange-400" />
                                <p>Prize Pool:</p>
                              </div>
                              <div className="flex flex-col items-end -mt-1">
                                <p className="text-limeGreenOpacity">{netPrizePool.toFixed(3)} Ξ</p>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {usdPrizePool !== null ? (
                                    `~$${usdPrizePool.toLocaleString('en-US', { 
                                      minimumFractionDigits: 2, 
                                      maximumFractionDigits: 2 
                                    })}`
                                  ) : (
                                    <span className="text-gray-500">$</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mb-2 text-notWhite text-sm">
                              <FarcasterAvatar address={game.referee} showName />  <p>is the referee</p>
                            </div>
                            <div className="flex justify-between items-center text-notWhite text-sm mt-3">
                              <div className="flex items-center gap-4">
                                <FaTicketAlt className="text-blue-400" />
                                <p>Ticket Price:</p>
                              </div>
                              <p className="text-lightPurple">{squarePrice.toFixed(3)} Ξ</p>
                            </div>

                            <div className="flex justify-between items-center text-notWhite text-sm mt-2">
                              <div className="flex items-left gap-2">
                                <RefereeIcon size={20} />
                                <p>Referee Bonus:</p>
                              </div>
                              <p className="text-deepPink">({refereeFee.toFixed(3)} Ξ)</p>
                            </div>

                            <div className="flex justify-between items-center text-notWhite text-sm mt-2">
                              <div className="flex items-left gap-3">
                                <p>🛠️</p>
                                <p>Community 4%:</p>

                            </div>
                              <p className="text-deepPink">({communityFee.toFixed(3)} Ξ)</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )} */}
          {/* <div className="mt-4">
            <ContestScoreSquare 
              home={event.competitions?.[0]?.competitors?.[0]?.team?.abbreviation || ''} 
              away={event.competitions?.[0]?.competitors?.[1]?.team?.abbreviation || ''}
              homeScore={homeScore}
              awayScore={awayScore} 
            />
          </div> */}

        </div>
      )}
      </div>
    </div>
  );
};

export default MatchEventCard;
 