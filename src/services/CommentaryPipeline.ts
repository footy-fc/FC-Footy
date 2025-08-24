import { MatchEvent } from '~/types/commentatorTypes';
import { commentatorFactory } from '~/services/CommentatorFactory';

export interface CommentaryContext {
  // Core match data (always required)
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  eventType: MatchEvent['eventType'];
  
  // Optional context inputs
  matchEvents?: Array<{
    type?: { text?: string };
    athletesInvolved?: Array<{ displayName?: string }>;
    clock?: { displayValue?: string };
    action?: string;
    playerName?: string;
    time?: string;
  }>;
  currentScore?: string;
  matchStatus?: string;
  chatHistory?: string;
  userCount?: number;
  activeUsers?: string[];
  fplContext?: {
    managers?: Array<{
      username: string;
      picks: Array<{
        player?: {
          web_name?: string;
          name?: string;
          team?: {
            short_name?: string;
          };
        };
        position?: number;
        is_captain?: boolean;
        is_vice_captain?: boolean;
      }>;
      captain?: string;
      viceCaptain?: string;
    }>;
    relevantPicks?: Array<{
      player?: {
        web_name?: string;
        name?: string;
        team?: {
          short_name?: string;
        };
      };
      position?: number;
      is_captain?: boolean;
      is_vice_captain?: boolean;
      username: string;
    }>;
    managerSummary?: {
      totalManagers: number;
      totalRelevantPicks: number;
      captains: string[];
    };
    // Legacy support for existing code
    captainChoices?: string[];
    viceCaptainChoices?: string[];
    fantasyImpact?: string;
  };
  
  // Additional optional fields
  player?: string;
  minute?: number;
  score?: string;
  context?: string;
}

export interface CommentaryRequest {
  commentatorId: string;
  context: CommentaryContext;
}

export interface CommentaryResponse {
  success: boolean;
  commentary: string;
  commentator: {
    id: string;
    name: string;
    displayName: string;
    style: string;
  };
  context: CommentaryContext;
  timestamp: string;
}

export class CommentaryPipeline {
  /**
   * Generate commentary with flexible context inputs
   * Supports different combinations based on where it's called from
   */
  static async generateCommentary(request: CommentaryRequest): Promise<CommentaryResponse> {
    const { commentatorId, context } = request;
    
    // Validate commentator exists
    const commentator = commentatorFactory.getCommentator(commentatorId);
    if (!commentator) {
      throw new Error(`Commentator not found: ${commentatorId}`);
    }
    
    // Build rich context based on available inputs
    //const richContext = this.buildRichContext(context);
    
    // Create match event with all available context
    const matchEvent: MatchEvent = {
      eventId: context.eventId,
      homeTeam: context.homeTeam,
      awayTeam: context.awayTeam,
      competition: context.competition,
      eventType: context.eventType,
      player: context.player,
      minute: context.minute,
      score: context.score,
      context: context.context,
      // Chat-specific context
      chatHistory: context.chatHistory,
      userCount: context.userCount,
      activeUsers: context.activeUsers,
      matchEvents: context.matchEvents,
      fplContext: context.fplContext,
      // Additional context for real-time data
      currentScore: context.currentScore,
      matchStatus: context.matchStatus
    };
    
    console.log(`🎤 Generating ${commentatorId} commentary with context:`, {
      hasMatchEvents: !!context.matchEvents?.length,
      hasChatHistory: !!context.chatHistory,
      hasFplContext: !!context.fplContext,
      hasRealTimeData: !!(context.currentScore || context.matchStatus)
    });
    
    // Generate commentary using the factory
    const commentary = await commentatorFactory.generateCommentary(commentatorId, matchEvent);
    
    return {
      success: true,
      commentary,
      commentator: {
        id: commentator.id,
        name: commentator.name,
        displayName: commentator.displayName,
        style: commentator.style
      },
      context,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Build rich context based on available inputs
   * Handles different combinations gracefully
   */
  private static buildRichContext(context: CommentaryContext): string {
    const contextParts: string[] = [];
    
    // 1. Real Match Context (always available)
    const currentScore = context.currentScore || context.score || '0-0';
    const matchStatus = context.matchStatus || 'Live';
    
    contextParts.push(`**Current Match Status:** ${context.homeTeam} ${currentScore} ${context.awayTeam} - ${matchStatus}`);
    
    // 2. Match Events Context (optional)
    if (context.matchEvents && context.matchEvents.length > 0) {
      const recentEvents = context.matchEvents.slice(-3);
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
    }
    
    // 3. FPL Context (optional)
    if (context.fplContext && Object.keys(context.fplContext).length > 0) {
      const fplParts: string[] = [];
      
      if (context.fplContext.captainChoices?.length) {
        fplParts.push(`Captains: ${context.fplContext.captainChoices.join(', ')}`);
      }
      if (context.fplContext.viceCaptainChoices?.length) {
        fplParts.push(`Vice Captains: ${context.fplContext.viceCaptainChoices.join(', ')}`);
      }
      if (context.fplContext.relevantPicks?.length) {
        const pickNames = context.fplContext.relevantPicks.map((pick) => pick.player?.web_name || pick.player?.name || 'Unknown Player').join(', ');
        fplParts.push(`Relevant Picks: ${pickNames}`);
      }
      if (context.fplContext.fantasyImpact) {
        fplParts.push(`Fantasy Impact: ${context.fplContext.fantasyImpact}`);
      }
      
      if (fplParts.length > 0) {
        contextParts.push(`**Fantasy Football Context:** ${fplParts.join(' | ')}`);
      }
    }
    
    // 4. Chat Sentiment Analysis (optional)
    if (context.chatHistory) {
      const chatLines = context.chatHistory.split('\n').filter(line => line.trim());
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
    
    return contextParts.join('\n\n');
  }
  
  /**
   * Convenience methods for different use cases
   */
  
  // Chat commentary with full context
  static async generateChatCommentary(
    commentatorId: string,
    context: CommentaryContext
  ): Promise<CommentaryResponse> {
    return this.generateCommentary({
      commentatorId,
      context: {
        ...context,
        eventType: 'chat_commentary' as const
      }
    });
  }
  
  // Match sharing with only match events
  static async generateMatchSharingCommentary(
    commentatorId: string,
    context: CommentaryContext
  ): Promise<CommentaryResponse> {
    return this.generateCommentary({
      commentatorId,
      context: {
        ...context,
        eventType: context.eventType || 'final_whistle'
      }
    });
  }
  
  // Goal notification with minimal context
  static async generateGoalCommentary(
    commentatorId: string,
    context: CommentaryContext
  ): Promise<CommentaryResponse> {
    return this.generateCommentary({
      commentatorId,
      context: {
        ...context,
        eventType: 'goal' as const
      }
    });
  }
}

