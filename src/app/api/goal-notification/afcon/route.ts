/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { sendFrameNotificationsBatch } from "~/lib/notificationsBatch";
import { getFansForTeamAbbr } from "~/lib/kvPerferences";
import { ApiResponse, Competition, Competitor, MatchDetail, MatchEvent } from "../../lib/types";
import { fetchJSONWithRetry, errorAsOk, okJson } from "../../lib/http";

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

export async function POST(request: NextRequest) {
  const scoreboardUrl =
    "https://site.api.espn.com/apis/site/v2/sports/soccer/caf.africa.cup/scoreboard";

  let liveEvents: MatchEvent[];
  try {
    const data = await fetchJSONWithRetry<ApiResponse>(scoreboardUrl, {
      retries: 3,
      timeoutMs: 8000,
      backoffMs: 600,
    });
    if (!data.events) {
      throw new Error("No events data returned from API");
    }
    // Include both "in" and "post" matches to catch full-time events
    liveEvents = data.events.filter(
      (event) =>
        event.competitions?.[0]?.status?.type?.state === "in" ||
        event.competitions?.[0]?.status?.type?.state === "post"
    );
    console.log(`Found ${liveEvents.length} live or completed event(s) in AFCON.`);
  } catch (error) {
    console.error("Error fetching AFCON scoreboard:", error);
    return errorAsOk("Failed to fetch scoreboard", { league: "afcon" });
  }

  const goalNotifications: string[] = [];
  const otherNotifications: string[] = []; // kickoff, halftime, full-time

  for (const event of liveEvents) {
    const matchId = event.id;
    const competition: Competition | undefined = event.competitions?.[0];
    if (!competition) {
      console.warn(`No competition data for match ${matchId}. Skipping.`);
      continue;
    }

    const homeTeam = competition.competitors?.find(
      (c: Competitor) => c.homeAway === "home"
    );
    const awayTeam = competition.competitors?.find(
      (c: Competitor) => c.homeAway === "away"
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
    } (AFCON)`;

    // Fans to notify
    let homeFans: number[] = [];
    let awayFans: number[] = [];
    try {
      if (homeTeamAbbr) homeFans = await getFansForTeamAbbr(homeTeamAbbr);
      if (awayTeamAbbr) awayFans = await getFansForTeamAbbr(awayTeamAbbr);
    } catch (err) {
      console.error(`Error fetching fans for AFCON match ${matchId}`, err);
    }
    const fidsToNotify = Array.from(new Set([...homeFans, ...awayFans]));

    // Kickoff / Halftime / Full-time notifications (idempotent via flags)
    let notificationFlags: {
      kickoff_notified?: string;
      halftime_notified?: string;
      fulltime_notified?: string;
    } | null;
    try {
      notificationFlags = await redis.hgetall(`fc-footy:afcon:notifications:${matchId}`);
    } catch (err) {
      console.error(`Error fetching notification flags for match ${matchId}`, err);
      notificationFlags = null;
    }

    // Kickoff
    if (
      competition.status?.type?.state === "in" &&
      (!notificationFlags || !notificationFlags.kickoff_notified)
    ) {
      const message = `Kickoff: ${matchName}`;
      otherNotifications.push(message);
      await sendFrameNotificationsBatch({ fids: fidsToNotify, title: "Match Started! (AFCON)", body: message });
      try {
        await redis.hset(`fc-footy:afcon:notifications:${matchId}`, { kickoff_notified: "true" });
      } catch (err) {
        console.error(`Failed to hset kickoff flag for ${matchId}`, err);
      }
    }

    // Halftime
    if (
      competition.status?.type?.name === "STATUS_HALFTIME" &&
      (!notificationFlags || !notificationFlags.halftime_notified)
    ) {
      const message = `Halftime: ${matchName} | Score: ${homeScore}-${awayScore}`;
      otherNotifications.push(message);
      await sendFrameNotificationsBatch({ fids: fidsToNotify, title: "Halftime! (AFCON)", body: message });
      try {
        await redis.hset(`fc-footy:afcon:notifications:${matchId}`, { halftime_notified: "true" });
      } catch (err) {
        console.error(`Failed to hset halftime flag for ${matchId}`, err);
      }
    }

    // Full-time
    if (
      (competition.status?.type?.state === "post" ||
        competition.status?.type?.name === "STATUS_FULL_TIME") &&
      (!notificationFlags || !notificationFlags.fulltime_notified)
    ) {
      const message = `Full Time: ${matchName} | Final Score: ${homeScore}-${awayScore}`;
      otherNotifications.push(message);
      await sendFrameNotificationsBatch({ fids: fidsToNotify, title: "Match Ended! (AFCON)", body: message });
      try {
        await redis.hset(`fc-footy:afcon:notifications:${matchId}`, { fulltime_notified: "true" });
      } catch (err) {
        console.error(`Failed to hset fulltime flag for ${matchId}`, err);
      }
    }

    // Goal notifications (score change detection)
    let previousScore: { homeScore?: string; awayScore?: string } | null;
    try {
      previousScore = await redis.hgetall(`fc-footy:afcon:match:${matchId}`);
    } catch (err) {
      console.error(`Error fetching Redis data for AFCON match ${matchId}`, err);
      continue;
    }

    if (!previousScore || Object.keys(previousScore).length === 0) {
      try {
        await redis.hset(`fc-footy:afcon:match:${matchId}`, { homeScore, awayScore });
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

    // Try to derive last scoring player/time from details
    let scoringPlayer = "Baller";
    let clockTime = "00:00";
    if (competition.details && Array.isArray(competition.details)) {
      const keyMoments = competition.details.sort((a: MatchDetail, b: MatchDetail) => {
        const timeA = a.clock?.displayValue || "00:00";
        const timeB = b.clock?.displayValue || "00:00";
        const secondsA = timeA.split(":").reduce((acc: number, val: string) => acc * 60 + parseInt(val, 10), 0);
        const secondsB = timeB.split(":").reduce((acc: number, val: string) => acc * 60 + parseInt(val, 10), 0);
        return secondsA - secondsB;
      });
      if (keyMoments.length > 0) {
        const latestMoment = keyMoments[keyMoments.length - 1];
        scoringPlayer = latestMoment.athletesInvolved?.[0]?.displayName || scoringPlayer;
        clockTime = latestMoment.clock?.displayValue || clockTime;
      }
    }

    const message = `${
      homeTeam.team?.shortDisplayName || homeTeam.team?.displayName
    } ${homeScore} - ${awayScore} ${
      awayTeam.team?.shortDisplayName || awayTeam.team?.displayName
    } | ${scoringPlayer} scored at ${clockTime} (AFCON)`;
    goalNotifications.push(message);

    await sendFrameNotificationsBatch({
      fids: fidsToNotify,
      title: "Goal! Goal! Goal! (AFCON)",
      body: message,
    });

    try {
      await redis.hset(`fc-footy:afcon:match:${matchId}`, { homeScore, awayScore });
    } catch (err) {
      console.error(`Failed to persist scores for ${matchId}`, err);
    }
  }

  return okJson({
    success: true,
    notificationsSent: goalNotifications.length + otherNotifications.length,
    goalNotifications,
    otherNotifications,
  });
}

export const runtime = "edge";

export async function GET(request: NextRequest) {
  return POST(request);
}

