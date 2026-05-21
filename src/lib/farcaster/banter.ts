import { getTeamPreferences } from '~/lib/kvPerferences';
import type { RichMatchEvent } from '~/types/commentatorTypes';
import type { MatchChannelCast, MatchThreadReply } from '~/lib/farcaster/matchThread';

export type FanAffinity = 'home' | 'away' | 'neutral' | 'split' | 'unknown';

export type FanAffinityContext = {
  favoriteTeamIds: string[];
  primaryClubId: string | null;
  affinity: FanAffinity;
};

export type ReplyAuthorContext = {
  fid: number;
  username?: string;
  displayName: string;
  pfpUrl: string | null;
  favoriteTeamIds: string[];
  primaryClubId: string | null;
  affinity: FanAffinity;
  text: string;
  timestamp?: string | number;
  hash: string;
};

export type CrowdAffinitySummary = {
  homeFans: number;
  awayFans: number;
  neutralFans: number;
  splitFans: number;
  unknownFans: number;
};

export type EspnMatchContext = {
  eventId?: string;
  status?: string;
  venue?: string;
  headlines: string[];
  links: {
    summary?: string;
    recap?: string;
    stats?: string;
  };
  broadcasts: string[];
  previewFacts: string[];
  narrativeAngles: string[];
  banterSignals: {
    formEdge: string[];
    recordEdge: string[];
    playerEdge: string[];
    oddsDisrespect: string[];
    homeGround: string[];
    finalDayPressure: string[];
    goalChaosPotential: string[];
  };
};

export type BanterSuggestion = {
  id: string;
  label: string;
  text: string;
  mode: 'same-side' | 'rival-poke' | 'player-specific';
};

const DEFAULT_MENTION_LINE = '@gabedev.eth @kmacb.eth are you in on this one?';

type ClubVoice = {
  nicknames: string[];
  shortLore: string[];
  chantFragments: string[];
  rivalryJabs: string[];
};

