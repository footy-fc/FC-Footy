import { NextRequest } from "next/server";
import { getUserNotificationDetails } from "~/lib/kv";
import { sendFrameNotification } from "~/lib/notifications";
import { sendFrameNotificationsBatch } from "~/lib/notificationsBatch";
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

  const batchResult = await sendFrameNotificationsBatch({
    fids: targetFids,
    title,
    body,
    targetURL,
  });

  return Response.json({
    success: true,
    sentTo: `team followers (${teamAbbreviation})`,
    totals: batchResult
  });
}

export const runtime = 'edge'; 
