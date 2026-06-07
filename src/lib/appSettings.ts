import { Redis } from "@upstash/redis";
import { WORLD_CUP_MODE } from "./config";

// ─── App-level runtime settings (KV-backed) ──────────────────────────────────
// Settings that admins can flip at runtime without a redeploy. Each setting
// falls back to its compile-time default (from config.ts) when unset in KV.

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

const WORLD_CUP_MODE_KEY = "fc-footy:settings:world-cup-mode";

function coerceBool(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value === "true" || value === "1";
  return null;
}

/**
 * Resolve World Cup mode. Returns the KV override when present, otherwise the
 * WORLD_CUP_MODE default from config.ts.
 */
export async function getWorldCupModeSetting(): Promise<boolean> {
  try {
    const stored = coerceBool(await redis.get(WORLD_CUP_MODE_KEY));
    return stored === null ? WORLD_CUP_MODE : stored;
  } catch (err) {
    console.error("getWorldCupModeSetting failed, using config default", err);
    return WORLD_CUP_MODE;
  }
}

/** Persist the World Cup mode override. */
export async function setWorldCupModeSetting(enabled: boolean): Promise<void> {
  await redis.set(WORLD_CUP_MODE_KEY, enabled);
}
