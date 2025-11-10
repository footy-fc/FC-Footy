/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import axios from "axios";
import { sendFrameNotification } from "~/lib/notifications";
import { scanKeys } from "../../lib/redisScan";
import { fetchJSONWithRetry, errorAsOk, okJson } from "../../lib/http";

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

export async function POST(request: NextRequest) {
  // Fetch live scoreboard from ESPN API
  const scoreboardUrl =
    "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard";

  let liveEvents;
  try {
    const data = await fetchJSONWithRetry<any>(scoreboardUrl, {
      retries: 3,
      timeoutMs: 8000,
      backoffMs: 600,
    });
    liveEvents = data.events?.filter(
      (event: any) => event.competitions?.[0]?.status?.type?.state === "in"
    ) ?? [];
  } catch (error) {
    console.error("Error fetching scoreboard:", error);
    return errorAsOk("Failed to fetch scoreboard", { league: "template" });
  }

  // Process live events to detect goal changes
  const goalNotifications: string[] = [];
  for (const event of liveEvents) {
    const matchId = event.id;
    const homeTeam = event.competitions[0].competitors.find(
      (c: any) => c.homeAway === "home"
    );
    const awayTeam = event.competitions[0].competitors.find(
      (c: any) => c.homeAway === "away"
    );

    const homeScore = parseInt(homeTeam.score, 10);
    const awayScore = parseInt(awayTeam.score, 10);

    // Fetch previous scores from Redis
    const previousScore = await redis.hgetall(`fc-footy:match:${matchId}`);

    if (!previousScore || Object.keys(previousScore).length === 0) {
      // Initialize the match in Redis if it doesn't exist
      console.log(`No previous data for match ${matchId}. Initializing scores.`);
      await redis.hset(`fc-footy:match:${matchId}`, { homeScore, awayScore });
    } else {
      // Compare scores to detect a change
      if (
        Number(previousScore.homeScore) !== homeScore ||
        Number(previousScore.awayScore) !== awayScore
      ) {
        // Extract player who scored and clock time
        const keyMoments = event.competitions[0]?.details
          ?.sort((a: any, b: any) => {
            const timeA = a.clock.displayValue || "00:00";
            const timeB = b.clock.displayValue || "00:00";
            const secondsA = timeA.split(":").reduce(
              (min: any, sec: any) => min * 60 + parseInt(sec, 10),
              0
            );
            const secondsB = timeB.split(":").reduce(
                (min: any, sec: any) => min * 60 + parseInt(sec, 10),
              0
            );
            return secondsA - secondsB;
          })
          ?.reduce((acc: any[], detail: any) => {
            const playerName =
              detail.athletesInvolved?.[0]?.displayName || "Baller";
            const action = detail.type.text;
            const time = detail.clock.displayValue || "00:00";
            const teamId = detail.team.id;
            return [...acc, { playerName, action, time, teamId }];
          }, []);

        const latestMoment =
          keyMoments && keyMoments[keyMoments.length - 1]; // Get the most recent moment
        const scoringPlayer = latestMoment?.playerName || "Baller";
        const clockTime = latestMoment?.time || "00:00";

        // Goal detected
        const message = `${homeTeam.team.shortDisplayName} ${homeScore} - ${awayScore} ${awayTeam.team.shortDisplayName} | ${scoringPlayer} scored at ${clockTime}`;
        goalNotifications.push(message);

        // Send notifications to all subscribed footies
        const userKeys = await scanKeys(redis as any, "fc-footy:user:*", { count: 1000, limit: 50000 });
        const batchSize = 40;
        for (let i = 0; i < userKeys.length; i += batchSize) {
          const batch = userKeys.slice(i, i + batchSize);
          const notificationPromises = batch.map(async (key) => {
            const fid = parseInt(key.split(":").pop()!);
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

        // Update Redis with the new scores
        try {
          await redis.hset(`fc-footy:match:${matchId}`, { homeScore, awayScore });
        } catch (err) {
          console.error(`Failed to persist scores for ${matchId}`, err);
        }
      }
    }
  }

  return okJson({
    success: true,
    notificationsSent: goalNotifications.length,
    goalNotifications,
  });
}

export const runtime = "edge";
