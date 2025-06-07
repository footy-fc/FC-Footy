import { sdk } from "@farcaster/frame-sdk";
import Image from 'next/image';
// --- FarcasterUser type for userMap/farcasterData entries ---
interface FarcasterUser {
  custody_address: string;
  fid: number;
  username?: string;
  pfp_url?: string;
}
import React, { useState, useEffect, useRef } from 'react';
import { getTeamPreferences } from '~/lib/kvPerferences';
import { getTeamLogo } from "./utils/fetchTeamLogos";
import { fetchUsersByAddress } from './utils/fetchUserByAddressNeynar';

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
  const [loading, setLoading] = useState<boolean>(true);
  const [isMiniApp, setIsMiniApp] = useState<boolean>(false);
  useEffect(() => {
    const checkMiniApp = async () => {
      const result = await sdk.isInMiniApp();
      setIsMiniApp(result);
    };
    checkMiniApp();
  }, []);
  // const pathname = usePathname();
  // const searchParams = useSearchParams();
  // --- Added state declarations ---
  //const [flippedCard, setFlippedCard] = useState<string | null>(null);

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
    // Load cached holders from localStorage
    const cached = localStorage.getItem('topHolders');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setTopHolders(parsed);
          setLoading(false);
          return;
        }
      } catch {
        // ignore JSON parse errors
      }
    }
    setLoading(true);
  }, []);

  useEffect(() => {
    if (!isMiniApp) return;

      (async () => {
        // Removed setLoading(true) here to prevent flickering when showing cached data
        try {
          const data = await fetchRevnetShields(53, 8453);
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
          localStorage.setItem('topHolders', JSON.stringify(enrichedHolders));
        } catch (err) {
          console.error('Failed to fetch token holders', err);
        } finally {
          setLoading(false);
        }
      })();
  }, [isMiniApp]);
  // Handler for PFP click to view Farcaster profile
const handlePfpClick = async (fid: number | undefined) => {
    if (!fid) return;
    if (isMiniApp) {
      try {
        await sdk.actions.ready();
        await sdk.actions.viewProfile({ fid });
      } catch (error) {
        console.error('Failed to view profile:', error);
      }
    } else {
      window.open(`https://warpcast.com/~/profile/${fid}`, '_blank');
    }
  };

  // Handler to compose a cast for a holder
  const handleRowCast = async (holder: Participant) => {
    const username = holder.username ?? holder.address;
    const message = `@${username} has ${Number(holder.balance).toLocaleString()} $SCORES on Footy App`;
    if (isMiniApp) {
      try {
        await sdk.actions.ready();
        await sdk.actions.composeCast({
          text: message,
          embeds: ['https://fc-footy.vercel.app'],
        });
      } catch (err) {
        console.error('Failed to compose cast:', err);
      }
    } else {
      window.open('https://warpcast.com/~/compose?text=' + encodeURIComponent(message), '_blank');
    }
  };


  return (
    <div className="bg-purplePanel rounded shadow-md max-w-4xl mx-auto">
      <div className="w-full h-full">
        <div className="w-full h-[500px] overflow-y-auto overflow-x-hidden">
          {loading ? (
            <div className="text-center text-notWhite py-10">Loading...</div>
          ) : (
            <table className="w-full table-auto bg-darkPurple">
              <thead className="bg-darkPurple">
                <tr className="text-notWhite text-center border-b border-limeGreenOpacity h-12">
                  <th className="px-1 text-left font-medium">Rank</th>
                  <th className="px-4 text-left font-medium">User</th>
                  <th className="px-4 text-right font-medium">$SCORES</th>
                </tr>
              </thead>
              <tbody>
                {topHolders.map((holder, index) => (
                  <tr
                    key={index}
                    onClick={() => handleRowCast(holder)}
                    className="hover:bg-purplePanel transition-colors text-lightPurple text-sm cursor-pointer h-12"
                  >
                    <td className="px-4 border-b border-limeGreenOpacity text-left">
                      {index + 1}
                    </td>
                    <td className="border-b border-limeGreenOpacity text-left">
                      <div className="px-4 flex items-center gap-2">
                        {holder.pfp && (
                          <Image
                            src={holder.pfp}
                            alt={holder.username || ''}
                            width={30}
                            height={30}
                            className="rounded-full cursor-pointer"
                            onClick={(event) => {
                              event.stopPropagation();
                              handlePfpClick(userMapRef.current.get(holder.address.toLowerCase())?.fid);
                            }}
                          />
                        )}
                        {holder.teamLogo && (
                          <Image src={holder.teamLogo} alt="Team" width={16} height={16} className="rounded-sm" />
                        )}
                        <span className="max-w-[160px] overflow-hidden text-ellipsis truncate">{holder.username || holder.address}</span>
                      </div>
                    </td>
                    <td className="px-4 border-b border-limeGreenOpacity text-right font-bold whitespace-nowrap">
                      {Math.floor(Number(holder.balance)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
