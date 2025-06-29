// Cleanup script to delete all league:* keys from Upstash Redis
// Run this before re-running the migration to fix bad league data

import { Redis } from '@upstash/redis';

async function cleanupLeagueKeys() {
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    console.error('❌ Missing Redis environment variables!');
    process.exit(1);
  }

  const redis = new Redis({ url: redisUrl, token: redisToken });

  console.log('🔍 Scanning for league:* keys...');
  let cursor = 0;
  let deleted = 0;
  do {
    const result = await redis.scan(cursor, { match: 'league:*', count: 100 });
    cursor = result.cursor;
    if (result.keys && result.keys.length > 0) {
      for (const key of result.keys) {
        await redis.del(key);
        console.log(`🗑️  Deleted: ${key}`);
        deleted++;
      }
    }
  } while (cursor !== 0);

  console.log(`\n✅ Cleanup complete. Deleted ${deleted} league:* keys.`);
}

cleanupLeagueKeys()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }); 