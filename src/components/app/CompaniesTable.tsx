"use client";

import { useMemo, useState } from "react";
import {
  Search, Download, Plus, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, Inbox,
} from "lucide-react";
import type { Startup } from "@/lib/mock-data";
import { VERDICT, countVerdicts, fmtMoney0 } from "@/lib/format";
import { exportCsv } from "@/lib/import";
import { Button, VerdictBadge, EmptyState, Badge } from "@/components/app/primitives";
import { cn } from "@/lib/utils";

type Filter = "all" | "high" | "moderate" | "low";
type SortKey = "score" | "name" | "team_size" | "funding_total_usd" | "ask_amount_usd" | "confidence";

const SORTS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "score", label: "Score", numeric: true },
  { key: "name", label: "Company", numeric: false },
  { key: "team_size", label: "Team", numeric: true },
  { key: "funding_total_usd", label: "Funding", numeric: true },
  { key: "ask_amount_usd", label: "Ask", numeric: true },
  { key: "confidence", label: "Confidence", numeric: true },
];

export function CompaniesTable({
  data,
  onOpen,
  onNew,
}: {
  data: Startup[];
  onOpen: (id: number) => void;
  onNew: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "score", dir: "desc" });
  const counts = useMemo(() => countVerdicts(data), [data]);

  const rows = useMemo(() => {
    let d = data;
    if (filter !== "all") d = d.filter((s) => s.verdict === filter);
    const q = search.trim().toLowerCase();
    if (q)
      d = d.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.industry.toLowerCase().includes(q) ||
          s.founder_name.toLowerCase().includes(q)
      );
    const { key, dir } = sort;
    const mul = dir === "asc" ? 1 : -1;
    return [...d].sort((a, b) => {
      if (key === "name") return mul * a.name.localeCompare(b.name);
      return mul * (((a[key] as number) ?? 0) - ((b[key] as number) ?? 0));
    });
  }, [data, filter, search, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" }
    );

  const tabs: { key: Filter; label: string; n: number; dot?: string }[] = [
    { key: "all", label: "All", n: counts.all },
    { key: "high", label: "Pursue", n: counts.high, dot: "bg-good" },
    { key: "moderate", label: "Review", n: counts.moderate, dot: "bg-warn" },
    { key: "low", label: "Pass", n: counts.low, dot: "bg-bad" },
  ];

  const th = (k: SortKey, label: string, className?: string) => (
    <SortHeader active={sort.key === k} dir={sort.dir} label={label} className={className} onClick={() => toggleSort(k)} />
  );

  return (
    <div className="animate-fade-in mx-auto max-w-6xl px-5 sm:px-8 py-7">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ranked companies</h1>
          <p className="text-[13px] text-ink-3 mt-1">
            {rows.length} of {counts.all} shown · sorted by {SORTS.find((s) => s.key === sort.key)?.label.toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsv(data)}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button size="sm" onClick={onNew}>
            <Plus className="w-3.5 h-3.5" /> Add company
          </Button>
        </div>
      </div>

      {/* controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, sector or founder"
            className="w-full bg-pane border border-line rounded-lg pl-9 pr-3 py-2.5 text-[13px] placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors shadow-[var(--shadow-xs)]"
          />
        </div>
        <div className="flex gap-1 bg-pane border border-line rounded-lg p-1 shadow-[var(--shadow-xs)]">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                filter === t.key ? "bg-ink text-canvas" : "text-ink-2 hover:bg-tint"
              )}
            >
              {t.dot && <span className={cn("w-1.5 h-1.5 rounded-full", filter === t.key ? "bg-canvas" : t.dot)} />}
              {t.label}
              <span className={cn("font-mono tabular", filter === t.key ? "text-canvas/60" : "text-ink-3")}>{t.n}</span>
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-pane border border-line rounded-xl">
          <EmptyState
            icon={<Inbox className="w-5 h-5" />}
            title="No companies match"
            description="Try clearing the search or switching the verdict filter."
            action={
              <Button variant="outline" size="sm" onClick={() => { setSearch(""); setFilter("all"); }}>
                Reset filters
              </Button>
            }
          />
        </div>
      ) : (
        <div className="bg-pane border border-line rounded-xl shadow-[var(--shadow-xs)] overflow-hidden">
          {/* desktop table */}
          <div className="hidden md:block overflow-x-auto scroll-thin">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line-2 bg-canvas/40">
                  <th className="w-12 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-ink-3">#</th>
                  <th className="px-2 py-3">{th("score", "Score")}</th>
                  <th className="px-3 py-3">{th("name", "Company")}</th>
                  <th className="px-3 py-3 hidden lg:table-cell text-[11px] font-semibold uppercase tracking-wide text-ink-3">Sector</th>
                  <th className="px-3 py-3 text-right">{th("team_size", "Team", "justify-end w-full")}</th>
                  <th className="px-3 py-3 text-right hidden lg:table-cell">{th("ask_amount_usd", "Ask", "justify-end w-full")}</th>
                  <th className="px-3 py-3 text-right hidden xl:table-cell">{th("confidence", "Conf.", "justify-end w-full")}</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-3">Verdict</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => (
                  <tr
                    key={s.id}
                    onClick={() => onOpen(s.id)}
                    className="border-b border-line-2 last:border-0 hover:bg-tint/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 font-mono text-[12px] text-ink-3 tabular">{i + 1}</td>
                    <td className="px-2 py-3">
                      <ScoreCell score={s.score} verdict={s.verdict} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-ink group-hover:text-accent-deep transition-colors">{s.name}</span>
                        {s.id >= 1000 && <Badge tone="accent" className="text-[9px] px-1.5 py-0">New</Badge>}
                      </div>
                      <div className="text-[11px] text-ink-3 lg:hidden">{s.industry} · {s.is_b2b ? "B2B" : "B2C"}</div>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell text-[12px] text-ink-2">
                      {s.industry} <span className="text-ink-3">· {s.is_b2b ? "B2B" : "B2C"}</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[12px] text-ink-2 tabular">{s.team_size}</td>
                    <td className="px-3 py-3 text-right font-mono text-[12px] text-ink-2 tabular hidden lg:table-cell">{fmtMoney0(s.ask_amount_usd)}</td>
                    <td className="px-3 py-3 text-right hidden xl:table-cell">
                      <span className={cn("font-mono text-[12px] tabular", s.confidence >= 80 ? "text-good" : s.confidence >= 62 ? "text-warn" : "text-bad")}>{s.confidence}%</span>
                    </td>
                    <td className="px-3 py-3 text-right"><VerdictBadge verdict={s.verdict} /></td>
                    <td className="pr-3"><ChevronRight className="w-4 h-4 text-ink-3 group-hover:translate-x-0.5 transition-transform" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          <div className="md:hidden divide-y divide-line-2">
            {rows.map((s, i) => (
              <button
                key={s.id}
                onClick={() => onOpen(s.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-tint/50 transition-colors"
              >
                <span className="font-mono text-[11px] text-ink-3 w-4 tabular">{i + 1}</span>
                <ScoreCell score={s.score} verdict={s.verdict} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-ink truncate">{s.name}</div>
                  <div className="text-[11px] text-ink-3 truncate">{s.industry} · {s.is_b2b ? "B2B" : "B2C"} · team {s.team_size}</div>
                </div>
                <VerdictBadge verdict={s.verdict} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SortHeader({
  active, dir, label, className, onClick,
}: {
  active: boolean;
  dir: "asc" | "desc";
  label: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide transition-colors",
        active ? "text-ink" : "text-ink-3 hover:text-ink-2",
        className
      )}
    >
      {label}
      {active ? (
        dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      )}
    </button>
  );
}

function ScoreCell({ score, verdict }: { score: number; verdict: Startup["verdict"] }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="w-1.5 h-6 rounded-full" style={{ background: VERDICT[verdict].hex }} />
      <span className="font-mono text-[15px] font-semibold text-ink tabular">{score}</span>
    </div>
  );
}
