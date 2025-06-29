// Simple verification script to check migration results
import { Redis } from '@upstash/redis';

async function verifyMigration() {
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    console.error('❌ Missing Redis environment variables!');
    process.exit(1);
  }

  const redis = new Redis({ url: redisUrl, token: redisToken });

  console.log('🔍 Verifying migration results...\n');

  try {
    // Check active leagues
    const activeLeagues = await redis.smembers('league:active');
    console.log(`📋 Active Leagues (${activeLeagues.length}):`);
    for (const leagueId of activeLeagues) {
      const leagueData = await redis.get(`league:${leagueId}`);
      if (leagueData) {
        let league;
        try {
          league = typeof leagueData === 'string' ? JSON.parse(leagueData) : leagueData;
        } catch (e) {
          league = leagueData;
        }
        console.log(`   ✅ ${league.name} (${league.id})`);
      }
    }

    console.log('\n🏟️  Teams by League:');
    
    // Check teams in each league
    for (const leagueId of activeLeagues) {
      const teamIds = await redis.smembers(`league:${leagueId}:teams`);
      if (teamIds.length > 0) {
        const leagueData = await redis.get(`league:${leagueId}`);
        let league = leagueData ? (typeof leagueData === 'string' ? JSON.parse(leagueData) : leagueData) : { name: leagueId };
        console.log(`\n   📍 ${league.name}:`);
        
        for (const teamId of teamIds) {
          const teamData = await redis.get(`team:${teamId}`);
          if (teamData) {
            let team;
            try {
              team = typeof teamData === 'string' ? JSON.parse(teamData) : teamData;
            } catch (e) {
              team = teamData;
            }
            console.log(`      ⚽ ${team.name} (${team.abbreviation})`);
          }
        }
      }
    }

    // Count total teams
    const allTeamKeys = await redis.keys('team:*');
    const actualTeamKeys = allTeamKeys.filter(key => !key.includes(':abbr:') && !key.includes(':name:') && !key.includes(':leagues'));
    
    console.log(`\n📊 Summary:`);
    console.log(`   🏆 Leagues: ${activeLeagues.length}`);
    console.log(`   ⚽ Teams: ${actualTeamKeys.length}`);
    console.log(`   🔗 Team-League Memberships: ${activeLeagues.reduce((total, leagueId) => {
      return total + (async () => {
        const teamIds = await redis.smembers(`league:${leagueId}:teams`);
        return teamIds.length;
      })();
    }, 0)}`);

    console.log('\n✅ Migration verification complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyMigration()
  .then(() => {
    console.log('🎉 Verification successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  }); 