import { NextRequest, NextResponse } from "next/server";
import { getFinalWhistleSubscribers } from "~/lib/newsletterPreferences";

const DEFAULT_LIST_INBOX = "finalwhistle@agentmail.to";

function isAuthorized(request: NextRequest) {
  const token = process.env.FINAL_WHISTLE_ADMIN_TOKEN;
  return Boolean(
    token && request.headers.get("authorization") === `Bearer ${token}`
  );
}

function csvCell(value: string | number | undefined) {
  const text = value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  if (!process.env.FINAL_WHISTLE_ADMIN_TOKEN) {
    return NextResponse.json(
      { error: "FINAL_WHISTLE_ADMIN_TOKEN is not configured" },
      { status: 503 }
    );
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscribers = await getFinalWhistleSubscribers();
  const destination =
    process.env.FINAL_WHISTLE_LIST_INBOX || DEFAULT_LIST_INBOX;

  if (request.nextUrl.searchParams.get("format") === "csv") {
    const header = [
      "email",
      "fid",
      "fpl_entry_id",
      "fpl_season",
      "fpl_league_ids",
      "manager_label",
      "consent_at",
      "subscribed_at",
      "source",
    ];
    const rows = subscribers.map((subscriber) => [
      subscriber.email,
      subscriber.fid,
      subscriber.fplEntryId,
      subscriber.fplSeason,
      subscriber.fplLeagueIds.join("|"),
      subscriber.managerLabel,
      subscriber.consentAt,
      subscriber.subscribedAt,
      subscriber.source,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => csvCell(value)).join(","))
      .join("\n");

    return new NextResponse(csv, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": "attachment; filename=final-whistle-subscribers.csv",
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  }

  return NextResponse.json(
    {
      ok: true,
      destination,
      count: subscribers.length,
      subscribers,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export const runtime = "nodejs";
