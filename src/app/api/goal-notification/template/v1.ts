/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// import { NextRequest, NextResponse } from "next/server";


// import { Redis } from "@upstash/redis";
// import axios from "axios";
// import { sendFrameNotification } from "~/lib/notifications";
// import { sendFrameNotificationsBatch } from "~/lib/notificationsBatch";
// import { getFansForTeamAbbr } from "~/lib/kvPerferences"; // Import the new function

// const redis = new Redis({
//   url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
//   token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
// });

// export async function POST(request: NextRequest) {
//   const scoreboardUrl =
//     "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard";

//   let liveEvents;
//   try {
//     const response = await axios.get(scoreboardUrl);
//     if (!response.data.events) {
//       throw new Error("No events data returned from API");
//     }
//     liveEvents = response.data.events.filter(
//       (event: any) => event.competitions?.[0]?.status?.type?.state === "in"
//     );
//     console.log(`Found ${liveEvents.length} live event(s) in UCL.`);
//   } catch (error) {
//     console.error("Error fetching UCL scoreboard:", error);
//     return new NextResponse(
//       JSON.stringify({ success: false, error: "Failed to fetch scoreboard" }),
//       { status: 500 }
//     );
//   }

//   const goalNotifications: string[] = [];

//   for (const event of liveEvents) {
//     const matchId = event.id;
//     const competition = event.competitions?.[0];
//     if (!competition) {
//       console.warn(`No competition data for match ${matchId}. Skipping.`);
//       continue;
//     }

//     const homeTeam = competition.competitors?.find(
//       (c: any) => c.homeAway === "home"
//     );
//     const awayTeam = competition.competitors?.find(
//       (c: any) => c.homeAway === "away"
//     );
//     if (!homeTeam || !awayTeam) {
//       console.warn(`Missing team data for match ${matchId}. Skipping.`);
//       continue;
//     }
//     const homeScore = parseInt(homeTeam.score, 10);
//     const awayScore = parseInt(awayTeam.score, 10);

//     let previousScore;
//     try {
//       previousScore = await redis.hgetall(`fc-footy:ucl:match:${matchId}`);
//     } catch (err) {
//       console.error(`Error fetching Redis data for UCL match ${matchId}`, err);
//       continue;
//     }

//     if (!previousScore || Object.keys(previousScore).length === 0) {
//       console.log(
//         `Initializing Redis for UCL match ${matchId} with scores: ${homeScore}-${awayScore}`
//       );
//       await redis.hset(`fc-footy:ucl:match:${matchId}`, { homeScore, awayScore });
//       continue;
//     }

//     if (
//       Number(previousScore.homeScore) === homeScore &&
//       Number(previousScore.awayScore) === awayScore
//     ) {
//       continue;
//     }

//     let scoringPlayer = "Baller";
//     let clockTime = "00:00";
//     if (competition.details && Array.isArray(competition.details)) {
//       const keyMoments = competition.details.sort((a: any, b: any) => {
//         const timeA = a.clock?.displayValue || "00:00";
//         const timeB = b.clock?.displayValue || "00:00";
//         const secondsA = timeA
//           .split(":")
//           .reduce(
//             (acc: number, val: string) => acc * 60 + parseInt(val, 10),
//             0
//           );
//         const secondsB = timeB
//           .split(":")
//           .reduce(
//             (acc: number, val: string) => acc * 60 + parseInt(val, 10),
//             0
//           );
//         return secondsA - secondsB;
//       });
//       if (keyMoments.length > 0) {
//         const latestMoment = keyMoments[keyMoments.length - 1];
//         scoringPlayer =
//           latestMoment.athletesInvolved?.[0]?.displayName || scoringPlayer;
//         clockTime = latestMoment.clock?.displayValue || clockTime;
//       }
//     }

//     const homeTeamAbbr = homeTeam.team?.abbreviation?.toLowerCase();
//     const awayTeamAbbr = awayTeam.team?.abbreviation?.toLowerCase();

//     const message = `${
//       homeTeam.team?.shortDisplayName || homeTeam.team?.displayName
//     } ${homeScore} - ${awayScore} ${
//       awayTeam.team?.shortDisplayName || awayTeam.team?.displayName
//     } | ${scoringPlayer} scored at ${clockTime} (UCL)`;
//     goalNotifications.push(message);
//     console.log(`Goal detected in UCL match ${matchId}: ${message}`);

//     // Fetch fans using team abbreviations
//     let homeFans: number[] = [];
//     let awayFans: number[] = [];
//     try {
//       homeFans = await getFansForTeamAbbr(homeTeamAbbr);
//       awayFans = await getFansForTeamAbbr(awayTeamAbbr);
//       console.log(`Fans for ${homeTeamAbbr}: ${homeFans.length}, ${awayTeamAbbr}: ${awayFans.length}`);
//     } catch (err) {
//       console.error(`Error fetching fans for UCL match ${matchId}`, err);
//     }

