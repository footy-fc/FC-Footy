import { randomBytes, createCipheriv, createDecipheriv, createHash, randomUUID } from 'crypto';
import {
  ID_REGISTRY_ADDRESS,
  KEY_GATEWAY_ADDRESS,
  NobleEd25519Signer,
  ViemLocalEip712Signer,
  idRegistryABI,
  keyGatewayABI,
  makeCastAdd,
  CastAddBody,
  FarcasterNetwork,
} from '@farcaster/core';
import { bytesToHex, createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { optimism } from 'viem/chains';
import type { CastAddMessage } from '@farcaster/hub-web';
import type { PendingFootySignerRequest, UserFarcasterAccount } from '~/lib/farcaster/store';

function getRpcUrl() {
  return process.env.FOOTY_FARCASTER_OPTIMISM_RPC_URL || process.env.OPTIMISM_RPC_URL || process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || undefined;
}

function getAppPrivateKey() {
  const value = process.env.FOOTY_FARCASTER_APP_PRIVATE_KEY;
  if (!value) {
    throw new Error('FOOTY_FARCASTER_APP_PRIVATE_KEY is required');
  }
  return value as `0x${string}`;
}

function getEncryptionKey() {
  const value = process.env.FOOTY_FARCASTER_SIGNER_ENCRYPTION_KEY;
  if (!value) {
    throw new Error('FOOTY_FARCASTER_SIGNER_ENCRYPTION_KEY is required');
  }

  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  const raw = normalized.length === 64 ? Buffer.from(normalized, 'hex') : Buffer.from(value, 'base64');
  if (raw.length !== 32) {
    throw new Error('FOOTY_FARCASTER_SIGNER_ENCRYPTION_KEY must decode to 32 bytes');
  }
  return raw;
}

export function getFootyPublicClient() {
  return createPublicClient({
    chain: optimism,
    transport: http(getRpcUrl()),
  });
}

export function getFootyAppAccount() {
  return privateKeyToAccount(getAppPrivateKey());
}

export function getFootyAppWalletClient() {
  return createWalletClient({
    account: getFootyAppAccount(),
    chain: optimism,
    transport: http(getRpcUrl()),
  });
}

export async function getFootyAppFid(publicClient = getFootyPublicClient()) {
  const envFid = process.env.FOOTY_FARCASTER_APP_FID;
  if (envFid) {
    const parsed = Number(envFid);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const appAccount = getFootyAppAccount();
  const fid = await publicClient.readContract({
    address: ID_REGISTRY_ADDRESS,
    abi: idRegistryABI,
    functionName: 'idOf',
    args: [appAccount.address],
  });

  const numeric = Number(fid);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error('Footy app account does not have a Farcaster app FID');
  }

  return numeric;
}

export async function getFidCustodyAddress(fid: number, publicClient = getFootyPublicClient()) {
  const custody = await publicClient.readContract({
    address: ID_REGISTRY_ADDRESS,
    abi: idRegistryABI,
    functionName: 'custodyOf',
    args: [BigInt(fid)],
  });

  return custody.toLowerCase();
}

function encryptPrivateKey(privateKey: Uint8Array) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(privateKey)), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptPrivateKey(payload: string) {
  const key = getEncryptionKey();
  const buffer = Buffer.from(payload, 'base64');
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const ciphertext = buffer.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return new Uint8Array(Buffer.concat([decipher.update(ciphertext), decipher.final()]));
}

export async function createPendingFootySignerRequest(userId: string, fid: number, custodyAddress: string): Promise<PendingFootySignerRequest> {
  const privateKeyBytes = randomBytes(32);
  const signer = new NobleEd25519Signer(privateKeyBytes);
  const signerKeyResult = await signer.getSignerKey();
  if (signerKeyResult.isErr()) {
    throw signerKeyResult.error;
  }

  const signerPublicKey = bytesToHex(signerKeyResult.value);
  const publicClient = getFootyPublicClient();
  const appFid = await getFootyAppFid(publicClient);
  const appSigner = new ViemLocalEip712Signer(getFootyAppAccount());
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const metadataResult = await appSigner.getSignedKeyRequestMetadata({
    requestFid: BigInt(appFid),
    key: signerKeyResult.value,
    deadline,
  });

  if (metadataResult.isErr()) {
    throw metadataResult.error;
  }

  const addNonce = await publicClient.readContract({
    address: KEY_GATEWAY_ADDRESS,
    abi: keyGatewayABI,
    functionName: 'nonces',
    args: [custodyAddress as `0x${string}`],
  });

  return {
    requestId: randomUUID(),
    userId,
    fid,
    custodyAddress,
    signerPublicKey,
    encryptedPrivateKey: encryptPrivateKey(privateKeyBytes),
    metadataHex: bytesToHex(metadataResult.value),
    deadline: deadline.toString(),
    addNonce: addNonce.toString(),
    appFid,
    createdAt: new Date().toISOString(),
  };
}

export async function submitFootySignerAddFor(request: PendingFootySignerRequest, addSignatureHex: `0x${string}`) {
  const walletClient = getFootyAppWalletClient();
  const hash = await walletClient.writeContract({
    address: KEY_GATEWAY_ADDRESS,
    abi: keyGatewayABI,
    functionName: 'addFor',
    args: [
      request.custodyAddress as `0x${string}`,
      1,
      request.signerPublicKey as `0x${string}`,
      1,
      request.metadataHex as `0x${string}`,
      BigInt(request.deadline),
      addSignatureHex,
    ],
    chain: optimism,
    account: getFootyAppAccount(),
  });

  return hash;
}

export async function signFootyCast(account: UserFarcasterAccount, encryptedPrivateKey: string, input: { text: string; embeds?: string[] }) {
  if (!account.signerPublicKey) {
    throw new Error('Missing Footy signer public key');
  }

  const signer = new NobleEd25519Signer(decryptPrivateKey(encryptedPrivateKey));
  const body = CastAddBody.create({
    text: input.text,
    embeds: (input.embeds || []).map((url) => ({ url })),
    mentions: [],
    mentionsPositions: [],
  });

  const messageResult = await makeCastAdd(
    body,
    {
      fid: account.fid,
      network: FarcasterNetwork.MAINNET,
    },
    signer
  );

  if (messageResult.isErr()) {
    throw messageResult.error;
  }

  return messageResult.value as CastAddMessage;
}

export function hashAddress(address: string) {
  return createHash('sha256').update(address.toLowerCase()).digest('hex');
}
