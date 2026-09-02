import fantasyManagersLookup from "~/data/fantasy-managers-lookup.json";
import { FPL_LEAGUE_ID } from "~/lib/config";
import { getClaimByFid, getClaimSeason } from "~/lib/fplClaimServer";
import type { FinalWhistleManagerContext } from "~/lib/newsletterModel";

type LegacyManagerLookup = {
  entry_id: number;
  fid: number;
  team_name?: string;
};

const legacyManagers = fantasyManagersLookup as LegacyManagerLookup[];

export async function resolveFinalWhistleManagerContext(
  fid?: number
): Promise<FinalWhistleManagerContext | null> {
  if (!fid) return null;

  const season = getClaimSeason();
  const claim = await getClaimByFid(season, fid);
  const legacyManager = legacyManagers.find((manager) => manager.fid === fid);
  const entryId = claim?.entryId ?? legacyManager?.entry_id;

  if (!entryId) return null;

  return {
    entryId,
    season: claim?.season ?? season,
    leagueIds: [FPL_LEAGUE_ID],
    ...(legacyManager?.team_name ? { managerLabel: legacyManager.team_name } : {}),
  };
}