const CLUB_VOICE_PACKS: Record<string, ClubVoice> = {
  arsenal: {
    nicknames: ['Arsenal', 'the Gunners'],
    shortLore: ['North London standards', 'title-race nerves', 'Arteta-era chest out'],
    chantFragments: ['North London forever'],
    rivalryJabs: ['same old Arsenal if this goes wrong', 'Spurs fans will be counting the seconds'],
  },
  'aston villa': {
    nicknames: ['Villa'],
    shortLore: ['Holte End expectations', 'proper Villa Park noise', 'Unai chaos-ball'],
    chantFragments: ['Up the Villa'],
    rivalryJabs: ['this has late-Villa-heartbreak written all over it'],
  },
  bournemouth: {
    nicknames: ['Bournemouth', 'the Cherries'],
    shortLore: ['small club, annoying result', 'Dean Court nuisance energy'],
    chantFragments: ['Up the Cherries'],
    rivalryJabs: ['everyone still talks like Bournemouth should be grateful to be here'],
  },
  brentford: {
    nicknames: ['Brentford', 'the Bees'],
    shortLore: ['smart-club superiority', 'Brentford always make it awkward'],
    chantFragments: ['come on Brentford'],
    rivalryJabs: ['still getting treated like a spreadsheet with a badge'],
  },
  brighton: {
    nicknames: ['Brighton', 'the Seagulls'],
    shortLore: ['Brighton passing triangles', 'Amex patience and pain'],
    chantFragments: ['Seagulls'],
    rivalryJabs: ['Brighton will have 700 passes and still annoy everyone'],
  },
  burnley: {
    nicknames: ['Burnley', 'the Clarets'],
    shortLore: ['Turf Moor attrition', 'cold afternoon Burnley nonsense'],
    chantFragments: ['come on Burnley'],
    rivalryJabs: ['nobody enjoys a Turf Moor scrap except Burnley'],
  },
  chelsea: {
    nicknames: ['Chelsea', 'the Blues'],
    shortLore: ['Stamford Bridge entitlement', 'expensive squad, expensive expectations'],
    chantFragments: ['Carefree'],
    rivalryJabs: ['all those millions for this would write itself'],
  },
  'crystal palace': {
    nicknames: ['Palace', 'the Eagles'],
    shortLore: ['Selhurst under the lights', 'Palace chaos on the break'],
    chantFragments: ['Glad All Over'],
    rivalryJabs: ['Selhurst can turn a normal match feral quickly'],
  },
  everton: {
    nicknames: ['Everton', 'the Toffees'],
    shortLore: ['Everton that', 'goodison trauma carried to every away end'],
    chantFragments: ['come on you Blues'],
    rivalryJabs: ['Everton can make any game feel cursed'],
  },
  fulham: {
    nicknames: ['Fulham'],
    shortLore: ['Craven Cottage niceness with hidden bite', 'silky until they are not'],
    chantFragments: ['come on Fulham'],
    rivalryJabs: ['too many people still talk about Fulham like they are harmless'],
  },
  leeds: {
    nicknames: ['Leeds'],
    shortLore: ['Leeds chaos', 'Elland Road headloss'],
    chantFragments: ['Marching on Together'],
    rivalryJabs: ['Leeds will drag everyone into a mess'],
  },
  liverpool: {
    nicknames: ['Liverpool', 'the Reds'],
    shortLore: ['Anfield noise', 'everyone suddenly hears about mentality monsters again'],
    chantFragments: ['You’ll Never Walk Alone'],
    rivalryJabs: ['the Anfield aura chat gets loud very quickly'],
  },
  'manchester city': {
    nicknames: ['City'],
    shortLore: ['robotic control', 'Etihad inevitability chat'],
    chantFragments: ['come on City'],
    rivalryJabs: ['everyone hates when City make it look too easy'],
  },
  'manchester united': {
    nicknames: ['United'],
    shortLore: ['Theatre of Dreams pressure', 'United discourse never sleeps'],
    chantFragments: ['glory glory'],
    rivalryJabs: ['one decent half and the nostalgia starts immediately'],
  },
  newcastle: {
    nicknames: ['Newcastle', 'the Toon'],
    shortLore: ['Toon optimism', 'St James’ volume exported on the road'],
    chantFragments: ['Howay the lads'],
    rivalryJabs: ['Toon fans will believe anything after two good passes'],
  },
  'newcastle united': {
    nicknames: ['Newcastle', 'the Toon'],
    shortLore: ['Toon optimism', 'St James’ volume exported on the road'],
    chantFragments: ['Howay the lads'],
    rivalryJabs: ['Toon fans will believe anything after two good passes'],
  },
  'nottingham forest': {
    nicknames: ['Forest'],
    shortLore: ['European Cup heritage reminders', 'City Ground emotion'],
    chantFragments: ['Mull of Kintyre'],
    rivalryJabs: ['Forest will mention the history if this swings their way'],
  },
  'sunderland': {
    nicknames: ['Sunderland'],
    shortLore: ['Stadium of Light volume', 'Sunderland live for a big scalp'],
    chantFragments: ['Wise Men Say'],
    rivalryJabs: ['Sunderland will turn this into a cup tie if allowed'],
  },
  tottenham: {
    nicknames: ['Spurs', 'Tottenham'],
    shortLore: ['Spursy allegations', 'Tottenham drama is never far away'],
    chantFragments: ['come on you Spurs'],
    rivalryJabs: ['the Spursy file is always one mistake away'],
  },
  'tottenham hotspur': {
    nicknames: ['Spurs', 'Tottenham'],
    shortLore: ['Spursy allegations', 'Tottenham drama is never far away'],
    chantFragments: ['come on you Spurs'],
    rivalryJabs: ['the Spursy file is always one mistake away'],
  },
  'west ham': {
    nicknames: ['West Ham'],
    shortLore: ['West Ham contradiction football', 'London Stadium mood swings'],
    chantFragments: ['I’m Forever Blowing Bubbles'],
    rivalryJabs: ['West Ham can make nonsense feel inevitable'],
  },
  'west ham united': {
    nicknames: ['West Ham'],
    shortLore: ['West Ham contradiction football', 'London Stadium mood swings'],
    chantFragments: ['I’m Forever Blowing Bubbles'],
    rivalryJabs: ['West Ham can make nonsense feel inevitable'],
  },
  wolves: {
    nicknames: ['Wolves'],
    shortLore: ['Molineux scrap', 'Wolves make games ugly on purpose'],
    chantFragments: ['come on Wolves'],
    rivalryJabs: ['Wolves will happily drag this into the mud'],
  },
  'wolverhampton wanderers': {
    nicknames: ['Wolves'],
    shortLore: ['Molineux scrap', 'Wolves make games ugly on purpose'],
    chantFragments: ['come on Wolves'],
    rivalryJabs: ['Wolves will happily drag this into the mud'],
  },
};

type EspnScoreboardEvent = {
  id?: string;
  date?: string;
  name?: string;
  shortName?: string;
  links?: Array<{ rel?: string[]; href?: string }>;
  competitions?: Array<{
    date?: string;
    status?: { type?: { detail?: string; description?: string; state?: string } };
    venue?: { fullName?: string };
    headlines?: Array<{ description?: string; shortLinkText?: string; type?: string }>;
    geoBroadcasts?: Array<{ media?: { shortName?: string }; lang?: string; region?: string }>;
    broadcasts?: Array<{ names?: string[] }>;
    odds?: Array<{ details?: string; overUnder?: number; homeTeamOdds?: { moneyLine?: number }; awayTeamOdds?: { moneyLine?: number }; drawOdds?: { moneyLine?: number } } | null> | null;
    competitors?: Array<{
      homeAway?: 'home' | 'away';
      form?: string;
      team?: { id?: string; abbreviation?: string; shortDisplayName?: string; displayName?: string };
      records?: Array<{ summary?: string }>;
      leaders?: Array<{
        name?: string;
        displayName?: string;
        leaders?: Array<{
          value?: number;
          displayValue?: string;
          athlete?: { displayName?: string; shortName?: string };
        }>;
      }>;
    }>;
    details?: Array<{
      type?: { text?: string };
      clock?: { displayValue?: string };
      athletesInvolved?: Array<{ displayName?: string }>;
      team?: { id?: string };
    }>;
  }>;
};

