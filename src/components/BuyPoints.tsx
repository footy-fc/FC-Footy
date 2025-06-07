import { config } from '~/components/providers/WagmiProvider';
import React, { useState, useEffect } from 'react';
import { PriceIncreaseCountdown } from '~/components/points/PriceIncreaseCountdown';
import ScoresInfo from '~/components/ScoresInfo';
import { useAccount } from 'wagmi';
import { useFormattedTokenIssuance } from '~/hooks/useFormattedTokenIssuance';
import { useWriteJbMultiTerminalPay, useJBRulesetContext } from 'juice-sdk-react';
import { parseEther } from 'viem';
import { TERMINAL_ADDRESS, PROJECT_ID } from '~/constants/contracts';
import { waitForTransactionReceipt } from 'wagmi/actions';
import ContestScoresPoints from "./ContestScoresPoints";
import { sdk } from "@farcaster/frame-sdk";
import { getTeamPreferences } from '~/lib/kvPerferences';

const fetchRevnetShields = async (projectId: number, chainId: number) => {
  //const url = `https://app.revnet.eth.sucks/api/data/shields?projectId=${projectId}&chainId=${chainId}`;
  const url = `/api/proxyRevnet?projectId=${projectId}&chainId=${chainId}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch shields data: ${response.statusText}`);
  }
  return await response.json();
};

export default function BuyPoints() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const memo = '';
  const [ethAmount, setEthAmount] = useState('0.1');
  const [showInstructions, setShowInstructions] = useState(false);
  const { address } = useAccount();
  const { writeContractAsync } = useWriteJbMultiTerminalPay();
  const [favClub, setFavClub] = useState<string | null>(null);
  const [tvl, setTVL] = useState<string | null>(null);
  const { rulesetMetadata } = useJBRulesetContext();
  const issuance = useFormattedTokenIssuance({
    reservedPercent: rulesetMetadata?.data?.reservedPercent,
  });

  const [hasAgreed, setHasAgreed] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');
  const [isMiniApp, setIsMiniApp] = useState<boolean>(false);

  useEffect(() => {
    const checkMiniApp = async () => {
      const result = await sdk.isInMiniApp();
      setIsMiniApp(result);
    };
    checkMiniApp();
  }, []);

  useEffect(() => {
      (async () => {
        try {
          const data = await fetchRevnetShields(53, 8453);
          setTVL(data.message);
            return undefined;
          }
        catch (err) {
          console.error('Failed to fetch token holders', err);
        }
      })();
  }, []);

  useEffect(() => {
    const fetchTeam = async () => {
      const context = await sdk.context;
      console.log('context now', context.user);
      const fid = context.user?.fid;
      if (!fid) return;
      const prefs = await getTeamPreferences(fid);
      const rawTeam = prefs?.[0]; // e.g. 'eng.1-liv'
      const clubCode = rawTeam?.split('-')?.[1]; // → 'liv'
      if (clubCode) {
        const upperClub = clubCode.toUpperCase();
        setFavClub(upperClub);
      }
    };
    fetchTeam();
  }, []);
  
  const getIssuedPoints = (eth: number) => {
    const pointsPerEth = Number(issuance?.replace(/[^\d.]/g, '') ?? 0);
    return Math.round(pointsPerEth * eth).toLocaleString();
  };

  if (!isMiniApp) return null;

  const handleBuyPack = async (ethAmount: string) => {
    if (!address) return;

    setIsSubmitting(true);
    setTxStatus('pending');

    try {
      const weiAmount = parseEther(ethAmount);
      // Always allow transaction, even if favClub is null
      const finalMemo = favClub ? `${memo} I support ${favClub}` : `${memo} I support Footy App`;
      console.log("Transaction memo:", finalMemo);

      const txHash = await writeContractAsync({
        args: [
          PROJECT_ID,
          '0x000000000000000000000000000000000000EEEe',
          weiAmount,
          address,
          0n,
          finalMemo,
          '0x0',
        ],
        address: TERMINAL_ADDRESS,
        value: weiAmount,
      });

      await waitForTransactionReceipt(config, { hash: txHash });
      setTxStatus('confirmed');
      setTimeout(() => setTxStatus('idle'), 5000);
    } catch (err) {
      console.error('Contract call failed', err);
      setTxStatus('failed');
      setTimeout(() => setTxStatus('idle'), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-purplePanel rounded shadow-md max-w-4xl mx-auto">
      {showInstructions && <ScoresInfo defaultOpen onClose={() => setShowInstructions(false)} />}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-notWhite font-bold">Participate in Footy App</h2>
      </div>
      <div className="bg-gray-800/70 rounded-lg shadow-lg p-4 border border-gray-700 mt-2">
        <div className="text-sm text-lightPurple mb-2 space-y-1">
          <p>This is a community project built by fans, for fans of the beautiful game. Your contribution earns you $SCORES points, which *will* unlock:</p>
          <ul className="list-disc list-inside pl-2">
            <li>Fantasy League participation</li>
            <li>Custom emoji packs</li>
            <li>Score Square games</li>
            <li>And more to come!</li>
          </ul>
        </div>
        <PriceIncreaseCountdown />
        <p className="text-sm text-notWhite mt-2 mb-2">
          {ethAmount || '0'} ETH = {getIssuedPoints(Number(ethAmount || '0'))}{' '}
          <button
            onClick={async () => {
              try {
                await sdk.actions.viewToken({
                  token: 'eip155:8453/erc20:0xba1afff81a239c926446a67d73f73ec51c37c777',
                });
              } catch (err) {
                console.error('viewToken error:', err);
              }
            }}
            className="text-xs text-lightPurple underline hover:text-fontRed"
          >
            $SCORES
          </button>
        </p>
        <input
          type="number"
          step="0.0001"
          min="0"
          placeholder="Enter ETH amount"
          className="border border-limeGreenOpacity p-2 rounded w-full bg-darkPurple text-lightPurple"
          value={ethAmount}
          onChange={(e) => setEthAmount(e.target.value)}
          disabled={isSubmitting}
        />
        <div className="flex items-center mt-4 space-x-2">
          <input
            type="checkbox"
            id="agree"
            checked={hasAgreed}
            onChange={(e) => setHasAgreed(e.target.checked)}
            className="form-checkbox text-limeGreen rounded"
          />
          <label htmlFor="agree" className="text-sm text-lightPurple">
            I have read and agree to the <button onClick={() => setShowInstructions(true)} className="underline text-deepPink hover:text-fontRed">rules</button>.
          </label>
        </div>
        <button
          onClick={async () => {
            try {
              await sdk.haptics.impactOccurred('medium');
            } catch {
              // ignore haptics errors
            }
            handleBuyPack(ethAmount);
          }}
          disabled={isSubmitting || !ethAmount || !hasAgreed}
          className={`w-full mt-4 py-2 px-4 rounded transition-colors ${
            txStatus === 'pending'
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-deepPink text-white hover:bg-fontRed'
          }`}
        >
          {txStatus === 'pending'
            ? 'Waiting for confirmation...'
            : txStatus === 'confirmed'
            ? 'Confirmed ✅'
            : txStatus === 'failed'
            ? 'Failed ❌ — Try again'
            : `Buy for ${ethAmount || '...'} ETH`}
        </button>
      </div>
      <div className="w-full h-full mt-6">
        <p className="text-lightPurple text-sm mb-2">{tvl} in treasury</p>
         <ContestScoresPoints />  
      </div>
    </div>
  );
}
