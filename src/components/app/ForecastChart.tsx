import type { Startup } from "@/lib/mock-data";

/** Regression market forecast — historical TAM + projected band. */
export function ForecastChart({ forecast }: { forecast: Startup["market_forecast"] }) {
  const W = 560, H = 200, padL = 38, padR = 14, padT = 14, padB = 26;
  const hist = forecast.history;
  const proj = forecast.projection;
  const allYears = [...hist.map((d) => d.year), ...proj.map((d) => d.year)];
  const minYear = Math.min(...allYears), maxYear = Math.max(...allYears);
  const allVals = [...hist.map((d) => d.tam), ...proj.map((d) => d.hi)];
  const maxVal = Math.max(...allVals) * 1.05;
  const x = (yr: number) => padL + ((yr - minYear) / (maxYear - minYear)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / maxVal) * (H - padT - padB);

  const histPath = hist.map((d, i) => `${i === 0 ? "M" : "L"}${x(d.year).toFixed(1)},${y(d.tam).toFixed(1)}`).join(" ");
  const projLine = proj.map((d, i) => `${i === 0 ? "M" : "L"}${x(d.year).toFixed(1)},${y(d.tam).toFixed(1)}`).join(" ");
  const bandTop = proj.map((d, i) => `${i === 0 ? "M" : "L"}${x(d.year).toFixed(1)},${y(d.hi).toFixed(1)}`).join(" ");
  const bandBottom = proj.slice().reverse().map((d) => `L${x(d.year).toFixed(1)},${y(d.lo).toFixed(1)}`).join(" ");
  const band = `${bandTop} ${bandBottom} Z`;
  const gridVals = [0, maxVal / 2, maxVal];
  const connector = `M${x(hist[hist.length - 1].year)},${y(hist[hist.length - 1].tam)} L${x(proj[0].year)},${y(proj[0].tam)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Market size forecast">
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
          <text x={padL - 7} y={y(v) + 3} textAnchor="end" fontSize="9" fill="var(--ink-3)" fontFamily="var(--font-mono)">
            ${v.toFixed(0)}B
          </text>
        </g>
      ))}
      {allYears.filter((_, i) => i % 2 === 0 || i === allYears.length - 1).map((yr) => (
        <text key={yr} x={x(yr)} y={H - 9} textAnchor="middle" fontSize="9" fill="var(--ink-3)" fontFamily="var(--font-mono)">
          {yr}
        </text>
      ))}
      <path d={band} fill="var(--accent)" opacity="0.09" />
      <path d={histPath} fill="none" stroke="var(--ink-2)" strokeWidth="2" />
      <path d={connector} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
      <path d={projLine} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 4" />
      {hist.map((d) => <circle key={d.year} cx={x(d.year)} cy={y(d.tam)} r="2.5" fill="var(--ink-2)" />)}
      <circle cx={x(proj[proj.length - 1].year)} cy={y(proj[proj.length - 1].tam)} r="3.5" fill="var(--accent)" />
    </svg>
  );
}
