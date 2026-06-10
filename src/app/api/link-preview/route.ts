import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

const LINK_PREVIEW_ENDPOINT = "https://api.linkpreview.net";
const LINK_PREVIEW_API_KEY =
  process.env.LINKPREVIEW_API_KEY || process.env.NEXT_PUBLIC_LINKPREVIEW_API_KEY || "";
const PREVIEW_CACHE_TTL_SECONDS = 60 * 60 * 24 * 14;
const PREVIEW_NEGATIVE_CACHE_TTL_SECONDS = 60 * 30;

type CachedPreviewRecord = {
  ok: true;
  preview: {
    title: string;
    description: string;
    image: string;
    url: string;
    site_name: string;
    icon: string;
    image_x: number;
    image_y: number;
  };
  cachedAt: string;
};

type CachedPreviewMiss = {
  ok: false;
  error: string;
  cachedAt: string;
};

const redis =
  process.env.NEXT_PUBLIC_KV_REST_API_URL && process.env.NEXT_PUBLIC_KV_REST_API_TOKEN
    ? new Redis({
        url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
        token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
      })
    : null;

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getPreviewCacheKey(url: string) {
  const digest = createHash("sha256").update(url).digest("hex");
  return `fc-footy:link-preview:v1:${digest}`;
}

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get("url")?.trim() || "";

  if (!targetUrl || !isValidHttpUrl(targetUrl)) {
    return NextResponse.json({ ok: false, error: "Invalid url" }, { status: 400 });
  }

  if (!LINK_PREVIEW_API_KEY) {
    return NextResponse.json({ ok: false, error: "Missing LINKPREVIEW_API_KEY" }, { status: 503 });
  }

  const cacheKey = getPreviewCacheKey(targetUrl);

  if (redis) {
    try {
      const cached = await redis.get<CachedPreviewRecord | CachedPreviewMiss>(cacheKey);
      if (cached && typeof cached === "object" && "ok" in cached) {
        if (cached.ok) {
          return NextResponse.json(cached, {
            headers: {
              "Cache-Control": "s-maxage=43200, stale-while-revalidate=86400",
              "X-Footy-Preview-Cache": "hit",
            },
          });
        }

        return NextResponse.json(cached, {
          status: 404,
          headers: {
            "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600",
            "X-Footy-Preview-Cache": "negative-hit",
          },
        });
      }
    } catch (error) {
      console.error("link preview cache read failed", error);
    }
  }

  const previewUrl = new URL(LINK_PREVIEW_ENDPOINT);
  previewUrl.searchParams.set("q", targetUrl);
  previewUrl.searchParams.set("fields", "site_name,icon,image_x,image_y");

  try {
    const response = await fetch(previewUrl.toString(), {
      headers: {
        "X-Linkpreview-Api-Key": LINK_PREVIEW_API_KEY,
        accept: "application/json",
      },
      next: { revalidate: 43200 },
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const errorPayload: CachedPreviewMiss = {
        ok: false,
        error:
          typeof payload.description === "string"
            ? payload.description
            : typeof payload.error === "string"
              ? payload.error
              : "Preview lookup failed",
        cachedAt: new Date().toISOString(),
      };

      if (redis) {
        try {
          await redis.set(cacheKey, errorPayload, { ex: PREVIEW_NEGATIVE_CACHE_TTL_SECONDS });
        } catch (error) {
          console.error("link preview cache write failed", error);
        }
      }

      return NextResponse.json(errorPayload, { status: response.status });
    }

    const successPayload: CachedPreviewRecord = {
      ok: true,
      preview: {
        title: typeof payload.title === "string" ? payload.title : "",
        description: typeof payload.description === "string" ? payload.description : "",
        image: typeof payload.image === "string" ? payload.image : "",
        url: typeof payload.url === "string" ? payload.url : targetUrl,
        site_name: typeof payload.site_name === "string" ? payload.site_name : "",
        icon: typeof payload.icon === "string" ? payload.icon : "",
        image_x: typeof payload.image_x === "number" ? payload.image_x : 0,
        image_y: typeof payload.image_y === "number" ? payload.image_y : 0,
      },
      cachedAt: new Date().toISOString(),
    };

    if (redis) {
      try {
        await redis.set(cacheKey, successPayload, { ex: PREVIEW_CACHE_TTL_SECONDS });
      } catch (error) {
        console.error("link preview cache write failed", error);
      }
    }

    return NextResponse.json(successPayload, {
      headers: {
        "Cache-Control": "s-maxage=43200, stale-while-revalidate=86400",
        "X-Footy-Preview-Cache": "miss",
      },
    });
  } catch (error) {
    const errorPayload: CachedPreviewMiss = {
      ok: false,
      error: error instanceof Error ? error.message : "Preview lookup failed",
      cachedAt: new Date().toISOString(),
    };

    if (redis) {
      try {
        await redis.set(cacheKey, errorPayload, { ex: PREVIEW_NEGATIVE_CACHE_TTL_SECONDS });
      } catch (cacheError) {
        console.error("link preview cache write failed", cacheError);
      }
    }

    return NextResponse.json(errorPayload, { status: 502 });
  }
}

export const runtime = "nodejs";
