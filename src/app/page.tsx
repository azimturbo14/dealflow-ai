'use client';

import { useState, useMemo, useEffect } from 'react';
import { mockStartups, type Startup } from '@/lib/mock-data';

type View = 'home' | 'dashboard' | 'detail' | 'how-it-works';

const VERDICT = {
  high: { label: 'PURSUE', text: 'text-good', bg: 'bg-good' },
  moderate: { label: 'REVIEW', text: 'text-warn', bg: 'bg-warn' },
  low: { label: 'PASS', text: 'text-bad', bg: 'bg-bad' },
} as const;

const fmtMoney = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v > 0 ? `$${(v / 1000).toFixed(0)}K` : '—';

const fmtMoney0 = (v: number) => (v > 0 ? fmtMoney(v) : '$0');

/* ---------- shared primitives ---------- */

function LeaderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 py-2 border-b border-line">
      <span className="microlabel shrink-0">{label}</span>
      <span className="flex-1 border-b border-dotted border-line -translate-y-[3px]" />
      <span className="font-mono text-xs text-ink text-right">{value}</span>
    </div>
  );
}

function SectionHead({ n, title, aside }: { n: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 mb-4 flex-wrap">
      <span className="font-mono text-[11px] text-ink-3">{n}</span>
      <h2 className="font-serif text-2xl tracking-tight text-ink">{title}</h2>
      <div className="flex-1 min-w-8 border-t border-line self-center" />
      {aside}
    </div>
  );
}

function BackLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-3 hover:text-ink transition-colors"
    >
      {children}
    </button>
  );
}

