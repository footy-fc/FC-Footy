import React, { useState, useRef, useEffect } from 'react';
import { useApolloClient } from '@apollo/client';
import Image from 'next/image';
import Link from 'next/link';
import { FaTrophy, FaTicketAlt } from 'react-icons/fa';
import RefereeIcon from '../components/ui/RefereeIcon';
import RAGameContext from './ai/RAGameContext';
import { WarpcastShareButton } from './ui/WarpcastShareButton';
import { getFansForTeam } from '../lib/kvPerferences';
import { fetchFanUserData } from './utils/fetchFCProfile';
import { fetchTeamLogos } from './utils/fetchTeamLogos';
import { GET_SS_GAMES } from '../lib/graphql/queries';
import FarcasterAvatar from './FarcasterAvatar';
import sdk from '@farcaster/frame-sdk';
import { fetchNativeTokenPrice } from '~/utils/fetchUsdPrice';
// import ContestScoreSquare from './ContestScoreSquare';
// import ContestScoreSquareCreate from './ContestScoreSquareCreate';

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
}

// Extended Team interface (from fetchTeamLogos) including league information.
interface Team {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
}

const MatchEventCard: React.FC<EventCardProps> = ({ event, sportId }) => {
  const [selectedMatch, setSelectedMatch] = useState<SelectedMatch | null>(null);
  const [gameContext, setGameContext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGameContext, setShowGameContext] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  // State for fan avatar rows for team1 and team2
  const [matchFanAvatarsTeam1, setMatchFanAvatarsTeam1] = useState<Array<{ fid: number; pfp: string }>>([]);
  const [matchFanAvatarsTeam2, setMatchFanAvatarsTeam2] = useState<Array<{ fid: number; pfp: string }>>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingFans, setIsLoadingFans] = useState(false);
  const [loadingDots, setLoadingDots] = useState('');
  const elementRef = useRef<HTMLDivElement | null>(null);
  const fanCacheTeam1 = useRef<Map<number, string>>(new Map());
  const fanCacheTeam2 = useRef<Map<number, string>>(new Map());
  const hasLoadedFans = useRef(false);
  const client = useApolloClient();
  const [hasQueried, setHasQueried] = useState(false);
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [ssGames, setSsGames] = useState<
    Array<{ eventId: string; gameId: string; referee: string; prizePool: string; squarePrice: string; deployerFeePercent: string }>>([]);
  useEffect(() => {
    setHasQueried(false);
  }, [event.id]);

  // Animate three dots every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Fetch team logos (which include league information) on mount.
  useEffect(() => {
    fetchTeamLogos().then((data) => setTeams(data));
  }, []);
   useEffect(() => {
    const fetchPrice = async () => {
      try {
        const price = await fetchNativeTokenPrice('base');
        setEthPrice(price);
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
        setEthPrice(null);
        // Consider adding retry logic here
      }
    };
    
    fetchPrice();
  }, []);

  // Extract match info from event data.
  const competitorsLong = event.name;
  const homeTeam = event.shortName.slice(6, 9);
  const awayTeam = event.shortName.slice(0, 3);
  
  const eventStarted = new Date() >= new Date(event.date);
  const clock = event.status.displayClock + ' ' + event.status.type.detail || '00:00';

  const homeTeamLogo = event.competitions[0]?.competitors[0]?.team.logo;
  const awayTeamLogo = event.competitions[0]?.competitors[1]?.team.logo;
  const homeScore = event.competitions[0]?.competitors[0]?.score;
  const awayScore = event.competitions[0]?.competitors[1]?.score;

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
    
      const normalizedSportId = sportId.replace(/\./g, "_");
      const eventId = `${normalizedSportId}_${homeTeam}_${awayTeam}_`;
      console.log("Event ID:", eventId);
    
      // Only fetch on first open
      if (!showDetails && !hasQueried) {
        client
          .query({
            query: GET_SS_GAMES,
            variables: { prefix: eventId },
          })
          .then((result) => {
            console.log("Subgraph GET_SS_GAMES:", result.data);
            setHasQueried(true);
            setSsGames(result.data.games); // Store subgraph results
          })
          .catch((err) => {
            console.error("Subgraph query error:", err);
          });
      }
    
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
      });
    
      // Finally toggle the dropdown
      setShowDetails((prev) => !prev);
    };

  const fetchAiSummary = async () => {
    if (selectedMatch) {
      try {
        if (!showGameContext && !gameContext) {
          setLoading(true);
          const data = await RAGameContext(event.id, sportId, competitorsLong);
          if (data && typeof data === 'string') {
            setGameContext(data);
          } else {
            setGameContext('Failed to fetch AI context.');
          }
        }
        setShowGameContext((prev) => !prev);
      } catch (error) {
        setGameContext('Failed to fetch game context.');
        console.error('Failed to fetch game context:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const readMatchSummary = () => {
    if (gameContext) {
      const utterance = new SpeechSynthesisUtterance(gameContext);
      utterance.rate = 1.5;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  // Fetch team fan avatars.
// Fetch team fan avatars (refactored for speed)
useEffect(() => {
  const fetchTeamFanAvatars = async () => {
    setIsLoadingFans(true);
    const team1 = event.competitions[0]?.competitors[0]?.team;
    const team2 = event.competitions[0]?.competitors[1]?.team;
    if (!team1 || !team2) {
      console.error("Match teams not defined.");
      setIsLoadingFans(false);
      return;
    }
    try {
      // Determine unique IDs using league info if available.
      console.log("Teams:", teams);
      const team1Data = teams.find(
        (t) => t.abbreviation.toLowerCase() === team1.abbreviation.toLowerCase()
      );
      const team2Data = teams.find(
        (t) => t.abbreviation.toLowerCase() === team2.abbreviation.toLowerCase()
      );
      const team1UniqueId = team1Data
        ? `${team1Data.league}-${team1Data.abbreviation.toLowerCase()}`
        : team1.abbreviation.toLowerCase();
      const team2UniqueId = team2Data
        ? `${team2Data.league}-${team2Data.abbreviation.toLowerCase()}`
        : team2.abbreviation.toLowerCase();

      // Fetch fan FIDs for both teams in parallel.
      const [fanFidsTeam1Raw, fanFidsTeam2Raw] = await Promise.all([
        getFansForTeam(team1UniqueId),
        getFansForTeam(team2UniqueId),
      ]);

      // Ensure fan IDs are numbers.
      const fanFidsTeam1 = fanFidsTeam1Raw.map(fid => Number(fid));
      const fanFidsTeam2 = fanFidsTeam2Raw.map(fid => Number(fid));

      // Combine both arrays and deduplicate.
      const allFids = Array.from(new Set([...fanFidsTeam1, ...fanFidsTeam2]));

      // Fetch all user data concurrently.
      const userDataResults = await Promise.all(
        allFids.map((fid) => fetchFanUserData(fid))
      );

      // Build a map from fid to profile picture.
      const fidToPfp = new Map<number, string>();
      userDataResults.forEach((userData, index) => {
        const fid = allFids[index];
        const pfp = userData?.USER_DATA_TYPE_PFP?.[0];
        if (userData && pfp) {
          fidToPfp.set(fid, pfp);
        }
      });

      // Rebuild avatars for each team using the combined map.
      const team1Avatars = fanFidsTeam1
        .filter((fid) => fidToPfp.has(fid))
        .map((fid) => ({ fid, pfp: fidToPfp.get(fid)! }));
      const team2Avatars = fanFidsTeam2
        .filter((fid) => fidToPfp.has(fid))
        .map((fid) => ({ fid, pfp: fidToPfp.get(fid)! }));

      // Update caches if not already populated.
      if (fanCacheTeam1.current.size === 0) {
        team1Avatars.forEach(({ fid, pfp }) => fanCacheTeam1.current.set(fid, pfp));
      }
      if (fanCacheTeam2.current.size === 0) {
        team2Avatars.forEach(({ fid, pfp }) => fanCacheTeam2.current.set(fid, pfp));
      }

      setMatchFanAvatarsTeam1(team1Avatars);
      setMatchFanAvatarsTeam2(team2Avatars);
      hasLoadedFans.current = true;
    } catch (error) {
      console.error("Error fetching match fan avatars:", error);
    } finally {
      setIsLoadingFans(false);
    }
  };

  if (showDetails && !hasLoadedFans.current) {
    fetchTeamFanAvatars();
  }
}, [showDetails, event, teams]);

  const combinedFanAvatars = Array.from(
    new Map(
      [...matchFanAvatarsTeam1, ...matchFanAvatarsTeam2].map((fan) => [
        fan.fid,
        { fid: fan.fid, pfp: fan.pfp },
      ])
    ).values()
  );

  const getBorderColor = (fid: number): string => {
    const inTeam1 = matchFanAvatarsTeam1.some((fan) => fan.fid === fid);
    const inTeam2 = matchFanAvatarsTeam2.some((fan) => fan.fid === fid);
    if (inTeam1 && inTeam2) return 'border-purple-500'; // Shared follower color
    if (inTeam1) return 'border-blue-500'; // Team 1 color Home
    if (inTeam2) return 'border-yellow-500';  // Team 2 color Away
    return 'border-gray-400'; // Fallback
  };

  return (
    <div key={event.id} className="sidebar">
      <div className="cursor-pointer border border-darkPurple">
        <button
          onClick={() => {
            handleSelectMatch();
            toggleDetails();
          }}
          className="dropdown-button cursor-pointer flex items-center mb-2 w-full"
        >
          <div className="cursor-pointer text-lightPurple mr-4">
            {showDetails ? "▼" : "▷"}
          </div>
          <span className="flex justify-center space-x-4 ml-2 mr-2">
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
            <div className="flex flex-col items-center space-y-1">
              {eventStarted ? (
                <>
                  <span className="text-white font-bold text-2xl">
                    {homeScore} - {awayScore}
                  </span>
                  <span className="text-lightPurple text-xs">{clock}</span>
                </>
              ) : (
                <span className="flex flex-col items-center">
                  <span>Kickoff:</span>
                  <span className="text-sm text-lightPurple">
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

      {showDetails && selectedMatch && (
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

          {/* Combined Fan Avatars Section */}
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
              <span>Both ({combinedFanAvatars.length})</span>
            </div>
          </div>
          <div className="grid grid-cols-10 gap-1">
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
            <button
              className="w-full sm:w-38 bg-deepPink text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-fontRed"
              onClick={async () => {
                try {
                  await sdk.haptics.impactOccurred('medium');
                } catch {
                  // ignore haptics errors
                }
                fetchAiSummary();
              }}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-white"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 2.577 1.03 4.91 2.709 6.709l1.291-1.418z"
                    ></path>
                  </svg>
                  Waiting for VAR...
                </div>
              ) : (
                showGameContext ? "Hide" : eventStarted ? "Summary" : "Preview"
              )}
            </button>

            <WarpcastShareButton
              selectedMatch={selectedMatch}
              buttonText="Share Match"
              compositeImage={true}
              leagueId={(() => {
                const homeAbbr = event.competitions[0]?.competitors[0]?.team.abbreviation.toLowerCase();
                const awayAbbr = event.competitions[0]?.competitors[1]?.team.abbreviation.toLowerCase();
                const homeTeamData = teams.find((t) => t.abbreviation.toLowerCase() === homeAbbr);
                const awayTeamData = teams.find((t) => t.abbreviation.toLowerCase() === awayAbbr);
                return homeTeamData?.league || awayTeamData?.league || '';
              })()}
            />
          </div>
          {showGameContext && gameContext && (
            <div className="mt-4 text-lightPurple bg-purplePanel">
              <h2 className="font-2xl text-notWhite font-bold mb-4">
                <button onClick={readMatchSummary}>
                  {eventStarted ? `[AI] Match Summary 🗣️🎧1.5x` : `[AI] Match Preview 🗣️🎧1.5x`}
                </button>
              </h2>
              <pre className="text-sm whitespace-pre-wrap break-words mb-4">{gameContext}</pre>
            </div>
          )}
          {ssGames.length > 0 && (
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
          )}
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
  );
};

export default MatchEventCard;
 