import { generatePeterDruryCommentary, createMatchEvent } from './src/components/ai/PeterDruryRAG.js';

const testMatch = async () => {
  const matchEvent = createMatchEvent(
    'test-match',
    'West Ham United',
    'Chelsea',
    'Premier League',
    'goal',
    {
      player: 'Trevoh Chalobah',
      minute: 58,
      score: '1-5',
      context: 'Trevoh Chalobah scores a second-half goal at 58\''
    }
  );

  try {
    const commentary = await generatePeterDruryCommentary(matchEvent);
    console.log('🎤 Generated Commentary:');
    console.log(commentary);
  } catch (error) {
    console.error('Error:', error);
  }
};

testMatch();
