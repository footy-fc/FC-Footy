/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { sendFrameNotification } from "~/lib/notifications";
import { getFansForTeamAbbr } from "~/lib/kvPerferences";
import { ApiResponse, Competition, Competitor, MatchDetail, MatchEvent } from "../../../lib/types";
import { fetchJSONWithRetry, errorAsOk, okJson } from "../../../lib/http";

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

export async function POST(request: NextRequest) {
  const scoreboardUrl =
    "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.caf/scoreboard";

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
    liveEvents = data.events.filter(
      (event) =>
        event.competitions?.[0]?.status?.type?.state === "in" ||
        event.competitions?.[0]?.status?.type?.state === "post"
    );
    console.log(`Found ${liveEvents.length} live or completed event(s) in CAF.`);
  } catch (error) {
    console.error("Error fetching CAF scoreboard:", error);
    return errorAsOk("Failed to fetch scoreboard", { league: "worldcup-caf" });
  }

  const goalNotifications: string[] = [];
  const otherNotifications: string[] = [];

  for (const event of liveEvents) {
    const matchId = event.id;
    console.log(`Processing match ID: ${matchId}`);
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
    } (WRLD CUP Q)`;

    // Fetch fans for notifications
    let homeFans: number[] = [];
    let awayFans: number[] = [];
    try {
      if (homeTeamAbbr) {
        homeFans = await getFansForTeamAbbr(homeTeamAbbr);
      }
      if (awayTeamAbbr) {
        awayFans = await getFansForTeamAbbr(awayTeamAbbr);
      }
      console.log(
        `Fans for ${homeTeamAbbr || "unknown"}: ${homeFans.length}, ${awayTeamAbbr || "unknown"}: ${awayFans.length}`
      );
    } catch (err) {
      console.error(`Error fetching fans for CAF match ${matchId}`, err);
    }
    const uniqueFansToNotify = new Set([...homeFans, ...awayFans]);
    const fidsToNotify = Array.from(uniqueFansToNotify);

    // Notification flags (kickoff/halftime/fulltime)
    let notificationFlags: {
      kickoff_notified?: string;
      halftime_notified?: string;
      fulltime_notified?: string;
    } | null;
    try {
      notificationFlags = await redis.hgetall(`fc-footy:caf:notifications:${matchId}`);
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
      console.log(`Kickoff detected for match ${matchId}: ${message}`);

      const batchSize = 40;
      for (let i = 0; i < fidsToNotify.length; i += batchSize) {
        const batch = fidsToNotify.slice(i, i + batchSize);
        const notificationPromises = batch.map(async (fid) => {
          try {
            await sendFrameNotification({
              fid,
              title: "Match Started! (WRLD CUP Q)",
              body: message,
            });
          } catch (error) {
            console.error(`Failed to send kickoff notification to FID: ${fid}`, error);
          }
        });
        await Promise.all(notificationPromises);
      }

      try {
        await redis.hset(`fc-footy:caf:notifications:${matchId}`, {
          kickoff_notified: "true",
        });
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
      console.log(`Halftime detected for match ${matchId}: ${message}`);

      const batchSize = 40;
      for (let i = 0; i < fidsToNotify.length; i += batchSize) {
        const batch = fidsToNotify.slice(i, i + batchSize);
        const notificationPromises = batch.map(async (fid) => {
          try {
            await sendFrameNotification({
              fid,
              title: "Halftime! (WRLD CUP Q)",
              body: message,
            });
          } catch (error) {
            console.error(`Failed to send halftime notification to FID: ${fid}`, error);
          }
        });
        await Promise.all(notificationPromises);
      }

      try {
        await redis.hset(`fc-footy:caf:notifications:${matchId}`, {
          halftime_notified: "true",
        });
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
      console.log(`Full-time detected for match ${matchId}: ${message}`);

      const batchSize = 40;
      for (let i = 0; i < fidsToNotify.length; i += batchSize) {
        const batch = fidsToNotify.slice(i, i + batchSize);
        const notificationPromises = batch.map(async (fid) => {
          try {
            await sendFrameNotification({
              fid,
              title: "Match Ended! (WRLD CUP Q)",
              body: message,
            });
          } catch (error) {
            console.error(`Failed to send full-time notification to FID: ${fid}`, error);
          }
        });
        await Promise.all(notificationPromises);
      }

      try {
        await redis.hset(`fc-footy:caf:notifications:${matchId}`, {
          fulltime_notified: "true",
        });
      } catch (err) {
        console.error(`Failed to hset fulltime flag for ${matchId}`, err);
      }
    }

    // Goal notifications
    let previousScore: { homeScore?: string; awayScore?: string } | null;
    try {
      previousScore = await redis.hgetall(`fc-footy:caf:match:${matchId}`);
    } catch (err) {
      console.error(`Error fetching Redis data for caf match ${matchId}`, err);
      continue;
    }

    if (!previousScore || Object.keys(previousScore).length === 0) {
      console.log(
        `Initializing Redis for caf match ${matchId} with scores: ${homeScore}-${awayScore}`
      );
      try {
        await redis.hset(`fc-footy:caf:match:${matchId}`, { homeScore, awayScore });
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

    let scoringPlayer = "Baller";
    let clockTime = "00:00";
    if (competition.details && Array.isArray(competition.details)) {
      const keyMoments = competition.details.sort((a: MatchDetail, b: MatchDetail) => {
        const timeA = a.clock?.displayValue || "00:00";
        const timeB = b.clock?.displayValue || "00:00";
        const secondsA = timeA
          .split(":")
          .reduce((acc: number, val: string) => acc * 60 + parseInt(val, 10), 0);
        const secondsB = timeB
          .split(":")
          .reduce((acc: number, val: string) => acc * 60 + parseInt(val, 10), 0);
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
    } | ${scoringPlayer} scored at ${clockTime} (WRLD CUP Q)`;
    goalNotifications.push(message);
    console.log(`Goal detected in caf match ${matchId}: ${message}`);

    const batchSize = 40;
    for (let i = 0; i < fidsToNotify.length; i += batchSize) {
      const batch = fidsToNotify.slice(i, i + batchSize);
      const notificationPromises = batch.map(async (fid) => {
        try {
          await sendFrameNotification({
            fid,
            title: "Goal! Goal! Goal! (WRLD CUP Q)",
            body: message,
          });
        } catch (error) {
          console.error(`Failed to send caf notification to FID: ${fid}`, error);
        }
      });
      await Promise.all(notificationPromises);
    }

    try {
      await redis.hset(`fc-footy:caf:match:${matchId}`, { homeScore, awayScore });
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

// Allow Vercel Cron GET
export async function GET(request: NextRequest) {
  return POST(request);
}

