import type { FplClaimRecord } from '~/lib/fplClaimServer';

/**
 * Return the FPL entry that is currently backed by an active attestation.
 * A missing or revoked claim must never fall back to historical mappings.
 */
export function resolveClaimedEntryId(claim: FplClaimRecord | null): number | null {
  if (!claim || claim.status !== 'active') return null;
  return Number.isSafeInteger(claim.entryId) && claim.entryId > 0 ? claim.entryId : null;
}