type EspnScoreboardPayload = {
  day?: { date?: string };
  events?: EspnScoreboardEvent[];
};

type EspnCompetition = NonNullable<EspnScoreboardEvent['competitions']>[number];
type EspnCompetitor = NonNullable<EspnCompetition['competitors']>[number];
type EspnOdds = NonNullable<NonNullable<EspnCompetition['odds']>[number]>;

function americanToImpliedProbability(moneyLine: number) {
  if (!Number.isFinite(moneyLine) || moneyLine === 0) {
    return null;
  }

  if (moneyLine > 0) {
    return 100 / (moneyLine + 100);
  }

  return Math.abs(moneyLine) / (Math.abs(moneyLine) + 100);
}

function buildWinningOddsSummary(input: { odds?: EspnOdds | null; homeTeam?: string; awayTeam?: string }) {
  const homeMoneyLine = input.odds?.homeTeamOdds?.moneyLine;
  const awayMoneyLine = input.odds?.awayTeamOdds?.moneyLine;

  const candidates = [
    typeof homeMoneyLine === 'number' ? { team: input.homeTeam || 'Home team', probability: americanToImpliedProbability(homeMoneyLine) } : null,
    typeof awayMoneyLine === 'number' ? { team: input.awayTeam || 'Away team', probability: americanToImpliedProbability(awayMoneyLine) } : null,
  ].filter((candidate): candidate is { team: string; probability: number } => candidate?.probability != null);

  if (candidates.length === 0) {
    return null;
  }

  const favorite = candidates.reduce((best, candidate) => (candidate.probability > best.probability ? candidate : best));
  return `${favorite.team} win probability: ${(favorite.probability * 100).toFixed(1)}%`;
}

function normalizeTeamPreferenceId(competition: string | undefined, teamAbbreviation: string | undefined) {
  if (!competition || !teamAbbreviation) {
    return null;
  }

  return `${competition}-${teamAbbreviation.toLowerCase()}`;
}

function firstClubPreference(favoriteTeamIds: string[]) {
  return favoriteTeamIds.find((teamId) => !teamId.startsWith('fifa.worldq.') && !teamId.startsWith('caf.nations') && !teamId.startsWith('uefa.nations')) ?? null;
}

export function classifyMatchAffinity(
  favoriteTeamIds: string[] | null | undefined,
  teams: { homeTeamPreferenceId: string | null; awayTeamPreferenceId: string | null }
): FanAffinityContext {
  const normalized = Array.isArray(favoriteTeamIds) ? favoriteTeamIds : [];
  const likesHome = Boolean(teams.homeTeamPreferenceId && normalized.includes(teams.homeTeamPreferenceId));
  const likesAway = Boolean(teams.awayTeamPreferenceId && normalized.includes(teams.awayTeamPreferenceId));

  let affinity: FanAffinity = 'unknown';
  if (likesHome && likesAway) {
    affinity = 'split';
  } else if (likesHome) {
    affinity = 'home';
  } else if (likesAway) {
    affinity = 'away';
  } else if (normalized.length > 0) {
    affinity = 'neutral';
  }

  return {
    favoriteTeamIds: normalized,
    primaryClubId: firstClubPreference(normalized),
    affinity,
  };
}

export async function enrichReplyAuthorsWithPreferences(
  replies: MatchThreadReply[],
  teams: { homeTeamPreferenceId: string | null; awayTeamPreferenceId: string | null }
): Promise<ReplyAuthorContext[]> {
  const uniqueFids = Array.from(new Set(replies.map((reply) => reply.fid)));
  const preferencesEntries = await Promise.all(
    uniqueFids.map(async (fid) => [fid, await getTeamPreferences(fid)] as const)
  );
  const preferenceMap = new Map<number, string[] | null>(preferencesEntries);

  return replies.map((reply) => {
    const preferenceContext = classifyMatchAffinity(preferenceMap.get(reply.fid), teams);
    return {
      ...reply,
      favoriteTeamIds: preferenceContext.favoriteTeamIds,
      primaryClubId: preferenceContext.primaryClubId,
      affinity: preferenceContext.affinity,
    };
  });
}

