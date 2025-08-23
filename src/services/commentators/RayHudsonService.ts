import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from 'langchain/document';
import { BaseCommentatorService } from '~/services/CommentatorService';
import { MatchEvent, CommentatorQuote } from '~/types/commentatorTypes';

export class RayHudsonService extends BaseCommentatorService {
  id = 'ray-hudson';
  name = 'Ray Hudson';
  displayName = 'R. Hudson';
  description = 'Enthusiastic football commentator known for his passionate and colorful commentary';
  style = 'enthusiastic' as const;
  dataset = 'ray-hudson';

  private vectorStoreCache: MemoryVectorStore | null = null;
  private dataCache: CommentatorQuote[] | null = null;

  async generateCommentary(matchEvent: MatchEvent): Promise<string> {
    try {
      const quotes = await this.loadCommentatorData();
      const vectorStore = await this.createVectorStore(quotes);
      const relevantQuotes = await this.retrieveRelevantQuotes(vectorStore, matchEvent);
      return await this.generateCommentaryFromQuotes(matchEvent, relevantQuotes);
    } catch (error) {
      console.error('Error generating Ray Hudson commentary:', error);
      return '';
    }
  }

  protected async loadCommentatorData(): Promise<CommentatorQuote[]> {
    if (this.dataCache) {
      return this.dataCache;
    }

    try {
      // Check if we're in a server environment
      if (typeof window === 'undefined') {
        // Server-side: use Node.js fs
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'src', 'data', 'commentators', 'ray-hudson.json');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        this.dataCache = JSON.parse(fileContent);
        return this.dataCache!;
      } else {
        // Client-side: use fetch with current window location to avoid CORS issues
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fc-footy.vercel.app';
        const response = await fetch(`${baseUrl}/data/commentators/ray-hudson.json`);
        if (!response.ok) {
          throw new Error(`Failed to load Ray Hudson data: ${response.status}`);
        }
        this.dataCache = await response.json();
        return this.dataCache!;
      }
    } catch (error) {
      console.error('Error loading Ray Hudson data:', error);
      return [];
    }
  }

  protected async createVectorStore(quotes: CommentatorQuote[]): Promise<MemoryVectorStore> {
    if (this.vectorStoreCache) {
      return this.vectorStoreCache;
    }

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.NEXT_PUBLIC_OPENAIKEY,
    });

    const documents = quotes.map((quote) => new Document({
      pageContent: quote.quote,
      metadata: {
        id: quote.id,
        quote: quote.quote,
        event: quote.event,
        competition: quote.competition,
        teams: quote.teams,
        player: quote.player,
        context: quote.context,
        tags: quote.tags,
        metaphors: quote.metaphors,
        source_confidence: quote.source_confidence,
      },
    }));

    this.vectorStoreCache = await MemoryVectorStore.fromDocuments(documents, embeddings);
    return this.vectorStoreCache;
  }

  protected async retrieveRelevantQuotes(vectorStore: MemoryVectorStore, matchEvent: MatchEvent): Promise<CommentatorQuote[]> {
    const searchQuery = `
      ${matchEvent.homeTeam} vs ${matchEvent.awayTeam}
      ${matchEvent.competition}
      ${matchEvent.eventType}
      ${matchEvent.player ? `player: ${matchEvent.player}` : ''}
      ${matchEvent.context || ''}
    `.trim();

    try {
      const results = await vectorStore.similaritySearch(searchQuery, 3);
      
      return results.map((doc) => ({
        id: doc.metadata.id,
        quote: doc.metadata.quote,
        event: doc.metadata.event,
        competition: doc.metadata.competition,
        teams: doc.metadata.teams,
        player: doc.metadata.player,
        context: doc.metadata.context,
        tags: doc.metadata.tags,
        metaphors: doc.metadata.metaphors,
        source_confidence: doc.metadata.source_confidence,
      }));
    } catch (error) {
      console.error('Error retrieving Ray Hudson quotes:', error);
      return [];
    }
  }

  protected async generateCommentaryFromQuotes(matchEvent: MatchEvent, retrievedQuotes: CommentatorQuote[]): Promise<string> {
    const openAiApiKey = process.env.NEXT_PUBLIC_OPENAIKEY;
    
    if (!openAiApiKey) {
      console.error('OpenAI API key is missing');
      return '';
    }

    const prompt = `
You are Ray Hudson, the enthusiastic and passionate football commentator known for his colorful, dramatic, and over-the-top commentary style. You have a unique ability to capture the excitement of football moments with vivid language, creative metaphors, and infectious enthusiasm.

Generate a single, authentic Ray Hudson-style commentary line for this match event. Your commentary should be:

1. **Enthusiastic and Passionate**: Use exclamatory language that captures the excitement
2. **Authentic to Hudson's Style**: Include his signature phrases like "MAGISTERIAL!", "BRILLIANT!", "INCREDIBLE!", and creative metaphors
3. **Contextually Relevant**: Reference the specific teams, players, and match situation
4. **Concise**: Keep it to one powerful sentence or short phrase (max 100 characters)
5. **Inspired by Examples**: Use the provided Ray Hudson quotes as inspiration for style and tone

**Match Event Details:**
- Teams: ${matchEvent.homeTeam} vs ${matchEvent.awayTeam}
- Competition: ${matchEvent.competition}
- Event Type: ${matchEvent.eventType}
- Player: ${matchEvent.player || 'Unknown'}
- Minute: ${matchEvent.minute || 'Unknown'}
- Score: ${matchEvent.score || 'Unknown'}
- Context: ${matchEvent.context || 'General match moment'}

**Ray Hudson Quote Examples for Style Reference:**
${retrievedQuotes.map(quote => `"${quote.quote}"`).join('\n')}

Generate a single, authentic Ray Hudson commentary line for this moment:
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
              content: 'You are Ray Hudson, the enthusiastic football commentator. Generate authentic, passionate commentary in his signature style.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 150,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const commentary = data.choices[0]?.message?.content?.trim();
      
      return commentary || '';
    } catch (error) {
      console.error('Error generating commentary:', error);
      return '';
    }
  }
}
