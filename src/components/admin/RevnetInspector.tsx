/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useMemo, useState } from "react";
import { useReadContract } from "wagmi";

const CONTROLLER = '0x27da30646502e2f642be5281322ae8c394f7668a' as const; // JBController4_1 on Base
const DEFAULT_PROJECT_ID = 10n;

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
    name: 'upcomingRulesetOf',
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
          { name: 'end', type: 'uint256' },
          { name: 'approvalHook', type: 'address' },
          { name: 'duration', type: 'uint256' },
          { name: 'weight', type: 'uint256' },
          { name: 'decayRate', type: 'uint256' },
          { name: 'approvalHookMetadata', type: 'uint256' },
        ],
      },
      {
        name: 'metadata',
        type: 'tuple',
        components: [],
      },
    ],
  },
] as const;

const erc20Abi = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const;

const RevnetInspector: React.FC = () => {
  const [projectId, setProjectId] = useState<bigint>(DEFAULT_PROJECT_ID);
  const [tokenAddress, setTokenAddress] = useState<string>('0xAC264447a1D86a3c775a05a60e768cF4120cB3Ec');

  const { data: current } = useReadContract({
    address: CONTROLLER,
    abi: controllerAbi,
    functionName: 'currentRulesetOf',
    args: [projectId],
    query: { enabled: !!projectId },
  } as unknown as any);

  const { data: upcoming } = useReadContract({
    address: CONTROLLER,
    abi: controllerAbi,
    functionName: 'upcomingRulesetOf',
    args: [projectId],
    query: { enabled: !!projectId },
  } as unknown as any);

  const { data: tokenName } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'name',
    query: { enabled: /^0x[a-fA-F0-9]{40}$/.test(tokenAddress) },
  } as unknown as any);
  const { data: tokenSymbol } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: /^0x[a-fA-F0-9]{40}$/.test(tokenAddress) },
  } as unknown as any);
  const { data: tokenDecimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: /^0x[a-fA-F0-9]{40}$/.test(tokenAddress) },
  } as unknown as any);

  const currentId = useMemo(() => {
    const c: any = current as any;
    return c?.[0]?.id ? BigInt(c[0].id).toString() : '—';
  }, [current]);
  const upcomingId = useMemo(() => {
    const u: any = upcoming as any;
    return u?.[0]?.id ? BigInt(u[0].id).toString() : '—';
  }, [upcoming]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-lightPurple mb-1">Project ID</label>
          <input
            type="number"
            min="0"
            value={projectId.toString()}
            onChange={(e) => setProjectId(BigInt(e.target.value || '0'))}
            className="w-full p-2 rounded bg-darkPurple border border-limeGreenOpacity text-lightPurple"
          />
        </div>
        <div>
          <label className="block text-sm text-lightPurple mb-1">Token Address (ERC‑20)</label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            className="w-full p-2 rounded bg-darkPurple border border-limeGreenOpacity text-lightPurple"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3 rounded border border-limeGreenOpacity bg-gray-900/30">
          <h4 className="text-notWhite font-semibold mb-1">Current Ruleset</h4>
          <div className="text-sm text-lightPurple">ID: {currentId}</div>
        </div>
        <div className="p-3 rounded border border-limeGreenOpacity bg-gray-900/30">
          <h4 className="text-notWhite font-semibold mb-1">Upcoming Ruleset</h4>
          <div className="text-sm text-lightPurple">ID: {upcomingId}</div>
        </div>
      </div>

      <div className="p-3 rounded border border-limeGreenOpacity bg-gray-900/30">
        <h4 className="text-notWhite font-semibold mb-2">Token</h4>
        <div className="text-sm text-lightPurple">Name: {typeof tokenName === 'string' ? tokenName : '—'}</div>
        <div className="text-sm text-lightPurple">Symbol: {typeof tokenSymbol === 'string' ? tokenSymbol : '—'}</div>
        <div className="text-sm text-lightPurple">Decimals: {typeof tokenDecimals === 'number' ? tokenDecimals : '—'}</div>
        {/^0x[a-fA-F0-9]{40}$/.test(tokenAddress) && (
          <div className="text-xs text-gray-400 mt-1">BaseScan: https://basescan.org/token/{tokenAddress}</div>
        )}
      </div>
    </div>
  );
};

export default RevnetInspector;
