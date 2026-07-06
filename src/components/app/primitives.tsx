import * as React from "react";
import { cn } from "@/lib/utils";
import { VERDICT, type Verdict } from "@/lib/format";

/* ============================================================
   Buttons
   ============================================================ */

type ButtonVariant = "primary" | "brand" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 select-none disabled:opacity-55 disabled:pointer-events-none whitespace-nowrap";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-canvas hover:bg-ink/90 active:scale-[0.985] shadow-[var(--shadow-xs)]",
  brand:
    "bg-accent text-white hover:bg-accent-deep active:scale-[0.985] shadow-[var(--shadow-xs)]",
  outline:
    "bg-pane text-ink-2 border border-line hover:bg-tint hover:text-ink hover:border-line",
  ghost: "text-ink-2 hover:bg-tint hover:text-ink",
  danger: "bg-bad text-white hover:brightness-95 active:scale-[0.985]",
};

const BTN_SIZE: Record<ButtonSize, string> = {
  sm: "text-[13px] px-3 py-1.5",
  md: "text-[13px] px-4 py-2.5",
  lg: "text-sm px-5 py-3",
};

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }
>(({ variant = "primary", size = "md", className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className)}
    {...props}
  />
));
Button.displayName = "Button";

/* ============================================================
   Surfaces
   ============================================================ */

export function Panel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-pane border border-line rounded-xl shadow-[var(--shadow-xs)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Card({
  title,
  subtitle,
  aside,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "bg-pane border border-line rounded-xl shadow-[var(--shadow-xs)]",
        className
      )}
    >
      {(title || aside) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-line-2">
          <div>
            {title && (
              <h2 className="text-[13px] font-semibold text-ink tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-[12px] text-ink-3 mt-0.5">{subtitle}</p>
            )}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("microlabel", className)}>{children}</div>;
}

/* ============================================================
   Badges
   ============================================================ */

type BadgeTone = "neutral" | "accent" | "good" | "warn" | "bad";

const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: "bg-tint text-ink-2 border-line",
  accent: "bg-accent-soft text-accent-deep border-accent/20",
  good: "bg-good-soft text-good border-good/20",
  warn: "bg-warn-soft text-warn border-warn/20",
  bad: "bg-bad-soft text-bad border-bad/20",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        BADGE_TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function VerdictBadge({
  verdict,
  size = "sm",
  showLabel = false,
}: {
  verdict: Verdict;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  const v = VERDICT[verdict];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium border",
        v.soft,
        v.text,
        v.ring,
        size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[11px]"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", v.bg)} />
      {showLabel ? v.label : v.action}
    </span>
  );
}

/* ============================================================
   Score visualisations
   ============================================================ */

export function ScoreRing({
  score,
  verdict,
  size = 56,
  stroke,
}: {
  score: number;
  verdict: Verdict;
  size?: number;
  stroke?: number;
}) {
  const sw = stroke ?? Math.max(4, Math.round(size * 0.09));
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div
      className="relative shrink-0 grid place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Score ${score} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--tint)"
          strokeWidth={sw}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={VERDICT[verdict].hex}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <span
        className="absolute font-mono font-semibold text-ink tabular"
        style={{ fontSize: size / 3.1 }}
      >
        {score}
      </span>
    </div>
  );
}

export function Meter({
  value,
  max = 100,
  tone = "accent",
  className,
  trackClassName,
}: {
  value: number;
  max?: number;
  tone?: "accent" | "good" | "warn" | "bad" | "ink";
  className?: string;
  trackClassName?: string;
}) {
  const toneCls =
    tone === "good" ? "bg-good"
    : tone === "warn" ? "bg-warn"
    : tone === "bad" ? "bg-bad"
    : tone === "ink" ? "bg-ink-3"
    : "bg-accent";
  const w = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={cn("h-1.5 rounded-full bg-tint overflow-hidden", trackClassName)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", toneCls, className)}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

export function ConfidenceMeter({
  value,
  compact = false,
}: {
  value: number;
  compact?: boolean;
}) {
  const tone = value >= 80 ? "good" : value >= 62 ? "warn" : "bad";
  const textCls =
    tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-bad";
  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1.5"
        title={`Data confidence ${value}%`}
      >
        <span className={cn("font-mono text-[11px] font-semibold", textCls)}>
          {value}%
        </span>
        <span className="text-[11px] text-ink-3">confidence</span>
      </span>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] text-ink-2">Data confidence</span>
        <span className={cn("font-mono text-[13px] font-semibold", textCls)}>
          {value}%
        </span>
      </div>
      <Meter value={value} tone={tone} />
    </div>
  );
}

/* ============================================================
   Stat tile
   ============================================================ */

export function StatTile({
  label,
  value,
  sub,
  tone = "ink",
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "ink" | "good" | "warn" | "bad" | "accent";
  accent?: React.ReactNode;
}) {
  const valueCls =
    tone === "good" ? "text-good"
    : tone === "warn" ? "text-warn"
    : tone === "bad" ? "text-bad"
    : tone === "accent" ? "text-accent-deep"
    : "text-ink";
  return (
    <div className="bg-pane border border-line rounded-xl px-4 py-3.5 shadow-[var(--shadow-xs)]">
      <div className="flex items-center justify-between">
        <div className="microlabel">{label}</div>
        {accent}
      </div>
      <div className={cn("font-mono text-[26px] leading-none font-semibold mt-2 tabular", valueCls)}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-ink-3 mt-1.5">{sub}</div>}
    </div>
  );
}

/* ============================================================
   Sparkline
   ============================================================ */

export function Sparkline({
  points,
  width = 120,
  height = 32,
  stroke = "var(--accent)",
  fill = true,
}: {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: boolean;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = width / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - 3 - ((p - min) / span) * (height - 6);
    return [x, y] as const;
  });
  const line = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      {fill && <path d={area} fill={stroke} opacity={0.08} />}
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ============================================================
   Empty / loading states
   ============================================================ */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6",
        className
      )}
    >
      {icon && (
        <div className="w-11 h-11 rounded-xl bg-tint border border-line grid place-items-center text-ink-3 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description && (
        <p className="text-[13px] text-ink-3 mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-md", className)} />;
}
