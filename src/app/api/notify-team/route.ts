import { NextRequest } from "next/server";
import { getUserNotificationDetails } from "~/lib/kv";
import { sendFrameNotification } from "~/lib/notifications";
import { getFansForTeamAbbr } from "~/lib/kvPerferences";

export async function POST(request: NextRequest) {
  // Validate API key from headers
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  const { title, body, targetURL, teamAbbreviation } = await request.json();

  if (!teamAbbreviation) {
    return Response.json(
      { success: false, error: "Team abbreviation is required" },
      { status: 400 }
    );
  }

  // Get team follower FIDs
  const targetFids = await getFansForTeamAbbr(teamAbbreviation);

  if (targetFids.length === 0) {
    return Response.json({
      success: true,
      notificationResults: [],
      sentTo: `team followers (${teamAbbreviation})`,
      totalSent: 0,
      message: `No followers found for team ${teamAbbreviation}`
    });
  }

  const notificationResults: Array<{ fid: number; result: string | unknown }> = [];
  const chunkSize = 35;

  // Process keys in batches of 35
  for (let i = 0; i < targetFids.length; i += chunkSize) {
    const batch = targetFids.slice(i, i + chunkSize);

    // Process the current batch concurrently
    const batchResults = await Promise.all(
      batch.map(async (fid) => {
        try {
          const notificationDetails = await getUserNotificationDetails(fid);
          if (notificationDetails) {
            const result = await sendFrameNotification({ fid, title, body, targetURL });
            return { fid, result };
          } else {
            console.warn(`No notification details found for FID: ${fid}`);
            return { fid, result: "No notification details found" };
          }
        } catch (error) {
          console.error(`Error sending notification to FID: ${fid}`, error);
          return { fid, result: "Error sending notification" };
        }
      })
    );
    notificationResults.push(...batchResults);
  }

  return Response.json({
    success: true,
    notificationResults,
    sentTo: `team followers (${teamAbbreviation})`,
    totalSent: notificationResults.length
  });
}

export const runtime = 'edge'; 