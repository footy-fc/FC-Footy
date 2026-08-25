/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { sdk } from "@farcaster/miniapp-sdk";
import FantasyRow from './ContestFantasyRow';
import { fetchFantasyData, FantasyEntry } from './utils/fetchFantasyData';
import fantasyManagersLookup from '../data/fantasy-managers-lookup.json';
import FplClaimPanel from './FplClaimPanel';
import { useFootyFarcaster } from '~/lib/farcaster/useFootyFarcaster';

const registeredManagerCount = fantasyManagersLookup.length;

const ContestFCFantasy = () => {
  const [fantasyData, setFantasyData] = useState<FantasyEntry[]>([]);
  const [loadingFantasy, setLoadingFantasy] = useState(false);
  const [errorFantasy, setErrorFantasy] = useState<string | null>(null);
  const [claimEntry, setClaimEntry] = useState<FantasyEntry | null>(null);
  const [activeClaimEntryId, setActiveClaimEntryId] = useState<number | null>(null);
  const { activeFid: currentUserFid, getAuthorizationHeaders } = useFootyFarcaster();

  useEffect(() => {
    if (!currentUserFid) return;
    let cancelled = false;
    void getAuthorizationHeaders()
      .then((headers) => fetch('/api/fpl-claim/status', { headers, cache: 'no-store' }))
      .then((response) => response.json())
      .then((payload: { byFid?: { entryId?: number } | null }) => {
        if (!cancelled && payload.byFid?.entryId) {
          setActiveClaimEntryId(payload.byFid.entryId);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [currentUserFid, getAuthorizationHeaders]);

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

  const handleClaimClick = (selected: FantasyEntry) => {
    setClaimEntry(selected);
  };

  const mappedManagerCount = fantasyData.filter((entry) => Number.isInteger(entry.fid)).length;

  return (
      <div>
        <div className="mb-2 rounded bg-darkPurple px-2 py-1 text-xs text-lightPurple">
          {fantasyData.length > 0
            ? `${mappedManagerCount} of ${fantasyData.length} loaded managers mapped to Farcaster profiles. ${registeredManagerCount} registered mappings on file.`
            : `${registeredManagerCount} registered Farcaster manager mappings on file.`}
        </div>
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
                <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                  Claim
                </th>
              </tr>
            </thead>
            <tbody>
              {fantasyData.map((entry, index) => (
                <FantasyRow
                  key={entry.entry_id ?? `${entry.fid}-${index}`}
                  entry={entry}
                  onRowClick={handleRowSelect}
                  onClaimClick={handleClaimClick}
                  claimed={activeClaimEntryId === entry.entry_id}
                  claimDisabled={activeClaimEntryId !== null}
                  currentUserFid={currentUserFid}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <div>No fantasy data available. {registeredManagerCount} Farcaster manager mappings are registered locally.</div>
        )}
        {claimEntry && currentUserFid && (
          <FplClaimPanel
            entry={claimEntry}
            getAuthorizationHeaders={getAuthorizationHeaders}
            onClose={() => setClaimEntry(null)}
            onClaimed={(entryId) => {
              setActiveClaimEntryId(entryId);
            }}
          />
        )}
      </div>
  );
};

export default ContestFCFantasy;
