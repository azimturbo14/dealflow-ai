"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Users, LineChart, Activity, ListOrdered, ScanSearch } from "lucide-react";
import { countVerdicts, type Counts } from "@/lib/format";
import type { Startup } from "@/lib/mock-data";
import { LogoMark } from "@/components/app/Logo";

const STEPS = [
  { icon: ScanSearch, label: "Reading companies", detail: "Normalising fields and filling gaps" },
  { icon: Users, label: "Scoring team & founders", detail: "Execution track record, depth, technical moat" },
  { icon: LineChart, label: "Modelling market growth", detail: "Log-linear regression on sector TAM" },
  { icon: Activity, label: "Assessing traction & risk", detail: "Revenue, runway, competitive density" },
  { icon: ListOrdered, label: "Ranking by conviction", detail: "Weighting four pillars into one score" },
];

export function Processing({
  companies,
  sourceLabel,
  onDone,
}: {
  companies: Startup[];
  sourceLabel: string;
  onDone: () => void;
}) {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const counts: Counts = useMemo(() => countVerdicts(companies), [companies]);
  const doneRef = useRef(false);

  useEffect(() => {
    const total = 2600; // ms
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / total);
      setProgress(t);
      setActive(Math.min(STEPS.length - 1, Math.floor(t * STEPS.length)));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else if (!doneRef.current) {
        doneRef.current = true;
        setActive(STEPS.length);
        setTimeout(onDone, 550);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  const finished = active >= STEPS.length;
  const shown = Math.round(progress * companies.length);

  return (
    <div className="min-h-dvh bg-canvas text-ink grid place-items-center px-5">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl animate-pulse-soft" />
            <div className="relative animate-scale-in">
              <LogoMark size={44} />
            </div>
          </div>
          <h1 className="text-xl font-semibold tracking-tight mt-6">
            {finished ? "Analysis complete" : "Scoring your pipeline"}
          </h1>
          <p className="text-[13px] text-ink-3 mt-1.5">
            {sourceLabel} ·{" "}
            <span className="font-mono text-ink-2 tabular">{shown}</span> / {companies.length} companies
          </p>
        </div>

        {/* progress bar */}
        <div className="mt-8 h-1.5 rounded-full bg-tint overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-100 ease-linear"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

        {/* steps */}
        <div className="mt-8 space-y-1.5">
          {STEPS.map((s, i) => {
            const state = i < active || finished ? "done" : i === active ? "active" : "todo";
            return (
              <div
                key={s.label}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 border transition-all duration-300 ${
                  state === "active"
                    ? "border-accent/30 bg-accent-soft/50"
                    : state === "done"
                    ? "border-transparent bg-transparent"
                    : "border-transparent bg-transparent opacity-45"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 transition-colors ${
                    state === "done"
                      ? "bg-good-soft text-good"
                      : state === "active"
                      ? "bg-accent text-white"
                      : "bg-tint text-ink-3"
                  }`}
                >
                  {state === "done" ? (
                    <Check className="w-4 h-4" />
                  ) : state === "active" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <s.icon className="w-4 h-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-[13px] font-medium text-ink">{s.label}</div>
                  <div className="text-[11px] text-ink-3 truncate">{s.detail}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* result peek */}
        <div
          className={`mt-6 grid grid-cols-3 gap-2 transition-opacity duration-500 ${
            finished ? "opacity-100" : "opacity-0"
          }`}
        >
          {[
            { l: "Pursue", v: counts.high, c: "text-good" },
            { l: "Review", v: counts.moderate, c: "text-warn" },
            { l: "Pass", v: counts.low, c: "text-bad" },
          ].map((k) => (
            <div key={k.l} className="rounded-lg border border-line bg-pane px-3 py-2 text-center">
              <div className={`font-mono text-lg font-semibold tabular ${k.c}`}>{k.v}</div>
              <div className="microlabel text-[9px]">{k.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
