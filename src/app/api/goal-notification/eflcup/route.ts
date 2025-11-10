/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import axios from "axios";
import { sendFrameNotification } from "~/lib/notifications";
import { getFansForTeams } from "~/lib/kvPerferences";
import { scanKeys } from "../../lib/redisScan";
import { fetchJSONWithRetry, errorAsOk, okJson } from "../../lib/http";

// Ensure that your environment variables are correctly set.
// Consider renaming them if they are meant for server-only usage.
const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

export async function POST(request: NextRequest) {
  // ESPN Scoreboard endpoint for English Premier League
  const scoreboardUrl =
    "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.league_cup/scoreboard";

  let liveEvents;
  const leagueId = "eng.1";
  try {
    const data = await fetchJSONWithRetry<any>(scoreboardUrl, {
      retries: 3,
      timeoutMs: 8000,
      backoffMs: 600,
    });
    if (!data.events) {
      throw new Error("No events data returned from API");
    }
    // Filter events for live matches (state === "in")
    liveEvents = data.events.filter(
      (event: any) =>
        event.competitions?.[0]?.status?.type?.state === "in"
    );
    console.log(`Found ${liveEvents.length} live event(s).`);
  } catch (error) {
    console.error("Error fetching scoreboard:", error);
    return errorAsOk("Failed to fetch scoreboard", { league: "efl-cup" });
  }

  const goalNotifications: string[] = [];

  // Loop through each live event
  for (const event of liveEvents) {
    const matchId = event.id;
    const competition = event.competitions?.[0];
    if (!competition) {
      console.warn(`No competition data for match ${matchId}. Skipping.`);
      continue;
    }

    // Extract home and away teams
    const homeTeam = competition.competitors?.find(
      (c: any) => c.homeAway === "home"
    );
    const awayTeam = competition.competitors?.find(
      (c: any) => c.homeAway === "away"
    );
    if (!homeTeam || !awayTeam) {
      console.warn(`Missing team data for match ${matchId}. Skipping.`);
      continue;
    }
    const homeScore = parseInt(homeTeam.score, 10);
    const awayScore = parseInt(awayTeam.score, 10);

    // Fetch previous scores from Redis
    let previousScore;
    try {
      previousScore = await redis.hgetall(`fc-footy:match:${matchId}`);
    } catch (err) {
      console.error(`Error fetching Redis data for match ${matchId}`, err);
      continue;
    }

    // Initialize match in Redis if not found
    if (!previousScore || Object.keys(previousScore).length === 0) {
      console.log(
        `Initializing Redis for match ${matchId} with scores: ${homeScore}-${awayScore}`
      );
      await redis.hset(`fc-footy:match:${matchId}`, { homeScore, awayScore });
      continue; // Skip notification on first data record
    }

    // If scores have not changed, skip notification
    if (
      Number(previousScore.homeScore) === homeScore &&
      Number(previousScore.awayScore) === awayScore
    ) {
      continue;
    }

    // Extract goal details if available
    let scoringPlayer = "Baller";
    let clockTime = "00:00";
    if (competition.details && Array.isArray(competition.details)) {
      // Sort details by clock time (converted to seconds)
      const keyMoments = competition.details.sort((a: any, b: any) => {
        const timeA = a.clock?.displayValue || "00:00";
        const timeB = b.clock?.displayValue || "00:00";
        const secondsA = timeA
          .split(":")
          .reduce(
            (acc: number, val: string) => acc * 60 + parseInt(val, 10),
            0
          );
        const secondsB = timeB
          .split(":")
          .reduce(
            (acc: number, val: string) => acc * 60 + parseInt(val, 10),
            0
          );
        return secondsA - secondsB;
      });
      if (keyMoments.length > 0) {
        const latestMoment = keyMoments[keyMoments.length - 1];
        scoringPlayer =
          latestMoment.athletesInvolved?.[0]?.displayName || scoringPlayer;
        clockTime = latestMoment.clock?.displayValue || clockTime;
      }
    } else {
      console.warn(`No detailed moments found for match ${matchId}.`);
    }

    // Create a notification message
    const message = `${
      homeTeam.team?.shortDisplayName || homeTeam.team?.displayName
    } ${homeScore} - ${awayScore} ${
      awayTeam.team?.shortDisplayName || awayTeam.team?.displayName
    } | ${scoringPlayer} scored at ${clockTime}`;
    goalNotifications.push(message);
    console.log(`Goal detected in match ${matchId}: ${message}`);

    // Fetch fans for both teams
    let homeFans: number[] = [];
    let awayFans: number[] = [];
    const homeTeamId =  `${leagueId}-${homeTeam.team?.abbreviation}`;
    const awayTeamId =  `${leagueId}-${awayTeam.team?.abbreviation}`;

    console.log(`Fetching fans for teams: ${homeTeamId}, ${awayTeamId}`);

    try {
      homeFans = await getFansForTeams([(homeTeamId).toLowerCase()]);
      awayFans = await getFansForTeams([(awayTeamId).toLowerCase()]);
      console.log(homeFans, awayFans);
    } catch (err) {
      console.error(`Error fetching fans for match ${matchId}`, err);
    }
    const uniqueFansToNotify = new Set([...homeFans, ...awayFans]);

    // Get all subscribed user keys from Redis
    let userKeys: string[] = [];
    try {
      userKeys = await scanKeys(redis as any, "fc-footy:user:*", { count: 1000, limit: 50000 });
    } catch (err) {
      console.error("Error scanning user keys from Redis", err);
    }
    // Filter fans to notify based on user key patterns
    const fidsToNotify = Array.from(uniqueFansToNotify).filter((fid) =>
      userKeys.some((key) => key.endsWith(`:${fid}`))
    );
    console.log(`Notifying ${fidsToNotify.length} fans for match ${matchId}`);

    // Send notifications in batches
    const batchSize = 40;
    for (let i = 0; i < fidsToNotify.length; i += batchSize) {
      const batch = fidsToNotify.slice(i, i + batchSize);
      const notificationPromises = batch.map(async (fid) => {
        try {
          await sendFrameNotification({
            fid,
            title: "Goal! Goal! Goal!",
            body: message,
          });
        } catch (error) {
          console.error(`Failed to send notification to FID: ${fid}`, error);
        }
      });
      await Promise.all(notificationPromises);
    }

    // Update Redis with the new scores after sending notifications
    try {
      await redis.hset(`fc-footy:match:${matchId}`, { homeScore, awayScore });
    } catch (err) {
      console.error(`Failed to persist scores for ${matchId}`, err);
    }
  }

  return okJson({
    success: true,
    notificationsSent: goalNotifications.length,
    goalNotifications,
  });
}

export const runtime = "edge";

export async function GET(request: NextRequest) {
  return POST(request);
}
