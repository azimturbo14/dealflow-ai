"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft, ChevronDown, TrendingUp, CircleCheck, CircleX, TriangleAlert,
  Sparkles, ArrowRight, Users, LineChart, Wallet, Swords, ClipboardList,
  FileText, Building2, Quote,
} from "lucide-react";
import type { Startup, Pillar } from "@/lib/mock-data";
import { VERDICT, fmtMoney0 } from "@/lib/format";
import {
  Card, VerdictBadge, ScoreRing, Meter, ConfidenceMeter, SectionLabel, Badge, Button,
} from "@/components/app/primitives";
import { ForecastChart } from "@/components/app/ForecastChart";
import { cn } from "@/lib/utils";

const PILLAR_TONE: Record<Pillar["key"], "accent" | "good" | "warn" | "ink"> = {
  team: "accent", traction: "good", market: "warn", macro: "ink",
};
const PILLAR_HEX: Record<Pillar["key"], string> = {
  team: "var(--accent)", traction: "var(--good)", market: "var(--warn)", macro: "var(--ink-3)",
};

/* ---------- narrative synthesis (deterministic, from the data) ---------- */

function buildThesis(s: Startup): string {
  const fc = s.market_forecast;
  const model = s.is_b2b ? "B2B" : "B2C";
  const marketLine =
    fc.cagr >= 0.25
      ? `It plays into a fast-growing market — a regression on ${s.industry} TAM projects ${(fc.cagr * 100).toFixed(0)}% annual growth`
      : fc.cagr >= 0.12
      ? `The ${s.industry} market is growing at a healthy modeled ${(fc.cagr * 100).toFixed(0)}% CAGR`
      : `The ${s.industry} market is expanding slowly (${(fc.cagr * 100).toFixed(0)}% modeled CAGR), which caps the ceiling`;
  const tracLine =
    s.sales_amount_usd > 0
      ? `with ${fmtMoney0(s.sales_amount_usd)} of revenue already validating demand`
      : `though it remains pre-revenue, so product-market fit is still unproven`;
  const teamLine = s.has_previous_exit
    ? "A founder with a prior exit materially de-risks execution"
    : s.unique_tech
    ? "Proprietary technology gives it a defensible edge"
    : "Execution rests on a first-time team, the central risk to underwrite";
  const verdictLine =
    s.verdict === "high"
      ? "On balance it clears the bar for a closer look and a first partner conversation."
      : s.verdict === "moderate"
      ? "It is a credible but not yet compelling case — worth a second pass once the open questions are answered."
      : "As it stands the case is below the bar, and would need a step-change in traction or team to revisit.";
  return `${s.name} is a ${model} ${s.industry.toLowerCase()} company at the ${s.stage.toLowerCase()} stage. ${marketLine}, ${tracLine}. ${teamLine}. ${verdictLine}`;
}

function buildNextSteps(s: Startup): { title: string; detail: string }[] {
  const steps: { title: string; detail: string }[] = [];
  if (s.verdict === "high") {
    steps.push({ title: "Schedule a first founder call", detail: "The pipeline ranks this among your strongest opportunities — move quickly while it's raising." });
    steps.push({ title: "Request the data room", detail: "Pull the full financial model, cap table and customer references to pressure-test the thesis." });
  } else if (s.verdict === "moderate") {
    steps.push({ title: "Resolve the open questions", detail: "Get the missing traction and market detail before committing partner time." });
  } else {
    steps.push({ title: "Log the pass rationale", detail: "Record why it fell short so the decision is auditable and revisitable." });
  }
  if (s.confidence < 70)
    steps.push({ title: "Request the missing materials", detail: `Data confidence is ${s.confidence}% — the pitch deck or financial model would sharpen the verdict.` });
  if (s.sales_amount_usd === 0 && s.verdict !== "low")
    steps.push({ title: "Validate product-market fit", detail: "It's pre-revenue — look for design partners, LOIs or pipeline as early demand evidence." });
  if (s.market_forecast.cagr >= 0.25)
    steps.push({ title: "Confirm the market wedge", detail: `The ${(s.market_forecast.cagr * 100).toFixed(0)}% market is attractive but competitive — verify a specific entry point.` });
  return steps.slice(0, 4);
}