//     const uniqueFansToNotify = new Set([...homeFans, ...awayFans]);
//     const fidsToNotify = Array.from(uniqueFansToNotify);

//     console.log(`Notifying ${fidsToNotify.length} fans for UCL match ${matchId}`);

//     const batchSize = 40;
//     for (let i = 0; i < fidsToNotify.length; i += batchSize) {
//       const batch = fidsToNotify.slice(i, i + batchSize);
//       const notificationPromises = batch.map(async (fid) => {
//         try {
//           await sendFrameNotification({
//             fid,
//             title: "Goal! Goal! Goal! (UCL)",
//             body: message,
//           });
//         } catch (error) {
//           console.error(`Failed to send UCL notification to FID: ${fid}`, error);
//         }
//       });
//       await Promise.all(notificationPromises);
//     }

//     await redis.hset(`fc-footy:ucl:match:${matchId}`, { homeScore, awayScore });
//   }

//   return new NextResponse(
//     JSON.stringify({
//       success: true,
//       notificationsSent: goalNotifications.length,
//       goalNotifications,
//     }),
//     { status: 200 }
//   );
// }

// export const runtime = "edge";

//TODO ROLL BACK IF SPAMMY
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import axios from "axios";
import { sendFrameNotification } from "~/lib/notifications";
import { sendFrameNotificationsBatch } from "~/lib/notificationsBatch";
import { getFansForTeamAbbr } from "~/lib/kvPerferences";
import { fetchJSONWithRetry, errorAsOk, okJson } from "../../lib/http";

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

interface MatchState {
  homeScore: number;
  awayScore: number;
  status: string; // e.g., "STATUS_IN_PROGRESS", "STATUS_HALF_TIME"
  detailsHash?: string; // Hash of details to detect changes
}

