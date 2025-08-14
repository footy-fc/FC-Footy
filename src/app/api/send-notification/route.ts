import { notificationDetailsSchema } from "@farcaster/miniapp-sdk";
import { NextRequest } from "next/server";
import { z } from "zod";
import { setUserNotificationDetails } from "~/lib/kv";
import { sendFrameNotification } from "~/lib/notifications";

const requestSchema = z.object({
  fid: z.number(),
  notificationDetails: notificationDetailsSchema,
});

export async function POST(request: NextRequest) {
  // Validate API key from headers
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  const requestJson = await request.json();
  const requestBody = requestSchema.safeParse(requestJson);

  if (requestBody.success === false) {
    return Response.json(
      { success: false, errors: requestBody.error.errors },
      { status: 400 }
    );
  }

  await setUserNotificationDetails(
    requestBody.data.fid,
    requestBody.data.notificationDetails
  );

  const sendResult = await sendFrameNotification({
    fid: requestBody.data.fid,
    title: "Hello from gabeDEV footy",
    body: "Sent at " + new Date().toISOString(),
  });

  if (sendResult.state === "error") {
    return Response.json(
      { success: false, error: sendResult.error },
      { status: 500 }
    );
  } else if (sendResult.state === "rate_limit") {
    return Response.json(
      { success: false, error: "Rate limited" },
      { status: 429 }
    );
  }

  return Response.json({ success: true });
}
export const runtime = 'nodejs';