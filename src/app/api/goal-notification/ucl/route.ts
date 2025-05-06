/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import axios from "axios";
import { sendFrameNotification } from "~/lib/notifications";
import { getFansForTeamAbbr } from "~/lib/kvPerferences";
import { ApiResponse, Competition, Competitor, MatchDetail, MatchEvent } from "../../lib/types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

export async function POST(request: NextRequest) {
  const scoreboardUrl =
    "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard";

  let liveEvents: MatchEvent[];
  try {
    const response = await axios.get<ApiResponse>(scoreboardUrl);
    if (!response.data.events) {
      throw new Error("No events data returned from API");
    }
    // Include both "in" and "post" matches to catch full-time events
    liveEvents = response.data.events.filter(
      (event) =>
        event.competitions?.[0]?.status?.type?.state === "in" ||
        event.competitions?.[0]?.status?.type?.state === "post"
    );
    console.log(`Found ${liveEvents.length} live or completed event(s) in UCL.`);
  } catch (error) {
    console.error("Error fetching UCL scoreboard:", error);
    return new NextResponse(
      JSON.stringify({ success: false, error: "Failed to fetch scoreboard" }),
      { status: 500 }
    );
  }

  const goalNotifications: string[] = [];
  const otherNotifications: string[] = []; // Track kickoff, halftime, full-time notifications

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
    } (UCL)`;

    // Fetch fans for notifications (shared for all notification types)
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
        `Fans for ${homeTeamAbbr || "unknown"}: ${
          homeFans.length
        }, ${awayTeamAbbr || "unknown"}: ${awayFans.length}`
      );
    } catch (err) {
      console.error(`Error fetching fans for UCL match ${matchId}`, err);
    }
    const uniqueFansToNotify = new Set([...homeFans, ...awayFans]);
    const fidsToNotify = Array.from(uniqueFansToNotify);

    // --- New Logic: Kickoff, Halftime, Full-Time Notifications ---
    let notificationFlags: {
      kickoff_notified?: string;
      halftime_notified?: string;
      fulltime_notified?: string;
    } | null;
    try {
      notificationFlags = await redis.hgetall(`fc-footy:ucl:notifications:${matchId}`);
    } catch (err) {
      console.error(`Error fetching notification flags for match ${matchId}`, err);
      notificationFlags = null;
    }

    // Kickoff Notification
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
              title: "Match Started! (UCL)",
              body: message,
            });
          } catch (error) {
            console.error(`Failed to send kickoff notification to FID: ${fid}`, error);
          }
        });
        await Promise.all(notificationPromises);
      }

      await redis.hset(`fc-footy:ucl:notifications:${matchId}`, {
        kickoff_notified: "true",
      });
    }

    // Halftime Notification
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
              title: "Halftime! (UCL)",
              body: message,
            });
          } catch (error) {
            console.error(`Failed to send halftime notification to FID: ${fid}`, error);
          }
        });
        await Promise.all(notificationPromises);
      }

      await redis.hset(`fc-footy:ucl:notifications:${matchId}`, {
        halftime_notified: "true",
      });
    }

    // Full-Time Notification
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
              title: "Match Ended! (UCL)",
              body: message,
            });
          } catch (error) {
            console.error(`Failed to send full-time notification to FID: ${fid}`, error);
          }
        });
        await Promise.all(notificationPromises);
      }

      await redis.hset(`fc-footy:ucl:notifications:${matchId}`, {
        fulltime_notified: "true",
      });
    }
    // --- End New Logic ---

    // --- Existing Goal Notification Logic (Unchanged) ---
    let previousScore: { homeScore?: string; awayScore?: string } | null;
    try {
      previousScore = await redis.hgetall(`fc-footy:ucl:match:${matchId}`);
    } catch (err) {
      console.error(`Error fetching Redis data for UCL match ${matchId}`, err);
      continue;
    }

    if (!previousScore || Object.keys(previousScore).length === 0) {
      console.log(
        `Initializing Redis for UCL match ${matchId} with scores: ${homeScore}-${awayScore}`
      );
      await redis.hset(`fc-footy:ucl:match:${matchId}`, { homeScore, awayScore });
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
    }

    const message = `${
      homeTeam.team?.shortDisplayName || homeTeam.team?.displayName
    } ${homeScore} - ${awayScore} ${
      awayTeam.team?.shortDisplayName || awayTeam.team?.displayName
    } | ${scoringPlayer} scored at ${clockTime} (UCL)`;
    goalNotifications.push(message);
    console.log(`Goal detected in UCL match ${matchId}: ${message}`);

    console.log(`Notifying ${fidsToNotify.length} fans for UCL match ${matchId}`);

    const batchSize = 40;
    for (let i = 0; i < fidsToNotify.length; i += batchSize) {
      const batch = fidsToNotify.slice(i, i + batchSize);
      const notificationPromises = batch.map(async (fid) => {
        try {
          await sendFrameNotification({
            fid,
            title: "Goal! Goal! Goal! (UCL)",
            body: message,
          });
        } catch (error) {
          console.error(`Failed to send UCL notification to FID: ${fid}`, error);
        }
      });
      await Promise.all(notificationPromises);
    }

    await redis.hset(`fc-footy:ucl:match:${matchId}`, { homeScore, awayScore });
    // --- End Existing Goal Notification Logic ---
  }

  return new NextResponse(
    JSON.stringify({
      success: true,
      notificationsSent: goalNotifications.length + otherNotifications.length,
      goalNotifications,
      otherNotifications, // Include for debugging or logging
    }),
    { status: 200 }
  );
}

export const runtime = "edge";