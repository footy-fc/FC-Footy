import { NextRequest, NextResponse } from 'next/server';
import { CommentaryPipeline, CommentaryContext } from '~/services/CommentaryPipeline';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle both flat and nested context structures
    let commentatorId: string;
    let contextData: Partial<CommentaryContext> & { commentatorId?: string };
    
    if (body.context) {
      // Nested structure: { commentatorId, context: { ... } }
      commentatorId = body.commentatorId;
      contextData = body.context;
    } else {
      // Flat structure: { commentatorId, eventId, homeTeam, ... }
      commentatorId = body.commentatorId;
      contextData = body;
    }
    
    const {
      eventId,
      homeTeam,
      awayTeam,
      competition,
      eventType,
      player,
      minute,
      score,
      context,
      chatHistory,
      userCount,
      activeUsers,
      matchEvents,
      fplContext,
      currentScore,
      matchStatus
    } = contextData;

    // Validate required fields
    if (!commentatorId || !eventId || !homeTeam || !awayTeam || !competition || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: commentatorId, eventId, homeTeam, awayTeam, competition, eventType' },
        { status: 400 }
      );
    }

    // Build flexible context object
    const commentaryContext: CommentaryContext = {
      eventId,
      homeTeam,
      awayTeam,
      competition,
      eventType: eventType as CommentaryContext['eventType'],
      player,
      minute,
      score,
      context,
      // Optional context inputs
      matchEvents,
      currentScore,
      matchStatus,
      chatHistory,
      userCount,
      activeUsers,
      fplContext
    };

    console.log(`🎤 Generating ${commentatorId} commentary with flexible context:`, {
      hasMatchEvents: !!matchEvents?.length,
      hasChatHistory: !!chatHistory,
      hasFplContext: !!fplContext,
      hasRealTimeData: !!(currentScore || matchStatus)
    });

    // Use the flexible pipeline
    const response = await CommentaryPipeline.generateCommentary({
      commentatorId,
      context: commentaryContext
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating commentary:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate commentary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
