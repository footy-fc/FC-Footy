// Test Redis Connection Script
// Verifies that Upstash Redis is properly configured and accessible

import { Redis } from '@upstash/redis';

async function testRedisConnection() {
  console.log('🔍 Testing Redis Connection...\n');

  // Check environment variables
  const redisUrl = process.env.NEXT_PUBLIC_KV_REST_API_URL;
  const redisToken = process.env.NEXT_PUBLIC_KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    console.error('❌ Missing Redis environment variables!');
    console.log('\nPlease add these to your .env.local file:');
    console.log('NEXT_PUBLIC_KV_REST_API_URL=https://your-database-url.upstash.io');
    console.log('NEXT_PUBLIC_KV_REST_API_TOKEN=your-redis-token');
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
    const retrievedValue = await redis.get<string>(testKey);
    const parsedValue = retrievedValue ? JSON.parse(retrievedValue) : null;
    console.log('✅ GET operation successful');
    console.log(`   Retrieved: ${parsedValue?.message}`);

    // Test SET operations (for team management)
    await redis.sadd('test:set', 'item1', 'item2', 'item3');
    console.log('✅ SET operations successful');

    // Test SMEMBERS operation
    const setMembers = await redis.smembers<string[]>('test:set');
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

// Run test if this script is executed directly
if (require.main === module) {
  testRedisConnection()
    .then(() => {
      console.log('\n🚀 Ready to proceed with team management system!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testRedisConnection }; 