import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { sdk } from '@farcaster/miniapp-sdk';
import { getTeamPreferences, getPrimaryFanCountForTeam, getPrimaryFansForTeam, isCountryTeamId, isClubTeamId } from "../lib/kvPerferences";
import { getTeamLogo } from "./utils/fetchTeamLogos";
import { fetchFollowingStatuses } from './utils/fetchCheckIfFollowing';
import SettingsFollowClubs from './SettingsFollowClubs';
import type { FanPair } from "./utils/getAlikeFanMatches";
import { fetchFanUserData } from './utils/fetchFCProfile';

type TeamLink = {
  href: string;
  text?: string;
  shortText?: string;
};

interface ForYouTeamsFansProps {
  viewerFid?: number;
  initialSelectedTeam?: string;
}

const ForYouTeamsFans: React.FC<ForYouTeamsFansProps> = ({ viewerFid, initialSelectedTeam }) => {
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [currentFid, setCurrentFid] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [teamLinks, setTeamLinks] = useState<Record<string, TeamLink[]>>({});
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [favoriteTeamFans, setFavoriteTeamFans] = useState<Array<{ fid: number; pfp: string; youFollow: boolean; username?: string }>>([]);
  const [fanCount, setFanCount] = useState<number>(0);
  const [loadingFollowers, setLoadingFollowers] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cachedTeamFollowers, setCachedTeamFollowers] = useState<Record<string, Array<{ fid: number; pfp: string; youFollow: boolean; username?: string }>>>({});
  const [showMatchUps, setShowMatchUps] = useState(false);
  const [matchUps, setMatchUps] = useState<FanPair[]>([]);
  const primaryClub = favoriteTeams.find((teamId) => isClubTeamId(teamId)) ?? null;
  const primaryCountry = favoriteTeams.find((teamId) => isCountryTeamId(teamId)) ?? null;
  const followingTeams = favoriteTeams.filter((teamId) => teamId !== primaryClub && teamId !== primaryCountry);

  const fetchFavoriteTeams = async () => {
    try {
      let ctxFid = viewerFid ?? null;
      if (!ctxFid) {
        const context = await sdk.context;
        console.log('context now', context.user);
        ctxFid = context.user?.fid ?? null;
      }
      setCurrentFid(ctxFid ? Number(ctxFid) : null);

      if (!ctxFid) {
        setError("You need to link your Farcaster account to see your favorite teams.");
        return;
      }

      const preferences = await getTeamPreferences(Number(ctxFid));
      if (preferences && preferences.length > 0) {
        // console.log("Fetched team preferences:", preferences);
        setFavoriteTeams(preferences);
        setShowSettings(false);
      } else {
        setShowSettings(true);
        setFavoriteTeams([]);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching team preferences:", error.message);
      } else {
        console.error("Unknown error fetching team preferences:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedTeam) return;
    let cancelled = false;

    getPrimaryFanCountForTeam(selectedTeam.toLowerCase())
      .then(count => {
        if (!cancelled) {
          setFanCount(count);
        }
      })
      .catch(err => console.error('Error fetching fan count:', err));

    // If we have cached followers for this team, use them and avoid refetching
    if (cachedTeamFollowers[selectedTeam]) {
      setFavoriteTeamFans(cachedTeamFollowers[selectedTeam]);
      setLoadingFollowers(false);
      return;
    }
    
    // Clear out previous fans and show loading state
    setFavoriteTeamFans([]);
    setShowMatchUps(false);
    setMatchUps([]);
    setLoadingFollowers(true);

    const fetchFans = async () => {
      try {
        const fanFids = await getPrimaryFansForTeam(selectedTeam.toLowerCase());
        const currentViewerFid = viewerFid ?? currentFid;
        if (!currentViewerFid) {
          console.error("No current fid found");
          return;
        }
        
        // Convert the fan FIDs to numbers
        const numericFids = fanFids.map(Number);
        
        // Team fans are already known from Redis; only resolve whether you follow them.
        const followingMap = await fetchFollowingStatuses(currentViewerFid, numericFids);
        
        const userDatas = await Promise.all(numericFids.map(fid => fetchFanUserData(fid)));
        const fans = numericFids.reduce<Array<{ fid: number; pfp: string; youFollow: boolean; username?: string }>>((acc, fid, index) => {
          const userData = userDatas[index];
          const pfp = userData?.USER_DATA_TYPE_PFP?.[0];
          const uname = (userData?.USER_DATA_TYPE_USERNAME?.[0] || '').toLowerCase();
          if (pfp) {
            const youFollow = Boolean(followingMap[fid]);
            acc.push({ fid, pfp, youFollow, username: uname || undefined });
          }
          return acc;
        }, []);
        
        if (!cancelled) {
          // Cache the fetched fans for this team
          setCachedTeamFollowers(prev => ({ ...prev, [selectedTeam]: fans }));
          setFavoriteTeamFans(fans);
        }
      } catch (err) {
        console.error("Error fetching fans:", err);
      } finally {
        if (!cancelled) {
          setLoadingFollowers(false);
        }
      }
    };
    
    fetchFans();
    
    return () => {
      cancelled = true;
    };
  }, [selectedTeam, cachedTeamFollowers, viewerFid]);

  // Fetch the user's favorite teams from Redis
  useEffect(() => {
    fetchFavoriteTeams();
  }, []);

  useEffect(() => {
    if (favoriteTeams.length === 0) return;

    const leagueMap: Record<string, string[]> = {};

    favoriteTeams.forEach((teamId) => {
      const [league, abbr] = teamId.split("-");
      if (!leagueMap[league]) {
        leagueMap[league] = [];
      }
      leagueMap[league].push(abbr);
    });

    Object.entries(leagueMap).forEach(([league, abbrs]) => {
      fetchTeamLinksByLeague(league, abbrs);
    });
  }, [favoriteTeams, selectedTeam]);

  useEffect(() => {
    if (favoriteTeams.length === 0) {
      return;
    }

    if (initialSelectedTeam && favoriteTeams.includes(initialSelectedTeam)) {
      setSelectedTeam(initialSelectedTeam);
      return;
    }

    if (!selectedTeam) {
      setSelectedTeam(primaryClub ?? primaryCountry ?? favoriteTeams[0]);
    }
  }, [favoriteTeams, initialSelectedTeam, primaryClub, primaryCountry, selectedTeam]);

  const getTeamLogoUrl = (teamId: string): string => {
    const [league, abbr] = teamId.split("-");
    return getTeamLogo(abbr, league);
  };

  const fetchTeamLinksByLeague = async (league: string, teamAbbrs: string[]) => {
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams`);
      const data = await res.json();
      const teams = data?.sports?.[0]?.leagues?.[0]?.teams || [];

      const newLinks: Record<string, TeamLink[]> = {};
      teamAbbrs.forEach((abbr) => {
        const matched = teams.find(
          (t: { team: { abbreviation: string } }) => t.team.abbreviation.toLowerCase() === abbr.toLowerCase()
        );
        if (matched?.team?.links) {
          newLinks[abbr] = matched.team.links;
        }
      });

      setTeamLinks((prev) => ({
        ...prev,
        ...newLinks
      }));
    } catch (err) {
      console.error(`Failed to fetch team links for league ${league}`, err);
    }
  };

  if (loading) return <div>For you today</div>;
  if (error) return <div>{error}</div>;
  console.log("teamLinks", teamLinks);
  if (showSettings) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-notWhite text-xl sm:text-2xl font-bold">Choose your club</h2>
        </div>
        <div className="mb-4">
          <ul className="list-disc list-inside space-y-2 text-base text-lightPurple">
            <li>⭐ Pick one club to wear as your badge on Footy</li>
            <li>🤝 Meet other fans who wear the same badge</li>
            <li>🔔 Follow more clubs or countries for alerts</li>
          </ul>
        </div>
        <SettingsFollowClubs viewerFid={viewerFid} onSave={(newFavorites: string[]) => {
          setFavoriteTeams(newFavorites);
          setSelectedTeam(newFavorites[0] ?? null);
          setShowSettings(false);
        }} />
      </div>
    );
  }
  return (
    <div className="bg-purplePanel text-lightPurple rounded-lg p-1 overflow-hidden">
      <div className="space-y-4 p-3">
        <section className="relative overflow-hidden rounded-[26px] border border-yellow-300/20 bg-[radial-gradient(circle_at_top_left,rgba(255,214,102,0.16),transparent_32%),linear-gradient(145deg,rgba(23,19,32,0.98),rgba(30,22,48,0.96))] p-4">
          <div className="pointer-events-none absolute right-[-40px] top-[-40px] h-32 w-32 rounded-full bg-yellow-300/5 blur-2xl" />
          {primaryClub ? (
            <div className="relative flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-yellow-200/80">My Club</div>
                  <button
                    type="button"
                    onClick={() => setShowSettings(true)}
                    className="rounded-full border border-yellow-300/20 bg-yellow-300/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-yellow-100 transition-colors hover:bg-yellow-300/14"
                  >
                    Change
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[24px] border border-yellow-300/18 bg-black/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <Image
                      src={getTeamLogoUrl(primaryClub)}
                      alt={primaryClub}
                      width={72}
                      height={72}
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[42px] font-black uppercase leading-none tracking-[-0.04em] text-[#ff9d7b]">
                      {primaryClub.split('-')[1]}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-yellow-300/16 bg-yellow-300/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-yellow-100/85">
                        Badge
                      </span>
                      <span className="rounded-full border border-lightPurple/12 bg-black/14 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-lightPurple/78">
                        Club Identity
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-yellow-200/80">My Club</div>
                <p className="mt-2 text-sm text-lightPurple">Choose a club badge.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="rounded-full border border-yellow-300/20 bg-yellow-300/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-yellow-100 transition-colors hover:bg-yellow-300/14"
              >
                Select
              </button>
            </div>
          )}
        </section>

        <section className="relative overflow-hidden rounded-[26px] border border-sky-300/16 bg-[radial-gradient(circle_at_top_left,rgba(109,194,255,0.14),transparent_32%),linear-gradient(145deg,rgba(17,19,38,0.98),rgba(19,17,36,0.96))] p-4">
          <div className="pointer-events-none absolute left-[-30px] bottom-[-40px] h-32 w-32 rounded-full bg-sky-300/5 blur-2xl" />
          {primaryCountry ? (
            <div className="relative flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-sky-200/80">Favorite Country</div>
                  <button
                    type="button"
                    onClick={() => setShowSettings(true)}
                    className="rounded-full border border-sky-300/18 bg-sky-300/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100 transition-colors hover:bg-sky-300/14"
                  >
                    Change
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[24px] border border-sky-300/16 bg-black/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <Image
                      src={getTeamLogoUrl(primaryCountry)}
                      alt={primaryCountry}
                      width={72}
                      height={72}
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[42px] font-black uppercase leading-none tracking-[-0.04em] text-[#ff9d7b]">
                      {primaryCountry.split('-')[1]}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-sky-300/16 bg-sky-300/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100/85">
                        National Team
                      </span>
                      <span className="rounded-full border border-lightPurple/12 bg-black/14 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-lightPurple/78">
                        International
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-sky-200/80">Favorite Country</div>
                <p className="mt-2 text-sm text-lightPurple">Pick your national side.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="rounded-full border border-sky-300/18 bg-sky-300/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100 transition-colors hover:bg-sky-300/14"
              >
                Select
              </button>
            </div>
          )}
        </section>

        <section className="rounded-[22px] border border-limeGreenOpacity/15 bg-darkPurple/55 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-lightPurple/75">Club Fans</div>
              <h3 className="text-notWhite text-lg font-semibold">
                {selectedTeam ? `${selectedTeam.split('-')[1].toUpperCase()} badge holders` : 'Club fans'}
              </h3>
            </div>
          </div>
          {favoriteTeams.length > 0 ? (
            <div className="relative mb-4">
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#120f22] via-[#120f22]/88 to-transparent" />
              <div className="-mr-4 flex overflow-x-auto gap-3 pb-1 pr-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[primaryClub, primaryCountry, ...followingTeams].filter((teamId): teamId is string => Boolean(teamId)).map((teamId) => (
                <button
                  type="button"
                  key={teamId}
                  onClick={() => setSelectedTeam(teamId)}
                  className={`relative flex-none overflow-hidden rounded-[20px] border px-3 py-3 text-center transition-colors ${
                    teamId === selectedTeam
                      ? "border-limeGreenOpacity bg-[linear-gradient(180deg,rgba(173,255,47,0.08),rgba(35,28,57,0.92))] shadow-[0_10px_24px_rgba(173,255,47,0.08)]"
                      : "border-lightPurple/18 bg-[linear-gradient(180deg,rgba(20,18,34,0.96),rgba(29,23,48,0.86))]"
                  } ${teamId === primaryClub ? "w-[132px]" : teamId === primaryCountry ? "w-[132px]" : "w-[92px]"}`}
                >
                  <Image
                    src={getTeamLogoUrl(teamId)}
                    alt={teamId}
                    width={teamId === primaryClub || teamId === primaryCountry ? 52 : 42}
                    height={teamId === primaryClub || teamId === primaryCountry ? 52 : 42}
                    className="object-contain mb-2 mx-auto"
                  />
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lightPurple/78">
                    {teamId === primaryClub ? "Club" : teamId === primaryCountry ? "Country" : "Following"}
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase text-notWhite">
                    {teamId.split('-')[1]}
                  </div>
                </button>
              ))}
              </div>
            </div>
          ) : null}
          {selectedTeam && favoriteTeams.includes(selectedTeam) && (() => {
            const selectedIsCountry = isCountryTeamId(selectedTeam);
            return (
              <div className="relative rounded-lg overflow-hidden">
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <h3 className="text-notWhite">{selectedIsCountry ? `Country Fans (${fanCount})` : `Club Fans (${fanCount})`}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-lightPurple mb-2 ml-1">
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 ring-2 ring-limeGreen rounded-full inline-block"></span>
                      <span>You follow</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 ring-2 ring-fontRed rounded-full inline-block"></span>
                      <span>You don’t follow</span>
                    </div>
                  </div>
                  {loadingFollowers ? (
                    <div className="text-sm text-gray-400 animate-pulse">Loading fans...</div>
                  ) : (
                    <div className="grid grid-cols-10 gap-1 ml-1 mr-1">
                      {favoriteTeamFans.length > 0 ? (
                        favoriteTeamFans.map((fan) => (
                          <button
                            key={fan.fid}
                            onClick={async () => {
                              try { await sdk.haptics.impactOccurred('light'); } catch {}
                              sdk.actions.viewProfile({ fid: fan.fid });
                            }}
                            className={`rounded-full border-2 focus:outline-none w-6 h-6 flex items-center justify-center ${
                              fan.youFollow ? 'border-limeGreen' : 'border-fontRed'
                            }`}
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
                        <span className="text-sm text-gray-400">No badge holders found yet.</span>
                      )}
                    </div>
                  )}
                </div>
        {showMatchUps && (
          <div className="mt-4">
            <h2 className="text-notWhite text-md font-semibold mb-2">Fans Most Like You</h2>
            <ul className="space-y-2">
              {matchUps.slice(0, 8).map((pair, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <button
                    onClick={() => sdk.actions.viewProfile({ fid: pair.fid2 })}
                    className="focus:outline-none"
                  >
                    <Image
                      src={pair.pfp ?? '/defifa_spinner.gif'}
                      alt={`Fan ${pair.fid2}`}
                      width={32}
                      height={32}
                      className="rounded-full border"
                    />
                  </button>
                  <div>
                    <div className="flex gap-1">
                        {pair.teamLogos?.map((logo, idx) => (
                          typeof logo === 'string' ? (
                            <Image key={idx} src={logo} alt="Team" width={20} height={20} className="rounded-md" />
                          ) : null
                        ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
            );
          })()}
        </section>

        <section className="rounded-[22px] border border-limeGreenOpacity/15 bg-darkPurple/55 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-lightPurple/75">Following</div>
              <h3 className="text-notWhite text-lg font-semibold">Alerts and match tracking</h3>
              <p className="mt-1 text-sm text-lightPurple">
                Follow more clubs or countries here without changing your main badge.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="rounded-full border border-limeGreenOpacity/25 px-4 py-2 text-xs font-semibold text-lightPurple transition-colors hover:bg-darkPurple"
            >
              Manage following
            </button>
          </div>
          {followingTeams.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {followingTeams.map((teamId) => (
                <div
                  key={teamId}
                  className="flex items-center gap-2 rounded-full border border-limeGreenOpacity/20 bg-purplePanel px-3 py-2 text-xs font-medium text-lightPurple"
                >
                  <Image
                    src={getTeamLogoUrl(teamId)}
                    alt={teamId}
                    width={18}
                    height={18}
                    className="rounded-full"
                  />
                  <span>{teamId.split('-')[1].toUpperCase()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-limeGreenOpacity/20 bg-purplePanel/70 px-4 py-5 text-sm text-lightPurple">
              You are only tracking your badge club right now. Add more clubs or countries for alerts.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ForYouTeamsFans;