export function summarizeCrowdAffinity(replies: ReplyAuthorContext[]): CrowdAffinitySummary {
  const counts: CrowdAffinitySummary = {
    homeFans: 0,
    awayFans: 0,
    neutralFans: 0,
    splitFans: 0,
    unknownFans: 0,
  };

  const seen = new Set<number>();
  for (const reply of replies) {
    if (seen.has(reply.fid)) {
      continue;
    }
    seen.add(reply.fid);

    if (reply.affinity === 'home') counts.homeFans += 1;
    else if (reply.affinity === 'away') counts.awayFans += 1;
    else if (reply.affinity === 'neutral') counts.neutralFans += 1;
    else if (reply.affinity === 'split') counts.splitFans += 1;
    else counts.unknownFans += 1;
  }

  return counts;
}

function stripDefaultMentionLine(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.toLowerCase() !== DEFAULT_MENTION_LINE.toLowerCase())
    .join(' ')
    .trim();
}

function extractPlayerNames(keyMoments: string[] | undefined, matchEvents: RichMatchEvent[] | undefined) {
  const names = new Set<string>();

  for (const moment of keyMoments || []) {
    const match = moment.match(/by\s+(.+?)\s+at/i);
    if (match?.[1]) {
      names.add(match[1].trim());
    }
  }

  for (const event of matchEvents || []) {
    event.athletesInvolved?.forEach((athlete) => {
      if (athlete.displayName) {
        names.add(athlete.displayName);
      }
    });
  }

  return Array.from(names);
}

function teamMatchesLabel(team: { abbreviation?: string; shortDisplayName?: string; displayName?: string } | undefined, label: string | undefined) {
  if (!team || !label) {
    return false;
  }

  const normalizedLabel = label.trim().toLowerCase();
  return [team.abbreviation, team.shortDisplayName, team.displayName]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.trim().toLowerCase() === normalizedLabel);
}

function parseRecordSummary(summary: string | undefined) {
  if (!summary) {
    return null;
  }

  const match = summary.match(/^\s*(\d+)-(\d+)-(\d+)\s*$/);
  if (!match) {
    return null;
  }

  const wins = Number(match[1]);
  const draws = Number(match[2]);
  const losses = Number(match[3]);
  return {
    wins,
    draws,
    losses,
    points: wins * 3 + draws,
    matches: wins + draws + losses,
  };
}

function normalizeClubKey(teamName: string | undefined) {
  if (!teamName) {
    return null;
  }

  return teamName.trim().toLowerCase();
}

function getClubVoice(teamName: string | undefined): ClubVoice | null {
  const key = normalizeClubKey(teamName);
  if (!key) {
    return null;
  }

  return CLUB_VOICE_PACKS[key] || null;
}

function pickFirst<T>(items: T[] | undefined, fallback: T) {
  return items && items.length > 0 ? items[0] : fallback;
}

function buildClubVoiceNotes(input: {
  homeTeam: string;
  awayTeam: string;
  viewerAffinity: FanAffinity;
}) {
  const homeVoice = getClubVoice(input.homeTeam);
  const awayVoice = getClubVoice(input.awayTeam);
  const favoredVoice = input.viewerAffinity === 'away' ? awayVoice : homeVoice;
  const rivalVoice = input.viewerAffinity === 'away' ? homeVoice : awayVoice;

  return {
    favoredClub: favoredVoice
      ? [
          ...favoredVoice.nicknames.slice(0, 1),
          ...favoredVoice.shortLore.slice(0, 2),
          ...favoredVoice.chantFragments.slice(0, 1),
        ]
      : [],
    rivalClub: rivalVoice
      ? [
          ...rivalVoice.nicknames.slice(0, 1),
          ...rivalVoice.shortLore.slice(0, 2),
          ...rivalVoice.rivalryJabs.slice(0, 1),
        ]
      : [],
    allClubNotes: [
      ...(homeVoice ? [`${input.homeTeam}: ${[...homeVoice.shortLore, ...homeVoice.chantFragments].slice(0, 3).join(', ')}`] : []),
      ...(awayVoice ? [`${input.awayTeam}: ${[...awayVoice.shortLore, ...awayVoice.chantFragments].slice(0, 3).join(', ')}`] : []),
    ],
  };
}

function getGoalsLeader(competitor: EspnCompetitor | undefined) {
  const goalsLeaderGroup = competitor?.leaders?.find((leader) => {
    const key = (leader.name || leader.displayName || '').toLowerCase();
    return key.includes('goal');
  });
  const leader = goalsLeaderGroup?.leaders?.[0];
  if (!leader) {
    return null;
  }

  return {
    playerName: leader.athlete?.displayName || leader.athlete?.shortName || 'their top scorer',
    goals: leader.value ?? (leader.displayValue ? Number(leader.displayValue) : null),
    displayGoals: leader.displayValue || (leader.value != null ? String(leader.value) : null),
  };
}

