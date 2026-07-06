"use client";

import { useMemo } from "react";
import {
  ArrowUpRight, ArrowRight, Download, Sparkles,
  Trophy, AlertTriangle, Target,
} from "lucide-react";
import type { Startup } from "@/lib/mock-data";
import { VERDICT, countVerdicts, pct, fmtMoney0 } from "@/lib/format";
import { exportCsv } from "@/lib/import";
import {
  Card, StatTile, VerdictBadge, ScoreRing, Button, Meter, SectionLabel,
} from "@/components/app/primitives";

/* ---------- AI insight synthesis (derived, deterministic) ---------- */

function buildInsights(data: Startup[]) {
  if (data.length === 0) return [];
  const sorted = [...data].sort((a, b) => b.score - a.score);
  const counts = countVerdicts(data);
  const top = sorted[0];

  // strongest sector by average score (min 2 companies)
  const bySector = new Map<string, number[]>();
  data.forEach((s) => {
    const arr = bySector.get(s.industry) ?? [];
    arr.push(s.score);
    bySector.set(s.industry, arr);
  });
  const sectorAvgs = [...bySector.entries()]
    .filter(([, arr]) => arr.length >= 2)
    .map(([name, arr]) => ({ name, avg: arr.reduce((a, b) => a + b, 0) / arr.length, n: arr.length }))
    .sort((a, b) => b.avg - a.avg);

  const lowConfidence = data.filter((s) => s.confidence < 65).length;
  const insights: { icon: typeof Trophy; tone: "good" | "warn" | "accent"; title: string; body: string }[] = [];

  insights.push({
    icon: Trophy,
    tone: "good",
    title: `${top.name} leads the pipeline`,
    body: `Scoring ${top.score}/100, it clears the high-conviction bar on the strength of its ${top.pillars.slice().sort((a, b) => b.score / b.max - a.score / a.max)[0].label.toLowerCase()}. ${counts.high} of ${counts.all} companies rank as pursue-worthy.`,
  });

  if (sectorAvgs.length > 0) {
    const s = sectorAvgs[0];
    insights.push({
      icon: Target,
      tone: "accent",
      title: `${s.name} is your strongest sector`,
      body: `Across ${s.n} companies it averages ${Math.round(s.avg)}/100 — the highest of any sector with more than one entry. Concentration here may be worth a deliberate thesis.`,
    });
  }

  if (lowConfidence > 0) {
    insights.push({
      icon: AlertTriangle,
      tone: "warn",
      title: `${lowConfidence} ${lowConfidence === 1 ? "company needs" : "companies need"} more data`,
      body: `Their scores rest on incomplete financials or founder detail. Request the missing material before you rely on the ranking for these names.`,
    });
  }

  return insights.slice(0, 3);
}

