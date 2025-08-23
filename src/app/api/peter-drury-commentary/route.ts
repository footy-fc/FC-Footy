import { NextRequest, NextResponse } from 'next/server';
import { generatePeterDruryCommentary, createMatchEvent, type MatchEvent } from '~/components/ai/PeterDruryRAG';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      eventId,
      homeTeam,
      awayTeam,
      competition,
      eventType,
      player,
      minute,
      score,
      context
    } = body;

    // Validate required fields
    if (!eventId || !homeTeam || !awayTeam || !competition || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, homeTeam, awayTeam, competition, eventType' },
        { status: 400 }
      );
    }

    // Validate eventType
    const validEventTypes = ['goal', 'assist', 'red_card', 'yellow_card', 'substitution', 'final_whistle', 'penalty', 'free_kick'];
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid eventType. Must be one of: ${validEventTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create match event
    const matchEvent = createMatchEvent(
      eventId,
      homeTeam,
      awayTeam,
      competition,
      eventType as MatchEvent['eventType'],
      {
        player,
        minute,
        score,
        context
      }
    );

    console.log('🎤 Generating Peter Drury commentary for match event:', matchEvent);

    // Generate commentary
    const commentary = await generatePeterDruryCommentary(matchEvent);

    return NextResponse.json({
      success: true,
      commentary,
      matchEvent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating Peter Drury commentary:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate commentary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const eventId = searchParams.get('eventId');
    const homeTeam = searchParams.get('homeTeam');
    const awayTeam = searchParams.get('awayTeam');
    const competition = searchParams.get('competition');
    const eventType = searchParams.get('eventType');
    const player = searchParams.get('player');
    const minute = searchParams.get('minute');
    const score = searchParams.get('score');
    const context = searchParams.get('context');

    // Validate required fields
    if (!eventId || !homeTeam || !awayTeam || !competition || !eventType) {
      return NextResponse.json(
        { error: 'Missing required query parameters: eventId, homeTeam, awayTeam, competition, eventType' },
        { status: 400 }
      );
    }

    // Validate eventType
    const validEventTypes = ['goal', 'assist', 'red_card', 'yellow_card', 'substitution', 'final_whistle', 'penalty', 'free_kick'];
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid eventType. Must be one of: ${validEventTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create match event
    const matchEvent = createMatchEvent(
      eventId,
      homeTeam,
      awayTeam,
      competition,
      eventType as MatchEvent['eventType'],
      {
        player: player || undefined,
        minute: minute ? parseInt(minute) : undefined,
        score: score || undefined,
        context: context || undefined
      }
    );

    console.log('🎤 Generating Peter Drury commentary for match event:', matchEvent);

    // Generate commentary
    const commentary = await generatePeterDruryCommentary(matchEvent);

    return NextResponse.json({
      success: true,
      commentary,
      matchEvent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating Peter Drury commentary:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate commentary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
