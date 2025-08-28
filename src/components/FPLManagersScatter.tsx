'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import { sdk } from '@farcaster/miniapp-sdk';

interface ManagerPoint {
  x: number; // transfers
  y: number; // gw points
  label: string; // username or team_name
  fid: number;
  entry_id: number;
  color: string;
  bucket?: string; // '1-50','51-100','101-150','151+'
  pfp_url?: string | null;
  overall_rank?: number | null;
  username?: string | null;
  rank?: number | null; // league rank
}

const FPLManagersScatter: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<ManagerPoint[]>([]);
  const [showNames, setShowNames] = useState(false);
  const [showPfps, setShowPfps] = useState(false);
  const [visibleBuckets, setVisibleBuckets] = useState<Set<string>>(new Set(['1-50','51-100','101-150','151+']));

  useEffect(() => {
    let cancelled = false;

    function colorFor(fid: number) {
      // Deterministic HSL color per manager based on fid
      const h = (fid * 137.508) % 360; // golden angle
      const s = 65;
      const l = 55;
      return `hsl(${Math.round(h)}, ${s}%, ${l}%)`;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/managers-gw-summary');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        interface ManagerSummaryPayload {
          event_transfers?: number;
          points?: number;
          username?: string | null;
          team_name?: string;
          fid: number;
          entry_id: number;
          bucket?: string;
          pfp_url?: string | null;
          overall_rank?: number | null;
          rank?: number | null;
        }

        const list: ManagerSummaryPayload[] = Array.isArray(data?.managers) ? (data.managers as ManagerSummaryPayload[]) : [];
        const pts: ManagerPoint[] = list.map((m) => {
          const uname = typeof m.username === 'string' ? m.username : '';
          const labelFallback = typeof m.team_name === 'string' ? m.team_name : String(m.fid ?? '');
          return {
            x: Number(m.event_transfers ?? 0),
            y: Number(m.points ?? 0),
            label: uname ? `@${uname}` : String(labelFallback),
            fid: Number(m.fid),
            entry_id: Number(m.entry_id),
            color: colorFor(Number(m.fid)),
            bucket: String(m.bucket || '151+'),
            pfp_url: m.pfp_url || null,
            overall_rank: typeof m.overall_rank === 'number' ? m.overall_rank : null,
            username: uname || null,
            rank: typeof m.rank === 'number' ? m.rank : null,
          };
        });
        if (cancelled) return;
        setPoints(pts);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load managers');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (chartRef.current) chartRef.current.destroy();
    };
  }, []);

  useEffect(() => {
    if (loading || error) return;
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const filtered = points.filter(p => !p.bucket || visibleBuckets.has(p.bucket));

    chartRef.current = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Managers',
            data: filtered.map(p => ({ x: p.x, y: p.y, manager: p, _c: p.color } as { x: number; y: number; manager: ManagerPoint; _c: string })),
            backgroundColor: (ctx) => (typeof (ctx.raw as { _c?: string } | undefined)?._c === 'string' ? (ctx.raw as { _c?: string })._c! : 'rgba(192,178,240,0.8)'),
            borderColor: (ctx) => (typeof (ctx.raw as { _c?: string } | undefined)?._c === 'string' ? (ctx.raw as { _c?: string })._c! : 'rgba(192,178,240,1)'),
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
              const anyCtx = ctx as unknown as { chart: Chart; tooltip: { opacity: number; dataPoints?: Array<{ raw?: unknown }>; caretX: number; caretY: number } };
              const { chart, tooltip } = anyCtx;
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
                parentNode.appendChild(el);
              }
              if (tooltip.opacity === 0) {
                el.style.opacity = '0';
                return;
              }
              const raw = (tooltip.dataPoints && tooltip.dataPoints[0] ? tooltip.dataPoints[0].raw : undefined) as { manager?: ManagerPoint } | undefined;
              const m = raw && raw.manager ? raw.manager : undefined;
              const title = m?.label || 'Manager';
              const lines = [
                `Transfers: ${m?.x ?? ''}`,
                `GW Points: ${m?.y ?? ''}`,
                ...(m?.rank ? [`League Rank: ${m.rank}`] : []),
              ];
              el.innerHTML = `<div style="color:#FEA282;font-weight:600;margin-bottom:4px">${title}</div>` +
                             lines.map(l => `<div>${l}</div>`).join('');
              const { offsetLeft: left, offsetTop: top } = chart.canvas;
              (el as HTMLDivElement).style.opacity = '1';
              (el as HTMLDivElement).style.left = left + tooltip.caretX + 12 + 'px';
              (el as HTMLDivElement).style.top = top + tooltip.caretY + 12 + 'px';
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Transfers (this GW)', color: '#C0B2F0' },
            grid: { color: 'rgba(162, 230, 52, 0.1)' },
            ticks: { color: '#C0B2F0' }
          },
          y: {
            title: { display: true, text: 'GW Points', color: '#C0B2F0' },
            grid: { color: 'rgba(162, 230, 52, 0.1)' },
            ticks: { color: '#C0B2F0' }
          }
        }
      }
    });
    // Overlay labels and PFPs similar to player chart
    const updateOverlays = () => {
      const chart = chartRef.current;
      const parent = canvasRef.current?.parentElement;
      if (!chart || !parent) return;
      parent.querySelectorAll('.mgr-label, .mgr-pfp').forEach(n => n.remove());
      if (!showNames && !showPfps) return;
      const chartAny = chart as unknown as { chartArea: { left: number; top: number; width: number; height: number }; scales: { x: { min: number; max: number }; y: { min: number; max: number } } };
      const chartArea = chartAny.chartArea;
      const xScale = chartAny.scales.x; // linear scale
      const yScale = chartAny.scales.y;
      const ds = chart.data.datasets[0];
      // Helper to get/create the external tooltip element
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
          // Do not set title to avoid native browser tooltip
          // Show tooltip on hover over PFP (so tooltips work even when PFP overlays block canvas events)
          img.onmouseenter = () => {
            const el = getTooltipEl();
            const lines = [
              `<div style="color:#FEA282;font-weight:600;margin-bottom:4px">${m.label}</div>`,
              `<div>Transfers: ${m.x}</div>`,
              `<div>GW Points: ${m.y}</div>`,
              ...(m.rank ? [`<div>League Rank: ${m.rank}</div>`] : []),
            ];
            el.innerHTML = lines.join('');
            el.style.left = (x + 12) + 'px';
            el.style.top = (y + 12) + 'px';
            el.style.opacity = '1';
          };
          img.onmouseleave = () => {
            const el = parent.querySelector('.ext-tooltip') as HTMLDivElement | null;
            if (el) el.style.opacity = '0';
          };
          img.onclick = async () => {
            try {
              await sdk.actions.viewProfile({ fid: m.fid });
            } catch {
              const url = m.username
                ? `https://warpcast.com/${m.username}`
                : `https://warpcast.com/~/profiles/${m.fid}`;
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

    return () => {
      ro.disconnect();
      parentEl?.querySelectorAll('.mgr-label, .mgr-pfp').forEach(n => n.remove());
    };
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
        <h1 className="text-xl font-light text-notWhite mb-2">Manager Activity</h1>
        <p className="text-sm opacity-90">Transfers vs GW Points (current)</p>
      </div>
      <div className="p-4 relative" style={{ height: '400px' }}>
        <canvas ref={canvasRef} />
      </div>
      {/* Range Filters (styled like Player Analysis legend) */}
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
              <div
                className={`w-5 h-5 rounded-full transition-all ${active ? 'ring-2 ring-white' : ''}`}
                style={{ backgroundColor: '#C0B2F0' }}
              />
              <span className={active ? 'text-white font-semibold text-sm' : 'text-lightPurple text-sm'}>
                {bucket}
              </span>
            </div>
          );
        })}
      </div>
      {/* Controls (match Player Analysis) */}
      <div className={`flex justify-center gap-4 p-4 bg-deepPurple border-t border-limeGreenOpacity`}>
        <button
          onClick={() => setShowNames(!showNames)}
          className={`px-4 py-2 rounded border transition-all ${
            showNames
              ? 'bg-deepPink text-white border-fontRed'
              : 'bg-darkPurple text-lightPurple border-limeGreenOpacity hover:bg-deepPink opacity-50'
          }`}
        >
          Show Usernames
        </button>
        <button
          onClick={() => setShowPfps(!showPfps)}
          className={`px-4 py-2 rounded border transition-all ${
            showPfps
              ? 'bg-deepPink text-white border-fontRed'
              : 'bg-darkPurple text-lightPurple border-limeGreenOpacity hover:bg-deepPink opacity-50'
          }`}
        >
          Show PFPs
        </button>
      </div>
    </div>
  );
};

export default FPLManagersScatter;