function buildEspnBanterSignals(input: {
  event?: EspnScoreboardEvent;
  dayDate?: string;
  eventCount?: number;
  competition?: EspnCompetition;
  homeCompetitor?: EspnCompetitor;
  awayCompetitor?: EspnCompetitor;
  odds?: EspnOdds | null;
  homeTeam?: string;
  awayTeam?: string;
}) {
  const homeName = input.homeCompetitor?.team?.displayName || input.homeTeam || 'Home side';
  const awayName = input.awayCompetitor?.team?.displayName || input.awayTeam || 'Away side';

  const formEdge: string[] = [];
  if (input.homeCompetitor?.form && input.awayCompetitor?.form) {
    formEdge.push(`${homeName} form ${input.homeCompetitor.form}; ${awayName} form ${input.awayCompetitor.form}`);
    const homeRecentWins = (input.homeCompetitor.form.match(/W/g) || []).length;
    const awayRecentWins = (input.awayCompetitor.form.match(/W/g) || []).length;
    if (homeRecentWins >= awayRecentWins + 2) {
      formEdge.push(`${homeName} come in a lot hotter than ${awayName}`);
    } else if (awayRecentWins >= homeRecentWins + 2) {
      formEdge.push(`${awayName} come in a lot hotter than ${homeName}`);
    }
  }

  const recordEdge: string[] = [];
  const homeRecordSummary = input.homeCompetitor?.records?.[0]?.summary;
  const awayRecordSummary = input.awayCompetitor?.records?.[0]?.summary;
  const homeRecord = parseRecordSummary(homeRecordSummary);
  const awayRecord = parseRecordSummary(awayRecordSummary);
  if (homeRecordSummary && awayRecordSummary) {
    recordEdge.push(`${homeName} are ${homeRecordSummary}; ${awayName} are ${awayRecordSummary}`);
  }
  if (homeRecord && awayRecord) {
    const pointGap = Math.abs(homeRecord.points - awayRecord.points);
    if (pointGap >= 8) {
      const betterTeam = homeRecord.points > awayRecord.points ? homeName : awayName;
      const worseTeam = betterTeam === homeName ? awayName : homeName;
      recordEdge.push(`${betterTeam} have been clearly better than ${worseTeam} over the season`);
    } else if (pointGap <= 3) {
      recordEdge.push(`These two have put up near-identical seasons on points`);
    }
  }

  const playerEdge: string[] = [];
  const homeLeader = getGoalsLeader(input.homeCompetitor);
  const awayLeader = getGoalsLeader(input.awayCompetitor);
  if (homeLeader?.displayGoals) {
    playerEdge.push(`${homeName}'s top scorer is ${homeLeader.playerName} with ${homeLeader.displayGoals}`);
  }
  if (awayLeader?.displayGoals) {
    playerEdge.push(`${awayName}'s top scorer is ${awayLeader.playerName} with ${awayLeader.displayGoals}`);
  }
  if (homeLeader?.goals != null && awayLeader?.goals != null && homeLeader.goals !== awayLeader.goals) {
    const betterLeader = homeLeader.goals > awayLeader.goals ? { ...homeLeader, team: homeName } : { ...awayLeader, team: awayName };
    const trailingLeader = betterLeader.team === homeName ? awayLeader : homeLeader;
    playerEdge.push(
      `${betterLeader.team} have the hotter scorer: ${betterLeader.playerName} ${betterLeader.goals} to ${trailingLeader.playerName} ${trailingLeader.goals}`
    );
  }

  const oddsDisrespect: string[] = [];
  const winningOddsSummary = buildWinningOddsSummary({
    odds: input.odds,
    homeTeam: homeName,
    awayTeam: awayName,
  });
  if (winningOddsSummary) {
    oddsDisrespect.push(`Market lean: ${winningOddsSummary}`);
  }
  if (input.odds?.overUnder != null) {
    oddsDisrespect.push(`Book has the total at ${input.odds.overUnder}`);
  }

  const homeGround: string[] = [];
  if (input.competition?.venue?.fullName) {
    homeGround.push(`${homeName} have this at ${input.competition.venue.fullName}`);
  }

  const finalDayPressure: string[] = [];
  if (input.dayDate && input.event?.date?.startsWith(input.dayDate)) {
    finalDayPressure.push(`This is on the final matchday, so every scoreboard swing lands at once`);
  }
  if ((input.eventCount || 0) >= 8) {
    finalDayPressure.push(`Full-league simultaneous kickoff energy`);
  }
  if (input.competition?.status?.type?.detail) {
    finalDayPressure.push(input.competition.status.type.detail);
  }

  const goalChaosPotential: string[] = [];
  if (input.odds?.overUnder != null) {
    if (input.odds.overUnder >= 3.5) {
      goalChaosPotential.push(`Book is pricing this like a goals game`);
    } else if (input.odds.overUnder <= 2.5) {
      goalChaosPotential.push(`Book is expecting this to stay tighter`);
    }
  }

  return {
    formEdge,
    recordEdge,
    playerEdge,
    oddsDisrespect,
    homeGround,
    finalDayPressure,
    goalChaosPotential,
  };
}

