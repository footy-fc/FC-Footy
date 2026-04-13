/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { sdk } from "@farcaster/miniapp-sdk";
import FantasyRow from './ContestFantasyRow';
import { fetchFantasyData, FantasyEntry } from './utils/fetchFantasyData';

const ContestFCFantasy = () => {
  const [fantasyData, setFantasyData] = useState<FantasyEntry[]>([]);
  const [loadingFantasy, setLoadingFantasy] = useState(false);
  const [errorFantasy, setErrorFantasy] = useState<string | null>(null);
  const [currentUserFid, setCurrentUserFid] = useState<number | null>(null);
  const [feplChat, setFeplChat] = useState<{ exists: boolean; invite?: string | null }>({ exists: false, invite: null });

  useEffect(() => {
    let cancelled = false;

    const loadContext = async () => {
      try {
        const ctx = await sdk.context;
        if (!cancelled) {
          setCurrentUserFid(ctx?.user?.fid || null);
        }

        try {
          const res = await fetch('/api/fanclub-chat?teamId=fepl');
          if (!cancelled) {
            if (res.ok) {
              const j = await res.json();
              setFeplChat({ exists: true, invite: j?.inviteLinkUrl || null });
            } else {
              setFeplChat({ exists: false, invite: null });
            }
          }
        } catch {
          if (!cancelled) {
            setFeplChat({ exists: false, invite: null });
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load Farcaster context:", error);
          setCurrentUserFid(null);
        }
      }
    };

    loadContext();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoadingFantasy(true);
      try {
        const data = await fetchFantasyData();
        if (!isMounted) return;

        const rankedData = data.map((item, i) => ({
          ...item,
          rank: item.rank ?? i + 1,
        }));
        setFantasyData(rankedData);
      } catch (error) {
        if (!isMounted) return;
        setErrorFantasy(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        if (isMounted) {
          setLoadingFantasy(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const openSupportChat = async () => {
    if (!feplChat.invite) return;

    try {
      await sdk.actions.ready();
      await sdk.actions.openUrl(feplChat.invite);
    } catch {}
  };

  const handleRowSelect = async (selected: FantasyEntry) => {
    if (!selected.fid) {
      return;
    }

    try {
      await sdk.actions.ready();
      await sdk.actions.viewProfile({ fid: selected.fid });
    } catch (error) {
      console.error('Failed to open profile:', error);
      try {
        await sdk.actions.openUrl(`https://warpcast.com/~/profiles/${selected.fid}`);
      } catch {}
    }
  };

  return (
    <div>
      {feplChat.exists && feplChat.invite && (
        <div className="flex justify-end mb-4">
          <button
            title="Need help? Ask other managers in the league chat"
            aria-label="Open league support chat"
            className="px-3 py-1 text-xs rounded text-lightPurple hover:bg-deepPink hover:text-white transition-colors"
            onClick={openSupportChat}
          >
            ❓ Need help? Ask in chat
          </button>
        </div>
      )}

      <div className="mt-2">
        <h2 className="text-2xl font-bold text-notWhite mb-4 text-center">League Standings</h2>
        <p className="text-sm text-lightPurple mb-4 text-center">Tap a manager row to open their profile.</p>

        {loadingFantasy ? (
          <div className="text-center">Loading...</div>
        ) : errorFantasy ? (
          <div className="text-red-500">{errorFantasy}</div>
        ) : fantasyData.length > 0 ? (
          <table className="w-full bg-darkPurple">
            <thead className="bg-darkPurple">
              <tr>
                <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                  Rank
                </th>
                <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                  Profile
                </th>
                <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-left font-medium">
                  Team
                </th>
                <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {fantasyData.map((entry, index) => (
                <FantasyRow
                  key={entry.entry_id ?? `${entry.fid}-${index}`}
                  entry={entry}
                  onRowClick={handleRowSelect}
                  currentUserFid={currentUserFid}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <div>No fantasy data available.</div>
        )}
      </div>
    </div>
  );
};

export default ContestFCFantasy;
