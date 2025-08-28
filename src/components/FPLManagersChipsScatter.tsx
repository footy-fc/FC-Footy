'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import { sdk } from '@farcaster/miniapp-sdk';
import { isProduction } from '~/constants/points';

interface ManagerPoint {
  x: number; // free transfers bucket (1 or 2) with jitter
  y: number; // has triple captain remaining (0/1) with jitter
  label: string; // username or team name
  fid: number;
  entry_id: number;
  color: string;
  bucket?: string; // rank bucket '1-50','51-100','101-150','151+'
  pfp_url?: string | null;
  overall_rank?: number | null;
  username?: string | null;
  rank?: number | null; // league rank
  meta?: { ft_bucket?: number; has_3xc_remaining?: boolean; ft_remaining?: number };
}

// Raw point shape stored in the Chart.js dataset
type RawPoint = { x: number; y: number; manager: ManagerPoint; _c: string };

function seededUniform(seed: number, offset: number = 0) {
  const x = Math.sin(seed * 9301 + offset * 49297) * 233280;
  return x - Math.floor(x); // [0,1)
}

function getQuadrantBounds(ftBucket: number, has3xc: boolean) {
  // Use full axis halves as quadrants, not just [1,2] x [0,1]
  const X_MIN = 0.1, X_MAX = 2.9, X_MID = 1.5;
  const Y_MIN = -0.6, Y_MAX = 1.6, Y_MID = 0.5;
  const padFrac = 0.04; // small inner padding within each quadrant
  const xQMin = ftBucket === 2 ? X_MID : X_MIN;
  const xQMax = ftBucket === 2 ? X_MAX : X_MID;
  const yQMin = has3xc ? Y_MID : Y_MIN;
  const yQMax = has3xc ? Y_MAX : Y_MID;
  const xPad = (xQMax - xQMin) * padFrac;
  const yPad = (yQMax - yQMin) * padFrac;
  const xMin = xQMin + xPad;
  const xMax = xQMax - xPad;
  const yMin = yQMin + yPad;
  const yMax = yQMax - yPad;
  return { xMin, xMax, yMin, yMax };
}

