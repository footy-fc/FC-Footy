/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import FantasyRow from './ContestFantasyRow';
import { fetchFantasyData, FantasyEntry } from './utils/fetchFantasyData';
import FplClaimPanel from './FplClaimPanel';
import FplClaimReleaseModal from './FplClaimReleaseModal';
import { useFootyFarcaster } from '~/lib/farcaster/useFootyFarcaster';
import type { FplClaimSummary } from '~/lib/fplClaimConstants';

const ContestFCFantasy = () => {
  const [fantasyData, setFantasyData] = useState<FantasyEntry[]>([]);
  const [loadingFantasy, setLoadingFantasy] = useState(false);
  const [errorFantasy, setErrorFantasy] = useState<string | null>(null);
  const [claimEntry, setClaimEntry] = useState<FantasyEntry | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<{ entry: FantasyEntry; claim: FplClaimSummary } | null>(null);
  const [activeClaimEntryId, setActiveClaimEntryId] = useState<number | null>(null);
  const [claimsByEntry, setClaimsByEntry] = useState<Record<string, FplClaimSummary>>({});
  const { activeFid: currentUserFid, getAuthorizationHeaders } = useFootyFarcaster();

  useEffect(() => {
    if (!currentUserFid || fantasyData.length === 0) return;
    let cancelled = false;
    void getAuthorizationHeaders()
      .then((headers) => fetch('/api/fpl-claim/status', {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ entryIds: fantasyData.map((entry) => entry.entry_id) }),
        cache: 'no-store',
      }))
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Unable to load FPL claim status');
        return payload;
      })
      .then((payload: { byFid?: FplClaimSummary | null; byEntry?: Record<string, FplClaimSummary> }) => {
        if (cancelled) return;
        setActiveClaimEntryId(payload.byFid?.entryId ?? null);
        setClaimsByEntry(payload.byEntry ?? {});
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [currentUserFid, fantasyData, getAuthorizationHeaders]);

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

  const handleClaimClick = (selected: FantasyEntry) => {
    setClaimEntry(selected);
  };

  return (
      <div>
        {loadingFantasy ? (
          <div className="text-center">Loading...</div>
        ) : errorFantasy ? (
          <div className="text-red-500">{errorFantasy}</div>
        ) : fantasyData.length > 0 ? (
          <table className="w-full table-fixed bg-darkPurple">
            <thead className="bg-darkPurple">
              <tr>
                <th className="h-12 w-[14%] px-1 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                  Rank
                </th>
                <th className="h-12 w-[14%] px-1 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                  Profile
                </th>
                <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-left font-medium">
                  Team
                </th>
                <th className="h-12 w-[14%] px-1 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                  Total
                </th>
                <th className="h-12 w-12 px-1 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                  <span className="sr-only">Claim controls</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {fantasyData.map((entry, index) => (
                <FantasyRow
                  key={entry.entry_id ?? `${entry.fid}-${index}`}
                  entry={entry}
                  onClaimClick={handleClaimClick}
                  onReleaseClick={(selected, claim) => setReleaseTarget({ entry: selected, claim })}
                  claim={claimsByEntry[String(entry.entry_id)] ?? null}
                  claimDisabled={activeClaimEntryId !== null}
                  currentUserFid={currentUserFid}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <div>No fantasy data available.</div>
        )}
        {claimEntry && (
          <FplClaimPanel
            entry={claimEntry}
            getAuthorizationHeaders={getAuthorizationHeaders}
            onClose={() => setClaimEntry(null)}
            onClaimed={(claim) => {
              setActiveClaimEntryId(claim.entryId);
              setClaimsByEntry((current) => ({ ...current, [String(claim.entryId)]: claim }));
            }}
          />
        )}
        {releaseTarget && (
          <FplClaimReleaseModal
            entry={releaseTarget.entry}
            claim={releaseTarget.claim}
            getAuthorizationHeaders={getAuthorizationHeaders}
            onClose={() => setReleaseTarget(null)}
            onReleased={(entryId) => {
              setActiveClaimEntryId(null);
              setClaimsByEntry((current) => {
                const next = { ...current };
                delete next[String(entryId)];
                return next;
              });
            }}
          />
        )}
      </div>
  );
};

export default ContestFCFantasy;