/* ========== SCREEN 1: HOME / INPUT ========== */
function HomeScreen({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [searchValue, setSearchValue] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);

  const runDemo = () => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    setTimeout(() => {
      setIsEvaluating(false);
      onNavigate('dashboard');
    }, 1800);
  };

  return (
    <div className="view-enter">
      <div className="max-w-6xl mx-auto px-5 pt-14 pb-14 sm:pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Thesis */}
          <div className="lg:col-span-7">
            <p className="microlabel mb-5">Deal screening for venture funds</p>
            <h1 className="font-serif text-5xl sm:text-6xl leading-[1.04] tracking-tight text-ink">
              Every application screened.
              <br />
              Every decision <em className="text-good">explained.</em>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-2 max-w-lg">
              DealFlow reads a startup application the way an analyst does — funding history,
              founder record, team, traction — and shows the exact reasoning behind every score.
              No black box.
            </p>
            <div className="mt-9 max-w-md border-t border-line">
              <LeaderRow label="Training data" value="40,000+ startup outcomes" />
              <LeaderRow label="Model" value="Decision tree — fully auditable" />
              <LeaderRow label="Criteria" value="6 signals per application" />
              <LeaderRow label="Throughput" value="50 applications in 3.2s" />
            </div>
          </div>

          {/* Terminal panel */}
          <div className="lg:col-span-5">
            <div className="border border-ink bg-surface">
              <div className="flex items-center justify-between border-b border-ink bg-field px-4 py-2.5">
                <span className="font-mono text-[10px] font-semibold tracking-[0.16em] uppercase text-ink">
                  Run a screen
                </span>
                <span className="font-mono text-[10px] text-ink-3">DF·01</span>
              </div>
              <div className="p-5 sm:p-6 space-y-6">
                <div>
                  <label htmlFor="company" className="microlabel">
                    Single company
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="company"
                      placeholder="Company name…"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && runDemo()}
                      className="flex-1 min-w-0 bg-transparent border-b border-ink-3 focus:border-ink font-mono text-sm px-1 py-2 placeholder:text-ink-3 focus:outline-none transition-colors"
                    />
                    <button
                      onClick={runDemo}
                      className="font-mono text-[11px] font-medium tracking-[0.12em] uppercase bg-ink text-surface px-4 py-2 hover:opacity-85 transition-opacity"
                    >
                      Evaluate
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex-1 border-t border-line" />
                  <span className="font-mono text-[10px] text-ink-3">OR</span>
                  <span className="flex-1 border-t border-line" />
                </div>

                <button
                  onClick={runDemo}
                  className="w-full border border-dashed border-ink-3 px-4 py-6 text-center hover:border-ink hover:bg-field/50 transition-colors"
                >
                  <span className="block font-mono text-[11px] font-medium tracking-[0.12em] uppercase text-ink">
                    CSV batch upload
                  </span>
                  <span className="block mt-1.5 text-sm italic text-ink-3">
                    drag &amp; drop an application export, or click to browse
                  </span>
                </button>

                <div className="border-t border-line pt-5">
                  <p className="text-[15px] leading-snug text-ink-2">
                    Or load the sample cohort — 50 Central Asian tech startups, modeled after
                    typical IT-Park Ventures applicants.
                  </p>
                  <button
                    onClick={runDemo}
                    disabled={isEvaluating}
                    className="mt-4 w-full border border-ink font-mono text-[11px] font-medium tracking-[0.12em] uppercase px-4 py-3 text-ink hover:bg-ink hover:text-surface transition-colors disabled:opacity-80 disabled:hover:bg-transparent disabled:hover:text-ink"
                  >
                    {isEvaluating ? (
                      <span className="caret">Screening 50 applications</span>
                    ) : (
                      'Load sample cohort →'
                    )}
                  </button>
                </div>
              </div>
            </div>
            <p className="microlabel mt-3 text-center">
              No installation · Works from a 6-field application form
            </p>
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div className="border-t border-b border-line bg-surface">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 sm:divide-x divide-line">
          {[
            { value: '40,000+', label: 'Real startup outcomes' },
            { value: '6', label: 'Evaluation criteria' },
            { value: '85%+', label: 'Accuracy on test data' },
            { value: '3.2s', label: 'Per batch of 50' },
          ].map((s, i) => (
            <div key={i} className="px-5 py-5">
              <div className="font-serif text-3xl tracking-tight text-ink">{s.value}</div>
              <div className="microlabel mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========== SCREEN 2: DASHBOARD ========== */
function DashboardScreen({
  onSelectStartup,
  onNavigate,
}: {
  onSelectStartup: (s: Startup) => void;
  onNavigate: (v: View) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'high' | 'moderate' | 'low'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const perPage = 15;

  const filtered = useMemo(() => {
    let data = mockStartups;
    if (filter !== 'all') data = data.filter((s) => s.verdict === filter);
    if (search)
      data = data.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.industry.toLowerCase().includes(search.toLowerCase())
      );
    return data;
  }, [filter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const counts = {
    all: mockStartups.length,
    high: mockStartups.filter((s) => s.verdict === 'high').length,
    moderate: mockStartups.filter((s) => s.verdict === 'moderate').length,
    low: mockStartups.filter((s) => s.verdict === 'low').length,
  };

  const handleExport = () => {
    const rows = [
      ['Company', 'Industry', 'Model', 'Team', 'Funding USD', 'Rounds', 'Score', 'Verdict'],
      ...filtered.map((s) => [
        s.name,
        s.industry,
        s.is_b2b ? 'B2B' : 'B2C',
        s.team_size,
        s.funding_total_usd,
        s.funding_rounds,
        s.score,
        VERDICT[s.verdict].label,
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dealflow-screening-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { key: typeof filter; label: string; marker?: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'high', label: 'Pursue', marker: 'text-good' },
    { key: 'moderate', label: 'Review', marker: 'text-warn' },
    { key: 'low', label: 'Pass', marker: 'text-bad' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-5 py-10 view-enter">
      <BackLink onClick={() => onNavigate('home')}>← New screen</BackLink>

      <div className="mt-4 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="microlabel mb-2">
            Batch result — {counts.all} applications · 3.2s
          </p>
          <h1 className="font-serif text-4xl tracking-tight text-ink">Screening results.</h1>
        </div>
        <button
          onClick={handleExport}
          className="self-start sm:self-auto border border-ink font-mono text-[11px] font-medium tracking-[0.12em] uppercase px-4 py-2 text-ink hover:bg-ink hover:text-surface transition-colors"
        >
          Export CSV ↓
        </button>
      </div>

      {/* Filter tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setFilter(t.key);
                setPage(0);
              }}
              className={`font-mono text-[11px] font-medium tracking-[0.12em] uppercase pb-2 border-b-2 transition-colors ${
                filter === t.key
                  ? 'border-ink text-ink'
                  : 'border-transparent text-ink-3 hover:text-ink'
              }`}
            >
              {t.marker && <span className={`${t.marker} mr-1.5`}>■</span>}
              {t.label} <span className="text-ink-3">{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <input
          placeholder="FILTER BY NAME OR SECTOR…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="w-full sm:w-64 bg-transparent border-b border-line focus:border-ink font-mono text-[11px] tracking-[0.06em] px-1 pb-2 placeholder:text-ink-3 focus:outline-none transition-colors"
        />
      </div>

      {/* Table */}
      <div className="border-t-2 border-ink">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="microlabel text-left py-3 pr-3 w-10 font-medium">N°</th>
                <th className="microlabel text-left py-3 pr-3 font-medium">Company</th>
                <th className="microlabel text-left py-3 pr-3 font-medium hidden md:table-cell">Sector</th>
                <th className="microlabel text-left py-3 pr-3 font-medium hidden sm:table-cell">Team</th>
                <th className="microlabel text-left py-3 pr-3 font-medium hidden lg:table-cell">Raised</th>
                <th className="microlabel text-left py-3 pr-3 font-medium w-36 sm:w-44">Score</th>
                <th className="microlabel text-left py-3 pr-3 font-medium">Verdict</th>
                <th className="py-3 w-16 hidden sm:table-cell"></th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center font-mono text-xs text-ink-3">
                    NO MATCHES — ADJUST THE FILTER OR SEARCH TERM
                  </td>
                </tr>
              )}
              {paged.map((s, i) => {
                const v = VERDICT[s.verdict];
                return (
                  <tr
                    key={s.id}
                    onClick={() => onSelectStartup(s)}
                    className="border-b border-line hover:bg-surface cursor-pointer transition-colors group"
                  >
                    <td className="py-4 pr-3 font-mono text-[11px] text-ink-3">
                      {String(page * perPage + i + 1).padStart(2, '0')}
                    </td>
                    <td className="py-4 pr-3">
                      <span className="font-serif text-[17px] leading-none text-ink group-hover:underline decoration-1 underline-offset-4">
                        {s.name}
                      </span>
                      <span className="block md:hidden font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3 mt-1">
                        {s.industry} · {s.is_b2b ? 'B2B' : 'B2C'}
                      </span>
                    </td>
                    <td className="py-4 pr-3 hidden md:table-cell font-mono text-[11px] uppercase tracking-[0.06em] text-ink-2">
                      {s.industry} <span className="text-ink-3">· {s.is_b2b ? 'B2B' : 'B2C'}</span>
                    </td>
                    <td className="py-4 pr-3 hidden sm:table-cell font-mono text-xs text-ink-2">
                      {s.team_size}
                    </td>
                    <td className="py-4 pr-3 hidden lg:table-cell font-mono text-xs text-ink-2">
                      {fmtMoney(s.funding_total_usd)}
                    </td>
                    <td className="py-4 pr-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex-1 h-[3px] bg-field">
                          <span
                            className={`block h-full ${v.bg}`}
                            style={{ width: `${s.score}%` }}
                          />
                        </span>
                        <span className="font-mono text-xs text-ink w-7 text-right">{s.score}</span>
                      </div>
                    </td>
                    <td className={`py-4 pr-3 font-mono text-[11px] font-medium tracking-[0.1em] ${v.text}`}>
                      ■ {v.label}
                    </td>
                    <td className="py-4 text-right hidden sm:table-cell">
                      <span className="font-mono text-[10px] tracking-[0.1em] text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        MEMO →
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-line">
          <p className="microlabel">
            Showing {filtered.length === 0 ? 0 : page * perPage + 1}–
            {Math.min((page + 1) * perPage, filtered.length)} of {filtered.length} · Select a
            company to open its screening memo
          </p>
          <div className="flex items-center gap-4">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="font-mono text-xs text-ink disabled:text-ink-3 disabled:cursor-default hover:opacity-70"
            >
              ←
            </button>
            <span className="font-mono text-[11px] text-ink-2">
              PAGE {String(page + 1).padStart(2, '0')} / {String(pageCount).padStart(2, '0')}
            </span>
            <button
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => p + 1)}
              className="font-mono text-xs text-ink disabled:text-ink-3 disabled:cursor-default hover:opacity-70"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========== SCREEN 3: STARTUP DETAIL — THE SCREENING MEMO ========== */
function DetailScreen({ startup, onBack }: { startup: Startup; onBack: () => void }) {
  const [expandedFactor, setExpandedFactor] = useState<number | null>(null);
  const v = VERDICT[startup.verdict];
  const memoNo = String(startup.id).padStart(3, '0');
  const baseScore = 30;
  const totalPositive = startup.score_breakdown
    .filter((f) => f.impact > 0)
    .reduce((s, f) => s + f.impact, 0);
  const totalNegative = startup.score_breakdown
    .filter((f) => f.impact < 0)
    .reduce((s, f) => s + Math.abs(f.impact), 0);

  const mr = startup.market_research;
  const ma = startup.macro_analysis;

  return (
    <div className="max-w-4xl mx-auto px-5 py-10 view-enter">
      <BackLink onClick={onBack}>← Back to results</BackLink>

      {/* Memo plate */}
      <div className="border border-ink bg-surface mt-4">
        <div className="flex items-center justify-between border-b border-ink bg-field px-5 py-2.5">
          <span className="font-mono text-[10px] font-semibold tracking-[0.16em] uppercase text-ink">
            Screening memo
          </span>
          <span className="font-mono text-[10px] text-ink-2">
            N° {memoNo} · 2026 COHORT
          </span>
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div className="min-w-0">
              <h1 className="font-serif text-4xl tracking-tight leading-tight text-ink">
                {startup.name}
              </h1>
              <p className="mt-2.5 text-[15px] italic leading-relaxed text-ink-2 max-w-md">
                {startup.description}
              </p>
            </div>
            <div className="sm:text-right shrink-0">
              <div className="flex items-baseline sm:justify-end gap-1.5">
                <span className="font-serif text-7xl leading-none tracking-tight text-ink">
                  {startup.score}
                </span>
                <span className="font-mono text-xs text-ink-3">/ 100</span>
              </div>
              <div className={`stamp mt-4 ${v.text}`}>Recommend · {v.label}</div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-10 border-t border-line pt-1">
            <LeaderRow label="Sector" value={`${startup.industry} · ${startup.is_b2b ? 'B2B' : 'B2C'}`} />
            <LeaderRow label="Team" value={`${startup.team_size} people`} />
            <LeaderRow label="Raised" value={fmtMoney0(startup.funding_total_usd)} />
            <LeaderRow
              label="Rounds"
              value={`${startup.funding_rounds} ${startup.funding_rounds === 1 ? 'round' : 'rounds'}`}
            />
            <LeaderRow label="Founder" value={startup.founder_name} />
            <LeaderRow label="Revenue" value={fmtMoney0(startup.sales_amount_usd)} />
          </div>
        </div>
        <div className="h-1 bg-field">
          <div className={`h-full ${v.bg}`} style={{ width: `${startup.score}%` }} />
        </div>
      </div>

      {/* 01 — Score attribution */}
      <section className="mt-14">
        <SectionHead
          n="01"
          title="Why this score"
          aside={
            <span className="font-mono text-[11px] text-ink-2">
              {baseScore} base <span className="text-good">+{totalPositive}</span>
              {totalNegative > 0 && <span className="text-bad"> −{totalNegative}</span>}
              <span className="font-semibold text-ink"> = {startup.score}</span>
            </span>
          }
        />
        <div className="border-t-2 border-ink">
          {startup.score_breakdown.map((factor, i) => {
            const isExpanded = expandedFactor === i;
            const impactColor =
              factor.impact > 0 ? 'text-good' : factor.impact < 0 ? 'text-bad' : 'text-ink-3';
            const barColor =
              factor.direction === 'positive'
                ? 'bg-good'
                : factor.direction === 'negative'
                ? 'bg-bad'
                : 'bg-ink-3';
            const barWidth =
              factor.max_impact > 0
                ? `${(Math.abs(factor.impact) / factor.max_impact) * 100}%`
                : '0%';
            return (
              <div key={i} className="border-b border-line">
                <button
                  onClick={() => setExpandedFactor(isExpanded ? null : i)}
                  className={`w-full flex items-center gap-4 py-3.5 text-left transition-colors ${
                    isExpanded ? 'bg-surface' : 'hover:bg-surface'
                  }`}
                >
                  <span className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-ink w-40 sm:w-48 shrink-0 leading-snug">
                    {factor.criterion}
                  </span>
                  <span className="flex-1 h-[3px] bg-field">
                    <span
                      className={`block h-full ${barColor}`}
                      style={{ width: barWidth, minWidth: factor.impact !== 0 ? '4px' : '0' }}
                    />
                  </span>
                  <span className="hidden sm:block font-mono text-[11px] text-ink-2 w-44 text-right truncate">
                    {factor.value}
                  </span>
                  <span className={`font-mono text-xs font-semibold w-10 text-right ${impactColor}`}>
                    {factor.impact > 0 ? `+${factor.impact}` : factor.impact}
                  </span>
                  <span className="font-mono text-sm text-ink-3 w-4 text-center">
                    {isExpanded ? '−' : '+'}
                  </span>
                </button>
                {isExpanded && (
                  <div className="bg-surface px-4 pb-5 pt-1">
                    <p className="text-[15px] leading-relaxed text-ink-2 max-w-2xl">
                      {factor.explanation}
                    </p>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {factor.threshold && (
                        <div className="border-l-2 border-ink pl-3.5">
                          <div className="microlabel mb-1">Scoring rule</div>
                          <p className="text-[13px] leading-snug text-ink">{factor.threshold}</p>
                        </div>
                      )}
                      {factor.benchmark && (
                        <div className="border-l-2 border-line pl-3.5">
                          <div className="microlabel mb-1">Industry benchmark</div>
                          <p className="text-[13px] leading-snug text-ink-2">{factor.benchmark}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="microlabel mt-3">
          Click a criterion for the full explanation, scoring rule and industry benchmark
        </p>
      </section>

      {/* 02 — Signals */}
      <section className="mt-14">
        <SectionHead n="02" title="Signals" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
          <div>
            <p className="font-mono text-[10px] font-semibold tracking-[0.16em] uppercase text-good mb-3">
              Strengths — {startup.strengths.length}
            </p>
            <ul className="border-t border-line pt-4 space-y-3">
              {startup.strengths.map((s, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-snug text-ink-2">
                  <span className="font-mono text-[9px] text-good mt-[5px] shrink-0">■</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-mono text-[10px] font-semibold tracking-[0.16em] uppercase text-bad mb-3">
              Red flags — {startup.red_flags.length}
            </p>
            <ul className="border-t border-line pt-4 space-y-3">
              {startup.red_flags.map((s, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-snug text-ink-2">
                  <span className="font-mono text-[9px] text-bad mt-[5px] shrink-0">■</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 03 — Decision path */}
      <section className="mt-14">
        <SectionHead
          n="03"
          title="Decision path"
          aside={<span className="font-mono text-[10px] tracking-[0.14em] text-ink-3">AUDIT LOG</span>}
        />
        <div className="bg-panel px-5 py-5 font-mono text-[13px] leading-7 overflow-x-auto">
          {startup.decision_path.map((step, i) => {
            const isResult = step.startsWith('→');
            const color = step.includes('INVEST')
              ? 'text-[#93bd96] font-semibold'
              : step.includes('PASS')
              ? 'text-[#d99e88] font-semibold'
              : step.includes('REVIEW')
              ? 'text-[#d4b56e] font-semibold'
              : step.includes('→ Yes')
              ? 'text-[#93bd96]'
              : step.includes('→ No')
              ? 'text-[#d99e88]'
              : 'text-[#b9b29b]';
            return (
              <div key={i} style={{ paddingLeft: `${i * 2}ch` }} className="whitespace-nowrap">
                {i > 0 && <span className="text-[#5b5747]">└─ </span>}
                <span className={color}>{step}</span>
              </div>
            );
          })}
        </div>
        <p className="microlabel mt-3">
          The exact path the decision tree followed — each node a yes/no question, every step auditable
        </p>
      </section>

      {/* 04 — Risk assessment */}
      <section className="mt-14">
        <SectionHead n="04" title="Risk assessment" />
        <div className="space-y-8">
          <div>
            <p className="microlabel mb-3">Execution</p>
            <div className="space-y-3">
              {startup.risks.map((risk, i) => (
                <p key={i} className="border-l-2 border-warn pl-4 text-[15px] leading-relaxed text-ink-2">
                  {risk}
                </p>
              ))}
            </div>
          </div>

          <div>
            <p className="microlabel mb-3">Market</p>
            <ul className="space-y-2.5">
              {mr.competition === 'High' ? (
                <>
                  <li className="flex gap-3 text-[15px] leading-snug text-ink-2">
                    <span className="font-mono text-[9px] text-bad mt-[5px] shrink-0">■</span>
                    High competition in {startup.industry} — established players and well-funded competitors dominate
                  </li>
                  <li className="flex gap-3 text-[15px] leading-snug text-ink-2">
                    <span className="font-mono text-[9px] text-bad mt-[5px] shrink-0">■</span>
                    Differentiation is critical to stand out
                  </li>
                  <li className="flex gap-3 text-[15px] leading-snug text-ink-2">
                    <span className="font-mono text-[9px] text-warn mt-[5px] shrink-0">■</span>
                    Market growth of {mr.growth_rate} is strong, but competition may compress margins
                  </li>
                </>
              ) : mr.competition === 'Low' ? (
                <>
                  <li className="flex gap-3 text-[15px] leading-snug text-ink-2">
                    <span className="font-mono text-[9px] text-good mt-[5px] shrink-0">■</span>
                    Low competition in {startup.industry} — few local players exist
                  </li>
                  <li className="flex gap-3 text-[15px] leading-snug text-ink-2">
                    <span className="font-mono text-[9px] text-good mt-[5px] shrink-0">■</span>
                    First-mover advantages available
                  </li>
                  <li className="flex gap-3 text-[15px] leading-snug text-ink-2">
                    <span className="font-mono text-[9px] text-warn mt-[5px] shrink-0">■</span>
                    Market is less proven — may require education and customer development effort
                  </li>
                </>
              ) : (
                <>
                  <li className="flex gap-3 text-[15px] leading-snug text-ink-2">
                    <span className="font-mono text-[9px] text-warn mt-[5px] shrink-0">■</span>
                    Moderate competition in {startup.industry} — demand is validated but not saturated
                  </li>
                  <li className="flex gap-3 text-[15px] leading-snug text-ink-2">
                    <span className="font-mono text-[9px] text-warn mt-[5px] shrink-0">■</span>
                    Positioning and speed of execution will determine market share
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <p className="microlabel mb-3">Macroeconomic</p>
            <ul className="space-y-2.5">
              <li className="flex gap-3 text-[15px] leading-snug text-ink-2">
                <span
                  className={`font-mono text-[9px] mt-[5px] shrink-0 ${
                    ma.regulatory_risk === 'High'
                      ? 'text-bad'
                      : ma.regulatory_risk === 'Medium'
                      ? 'text-warn'
                      : 'text-good'
                  }`}
                >
                  ■
                </span>
                {ma.regulatory_risk === 'High'
                  ? 'High regulatory risk — compliance adds 6–12 months to sales cycles, local certification required'
                  : ma.regulatory_risk === 'Medium'
                  ? 'Moderate regulatory environment — manageable compliance, changes tend to be industry-friendly'
                  : 'Low regulatory risk — minimal compliance burden, faster go-to-market'}
              </li>
              <li className="flex gap-3 text-[15px] leading-snug text-ink-2">
                <span className="font-mono text-[9px] text-ink-3 mt-[5px] shrink-0">■</span>
                Inflation at {ma.inflation} erodes purchasing power
              </li>
              <li className="flex gap-3 text-[15px] leading-snug text-ink-2">
                <span className="font-mono text-[9px] text-ink-3 mt-[5px] shrink-0">■</span>
                {ma.currency_stability}
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 05 — Market research */}
      <section className="mt-14">
        <SectionHead
          n="05"
          title={`Market — ${startup.industry}`}
          aside={
            <span
              className={`font-mono text-[10px] font-semibold tracking-[0.14em] uppercase ${
                mr.market_viable ? 'text-good' : 'text-bad'
              }`}
            >
              ■ {mr.market_viable ? 'Market viable' : 'Market challenged'}
            </span>
          }
        />
        <div className="grid grid-cols-3 border-t-2 border-ink border-b border-line divide-x divide-line">
          {[
            { label: 'TAM — Total', value: mr.tam, sub: 'Total addressable market', color: 'text-ink' },
            { label: 'SAM — Reachable', value: mr.sam, sub: 'Serviceable available market', color: 'text-ink' },
            {
              label: 'SOM — Capturable',
              value: mr.som,
              sub: `Capture potential: ${mr.capture_potential}`,
              color:
                mr.capture_potential === 'High'
                  ? 'text-good'
                  : mr.capture_potential === 'Low'
                  ? 'text-bad'
                  : 'text-warn',
            },
          ].map((cell, i) => (
            <div key={i} className="px-3 sm:px-5 py-4">
              <div className="microlabel">{cell.label}</div>
              <div className={`font-serif text-2xl sm:text-3xl tracking-tight mt-1.5 ${cell.color}`}>
                {cell.value}
              </div>
              <div className="microlabel mt-1.5 normal-case tracking-[0.04em]">{cell.sub}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 border-b border-line divide-x divide-line">
          <div className="px-3 sm:px-5 py-3.5 flex items-baseline justify-between gap-3">
            <span className="microlabel">Market growth</span>
            <span className="font-mono text-sm font-medium text-good">{mr.growth_rate}</span>
          </div>
          <div className="px-3 sm:px-5 py-3.5 flex items-baseline justify-between gap-3">
            <span className="microlabel">Competition</span>
            <span
              className={`font-mono text-sm font-medium ${
                mr.competition === 'Low'
                  ? 'text-good'
                  : mr.competition === 'High'
                  ? 'text-bad'
                  : 'text-warn'
              }`}
            >
              {mr.competition}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <p className="microlabel mb-2">Can this business capture the market?</p>
          <p className="text-[15px] leading-relaxed text-ink-2 max-w-2xl">{mr.som_explanation}</p>
        </div>

        <div className="mt-6">
          <p className="microlabel mb-3">Key trends</p>
          <ul className="space-y-2.5">
            {mr.key_trends.map((t, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-snug text-ink-2">
                <span className="font-mono text-[9px] text-ink-3 mt-[5px] shrink-0">■</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 border-l-2 border-ink pl-4 text-[15px] leading-relaxed text-ink italic">
          {mr.assessment}
        </p>
      </section>

      {/* 06 — Macro context */}
      <section className="mt-14">
        <SectionHead n="06" title="Macro context — Uzbekistan" />
        <div className="grid grid-cols-2 sm:grid-cols-5 border-t-2 border-ink border-b border-line sm:divide-x divide-line">
          {[
            { label: 'GDP growth', value: ma.gdp_growth, color: 'text-ink' },
            { label: 'Inflation', value: ma.inflation, color: 'text-warn' },
            {
              label: 'Reg. risk',
              value: ma.regulatory_risk,
              color:
                ma.regulatory_risk === 'Low'
                  ? 'text-good'
                  : ma.regulatory_risk === 'High'
                  ? 'text-bad'
                  : 'text-warn',
            },
            { label: 'FDI trend', value: 'Up 23%', color: 'text-good' },
            { label: 'Currency', value: '−8% UZS', color: 'text-warn' },
          ].map((cell, i) => (
            <div key={i} className="px-3 sm:px-4 py-4">
              <div className="microlabel">{cell.label}</div>
              <div className={`font-mono text-base font-medium mt-1.5 ${cell.color}`}>{cell.value}</div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[15px] leading-relaxed text-ink-2 max-w-2xl">{ma.assessment}</p>
        <p className="microlabel mt-4">
          Sources: State Statistics Committee &amp; World Bank, Uzbekistan 2024 indicators
        </p>
      </section>

      {/* 07 — Application data */}
      <section className="mt-14">
        <SectionHead n="07" title="Application data" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 border-t border-line">
          {[
            { label: 'Industry', value: startup.industry },
            { label: 'Business model', value: startup.is_b2b ? 'B2B' : 'B2C' },
            { label: 'Team size', value: `${startup.team_size} people` },
            { label: 'Total funding', value: fmtMoney0(startup.funding_total_usd) },
            { label: 'Funding rounds', value: `${startup.funding_rounds}` },
            {
              label: 'Time to first funding',
              value:
                startup.time_to_first_funding_months > 0
                  ? `${startup.time_to_first_funding_months} months`
                  : 'N/A',
            },
            { label: 'Previous founder exit', value: startup.has_previous_exit ? 'Yes' : 'No' },
            { label: 'Revenue', value: fmtMoney0(startup.sales_amount_usd) },
            { label: 'Founder', value: startup.founder_name },
          ].map((item, i) => (
            <LeaderRow key={i} label={item.label} value={item.value} />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ========== SCREEN 4: METHODOLOGY ========== */
function HowItWorksScreen({ onNavigate }: { onNavigate: (v: View) => void }) {
  const steps = [
    {
      num: '01',
      title: 'Input',
      desc: 'Startups enter via CSV upload (batch), manual form entry, or URL scraping. Works even for early-stage startups with no website — just 6–7 basic data points.',
    },
    {
      num: '02',
      title: 'Evaluation',
      desc: 'A trained decision-tree ML model evaluates each startup on funding history, team composition, market type (B2B vs B2C), time-to-funding velocity, and founder track record.',
    },
    {
      num: '03',
      title: 'Ranked output',
      desc: 'Every startup receives a confidence score (0–100), a list of strengths, a list of red flags with written explanations, and the exact decision-tree path showing the logic.',
    },
  ];

  const criteria = [
    { name: 'Previous founder exits', desc: 'Has the founder built and sold a company before?' },
    { name: 'Total funding raised', desc: 'Cumulative capital raised to date (USD)' },
    { name: 'Number of funding rounds', desc: 'How many distinct funding rounds completed' },
    { name: 'Time to first funding', desc: 'Months from founding to first investment' },
    { name: 'Business model', desc: 'B2B vs B2C — B2B has higher survival rates' },
    { name: 'Team size', desc: 'Total full-time team members' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-5 py-10 view-enter">
      <BackLink onClick={() => onNavigate('home')}>← Back</BackLink>

      <p className="microlabel mt-6 mb-3">Methodology</p>
      <h1 className="font-serif text-5xl tracking-tight text-ink">How the screen works.</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-2 max-w-xl">
        A transparent, three-step process from raw application to investment recommendation —
        with nothing hidden in between.
      </p>

      {/* Steps */}
      <div className="mt-10 border-t-2 border-ink">
        {steps.map((step) => (
          <div key={step.num} className="grid grid-cols-12 gap-x-4 gap-y-2 py-6 border-b border-line">
            <span className="col-span-2 sm:col-span-1 font-mono text-sm text-ink-3">{step.num}</span>
            <h3 className="col-span-10 sm:col-span-3 font-serif text-2xl tracking-tight text-ink">
              {step.title}
            </h3>
            <p className="col-span-12 sm:col-span-8 text-[15px] leading-relaxed text-ink-2">
              {step.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Model transparency */}
      <div className="mt-14 bg-panel px-6 sm:px-8 py-8">
        <p className="font-mono text-[10px] font-medium tracking-[0.16em] uppercase text-[#8d8670]">
          Model transparency
        </p>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
          {[
            { value: '40,000+', label: 'Real startup outcomes (training data)' },
            { value: 'Decision tree', label: 'Fully interpretable ML model' },
            { value: '6', label: 'Core evaluation criteria' },
            { value: '85%+', label: 'Accuracy on test data' },
          ].map((stat, i) => (
            <div key={i}>
              <div className="font-serif text-3xl tracking-tight text-[#f1eee3]">{stat.value}</div>
              <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#b9b29b] mt-2 leading-relaxed">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Criteria */}
      <div className="mt-14">
        <h2 className="font-serif text-3xl tracking-tight text-ink mb-5">The six criteria.</h2>
        <div className="border-t-2 border-ink">
          {criteria.map((c, i) => (
            <div key={i} className="grid grid-cols-12 gap-x-4 gap-y-1 py-4 border-b border-line">
              <span className="col-span-2 sm:col-span-1 font-mono text-[11px] text-ink-3 pt-1.5">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="col-span-10 sm:col-span-4 font-serif text-lg text-ink">{c.name}</span>
              <span className="col-span-12 sm:col-span-7 text-[15px] text-ink-2 leading-relaxed sm:pt-0.5">
                {c.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========== MAIN APP ========== */
export default function Home() {
  const [view, setView] = useState<View>('home');
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const handleSelectStartup = (s: Startup) => {
    setSelectedStartup(s);
    setView('detail');
  };

  const handleBack = () => {
    setView('dashboard');
    setSelectedStartup(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <div className="h-[3px] bg-ink" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur-sm border-b border-line">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <button
            onClick={() => setView('home')}
            className="flex items-center gap-3 hover:opacity-75 transition-opacity"
          >
            <span className="w-7 h-7 border-[1.5px] border-ink flex items-center justify-center font-mono text-[10px] font-semibold tracking-[0.08em] text-ink">
              DF
            </span>
            <span className="font-serif text-lg font-medium tracking-tight text-ink">
              DealFlow <em>AI</em>
            </span>
          </button>
          <nav className="flex items-center gap-5 sm:gap-6">
            <button
              onClick={() => setView('home')}
              className={`font-mono text-[11px] font-medium tracking-[0.12em] uppercase pb-1 border-b-2 transition-colors ${
                view !== 'how-it-works'
                  ? 'border-ink text-ink'
                  : 'border-transparent text-ink-3 hover:text-ink'
              }`}
            >
              Screening
            </button>
            <button
              onClick={() => setView('how-it-works')}
              className={`font-mono text-[11px] font-medium tracking-[0.12em] uppercase pb-1 border-b-2 transition-colors ${
                view === 'how-it-works'
                  ? 'border-ink text-ink'
                  : 'border-transparent text-ink-3 hover:text-ink'
              }`}
            >
              Methodology
            </button>
            <span className="hidden md:block microlabel border-l border-line pl-6">
              IT-Park Ventures · Pilot
            </span>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        {view === 'home' && <HomeScreen onNavigate={setView} />}
        {view === 'dashboard' && (
          <DashboardScreen onSelectStartup={handleSelectStartup} onNavigate={setView} />
        )}
        {view === 'detail' && selectedStartup && (
          <DetailScreen key={selectedStartup.id} startup={selectedStartup} onBack={handleBack} />
        )}
        {view === 'how-it-works' && <HowItWorksScreen onNavigate={setView} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-line mt-16">
        <div className="max-w-6xl mx-auto px-5 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="microlabel">DealFlow AI — Partnership proposal for IT-Park Ventures</span>
          <span className="microlabel">Every decision auditable · Demo build 2026</span>
        </div>
      </footer>
    </div>
  );
}
