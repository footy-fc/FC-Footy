import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveClaimedEntryId } from './fplManagerIdentity.ts';

const claim = {
  fid: 4163,
  entryId: 123456,
  season: 2026,
  wallet: '0x0000000000000000000000000000000000000001',
  attestationUid: `0x${'a'.repeat(64)}`,
  evidenceHash: `0x${'b'.repeat(64)}`,
  method: 1,
  status: 'active' as const,
  createdAt: '2026-09-21T00:00:00.000Z',
};

test('resolves an active claim to its attested FPL entry', () => {
  assert.equal(resolveClaimedEntryId(claim), 123456);
});

test('does not resolve missing or revoked claims', () => {
  assert.equal(resolveClaimedEntryId(null), null);
  assert.equal(resolveClaimedEntryId({ ...claim, status: 'revoked' }), null);
});
