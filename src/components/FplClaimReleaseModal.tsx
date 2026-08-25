'use client';

import { useState } from 'react';
import { useAccount, useConnect, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import { config } from '~/components/providers/WagmiProvider';
import type { FantasyEntry } from '~/components/utils/fetchFantasyData';
import {
  BASE_CHAIN_ID,
  BASE_EAS_ADDRESS,
  FPL_CLAIM_EAS_ABI,
  FPL_CLAIM_SCHEMA_UID,
  type FplClaimSummary,
} from '~/lib/fplClaimConstants';

type Props = {
  entry: FantasyEntry;
  claim: FplClaimSummary;
  getAuthorizationHeaders: () => Promise<Record<string, string>>;
  onClose: () => void;
  onReleased: (entryId: number) => void;
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function FplClaimReleaseModal({ entry, claim, getAuthorizationHeaders, onClose, onReleased }: Props) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address, chainId } = useAccount();
  const { connectAsync } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: BASE_CHAIN_ID });

  async function finalizeRelease() {
    const headers = await getAuthorizationHeaders();
    const response = await fetch('/api/fpl-claim/release', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ attestationUid: claim.attestationUid }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (response.ok) {
      onReleased(entry.entry_id);
      onClose();
      return true;
    }
    if (response.status !== 409) throw new Error(payload.error || 'The claim could not be released in Footy');
    return false;
  }

  async function releaseClaim() {
    setWorking(true);
    setError(null);
    try {
      if (await finalizeRelease()) return;
      let walletAddress = address;
      if (!walletAddress) {
        const connected = await connectAsync({ connector: config.connectors[0] });
        walletAddress = connected.accounts[0];
      }
      if (!walletAddress) throw new Error('Connect the wallet that created this attestation');
      if (walletAddress.toLowerCase() !== claim.wallet.toLowerCase()) {
        throw new Error(`This claim must be released by ${shortAddress(claim.wallet)}`);
      }
      if (chainId !== BASE_CHAIN_ID) await switchChainAsync({ chainId: BASE_CHAIN_ID });
      if (!publicClient) throw new Error('Base wallet client is unavailable');

      const txHash = await writeContractAsync({
        address: BASE_EAS_ADDRESS,
        abi: FPL_CLAIM_EAS_ABI,
        functionName: 'revoke',
        args: [{
          schema: FPL_CLAIM_SCHEMA_UID,
          data: { uid: claim.attestationUid as `0x${string}`, value: 0n },
        }],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (!(await finalizeRelease())) throw new Error('The Base revocation confirmed but Footy has not observed it yet. Try release again in a moment.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to release this claim');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Release FPL team claim" onClick={() => { if (!working) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl border border-limeGreenOpacity bg-darkPurple p-5 text-lightPurple shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-limeGreen">Release claim</div>
            <h3 className="mt-1 text-xl font-semibold text-notWhite">{entry.entryName}</h3>
            <p className="mt-1 text-xs">FPL entry #{entry.entry_id}</p>
          </div>
          <button type="button" onClick={onClose} disabled={working} className="text-sm hover:text-notWhite disabled:opacity-50">Close</button>
        </div>
        <p className="mt-4 text-sm leading-6">
          This revokes your public Base attestation and opens the FPL team for another manager to verify. The historical attestation stays visible onchain as revoked.
        </p>
        <a className="mt-2 inline-block text-xs text-limeGreen underline" href={`https://base.easscan.org/attestation/view/${claim.attestationUid}`} target="_blank" rel="noreferrer">View current attestation</a>
        <button type="button" onClick={() => void releaseClaim()} disabled={working} className="mt-5 w-full rounded-xl bg-fontRed px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {working ? 'Revoking on Base…' : 'Revoke and release team'}
        </button>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
}
