/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useMemo, useState } from "react";
import { encodeFunctionData } from "viem";
import { useJBRulesetContext } from 'juice-sdk-react';
import { etherscanLink } from "~/lib/utils";
import { useReadContract, useWriteContract } from "wagmi";

// Base mainnet addresses
const CONTROLLER = '0xd1c436eb62e1d23e66842701b09e3d65aa8522e8' as const; // JBController4_1

// Minimal ABI fragments needed
const controllerAbi = [
  {
    name: 'currentRulesetOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [
      {
        name: 'ruleset',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'start', type: 'uint256' },
          { name: 'duration', type: 'uint256' },
          { name: 'weight', type: 'uint256' },
          { name: 'baseCurrency', type: 'uint256' },
          { name: 'decayRate', type: 'uint256' },
          { name: 'metadata', type: 'uint256' },
        ],
      },
      {
        name: 'metadata',
        type: 'tuple',
        components: [],
      },
    ],
  },
  {
    // setSplitGroupsOf(uint256 projectId, uint256 rulesetId, (uint256 group, (bool,bool,uint256,uint256,address,uint256,address,address,bytes32)[] splits)[] splitGroups)
    name: 'setSplitGroupsOf',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'rulesetId', type: 'uint256' },
      {
        name: 'splitGroups',
        type: 'tuple[]',
        components: [
          { name: 'group', type: 'uint256' },
          {
            name: 'splits',
            type: 'tuple[]',
            components: [
              { name: 'preferClaimed', type: 'bool' },
              { name: 'preferAddToBalance', type: 'bool' },
              { name: 'percent', type: 'uint256' },
              { name: 'projectId', type: 'uint256' },
              { name: 'beneficiary', type: 'address' },
              { name: 'lockedUntil', type: 'uint256' },
              { name: 'hook', type: 'address' },
              { name: 'allocator', type: 'address' },
              { name: 'metadata', type: 'bytes32' },
            ],
          },
        ],
      },
    ],
    outputs: [],
  },
] as const;

