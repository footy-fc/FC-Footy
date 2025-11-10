import type { Redis } from "@upstash/redis";

export async function scanKeys(
  redis: Redis,
  pattern: string,
  { count = 1000, limit = 50000 }: { count?: number; limit?: number } = {}
): Promise<string[]> {
  let cursor: string = "0";
  const out: string[] = [];
  do {
    const [nextCursor, keys] = (await (redis as any).scan(cursor, {
      match: pattern,
      count,
    })) as [string, string[]];
    if (Array.isArray(keys) && keys.length) {
      for (const k of keys) {
        out.push(k);
        if (out.length >= limit) return out;
      }
    }
    cursor = nextCursor;
  } while (cursor !== "0");
  return out;
}

