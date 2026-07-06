import type { Startup } from "@/lib/mock-data";

/* ---------- verdict system ---------- */

export type Verdict = Startup["verdict"];

export const VERDICT: Record<
  Verdict,
  { label: string; action: string; text: string; bg: string; soft: string; ring: string; hex: string }
> = {
  high: {
    label: "High conviction",
    action: "Pursue",
    text: "text-good",
    bg: "bg-good",
    soft: "bg-good-soft",
    ring: "border-good/25",
    hex: "var(--good)",
  },
  moderate: {
    label: "Worth a look",
    action: "Review",
    text: "text-warn",
    bg: "bg-warn",
    soft: "bg-warn-soft",
    ring: "border-warn/25",
    hex: "var(--warn)",
  },
  low: {
    label: "Below the bar",
    action: "Pass",
    text: "text-bad",
    bg: "bg-bad",
    soft: "bg-bad-soft",
    ring: "border-bad/25",
    hex: "var(--bad)",
  },
};

export type Counts = { all: number; high: number; moderate: number; low: number };

export const countVerdicts = (data: Startup[]): Counts => ({
  all: data.length,
  high: data.filter((s) => s.verdict === "high").length,
  moderate: data.filter((s) => s.verdict === "moderate").length,
  low: data.filter((s) => s.verdict === "low").length,
});

/* ---------- formatters ---------- */

export const fmtMoney = (v: number): string =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`
    : v >= 1000
    ? `$${(v / 1000).toFixed(0)}K`
    : v > 0
    ? `$${v}`
    : "—";

export const fmtMoney0 = (v: number): string => (v > 0 ? fmtMoney(v) : "$0");

export const pct = (n: number, total: number): number =>
  total > 0 ? Math.round((n / total) * 100) : 0;
