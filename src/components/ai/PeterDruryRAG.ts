import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from 'langchain/document';

// Types for Peter Drury commentary data
interface PeterDruryQuote {
  id: string;
  quote: string;
  paraphrase: boolean;
  event: string;
  date_utc: string;
  competition: string;
  teams: string[];
  player: string | null;
  match_context: string;
  tags: string[];
  metaphors: string[];
  source_name: string;
  source_url: string;
  source_confidence: 'high' | 'medium' | 'low';
}

interface MatchEvent {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  player?: string;
  eventType: 'goal' | 'assist' | 'red_card' | 'yellow_card' | 'substitution' | 'final_whistle' | 'penalty' | 'free_kick';
  minute?: number;
  score?: string;
  context?: string;
}

// Load Peter Drury commentary dataset
const loadPeterDruryData = async (): Promise<PeterDruryQuote[]> => {
  try {
    // Check if we're in a server environment
    if (typeof window === 'undefined') {
      // Server-side: use Node.js fs
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'src', 'data', 'peter-drury-commentary.json');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContent);
               } else {
             // Client-side: use fetch with current window location to avoid CORS issues
             const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fc-footy.vercel.app';
             const response = await fetch(`${baseUrl}/data/peter-drury-commentary.json`);
             if (!response.ok) {
               throw new Error(`Failed to load Peter Drury data: ${response.status}`);
             }
             return await response.json();
           }
  } catch (error) {
    console.error('Error loading Peter Drury data:', error);
    return [];
  }
};

// Create vector store for Peter Drury quotes
const createDruryVectorStore = async (quotes: PeterDruryQuote[]): Promise<MemoryVectorStore> => {
  const openAiApiKey = process.env.NEXT_PUBLIC_OPENAIKEY;
  
  if (!openAiApiKey) {
    throw new Error('OpenAI API key is missing');
  }

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: openAiApiKey,
  });

  // Create documents for vectorization
  const documents = quotes.map((quote) => {
    // Create rich text content for better embeddings
    const content = `
      Quote: "${quote.quote}"
      Event: ${quote.event}
      Competition: ${quote.competition}
      Teams: ${quote.teams.join(' vs ')}
      Player: ${quote.player || 'N/A'}
      Context: ${quote.match_context}
      Tags: ${quote.tags.join(', ')}
      Metaphors: ${quote.metaphors.join(', ')}
      Confidence: ${quote.source_confidence}
    `.trim();

    return new Document({
      pageContent: content,
      metadata: {
        id: quote.id,
        quote: quote.quote,
        event: quote.event,
        competition: quote.competition,
        teams: quote.teams,
        player: quote.player,
        match_context: quote.match_context,
        tags: quote.tags,
        metaphors: quote.metaphors,
        source_confidence: quote.source_confidence,
        paraphrase: quote.paraphrase,
      },
    });
  });

  return await MemoryVectorStore.fromDocuments(documents, embeddings);
};

// Retrieve relevant Peter Drury quotes for a match event
const retrieveDruryQuotes = async (
  vectorStore: MemoryVectorStore,
  matchEvent: MatchEvent,
  topK: number = 3
): Promise<PeterDruryQuote[]> => {
  // Create search query based on match context
  const searchQuery = `
    ${matchEvent.homeTeam} vs ${matchEvent.awayTeam}
    ${matchEvent.competition}
    ${matchEvent.eventType}
    ${matchEvent.player ? `player: ${matchEvent.player}` : ''}
    ${matchEvent.context || ''}
  `.trim();

  try {
    const results = await vectorStore.similaritySearch(searchQuery, topK);
    
    return results.map((doc) => ({
      id: doc.metadata.id,
      quote: doc.metadata.quote,
      paraphrase: doc.metadata.paraphrase,
      event: doc.metadata.event,
      date_utc: '', // Not stored in metadata
      competition: doc.metadata.competition,
      teams: doc.metadata.teams,
      player: doc.metadata.player,
      match_context: doc.metadata.match_context,
      tags: doc.metadata.tags,
      metaphors: doc.metadata.metaphors,
      source_name: '', // Not stored in metadata
      source_url: '', // Not stored in metadata
      source_confidence: doc.metadata.source_confidence,
    }));
  } catch (error) {
    console.error('Error retrieving Drury quotes:', error);
    return [];
  }
};