export function extractThreadHooks(input: {
  replies: ReplyAuthorContext[];
  channelCasts?: MatchChannelCast[];
  homeTeam: string;
  awayTeam: string;
  keyMoments?: string[];
  matchEvents?: RichMatchEvent[];
  rootText?: string | null;
}) {
  const playerNames = extractPlayerNames(input.keyMoments, input.matchEvents).map((name) => name.toLowerCase());
  const teamTerms = [input.homeTeam.toLowerCase(), input.awayTeam.toLowerCase()];
  const seen = new Set<string>();
  const hooks: string[] = [];

  const channelTexts = (input.channelCasts || [])
    .map((cast) => stripDefaultMentionLine(cast.text || ''))
    .filter(Boolean);

  const replyTexts = input.replies
    .map((reply) => stripDefaultMentionLine(reply.text || ''))
    .filter(Boolean);

  const candidates = [
    ...replyTexts.map((text) => ({ text, source: 'reply' as const })),
    ...channelTexts.map((text) => ({ text, source: 'channel' as const })),
  ];

  for (const candidate of candidates) {
    const text = candidate.text.trim();
    if (!text || seen.has(text.toLowerCase())) {
      continue;
    }

    const lower = text.toLowerCase();
    const mentionsTeam = teamTerms.some((term) => lower.includes(term));
    const mentionsPlayer = playerNames.some((name) => lower.includes(name));
    const feelsBanter = /[?!]|love|cooked|finished|washed|proper|hold|levels|nerves|final|play|start|bench|title|relegat/i.test(text);
    const isBoilerplate = lower === DEFAULT_MENTION_LINE.toLowerCase() || lower.length < 8;

    if (!isBoilerplate && (mentionsTeam || mentionsPlayer || feelsBanter || candidate.source === 'reply')) {
      hooks.push(text);
      seen.add(lower);
    }

    if (hooks.length >= 7) {
      break;
    }
  }

  if (hooks.length === 0 && input.rootText) {
    const cleanedRoot = stripDefaultMentionLine(input.rootText);
    if (cleanedRoot) {
      hooks.push(cleanedRoot);
    }
  }

  return hooks;
}

export async function fetchEspnMatchContext(input: {
  leagueId?: string;
  espnEventId?: string;
  matchDate?: string;
  homeTeam?: string;
  awayTeam?: string;
}): Promise<EspnMatchContext> {
  if (!input.leagueId) {
    return {
      headlines: [],
      links: {},
      broadcasts: [],
      previewFacts: [],
      narrativeAngles: [],
      banterSignals: {
        formEdge: [],
        recordEdge: [],
        playerEdge: [],
        oddsDisrespect: [],
        homeGround: [],
        finalDayPressure: [],
        goalChaosPotential: [],
      },
    };
  }

  const url = new URL(`https://site.api.espn.com/apis/site/v2/sports/soccer/${input.leagueId}/scoreboard`);
  if (input.matchDate) {
    const date = new Date(input.matchDate);
    if (!Number.isNaN(date.getTime())) {
      const dateKey = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
      url.searchParams.set('dates', dateKey);
    }
  }

  const response = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    return {
      headlines: [],
      links: {},
      broadcasts: [],
      previewFacts: [],
      narrativeAngles: [],
      banterSignals: {
        formEdge: [],
        recordEdge: [],
        playerEdge: [],
        oddsDisrespect: [],
        homeGround: [],
        finalDayPressure: [],
        goalChaosPotential: [],
      },
    };
  }

  const payload = (await response.json()) as EspnScoreboardPayload;
  const event = (payload.events || []).find((candidate) => {
    if (input.espnEventId && candidate.id === input.espnEventId) {
      return true;
    }

    const textHaystack = `${candidate.name || ''} ${candidate.shortName || ''}`.toLowerCase();
    return Boolean(
      input.homeTeam &&
        input.awayTeam &&
        textHaystack.includes(input.homeTeam.toLowerCase()) &&
        textHaystack.includes(input.awayTeam.toLowerCase())
    );
  });

  const competition = event?.competitions?.[0];
  const links = event?.links || [];
  const headlines = (competition?.headlines || [])
    .map((headline) => headline.shortLinkText || headline.description)
    .filter((value): value is string => Boolean(value));
  const broadcasts = [
    ...(competition?.geoBroadcasts || []).map((broadcast) => broadcast.media?.shortName).filter(Boolean),
    ...(competition?.broadcasts || []).flatMap((broadcast) => broadcast.names || []),
  ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);

  const competitors = competition?.competitors || [];
  const homeCompetitor =
    competitors.find((competitor) => competitor.homeAway === 'home') ||
    competitors.find((competitor) => teamMatchesLabel(competitor.team, input.homeTeam)) ||
    competitors[0];
  const awayCompetitor =
    competitors.find((competitor) => competitor.homeAway === 'away') ||
    competitors.find((competitor) => teamMatchesLabel(competitor.team, input.awayTeam)) ||
    competitors[1];
  const odds = Array.isArray(competition?.odds) ? competition?.odds.find(Boolean) || null : null;
  const banterSignals = buildEspnBanterSignals({
    event,
    dayDate: payload.day?.date,
    eventCount: payload.events?.length,
    competition,
    homeCompetitor,
    awayCompetitor,
    odds,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
  });
  const winningOddsSummary = buildWinningOddsSummary({
    odds,
    homeTeam: homeCompetitor?.team?.displayName || input.homeTeam,
    awayTeam: awayCompetitor?.team?.displayName || input.awayTeam,
  });

  const previewFacts = [
    competition?.status?.type?.detail ? `Status: ${competition.status.type.detail}` : null,
    competition?.venue?.fullName ? `Venue: ${competition.venue.fullName}` : null,
    homeCompetitor?.records?.[0]?.summary ? `${homeCompetitor.team?.displayName || input.homeTeam} record: ${homeCompetitor.records[0].summary}` : null,
    awayCompetitor?.records?.[0]?.summary ? `${awayCompetitor.team?.displayName || input.awayTeam} record: ${awayCompetitor.records[0].summary}` : null,
    broadcasts.length > 0 ? `Broadcasts: ${broadcasts.join(', ')}` : null,
    winningOddsSummary ? `Odds: ${winningOddsSummary}` : null,
    ...Object.values(banterSignals).flat().slice(0, 6),
  ].filter((value): value is string => Boolean(value));

  const recentDetails = (competition?.details || [])
    .slice(-3)
    .map((detail) => {
      const player = detail.athletesInvolved?.[0]?.displayName;
      const eventText = detail.type?.text;
      const minute = detail.clock?.displayValue;
      return [eventText, player, minute ? `at ${minute}` : null].filter(Boolean).join(' ');
    })
    .filter(Boolean);

  const narrativeAngles = [...headlines, ...recentDetails].slice(0, 4);

  return {
    eventId: event?.id,
    status: competition?.status?.type?.detail || competition?.status?.type?.description,
    venue: competition?.venue?.fullName,
    headlines,
    links: {
      summary: links.find((link) => link.rel?.includes('summary'))?.href,
      recap: links.find((link) => link.rel?.includes('recap'))?.href,
      stats: links.find((link) => link.rel?.includes('stats'))?.href,
    },
    broadcasts,
    previewFacts,
    narrativeAngles,
    banterSignals,
  };
}

