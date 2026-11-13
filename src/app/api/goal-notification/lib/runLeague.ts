// Shared goal-notification runner: one implementation for all 11 leagues.
//
// This is a behaviour-preserving collapse of the 11 copied route handlers.
// What changed versus the originals (and only this):
//  - "full" leagues (EPL, UCL, La Liga, UEL, CWC, AFCON, World Cup) used
//    to fetch fans for every live match BEFORE checking whether anything
//    had happened. Fans are now looked up lazily, only when a kickoff,
//    halftime, full-time or goal notification will actually be sent.
//    The lookup itself is unchanged: `getFansForTeamAbbr` (a SUNION over
//    all 19 league keys) is kept deliberately — fans register under a
//    league team id, and a team plays in several competitions, so a
//    league-scoped lookup would under-notify. `getFansForTeamWithLeagues`
//    returns a count, not FIDs, so it cannot replace it.
//  - A finished (`post`) match whose full-time notification already went
//    out and whose score is unchanged is now skipped outright instead of
//    being fan-looked-up and flag-checked for the rest of the day.
//  - ESPN fetches use 1 retry / 5s timeout instead of 3 / 8s: the next
//    minute's poll retries anyway, and a score change is still detected
//    then (the stored score is what it is compared against), so a failed
//    minute delays a notification rather than losing it.
//  - Each run records a per-league poll summary in Redis so the health
//    endpoint can report status without re-fetching 11 scoreboards.
//
// Everything else is preserved exactly: Redis key namespaces (including
// the shared unprefixed `fc-footy:match:` keys for eng-2/eflcup and
// eflcup's `eng.1` fan-team ids), message wording, titles, the
// `fc-footy:users` intersect where the original had it, and the
// initialise-then-skip behaviour on a match's first sighting.

import { goalRedis, matchKey, notificationsKey, scoreboardUrl, type LeagueConfig } from "./leagues";
import { fetchJSONWithRetry } from "../../lib/http";
import type { ApiResponse, Competition, MatchDetail } from "../../lib/types";
import { sendFrameNotificationsBatch } from "~/lib/notificationsBatch";
import { getFansForTeamAbbr, getFansForTeams } from "~/lib/kvPerferences";

export type LeagueRunResult = {
  success: boolean;
  error?: string;
  notificationsSent: number;
  goalNotifications: string[];
  otherNotifications: string[];
  eventsCount: number;
  inCount: number;
  postCount: number;
  preCount: number;
};

type NotificationFlags = {
  kickoff_notified?: string;
  halftime_notified?: string;
  fulltime_notified?: string;
};

function clockToSeconds(displayValue: string): number {
  return displayValue
    .split(":")
    .reduce((acc, val) => acc * 60 + parseInt(val, 10), 0);
}

function latestScoringMoment(competition: Competition): {
  scoringPlayer: string;
  clockTime: string;
} {
  let scoringPlayer = "Baller";
  let clockTime = "00:00";
  if (competition.details && Array.isArray(competition.details)) {
    const keyMoments = [...competition.details].sort(
      (a: MatchDetail, b: MatchDetail) =>
        clockToSeconds(a.clock?.displayValue || "00:00") -
        clockToSeconds(b.clock?.displayValue || "00:00"),
    );
    if (keyMoments.length > 0) {
      const latest = keyMoments[keyMoments.length - 1];
      scoringPlayer =
        latest.athletesInvolved?.[0]?.displayName || scoringPlayer;
      clockTime = latest.clock?.displayValue || clockTime;
    }
  }
  return { scoringPlayer, clockTime };
}

async function intersectWithUsers(fids: number[]): Promise<number[]> {
  let userFids: (number | string)[] = [];
  try {
    userFids = (await (goalRedis as never as { smembers: (k: string) => Promise<(number | string)[]> }).smembers(
      "fc-footy:users",
    )) as (number | string)[];
  } catch (err) {
    console.error("Error reading users set from Redis", err);
    return fids;
  }
  const userSet = new Set<number>(
    (Array.isArray(userFids) ? userFids : [])
      .map((v) => (typeof v === "string" ? Number(v) : (v as number)))
      .filter((n) => Number.isFinite(n)) as number[],
  );
  return userSet.size > 0 ? fids.filter((fid) => userSet.has(fid)) : fids;
}

