import { randomBytes, randomUUID } from 'crypto';
import {
  BUNDLER_ADDRESS,
  ID_REGISTRY_ADDRESS,
  KEY_GATEWAY_ADDRESS,
  NobleEd25519Signer,
  ViemLocalEip712Signer,
  bundlerABI,
  idRegistryABI,
  keyGatewayABI,
} from '@farcaster/core';
import { bytesToHex } from 'viem';
import { encryptPrivateKey, getFootyAppAccount, getFootyAppFid, getFootyAppWalletClient, getFootyPublicClient } from '~/lib/farcaster/footySignerServer';
import type { PendingFootyRegistrationRequest } from '~/lib/farcaster/store';

export const FARCASTER_RECOVERY_PROXY =
  (process.env.FOOTY_FARCASTER_RECOVERY_PROXY || '0x00000000FcB080a4D6c39a9354dA9EB9bC104cd7') as `0x${string}`;

export function getFootyBundlerAddress() {
  return (process.env.FOOTY_FARCASTER_BUNDLER_ADDRESS || BUNDLER_ADDRESS) as `0x${string}`;
}

export async function getFidByCustodyAddress(address: `0x${string}`) {
  const publicClient = getFootyPublicClient();
  const fid = await publicClient.readContract({
    address: ID_REGISTRY_ADDRESS,
    abi: idRegistryABI,
    functionName: 'idOf',
    args: [address],
  });

  const numeric = Number(fid);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export async function getBundlerRegistrationPrice(extraStorage: bigint) {
  const publicClient = getFootyPublicClient();
  return publicClient.readContract({
    address: getFootyBundlerAddress(),
    abi: bundlerABI,
    functionName: 'price',
    args: [extraStorage],
  });
}

export async function createPendingFootyRegistrationRequest(
  userId: string,
  custodyAddress: `0x${string}`,
  recoveryAddress: `0x${string}` = FARCASTER_RECOVERY_PROXY
): Promise<PendingFootyRegistrationRequest> {
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
  const registerDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const addDeadline = registerDeadline;
  const metadataResult = await appSigner.getSignedKeyRequestMetadata({
    requestFid: BigInt(appFid),
    key: signerKeyResult.value,
    deadline: addDeadline,
  });

  if (metadataResult.isErr()) {
    throw metadataResult.error;
  }

  const [registerNonce, addNonce] = await Promise.all([
    publicClient.readContract({
      address: ID_REGISTRY_ADDRESS,
      abi: idRegistryABI,
      functionName: 'nonces',
      args: [custodyAddress],
    }),
    publicClient.readContract({
      address: KEY_GATEWAY_ADDRESS,
      abi: keyGatewayABI,
      functionName: 'nonces',
      args: [custodyAddress],
    }),
  ]);

  return {
    requestId: randomUUID(),
    userId,
    custodyAddress,
    recoveryAddress,
    signerPublicKey,
    encryptedPrivateKey: encryptPrivateKey(privateKeyBytes),
    metadataHex: bytesToHex(metadataResult.value),
    registerNonce: registerNonce.toString(),
    registerDeadline: registerDeadline.toString(),
    addNonce: addNonce.toString(),
    addDeadline: addDeadline.toString(),
    appFid,
    createdAt: new Date().toISOString(),
  };
}

export async function submitFootyBundlerRegistration(
  request: PendingFootyRegistrationRequest,
  registerSignatureHex: `0x${string}`,
  addSignatureHex: `0x${string}`,
  extraStorage: bigint
) {
  const price = await getBundlerRegistrationPrice(extraStorage);
  const walletClient = getFootyAppWalletClient();

  const txHash = await walletClient.writeContract({
    address: getFootyBundlerAddress(),
    abi: bundlerABI,
    functionName: 'register',
    args: [
      {
        to: request.custodyAddress as `0x${string}`,
        recovery: request.recoveryAddress as `0x${string}`,
        deadline: BigInt(request.registerDeadline),
        sig: registerSignatureHex,
      },
      [
        {
          keyType: 1,
          key: request.signerPublicKey as `0x${string}`,
          metadataType: 1,
          metadata: request.metadataHex as `0x${string}`,
          deadline: BigInt(request.addDeadline),
          sig: addSignatureHex,
        },
      ],
      extraStorage,
    ],
    value: price,
  });

  const publicClient = getFootyPublicClient();
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return txHash;
}
