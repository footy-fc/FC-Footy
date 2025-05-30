import { sdk } from '@farcaster/frame-sdk';
import Image from 'next/image';
// --- FarcasterUser type for userMap/farcasterData entries ---
interface FarcasterUser {
  custody_address: string;
  fid: number;
  username?: string;
  pfp_url?: string;
}
import { config } from '~/components/providers/WagmiProvider';
import React, { useState, useEffect, useRef } from 'react';
import { debounce } from 'lodash';
import { PriceIncreaseCountdown } from '~/components/points/PriceIncreaseCountdown';
import ScoresInfo from '~/components/ScoresInfo';
import { getTeamPreferences } from '~/lib/kvPerferences';
import { getTeamLogo } from "./utils/fetchTeamLogos";
import { fetchUsersByAddress } from './utils/fetchUserByAddressNeynar';
import { useAccount } from 'wagmi';
import { useFormattedTokenIssuance } from '~/hooks/useFormattedTokenIssuance';
import { useWriteJbMultiTerminalPay, useJBRulesetContext } from 'juice-sdk-react';
import { parseEther } from 'viem';
import { usePrivy } from '@privy-io/react-auth';
//import { usePathname, useSearchParams } from 'next/navigation';
import { TERMINAL_ADDRESS, PROJECT_ID } from '~/constants/contracts';
import { waitForTransactionReceipt } from 'wagmi/actions';

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
  
  const { ready, authenticated, user } = usePrivy();
  const [favClub, setFavClub] = useState<string | null>(null);
  // const pathname = usePathname();
  // const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  // --- Added state declarations ---
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [tvl, setTVL] = useState<string | null>(null);
  const packs = [
    {
      label: 'OG Booster',
      amount: '0.1',
      image: '/og.png',
      subtext: '💰 Legendary scoreboard sabotage—OG style',
      description: "Own goal? Nah—OG move. This pack is only for the real ones on the whitelist.",
    },
    {
      label: 'VAR Pack',
      amount: '0.01',
      image: '/var.png',
      subtext: '🧐 Not much flex, but hey, it gets you on the board',
      description: "Like the ref, you've got no idea what's happening—but points might help.",
    },
    {
      label: 'Red Card',
      amount: '0.005',
      image: '/redcard.png',
      subtext: '🚨 Big plays or big penalties—still counts',
      description: "Get sent off in style. 2 match suspension. Bold moves earn bold points.",
    },
  ];
  useEffect(() => {
    if (!selectedCard && packs.length) {
      setSelectedCard(packs[Math.floor(packs.length / 2)].amount);
    }
  }, [selectedCard, packs]);
  //const [flippedCard, setFlippedCard] = useState<string | null>(null);

  const { rulesetMetadata } = useJBRulesetContext();
  const issuance = useFormattedTokenIssuance({
    reservedPercent: rulesetMetadata?.data?.reservedPercent,
  });

  const [hasAgreed, setHasAgreed] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');

  type Participant = {
    address: string;
    balance: string;
    username?: string;
    pfp?: string;
    teamLogo?: string;
  };
  const [topHolders, setTopHolders] = useState<Participant[]>([]);
  // userMapRef stores mapping from address to FarcasterUser for use in render
  const userMapRef = useRef<Map<string, FarcasterUser>>(new Map());

  useEffect(() => {
    if (!ready || !authenticated) return;

    (async () => {
      try {
        const data = await fetchRevnetShields(53, 8453);
        setTVL(data.message);
        // Find the chain with chainId === 8453
        const baseChain = data.chains?.find((c: { chainId: number }) => c.chainId === 8453);
        const participants: Participant[] = baseChain?.participants ?? [];
        const holders: Participant[] = participants
          .filter((p) => p.balance !== '0')
          .map((p) => ({
            address: p.address,
            balance: (Number(p.balance) / 1e18).toFixed(4),
          }))
          .sort((a, b) => Number(b.balance) - Number(a.balance));

        // Fetch Farcaster user data and merge
        const farcasterData = await fetchUsersByAddress(
          holders.map((h) => h.address)
        );
        const userMap: Map<string, FarcasterUser> = new Map();
        Object.entries(farcasterData).forEach(([address, users]) => {
          if (users.length > 0) {
            userMap.set(address.toLowerCase(), {
              ...users[0],
              fid: users[0].fid,
            });
          }
        });
        // Save userMap to ref for render-time access
        userMapRef.current = userMap;

        // Helper to fetch team logo for a single address
        const getTeamLogoForAddress = async (address: string): Promise<string | undefined> => {
          try {
            const match = userMap.get(address.toLowerCase());
            if (!match?.fid) return undefined;
            const prefs = await getTeamPreferences(match.fid);
            const teamId = prefs?.[0];
            if (teamId) {
              const [league, abbr] = teamId.split("-");
              return getTeamLogo(abbr, league);
            }
          } catch (err) {
            console.error(`Failed to fetch team logo for ${address}`, err);
          }
          return undefined;
        };

        const enrichedHolders = await Promise.all(
          holders.map(async (h) => {
            const match = userMap.get(h.address.toLowerCase());
            const teamLogo = await getTeamLogoForAddress(h.address);
            return {
              ...h,
              username: match?.username,
              pfp: match?.pfp_url,
              teamLogo,
            };
          })
        );
        setTopHolders(enrichedHolders);
      } catch (err) {
        console.error('Failed to fetch token holders', err);
      }
    })();
  }, [ready, authenticated, favClub]);
  // Handler for PFP click to view Farcaster profile
  const handlePfpClick = async (fid: number | undefined) => {
    if (!fid) return;
    try {
      await sdk.actions.ready();
      await sdk.actions.viewProfile({ fid });
    } catch (error) {
      console.error('Failed to view profile:', error);
    }
  };

  // Handler to compose a cast for a holder
  const handleRowCast = async (holder: Participant) => {
    const username = holder.username ?? holder.address;
    const message = `@${username} has ${Number(holder.balance).toLocaleString()} $SCORES on Footy App`;
    try {
      await sdk.actions.ready();
        await sdk.actions.composeCast({
          text: message,
          embeds: ['https://fc-footy.vercel.app'],
        });
    } catch (err) {
      console.error('Failed to compose cast:', err);
    }
  };

  const getIssuedPoints = (eth: number) => {
    const pointsPerEth = Number(issuance?.replace(/[^\d.]/g, '') ?? 0);
    return Math.round(pointsPerEth * eth).toLocaleString();
  };

  useEffect(() => {
    const fetchTeam = async () => {
      const farcasterAccount = user?.linkedAccounts.find(
        (account) => account.type === 'farcaster'
      );
      const fid = farcasterAccount?.fid;
      if (!fid) return;
      const prefs = await getTeamPreferences(fid);
      const rawTeam = prefs?.[0]; // e.g. 'eng.1-liv'
      const clubCode = rawTeam?.split('-')?.[1]; // → 'liv'
      if (clubCode) {
        const upperClub = clubCode.toUpperCase();
        setFavClub(upperClub);
      }
    };
    if (authenticated) fetchTeam();
  }, [user, authenticated]);

  const extendedPacks = [...packs, ...packs, ...packs];
  // const baseIndex = extendedPacks.length / 3;
  // Removed currentIndex calculation

  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const middleIndex = packs.length;
      const scrollLeft = middleIndex * (220 + 24); // card width + gap
      container.scrollLeft = scrollLeft;
    }
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const cardWidthWithGap = 220 + 24;
    const totalPacks = packs.length;

    const scrollHandler = debounce(() => {
      const currentScroll = container.scrollLeft;
      const start = cardWidthWithGap * totalPacks;
      const end = cardWidthWithGap * totalPacks * 2;

      if (currentScroll < start - cardWidthWithGap / 2) {
        container.scrollLeft = currentScroll + cardWidthWithGap * totalPacks;
      } else if (currentScroll > end + cardWidthWithGap / 2) {
        container.scrollLeft = currentScroll - cardWidthWithGap * totalPacks;
      }
    }, 50);

    container.addEventListener('scroll', scrollHandler);
    return () => container.removeEventListener('scroll', scrollHandler);
  }, [packs.length, extendedPacks.length]);

  // const [ setVisibleCards] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const updated: Record<number, boolean> = {};
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute('data-index'));
          updated[index] = entry.isIntersecting;
        });
        // setVisibleCards((prev) => ({ ...prev, ...updated }));
      },
      {
        root: container,
        threshold: 0.6,
      }
    );

    const cards = container.querySelectorAll('[data-index]');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [extendedPacks.length]);

  if (!ready || !authenticated) return null;

  const handleBuyPack = async (ethAmount: string) => {
    if (!address) return;

    setIsSubmitting(true);
    setTxStatus('pending');

    try {
      const weiAmount = parseEther(ethAmount);
      const finalMemo = favClub ? `${memo} I support ${favClub}` : memo;

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
    <div className="bg-purplePanel rounded shadow-md max-w-4xl mx-auto p-2">
      {/* Modal for ScoresInfo */}
      {showInstructions && <ScoresInfo defaultOpen onClose={() => setShowInstructions(false)} />}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-notWhite font-bold">Participate in Footy App</h2>
        {/* <div className="mb-6">
          {!false && (
            <button
              onClick={() => setShowInstructions(true)}
              className="flex items-center text-deepPink hover:text-fontRed focus:outline-none transition"
            >
              <Info className="w-5 h-5" />
            </button>
          )}
        </div> */}
      </div>
{/*       <div className="relative">
        {!favClub && (
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams?.toString());
              params.set('tab', 'settings');
              window.history.pushState(null, '', `${pathname}?${params.toString()}`);
            }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-start bg-black/70 rounded-lg text-center px-4 pt-10 hover:opacity-80 transition"
          >
            <img src="/banny_redcard.png" alt="Red card" className="max-w-xs mb-4 opacity-90" />
            <p className="text-lightPurple text-sm">
              Follow your favorite team in settings to unlock point packs.
            </p>
          </button>
        )}
        <div ref={scrollRef} className="overflow-x-auto snap-x snap-mandatory flex gap-6 px-6 pb-4">
          {extendedPacks.map((pack, idx) => {
            const isSelected = visibleCards[idx];
            return (
              <div
                key={`${pack.amount}-${idx}`}
                data-index={idx}
                className="w-[220px] h-[240px] snap-center shrink-0 cursor-pointer"
                style={{
                  transform: `scale(${isSelected ? 1.05 : 0.85}) rotate(${isSelected ? 0 : idx % packs.length === 0 ? -10 : 10}deg)`,
                  transition: isSelected ? 'transform 0.4s ease' : 'none',
                  willChange: 'transform',
                  perspective: '1000px',
                  zIndex: isSelected ? 10 : 1,
                }}
                onClick={() => setSelectedCard(pack.amount)}
              >
                <div
                  className={`relative w-full h-full transition-transform duration-500`}
                  style={{
                    transform: flippedCard === pack.amount ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div
                    className={`absolute inset-0 p-4 flex flex-col rounded-md bg-darkPurple border-2 text-notWhite shadow-lg overflow-hidden [border-top-right-radius:0] ${
                      isSelected ? 'border-limeGreenOpacity' : 'border-lightPurple'
                    }`}
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="flex-grow">
                      {pack.label === 'OG Booster' && (
                        <div className="absolute top-2 left-2 bg-white text-black text-[10px] font-bold px-2 py-1 rounded-sm uppercase">
                          Whitelist: {favClub} Supporters
                        </div>
                      )}
                      <div className="flex items-center gap-4 mb-4 border-t-2 border-deepPink pt-1">
                        <img src={pack.image} alt={pack.label} className="h-20 w-20 object-contain" />                        <div>
                          <div className="text-lg font-semibold text-notWhite leading-tight">
                            {pack.label}
                          </div>
                        </div>
                      </div>
                      <div className="text-lg font-extrabold text-limeGreen mt-2">
                        {getIssuedPoints(Number(pack.amount))} $SCORES
                      </div>
                      <div className="text-xs text-lightPurple -mt-1 mb-1">for {pack.amount} ETH</div>
                    </div>
                    <button
                      onClick={() => handleBuyPack(pack.amount)}
                      disabled={isSubmitting || selectedCard !== pack.amount}
                      className="w-full mt-4 py-2 px-4 rounded transition-colors bg-deepPink text-white hover:bg-fontRed disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Buy
                    </button>
                  </div>
                  <div className="absolute inset-0 p-4 flex flex-col justify-center items-center rounded-md bg-black border-2 border-deepPink text-lightPurple [transform:rotateY(180deg)] overflow-hidden [border-top-right-radius:0]" style={{ backfaceVisibility: 'hidden' }}>
                    <>
                      <p className="text-sm font-bold text-center text-notWhite">{pack.subtext}</p>
                      <p className="text-xs text-center mt-2">{pack.description}</p>
                    </>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-0 right-0 p-1 cursor-pointer z-10" onClick={() => setFlippedCard(flippedCard === pack.amount ? null : pack.amount)}>
                    <FaForward className="w-5 h-5 text-lightPurple transform -rotate-45" /> 
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div> */}
      <div className={`bg-gray-800/70 rounded-lg shadow-lg p-4 border border-gray-700 mt-2 ${!favClub ? 'pointer-events-none opacity-50 relative' : ''}`}>
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
        <p className="text-sm text-lightPurple mt-2 mb-2">
          {ethAmount || '0'} ETH = {getIssuedPoints(Number(ethAmount || '0'))} $SCORES
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
          onClick={() => handleBuyPack(ethAmount)}
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
        <p className="text-lightPurple text-sm">{tvl} in treasury</p>
        <div className="w-full h-[500px] overflow-y-auto mt-2">
          <table className="w-full bg-darkPurple">
            <thead className="bg-darkPurple">
              <tr className="text-notWhite text-center border-b border-limeGreenOpacity">
                <th className="py-1 px-2 text-left font-medium">Rank</th>
                <th className="py-1 px-4 text-left font-medium">User</th>
                <th className="py-1 px-4 text-right font-medium">$SCORES</th>
              </tr>
            </thead>
            <tbody>
              {topHolders.map((holder, index) => (
                <tr
                  key={index}
                  onClick={() => handleRowCast(holder)}
                  className="hover:bg-purplePanel transition-colors text-lightPurple text-sm cursor-pointer"
                >
                  <td className="py-1 px-4 border-b border-limeGreenOpacity text-left">
                    {index + 1}
                  </td>
                  <td className="py-1 px-4 border-b border-limeGreenOpacity text-left flex items-center gap-2">
                    {holder.pfp && (
                      <Image
                        src={holder.pfp}
                        alt={holder.username || ''}
                        width={30}
                        height={30}
                        className="rounded-full cursor-pointer"
                        onClick={() => handlePfpClick(userMapRef.current.get(holder.address.toLowerCase())?.fid)}
                      />
                    )}
                    {holder.teamLogo && (
                      <Image src={holder.teamLogo} alt="Team" width={16} height={16} className="rounded-sm" />
                    )}
                    <span className="truncate">{holder.username || holder.address}</span>
                  </td>
                  <td className="py-1 px-4 border-b border-limeGreenOpacity text-right font-bold whitespace-nowrap">
                    {Math.floor(Number(holder.balance)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