async function fansForMatch(
  league: LeagueConfig,
  homeAbbr: string | undefined,
  awayAbbr: string | undefined,
): Promise<number[]> {
  let homeFans: number[] = [];
  let awayFans: number[] = [];
  try {
    if (league.mode === "goal-only") {
      const fanLeagueId = league.fanLeagueId ?? "";
      [homeFans, awayFans] = await Promise.all([
        homeAbbr
          ? getFansForTeams([`${fanLeagueId}-${homeAbbr}`.toLowerCase()])
          : Promise.resolve([]),
        awayAbbr
          ? getFansForTeams([`${fanLeagueId}-${awayAbbr}`.toLowerCase()])
          : Promise.resolve([]),
      ]);
    } else {
      [homeFans, awayFans] = await Promise.all([
        homeAbbr ? getFansForTeamAbbr(homeAbbr) : Promise.resolve([]),
        awayAbbr ? getFansForTeamAbbr(awayAbbr) : Promise.resolve([]),
      ]);
    }
  } catch (err) {
    console.error(`Error fetching fans for ${league.id} match`, err);
  }
  const fids = Array.from(new Set([...homeFans, ...awayFans]));
  return league.intersectUsers ? intersectWithUsers(fids) : fids;
}

async function writePollSummary(
  league: LeagueConfig,
  summary: {
    ok: boolean;
    eventsCount: number;
    inCount: number;
    postCount: number;
    preCount: number;
    error?: string;
  },
): Promise<void> {
  try {
    await goalRedis.set(
      `fc-footy:health:poll:${league.id}`,
      JSON.stringify({ ts: new Date().toISOString(), ...summary }),
    );
  } catch {
    // Health reporting must never break notifications.
  }
}

async function recordFailure(
  league: LeagueConfig,
  error: string,
): Promise<void> {
  try {
    await goalRedis.lpush(
      "fc-footy:health:failures",
      JSON.stringify({
        id: league.id,
        label: league.label,
        ok: false,
        error,
        ts: new Date().toISOString(),
      }),
    );
    await goalRedis.ltrim("fc-footy:health:failures", 0, 199);
  } catch {
    // Best effort only.
  }
}