const RevnetSetHookForm: React.FC = () => {
  const [projectId, setProjectId] = useState<bigint>(53n);
  const [useCurrent, setUseCurrent] = useState(true);
  const [rulesetIdOverride, setRulesetIdOverride] = useState<string>("");
  // Only support Reserved Token splits (group 2)
  // Recipients share the controller's max reserved allocation; treat that max as 100% in the UI
  const [recipients, setRecipients] = useState<Array<{ beneficiary: string; sharePct: string }>>([
    { beneficiary: '0x0000000000000000000000000000000000000000', sharePct: '100' },
  ]);
  // Split hook not used in this simplified flow
  const hook = '0x0000000000000000000000000000000000000000';
  // Advanced fields fixed to defaults in simplified flow
  const preferAddToBalance = false;
  const preferClaimed = false;
  const lockedUntil = '0';
  const allocator = '0x0000000000000000000000000000000000000000';
  const metadataHex = '0x0000000000000000000000000000000000000000000000000000000000000000';

  const { data: current } = useReadContract({
    address: CONTROLLER,
    abi: controllerAbi,
    functionName: 'currentRulesetOf',
    args: [projectId],
    query: { enabled: !!projectId },
  } as unknown as any);

  const computedRulesetId = useMemo(() => {
    if (!useCurrent && rulesetIdOverride) return BigInt(rulesetIdOverride);
    const c: any = current as any;
    const id = c?.[0]?.id;
    return id ? BigInt(id) : 0n;
  }, [useCurrent, rulesetIdOverride, current]);

  const { writeContractAsync, isPending } = useWriteContract() as unknown as { writeContractAsync: (args: any) => Promise<unknown>, isPending: boolean };
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txError, setTxError] = useState<string>("");

  // Read max reserved percent from ruleset metadata (bps out of 10,000)
  const { rulesetMetadata } = useJBRulesetContext();
  const maxReservedBps = rulesetMetadata?.data?.reservedPercent?.value;
  const maxReservedPct = typeof maxReservedBps === 'number' ? (maxReservedBps / 100).toFixed(2) : null;

  // Read project owner from JBProjects (ERC721) if address is provided via env
  const projectsAddress = (process.env.NEXT_PUBLIC_JBPROJECTS_ADDRESS as string) || '';
  const isValidAddr = /^0x[a-fA-F0-9]{40}$/.test(projectsAddress);
  const { data: projectOwner } = useReadContract({
    address: (isValidAddr ? projectsAddress : undefined) as `0x${string}` | undefined,
    abi: [{ name: 'ownerOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256', name: 'tokenId' }], outputs: [{ type: 'address' }] }] as const,
    functionName: 'ownerOf',
    args: [projectId],
    query: { enabled: isValidAddr && !!projectId },
  } as unknown as any);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxStatus('pending');
    setTxError("");
    try {
      // Convert to JB SPLITS_TOTAL_PERCENT (1e9)
      // Each recipient gets share% of the ruleset's reserved max (SPLITS_TOTAL_PERCENT = 1e9)
      const splits = recipients.map((r) => {
        const share = Math.max(0, Math.min(100, Number(r.sharePct || '0')));
        const scaled = BigInt(Math.round((share / 100) * 1_000_000_000));
        return {
          preferClaimed,
          preferAddToBalance,
          percent: scaled,
          projectId: 0n,
          beneficiary: (r.beneficiary || '0x0000000000000000000000000000000000000000') as `0x${string}`,
          lockedUntil: BigInt(lockedUntil || '0'),
          hook: hook as `0x${string}`,
          allocator: allocator as `0x${string}`,
          metadata: metadataHex as `0x${string}`,
        };
      });
      // Debug: log the raw splits tuple
      console.log('[Revnet] splits tuple:', splits.map(s => ({
        preferClaimed: s.preferClaimed,
        preferAddToBalance: s.preferAddToBalance,
        percent: s.percent.toString(),
        projectId: s.projectId.toString(),
        beneficiary: s.beneficiary,
        lockedUntil: s.lockedUntil.toString(),
        hook: s.hook,
        allocator: s.allocator,
        metadata: s.metadata,
      })));

      const groups = [{ group: 2n, splits }];
      // Debug: log the full splitGroups tuple (group + splits)
      console.log('[Revnet] splitGroups tuple:', groups.map(g => ({
        group: g.group.toString(),
        splits: g.splits.map(s => ({
          percent: s.percent.toString(),
          beneficiary: s.beneficiary,
          projectId: s.projectId.toString(),
          preferAddToBalance: s.preferAddToBalance,
          preferClaimed: s.preferClaimed,
          lockedUntil: s.lockedUntil.toString(),
          hook: s.hook,
          allocator: s.allocator,
          metadata: s.metadata,
        })),
      })));

      // Log the args and encoded calldata for auditing
      // Using three-arg controller signature: (projectId, rulesetId, splitGroups)
      const callArgs = [projectId, computedRulesetId, groups] as const;
      // Encode calldata preview
      const calldata = encodeFunctionData({
        abi: controllerAbi as unknown as any,
        functionName: 'setSplitGroupsOf',
        args: callArgs as unknown as any,
      });
      console.log('[Revnet] setSplitGroupsOf args:', {
        controller: CONTROLLER,
        projectId: projectId.toString(),
        rulesetId: computedRulesetId.toString(),
        splitGroups: groups,
      });
      console.log('[Revnet] calldata preview:', calldata);

      await writeContractAsync({
        address: CONTROLLER,
        abi: controllerAbi,
        functionName: 'setSplitGroupsOf',
        args: callArgs as unknown as any,
      });

      setTxStatus('success');
    } catch (err: unknown) {
      setTxStatus('error');
      setTxError(err instanceof Error ? err.message : 'Transaction failed');
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-lightPurple mb-1">Project ID</label>
          <input type="number" value={projectId.toString()} min="0" onChange={e => setProjectId(BigInt(e.target.value || '0'))} className="w-full p-2 rounded bg-darkPurple border border-limeGreenOpacity text-lightPurple" />
        </div>
        <div>
          <label className="block text-sm text-lightPurple mb-1">Ruleset</label>
          <div className="flex items-center gap-2">
            <label className="text-sm text-lightPurple flex items-center gap-1">
              <input type="radio" checked={useCurrent} onChange={() => setUseCurrent(true)} /> Current (ID: {computedRulesetId.toString() || '—'})
            </label>
            <label className="text-sm text-lightPurple flex items-center gap-1">
              <input type="radio" checked={!useCurrent} onChange={() => setUseCurrent(false)} /> Override
            </label>
          </div>
          {!useCurrent && (
            <input type="number" placeholder="Ruleset ID" value={rulesetIdOverride} onChange={e => setRulesetIdOverride(e.target.value)} className="mt-2 w-full p-2 rounded bg-darkPurple border border-limeGreenOpacity text-lightPurple" />
          )}
        </div>
        <div>
          <label className="block text-sm text-lightPurple mb-1">Group</label>
          <input disabled value="Reserved (group 2)" className="w-full p-2 rounded bg-gray-800 border border-limeGreenOpacity text-lightPurple" />
        </div>
      </div>

      <div className="p-3 rounded border border-limeGreenOpacity bg-gray-900/30">
        <div className="text-sm text-lightPurple">
          Treat the ruleset&apos;s max reserved token allocation as <span className="text-notWhite font-semibold">100%</span> here. Set recipient shares below.
          {maxReservedPct !== null && (
            <span className="ml-2 text-xs text-gray-300">(Current ruleset max: {maxReservedPct}%)</span>
          )}
          Any <span className="text-notWhite font-semibold">unallocated</span> portion automatically routes to the project owner.
          {isValidAddr && typeof projectOwner === 'string' && (
            <div className="mt-1 text-xs text-gray-400">
              Project owner: <span className="text-notWhite">{projectOwner}</span>
              {etherscanLink && (
                <>
                  {" "}
                  <a
                    className="underline hover:text-deepPink"
                    href={etherscanLink(projectOwner, { type: 'address' })}
                    target="_blank"
                    rel="noreferrer"
                  >
                    view
                  </a>
                </>
              )}
            </div>
          )}
          {!isValidAddr && (
            <div className="mt-1 text-xs text-gray-400">Set NEXT_PUBLIC_JBPROJECTS_ADDRESS to display project owner.</div>
          )}
        </div>
        </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-lightPurple">Recipients (shares must total 100%)</label>
          <button type="button" onClick={() => setRecipients([...recipients, { beneficiary: '0x', sharePct: '0' }])} className="px-2 py-1 text-xs rounded border border-limeGreenOpacity text-lightPurple hover:bg-deepPink hover:text-white transition-colors">Add recipient</button>
        </div>
        <div className="space-y-2">
          {recipients.map((r, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-8">
                <label className="block text-xs text-lightPurple mb-1">Beneficiary</label>
                <input type="text" value={r.beneficiary} onChange={e => setRecipients(recipients.map((it, i) => i === idx ? { ...it, beneficiary: e.target.value } : it))} placeholder="0x..." className="w-full p-2 rounded bg-darkPurple border border-limeGreenOpacity text-lightPurple" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs text-lightPurple mb-1">Share (%)</label>
                <input type="number" min="0" max="100" value={r.sharePct} onChange={e => setRecipients(recipients.map((it, i) => i === idx ? { ...it, sharePct: e.target.value } : it))} className="w-full p-2 rounded bg-darkPurple border border-limeGreenOpacity text-lightPurple" />
              </div>
              <div className="md:col-span-1 flex justify-end">
                <button type="button" onClick={() => setRecipients(recipients.filter((_, i) => i !== idx))} className="px-2 py-2 text-xs rounded border border-fontRed text-fontRed hover:bg-fontRed hover:text-white transition-colors">✕</button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-400">
          Allocated: {recipients.reduce((sum, r) => sum + (Number(r.sharePct || '0') || 0), 0)}% · Unallocated (to owner): {Math.max(0, 100 - recipients.reduce((sum, r) => sum + (Number(r.sharePct || '0') || 0), 0))}%
          <div className="mt-1">Tip: To avoid sending any unallocated portion to the owner, set recipients&apos; shares to total 100%.</div>
          <div>If you want a catch‑all, add your treasury as a recipient row and give others less than 100%.</div>
        </div>
      </div>

      {/* Beneficiary/lockedUntil per-recipient not shown in simplified view; advanced use cases can enable here. */}

      {/* Advanced fields hidden in simplified flow but left in state (zeros) */}

      {/* Flags kept for completeness; irrelevant for reserved, but safe to leave unchecked */}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={
            isPending ||
            txStatus === 'pending' ||
            !computedRulesetId ||
            recipients.length === 0 ||
            recipients.reduce((sum, r) => sum + (Number(r.sharePct || '0') || 0), 0) > 100
          }
        className={`px-4 py-2 rounded bg-deepPink text-white hover:bg-fontRed ${
          isPending || txStatus === 'pending' ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
          Set Reserved Splits
        </button>
        {txStatus === 'success' && <span className="text-sm text-limeGreen">✅ Success</span>}
        {txStatus === 'error' && <span className="text-sm text-fontRed">❌ {txError}</span>}
      </div>

      <div className="text-xs text-gray-400">
        You must be connected with a wallet that has permission to configure splits for this project. This form sets multiple reserved token splits to the recipients above.
      </div>
    </form>
  );
};

export default RevnetSetHookForm;
