'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  mockStartups, evaluateStartup, buildForecast, industries, stages, revenueModels,
  type Startup, type Pillar, type StartupInput,
} from '@/lib/mock-data';
import { extractFromFile, type ExtractedFields } from '@/lib/extract';
import {
  LayoutDashboard, Rows3, BookOpen, Search, ChevronRight, ChevronDown,
  Download, Play, ArrowLeft, ArrowUpRight, CircleCheck, TriangleAlert, CircleX,
  Plus, X, Upload, FileDown, TrendingUp, Sparkles, Gauge, ArrowRight, Check,
  FileText, Loader2,
} from 'lucide-react';

type View = 'overview' | 'apps' | 'methodology';
type Filter = 'all' | 'high' | 'moderate' | 'low';

const VERDICT = {
  high: { label: 'Pursue', text: 'text-good', bg: 'bg-good', soft: 'bg-good-soft', hex: '#187a3f' },
  moderate: { label: 'Review', text: 'text-warn', bg: 'bg-warn', soft: 'bg-warn-soft', hex: '#9a6407' },
  low: { label: 'Pass', text: 'text-bad', bg: 'bg-bad', soft: 'bg-bad-soft', hex: '#b23325' },
} as const;

const fmtMoney = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v > 0 ? `$${(v / 1000).toFixed(0)}K` : '—';
const fmtMoney0 = (v: number) => (v > 0 ? fmtMoney(v) : '$0');

type Counts = { all: number; high: number; moderate: number; low: number };
const countVerdicts = (data: Startup[]): Counts => ({
  all: data.length,
  high: data.filter((s) => s.verdict === 'high').length,
  moderate: data.filter((s) => s.verdict === 'moderate').length,
  low: data.filter((s) => s.verdict === 'low').length,
});

/* ---------- shared primitives ---------- */

function VerdictChip({ verdict, size = 'sm' }: { verdict: Startup['verdict']; size?: 'sm' | 'md' }) {
  const v = VERDICT[verdict];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${v.soft} ${v.text} ${
        size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${v.bg}`} />
      {v.label}
    </span>
  );
}

function ScoreRing({ score, verdict, size = 56 }: { score: number; verdict: Startup['verdict']; size?: number }) {
  const v = VERDICT[verdict];
  return (
    <div
      className="rounded-full grid place-items-center shrink-0"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${v.hex} ${score * 3.6}deg, var(--tint) 0deg)`,
      }}
      role="img"
      aria-label={`Score ${score} out of 100`}
    >
      <div
        className="rounded-full bg-pane grid place-items-center font-mono font-semibold"
        style={{ width: size - 12, height: size - 12, fontSize: size / 3.2 }}
      >
        {score}
      </div>
    </div>
  );
}

function Card({ title, aside, children, className = '' }: {
  title?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-pane border border-line rounded-xl ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-1">
          <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
          {aside}
        </div>
      )}
      <div className="px-5 pb-5 pt-3">{children}</div>
    </section>
  );
}