function similarCompanies(s: Startup, all: Startup[]): Startup[] {
  const others = all.filter((x) => x.id !== s.id);
  const sameSector = others
    .filter((x) => x.industry === s.industry)
    .sort((a, b) => Math.abs(a.score - s.score) - Math.abs(b.score - s.score));
  const rest = others
    .filter((x) => x.industry !== s.industry)
    .sort((a, b) => Math.abs(a.score - s.score) - Math.abs(b.score - s.score));
  return [...sameSector, ...rest].slice(0, 4);
}

/* ---------- factor row ---------- */

function FactorRow({
  factor, expanded, onToggle,
}: {
  factor: Startup["pillars"][number]["factors"][number];
  expanded: boolean;
  onToggle: () => void;
}) {
  const dirTone =
    factor.direction === "positive" ? "text-good"
    : factor.direction === "negative" ? "text-bad" : "text-ink-3";
  const barHex =
    factor.direction === "positive" ? "var(--good)"
    : factor.direction === "negative" ? "var(--bad)" : "var(--ink-3)";
  const w = factor.max_impact > 0 ? (factor.impact / factor.max_impact) * 100 : 0;
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 px-5 py-3 text-left transition-colors",
          expanded ? "bg-tint/50" : "hover:bg-tint/40"
        )}
      >
        <span className="text-[13px] font-medium text-ink w-40 lg:w-52 shrink-0 leading-snug">{factor.criterion}</span>
        <span className="flex-1 h-1.5 bg-tint rounded-full overflow-hidden hidden sm:block">
          <span className="block h-full rounded-full" style={{ width: `${w}%`, minWidth: factor.impact !== 0 ? 5 : 0, background: barHex }} />
        </span>
        <span className="hidden md:block text-[11px] text-ink-3 w-36 text-right truncate">{factor.value}</span>
        <span className={cn("font-mono text-xs font-semibold w-12 text-right tabular", dirTone)}>
          +{factor.impact}<span className="text-ink-3">/{factor.max_impact}</span>
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-ink-3 shrink-0 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="px-5 pb-4 pt-1 bg-tint/40">
          <p className="text-[13px] leading-relaxed text-ink-2">{factor.explanation}</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {factor.threshold && (
              <div className="bg-pane border border-line rounded-lg p-3">
                <SectionLabel className="mb-1">Scoring rule</SectionLabel>
                <p className="text-xs leading-snug text-ink">{factor.threshold}</p>
              </div>
            )}
            {factor.benchmark && (
              <div className="bg-pane border border-line rounded-lg p-3">
                <SectionLabel className="mb-1">Benchmark</SectionLabel>
                <p className="text-xs leading-snug text-ink-2">{factor.benchmark}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- section wrapper with icon ---------- */

function MemoSection({
  icon: Icon, num, title, children, aside,
}: {
  icon: typeof Users; num: string; title: string; children: React.ReactNode; aside?: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-20">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-tint border border-line grid place-items-center text-ink-2">
            <Icon className="w-4 h-4" />
          </span>
          <h2 className="text-[15px] font-semibold tracking-tight">
            <span className="font-mono text-[12px] text-ink-3 mr-2">{num}</span>{title}
          </h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/* ============================================================ */

export function CompanyMemo({
  startup, all, onBack, onOpen,
}: {
  startup: Startup;
  all: Startup[];
  onBack: () => void;
  onOpen: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => setExpanded(null), [startup.id]);

  const s = startup;
  const v = VERDICT[s.verdict];
  const mr = s.market_research;
  const ma = s.macro_analysis;
  const fc = s.market_forecast;
  const thesis = useMemo(() => buildThesis(s), [s]);
  const nextSteps = useMemo(() => buildNextSteps(s), [s]);
  const similar = useMemo(() => similarCompanies(s, all), [s, all]);

  const topDrivers = useMemo(
    () =>
      s.pillars
        .flatMap((p) => p.factors.map((f) => ({ f, p })))
        .filter(({ f }) => f.direction === "positive" && f.impact > 0)
        .sort((a, b) => b.f.impact - a.f.impact)
        .slice(0, 3),
    [s]
  );

  const teamPillar = s.pillars.find((p) => p.key === "team")!;
  const tracPillar = s.pillars.find((p) => p.key === "traction")!;
  const mktPillar = s.pillars.find((p) => p.key === "market")!;

  return (
    <div className="animate-fade-in">
      {/* sticky top bar */}
      <div className="sticky top-0 z-20 border-b border-line bg-pane/85 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-5 sm:px-8 h-14">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink transition-colors">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to companies</span><span className="sm:hidden">Back</span>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13px] font-medium text-ink truncate hidden sm:block">{s.name}</span>
            <VerdictBadge verdict={s.verdict} showLabel />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-7">
        {/* hero */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-7 border-b border-line">
          <ScoreRing score={s.score} verdict={s.verdict} size={76} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{s.name}</h1>
              <VerdictBadge verdict={s.verdict} size="md" showLabel />
            </div>
            <p className="text-[14px] text-ink-2 mt-1.5 leading-relaxed max-w-2xl">{s.description}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[12px] text-ink-3">
              <span>{s.industry} · {s.is_b2b ? "B2B" : "B2C"}</span>
              <span>{s.stage} stage</span>
              <span>Team of {s.team_size}</span>
              <span>Founded {s.founding_year}</span>
              <span>{s.country}</span>
              {s.ask_amount_usd > 0 && <span>Asking {fmtMoney0(s.ask_amount_usd)}</span>}
            </div>
          </div>
        </div>

        {/* body: main + rail */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8 mt-7">
          {/* ------- MAIN ------- */}
          <div className="space-y-9 min-w-0">
            {/* Investment thesis */}
            <section>
              <div className="rounded-xl border border-accent/20 bg-accent-soft/40 p-5">
                <div className="flex items-center gap-2 mb-2.5">
                  <Quote className="w-4 h-4 text-accent-deep" />
                  <SectionLabel className="!text-accent-deep">Investment thesis</SectionLabel>
                </div>
                <p className="text-[15px] leading-relaxed text-ink">{thesis}</p>
              </div>
            </section>

            {/* Why it scored this way */}
            <MemoSection
              icon={Sparkles}
              num="01"
              title="Why the model ranked it this way"
              aside={<span className="font-mono text-[12px] text-ink-3">4 pillars = <span className="font-semibold text-ink">{s.score}/100</span></span>}
            >
              {/* top drivers */}
              {topDrivers.length > 0 && (
                <div className="grid sm:grid-cols-3 gap-3 mb-4">
                  {topDrivers.map(({ f }, i) => (
                    <div key={i} className="rounded-lg border border-good/20 bg-good-soft/50 p-3">
                      <div className="flex items-center gap-1.5 text-good">
                        <CircleCheck className="w-3.5 h-3.5" />
                        <span className="font-mono text-[12px] font-semibold">+{f.impact}</span>
                      </div>
                      <div className="text-[12px] font-medium text-ink mt-1.5 leading-snug">{f.criterion}</div>
                      <div className="text-[11px] text-ink-3 mt-0.5">{f.value}</div>
                    </div>
                  ))}
                </div>
              )}

              <Card bodyClassName="p-0">
                {/* pillar summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-b border-line-2">
                  {s.pillars.map((p) => (
                    <div key={p.key} className="bg-canvas border border-line rounded-lg px-3 py-2.5">
                      <div className="microlabel truncate text-[9px]">{p.label}</div>
                      <div className="font-mono text-[15px] font-semibold mt-0.5 tabular">
                        {p.score}<span className="text-ink-3 text-[11px]">/{p.max}</span>
                      </div>
                      <div className="mt-1.5"><Meter value={p.score} max={p.max} tone={PILLAR_TONE[p.key]} /></div>
                    </div>
                  ))}
                </div>
                {/* factors grouped by pillar */}
                {s.pillars.map((p) => (
                  <div key={p.key}>
                    <div className="px-5 pt-3.5 pb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: PILLAR_HEX[p.key] }} />
                      <span className="microlabel">{p.label}</span>
                      <span className="font-mono text-[11px] text-ink-3 tabular">{p.score}/{p.max}</span>
                    </div>
                    <div className="divide-y divide-line-2 border-t border-line-2">
                      {p.factors.map((f, i) => {
                        const id = `${p.key}-${i}`;
                        return (
                          <FactorRow key={id} factor={f} expanded={expanded === id} onToggle={() => setExpanded(expanded === id ? null : id)} />
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="p-5 border-t border-line-2">
                  <ConfidenceMeter value={s.confidence} />
                  <p className="text-[11px] text-ink-3 mt-2">Confidence reflects how much of the pitch-deck and financial data was supplied. Click any factor to see the rule behind it.</p>
                </div>
              </Card>
            </MemoSection>

            {/* Founder assessment */}
            <MemoSection icon={Users} num="02" title="Founder assessment" aside={<span className="font-mono text-[12px] text-ink-3">{teamPillar.score}/{teamPillar.max}</span>}>
              <Card>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                  <Fact label="Founder" value={s.founder_name} />
                  <Fact label="Role" value={s.founder_role} />
                  <Fact label="Prior exit" value={s.has_previous_exit ? "Yes — proven operator" : "No"} tone={s.has_previous_exit ? "good" : undefined} />
                  <Fact label="Proprietary tech" value={s.unique_tech ? "Yes — patents / unique IP" : "None stated"} tone={s.unique_tech ? "good" : undefined} />
                </div>
                {s.founder_background && s.founder_background !== "Not provided" && (
                  <div className="mt-4 pt-4 border-t border-line-2">
                    <SectionLabel className="mb-1.5">Background</SectionLabel>
                    <p className="text-[13px] leading-relaxed text-ink-2">{s.founder_background}</p>
                  </div>
                )}
              </Card>
            </MemoSection>

            {/* Market opportunity */}
            <MemoSection icon={LineChart} num="03" title="Market opportunity" aside={<Badge tone="accent"><TrendingUp className="w-3 h-3" /> Regression model</Badge>}>
              <Card>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <Stat label="Modeled CAGR" value={`${(fc.cagr * 100).toFixed(1)}%`} tone={fc.cagr >= 0.2 ? "good" : "ink"} />
                  <Stat label="Fit quality (R²)" value={fc.r2.toFixed(2)} />
                  <Stat label={`SOM in ${fc.horizon}y`} value={`$${fc.som_exit}M`} tone="good" />
                </div>
                <ForecastChart forecast={fc} />
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-ink-3">
                  <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 bg-ink-2" /> Historical TAM</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed border-accent" /> Projected (95% band)</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-line-2">
                  <Stat label="TAM" value={mr.tam} sub="Total addressable" />
                  <Stat label="SAM" value={mr.sam} sub="Serviceable" />
                  <Stat label="SOM" value={mr.som} sub={`Capture: ${mr.capture_potential}`} tone={mr.capture_potential === "High" ? "good" : mr.capture_potential === "Low" ? "bad" : "warn"} />
                </div>
                <p className="mt-4 text-[13px] leading-relaxed text-ink-2">{mr.som_explanation}</p>
                <div className="mt-4">
                  <SectionLabel className="mb-2">Key trends</SectionLabel>
                  <ul className="space-y-1.5 text-[13px] leading-snug text-ink-2">
                    {mr.key_trends.map((t, i) => (
                      <li key={i} className="flex gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-accent/60 shrink-0 mt-1.5" />{t}</li>
                    ))}
                  </ul>
                </div>
                <p className="mt-4 text-[13px] leading-relaxed text-ink border-l-2 border-accent pl-3">{mr.assessment}</p>
              </Card>
            </MemoSection>

            {/* Traction */}
            <MemoSection icon={TrendingUp} num="04" title="Traction" aside={<span className="font-mono text-[12px] text-ink-3">{tracPillar.score}/{tracPillar.max}</span>}>
              <Card>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Stat label="Revenue" value={fmtMoney0(s.sales_amount_usd)} tone={s.sales_amount_usd > 0 ? "good" : undefined} />
                  <Stat label="Prior investment" value={s.previous_investment ? "Yes" : "No"} tone={s.previous_investment ? "good" : undefined} />
                  <Stat label="Funding rounds" value={String(s.funding_rounds)} />
                  <Stat label="Stage" value={s.stage} />
                </div>
              </Card>
            </MemoSection>

            {/* Financial signals */}
            <MemoSection icon={Wallet} num="05" title="Financial signals">
              <Card>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Stat label="Total funding" value={fmtMoney0(s.funding_total_usd)} />
                  <Stat label="Ask" value={fmtMoney0(s.ask_amount_usd)} tone={s.ask_amount_usd >= 10000 && s.ask_amount_usd <= 1_000_000 ? "good" : s.ask_amount_usd > 1_000_000 ? "warn" : "ink"} />
                  <Stat label="Round size" value={fmtMoney0(s.round_size_usd)} />
                  <Stat label="Revenue model" value={s.revenue_model} />
                  <Stat label="Months to funding" value={s.time_to_first_funding_months > 0 ? `${s.time_to_first_funding_months} mo` : "—"} />
                  <Stat label="Founded" value={String(s.founding_year)} />
                </div>
                <p className="mt-4 text-[12px] leading-relaxed text-ink-3">
                  {s.ask_amount_usd >= 10000 && s.ask_amount_usd <= 1_000_000
                    ? `The ${fmtMoney0(s.ask_amount_usd)} ask sits inside a typical $10K–$1M ticket — a clean fit for an early-stage mandate.`
                    : s.ask_amount_usd > 1_000_000
                    ? `The ${fmtMoney0(s.ask_amount_usd)} ask is above a typical early-stage ticket and may need syndication.`
                    : "No ask was specified, so the round cannot yet be sized against a mandate."}
                </p>
              </Card>
            </MemoSection>

            {/* Competitive position */}
            <MemoSection icon={Swords} num="06" title="Competitive position">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <SectionLabel className="mb-1">Competitive density</SectionLabel>
                    <p className="text-[13px] text-ink-2 max-w-md leading-relaxed mt-1">
                      {mr.competition === "High"
                        ? `${s.industry} is crowded with funded incumbents. A specific niche and a sharp wedge are required to win.`
                        : mr.competition === "Low"
                        ? `A thin competitive field leaves room to establish a category position before incumbents react.`
                        : `Moderate competition — winnable with clear differentiation and speed of execution.`}
                    </p>
                  </div>
                  <Badge tone={mr.competition === "Low" ? "good" : mr.competition === "High" ? "bad" : "warn"}>
                    {mr.competition} competition
                  </Badge>
                </div>
                <div className="mt-4 pt-4 border-t border-line-2 grid grid-cols-2 gap-3">
                  <Stat label="Market viability" value={mr.market_viable ? "Viable" : "Challenged"} tone={mr.market_viable ? "good" : "bad"} />
                  <Stat label="Capture potential" value={mr.capture_potential} tone={mr.capture_potential === "High" ? "good" : mr.capture_potential === "Low" ? "bad" : "warn"} />
                </div>
              </Card>
            </MemoSection>

            {/* Strengths & Risks */}
            <MemoSection icon={Building2} num="07" title="Strengths & risks">
              <div className="grid md:grid-cols-2 gap-4">
                <Card title="Strengths">
                  <ul className="space-y-2.5">
                    {s.strengths.map((x, i) => (
                      <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-ink-2">
                        <CircleCheck className="w-3.5 h-3.5 text-good shrink-0 mt-0.5" />{x}
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card title="Risks & red flags">
                  <ul className="space-y-2.5">
                    {s.red_flags.map((x, i) => (
                      <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-ink-2">
                        <CircleX className="w-3.5 h-3.5 text-bad shrink-0 mt-0.5" />{x}
                      </li>
                    ))}
                  </ul>
                  {s.risks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-line-2 space-y-2">
                      {s.risks.slice(0, 2).map((r, i) => (
                        <div key={i} className="flex gap-2.5 text-[12px] leading-relaxed text-ink-3">
                          <TriangleAlert className="w-3.5 h-3.5 text-warn shrink-0 mt-0.5" />{r}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </MemoSection>

            {/* Supporting evidence */}
            <MemoSection icon={FileText} num="08" title="Supporting evidence" aside={<span className="microlabel">Audit log</span>}>
              <Card>
                <SectionLabel className="mb-2">Decision path</SectionLabel>
                <div className="bg-code rounded-lg px-4 py-4 font-mono text-xs leading-6 overflow-x-auto scroll-thin">
                  {s.decision_path.map((step, i) => {
                    const color = step.includes("PURSUE") ? "text-[#7fd39a] font-semibold"
                      : step.includes("PASS") ? "text-[#f09a83] font-semibold"
                      : step.includes("REVIEW") ? "text-[#e2bb6d] font-semibold"
                      : step.includes("healthy") || step.includes("Strongest") ? "text-[#7fd39a]"
                      : step.includes("slow") || step.includes("Weakest") ? "text-[#f09a83]"
                      : "text-[#b9bdc7]";
                    return (
                      <div key={i} style={{ paddingLeft: `${i * 2}ch` }} className="whitespace-nowrap">
                        {i > 0 && <span className="text-[#565b66]">└─ </span>}
                        <span className={color}>{step}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-line-2">
                  <SectionLabel className="mb-2">Macro context — {s.country}</SectionLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Stat label="GDP growth" value={ma.gdp_growth} />
                    <Stat label="Inflation" value={ma.inflation} tone="warn" />
                    <Stat label="Reg. risk" value={ma.regulatory_risk} tone={ma.regulatory_risk === "Low" ? "good" : ma.regulatory_risk === "High" ? "bad" : "warn"} />
                    <Stat label="FDI" value="Up 23%" tone="good" />
                  </div>
                  <p className="mt-3 text-[12px] leading-relaxed text-ink-3">{ma.assessment}</p>
                </div>
              </Card>
            </MemoSection>
          </div>

          {/* ------- RAIL ------- */}
          <aside className="mt-9 lg:mt-0">
            <div className="lg:sticky lg:top-20 space-y-4">
              {/* recommendation */}
              <div className={cn("rounded-xl border p-5", v.ring, v.soft)}>
                <SectionLabel className={v.text}>Recommendation</SectionLabel>
                <div className={cn("text-2xl font-semibold tracking-tight mt-1.5", v.text)}>{v.action}</div>
                <p className="text-[12px] text-ink-2 mt-1.5 leading-relaxed">{v.label} · {s.score}/100 · {s.confidence}% confidence</p>
              </div>

              {/* next steps */}
              <Card title="Recommended next steps" bodyClassName="p-0">
                <ol className="divide-y divide-line-2">
                  {nextSteps.map((step, i) => (
                    <li key={i} className="flex gap-3 px-4 py-3">
                      <span className="w-5 h-5 rounded-full bg-ink text-canvas grid place-items-center text-[10px] font-semibold shrink-0 mt-0.5 tabular">{i + 1}</span>
                      <div>
                        <div className="text-[13px] font-medium text-ink leading-snug">{step.title}</div>
                        <div className="text-[11px] text-ink-3 mt-0.5 leading-relaxed">{step.detail}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>

              {/* similar companies */}
              {similar.length > 0 && (
                <Card title="Similar companies" bodyClassName="p-0">
                  <div className="divide-y divide-line-2">
                    {similar.map((c) => (
                      <button key={c.id} onClick={() => onOpen(c.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-tint/50 transition-colors group">
                        <span className="w-1.5 h-6 rounded-full shrink-0" style={{ background: VERDICT[c.verdict].hex }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-ink truncate group-hover:text-accent-deep transition-colors">{c.name}</div>
                          <div className="text-[11px] text-ink-3 truncate">{c.industry}</div>
                        </div>
                        <span className="font-mono text-[13px] font-semibold text-ink tabular">{c.score}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-ink-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              <Button variant="outline" size="md" className="w-full" onClick={onBack}>
                <ClipboardList className="w-4 h-4" /> Back to ranking
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ---------- small helpers ---------- */

function Fact({ label, value, tone }: { label: string; value: string; tone?: "good" }) {
  return (
    <div>
      <SectionLabel className="mb-1">{label}</SectionLabel>
      <div className={cn("text-[13px] font-medium", tone === "good" ? "text-good" : "text-ink")}>{value}</div>
    </div>
  );
}

function Stat({
  label, value, sub, tone = "ink",
}: {
  label: string; value: React.ReactNode; sub?: string; tone?: "ink" | "good" | "warn" | "bad";
}) {
  const cls = tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <div className="bg-canvas border border-line rounded-lg px-3 py-2.5">
      <div className="microlabel text-[9px]">{label}</div>
      <div className={cn("font-mono text-[15px] font-semibold mt-0.5 tabular", cls)}>{value}</div>
      {sub && <div className="text-[10px] text-ink-3 mt-0.5">{sub}</div>}
    </div>
  );
}