export async function POST(request: NextRequest) {
  const scoreboardUrl =
    "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard";

  let liveEvents;
  try {
    const data = await fetchJSONWithRetry<any>(scoreboardUrl, {
      retries: 3,
      timeoutMs: 8000,
      backoffMs: 600,
    });
    if (!data.events) throw new Error("No events data returned from API");
    liveEvents = data.events;
    console.log(`Found ${liveEvents.length} event(s) in UCL.`);
  } catch (error) {
    console.error("Error fetching UCL scoreboard:", error);
    return errorAsOk("Failed to fetch scoreboard", { league: "template-v1" });
  }

  const notifications: { type: string; message: string }[] = [];

  for (const event of liveEvents) {
    const matchId = event.id;
    const competition = event.competitions?.[0];
    if (!competition) {
      console.warn(`No competition data for match ${matchId}. Skipping.`);
      continue;
    }

    const homeTeam = competition.competitors?.find((c: any) => c.homeAway === "home");
    const awayTeam = competition.competitors?.find((c: any) => c.homeAway === "away");
    if (!homeTeam || !awayTeam) {
      console.warn(`Missing team data for match ${matchId}. Skipping.`);
      continue;
    }

    const homeScore = parseInt(homeTeam.score, 10) || 0;
    const awayScore = parseInt(awayTeam.score, 10) || 0;
    const status = competition.status?.type?.name || "STATUS_SCHEDULED";
    const homeTeamAbbr = homeTeam.team?.abbreviation?.toLowerCase();
    const awayTeamAbbr = awayTeam.team?.abbreviation?.toLowerCase();
    const matchName = `${
      homeTeam.team?.shortDisplayName || homeTeam.team?.displayName
    } vs ${
      awayTeam.team?.shortDisplayName || awayTeam.team?.displayName
    } (UCL)`;

    // Fetch previous state from Redis
    let previousState: MatchState | any;
    try {
      previousState = await redis.hgetall(`fc-footy:ucl:match:${matchId}`);
    } catch (err) {
      console.error(`Error fetching Redis data for UCL match ${matchId}`, err);
      continue;
    }

    const currentState: MatchState | any = {
      homeScore,
      awayScore,
      status,
      detailsHash: JSON.stringify(competition.details || []),
    };

    // Initialize match in Redis if not found
    if (!previousState || Object.keys(previousState).length === 0) {
      console.log(`Initializing Redis for match ${matchId} with state:`, currentState);
      try {
        await redis.hset(`fc-footy:ucl:match:${matchId}`, currentState);
      } catch (err) {
        console.error(`Failed to initialize state for ${matchId}`, err);
      }
      // Send kickoff notification if match is starting
      if (status === "STATUS_IN_PROGRESS") {
        const message = `${matchName} has kicked off!`;
        notifications.push({ type: "kickoff", message });
        console.log(`Kickoff detected for match ${matchId}`);
      }
      continue;
    }

    // Fetch fans for notifications
    let homeFans: number[] = [];
    let awayFans: number[] = [];
    try {
      homeFans = await getFansForTeamAbbr(homeTeamAbbr);
      awayFans = await getFansForTeamAbbr(awayTeamAbbr);
      console.log(`Fans for ${homeTeamAbbr}: ${homeFans.length}, ${awayTeamAbbr}: ${awayFans.length}`);
    } catch (err) {
      console.error(`Error fetching fans for UCL match ${matchId}`, err);
    }
    const uniqueFansToNotify = new Set([...homeFans, ...awayFans]);
    const fidsToNotify = Array.from(uniqueFansToNotify);

    // Function to send notifications
    const notifyFans = async (title: string, body: string) => {
      await sendFrameNotificationsBatch({ fids: fidsToNotify, title, body });
    };

    // 1. Kickoff Notification (already handled on initialization if applicable)
    if (
      previousState.status === "STATUS_SCHEDULED" &&
      status === "STATUS_IN_PROGRESS"
    ) {
      const message = `${matchName} has kicked off!`;
      notifications.push({ type: "kickoff", message });
      await notifyFans("Match Started! (UCL)", message);
      console.log(`Kickoff notification sent for match ${matchId}`);
    }

    // 2. Goal Notification
    if (
      Number(previousState.homeScore) !== homeScore ||
      Number(previousState.awayScore) !== awayScore
    ) {
      let scoringPlayer = "Baller";
      let clockTime = "00:00";
      if (competition.details && Array.isArray(competition.details)) {
        const keyMoments = competition.details.sort((a: any, b: any) => {
          const timeA = a.clock?.displayValue || "00:00";
          const timeB = b.clock?.displayValue || "00:00";
          const secondsA = timeA.split(":").reduce((acc: number, val: string) => acc * 60 + parseInt(val, 10), 0);
          const secondsB = timeB.split(":").reduce((acc: number, val: string) => acc * 60 + parseInt(val, 10), 0);
          return secondsA - secondsB;
        });
        const latestMoment = keyMoments[keyMoments.length - 1];
        if (latestMoment?.type?.id === "5") { // Goal event
          scoringPlayer = latestMoment.athletesInvolved?.[0]?.displayName || scoringPlayer;
          clockTime = latestMoment.clock?.displayValue || clockTime;
        }
      }
      const message = `${matchName} | ${scoringPlayer} scored at ${clockTime} | Score: ${homeScore}-${awayScore}`;
      notifications.push({ type: "goal", message });
      await notifyFans("Goal! Goal! Goal! (UCL)", message);
      console.log(`Goal notification sent for match ${matchId}`);
    }

    // 3. Red Card or Yellow Card Notification
    if (competition.details && previousState.detailsHash !== currentState.detailsHash) {
      const newDetails = competition.details.filter((d: any) => {
        const prevDetails = JSON.parse(previousState.detailsHash || "[]");
        return !prevDetails.some((pd: any) => pd.id === d.id);
      });
      for (const detail of newDetails) {
        if (detail.type?.id === "14") { // Yellow Card
          const player = detail.athletesInvolved?.[0]?.displayName || "A player";
          const clockTime = detail.clock?.displayValue || "00:00";
          const message = `${matchName} | ${player} received a yellow card at ${clockTime}`;
          notifications.push({ type: "yellowCard", message });
          await notifyFans("Yellow Card (UCL)", message);
          console.log(`Yellow card notification sent for match ${matchId}`);
        } else if (detail.type?.id === "15") { // Red Card
          const player = detail.athletesInvolved?.[0]?.displayName || "A player";
          const clockTime = detail.clock?.displayValue || "00:00";
          const message = `${matchName} | ${player} received a red card at ${clockTime}`;
          notifications.push({ type: "redCard", message });
          await notifyFans("Red Card! (UCL)", message);
          console.log(`Red card notification sent for match ${matchId}`);
        }
      }
    }

    // 4. Halftime Notification
    if (
      previousState.status !== "STATUS_HALF_TIME" &&
      status === "STATUS_HALF_TIME"
    ) {
      const message = `${matchName} | Halftime: ${homeScore}-${awayScore}`;
      notifications.push({ type: "halftime", message });
      await notifyFans("Halftime (UCL)", message);
      console.log(`Halftime notification sent for match ${matchId}`);
    }

    // 5. Full-time Notification
    if (
      previousState.status !== "STATUS_FULL_TIME" &&
      status === "STATUS_FULL_TIME"
    ) {
      const message = `${matchName} | Full Time: ${homeScore}-${awayScore}`;
      notifications.push({ type: "fulltime", message });
      await notifyFans("Match Ended (UCL)", message);
      console.log(`Full-time notification sent for match ${matchId}`);
    }

    // Update Redis with the current state
    try {
      await redis.hset(`fc-footy:ucl:match:${matchId}`, currentState);
    } catch (err) {
      console.error(`Failed to persist state for ${matchId}`, err);
    }
  }

  return okJson({
    success: true,
    notificationsSent: notifications.length,
    notifications,
  });
}

export const runtime = "edge";
