import { SendNotificationRequest, sendNotificationResponseSchema } from "@farcaster/miniapp-sdk";
import { getUserNotificationDetailsMany } from "~/lib/kv";

const appUrl = process.env.NEXT_PUBLIC_URL || "";

export async function sendFrameNotificationsBatch({
  fids,
  title,
  body,
  targetURL,
}: {
  fids: number[];
  title: string;
  body: string;
  targetURL?: string;
}): Promise<{ sent: number; skipped: number; errors: number; rateLimited: number }>{
  if (!fids.length) return { sent: 0, skipped: 0, errors: 0, rateLimited: 0 };

  const detailsMap = await getUserNotificationDetailsMany(fids);
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || "production";

  let sent = 0, skipped = 0, errors = 0, rateLimited = 0;

  const batchSize = 50;
  for (let i = 0; i < fids.length; i += batchSize) {
    const group = fids.slice(i, i + batchSize);
    const ops = group.map(async (fid) => {
      const nd = detailsMap.get(fid);
      if (!nd) { skipped++; return; }

      const isTesting = environment === "testing" || environment === "development";
      if (isTesting && !nd.url.startsWith("http://localhost")) { skipped++; return; }

      try {
        const response = await fetch(nd.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notificationId: crypto.randomUUID(),
            title,
            body,
            targetUrl: targetURL || appUrl,
            tokens: [nd.token],
          } satisfies SendNotificationRequest),
        });
        const json = await response.json();
        if (response.status === 200) {
          const parsed = sendNotificationResponseSchema.safeParse(json);
          if (!parsed.success) { errors++; return; }
          if (parsed.data.result.rateLimitedTokens.length) { rateLimited++; return; }
          sent++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    });
    await Promise.all(ops);
  }

  return { sent, skipped, errors, rateLimited };
}

