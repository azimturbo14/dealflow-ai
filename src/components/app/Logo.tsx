import { cn } from "@/lib/utils";

/** DealFlow brand mark — an upward "flow" glyph in a rounded tile. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path
        d="M8 21.5 L13.5 15 L18 18.5 L24 10"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="10" r="2.1" fill="#ffffff" />
    </svg>
  );
}

export function Logo({
  size = 28,
  showWordmark = true,
  subtitle,
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <div className="leading-none">
          <div className="text-[15px] font-semibold tracking-tight text-ink">
            DealFlow
          </div>
          {subtitle && (
            <div className="text-[10px] text-ink-3 mt-1">{subtitle}</div>
          )}
        </div>
      )}
    </div>
  );
}
