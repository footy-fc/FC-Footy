export const BASE_CHAIN_ID = Number(process.env.NEXT_PUBLIC_EAS_CHAIN_ID || 8453);
export const BASE_EAS_ADDRESS = (process.env.NEXT_PUBLIC_EAS_ADDRESS || '0x4200000000000000000000000000000000000021') as `0x${string}`;
export const FPL_CLAIM_SCHEMA_UID =
  (process.env.NEXT_PUBLIC_EAS_SCHEMA_UID ||
    '0xe040ef5094a51f751f3d6258011b8ce8156b7e522e1283c139f584f443e6c825') as `0x${string}`;
export const FPL_CLAIM_SEASON = Number(
  process.env.NEXT_PUBLIC_FPL_SEASON || process.env.FPL_SEASON || new Date().getUTCFullYear()
);
export const FPL_CLAIM_METHOD_FACT_CHALLENGE = 1;
export const FPL_CLAIM_CHALLENGE_SECONDS = 10;

export type FplClaimSummary = {
  fid: number;
  entryId: number;
  season: number;
  wallet: string;
  attestationUid: string;
  evidenceHash: string;
  method: number;
  status: 'active' | 'revoked';
  createdAt: string;
};

export const FPL_CLAIM_EAS_ABI = [
  {
    type: 'function',
    name: 'attest',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'request',
        type: 'tuple',
        components: [
          { name: 'schema', type: 'bytes32' },
          {
            name: 'data',
            type: 'tuple',
            components: [
              { name: 'recipient', type: 'address' },
              { name: 'expirationTime', type: 'uint64' },
              { name: 'revocable', type: 'bool' },
              { name: 'refUID', type: 'bytes32' },
              { name: 'data', type: 'bytes' },
              { name: 'value', type: 'uint256' },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: 'uid', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'revoke',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'request',
        type: 'tuple',
        components: [
          { name: 'schema', type: 'bytes32' },
          {
            name: 'data',
            type: 'tuple',
            components: [
              { name: 'uid', type: 'bytes32' },
              { name: 'value', type: 'uint256' },
            ],
          },
        ],
      },
    ],
    outputs: [],
  },
] as const;

export const FPL_CLAIM_ATTESTED_EVENT_ABI = [
  {
    type: 'event',
    name: 'Attested',
    anonymous: false,
    inputs: [
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: true, name: 'attester', type: 'address' },
      { indexed: false, name: 'uid', type: 'bytes32' },
      { indexed: true, name: 'schemaUID', type: 'bytes32' },
    ],
  },
] as const;

export const FPL_CLAIM_READ_ABI = [
  {
    type: 'function',
    name: 'getAttestation',
    stateMutability: 'view',
    inputs: [{ name: 'uid', type: 'bytes32' }],
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'uid', type: 'bytes32' },
        { name: 'schema', type: 'bytes32' },
        { name: 'time', type: 'uint64' },
        { name: 'expirationTime', type: 'uint64' },
        { name: 'revocationTime', type: 'uint64' },
        { name: 'refUID', type: 'bytes32' },
        { name: 'recipient', type: 'address' },
        { name: 'attester', type: 'address' },
        { name: 'revocable', type: 'bool' },
        { name: 'data', type: 'bytes' },
      ],
    }],
  },
] as const;

export const ZERO_BYTES32 = `0x${'0'.repeat(64)}` as const;