const FPLManagersChipsScatter: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<ManagerPoint[]>([]);
  const [showNames, setShowNames] = useState(false);
  const [showPfps, setShowPfps] = useState(false);
  const [visibleBuckets, setVisibleBuckets] = useState<Set<string>>(new Set(['1-50','51-100','101-150','151+']));
  const [apiGameweek, setApiGameweek] = useState<number | null>(null);

  const fetchUrl = useMemo(() => '/api/managers-gw-summary', []);

  useEffect(() => {
    let cancelled = false;

    function colorFor(fid: number) {
      const h = (fid * 137.508) % 360;
      const s = 65; const l = 55;
      return `hsl(${Math.round(h)}, ${s}%, ${l}%)`;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const gw = typeof data?.gameweek === 'number' ? data.gameweek : null;
        setApiGameweek(gw);
        interface ManagerApiRow {
          entry_id?: number;
          fid?: number;
          team_name?: string;
          username?: string | null;
          bucket?: string;
          pfp_url?: string | null;
          overall_rank?: number | null;
          rank?: number | null;
          ft_bucket?: number;
          ft_bucket_next?: number;
          ft_remaining?: number;
          has_3xc_remaining?: boolean;
        }
        const list: ManagerApiRow[] = Array.isArray(data?.managers) ? (data.managers as ManagerApiRow[]) : [];
        // Build base items with quadrant and seed
        type BaseItem = {
          uname: string;
          labelFallback: string;
          ftBucket: number;
          ftRemaining?: number;
          has3xc: boolean;
          seed: number;
          m: ManagerApiRow;
        };
        const base: BaseItem[] = list.map((m) => ({
          uname: typeof m.username === 'string' ? m.username : '',
          labelFallback: typeof m.team_name === 'string' ? m.team_name : String(m.fid ?? ''),
          ftBucket: Number(m.ft_bucket_next ?? m.ft_bucket ?? 1),
          ftRemaining: typeof m.ft_remaining === 'number' ? m.ft_remaining : undefined,
          has3xc: Boolean(m.has_3xc_remaining),
          seed: Number(m.fid || m.entry_id || 1),
          m,
        }));

        // Group items by quadrant key
        const groups = new Map<string, BaseItem[]>();
        for (const it of base) {
          const key = `${it.ftBucket}-${it.has3xc ? 1 : 0}`;
          const arr = groups.get(key) || [];
          arr.push(it);
          groups.set(key, arr);
        }

        // Place items in grid per quadrant with uniform random inside each cell
        const pts: ManagerPoint[] = [];
        for (const [key, arr] of groups) {
          // Stable order
          arr.sort((a, b) => a.seed - b.seed);
          const [ftStr, yStr] = key.split('-');
          const ftBucket = Number(ftStr);
          const has3xc = yStr === '1';
          const { xMin, xMax, yMin, yMax } = getQuadrantBounds(ftBucket, has3xc);
          const count = arr.length;
          const cols = Math.ceil(Math.sqrt(count));
          const rows = Math.ceil(count / cols);
          const cellW = (xMax - xMin) / cols;
          const cellH = (yMax - yMin) / rows;
          const marginFrac = 0.08; // margin inside each cell
          arr.forEach((it, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cellLeft = xMin + col * cellW;
            const cellTop = yMin + row * cellH;
            const innerLeft = cellLeft + marginFrac * cellW;
            const innerRight = cellLeft + cellW - marginFrac * cellW;
            const innerTop = cellTop + marginFrac * cellH;
            const innerBottom = cellTop + cellH - marginFrac * cellH;
            const uX = seededUniform(it.seed, 333);
            const uY = seededUniform(it.seed, 444);
            const x = innerLeft + uX * (innerRight - innerLeft);
            const y = innerTop + uY * (innerBottom - innerTop);
            const m = it.m;
            pts.push({
              x,
              y,
              label: it.uname ? `@${it.uname}` : String(it.labelFallback),
              fid: Number(m.fid),
              entry_id: Number(m.entry_id),
              color: colorFor(Number(m.fid)),
              bucket: String(m.bucket || '151+'),
              pfp_url: m.pfp_url || null,
              overall_rank: typeof m.overall_rank === 'number' ? m.overall_rank : null,
              username: it.uname || null,
              rank: typeof m.rank === 'number' ? m.rank : null,
              meta: { ft_bucket: it.ftBucket, has_3xc_remaining: it.has3xc, ft_remaining: it.ftRemaining }
            });
          });
        }
        if (cancelled) return;
        setPoints(pts);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load managers');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; if (chartRef.current) chartRef.current.destroy(); };
  }, [fetchUrl]);

  // Temporary refresh to bypass cache and rebuild points
  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${fetchUrl}?refresh=true&_t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const gw = typeof data?.gameweek === 'number' ? data.gameweek : null;
      setApiGameweek(gw);
      // Local types and helpers
      interface ManagerApiRow {
        entry_id?: number; fid?: number; team_name?: string; username?: string | null; bucket?: string; pfp_url?: string | null; overall_rank?: number | null; rank?: number | null; ft_bucket?: number; ft_bucket_next?: number; ft_remaining?: number; has_3xc_remaining?: boolean;
      }
      const colorFor = (fid: number) => {
        const h = (fid * 137.508) % 360; const s = 65; const l = 55; return `hsl(${Math.round(h)}, ${s}%, ${l}%)`;
      };
      const list: ManagerApiRow[] = Array.isArray(data?.managers) ? (data.managers as ManagerApiRow[]) : [];
      // Grouping and placement (same as initial load)
      type BaseItem = { uname: string; labelFallback: string; ftBucket: number; ftRemaining?: number; has3xc: boolean; seed: number; m: ManagerApiRow };
      const base: BaseItem[] = list.map((m) => ({
        uname: typeof m.username === 'string' ? m.username : '',
        labelFallback: typeof m.team_name === 'string' ? m.team_name : String(m.fid ?? ''),
        ftBucket: Number(m.ft_bucket_next ?? m.ft_bucket ?? 1),
        ftRemaining: typeof m.ft_remaining === 'number' ? m.ft_remaining : undefined,
        has3xc: Boolean(m.has_3xc_remaining),
        seed: Number(m.fid || m.entry_id || 1),
        m,
      }));
      const groups = new Map<string, BaseItem[]>();
      for (const it of base) {
        const key = `${it.ftBucket}-${it.has3xc ? 1 : 0}`;
        const arr = groups.get(key) || [];
        arr.push(it);
        groups.set(key, arr);
      }
      const pts: ManagerPoint[] = [];
      for (const [key, arr] of groups) {
        arr.sort((a, b) => a.seed - b.seed);
        const [ftStr, yStr] = key.split('-');
        const ftBucket = Number(ftStr);
        const has3xc = yStr === '1';
        const { xMin, xMax, yMin, yMax } = getQuadrantBounds(ftBucket, has3xc);
        const count = arr.length;
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        const cellW = (xMax - xMin) / cols;
        const cellH = (yMax - yMin) / rows;
        const marginFrac = 0.05;
        arr.forEach((it, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cellLeft = xMin + col * cellW;
          const cellTop = yMin + row * cellH;
          const innerLeft = cellLeft + marginFrac * cellW;
          const innerRight = cellLeft + cellW - marginFrac * cellW;
          const innerTop = cellTop + marginFrac * cellH;
          const innerBottom = cellTop + cellH - marginFrac * cellH;
          const uX = seededUniform(it.seed, 333);
          const uY = seededUniform(it.seed, 444);
          const x = innerLeft + uX * (innerRight - innerLeft);
          const y = innerTop + uY * (innerBottom - innerTop);
          const m = it.m;
          pts.push({
            x,
            y,
            label: it.uname ? `@${it.uname}` : String(it.labelFallback),
            fid: Number(m.fid),
            entry_id: Number(m.entry_id),
            color: colorFor(Number(m.fid)),
            bucket: String(m.bucket || '151+'),
            pfp_url: m.pfp_url || null,
            overall_rank: typeof m.overall_rank === 'number' ? m.overall_rank : null,
            username: it.uname || null,
            rank: typeof m.rank === 'number' ? m.rank : null,
            meta: { ft_bucket: it.ftBucket, has_3xc_remaining: it.has3xc, ft_remaining: it.ftRemaining }
          });
        });
      }
      setPoints(pts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh managers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading || error) return;
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const filtered = points.filter(p => !p.bucket || visibleBuckets.has(p.bucket));

    const quadrantDividers = {
      id: 'quadrantDividers',
      afterDraw: (c: Chart) => {
        const chartArea = c.chartArea;
        if (!chartArea) return;
        const { left, right, top, bottom } = chartArea;
        const xScale = c.scales.x;
        const yScale = c.scales.y;
        const vX = xScale.getPixelForValue(1.5);
        const hY = yScale.getPixelForValue(0.5);
        const ctx2 = c.ctx as CanvasRenderingContext2D;
        ctx2.save();
        ctx2.setLineDash([6, 4]);
        ctx2.lineWidth = 2.5;
        ctx2.strokeStyle = '#C0B2F0'; // pronounced divider color
        // vertical divider between 1 FT and 2 FTs
        ctx2.beginPath();
        ctx2.moveTo(vX, top);
        ctx2.lineTo(vX, bottom);
        ctx2.stroke();
        // horizontal divider between No and Yes 3xC
        ctx2.beginPath();
        ctx2.moveTo(left, hY);
        ctx2.lineTo(right, hY);
        ctx2.stroke();
        ctx2.restore();
      }
    } as const;

    chartRef.current = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Managers',
            data: filtered.map(p => ({ x: p.x, y: p.y, manager: p, _c: p.color } as RawPoint)),
            backgroundColor: (ctx) => {
              const raw = ctx.raw as RawPoint | undefined;
              return raw && raw._c ? raw._c : 'rgba(192,178,240,0.8)';
            },
            borderColor: (ctx) => {
              const raw = ctx.raw as RawPoint | undefined;
              return raw && raw._c ? raw._c : 'rgba(192,178,240,1)';
            },
            pointRadius: showPfps ? 0 : 4,
            pointHoverRadius: showPfps ? 0 : 6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: (ctx) => {
              type RawPoint = { x: number; y: number; manager: ManagerPoint; _c: string };
              type ExternalTooltipContext = { chart: Chart; tooltip: { opacity: number; dataPoints?: Array<{ raw?: RawPoint }>; caretX: number; caretY: number } };
              const { chart, tooltip } = (ctx as unknown as ExternalTooltipContext);
              const parentNode = chart.canvas.parentNode as HTMLElement | null;
              if (!parentNode) return;
              let el = parentNode.querySelector('.ext-tooltip') as HTMLDivElement | null;
              if (!el) {
                el = document.createElement('div');
                el.className = 'ext-tooltip';
                el.style.position = 'absolute';
                el.style.background = '#181424';
                el.style.border = '1px solid rgba(162,230,52,0.3)';
                el.style.borderRadius = '8px';
                el.style.color = '#C0B2F0';
                el.style.padding = '6px 8px';
                el.style.pointerEvents = 'none';
                el.style.whiteSpace = 'nowrap';
                el.style.zIndex = '9999';
                el.style.textAlign = 'center';
                parentNode.appendChild(el);
              }
              if (tooltip.opacity === 0) { el.style.opacity = '0'; return; }
              const raw = (tooltip.dataPoints && tooltip.dataPoints[0] ? tooltip.dataPoints[0].raw : undefined) as { manager?: ManagerPoint } | undefined;
              const m = raw?.manager;
              const title = m?.label || 'Manager';
              const ftText = m?.meta?.ft_bucket === 2 ? '2' : '1';
              const threeXC = m?.meta?.has_3xc_remaining ? 'Yes' : 'No';
              const lines = [
                `Free Transfers: ${ftText}`,
                `3xC Available: ${threeXC}`,
                ...(m?.rank ? [`League Rank: ${m.rank}`] : []),
              ];
              el.innerHTML = `<div style="color:#FEA282;font-weight:600;margin-bottom:4px">${title}</div>` +
                             lines.map(l => `<div>${l}</div>`).join('');
              const { offsetLeft: left, offsetTop: top } = chart.canvas;
              (el as HTMLDivElement).style.opacity = '1';
              // Center horizontally under the caret, and place just below the point
              (el as HTMLDivElement).style.left = left + tooltip.caretX + 'px';
              (el as HTMLDivElement).style.transform = 'translateX(-50%)';
              (el as HTMLDivElement).style.top = top + tooltip.caretY + 10 + 'px';
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Free Transfers', color: '#C0B2F0' },
            min: 0.1, max: 2.9,
            grid: { color: 'rgba(162, 230, 52, 0.1)' },
            ticks: {
              color: '#C0B2F0',
              callback: (val: number | string) => {
                const v = Number(val);
                if (Math.abs(v - 1) < 0.001) return '1 FT';
                if (Math.abs(v - 2) < 0.001) return '2 FTs';
                return '';
              }
            }
          },
          y: {
            title: { display: true, text: 'Triple Captain Available', color: '#C0B2F0' },
            min: -0.6, max: 1.6,
            grid: { color: 'rgba(162, 230, 52, 0.1)' },
            ticks: {
              color: '#C0B2F0',
              callback: (val: number | string) => (Number(val) === 1 ? 'Yes' : Number(val) === 0 ? 'No' : '')
            }
          }
        }
      },
      plugins: [quadrantDividers]
    });

    const updateOverlays = () => {
      const chart = chartRef.current; const parent = canvasRef.current?.parentElement; if (!chart || !parent) return;
      parent.querySelectorAll('.mgr-label, .mgr-pfp').forEach(n => n.remove());
      if (!showNames && !showPfps) return;
      const chartAny = chart as unknown as { chartArea: { left: number; top: number; width: number; height: number }; scales: { x: { min: number; max: number }; y: { min: number; max: number } } };
      const chartArea = chartAny.chartArea; const xScale = chartAny.scales.x; const yScale = chartAny.scales.y;
      const ds = chart.data.datasets[0];
      const getTooltipEl = () => {
        let el = parent.querySelector('.ext-tooltip') as HTMLDivElement | null;
        if (!el) {
          el = document.createElement('div');
          el.className = 'ext-tooltip';
          el.style.position = 'absolute';
          el.style.background = '#181424';
          el.style.border = '1px solid rgba(162,230,52,0.3)';
          el.style.borderRadius = '8px';
          el.style.color = '#C0B2F0';
          el.style.padding = '6px 8px';
          el.style.pointerEvents = 'none';
          el.style.whiteSpace = 'nowrap';
          el.style.zIndex = '9999';
          el.style.opacity = '0';
          parent.appendChild(el);
        }
        return el;
      };

      (ds.data as Array<{ x: number; y: number; manager: ManagerPoint }>).forEach((raw) => {
        const m = raw.manager;
        const x = chartArea.left + (raw.x - xScale.min) / (xScale.max - xScale.min) * chartArea.width;
        const y = chartArea.top + (yScale.max - raw.y) / (yScale.max - yScale.min) * chartArea.height;
        if (showNames) {
          const el = document.createElement('div');
          el.className = 'mgr-label';
          el.textContent = m.label;
          el.style.cssText = 'position:absolute;font-size:10px;color:white;background:rgba(0,0,0,0.7);padding:2px 4px;border-radius:3px;pointer-events:none;z-index:10;white-space:nowrap;max-width:100px;overflow:hidden;text-overflow:ellipsis;';
          el.style.left = (x + 8) + 'px';
          el.style.top = (y + 8) + 'px';
          parent.appendChild(el);
        }
        if (showPfps && m.pfp_url) {
          const img = document.createElement('img');
          img.className = 'mgr-pfp';
          img.src = m.pfp_url;
          img.alt = m.label;
          img.style.cssText = 'position:absolute;width:16px;height:16px;border-radius:9999px;border:1px solid rgba(255,255,255,0.6);z-index:10;pointer-events:auto;cursor:pointer;object-fit:cover;background:#222;';
          img.style.left = (x - 8) + 'px';
          img.style.top = (y - 8) + 'px';
          img.onmouseenter = () => {
            const el = getTooltipEl();
            const ftText = m?.meta?.ft_bucket === 2 ? '2' : '1';
            const threeXC = m?.meta?.has_3xc_remaining ? 'Yes' : 'No';
            const lines = [
              `<div style=\"color:#FEA282;font-weight:600;margin-bottom:4px\">${m.label}</div>`,
              `<div>Free Transfers: ${ftText}</div>`,
              `<div>3xC Available: ${threeXC}</div>`,
              ...(m.rank ? [`<div>League Rank: ${m.rank}</div>`] : []),
            ];
            el.innerHTML = lines.join('');
            // Center below the point
            el.style.left = x + 'px';
            el.style.transform = 'translateX(-50%)';
            el.style.top = (y + 10) + 'px';
            el.style.opacity = '1';
          };
          img.onmouseleave = () => {
            const el = parent.querySelector('.ext-tooltip') as HTMLDivElement | null;
            if (el) el.style.opacity = '0';
          };
          img.onclick = async () => {
            try { await sdk.actions.viewProfile({ fid: m.fid }); }
            catch {
              const url = m.username ? `https://warpcast.com/${m.username}` : `https://warpcast.com/~/profiles/${m.fid}`;
              try { await sdk.actions.openUrl(url); } catch {}
            }
          };
          parent.appendChild(img);
        }
      });
    };

    chartRef.current.update('none');
    setTimeout(updateOverlays, 0);
    const ro = new ResizeObserver(() => setTimeout(updateOverlays, 0));
    const parentEl = canvasRef.current.parentElement!;
    ro.observe(parentEl);
    return () => { ro.disconnect(); parentEl?.querySelectorAll('.mgr-label, .mgr-pfp').forEach(n => n.remove()); };
  }, [points, loading, error, visibleBuckets, showNames, showPfps]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lightPurple">Loading manager data…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-fontRed">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-darkPurple rounded-lg overflow-hidden border border-limeGreenOpacity">
      <div className="bg-deepPurple p-2 text-center border-b border-limeGreenOpacity">
        <h1 className="text-xl font-light text-notWhite mb-1">Manager Readiness {typeof apiGameweek === 'number' ? ` for GW${apiGameweek + 1}` : ' for GW'}</h1>
        <p className="text-sm opacity-90">Triple Captain Availability vs Free Transfers</p>
      </div>
      <div className="p-4 relative" style={{ height: '400px' }}>
        <canvas ref={canvasRef} />
      </div>
      {/* Rank Filters */}
      <div className="grid grid-cols-2 gap-2 p-4 bg-deepPurple border-t border-limeGreenOpacity">
        {['1-50','51-100','101-150','151+'].map(bucket => {
          const active = visibleBuckets.has(bucket);
          return (
            <div
              key={bucket}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                active ? 'bg-deepPink border border-fontRed' : 'hover:bg-deepPink opacity-50'
              }`}
              onClick={() => {
                const next = new Set(visibleBuckets);
                if (active) next.delete(bucket); else next.add(bucket);
                setVisibleBuckets(next);
              }}
            >
              <div className={`w-5 h-5 rounded-full transition-all ${active ? 'ring-2 ring-white' : ''}`} style={{ backgroundColor: '#C0B2F0' }} />
              <span className={active ? 'text-white font-semibold text-sm' : 'text-lightPurple text-sm'}>{bucket}</span>
            </div>
          );
        })}
      </div>
      {/* Controls */}
      <div className={`flex justify-center gap-4 p-4 bg-deepPurple border-t border-limeGreenOpacity`}>
        <button
          onClick={() => setShowNames(!showNames)}
          className={`px-4 py-2 rounded border transition-all ${
            showNames ? 'bg-deepPink text-white border-fontRed' : 'bg-darkPurple text-lightPurple border-limeGreenOpacity hover:bg-deepPink opacity-50'
          }`}
        >
          Show Usernames
        </button>
        <button
          onClick={() => setShowPfps(!showPfps)}
          className={`px-4 py-2 rounded border transition-all ${
            showPfps ? 'bg-deepPink text-white border-fontRed' : 'bg-darkPurple text-lightPurple border-limeGreenOpacity hover:bg-deepPink opacity-50'
          }`}
        >
          Show PFPs
        </button>
        {!isProduction && (
          <button
            onClick={refreshData}
            disabled={loading}
            className={`px-4 py-2 rounded border transition-all ${
              loading ? 'bg-darkPurple text-gray-400 border-limeGreenOpacity opacity-60' : 'bg-darkPurple text-lightPurple border-limeGreenOpacity hover:bg-deepPink'
            }`}
          >
            {loading ? 'Refreshing…' : 'Refresh Data'}
          </button>
        )}
      </div>
    </div>
  );
};

export default FPLManagersChipsScatter;