export async function runLeague(
  league: LeagueConfig,
): Promise<LeagueRunResult> {
  const empty: LeagueRunResult = {
    success: false,
    notificationsSent: 0,
    goalNotifications: [],
    otherNotifications: [],
    eventsCount: 0,
    inCount: 0,
    postCount: 0,
    preCount: 0,
  };

  let data: ApiResponse;
  try {
    data = await fetchJSONWithRetry<ApiResponse>(scoreboardUrl(league), {
      retries: 1,
      timeoutMs: 5000,
      backoffMs: 400,
    });
    if (!data.events) throw new Error("No events data returned from API");
  } catch (error) {
    const message = String((error as Error)?.message ?? error);
    console.error(`Error fetching ${league.label} scoreboard:`, error);
    await writePollSummary(league, {
      ok: false,
      eventsCount: 0,
      inCount: 0,
      postCount: 0,
      preCount: 0,
      error: message,
    });
    await recordFailure(league, message);
    return { ...empty, error: message };
  }

  const allEvents = data.events;
  const inCount = allEvents.filter(
    (e) => e.competitions?.[0]?.status?.type?.state === "in",
  ).length;
  const postCount = allEvents.filter(
    (e) => e.competitions?.[0]?.status?.type?.state === "post",
  ).length;
  const preCount = allEvents.filter(
    (e) => e.competitions?.[0]?.status?.type?.state === "pre",
  ).length;

  // "full" leagues also process completed matches (to catch full-time);
  // "goal-only" leagues only process live ones, as before.
  const liveEvents = allEvents.filter((event) => {
    const state = event.competitions?.[0]?.status?.type?.state;
    return league.mode === "full"
      ? state === "in" || state === "post"
      : state === "in";
  });
  console.log(
    `Found ${liveEvents.length} live or completed event(s) in ${league.label}.`,
  );

  const goalNotifications: string[] = [];
  const otherNotifications: string[] = [];

  for (const event of liveEvents) {
    const matchId = event.id;
    const competition: Competition | undefined = event.competitions?.[0];
    if (!competition) {
      console.warn(`No competition data for match ${matchId}. Skipping.`);
      continue;
    }
    const homeTeam = competition.competitors?.find(
      (c) => c.homeAway === "home",
    );
    const awayTeam = competition.competitors?.find(
      (c) => c.homeAway === "away",
    );
    if (!homeTeam || !awayTeam) {
      console.warn(`Missing team data for match ${matchId}. Skipping.`);
      continue;
    }
    const homeScore = parseInt(homeTeam.score, 10);
    const awayScore = parseInt(awayTeam.score, 10);
    const homeTeamAbbr = homeTeam.team?.abbreviation?.toLowerCase();
    const awayTeamAbbr = awayTeam.team?.abbreviation?.toLowerCase();
    const matchName = `${
      homeTeam.team?.shortDisplayName || homeTeam.team?.displayName
    } vs ${
      awayTeam.team?.shortDisplayName || awayTeam.team?.displayName
    } ${league.matchSuffix}`;

    const key = matchKey(league, matchId);

    if (league.mode === "goal-only") {
      // Original order, already score-first: read, init, unchanged-check,
      // and only then look up fans and notify.
      let previousScore: Record<string, string> | null;
      try {
        previousScore = await goalRedis.hgetall(key);
      } catch (err) {
        console.error(
          `Error fetching Redis data for ${league.label} match ${matchId}`,
          err,
        );
        continue;
      }
      if (!previousScore || Object.keys(previousScore).length === 0) {
        console.log(
          `Initializing Redis for ${league.label} match ${matchId} with scores: ${homeScore}-${awayScore}`,
        );
        try {
          await goalRedis.hset(key, { homeScore, awayScore });
        } catch (err) {
          console.error(`Failed to initialize match hash for ${matchId}`, err);
        }
        continue;
      }
      if (
        Number(previousScore.homeScore) === homeScore &&
        Number(previousScore.awayScore) === awayScore
      ) {
        continue;
      }
      const { scoringPlayer, clockTime } = latestScoringMoment(competition);
      const message = `${
        homeTeam.team?.shortDisplayName || homeTeam.team?.displayName
      } ${homeScore} - ${awayScore} ${
        awayTeam.team?.shortDisplayName || awayTeam.team?.displayName
      } | ${scoringPlayer} scored at ${clockTime}`;
      goalNotifications.push(message);
      console.log(`Goal detected in ${league.label} match ${matchId}: ${message}`);
      const fidsToNotify = await fansForMatch(
        league,
        homeTeamAbbr,
        awayTeamAbbr,
      );
      console.log(
        `Notifying ${fidsToNotify.length} fans for ${league.label} match ${matchId}`,
      );
      await sendFrameNotificationsBatch({
        fids: fidsToNotify,
        title: "Goal! Goal! Goal!",
        body: message,
      });
      try {
        await goalRedis.hset(key, { homeScore, awayScore });
      } catch (err) {
        console.error(`Failed to persist scores for ${matchId}`, err);
      }
      continue;
    }

    // --- "full" mode: score/state first, fans lazily, only if sending ---
    const notif = notificationsKey(league, matchId);
    const [flagsResult, scoreResult] = await Promise.allSettled([
      goalRedis.hgetall(notif),
      goalRedis.hgetall(key),
    ]);
    let notificationFlags: NotificationFlags | null = null;
    if (flagsResult.status === "fulfilled") {
      notificationFlags = flagsResult.value as unknown as NotificationFlags | null;
    } else {
      console.error(
        `Error fetching notification flags for match ${matchId}`,
        flagsResult.reason,
      );
    }
    let previousScore: Record<string, string> | null = null;
    let scoreReadFailed = false;
    if (scoreResult.status === "fulfilled") {
      previousScore = scoreResult.value as Record<string, string> | null;
    } else {
      console.error(
        `Error fetching Redis data for ${league.label} match ${matchId}`,
        scoreResult.reason,
      );
      scoreReadFailed = true;
    }

    const state = competition.status?.type?.state;
    const statusName = competition.status?.type?.name;
    const isNewMatch =
      !previousScore || Object.keys(previousScore).length === 0;
    const scoreChanged =
      !isNewMatch &&
      (Number(previousScore?.homeScore) !== homeScore ||
        Number(previousScore?.awayScore) !== awayScore);
    const needKickoff =
      state === "in" &&
      (!notificationFlags || !notificationFlags.kickoff_notified);
    const needHalftime =
      statusName === "STATUS_HALFTIME" &&
      (!notificationFlags || !notificationFlags.halftime_notified);
    const needFulltime =
      (state === "post" || statusName === "STATUS_FULL_TIME") &&
      (!notificationFlags || !notificationFlags.fulltime_notified);

    // Finished, already announced, score settled: nothing left to send.
    if (state === "post" && notificationFlags?.fulltime_notified && !scoreChanged && !isNewMatch) {
      continue;
    }
    if (!needKickoff && !needHalftime && !needFulltime && !scoreChanged) {
      // Preserve the original first-sighting behaviour: a match seen for
      // the first time gets its score initialised even when nothing needs
      // sending yet, so a later goal is detected rather than swallowed
      // as a first sighting.
      if (isNewMatch && !scoreReadFailed) {
        try {
          await goalRedis.hset(key, { homeScore, awayScore });
        } catch (err) {
          console.error(`Failed to initialize match hash for ${matchId}`, err);
        }
      }
      continue;
    }

    const fidsToNotify = await fansForMatch(
      league,
      homeTeamAbbr,
      awayTeamAbbr,
    );

    if (needKickoff) {
      const message = `Kickoff: ${matchName}`;
      otherNotifications.push(message);
      console.log(`Kickoff detected for match ${matchId}: ${message}`);
      await sendFrameNotificationsBatch({
        fids: fidsToNotify,
        title: `Match Started! ${league.titleSuffix}`,
        body: message,
      });
      try {
        await goalRedis.hset(notif, { kickoff_notified: "true" });
      } catch (err) {
        console.error(`Failed to hset kickoff flag for ${matchId}`, err);
      }
    }
    if (needHalftime) {
      const message = `Halftime: ${matchName} | Score: ${homeScore}-${awayScore}`;
      otherNotifications.push(message);
      console.log(`Halftime detected for match ${matchId}: ${message}`);
      await sendFrameNotificationsBatch({
        fids: fidsToNotify,
        title: `Halftime! ${league.titleSuffix}`,
        body: message,
      });
      try {
        await goalRedis.hset(notif, { halftime_notified: "true" });
      } catch (err) {
        console.error(`Failed to hset halftime flag for ${matchId}`, err);
      }
    }
    if (needFulltime) {
      const message = `Full Time: ${matchName} | Final Score: ${homeScore}-${awayScore}`;
      otherNotifications.push(message);
      console.log(`Full-time detected for match ${matchId}: ${message}`);
      await sendFrameNotificationsBatch({
        fids: fidsToNotify,
        title: `Match Ended! ${league.titleSuffix}`,
        body: message,
      });
      try {
        await goalRedis.hset(notif, { fulltime_notified: "true" });
      } catch (err) {
        console.error(`Failed to hset fulltime flag for ${matchId}`, err);
      }
    }

    if (isNewMatch) {
      console.log(
        `Initializing Redis for ${league.label} match ${matchId} with scores: ${homeScore}-${awayScore}`,
      );
      try {
        await goalRedis.hset(key, { homeScore, awayScore });
      } catch (err) {
        console.error(`Failed to initialize match hash for ${matchId}`, err);
      }
      continue;
    }
    if (scoreReadFailed || !scoreChanged) continue;

    const { scoringPlayer, clockTime } = latestScoringMoment(competition);
    const message = `${
      homeTeam.team?.shortDisplayName || homeTeam.team?.displayName
    } ${homeScore} - ${awayScore} ${
      awayTeam.team?.shortDisplayName || awayTeam.team?.displayName
    } | ${scoringPlayer} scored at ${clockTime} ${league.goalSuffix}`;
    goalNotifications.push(message);
    console.log(`Goal detected in ${league.label} match ${matchId}: ${message}`);
    console.log(
      `Notifying ${fidsToNotify.length} fans for ${league.label} match ${matchId}`,
    );
    await sendFrameNotificationsBatch({
      fids: fidsToNotify,
      title: `Goal! Goal! Goal! ${league.titleSuffix}`,
      body: message,
    });
    try {
      await goalRedis.hset(key, { homeScore, awayScore });
    } catch (err) {
      console.error(`Failed to persist scores for ${matchId}`, err);
    }
  }

  await writePollSummary(league, {
    ok: true,
    eventsCount: liveEvents.length,
    inCount,
    postCount,
    preCount,
  });

  return {
    success: true,
    notificationsSent: goalNotifications.length + otherNotifications.length,
    goalNotifications,
    otherNotifications,
    eventsCount: liveEvents.length,
    inCount,
    postCount,
    preCount,
  };
}
