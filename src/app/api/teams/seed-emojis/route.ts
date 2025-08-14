import { NextRequest, NextResponse } from 'next/server';
import { teamService } from '../../../../lib/teamService';

interface EmojiDef {
  code: string;
  url: string;
}

/**
 * POST /api/teams/seed-emojis
 * Seeds team-specific emoji packs into team metadata for known teams.
 * - Keeps base "Footy" pack untouched (that pack is static in code)
 * - Migrates the previously hardcoded team packs for Arsenal and Liverpool into DB metadata
 *
 * Security: Protected by x-api-key header (uses NEXT_PUBLIC_NOTIFICATION_API_KEY)
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (apiKey && apiKey !== process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Define canonical emoji sets to seed
    const seeds: Record<string, EmojiDef[]> = {
      // abbr: emojis
      ars: [
        { code: 'ars::arteta', url: '/assets/ars-arteta.png' },
        { code: 'ars::odegaard', url: '/assets/ars-odegaard.png' },
        { code: 'ars::gunnersaurus', url: '/assets/ars-gunnersaurus.png' },
        { code: 'ars::saka', url: '/assets/ars-saka.png' },
      ],
      liv: [
        { code: 'liv::salah', url: '/assets/liv-salah.png' },
        { code: 'liv::vvd', url: '/assets/liv-vvd.png' },
        { code: 'liv::allison', url: '/assets/liv-allison.png' },
        { code: 'liv::anfield', url: '/assets/liv-anfield.png' },
        { code: 'liv::bigears', url: '/assets/liv-bigears.png' },
      ],
    };

    const results: Array<{ abbr: string; teamId?: string; updated: boolean; error?: string }> = [];

    for (const [abbr, emojis] of Object.entries(seeds)) {
      try {
        const team = await teamService.getTeamByAbbr(abbr);
        if (!team) {
          results.push({ abbr, updated: false, error: 'team-not-found' });
          continue;
        }

        // Merge with any existing emojis if present (by code)
        const existingRaw = team.metadata?.emojis as string | undefined;
        let merged: EmojiDef[] = [];
        if (existingRaw) {
          try {
            const parsed = JSON.parse(existingRaw);
            if (Array.isArray(parsed)) {
              const map = new Map<string, EmojiDef>();
              for (const e of parsed) {
                if (e && typeof e.code === 'string' && typeof e.url === 'string') {
                  map.set(e.code, { code: e.code, url: e.url });
                }
              }
              for (const e of emojis) map.set(e.code, e);
              merged = Array.from(map.values());
            } else {
              merged = emojis;
            }
          } catch {
            merged = emojis;
          }
        } else {
          merged = emojis;
        }

        await teamService.updateTeam(team.id, {
          metadata: {
            ...(team.metadata || {}),
            emojis: JSON.stringify(merged),
          },
        });

        results.push({ abbr, teamId: team.id, updated: true });
      } catch (e) {
        results.push({ abbr, updated: false, error: e instanceof Error ? e.message : 'unknown-error' });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'seed-failed',
        details: error instanceof Error ? error.message : 'unknown-error',
      },
      { status: 500 }
    );
  }
}