function fallbackSuggestions(input: {
  viewerAffinity: FanAffinity;
  crowd: CrowdAffinitySummary;
  homeTeam: string;
  awayTeam: string;
  hooks: string[];
  keyMoments?: string[];
  espn: EspnMatchContext;
}) {
  const rivalryTarget = input.viewerAffinity === 'home' ? input.awayTeam : input.homeTeam;
  const sameSideTeam = input.viewerAffinity === 'home' ? input.homeTeam : input.awayTeam;
  const keyMoment = input.keyMoments?.[0];
  const hook = input.hooks[0];
  const voiceNotes = buildClubVoiceNotes({
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    viewerAffinity: input.viewerAffinity,
  });
  const sameSideLore = pickFirst(voiceNotes.favoredClub, sameSideTeam);
  const rivalLore = pickFirst(voiceNotes.rivalClub, rivalryTarget);
  const oddsHook = input.espn.banterSignals.oddsDisrespect[0];
  const playerHook = input.espn.banterSignals.playerEdge[0];
  const pressureHook = input.espn.banterSignals.finalDayPressure[0] || input.espn.banterSignals.homeGround[0];

  return [
    {
      id: 'same-side',
      label: 'Same side',
      mode: 'same-side' as const,
      text:
        input.viewerAffinity === 'home' || input.viewerAffinity === 'away'
          ? `${sameSideLore}, keep your heads. ${pressureHook || `${sameSideTeam} should be saying this with chest today.`}`
          : `${input.homeTeam} v ${input.awayTeam} and both sets are acting brave. who is actually backing the chat?`,
    },
    {
      id: 'rival-poke',
      label: 'Rival poke',
      mode: 'rival-poke' as const,
      text: oddsHook
        ? `${rivalLore}. ${oddsHook}. that disrespect would have me talking reckless too.`
        : `${rivalLore}. heads gone before kickoff and we have not even got to the funny part yet.`,
    },
    {
      id: 'player-specific',
      label: 'Player-specific',
      mode: 'player-specific' as const,
      text: keyMoment
        ? `${keyMoment}. if that man turns up, the chant volume is going through the roof.`
        : playerHook
          ? `${playerHook}. that is your first bit of ammunition right there.`
        : hook
          ? `${hook} and somehow that still is not the most shameless thing in this fixture.`
          : `${input.homeTeam} v ${input.awayTeam}. pick a side, pick a villain, and stop posting like a neutral.`,
    },
  ];
}