// Generate Peter Drury-style commentary
const generateDruryCommentary = async (
  matchEvent: MatchEvent,
  retrievedQuotes: PeterDruryQuote[]
): Promise<string> => {
  const openAiApiKey = process.env.NEXT_PUBLIC_OPENAIKEY;
  
  if (!openAiApiKey) {
    throw new Error('OpenAI API key is missing');
  }

  // Create context from retrieved quotes
  const quoteContext = retrievedQuotes
    .map((quote, index) => `Example ${index + 1}: "${quote.quote}" (Context: ${quote.match_context})`)
    .join('\n');

  // Create the prompt for Drury-style commentary
  const prompt = `
You are Peter Drury, the legendary football commentator known for his poetic, dramatic, and emotionally charged commentary style. Your commentary is characterized by:

**STYLE CHARACTERISTICS:**
- Poetic and dramatic language
- Use of mythology, geography, and cultural references
- Emotional crescendos and dramatic pauses
- Alliteration and rhythmic patterns
- Metaphorical language and vivid imagery
- National and continental pride
- Historical context and legacy references

**MATCH EVENT:**
- Teams: ${matchEvent.homeTeam} vs ${matchEvent.awayTeam}
- Competition: ${matchEvent.competition}
- Event Type: ${matchEvent.eventType}
- Player: ${matchEvent.player || 'N/A'}
- Minute: ${matchEvent.minute || 'N/A'}
- Score: ${matchEvent.score || 'N/A'}
- Context: ${matchEvent.context || 'N/A'}

**PETER DRURY QUOTE EXAMPLES FOR INSPIRATION:**
${quoteContext}

**TASK:**
Generate a single, powerful Peter Drury-style commentary line for this match event. The commentary should:
1. Capture the emotional intensity of the moment
2. Use Drury's signature poetic style
3. Be 1-2 sentences maximum
4. Feel authentic to his voice
5. Be suitable for live commentary

**RESPONSE FORMAT:**
Return ONLY the commentary line, no additional text or explanations.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are Peter Drury, the legendary football commentator. Respond only with authentic Drury-style commentary.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8, // Higher creativity for Drury's style
        max_tokens: 150,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating Drury commentary:', error);
    throw error;
  }
};

// Main function to generate Peter Drury-style commentary for a match event
export const generatePeterDruryCommentary = async (
  matchEvent: MatchEvent
): Promise<string> => {
  try {
    console.log('🎤 Generating Peter Drury commentary for:', matchEvent);

    // Load Peter Drury data
    const quotes = await loadPeterDruryData();
    if (quotes.length === 0) {
      throw new Error('No Peter Drury quotes available');
    }

    // Create vector store
    const vectorStore = await createDruryVectorStore(quotes);

    // Retrieve relevant quotes
    const retrievedQuotes = await retrieveDruryQuotes(vectorStore, matchEvent);
    console.log('📚 Retrieved relevant quotes:', retrievedQuotes.length);

    // Generate Drury-style commentary
    const commentary = await generateDruryCommentary(matchEvent, retrievedQuotes);
    console.log('🎭 Generated Drury commentary:', commentary);

    return commentary;
  } catch (error) {
    console.error('Error in generatePeterDruryCommentary:', error);
    // Fallback to a simple Drury-style line
    return `The drama unfolds at ${matchEvent.minute || 'this moment'} - ${matchEvent.homeTeam} and ${matchEvent.awayTeam} locked in battle!`;
  }
};

// Helper function to create match events from various data sources
export const createMatchEvent = (
  eventId: string,
  homeTeam: string,
  awayTeam: string,
  competition: string,
  eventType: MatchEvent['eventType'],
  options: {
    player?: string;
    minute?: number;
    score?: string;
    context?: string;
  } = {}
): MatchEvent => {
  return {
    eventId,
    homeTeam,
    awayTeam,
    competition,
    eventType,
    ...options,
  };
};

// Export types for use in other components
export type { PeterDruryQuote, MatchEvent };
