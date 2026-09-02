/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, RefreshCw, Trophy } from 'lucide-react';
import FantasyRow from './ContestFantasyRow';
import { fetchFantasyData, FantasyEntry } from './utils/fetchFantasyData';
import FplClaimPanel from './FplClaimPanel';
import FplClaimReleaseModal from './FplClaimReleaseModal';
import { useFootyFarcaster } from '~/lib/farcaster/useFootyFarcaster';
import type { FplClaimSummary } from '~/lib/fplClaimConstants';

const PAGE_SIZE = 50;

const ContestFCFantasy = () => {
  const [fantasyData, setFantasyData] = useState<FantasyEntry[]>([]);
  const [loadingFantasy, setLoadingFantasy] = useState(false);
  const [errorFantasy, setErrorFantasy] = useState<string | null>(null);
  const [claimEntry, setClaimEntry] = useState<FantasyEntry | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<{ entry: FantasyEntry; claim: FplClaimSummary } | null>(null);
  const [activeClaimEntryId, setActiveClaimEntryId] = useState<number | null>(null);
  const [claimsByEntry, setClaimsByEntry] = useState<Record<string, FplClaimSummary>>({});
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
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

  const fetchData = useCallback(async () => {
    setLoadingFantasy(true);
    setErrorFantasy(null);
    try {
      const data = await fetchFantasyData({ includeFavoriteTeams: false });
      const rankedData = data.map((item, i) => ({
        ...item,
        rank: item.rank ?? i + 1,
      }));
      setFantasyData(rankedData);
      setVisibleCount(PAGE_SIZE);
    } catch (error) {
      setErrorFantasy(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoadingFantasy(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleClaimClick = (selected: FantasyEntry) => {
    setClaimEntry(selected);
  };

  return (
      <div>
        {loadingFantasy ? (
          <div aria-label="Loading fantasy league standings" className="space-y-2">
            <div className="mb-3 h-20 animate-pulse rounded-[18px] bg-darkPurple/65" />
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[74px] animate-pulse rounded-[18px] bg-darkPurple/55" />
            ))}
          </div>
        ) : errorFantasy ? (
          <div className="rounded-[18px] border border-[#fea282]/25 bg-darkPurple/55 px-4 py-6 text-center">
            <RefreshCw className="mx-auto h-6 w-6 text-deepPink" aria-hidden="true" />
            <div className="mt-3 text-sm font-semibold text-notWhite">Standings are unavailable</div>
            <p className="mt-1 text-xs leading-5 text-lightPurple/70">{errorFantasy}</p>
            <button type="button" onClick={() => void fetchData()} className="mt-3 rounded-full border border-deepPink/30 px-4 py-2 text-xs font-semibold text-deepPink">
              Try again
            </button>
          </div>
        ) : fantasyData.length > 0 ? (
          <>
            <section className="mb-3 flex items-center gap-3 rounded-[18px] border border-lightPurple/12 bg-darkPurple/65 px-4 py-4" aria-label="Fantasy league summary">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-deepPink/15 text-deepPink">
                <Trophy className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="app-card-title truncate">FC Fantasy League</div>
                <div className="app-micro mt-1">Live FPL standings</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold leading-none text-notWhite">{fantasyData.length}</div>
                <div className="app-micro mt-1">managers</div>
              </div>
            </section>

            <div className="mb-2 grid grid-cols-[34px_minmax(0,1fr)_46px_52px_32px] items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-lightPurple/55" aria-hidden="true">
              <span className="text-center">#</span>
              <span>Manager</span>
              <span className="text-right">GW</span>
              <span className="text-right">Total</span>
              <span />
            </div>

            <div className="space-y-2" role="list" aria-label="Fantasy league standings">
              {fantasyData.slice(0, visibleCount).map((entry, index) => (
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
            </div>

            {visibleCount < fantasyData.length ? (
              <button
                type="button"
                onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, fantasyData.length))}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[16px] border border-lightPurple/14 bg-darkPurple/35 px-4 py-3 text-xs font-semibold text-lightPurple transition-colors hover:border-deepPink/30 hover:text-notWhite"
              >
                Show managers {visibleCount + 1}–{Math.min(visibleCount + PAGE_SIZE, fantasyData.length)}
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <p className="app-micro mt-4 text-center">All {fantasyData.length} managers shown</p>
            )}
          </>
        ) : (
          <div className="rounded-[18px] border border-dashed border-lightPurple/20 bg-darkPurple/45 px-4 py-7 text-center">
            <Trophy className="mx-auto h-6 w-6 text-deepPink" aria-hidden="true" />
            <div className="mt-3 text-sm font-semibold text-notWhite">The league is waiting to kick off</div>
            <p className="mt-1 text-xs leading-5 text-lightPurple/70">Standings will appear as soon as FPL publishes the league table.</p>
          </div>
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