export async function generateBanterSuggestions(input: {
  homeTeam: string;
  awayTeam: string;
  competition?: string;
  viewerAffinity: FanAffinity;
  crowd: CrowdAffinitySummary;
  rootText?: string | null;
  hooks: string[];
  keyMoments?: string[];
  espn: EspnMatchContext;
}): Promise<BanterSuggestion[]> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAIKEY;
  if (!apiKey) {
    return fallbackSuggestions(input);
  }

  const clubVoiceNotes = buildClubVoiceNotes({
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    viewerAffinity: input.viewerAffinity,
  });

  const prompt = `
You write short fan-to-fan football banter replies for Footy App users.

Goal: produce 3 grounded banter suggestions for a user joining or starting a Farcaster match thread.

Rules:
- Be specific to the match and thread.
- Sound like a real fan in a group chat, not a generic AI summary.
- Use only facts present in the context.
- Prefer a joke, sting, chant fragment, club-lore nod, or rivalry angle over bland commentary.
- If you use a chant reference, keep it very short, just a fragment.
- Do not write like a pundit, marketer, or stats account.
- Do not say "match thread", "banter", "context", "viewer affinity", or "based on".
- Avoid generic lines like "who is actually calling this" or "say it with chest" unless you make them specific.
- No hashtags.
- No emojis unless the context strongly calls for it.
- Keep each suggestion under 180 characters.
- Return strict JSON only.

Context:
- Match: ${input.homeTeam} vs ${input.awayTeam}
- Competition: ${input.competition || 'football'}
- Viewer affinity: ${input.viewerAffinity}
- Crowd: ${JSON.stringify(input.crowd)}
- Root cast: ${input.rootText || 'n/a'}
- Thread hooks: ${input.hooks.join(' | ') || 'n/a'}
- Key moments: ${(input.keyMoments || []).join(' | ') || 'n/a'}
- ESPN preview facts: ${input.espn.previewFacts.join(' | ') || 'n/a'}
- ESPN narrative angles: ${input.espn.narrativeAngles.join(' | ') || 'n/a'}
- ESPN form edge: ${input.espn.banterSignals.formEdge.join(' | ') || 'n/a'}
- ESPN record edge: ${input.espn.banterSignals.recordEdge.join(' | ') || 'n/a'}
- ESPN player edge: ${input.espn.banterSignals.playerEdge.join(' | ') || 'n/a'}
- ESPN odds disrespect: ${input.espn.banterSignals.oddsDisrespect.join(' | ') || 'n/a'}
- ESPN home ground: ${input.espn.banterSignals.homeGround.join(' | ') || 'n/a'}
- ESPN final day pressure: ${input.espn.banterSignals.finalDayPressure.join(' | ') || 'n/a'}
- ESPN goal chaos potential: ${input.espn.banterSignals.goalChaosPotential.join(' | ') || 'n/a'}
- Club voice notes: ${clubVoiceNotes.allClubNotes.join(' | ') || 'n/a'}
- Favored-side voice: ${clubVoiceNotes.favoredClub.join(' | ') || 'n/a'}
- Rival-side voice: ${clubVoiceNotes.rivalClub.join(' | ') || 'n/a'}

Output intent:
- "same-side" should sound like rallying your own lot or grinning with your own lot.
- "rival-poke" should feel sharper and more annoying to the other side.
- "player-specific" should weaponize a named player, moment, or stat if available.

Return JSON:
{
  "suggestions": [
    {"id":"same-side","label":"Same side","mode":"same-side","text":"..."},
    {"id":"rival-poke","label":"Rival poke","mode":"rival-poke","text":"..."},
    {"id":"player-specific","label":"Player-specific","mode":"player-specific","text":"..."}
  ]
}
`.trim();

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.9,
        max_tokens: 250,
        messages: [
          {
            role: 'system',
            content:
              'You generate sharp, funny, club-aware football banter suggestions as strict JSON. You prefer jokes, lore, chants, and rivalry-specific language over generic commentary.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      return fallbackSuggestions(input);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return fallbackSuggestions(input);
    }

    const parsed = JSON.parse(content) as { suggestions?: BanterSuggestion[] };
    if (!Array.isArray(parsed.suggestions) || parsed.suggestions.length === 0) {
      return fallbackSuggestions(input);
    }

    return parsed.suggestions.slice(0, 3);
  } catch {
    return fallbackSuggestions(input);
  }
}

export function buildTeamPreferenceIds(input: {
  competition?: string;
  homeTeam?: string;
  awayTeam?: string;
}) {
  return {
    homeTeamPreferenceId: normalizeTeamPreferenceId(input.competition, input.homeTeam),
    awayTeamPreferenceId: normalizeTeamPreferenceId(input.competition, input.awayTeam),
  };
}
