// Test Redis Connection Script (ES Module)
// Verifies that Upstash Redis is properly configured and accessible

import { Redis } from '@upstash/redis';

async function testRedisConnection() {
  console.log('🔍 Testing Redis Connection...\n');

  // Check environment variables (using the correct names from your env.example)
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    console.error('❌ Missing Redis environment variables!');
    console.log('\nPlease add these to your .env.local file:');
    console.log('KV_REST_API_URL=https://your-database-url.upstash.io');
    console.log('KV_REST_API_TOKEN=your-redis-token');
    console.log('\nNote: These should already be set up for your notifications system.');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`   URL: ${redisUrl}`);
  console.log(`   Token: ${redisToken.substring(0, 10)}...`);

  try {
    // Initialize Redis client
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    console.log('\n🔄 Testing Redis connection...');

    // Test basic operations
    const testKey = 'fc-footy:test:connection';
    const testValue = { message: 'Hello from FC-Footy!', timestamp: new Date().toISOString() };

    // Test SET operation
    await redis.set(testKey, JSON.stringify(testValue));
    console.log('✅ SET operation successful');

    // Test GET operation
    const retrievedValue = await redis.get(testKey);
    let parsedValue = null;
    if (retrievedValue) {
      try {
        parsedValue = typeof retrievedValue === 'string' ? JSON.parse(retrievedValue) : retrievedValue;
      } catch (e) {
        parsedValue = retrievedValue;
      }
    }
    console.log('✅ GET operation successful');
    console.log(`   Retrieved: ${parsedValue?.message || 'Object retrieved successfully'}`);

    // Test SET operations (for team management)
    await redis.sadd('test:set', 'item1', 'item2', 'item3');
    console.log('✅ SET operations successful');

    // Test SMEMBERS operation
    const setMembers = await redis.smembers('test:set');
    console.log('✅ SMEMBERS operation successful');
    console.log(`   Set members: ${setMembers.join(', ')}`);

    // Clean up test data
    await redis.del(testKey);
    await redis.del('test:set');
    console.log('✅ Cleanup successful');

    console.log('\n🎉 Redis connection test passed!');
    console.log('   Your Upstash Redis database is ready for the team management system.');

  } catch (error) {
    console.error('\n❌ Redis connection test failed!');
    console.error('Error:', error);
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Verify your Upstash Redis database is active');
    console.log('2. Check your environment variables are correct');
    console.log('3. Ensure your database URL and token are valid');
    console.log('4. Check your network connection');
    
    process.exit(1);
  }
}

// Run the test
testRedisConnection()
  .then(() => {
    console.log('\n🚀 Ready to proceed with team management system!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  }); 