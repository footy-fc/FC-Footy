'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseEventLogs } from 'viem';
import { useAccount, useConnect, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import { config } from '~/components/providers/WagmiProvider';
import type { FantasyEntry } from '~/components/utils/fetchFantasyData';
import {
  BASE_CHAIN_ID,
  BASE_EAS_ADDRESS,
  FPL_CLAIM_ATTESTED_EVENT_ABI,
  FPL_CLAIM_EAS_ABI,
  FPL_CLAIM_SCHEMA_UID,
  ZERO_BYTES32,
  type FplClaimSummary,
} from '~/lib/fplClaimConstants';

type ClaimPanelProps = {
  entry: FantasyEntry;
  getAuthorizationHeaders: () => Promise<Record<string, string>>;
  onClose: () => void;
  onClaimed: (claim: FplClaimSummary) => void;
};

type Challenge = {
  challengeId: string;
  question: string;
  choices: string[];
  expiresAt: number;
  teamName: string;
};

export default function FplClaimPanel({ entry, getAuthorizationHeaders, onClose, onClaimed }: ClaimPanelProps) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [encodedData, setEncodedData] = useState<`0x${string}` | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const [phase, setPhase] = useState<'idle' | 'loading' | 'challenge' | 'verifying' | 'attesting' | 'success' | 'blocked'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [successUid, setSuccessUid] = useState<string | null>(null);
  const [isSubmittingAttestation, setIsSubmittingAttestation] = useState(false);
  const startedRef = useRef(false);
  const { address, chainId } = useAccount();
  const { connectAsync } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: BASE_CHAIN_ID });

  const remaining = useMemo(() => challenge ? Math.max(0, Math.ceil((challenge.expiresAt - clock) / 1000)) : 0, [challenge, clock]);

  useEffect(() => {
    if (!challenge) return;
    const timer = window.setInterval(() => setClock(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [challenge]);

  useEffect(() => {
    if (challenge && remaining === 0 && phase === 'challenge') {
      setPhase('idle');
      setError('The challenge expired. Start again to get a fresh FPL fact.');
    }
  }, [challenge, phase, remaining]);

  const startChallenge = useCallback(async () => {
    setError(null);
    setPhase('loading');
    try {
      const headers = await getAuthorizationHeaders();
      const response = await fetch('/api/fpl-claim/challenge', {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ entryId: entry.entry_id }),
      });
      const payload = (await response.json().catch(() => ({}))) as Challenge & { error?: string };
      if (!response.ok) {
        if (response.status === 409) setPhase('blocked');
        throw new Error(payload.error || 'Unable to start the claim challenge');
      }
      setChallenge(payload);
      setClock(Date.now());
      setSelectedAnswer(null);
      setClaimToken(null);
      setEncodedData(null);
      setPhase('challenge');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to start the claim challenge');
      setPhase((current) => current === 'blocked' ? 'blocked' : 'idle');
    }
  }, [entry.entry_id, getAuthorizationHeaders]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void startChallenge();
  }, [startChallenge]);

  async function verifyAnswer() {
    if (!challenge || !selectedAnswer) return;
    setError(null);
    setPhase('verifying');
    try {
      const headers = await getAuthorizationHeaders();
      const response = await fetch('/api/fpl-claim/verify', {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ challengeId: challenge.challengeId, answer: selectedAnswer }),
      });
      const payload = (await response.json().catch(() => ({}))) as { claimToken?: string; encodedData?: `0x${string}`; error?: string };
      if (!response.ok || !payload.claimToken || !payload.encodedData) {
        throw new Error(payload.error || 'The challenge could not be verified');
      }
      setClaimToken(payload.claimToken);
      setEncodedData(payload.encodedData);
      setPhase('attesting');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The challenge could not be verified');
      setPhase('idle');
    }
  }

  async function attest() {
    if (!claimToken || !encodedData) return;
    setError(null);
    setPhase('attesting');
    setIsSubmittingAttestation(true);
    try {
      let walletAddress = address;
      if (!walletAddress) {
        const connected = await connectAsync({ connector: config.connectors[0] });
        walletAddress = connected.accounts[0];
      }
      if (!walletAddress) throw new Error('Connect a wallet to create the attestation');
      if (chainId !== BASE_CHAIN_ID) await switchChainAsync({ chainId: BASE_CHAIN_ID });
      if (!publicClient) throw new Error('Base wallet client is unavailable');

      const txHash = await writeContractAsync({
        address: BASE_EAS_ADDRESS,
        abi: FPL_CLAIM_EAS_ABI,
        functionName: 'attest',
        args: [{
          schema: FPL_CLAIM_SCHEMA_UID,
          data: {
            recipient: walletAddress,
            expirationTime: 0n,
            revocable: true,
            refUID: ZERO_BYTES32,
            data: encodedData,
          },
        }],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      const events = parseEventLogs({ abi: FPL_CLAIM_ATTESTED_EVENT_ABI, logs: receipt.logs, eventName: 'Attested' });
      const uid = events[0]?.args.uid;
      if (!uid) throw new Error('The attestation transaction confirmed but no EAS UID was found');

      const headers = await getAuthorizationHeaders();
      const completeResponse = await fetch('/api/fpl-claim/complete', {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ claimToken, attestationUid: uid }),
      });
      const completePayload = (await completeResponse.json().catch(() => ({}))) as { error?: string; claim?: FplClaimSummary };
      if (!completeResponse.ok || !completePayload.claim) throw new Error(completePayload.error || 'The attestation could not be finalized');

      setSuccessUid(uid);
      setPhase('success');
      onClaimed(completePayload.claim);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The attestation failed');
      setPhase('attesting');
    } finally {
      setIsSubmittingAttestation(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Claim FPL team" onClick={() => { if (!isSubmittingAttestation) onClose(); }}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-limeGreenOpacity bg-darkPurple p-5 text-lightPurple shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-limeGreen">FPL team claim</div>
          <h3 className="mt-1 text-lg font-semibold text-notWhite">{entry.entryName}</h3>
          <p className="text-xs text-lightPurple/80">FPL entry #{entry.entry_id} · {entry.manager}</p>
        </div>
        <button type="button" onClick={onClose} disabled={isSubmittingAttestation} className="text-sm text-lightPurple hover:text-notWhite disabled:opacity-50">Close</button>
      </div>

      {phase === 'idle' && (
        <div className="mt-3">
          <p className="text-sm">Pass one short current-squad fact, then sign a public Base attestation saying this is your team.</p>
          <button type="button" onClick={() => void startChallenge()} className="mt-3 rounded bg-limeGreen px-3 py-2 text-sm font-semibold text-darkPurple">Try a fresh 10-second check</button>
        </div>
      )}

      {phase === 'loading' && <p className="mt-3 text-sm">Loading the current FPL squad…</p>}

      {phase === 'challenge' && challenge && (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between text-sm"><span>{challenge.question}</span><span className="font-bold text-limeGreen">{remaining}s</span></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {challenge.choices.map((choice) => (
              <button key={choice} type="button" onClick={() => setSelectedAnswer(choice)} className={`rounded border px-3 py-2 text-left text-sm ${selectedAnswer === choice ? 'border-limeGreen bg-limeGreen/20 text-notWhite' : 'border-lightPurple/30 hover:border-limeGreen'}`}>{choice}</button>
            ))}
          </div>
          <button type="button" disabled={!selectedAnswer} onClick={verifyAnswer} className="mt-3 rounded bg-limeGreen px-3 py-2 text-sm font-semibold text-darkPurple disabled:cursor-not-allowed disabled:opacity-40">Verify answer</button>
        </div>
      )}

      {phase === 'verifying' && <p className="mt-3 text-sm">Checking the answer securely…</p>}

      {phase === 'attesting' && !successUid && (
        <div className="mt-3">
          <p className="text-sm">Your challenge passed. Sign the Base attestation from the wallet associated with this claim.</p>
          <button type="button" onClick={() => void attest()} disabled={isSubmittingAttestation} className="mt-3 rounded bg-limeGreen px-3 py-2 text-sm font-semibold text-darkPurple disabled:opacity-60">{isSubmittingAttestation ? 'Confirming on Base…' : 'Sign attestation'}</button>
        </div>
      )}

      {phase === 'success' && successUid && (
        <div className="mt-3 rounded bg-limeGreen/10 p-3 text-sm"><p className="font-semibold text-limeGreen">Claim recorded on Base.</p><a className="underline" href={`https://base.easscan.org/attestation/view/${successUid}`} target="_blank" rel="noreferrer">View attestation</a></div>
      )}

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
}