function exportCsv(data: Startup[]) {
  const rows = [
    ['Company', 'Industry', 'Model', 'Team', 'Funding USD', 'Rounds', 'Score', 'Verdict'],
    ...data.map((s) => [
      s.name, s.industry, s.is_b2b ? 'B2B' : 'B2C', s.team_size,
      s.funding_total_usd, s.funding_rounds, s.score, VERDICT[s.verdict].label,
    ]),
  ];
  const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dealflow-screening-results.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- confidence meter ---------- */

function ConfidenceMeter({ value, compact = false }: { value: number; compact?: boolean }) {
  const tone = value >= 80 ? { bar: 'bg-good', text: 'text-good' } : value >= 60 ? { bar: 'bg-warn', text: 'text-warn' } : { bar: 'bg-bad', text: 'text-bad' };
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5" title={`Data confidence ${value}%`}>
        <Gauge className={`w-3.5 h-3.5 ${tone.text}`} />
        <span className={`font-mono text-[11px] font-semibold ${tone.text}`}>{value}%</span>
      </span>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-ink-2 inline-flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 text-ink-3" /> Data confidence</span>
        <span className={`font-mono text-[13px] font-semibold ${tone.text}`}>{value}%</span>
      </div>
      <div className="h-2 bg-tint rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/* ---------- market forecast chart (regression) ---------- */

function ForecastChart({ forecast }: { forecast: Startup['market_forecast'] }) {
  const W = 520, H = 190, padL = 34, padR = 12, padT = 12, padB = 24;
  const hist = forecast.history;
  const proj = forecast.projection;
  const allYears = [...hist.map((d) => d.year), ...proj.map((d) => d.year)];
  const minYear = Math.min(...allYears), maxYear = Math.max(...allYears);
  const allVals = [...hist.map((d) => d.tam), ...proj.map((d) => d.hi)];
  const maxVal = Math.max(...allVals) * 1.05, minVal = 0;
  const x = (yr: number) => padL + ((yr - minYear) / (maxYear - minYear)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - minVal) / (maxVal - minVal)) * (H - padT - padB);

  const histPath = hist.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(d.year).toFixed(1)},${y(d.tam).toFixed(1)}`).join(' ');
  const projLine = proj.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(d.year).toFixed(1)},${y(d.tam).toFixed(1)}`).join(' ');
  const bandTop = proj.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(d.year).toFixed(1)},${y(d.hi).toFixed(1)}`).join(' ');
  const bandBottom = proj.slice().reverse().map((d) => `L${x(d.year).toFixed(1)},${y(d.lo).toFixed(1)}`).join(' ');
  const band = `${bandTop} ${bandBottom} Z`;
  const gridVals = [0, maxVal / 2, maxVal];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Market size forecast">
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
          <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="var(--ink-3)" fontFamily="var(--font-mono)">${v.toFixed(0)}B</text>
        </g>
      ))}
      {allYears.filter((_, i) => i % 2 === 0 || i === allYears.length - 1).map((yr) => (
        <text key={yr} x={x(yr)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--ink-3)" fontFamily="var(--font-mono)">{yr}</text>
      ))}
      <path d={band} fill="var(--accent)" opacity="0.10" />
      <path d={histPath} fill="none" stroke="var(--ink-2)" strokeWidth="2" />
      <path d={projLine} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 4" />
      {hist.map((d) => <circle key={d.year} cx={x(d.year)} cy={y(d.tam)} r="2.5" fill="var(--ink-2)" />)}
      <circle cx={x(proj[proj.length - 1].year)} cy={y(proj[proj.length - 1].tam)} r="3" fill="var(--accent)" />
    </svg>
  );
}

/* ---------- pillar breakdown ---------- */

const PILLAR_TONE: Record<Pillar['key'], string> = {
  team: 'bg-accent', traction: 'bg-good', market: 'bg-warn', macro: 'bg-ink-3',
};

/* ========== OVERVIEW ========== */

function OverviewView({ data, counts, onOpenStartup }: {
  data: Startup[];
  counts: Counts;
  onOpenStartup: (id: number) => void;
}) {
  const avgScore = Math.round(data.reduce((a, s) => a + s.score, 0) / data.length);
  const b2bShare = Math.round((data.filter((s) => s.is_b2b).length / data.length) * 100);

  const buckets = useMemo(() => {
    const b = Array.from({ length: 10 }, () => 0);
    data.forEach((s) => b[Math.min(9, Math.floor(s.score / 10))]++);
    return b;
  }, [data]);
  const maxBucket = Math.max(...buckets);

  const sectors = useMemo(() => {
    const m = new Map<string, number>();
    data.forEach((s) => m.set(s.industry, (m.get(s.industry) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [data]);
  const maxSector = sectors.length ? sectors[0][1] : 1;

  const topRanked = useMemo(
    () => [...data].sort((a, b) => b.score - a.score).slice(0, 5),
    [data]
  );

  return (
    <div className="view-enter p-5 lg:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Cohort overview</h1>
          <p className="text-[13px] text-ink-3 mt-0.5">
            2026 cohort · {counts.all} applications screened in 3.2s
          </p>
        </div>
        <button
          onClick={() => exportCsv(data)}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-2 bg-pane border border-line rounded-lg px-3.5 py-2 hover:bg-tint transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Screened', value: String(counts.all), sub: 'applications', color: 'text-ink' },
          { label: 'Pursue', value: String(counts.high), sub: `${Math.round((counts.high / counts.all) * 100)}% of cohort`, color: 'text-good' },
          { label: 'Average score', value: String(avgScore), sub: 'out of 100', color: 'text-ink' },
          { label: 'B2B share', value: `${b2bShare}%`, sub: 'higher survival rate', color: 'text-ink' },
        ].map((k, i) => (
          <div key={i} className="bg-pane border border-line rounded-xl px-4 py-3.5">
            <div className="microlabel">{k.label}</div>
            <div className={`font-mono text-2xl font-semibold mt-1 ${k.color}`}>{k.value}</div>
            <div className="text-[11px] text-ink-3 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Score distribution */}
        <Card title="Score distribution" className="lg:col-span-3">
          <div className="flex items-end gap-1.5 h-32">
            {buckets.map((n, i) => {
              const color = i <= 2 ? 'bg-bad/70' : i <= 5 ? 'bg-warn/70' : 'bg-good/80';
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-mono text-ink-3">{n > 0 ? n : ''}</span>
                  <div
                    className={`w-full rounded-t ${n > 0 ? color : 'bg-tint'}`}
                    style={{ height: `${n > 0 ? Math.max(6, (n / maxBucket) * 100) : 4}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-mono text-ink-3">
            <span>0</span><span>50</span><span>100</span>
          </div>
          {/* Verdict split */}
          <div className="mt-5 pt-4 border-t border-line">
            <div className="flex h-2 rounded-full overflow-hidden">
              <div className="bg-good" style={{ width: `${(counts.high / counts.all) * 100}%` }} />
              <div className="bg-warn" style={{ width: `${(counts.moderate / counts.all) * 100}%` }} />
              <div className="bg-bad" style={{ width: `${(counts.low / counts.all) * 100}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-xs text-ink-2">
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-good" /> Pursue {counts.high}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warn" /> Review {counts.moderate}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-bad" /> Pass {counts.low}</span>
            </div>
          </div>
        </Card>

        {/* Sectors */}
        <Card title="Top sectors" className="lg:col-span-2">
          <div className="space-y-3">
            {sectors.map(([name, n]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs text-ink-2 w-20 shrink-0 truncate">{name}</span>
                <div className="flex-1 h-2 bg-tint rounded-full overflow-hidden">
                  <div className="h-full bg-accent/70 rounded-full" style={{ width: `${(n / maxSector) * 100}%` }} />
                </div>
                <span className="font-mono text-xs text-ink-2 w-5 text-right">{n}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top ranked */}
      <Card
        title="Top ranked"
        aside={
          <button
            onClick={() => onOpenStartup(topRanked[0].id)}
            className="text-xs font-medium text-accent hover:text-accent-deep inline-flex items-center gap-1"
          >
            View all applications <ArrowUpRight className="w-3 h-3" />
          </button>
        }
      >
        <div className="divide-y divide-line -mx-5">
          {topRanked.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onOpenStartup(s.id)}
              className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-tint/50 transition-colors group"
            >
              <span className="font-mono text-xs text-ink-3 w-4">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-ink group-hover:text-accent-deep transition-colors">{s.name}</div>
                <div className="text-[11px] text-ink-3">{s.industry} · {s.is_b2b ? 'B2B' : 'B2C'} · team {s.team_size}</div>
              </div>
              <span className="font-mono text-sm font-semibold">{s.score}</span>
              <VerdictChip verdict={s.verdict} />
              <ChevronRight className="w-4 h-4 text-ink-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ========== APPLICATIONS: LIST + DETAIL ========== */

function AppsView({
  data, counts, filter, setFilter, selectedId, setSelectedId,
}: {
  data: Startup[];
  counts: Counts;
  filter: Filter;
  setFilter: (f: Filter) => void;
  selectedId: number | null;
  setSelectedId: (id: number) => void;
}) {
  const [search, setSearch] = useState('');
  const [mobileDetail, setMobileDetail] = useState(selectedId !== null);

  const filtered = useMemo(() => {
    let d = data;
    if (filter !== 'all') d = d.filter((s) => s.verdict === filter);
    if (search)
      d = d.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.industry.toLowerCase().includes(search.toLowerCase())
      );
    return [...d].sort((a, b) => b.score - a.score);
  }, [data, filter, search]);

  const selected = data.find((s) => s.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (filtered.length > 0 && !filtered.some((s) => s.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId, setSelectedId]);

  const moveSelection = useCallback(
    (dir: 1 | -1) => {
      if (!filtered.length) return;
      const idx = filtered.findIndex((s) => s.id === selected?.id);
      const next = filtered[Math.min(filtered.length - 1, Math.max(0, idx + dir))];
      if (next) setSelectedId(next.id);
    },
    [filtered, selected, setSelectedId]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); }
      if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moveSelection]);

  const tabs: { key: Filter; label: string; dot?: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'high', label: 'Pursue', dot: 'bg-good' },
    { key: 'moderate', label: 'Review', dot: 'bg-warn' },
    { key: 'low', label: 'Pass', dot: 'bg-bad' },
  ];

  return (
    <div className="view-enter flex h-full min-h-0">
      {/* List pane */}
      <div className={`${mobileDetail ? 'hidden' : 'flex'} lg:flex flex-col w-full lg:w-80 xl:w-88 shrink-0 border-r border-line bg-pane min-h-0`}>
        <div className="p-3.5 border-b border-line space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
            <input
              placeholder="Search name or sector"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-canvas border border-line rounded-lg pl-8 pr-3 py-1.5 text-[13px] placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  filter === t.key ? 'bg-ink text-white' : 'text-ink-2 hover:bg-tint'
                }`}
              >
                {t.dot && <span className={`w-1.5 h-1.5 rounded-full ${filter === t.key ? 'bg-white' : t.dot}`} />}
                {t.label}
                <span className={filter === t.key ? 'text-white/60' : 'text-ink-3'}>{counts[t.key]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-[13px] text-ink-3 text-center py-10">No matches — adjust the search or filter.</p>
          )}
          {filtered.map((s) => {
            const active = selected?.id === s.id;
            return (
              <button
                key={s.id}
                ref={active ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                onClick={() => { setSelectedId(s.id); setMobileDetail(true); }}
                className={`w-full text-left px-3.5 py-3 border-b border-line/70 transition-colors ${
                  active ? 'bg-accent-soft' : 'hover:bg-tint/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 min-w-0 text-[13px] font-medium ${active ? 'text-accent-deep' : 'text-ink'}`}>
                    <span className="truncate">{s.name}</span>
                    {s.id >= 1000 && (
                      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-accent-deep bg-accent-soft border border-accent/20 rounded px-1 py-px">
                        New
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[13px] font-semibold shrink-0">{s.score}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-[11px] text-ink-3 truncate">
                    {s.industry} · {s.is_b2b ? 'B2B' : 'B2C'} · team {s.team_size}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${VERDICT[s.verdict].bg}`} />
                </div>
              </button>
            );
          })}
        </div>
        <div className="px-3.5 py-2 border-t border-line flex items-center justify-between">
          <span className="text-[11px] text-ink-3">{filtered.length} shown</span>
          <span className="hidden lg:block text-[11px] text-ink-3 font-mono">↑↓ / j k to navigate</span>
        </div>
      </div>

      {/* Detail pane */}
      <div className={`${mobileDetail ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-w-0 min-h-0`}>
        {selected ? (
          <DetailPane startup={selected} onBack={() => setMobileDetail(false)} />
        ) : (
          <div className="flex-1 grid place-items-center text-[13px] text-ink-3">Select an application</div>
        )}
      </div>
    </div>
  );
}

/* ========== DETAIL PANE — THE MEMO ========== */

function DetailPane({ startup, onBack }: { startup: Startup; onBack: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const mr = startup.market_research;
  const ma = startup.macro_analysis;
  const fc = startup.market_forecast;

  useEffect(() => setExpanded(null), [startup.id]);

  return (
    <>
      {/* Sticky header */}
      <div className="border-b border-line bg-pane px-5 lg:px-7 py-4">
        <button
          onClick={onBack}
          className="lg:hidden inline-flex items-center gap-1.5 text-xs font-medium text-ink-3 hover:text-ink mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All applications
        </button>
        <div className="flex items-center gap-4">
          <ScoreRing score={startup.score} verdict={startup.verdict} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-semibold tracking-tight truncate">{startup.name}</h1>
              <VerdictChip verdict={startup.verdict} size="md" />
              <ConfidenceMeter value={startup.confidence} compact />
            </div>
            <p className="text-[13px] text-ink-2 mt-0.5 truncate">{startup.description}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-[11px] text-ink-3">
              <span>{startup.industry} · {startup.is_b2b ? 'B2B' : 'B2C'}</span>
              <span>{startup.stage}</span>
              <span>Team {startup.team_size}</span>
              {startup.ask_amount_usd > 0 && <span>Ask {fmtMoney0(startup.ask_amount_usd)}</span>}
              <span>{startup.country}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto bg-canvas">
        <div className="p-5 lg:p-7 max-w-3xl space-y-4">

          {/* Why this score — four pillars */}
          <Card
            title="Why this score"
            aside={
              <span className="font-mono text-[11px] text-ink-3">
                4 pillars <span className="font-semibold text-ink">= {startup.score}/100</span>
              </span>
            }
          >
            {/* pillar summary bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2">
              {startup.pillars.map((p) => (
                <div key={p.key} className="bg-canvas border border-line rounded-lg px-3 py-2.5">
                  <div className="microlabel truncate">{p.label}</div>
                  <div className="font-mono text-[15px] font-semibold mt-0.5">{p.score}<span className="text-ink-3 text-[11px]">/{p.max}</span></div>
                  <div className="h-1.5 bg-tint rounded-full overflow-hidden mt-1.5">
                    <div className={`h-full rounded-full ${PILLAR_TONE[p.key]}`} style={{ width: `${(p.score / p.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* factor rows grouped by pillar */}
            <div className="-mx-5 mt-1">
              {startup.pillars.map((p) => (
                <div key={p.key}>
                  <div className="px-5 pt-3 pb-1 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${PILLAR_TONE[p.key]}`} />
                    <span className="microlabel">{p.label}</span>
                    <span className="font-mono text-[11px] text-ink-3">{p.score}/{p.max}</span>
                  </div>
                  <div className="divide-y divide-line border-t border-line">
                    {p.factors.map((factor, i) => {
                      const key = `${p.key}-${i}`;
                      const isExpanded = expanded === key;
                      const impactColor = factor.direction === 'positive' ? 'text-good' : factor.direction === 'negative' ? 'text-bad' : 'text-ink-3';
                      const barColor = factor.direction === 'positive' ? 'bg-good' : factor.direction === 'negative' ? 'bg-bad' : 'bg-ink-3';
                      const barWidth = factor.max_impact > 0 ? `${(factor.impact / factor.max_impact) * 100}%` : '0%';
                      return (
                        <div key={key}>
                          <button
                            onClick={() => setExpanded(isExpanded ? null : key)}
                            className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${isExpanded ? 'bg-tint/40' : 'hover:bg-tint/40'}`}
                          >
                            <span className="text-[13px] font-medium text-ink w-40 lg:w-48 shrink-0 leading-snug">{factor.criterion}</span>
                            <span className="flex-1 h-1.5 bg-tint rounded-full overflow-hidden">
                              <span className={`block h-full rounded-full ${barColor}`} style={{ width: barWidth, minWidth: factor.impact !== 0 ? '5px' : '0' }} />
                            </span>
                            <span className="hidden sm:block text-[11px] text-ink-3 w-36 text-right truncate">{factor.value}</span>
                            <span className={`font-mono text-xs font-semibold w-12 text-right ${impactColor}`}>
                              +{factor.impact}<span className="text-ink-3">/{factor.max_impact}</span>
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-ink-3 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          {isExpanded && (
                            <div className="px-5 pb-4 pt-1 bg-tint/40">
                              <p className="text-[13px] leading-relaxed text-ink-2">{factor.explanation}</p>
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {factor.threshold && (
                                  <div className="bg-pane border border-line rounded-lg p-3">
                                    <div className="microlabel mb-1">Scoring rule</div>
                                    <p className="text-xs leading-snug text-ink">{factor.threshold}</p>
                                  </div>
                                )}
                                {factor.benchmark && (
                                  <div className="bg-pane border border-line rounded-lg p-3">
                                    <div className="microlabel mb-1">Benchmark</div>
                                    <p className="text-xs leading-snug text-ink-2">{factor.benchmark}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4">
              <ConfidenceMeter value={startup.confidence} />
              <p className="text-[11px] text-ink-3 mt-2">Confidence reflects how much of the pitch-deck / financial data was supplied. Click any factor for the rule behind it.</p>
            </div>
          </Card>

          {/* Market forecast — regression */}
          <Card
            title={`Market forecast — ${startup.industry}`}
            aside={<span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent"><TrendingUp className="w-3.5 h-3.5" /> Regression model</span>}
          >
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Modeled CAGR', value: `${(fc.cagr * 100).toFixed(1)}%`, color: fc.cagr >= 0.2 ? 'text-good' : 'text-ink' },
                { label: 'Fit quality (R²)', value: fc.r2.toFixed(2), color: 'text-ink' },
                { label: `SOM in ${fc.horizon}y`, value: `$${fc.som_exit}M`, color: 'text-good' },
              ].map((cell, i) => (
                <div key={i} className="bg-canvas border border-line rounded-lg px-3 py-2.5">
                  <div className="microlabel">{cell.label}</div>
                  <div className={`font-mono text-lg font-semibold mt-0.5 ${cell.color}`}>{cell.value}</div>
                </div>
              ))}
            </div>
            <ForecastChart forecast={fc} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-ink-3">
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 bg-ink-2" /> Historical TAM</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 bg-accent" style={{ borderTop: '2px dashed var(--accent)' }} /> Projected (95% band)</span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
              {fc.method} The obtainable market (SOM) is projected from ${fc.som_now}M today to ~${fc.som_exit}M in {fc.horizon} years at the modeled {(fc.cagr * 100).toFixed(1)}% CAGR — the revenue ceiling the fund underwrites against.
            </p>
          </Card>

          {/* Signals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Strengths">
              <ul className="space-y-2.5">
                {startup.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-ink-2">
                    <CircleCheck className="w-3.5 h-3.5 text-good shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Red flags">
              <ul className="space-y-2.5">
                {startup.red_flags.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-ink-2">
                    <CircleX className="w-3.5 h-3.5 text-bad shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Decision path */}
          <Card title="Decision path" aside={<span className="microlabel">Audit log</span>}>
            <div className="bg-code rounded-lg px-4 py-4 font-mono text-xs leading-6 overflow-x-auto">
              {startup.decision_path.map((step, i) => {
                const color = step.includes('PURSUE')
                  ? 'text-[#7fd39a] font-semibold'
                  : step.includes('PASS')
                  ? 'text-[#f09a83] font-semibold'
                  : step.includes('REVIEW')
                  ? 'text-[#e2bb6d] font-semibold'
                  : step.includes('healthy') || step.includes('Strongest')
                  ? 'text-[#7fd39a]'
                  : step.includes('slow') || step.includes('Weakest')
                  ? 'text-[#f09a83]'
                  : 'text-[#b9bdc7]';
                return (
                  <div key={i} style={{ paddingLeft: `${i * 2}ch` }} className="whitespace-nowrap">
                    {i > 0 && <span className="text-[#565b66]">└─ </span>}
                    <span className={color}>{step}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-ink-3 mt-3">
              The exact path the decision tree followed — each node a yes/no question, every step auditable.
            </p>
          </Card>

          {/* Risk assessment */}
          <Card title="Risk assessment">
            <div className="space-y-5">
              <div>
                <div className="microlabel mb-2">Execution</div>
                <div className="space-y-2">
                  {startup.risks.map((risk, i) => (
                    <div key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-2">
                      <TriangleAlert className="w-3.5 h-3.5 text-warn shrink-0 mt-0.5" />
                      {risk}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="microlabel mb-2">Market</div>
                <ul className="space-y-2 text-[13px] leading-snug text-ink-2">
                  {mr.competition === 'High' ? (
                    <>
                      <li className="flex gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-bad shrink-0 mt-1.5" />High competition in {startup.industry} — established players and well-funded competitors dominate</li>
                      <li className="flex gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-bad shrink-0 mt-1.5" />Differentiation is critical to stand out</li>
                      <li className="flex gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-warn shrink-0 mt-1.5" />Market growth of {mr.growth_rate} is strong, but competition may compress margins</li>
                    </>
                  ) : mr.competition === 'Low' ? (
                    <>
                      <li className="flex gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-good shrink-0 mt-1.5" />Low competition in {startup.industry} — few local players exist</li>
                      <li className="flex gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-good shrink-0 mt-1.5" />First-mover advantages available</li>
                      <li className="flex gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-warn shrink-0 mt-1.5" />Market is less proven — may require education and customer development effort</li>
                    </>
                  ) : (
                    <>
                      <li className="flex gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-warn shrink-0 mt-1.5" />Moderate competition in {startup.industry} — demand is validated but not saturated</li>
                      <li className="flex gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-warn shrink-0 mt-1.5" />Positioning and speed of execution will determine market share</li>
                    </>
                  )}
                </ul>
              </div>
              <div>
                <div className="microlabel mb-2">Macroeconomic</div>
                <ul className="space-y-2 text-[13px] leading-snug text-ink-2">
                  <li className="flex gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${ma.regulatory_risk === 'High' ? 'bg-bad' : ma.regulatory_risk === 'Medium' ? 'bg-warn' : 'bg-good'}`} />
                    {ma.regulatory_risk === 'High'
                      ? 'High regulatory risk — compliance adds 6–12 months to sales cycles, local certification required'
                      : ma.regulatory_risk === 'Medium'
                      ? 'Moderate regulatory environment — manageable compliance, changes tend to be industry-friendly'
                      : 'Low regulatory risk — minimal compliance burden, faster go-to-market'}
                  </li>
                  <li className="flex gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-ink-3 shrink-0 mt-1.5" />Inflation at {ma.inflation} erodes purchasing power</li>
                  <li className="flex gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-ink-3 shrink-0 mt-1.5" />{ma.currency_stability}</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Market research */}
          <Card
            title={`Market — ${startup.industry}`}
            aside={
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${mr.market_viable ? 'text-good' : 'text-bad'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${mr.market_viable ? 'bg-good' : 'bg-bad'}`} />
                {mr.market_viable ? 'Market viable' : 'Market challenged'}
              </span>
            }
          >
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'TAM', value: mr.tam, sub: 'Total addressable', color: 'text-ink' },
                { label: 'SAM', value: mr.sam, sub: 'Serviceable', color: 'text-ink' },
                {
                  label: 'SOM', value: mr.som, sub: `Capture: ${mr.capture_potential}`,
                  color: mr.capture_potential === 'High' ? 'text-good' : mr.capture_potential === 'Low' ? 'text-bad' : 'text-warn',
                },
              ].map((cell, i) => (
                <div key={i} className="bg-canvas border border-line rounded-lg px-3 py-2.5">
                  <div className="microlabel">{cell.label}</div>
                  <div className={`font-mono text-lg font-semibold mt-0.5 ${cell.color}`}>{cell.value}</div>
                  <div className="text-[10px] text-ink-3 mt-0.5">{cell.sub}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="flex items-center justify-between bg-canvas border border-line rounded-lg px-3 py-2.5">
                <span className="text-xs text-ink-3">Market growth</span>
                <span className="font-mono text-[13px] font-semibold text-good">{mr.growth_rate}</span>
              </div>
              <div className="flex items-center justify-between bg-canvas border border-line rounded-lg px-3 py-2.5">
                <span className="text-xs text-ink-3">Competition</span>
                <span className={`font-mono text-[13px] font-semibold ${mr.competition === 'Low' ? 'text-good' : mr.competition === 'High' ? 'text-bad' : 'text-warn'}`}>
                  {mr.competition}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="microlabel mb-1.5">Can this business capture the market?</div>
              <p className="text-[13px] leading-relaxed text-ink-2">{mr.som_explanation}</p>
            </div>
            <div className="mt-4">
              <div className="microlabel mb-2">Key trends</div>
              <ul className="space-y-1.5 text-[13px] leading-snug text-ink-2">
                {mr.key_trends.map((t, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent/60 shrink-0 mt-1.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-ink border-l-2 border-accent pl-3">{mr.assessment}</p>
          </Card>

          {/* Macro context */}
          <Card title="Macro context — Uzbekistan">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'GDP growth', value: ma.gdp_growth, color: 'text-ink' },
                { label: 'Inflation', value: ma.inflation, color: 'text-warn' },
                {
                  label: 'Reg. risk', value: ma.regulatory_risk,
                  color: ma.regulatory_risk === 'Low' ? 'text-good' : ma.regulatory_risk === 'High' ? 'text-bad' : 'text-warn',
                },
                { label: 'FDI trend', value: 'Up 23%', color: 'text-good' },
                { label: 'Currency', value: '−8% UZS', color: 'text-warn' },
              ].map((cell, i) => (
                <div key={i} className="bg-canvas border border-line rounded-lg px-3 py-2.5">
                  <div className="microlabel">{cell.label}</div>
                  <div className={`font-mono text-[13px] font-semibold mt-1 ${cell.color}`}>{cell.value}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-ink-2">{ma.assessment}</p>
            <p className="text-[11px] text-ink-3 mt-3">
              Sources: State Statistics Committee and World Bank, Uzbekistan 2024 indicators.
            </p>
          </Card>

          {/* Application data */}
          <Card title="Application data" aside={<span className="microlabel">ITPV intake</span>}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Industry', value: startup.industry },
                { label: 'Development stage', value: startup.stage },
                { label: 'Business model', value: startup.is_b2b ? 'B2B' : 'B2C' },
                { label: 'Revenue model', value: startup.revenue_model },
                { label: 'Team size', value: `${startup.team_size} people` },
                { label: 'Unique tech / patents', value: startup.unique_tech ? 'Yes' : 'No' },
                { label: 'Founding year', value: String(startup.founding_year) },
                { label: 'Country', value: startup.country },
                { label: 'Previous investment', value: startup.previous_investment ? 'Yes' : 'No' },
                { label: 'Total funding', value: fmtMoney0(startup.funding_total_usd) },
                { label: 'Ask to ITPV', value: fmtMoney0(startup.ask_amount_usd) },
                { label: 'Round size', value: fmtMoney0(startup.round_size_usd) },
                { label: 'Revenue', value: fmtMoney0(startup.sales_amount_usd) },
                { label: 'Previous founder exit', value: startup.has_previous_exit ? 'Yes' : 'No' },
                { label: 'Founder', value: startup.founder_name },
              ].map((item, i) => (
                <div key={i} className="bg-canvas border border-line rounded-lg px-3 py-2.5">
                  <div className="microlabel">{item.label}</div>
                  <div className="text-[13px] font-medium text-ink mt-1">{item.value}</div>
                </div>
              ))}
            </div>
            {startup.founder_background && startup.founder_background !== 'Not provided' && (
              <div className="mt-3">
                <div className="microlabel mb-1.5">Founder background</div>
                <p className="text-[13px] leading-relaxed text-ink-2">{startup.founder_background}</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

/* ========== METHODOLOGY ========== */

function MethodologyView() {
  const steps = [
    {
      num: '01', title: 'Intake',
      desc: 'Applications arrive through the IT-Park Ventures form (Project Information, Contacts & Team, Materials) — entered manually, imported as a CSV batch, or auto-filled by reading an uploaded pitch deck / financial model in the browser.',
    },
    {
      num: '02', title: 'Four-pillar scoring',
      desc: 'Each startup is scored across Team & Founder, Traction & Financials, Market & Growth, and Macro & Deal Fit. Market growth is not self-reported — it comes from a regression on the sector’s historical market size.',
    },
    {
      num: '03', title: 'Transparent output',
      desc: 'Every verdict shows the points earned per pillar and factor, a market-forecast chart, strengths, red flags, the audit-log decision path, and a data-confidence rating that reflects how complete the submission was.',
    },
  ];

  const pillars = [
    { name: 'Team & Founder', weight: 25, tone: 'bg-accent', factors: 'Execution track record (prior exit / shipped projects), founder background depth, technical moat (unique tech/patents), team size.' },
    { name: 'Traction & Financials', weight: 30, tone: 'bg-good', factors: 'Prior investment, revenue validation, revenue growth, runway, and development stage. Growth & runway come from the financial model when supplied.' },
    { name: 'Market & Growth', weight: 30, tone: 'bg-warn', factors: 'Serviceable market (SAM), regression-projected CAGR, obtainable market (SOM) at exit, and competitive density.' },
    { name: 'Macro & Deal Fit', weight: 15, tone: 'bg-ink-3', factors: 'Regulatory environment, geography & currency (home-market advantage), FDI trend, and ask vs. the $10K–$1M fund mandate.' },
  ];

  return (
    <div className="view-enter p-5 lg:p-8 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Methodology</h1>
        <p className="text-[13px] text-ink-3 mt-0.5">
          A transparent path from an IT-Park Ventures application to a market-aware recommendation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {steps.map((step) => (
          <Card key={step.num}>
            <div className="flex gap-4">
              <span className="font-mono text-sm text-accent font-semibold">{step.num}</span>
              <div>
                <h3 className="text-[15px] font-semibold text-ink">{step.title}</h3>
                <p className="text-[13px] leading-relaxed text-ink-2 mt-1">{step.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card title="The four pillars — 100 points">
        <div className="space-y-4">
          {pillars.map((p) => (
            <div key={p.name}>
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${p.tone}`} />
                <span className="text-[13px] font-semibold text-ink">{p.name}</span>
                <span className="font-mono text-[11px] text-ink-3">{p.weight} pts</span>
                <div className="flex-1 h-1.5 bg-tint rounded-full overflow-hidden ml-1">
                  <div className={`h-full rounded-full ${p.tone}`} style={{ width: `${p.weight}%` }} />
                </div>
              </div>
              <p className="text-[13px] leading-relaxed text-ink-2 pl-5">{p.factors}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-line grid grid-cols-3 gap-3 text-center">
          {[
            { v: '≥ 70', l: 'Pursue', c: 'text-good' },
            { v: '45–69', l: 'Review', c: 'text-warn' },
            { v: '< 45', l: 'Pass', c: 'text-bad' },
          ].map((t) => (
            <div key={t.l} className="bg-canvas border border-line rounded-lg py-2.5">
              <div className={`font-mono text-lg font-semibold ${t.c}`}>{t.v}</div>
              <div className="microlabel mt-0.5">{t.l}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="bg-code rounded-xl px-6 py-6">
        <div className="microlabel !text-[#8b8f99]">The market-growth regression</div>
        <p className="text-[13px] leading-relaxed text-[#c7cbd4] mt-3">
          For each sector we hold six years of market-size (TAM) history. A log-linear ordinary-least-squares regression
          fits <span className="font-mono text-white">ln(TAM) = a + b·year</span>, so the modeled growth rate is
          <span className="font-mono text-white"> CAGR = e^b − 1</span>. We report the fit quality (R²), project the market
          five years forward with a 95% confidence band, and grow the startup&apos;s obtainable market (SOM) at the same rate.
          It is a fully auditable statistical projection — not a black-box model.
        </p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
          {[
            { value: '4 pillars', label: 'Weighted 25 / 30 / 30 / 15' },
            { value: 'OLS', label: 'Log-linear market regression' },
            { value: '5-year', label: 'Forward market projection' },
            { value: 'Confidence', label: 'Scaled by data completeness' },
          ].map((stat, i) => (
            <div key={i}>
              <div className="font-mono text-lg font-semibold text-white">{stat.value}</div>
              <div className="text-[11px] text-[#9ba0ab] mt-1 leading-relaxed">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <Card title="Reading a pitch deck (free, in-browser)">
        <p className="text-[13px] leading-relaxed text-ink-2">
          Uploaded pitch decks (PDF) and financial models (XLSX / CSV / PDF) are parsed entirely in the browser with
          pdf.js and SheetJS — no server, no API key, no data leaving the page. Simple extraction pulls out revenue,
          growth, runway, market size, team and ask, then pre-fills the form for the analyst to confirm before scoring.
          The more the deck reveals, the higher the data-confidence rating on the verdict.
        </p>
      </Card>
    </div>
  );
}

/* ========== NEW EVALUATION MODAL ========== */

function parseCsvText(text: string, startId: number): Startup[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('The CSV needs a header row and at least one data row.');
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const idx = (names: string[]) => header.findIndex((h) => names.includes(h));
  const iName = idx(['name', 'company', 'startup']);
  const iInd = idx(['industry', 'sector']);
  const iModel = idx(['business_model', 'model', 'b2b']);
  const iStage = idx(['stage', 'development_stage']);
  const iTeam = idx(['team_size', 'team', 'employees']);
  const iTech = idx(['unique_tech', 'patents', 'unique_technology']);
  const iCountry = idx(['country', 'country_of_registration']);
  const iFund = idx(['funding_total_usd', 'total_funding', 'funding']);
  const iRounds = idx(['funding_rounds', 'rounds']);
  const iTime = idx(['time_to_first_funding_months', 'months_to_funding', 'time_to_funding']);
  const iExit = idx(['has_previous_exit', 'previous_exit', 'exit']);
  const iPrevInv = idx(['previous_investment', 'received_investment']);
  const iRev = idx(['sales_amount_usd', 'revenue', 'sales']);
  const iGrowth = idx(['revenue_growth_pct', 'growth', 'growth_pct']);
  const iRunway = idx(['runway_months', 'runway']);
  const iAsk = idx(['ask_amount_usd', 'ask', 'ask_to_itpv']);
  const iRound = idx(['round_size_usd', 'round_size', 'total_round_size']);
  if (iName < 0) throw new Error('The CSV must include a "name" column — download the template for the expected format.');
  const yes = (v: string) => ['yes', 'true', '1', 'b2b', 'y'].includes(v.trim().toLowerCase());
  const num = (v: string) => Math.max(0, Number(v.replace(/[^0-9.]/g, '')) || 0);
  const cell = (cols: string[], i: number) => (i >= 0 && i < cols.length ? cols[i] : '');
  const opt = (cols: string[], i: number) => (i >= 0 && cell(cols, i).trim() !== '' ? num(cell(cols, i)) : undefined);
  return lines.slice(1, 201).map((line, n) => {
    const cols = line.split(',');
    return evaluateStartup(
      {
        name: cell(cols, iName).trim() || `Imported ${n + 1}`,
        industry: cell(cols, iInd).trim() || 'SaaS',
        is_b2b: iModel >= 0 ? yes(cell(cols, iModel)) : true,
        stage: iStage >= 0 && cell(cols, iStage).trim() ? cell(cols, iStage).trim() : undefined,
        team_size: Math.max(1, num(cell(cols, iTeam)) || 1),
        unique_tech: iTech >= 0 ? yes(cell(cols, iTech)) : undefined,
        country: iCountry >= 0 && cell(cols, iCountry).trim() ? cell(cols, iCountry).trim() : undefined,
        funding_total_usd: num(cell(cols, iFund)),
        funding_rounds: num(cell(cols, iRounds)),
        time_to_first_funding_months: num(cell(cols, iTime)),
        has_previous_exit: yes(cell(cols, iExit)),
        previous_investment: iPrevInv >= 0 ? yes(cell(cols, iPrevInv)) : undefined,
        sales_amount_usd: num(cell(cols, iRev)),
        revenue_growth_pct: opt(cols, iGrowth),
        runway_months: opt(cols, iRunway),
        ask_amount_usd: opt(cols, iAsk),
        round_size_usd: opt(cols, iRound),
      },
      startId + n
    );
  });
}

function downloadCsvTemplate() {
  const csv = [
    'name,industry,business_model,stage,team_size,unique_tech,country,funding_total_usd,funding_rounds,time_to_first_funding_months,has_previous_exit,previous_investment,sales_amount_usd,revenue_growth_pct,runway_months,ask_amount_usd,round_size_usd',
    'Acme Robotics,DeepTech,B2B,MVP,8,yes,Uzbekistan,450000,2,7,no,yes,25000,18,14,300000,800000',
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dealflow-itpv-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function Segmented({ value, options, onChange }: {
  value: string;
  options: { key: string; label: string }[];
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex bg-canvas border border-line rounded-lg p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`flex-1 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors ${
            value === o.key ? 'bg-pane text-ink border border-line' : 'text-ink-3 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const COUNTRIES = ['Uzbekistan', 'Kazakhstan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan', 'Azerbaijan', 'Russia', 'United States', 'United Kingdom', 'Other'];
const YEARS = Array.from({ length: 12 }, (_, i) => 2026 - i);

const emptyForm = {
  // Step 1 · Project Information
  name: '', industry: 'AI/ML', custom_industry: '', stage: 'Idea',
  is_b2b: true, team_size: 5, unique_tech: false, revenue_model: revenueModels[0],
  founding_year: 2024, country: 'Uzbekistan', description: '',
  ask_amount_usd: 0, round_size_usd: 0, previous_investment: false,
  // Step 2 · Contacts & Team
  founder_name: '', founder_role: 'CEO / Founder', founder_background: '', successful_project: '',
  technical_cofounder: false,
  // Step 3 · Materials / financial snapshot
  funding_total_usd: 0, funding_rounds: 0, time_to_first_funding_months: 0, has_previous_exit: false,
  sales_amount_usd: 0,
  revenue_growth_pct: '' as number | '', runway_months: '' as number | '', monthly_burn_usd: '' as number | '',
  sam_usd: '' as number | '', som_usd: '' as number | '',
};
type FormState = typeof emptyForm;

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="microlabel block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-ink-3 mt-1">{hint}</p>}
    </div>
  );
}

function EvaluateModal({ open, onClose, onCreate, nextId }: {
  open: boolean;
  onClose: () => void;
  onCreate: (created: Startup[]) => void;
  nextId: number;
}) {
  const [mode, setMode] = useState<'app' | 'csv'>('app');
  const [step, setStep] = useState(1);
  const [evaluating, setEvaluating] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deckName, setDeckName] = useState('');
  const [finName, setFinName] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extract, setExtract] = useState<{ matched: { label: string; value: string }[]; source: string; error?: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) { setStep(1); setMode('app'); setForm(emptyForm); setDeckName(''); setFinName(''); setExtract(null); setCsvError(null); }
  }, [open]);

  if (!open) return null;

  const num = (v: string) => Math.max(0, Math.round(Number(v) || 0));
  const toOpt = (v: number | ''): number | undefined => (v === '' ? undefined : Math.max(0, Number(v) || 0));
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const inputCls = 'w-full bg-canvas border border-line rounded-lg px-3 py-2 text-[13px] placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors';

  const resolvedIndustry = form.industry === 'Other' ? (form.custom_industry.trim() || 'Other') : form.industry;
  const preview = buildForecast(resolvedIndustry);
  const askOk = form.ask_amount_usd === 0 || (form.ask_amount_usd >= 10000 && form.ask_amount_usd <= 1_000_000);

  const runExtract = async (file: File | undefined | null, kind: 'deck' | 'financial') => {
    if (!file) return;
    if (kind === 'deck') setDeckName(file.name); else setFinName(file.name);
    setExtracting(true); setExtract(null);
    const res = await extractFromFile(file);
    const x = res.fields;
    const patch: Partial<FormState> = {};
    const setIf = <K extends keyof ExtractedFields>(k: K, apply: (v: number) => void) => { if (x[k] != null) apply(x[k] as number); };
    setIf('sales_amount_usd', (v) => (patch.sales_amount_usd = v));
    setIf('funding_total_usd', (v) => (patch.funding_total_usd = v));
    setIf('ask_amount_usd', (v) => (patch.ask_amount_usd = v));
    setIf('round_size_usd', (v) => (patch.round_size_usd = v));
    setIf('team_size', (v) => (patch.team_size = v));
    setIf('revenue_growth_pct', (v) => (patch.revenue_growth_pct = v));
    setIf('runway_months', (v) => (patch.runway_months = v));
    setIf('monthly_burn_usd', (v) => (patch.monthly_burn_usd = v));
    setIf('sam_usd', (v) => (patch.sam_usd = v));
    setIf('som_usd', (v) => (patch.som_usd = v));
    setIf('founding_year', (v) => (patch.founding_year = v));
    setForm((f) => ({ ...f, ...patch }));
    setExtract({ matched: res.matched, source: res.source, error: res.error });
    setExtracting(false);
  };

  const submit = () => {
    if (!form.name.trim() || evaluating) return;
    setEvaluating(true);
    setTimeout(() => {
      const input: StartupInput = {
        name: form.name.trim(),
        industry: resolvedIndustry,
        is_b2b: form.is_b2b,
        team_size: Math.max(1, form.team_size),
        funding_total_usd: form.funding_total_usd,
        funding_rounds: form.funding_rounds,
        time_to_first_funding_months: form.time_to_first_funding_months,
        has_previous_exit: form.has_previous_exit,
        sales_amount_usd: form.sales_amount_usd,
        founder_name: form.founder_name.trim() || undefined,
        founder_role: form.founder_role,
        founder_background: form.founder_background.trim() || undefined,
        description: form.description.trim() || undefined,
        stage: form.stage,
        unique_tech: form.unique_tech,
        revenue_model: form.revenue_model,
        country: form.country,
        founding_year: form.founding_year,
        ask_amount_usd: form.ask_amount_usd || undefined,
        round_size_usd: form.round_size_usd || undefined,
        previous_investment: form.previous_investment,
        successful_project: form.successful_project.trim() || undefined,
        technical_cofounder: form.technical_cofounder,
        revenue_growth_pct: toOpt(form.revenue_growth_pct),
        runway_months: toOpt(form.runway_months),
        monthly_burn_usd: toOpt(form.monthly_burn_usd),
        sam_usd: toOpt(form.sam_usd),
        som_usd: toOpt(form.som_usd),
      };
      const s = evaluateStartup(input, nextId);
      setEvaluating(false);
      onCreate([s]);
    }, 900);
  };

  const handleCsv = (file: File | undefined | null) => {
    if (!file) return;
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try { onCreate(parseCsvText(String(reader.result || ''), nextId)); }
      catch (e) { setCsvError(e instanceof Error ? e.message : 'Could not parse that file.'); }
    };
    reader.readAsText(file);
  };

  const stepLabels = ['Project Information', 'Contacts & Team', 'Materials'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative bg-pane border border-line rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 shrink-0">
          <h2 className="text-[15px] font-semibold">Investment application</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-3 hover:text-ink p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-1 px-5 pt-3 border-b border-line shrink-0">
          {([['app', 'Application'], ['csv', 'CSV batch']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setMode(key)}
              className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${mode === key ? 'border-accent text-accent-deep' : 'border-transparent text-ink-3 hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>

        {mode === 'app' ? (
          <>
            {/* step indicator */}
            <div className="flex items-center justify-center gap-2 py-4 shrink-0">
              {stepLabels.map((label, i) => {
                const n = i + 1;
                const done = step > n;
                const active = step === n;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <button onClick={() => setStep(n)} className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-semibold transition-colors ${done ? 'bg-accent text-white' : active ? 'bg-accent text-white' : 'bg-tint text-ink-3'}`}>
                      {done ? <Check className="w-3.5 h-3.5" /> : n}
                    </button>
                    <span className={`text-[11px] font-medium ${active ? 'text-ink' : 'text-ink-3'} hidden sm:inline`}>{label}</span>
                    {n < 3 && <span className={`w-6 h-px ${done ? 'bg-accent' : 'bg-line'}`} />}
                  </div>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-2">
              {step === 1 && (
                <div className="space-y-4 view-enter">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Startup name *" htmlFor="ev-name">
                      <input id="ev-name" className={inputCls} placeholder="Acme Robotics" value={form.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
                    </Field>
                    <Field label="Industry" htmlFor="ev-industry">
                      <select id="ev-industry" className={inputCls} value={form.industry} onChange={(e) => set({ industry: e.target.value })}>
                        {industries.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                      </select>
                    </Field>
                    {form.industry === 'Other' && (
                      <Field label="Custom industry" htmlFor="ev-custom">
                        <input id="ev-custom" className={inputCls} placeholder="AI / Data Science" value={form.custom_industry} onChange={(e) => set({ custom_industry: e.target.value })} />
                      </Field>
                    )}
                    <Field label="Development stage" htmlFor="ev-stage">
                      <select id="ev-stage" className={inputCls} value={form.stage} onChange={(e) => set({ stage: e.target.value })}>
                        {stages.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                    <Field label="Employees" htmlFor="ev-team">
                      <input id="ev-team" type="number" min={1} className={inputCls} value={form.team_size} onChange={(e) => set({ team_size: Math.max(1, num(e.target.value)) })} />
                    </Field>
                    <Field label="Business model">
                      <Segmented value={form.is_b2b ? 'b2b' : 'b2c'} options={[{ key: 'b2b', label: 'B2B' }, { key: 'b2c', label: 'B2C' }]} onChange={(k) => set({ is_b2b: k === 'b2b' })} />
                    </Field>
                    <Field label="Unique tech / patents?">
                      <Segmented value={form.unique_tech ? 'yes' : 'no'} options={[{ key: 'no', label: 'No' }, { key: 'yes', label: 'Yes' }]} onChange={(k) => set({ unique_tech: k === 'yes' })} />
                    </Field>
                    <Field label="Revenue model" htmlFor="ev-revmodel">
                      <select id="ev-revmodel" className={inputCls} value={form.revenue_model} onChange={(e) => set({ revenue_model: e.target.value })}>
                        {revenueModels.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </Field>
                    <Field label="Founding year" htmlFor="ev-year">
                      <select id="ev-year" className={inputCls} value={form.founding_year} onChange={(e) => set({ founding_year: Number(e.target.value) })}>
                        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </Field>
                    <Field label="Country of registration" htmlFor="ev-country">
                      <select id="ev-country" className={inputCls} value={form.country} onChange={(e) => set({ country: e.target.value })}>
                        {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Ask to ITPV ($)" htmlFor="ev-ask" hint={!askOk ? 'Outside the $10K–$1M fund mandate' : undefined}>
                      <input id="ev-ask" type="number" min={0} step={10000} className={`${inputCls} ${!askOk ? 'border-warn' : ''}`} placeholder="e.g. 300000" value={form.ask_amount_usd || ''} onChange={(e) => set({ ask_amount_usd: num(e.target.value) })} />
                    </Field>
                    <Field label="Total round size ($)" htmlFor="ev-round">
                      <input id="ev-round" type="number" min={0} step={10000} className={inputCls} placeholder="e.g. 1000000" value={form.round_size_usd || ''} onChange={(e) => set({ round_size_usd: num(e.target.value) })} />
                    </Field>
                    <Field label="Previous investment?">
                      <Segmented value={form.previous_investment ? 'yes' : 'no'} options={[{ key: 'no', label: 'No' }, { key: 'yes', label: 'Yes' }]} onChange={(k) => set({ previous_investment: k === 'yes' })} />
                    </Field>
                  </div>
                  <Field label="Startup description" htmlFor="ev-desc">
                    <textarea id="ev-desc" rows={2} className={inputCls} placeholder="What the company does, in one or two sentences." value={form.description} onChange={(e) => set({ description: e.target.value })} />
                  </Field>
                  <div className="flex items-start gap-2.5 bg-accent-soft/50 border border-accent/15 rounded-lg px-3 py-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent-deep shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed text-ink-2">
                      Market &amp; macro auto-filled from <span className="font-medium text-ink">{resolvedIndustry}</span>: modeled growth <span className="font-mono text-accent-deep">{(preview.cagr * 100).toFixed(1)}% CAGR</span>, SAM ${preview.sam_now}M, plus regulatory &amp; FDI context. You can refine numbers in step 3.
                    </p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 view-enter">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Founder name" htmlFor="ev-founder">
                      <input id="ev-founder" className={inputCls} placeholder="Full name" value={form.founder_name} onChange={(e) => set({ founder_name: e.target.value })} />
                    </Field>
                    <Field label="Role" htmlFor="ev-role">
                      <input id="ev-role" className={inputCls} placeholder="CEO / Founder" value={form.founder_role} onChange={(e) => set({ founder_role: e.target.value })} />
                    </Field>
                    <Field label="Technical co-founder?">
                      <Segmented value={form.technical_cofounder ? 'yes' : 'no'} options={[{ key: 'no', label: 'No' }, { key: 'yes', label: 'Yes' }]} onChange={(k) => set({ technical_cofounder: k === 'yes' })} />
                    </Field>
                    <Field label="Previous founder exit?">
                      <Segmented value={form.has_previous_exit ? 'yes' : 'no'} options={[{ key: 'no', label: 'No' }, { key: 'yes', label: 'Yes' }]} onChange={(k) => set({ has_previous_exit: k === 'yes' })} />
                    </Field>
                  </div>
                  <Field label="Founder background" htmlFor="ev-bg" hint="Domain experience, prior roles — the more detail, the higher the data confidence.">
                    <textarea id="ev-bg" rows={3} className={inputCls} placeholder="Aspiring / experienced founder with background in…" value={form.founder_background} onChange={(e) => set({ founder_background: e.target.value })} />
                  </Field>
                  <Field label="Notable / successful projects (optional)" htmlFor="ev-proj">
                    <textarea id="ev-proj" rows={2} className={inputCls} placeholder="Products shipped, prior ventures, exits…" value={form.successful_project} onChange={(e) => set({ successful_project: e.target.value })} />
                  </Field>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 view-enter">
                  <div>
                    <div className="microlabel mb-2">Upload materials — read in your browser, nothing leaves the page</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FileDrop label="Pitch deck" accept=".pdf" fileName={deckName} icon={<FileText className="w-4 h-4" />} hint="PDF" onFile={(f) => runExtract(f, 'deck')} />
                      <FileDrop label="Financial model" accept=".xlsx,.xls,.csv,.pdf" fileName={finName} icon={<FileText className="w-4 h-4" />} hint="XLSX, CSV, PDF" onFile={(f) => runExtract(f, 'financial')} />
                    </div>
                    {extracting && <p className="text-xs text-ink-2 mt-2 inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading document…</p>}
                    {extract && !extracting && (
                      extract.error ? (
                        <p className="text-xs text-bad mt-2">{extract.error}</p>
                      ) : extract.matched.length > 0 ? (
                        <div className="mt-2 bg-good-soft/60 border border-good/20 rounded-lg px-3 py-2.5">
                          <p className="text-[11px] font-medium text-good mb-1.5 inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Extracted &amp; pre-filled — confirm below</p>
                          <div className="flex flex-wrap gap-1.5">
                            {extract.matched.map((m, i) => (
                              <span key={i} className="text-[11px] bg-pane border border-line rounded px-1.5 py-0.5 text-ink-2"><span className="text-ink-3">{m.label}:</span> {m.value}</span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-ink-3 mt-2">Read the file, but couldn&apos;t auto-detect figures — enter them below.</p>
                      )
                    )}
                  </div>

                  <div>
                    <div className="microlabel mb-2">Financial snapshot <span className="text-ink-3 normal-case tracking-normal">(optional — sharpens the score &amp; confidence)</span></div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <Field label="Revenue ($)" htmlFor="ev-rev">
                        <input id="ev-rev" type="number" min={0} step={1000} className={inputCls} value={form.sales_amount_usd || ''} placeholder="0" onChange={(e) => set({ sales_amount_usd: num(e.target.value) })} />
                      </Field>
                      <Field label="Growth (%/mo)" htmlFor="ev-growth">
                        <input id="ev-growth" type="number" min={0} className={inputCls} value={form.revenue_growth_pct} placeholder="—" onChange={(e) => set({ revenue_growth_pct: e.target.value === '' ? '' : num(e.target.value) })} />
                      </Field>
                      <Field label="Runway (mo)" htmlFor="ev-runway">
                        <input id="ev-runway" type="number" min={0} className={inputCls} value={form.runway_months} placeholder="—" onChange={(e) => set({ runway_months: e.target.value === '' ? '' : num(e.target.value) })} />
                      </Field>
                      <Field label="Monthly burn ($)" htmlFor="ev-burn">
                        <input id="ev-burn" type="number" min={0} step={1000} className={inputCls} value={form.monthly_burn_usd} placeholder="—" onChange={(e) => set({ monthly_burn_usd: e.target.value === '' ? '' : num(e.target.value) })} />
                      </Field>
                      <Field label="SAM ($M)" htmlFor="ev-sam" hint="Blank = sector default">
                        <input id="ev-sam" type="number" min={0} className={inputCls} value={form.sam_usd} placeholder={String(preview.sam_now)} onChange={(e) => set({ sam_usd: e.target.value === '' ? '' : num(e.target.value) })} />
                      </Field>
                      <Field label="SOM ($M)" htmlFor="ev-som" hint="Blank = sector default">
                        <input id="ev-som" type="number" min={0} className={inputCls} value={form.som_usd} placeholder={String(preview.som_now)} onChange={(e) => set({ som_usd: e.target.value === '' ? '' : num(e.target.value) })} />
                      </Field>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field label="Total funding ($)" htmlFor="ev-fund">
                      <input id="ev-fund" type="number" min={0} step={10000} className={inputCls} value={form.funding_total_usd || ''} placeholder="0" onChange={(e) => set({ funding_total_usd: num(e.target.value) })} />
                    </Field>
                    <Field label="Funding rounds" htmlFor="ev-rounds">
                      <input id="ev-rounds" type="number" min={0} className={inputCls} value={form.funding_rounds || ''} placeholder="0" onChange={(e) => set({ funding_rounds: num(e.target.value) })} />
                    </Field>
                    <Field label="Months to funding" htmlFor="ev-time">
                      <input id="ev-time" type="number" min={0} className={inputCls} value={form.time_to_first_funding_months || ''} placeholder="0" onChange={(e) => set({ time_to_first_funding_months: num(e.target.value) })} />
                    </Field>
                  </div>
                </div>
              )}
            </div>

            {/* footer nav */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-line shrink-0">
              <button onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 bg-pane border border-line rounded-lg px-3.5 py-2 hover:bg-tint transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> {step > 1 ? 'Back' : 'Cancel'}
              </button>
              {step < 3 ? (
                <button onClick={() => setStep(step + 1)} disabled={step === 1 && !form.name.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-[13px] font-medium px-4 py-2 hover:bg-accent-deep transition-colors disabled:opacity-60">
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button onClick={submit} disabled={!form.name.trim() || evaluating}
                  className="relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-lg bg-accent text-white text-[13px] font-medium px-5 py-2 hover:bg-accent-deep transition-colors disabled:opacity-60 min-w-[150px]">
                  {evaluating ? (<><span className="absolute inset-y-0 w-1/3 bg-white/20 scanbar" /> Scoring…</>) : (<>Evaluate application <ArrowRight className="w-3.5 h-3.5" /></>)}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="p-5 space-y-4">
            <label className="block border border-dashed border-ink-3 rounded-xl px-4 py-8 text-center cursor-pointer hover:border-accent hover:bg-accent-soft/40 transition-colors">
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { handleCsv(e.target.files?.[0]); e.target.value = ''; }} />
              <Upload className="w-5 h-5 text-ink-3 mx-auto mb-2" />
              <span className="block text-[13px] font-medium text-ink">Upload a CSV of applications</span>
              <span className="block text-xs text-ink-3 mt-1">Click to browse — every row is scored on import</span>
            </label>
            {csvError && <p className="text-xs text-bad">{csvError}</p>}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-ink-3">Columns: name, industry, stage, team, unique_tech, country, funding, rounds, previous exit/investment, revenue, growth, runway, ask, round size.</p>
              <button onClick={downloadCsvTemplate} className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-deep">
                <FileDown className="w-3.5 h-3.5" /> Template
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FileDrop({ label, accept, fileName, hint, icon, onFile }: {
  label: string; accept: string; fileName: string; hint: string; icon: React.ReactNode; onFile: (f: File | undefined | null) => void;
}) {
  return (
    <label className={`block border border-dashed rounded-lg px-3 py-4 text-center cursor-pointer transition-colors ${fileName ? 'border-accent/50 bg-accent-soft/30' : 'border-line hover:border-accent hover:bg-tint/40'}`}>
      <input type="file" accept={accept} className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink">{icon} {label}</span>
      <span className="block text-[11px] mt-1 truncate text-ink-3">{fileName || `Click to upload · ${hint}`}</span>
    </label>
  );
}

/* ========== APP SHELL ========== */

export default function Home() {
  const [view, setView] = useState<View>('overview');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [screening, setScreening] = useState(false);
  const [userStartups, setUserStartups] = useState<Startup[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const all = useMemo(() => [...userStartups, ...mockStartups], [userStartups]);
  const counts = useMemo(() => countVerdicts(all), [all]);
  const nextId = 1000 + userStartups.length;

  const openStartup = (id: number) => {
    setSelectedId(id);
    setFilter('all');
    setView('apps');
  };

  const handleCreate = (created: Startup[]) => {
    if (created.length === 0) return;
    setUserStartups((prev) => [...created, ...prev]);
    setModalOpen(false);
    setFilter('all');
    setSelectedId(created[0].id);
    setView('apps');
  };

  const runScreen = () => {
    if (screening) return;
    setScreening(true);
    setTimeout(() => {
      setScreening(false);
      setFilter('all');
      setView('apps');
    }, 1800);
  };

  const nav: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'apps', label: 'Applications', icon: <Rows3 className="w-4 h-4" /> },
    { key: 'methodology', label: 'Methodology', icon: <BookOpen className="w-4 h-4" /> },
  ];

  const verdictNav: { key: Filter; label: string; dot: string; count: number }[] = [
    { key: 'high', label: 'Pursue', dot: 'bg-good', count: counts.high },
    { key: 'moderate', label: 'Review', dot: 'bg-warn', count: counts.moderate },
    { key: 'low', label: 'Pass', dot: 'bg-bad', count: counts.low },
  ];

  return (
    <div className="h-dvh flex flex-col lg:flex-row bg-canvas text-ink overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-line bg-pane">
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-line">
          <span className="w-7 h-7 rounded-lg bg-accent grid place-items-center font-mono text-[11px] font-semibold text-white">
            DF
          </span>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold">DealFlow AI</div>
            <div className="text-[10px] text-ink-3">IT-Park Ventures · pilot</div>
          </div>
        </div>

        <div className="p-2.5 pb-0">
          <button
            onClick={() => setModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent text-white text-[13px] font-medium py-2.5 hover:bg-accent-deep transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New evaluation
          </button>
        </div>

        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => { setView(n.key); if (n.key === 'apps') setFilter('all'); }}
              className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                view === n.key ? 'bg-accent-soft text-accent-deep' : 'text-ink-2 hover:bg-tint'
              }`}
            >
              {n.icon}
              {n.label}
              {n.key === 'apps' && <span className="ml-auto font-mono text-[11px] text-ink-3">{counts.all}</span>}
            </button>
          ))}
          <div className="pt-4 pb-1 px-2.5 microlabel">Verdicts</div>
          {verdictNav.map((v) => (
            <button
              key={v.key}
              onClick={() => { setFilter(v.key); setView('apps'); }}
              className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
                view === 'apps' && filter === v.key ? 'bg-tint text-ink font-medium' : 'text-ink-2 hover:bg-tint'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${v.dot}`} />
              {v.label}
              <span className="ml-auto font-mono text-[11px] text-ink-3">{v.count}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-line space-y-2">
          <button
            onClick={runScreen}
            disabled={screening}
            className="relative w-full overflow-hidden inline-flex items-center justify-center gap-2 rounded-lg border border-line text-ink-2 text-[13px] font-medium py-2 hover:bg-tint transition-colors disabled:opacity-80"
          >
            {screening ? (
              <>
                <span className="absolute inset-y-0 w-1/3 bg-ink/10 scanbar" />
                Screening cohort…
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Re-run demo screen
              </>
            )}
          </button>
          <p className="text-[10px] text-ink-3 text-center">2026 cohort · 3.2s per batch</p>
        </div>
      </aside>

      {/* Top bar — mobile */}
      <div className="lg:hidden border-b border-line bg-pane">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-accent grid place-items-center font-mono text-[10px] font-semibold text-white">DF</span>
            <span className="text-[13px] font-semibold">DealFlow AI</span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-medium px-3 py-1.5"
          >
            <Plus className="w-3 h-3" /> New evaluation
          </button>
        </div>
        <div className="flex gap-1 px-3 pb-2 overflow-x-auto">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => { setView(n.key); if (n.key === 'apps') setFilter('all'); }}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                view === n.key ? 'bg-accent-soft text-accent-deep' : 'text-ink-2'
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        <div className={`flex-1 min-h-0 ${view === 'apps' ? 'flex flex-col' : 'overflow-y-auto'}`}>
          {view === 'overview' && <OverviewView data={all} counts={counts} onOpenStartup={openStartup} />}
          {view === 'apps' && (
            <AppsView
              data={all}
              counts={counts}
              filter={filter}
              setFilter={setFilter}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
            />
          )}
          {view === 'methodology' && <MethodologyView />}
        </div>
      </main>

      <EvaluateModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreate} nextId={nextId} />
    </div>
  );
}