export function Dashboard({
  data,
  onOpen,
  onViewAll,
}: {
  data: Startup[];
  onOpen: (id: number) => void;
  onViewAll: () => void;
}) {
  const counts = useMemo(() => countVerdicts(data), [data]);
  const sorted = useMemo(() => [...data].sort((a, b) => b.score - a.score), [data]);
  const insights = useMemo(() => buildInsights(data), [data]);

  const avgScore = data.length
    ? Math.round(data.reduce((a, s) => a + s.score, 0) / data.length)
    : 0;
  const medianScore = useMemo(() => {
    if (!sorted.length) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid].score : Math.round((sorted[mid - 1].score + sorted[mid].score) / 2);
  }, [sorted]);

  const buckets = useMemo(() => {
    const b = Array.from({ length: 10 }, () => 0);
    data.forEach((s) => b[Math.min(9, Math.floor(s.score / 10))]++);
    return b;
  }, [data]);
  const maxBucket = Math.max(1, ...buckets);

  const sectors = useMemo(() => {
    const m = new Map<string, { n: number; sum: number }>();
    data.forEach((s) => {
      const e = m.get(s.industry) ?? { n: 0, sum: 0 };
      e.n++; e.sum += s.score;
      m.set(s.industry, e);
    });
    return [...m.entries()]
      .map(([name, e]) => ({ name, n: e.n, avg: Math.round(e.sum / e.n) }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 6);
  }, [data]);
  const maxSector = Math.max(1, ...sectors.map((s) => s.n));

  const top = sorted.slice(0, 6);

  return (
    <div className="animate-fade-in mx-auto max-w-6xl px-5 sm:px-8 py-7 space-y-8">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio overview</h1>
          <p className="text-[13px] text-ink-3 mt-1">
            {counts.all} companies screened · ranked by investment potential
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCsv(data)}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>

      {/* 1 · Global metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Companies" value={counts.all} sub="in this screen" />
        <StatTile
          label="High conviction"
          value={counts.high}
          tone="good"
          sub={`${pct(counts.high, counts.all)}% of pipeline`}
          accent={<span className="w-2 h-2 rounded-full bg-good" />}
        />
        <StatTile label="Median score" value={medianScore} sub={`avg ${avgScore} / 100`} />
        <StatTile
          label="Need review"
          value={counts.moderate}
          tone="warn"
          sub={`${counts.low} below the bar`}
        />
      </div>

      {/* 2 · AI insights */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-accent-deep" />
          <SectionLabel>What deserves your attention</SectionLabel>
        </div>
        <div className="grid md:grid-cols-3 gap-3 stagger">
          {insights.map((ins) => (
            <div
              key={ins.title}
              className="bg-pane border border-line rounded-xl p-4 shadow-[var(--shadow-xs)]"
            >
              <div
                className={`w-8 h-8 rounded-lg grid place-items-center ${
                  ins.tone === "good" ? "bg-good-soft text-good"
                  : ins.tone === "warn" ? "bg-warn-soft text-warn"
                  : "bg-accent-soft text-accent-deep"
                }`}
              >
                <ins.icon className="w-4 h-4" />
              </div>
              <h3 className="text-[13px] font-semibold text-ink mt-3 leading-snug">{ins.title}</h3>
              <p className="text-[12px] text-ink-2 mt-1.5 leading-relaxed">{ins.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* distribution + sectors */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card title="Score distribution" className="lg:col-span-3">
          <div className="flex items-end gap-1.5 h-32">
            {buckets.map((n, i) => {
              const tone = i <= 3 ? "bg-bad/60" : i <= 6 ? "bg-warn/70" : "bg-good/75";
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-mono text-ink-3 tabular">{n > 0 ? n : ""}</span>
                  <div
                    className={`w-full rounded-t ${n > 0 ? tone : "bg-tint"}`}
                    style={{ height: `${n > 0 ? Math.max(6, (n / maxBucket) * 100) : 4}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-mono text-ink-3">
            <span>0</span><span>50</span><span>100</span>
          </div>
          <div className="mt-5 pt-4 border-t border-line-2">
            <div className="flex h-2 rounded-full overflow-hidden">
              <div className="bg-good" style={{ width: `${pct(counts.high, counts.all)}%` }} />
              <div className="bg-warn" style={{ width: `${pct(counts.moderate, counts.all)}%` }} />
              <div className="bg-bad" style={{ width: `${pct(counts.low, counts.all)}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[12px] text-ink-2">
              <Legend dot="bg-good" label="Pursue" n={counts.high} />
              <Legend dot="bg-warn" label="Review" n={counts.moderate} />
              <Legend dot="bg-bad" label="Pass" n={counts.low} />
            </div>
          </div>
        </Card>

        <Card title="Sectors" subtitle="By company count · average score" className="lg:col-span-2">
          <div className="space-y-3.5">
            {sectors.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-[12px] text-ink-2 w-20 shrink-0 truncate">{s.name}</span>
                <div className="flex-1">
                  <Meter value={s.n} max={maxSector} tone="accent" />
                </div>
                <span className="font-mono text-[11px] text-ink-3 w-4 text-right tabular">{s.n}</span>
                <span
                  className={`font-mono text-[11px] w-7 text-right tabular ${
                    s.avg >= 70 ? "text-good" : s.avg >= 45 ? "text-warn" : "text-bad"
                  }`}
                >
                  {s.avg}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 3 · Highest potential */}
      <Card
        title="Highest potential"
        subtitle="The companies most likely to reward a closer look"
        aside={
          <button
            onClick={onViewAll}
            className="text-[12px] font-medium text-accent-deep hover:underline inline-flex items-center gap-1"
          >
            View all {counts.all} <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        }
        bodyClassName="p-0"
      >
        <div className="divide-y divide-line-2">
          {top.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onOpen(s.id)}
              className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-tint/50 transition-colors group"
            >
              <span className="font-mono text-xs text-ink-3 w-4 tabular">{i + 1}</span>
              <ScoreRing score={s.score} verdict={s.verdict} size={40} />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-ink group-hover:text-accent-deep transition-colors truncate">
                  {s.name}
                </div>
                <div className="text-[11px] text-ink-3 truncate">
                  {s.industry} · {s.is_b2b ? "B2B" : "B2C"} · {s.stage} · team {s.team_size}
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end mr-1">
                <span className="text-[11px] text-ink-3">Ask</span>
                <span className="font-mono text-[12px] text-ink-2 tabular">{fmtMoney0(s.ask_amount_usd)}</span>
              </div>
              <VerdictBadge verdict={s.verdict} />
              <ArrowRight className="w-4 h-4 text-ink-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-line-2">
          <button
            onClick={onViewAll}
            className="w-full inline-flex items-center justify-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink transition-colors"
          >
            Open the full ranking <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </Card>
    </div>
  );
}

function Legend({ dot, label, n }: { dot: string; label: string; n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dot}`} /> {label}{" "}
      <span className="font-mono text-ink-3 tabular">{n}</span>
    </span>
  );
}
