"use client";

import {
  ArrowRight, ShieldCheck, Zap, GitBranch, LineChart, Layers,
  Search, FileSearch, Scale, CircleCheck, Quote,
} from "lucide-react";
import { Logo } from "@/components/app/Logo";

/* ---------- illustrative data for the product preview (not the demo cohort) ---------- */
const PREVIEW_ROWS = [
  { rank: 1, name: "Helios Robotics", sector: "DeepTech · B2B", score: 88, tone: "var(--good)" },
  { rank: 2, name: "Cadence Fintech", sector: "Fintech · B2B", score: 82, tone: "var(--good)" },
  { rank: 3, name: "Verdant AgriTech", sector: "AgriTech · B2B", score: 74, tone: "var(--good)" },
  { rank: 4, name: "Northwind AI", sector: "AI/ML · B2B", score: 61, tone: "var(--warn)" },
  { rank: 5, name: "Loop Commerce", sector: "E-commerce · B2C", score: 43, tone: "var(--bad)" },
];

function PreviewRing({ score, tone }: { score: number; tone: string }) {
  const r = 15, c = 2 * Math.PI * r;
  return (
    <div className="relative w-9 h-9 grid place-items-center shrink-0">
      <svg width={36} height={36} className="-rotate-90">
        <circle cx={18} cy={18} r={r} fill="none" stroke="var(--tint)" strokeWidth={3} />
        <circle cx={18} cy={18} r={r} fill="none" stroke={tone} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} />
      </svg>
      <span className="absolute font-mono text-[11px] font-semibold text-ink tabular">{score}</span>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="relative rounded-2xl border border-line bg-pane shadow-[var(--shadow-lg)] overflow-hidden">
      {/* window chrome */}
      <div className="flex items-center gap-2 px-4 h-10 border-b border-line-2 bg-raise">
        <span className="w-2.5 h-2.5 rounded-full bg-ink-3/40" />
        <span className="w-2.5 h-2.5 rounded-full bg-ink-3/30" />
        <span className="w-2.5 h-2.5 rounded-full bg-ink-3/20" />
        <div className="ml-3 flex items-center gap-1.5 text-[11px] text-ink-3">
          <Search className="w-3 h-3" /> 428 companies · ranked in 3.1s
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3">
        {/* metrics rail */}
        <div className="hidden sm:flex flex-col gap-3 p-4 border-r border-line-2 bg-canvas/40">
          {[
            { l: "Screened", v: "428", t: "text-ink" },
            { l: "High conviction", v: "37", t: "text-good" },
            { l: "Median score", v: "58", t: "text-ink" },
          ].map((m) => (
            <div key={m.l} className="bg-pane border border-line rounded-lg px-3 py-2.5">
              <div className="microlabel text-[9px]">{m.l}</div>
              <div className={`font-mono text-xl font-semibold mt-1 tabular ${m.t}`}>{m.v}</div>
            </div>
          ))}
        </div>
        {/* ranked list */}
        <div className="sm:col-span-2 p-3">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="microlabel text-[9px]">Highest potential</span>
            <span className="text-[10px] text-ink-3">Score</span>
          </div>
          <div className="space-y-1">
            {PREVIEW_ROWS.map((r) => (
              <div key={r.rank} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-tint/60 transition-colors">
                <span className="font-mono text-[11px] text-ink-3 w-3">{r.rank}</span>
                <PreviewRing score={r.score} tone={r.tone} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-ink truncate">{r.name}</div>
                  <div className="text-[11px] text-ink-3 truncate">{r.sector}</div>
                </div>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.tone }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- content blocks ---------- */

const CAPABILITIES = [
  { icon: Layers, title: "Rank an entire pipeline at once", body: "Import a spreadsheet of hundreds of companies and get a single, comparable ranking — no more reading decks in a random order." },
  { icon: GitBranch, title: "Explainable by construction", body: "Every score decomposes into four weighted pillars and the exact factors behind them. Nothing is a black box." },
  { icon: LineChart, title: "Market-aware scoring", body: "Growth isn't self-reported. A regression on each sector's historical market size sets the ceiling every company is measured against." },
  { icon: FileSearch, title: "Reads the pitch deck for you", body: "Drop in a PDF or financial model and DealFlow extracts revenue, growth, runway and market size to pre-fill the analysis." },
  { icon: Scale, title: "Consistent, defensible calls", body: "The same rubric is applied to every company, so a partner meeting debates the thesis — not whether the analyst was tired." },
  { icon: Zap, title: "Hours of triage in seconds", body: "What used to be a week of first-pass screening becomes a three-second pass, leaving your time for the companies that matter." },
];

const STEPS = [
  { n: "01", title: "Bring your pipeline", body: "Upload a CSV or Excel export of the companies you're evaluating, or explore a live demo cohort." },
  { n: "02", title: "DealFlow scores every company", body: "Each is evaluated across team, traction, market and deal fit — with a market regression and confidence rating." },
  { n: "03", title: "Act on a clear ranking", body: "Open any company as an investment memo: thesis, evidence, risks and a recommended next step." },
];

const TRUST = [
  { title: "Transparent scoring", body: "Open any factor to see the rule, the threshold and the benchmark it was measured against." },
  { title: "Auditable decisions", body: "A step-by-step decision path records exactly how each recommendation was reached." },
  { title: "Evidence, not vibes", body: "Strengths and risks are tied to the underlying data the company actually provided." },
  { title: "Confidence you can weigh", body: "A data-confidence rating tells you how much of the verdict rests on complete information." },
];

export function Landing({
  onStart,
  onDemo,
}: {
  onStart: () => void;
  onDemo: () => void;
}) {
  return (
    <div className="theme-dark bg-canvas text-ink min-h-dvh overflow-x-hidden scroll-thin">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-8 h-16">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-ink-2">
            <a href="#how" className="hover:text-ink transition-colors">How it works</a>
            <a href="#capabilities" className="hover:text-ink transition-colors">Capabilities</a>
            <a href="#trust" className="hover:text-ink transition-colors">Why it's trusted</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={onDemo} className="hidden sm:inline-flex text-[13px] font-medium text-ink-2 hover:text-ink px-3 py-2 rounded-lg transition-colors">
              Explore demo
            </button>
            <button onClick={onStart} className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-ink text-canvas px-3.5 py-2 rounded-lg hover:opacity-90 transition-opacity">
              Start screening <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 hero-grid pointer-events-none" />
        <div className="absolute inset-0 hero-glow pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-20 pb-16 sm:pt-28 sm:pb-20 text-center">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-line bg-pane/60 px-3 py-1 text-[12px] text-ink-2 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-soft" />
            Investment intelligence for venture capital
          </div>
          <h1 className="animate-fade-up text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05] text-balance max-w-4xl mx-auto" style={{ animationDelay: "0.05s" }}>
            Find the few companies<br className="hidden sm:block" /> worth your conviction.
          </h1>
          <p className="animate-fade-up text-[15px] sm:text-lg text-ink-2 mt-6 max-w-2xl mx-auto leading-relaxed text-balance" style={{ animationDelay: "0.1s" }}>
            DealFlow screens hundreds of startups in a single pass and ranks them by their potential to become exceptional investments — with a transparent rationale behind every score.
          </p>
          <div className="animate-fade-up flex flex-col sm:flex-row items-center justify-center gap-3 mt-9" style={{ animationDelay: "0.15s" }}>
            <button onClick={onStart} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent text-[#04120f] font-semibold text-sm px-6 py-3.5 rounded-xl hover:bg-accent-deep transition-colors shadow-[0_8px_30px_-8px_rgba(45,212,191,0.5)]">
              Start screening <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onDemo} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-line bg-pane/60 text-ink font-medium text-sm px-6 py-3.5 rounded-xl hover:bg-raise transition-colors">
              Explore demo
            </button>
          </div>
          <p className="animate-fade-in text-[12px] text-ink-3 mt-5" style={{ animationDelay: "0.3s" }}>
            No account required · Your files are parsed in your browser and never uploaded
          </p>

          {/* Product preview */}
          <div className="animate-fade-up mt-16 max-w-4xl mx-auto text-left" style={{ animationDelay: "0.2s" }}>
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* Logos / credibility strip */}
      <section className="border-y border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { v: "3.1s", l: "to rank 400+ companies" },
            { v: "4", l: "weighted scoring pillars" },
            { v: "100%", l: "of scores fully explained" },
            { v: "0", l: "data leaves the browser" },
          ].map((s) => (
            <div key={s.l} className="text-center sm:text-left">
              <div className="font-mono text-2xl font-semibold text-ink tabular">{s.v}</div>
              <div className="text-[12px] text-ink-3 mt-1 leading-snug">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-24">
        <div className="max-w-2xl">
          <SectionKicker>How it works</SectionKicker>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3">From a spreadsheet to a shortlist.</h2>
          <p className="text-[15px] text-ink-2 mt-4 leading-relaxed">Three steps between an unread pipeline and a ranked, defensible view of where to spend your attention.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {STEPS.map((s) => (
            <div key={s.n} className="relative rounded-xl border border-line bg-pane p-6 lift">
              <div className="font-mono text-[13px] text-accent font-semibold">{s.n}</div>
              <h3 className="text-lg font-semibold mt-3">{s.title}</h3>
              <p className="text-[13px] text-ink-2 mt-2 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="border-t border-line bg-raise/30">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-24">
          <div className="max-w-2xl">
            <SectionKicker>Capabilities</SectionKicker>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3">Built for the way investors actually decide.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px mt-12 bg-line rounded-2xl overflow-hidden border border-line">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="bg-canvas p-7 hover:bg-pane transition-colors">
                <div className="w-10 h-10 rounded-lg bg-accent-soft border border-accent/20 grid place-items-center text-accent">
                  <c.icon className="w-[18px] h-[18px]" />
                </div>
                <h3 className="text-[15px] font-semibold mt-4">{c.title}</h3>
                <p className="text-[13px] text-ink-2 mt-2 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-14 items-start">
          <div>
            <SectionKicker>Why investors trust it</SectionKicker>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3 text-balance">A verdict you can defend in the partner meeting.</h2>
            <p className="text-[15px] text-ink-2 mt-4 leading-relaxed">
              DealFlow never asks you to take a number on faith. Every recommendation carries its reasoning, its evidence, and an honest measure of how much is known.
            </p>
            <div className="mt-8 rounded-xl border border-line bg-pane p-6">
              <Quote className="w-5 h-5 text-accent" />
              <p className="text-[15px] text-ink mt-3 leading-relaxed">
                “The point isn't to replace judgment. It's to make sure the best company in a stack of four hundred never gets missed because it was read last.”
              </p>
              <div className="text-[12px] text-ink-3 mt-4">The screening principle behind DealFlow</div>
            </div>
          </div>
          <div className="space-y-3">
            {TRUST.map((t) => (
              <div key={t.title} className="flex gap-4 rounded-xl border border-line bg-pane p-5">
                <div className="mt-0.5 text-accent"><CircleCheck className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-[14px] font-semibold">{t.title}</h3>
                  <p className="text-[13px] text-ink-2 mt-1 leading-relaxed">{t.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="relative rounded-3xl border border-line bg-pane overflow-hidden">
            <div className="absolute inset-0 hero-glow opacity-60 pointer-events-none" />
            <div className="relative px-8 sm:px-14 py-14 sm:py-20 text-center">
              <ShieldCheck className="w-8 h-8 text-accent mx-auto" />
              <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight mt-6 text-balance max-w-3xl mx-auto">
                Give your best judgment a head start.
              </h2>
              <p className="text-[15px] sm:text-lg text-ink-2 mt-5 max-w-xl mx-auto leading-relaxed">
                Screen your pipeline in seconds. Spend your hours on the companies that earn them.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9">
                <button onClick={onStart} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent text-[#04120f] font-semibold text-sm px-7 py-3.5 rounded-xl hover:bg-accent-deep transition-colors">
                  Start screening <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={onDemo} className="w-full sm:w-auto inline-flex items-center justify-center border border-line bg-pane text-ink font-medium text-sm px-7 py-3.5 rounded-xl hover:bg-raise transition-colors">
                  Explore demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-[12px] text-ink-3">Investment intelligence for venture capital · Built for institutional deal flow</p>
        </div>
      </footer>
    </div>
  );
}

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-accent uppercase tracking-[0.1em]">
      <span className="w-4 h-px bg-accent" />
      {children}
    </span>
  );
}
