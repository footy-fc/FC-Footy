import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from 'langchain/document';
import { BaseCommentatorService } from '~/services/CommentatorService';
import { MatchEvent, CommentatorQuote } from '~/types/commentatorTypes';

export class PeterDruryService extends BaseCommentatorService {
  id = 'peter-drury';
  name = 'Peter Drury';
  displayName = 'P. Drury';
  description = 'Legendary football commentator known for his poetic and dramatic style';
  style = 'dramatic' as const;
  dataset = 'peter-drury';

  private vectorStoreCache: MemoryVectorStore | null = null;
  private dataCache: CommentatorQuote[] | null = null;

  async generateCommentary(matchEvent: MatchEvent): Promise<string> {
    try {
      const quotes = await this.loadCommentatorData();
      const vectorStore = await this.createVectorStore(quotes);
      const relevantQuotes = await this.retrieveRelevantQuotes(vectorStore, matchEvent);
      return await this.generateCommentaryFromQuotes(matchEvent, relevantQuotes);
    } catch (error) {
      console.error('Error generating Peter Drury commentary:', error);
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
        const filePath = path.join(process.cwd(), 'src', 'data', 'commentators', 'peter-drury.json');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        this.dataCache = JSON.parse(fileContent);
        return this.dataCache!;
      } else {
        // Client-side: use fetch with current window location to avoid CORS issues
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fc-footy.vercel.app';
        const response = await fetch(`${baseUrl}/data/commentators/peter-drury.json`);
        if (!response.ok) {
          throw new Error(`Failed to load Peter Drury data: ${response.status}`);
        }
        this.dataCache = await response.json();
        return this.dataCache!;
      }
    } catch (error) {
      console.error('Error loading Peter Drury data:', error);
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
      console.error('Error retrieving Drury quotes:', error);
      return [];
    }
  }

  protected async generateCommentaryFromQuotes(matchEvent: MatchEvent, retrievedQuotes: CommentatorQuote[]): Promise<string> {
    const openAiApiKey = process.env.NEXT_PUBLIC_OPENAIKEY;
    
    if (!openAiApiKey) {
      console.error('OpenAI API key is missing');
      return '';
    }

    console.log('[Peter Drury] generateCommentaryFromQuotes called with eventType:', matchEvent.eventType);

    // Special handling for chat commentary
    if (matchEvent.eventType === 'chat_commentary') {
      console.log('[Peter Drury] Calling generateChatCommentary for chat_commentary event');
      return this.generateChatCommentary(matchEvent, retrievedQuotes);
    }

    console.log('[Peter Drury] Using standard commentary generation for eventType:', matchEvent.eventType);

    const prompt = `
You are Peter Drury, the legendary football commentator known for your poetic, dramatic, and emotionally charged commentary style. You have a unique ability to capture the magic and drama of football moments with vivid language, mythology references, and powerful crescendos.

Generate a single, authentic Peter Drury-style commentary line for this match event. Your commentary should be:

1. **Dramatic and Poetic**: Use vivid, emotional language that captures the moment
2. **Authentic to Drury's Style**: Include his signature phrases, mythology references, and dramatic crescendos
3. **Contextually Relevant**: Reference the specific teams, players, and match situation
4. **Concise**: Keep it to one powerful sentence or short phrase (max 100 characters)
5. **Inspired by Examples**: Use the provided Peter Drury quotes as inspiration for style and tone

**Match Event Details:**
- Teams: ${matchEvent.homeTeam} vs ${matchEvent.awayTeam}
- Competition: ${matchEvent.competition}
- Event Type: ${matchEvent.eventType}
- Player: ${matchEvent.player || 'Unknown'}
- Minute: ${matchEvent.minute || 'Unknown'}
- Score: ${matchEvent.score || 'Unknown'}
- Context: ${matchEvent.context || 'General match moment'}

**Peter Drury Quote Examples for Style Reference:**
${retrievedQuotes.map(quote => `"${quote.quote}"`).join('\n')}

Generate a single, authentic Peter Drury commentary line for this moment:
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
          temperature: 0.8,
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
      return '';
    }
  }

  private async generateChatCommentary(matchEvent: MatchEvent, retrievedQuotes: CommentatorQuote[]): Promise<string> {
    const openAiApiKey = process.env.NEXT_PUBLIC_OPENAIKEY;
    
    console.log('[Peter Drury] OpenAI API key check:', {
      hasKey: !!openAiApiKey,
      keyLength: openAiApiKey ? openAiApiKey.length : 0,
      keyPrefix: openAiApiKey ? openAiApiKey.substring(0, 10) + '...' : 'none'
    });
    
    if (!openAiApiKey) {
      console.error('OpenAI API key is missing');
      return '';
    }

    // Extract chat history and user information from context
    const chatHistory = (matchEvent as MatchEvent & { chatHistory?: string }).chatHistory || '';
    const userCount = (matchEvent as MatchEvent & { userCount?: number }).userCount || 0;
    const activeUsers = (matchEvent as MatchEvent & { activeUsers?: string[] }).activeUsers || [];
    const matchEvents = (matchEvent as MatchEvent & { matchEvents?: Array<{ type?: { text?: string }; athletesInvolved?: Array<{ displayName?: string }>; clock?: { displayValue?: string }; action?: string; playerName?: string; time?: string }> }).matchEvents || [];
    const fplContext = (matchEvent as MatchEvent & { fplContext?: { users?: number; relevantPicks?: Array<{ player?: { web_name?: string; name?: string }; name?: string }>; captainChoices?: string[]; viceCaptainChoices?: string[]; fantasyImpact?: string; managers?: Array<{ username: string; captain?: string; viceCaptain?: string; relevantPicks: Array<{ playerName: string; team: string; position: number; isCaptain: boolean; isViceCaptain: boolean }> }>; managerSummary?: string } }).fplContext || {};

    console.log('[Peter Drury] Chat commentary context:', {
      hasChatHistory: !!chatHistory,
      userCount,
      activeUsers: activeUsers.length,
      hasMatchEvents: !!matchEvents.length,
      hasFplContext: !!Object.keys(fplContext).length
    });

    // Build rich context from multiple sources
    const richContext = await this.buildRichCommentaryContext(matchEvent, chatHistory, matchEvents, fplContext);

    console.log('[Peter Drury] Built rich context:', richContext);

    const prompt = `
You are Peter Drury, the legendary football commentator known for your poetic, dramatic, and emotionally charged commentary style. You are now providing commentary on a live chat discussion about a football match, incorporating real-time match events and fantasy football context.

IMPORTANT: Use ONLY the real match data provided. Do NOT make up goals, events, or match situations that are not explicitly mentioned in the context.

Generate a single, authentic Peter Drury-style commentary line that captures the energy and passion of the live chat discussion. Your commentary should:

1. **Reference Specific Users**: Mention 1-2 specific usernames from the chat (use @username format)
2. **Mention FPL Managers**: If FPL data is available, specifically mention managers and their relevant picks (e.g., "@fantasyking has Haaland as captain", "@goalscorer is banking on Saka")
3. **Use Real Match Context**: Reference the actual current score and match status provided
4. **Connect Real Match Events**: Only reference goals, cards, or key moments that are explicitly mentioned in the context
5. **Fantasy Football Context**: If available, reference FPL picks, captain choices, or fantasy impact
6. **Capture Chat Energy**: Reflect the passion and excitement of the fan discussion
7. **Dramatic and Poetic**: Use vivid, emotional language that captures the moment
8. **Authentic to Drury's Style**: Include his signature phrases, mythology references, and dramatic crescendos
9. **Contextually Relevant**: Reference the specific teams and match situation
10. **Concise**: Keep it to one powerful sentence (max 120 characters)

**Match Context:**
- Teams: ${matchEvent.homeTeam} vs ${matchEvent.awayTeam}
- Competition: ${matchEvent.competition}
- Chat Participants: ${userCount} fans actively discussing
- Active Users: ${activeUsers.join(', ')}

**Rich Context:**
${richContext}

**Recent Chat Activity:**
${chatHistory}

**Peter Drury Quote Examples for Style Reference:**
${retrievedQuotes.map(quote => `"${quote.quote}"`).join('\n')}

Generate a single, authentic Peter Drury commentary line that captures the chat discussion with REAL match and fantasy context:
`;

    try {
      console.log('[Peter Drury] Making OpenAI API call with prompt length:', prompt.length);
      
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
              content: 'You are Peter Drury, the legendary football commentator. Respond only with authentic Drury-style commentary that references chat participants, match events, and fantasy football context.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 150,
          stream: false,
        }),
      });

      console.log('[Peter Drury] OpenAI API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Peter Drury] OpenAI API error response:', errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[Peter Drury] OpenAI API response data:', data);
      
      const commentary = data.choices[0].message.content.trim();
      
      console.log('[Peter Drury] Generated commentary:', commentary);
      
      return commentary;
    } catch (error) {
      console.error('[Peter Drury] Error generating chat commentary:', error);
      console.error('[Peter Drury] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return `The passion of the fans echoes through the digital realm as ${matchEvent.homeTeam} and ${matchEvent.awayTeam} battle for glory!`;
    }
  }

  private async buildRichCommentaryContext(
    matchEvent: MatchEvent, 
    chatHistory: string, 
    matchEvents: Array<{
      type?: { text?: string };
      athletesInvolved?: Array<{ displayName?: string }>;
      clock?: { displayValue?: string };
      action?: string;
      playerName?: string;
      time?: string;
    }>, 
    fplContext: {
      managers?: Array<{
        username: string;
        captain?: string;
        viceCaptain?: string;
        relevantPicks?: Array<{ playerName: string }>;
      }>;
      captainChoices?: string[];
      viceCaptainChoices?: string[];
      relevantPicks?: Array<{
        player?: {
          web_name?: string;
          name?: string;
        };
        name?: string;
      }>;
      fantasyImpact?: string;
    }
  ): Promise<string> {
    const contextParts: string[] = [];

    console.log('[Peter Drury] Building rich context with inputs:', {
      matchEvent: {
        homeTeam: matchEvent.homeTeam,
        awayTeam: matchEvent.awayTeam,
        competition: matchEvent.competition,
        eventType: matchEvent.eventType
      },
      chatHistoryLength: chatHistory.length,
      matchEventsCount: matchEvents.length,
      fplContextKeys: Object.keys(fplContext)
    });

    // 1. Real Match Context (from the actual match data)
    const currentScore = (matchEvent as MatchEvent & { currentScore?: string }).currentScore || matchEvent.score || '0-0';
    const matchStatus = (matchEvent as MatchEvent & { matchStatus?: string }).matchStatus || 'Live';
    
    contextParts.push(`**Current Match Status:** ${matchEvent.homeTeam} ${currentScore} ${matchEvent.awayTeam} - ${matchStatus}`);

    // 2. Match Events Context (only if we have real events)
    if (matchEvents && matchEvents.length > 0) {
      const recentEvents = matchEvents.slice(-3); // Last 3 events
      const eventDescriptions = recentEvents.map(event => {
        const eventType = event.type?.text || event.action || 'event';
        const player = event.athletesInvolved?.[0]?.displayName || event.playerName || 'player';
        const time = event.clock?.displayValue || event.time || '';
        
        if (eventType.toLowerCase().includes('goal')) {
          return `⚽ ${player} scored at ${time}`;
        } else if (eventType.toLowerCase().includes('red card')) {
          return `🟥 ${player} sent off at ${time}`;
        } else if (eventType.toLowerCase().includes('yellow card')) {
          return `🟨 ${player} booked at ${time}`;
        } else {
          return `${eventType} by ${player} at ${time}`;
        }
      });
      
      if (eventDescriptions.length > 0) {
        contextParts.push(`**Recent Match Events:** ${eventDescriptions.join(', ')}`);
      }
    } else {
      // If no real events, just note the current situation
      contextParts.push(`**Match Situation:** ${matchEvent.homeTeam} vs ${matchEvent.awayTeam} - ${currentScore}`);
    }

    // 3. FPL Context
    if (fplContext && Object.keys(fplContext).length > 0) {
      const fplParts: string[] = [];
      
      // Enhanced manager mentions
      if (fplContext.managers && Array.isArray(fplContext.managers) && fplContext.managers.length > 0) {
        const managerMentions = fplContext.managers.map((manager: { username: string; captain?: string; viceCaptain?: string; relevantPicks?: Array<{ playerName: string }> }) => {
          const relevantPlayers = manager.relevantPicks?.map((pick: { playerName: string }) => pick.playerName).join(', ') || 'none';
          const captainInfo = manager.captain ? ` (C: ${manager.captain})` : '';
          const viceCaptainInfo = manager.viceCaptain ? ` (VC: ${manager.viceCaptain})` : '';
          return `@${manager.username}: ${relevantPlayers}${captainInfo}${viceCaptainInfo}`;
        });
        
        if (managerMentions.length > 0) {
          fplParts.push(`**FPL Managers:** ${managerMentions.join(' | ')}`);
        }
      }
      
      // Legacy support for old format
      if (fplContext.captainChoices && fplContext.captainChoices.length > 0) {
        fplParts.push(`**Captain Choices:** ${fplContext.captainChoices.join(', ')}`);
      }
      if (fplContext.viceCaptainChoices && fplContext.viceCaptainChoices.length > 0) {
        fplParts.push(`**Vice Captain Choices:** ${fplContext.viceCaptainChoices.join(', ')}`);
      }
      if (fplContext.relevantPicks && fplContext.relevantPicks.length > 0) {
        const pickNames = fplContext.relevantPicks.map((pick: { player?: { web_name?: string; name?: string }; name?: string }) => pick.player?.web_name || pick.name).join(', ');
        fplParts.push(`**Relevant FPL Picks:** ${pickNames}`);
      }
      if (fplContext.fantasyImpact) {
        fplParts.push(`**Fantasy Impact:** ${fplContext.fantasyImpact}`);
      }
      
      if (fplParts.length > 0) {
        contextParts.push(`**Fantasy Football Context:** ${fplParts.join(' | ')}`);
      }
    }

    // 4. Chat Sentiment Analysis
    if (chatHistory) {
      const chatLines = chatHistory.split('\n').filter(line => line.trim());
      if (chatLines.length > 0) {
        const positiveWords = ['goal', 'amazing', 'brilliant', 'incredible', 'fantastic', 'wow', 'yes', '🔥', '⚽'];
        const negativeWords = ['miss', 'terrible', 'awful', 'disaster', 'no', '😡', '🟥'];
        
        let positiveCount = 0;
        let negativeCount = 0;
        
        chatLines.forEach(line => {
          const lowerLine = line.toLowerCase();
          positiveWords.forEach(word => {
            if (lowerLine.includes(word)) positiveCount++;
          });
          negativeWords.forEach(word => {
            if (lowerLine.includes(word)) negativeCount++;
          });
        });
        
        let sentiment = 'neutral';
        if (positiveCount > negativeCount) sentiment = 'excited';
        else if (negativeCount > positiveCount) sentiment = 'frustrated';
        
        contextParts.push(`**Chat Sentiment:** ${sentiment} (${positiveCount} positive, ${negativeCount} negative reactions)`);
      }
    }

    const finalContext = contextParts.join('\n\n');
    console.log('[Peter Drury] Final built context:', finalContext);
    
    return finalContext;
  }
}
