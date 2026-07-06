// Dataset import/export — CSV and Excel, parsed entirely in the browser.
// Rows are mapped onto the scoring engine's StartupInput and evaluated on load.

import { evaluateStartup, type Startup } from "@/lib/mock-data";
import { VERDICT } from "@/lib/format";

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "company", "startup", "company_name"],
  industry: ["industry", "sector", "vertical"],
  model: ["business_model", "model", "b2b", "b2b_b2c"],
  stage: ["stage", "development_stage"],
  team: ["team_size", "team", "employees", "headcount"],
  tech: ["unique_tech", "patents", "unique_technology", "proprietary_tech"],
  country: ["country", "country_of_registration", "geography"],
  fund: ["funding_total_usd", "total_funding", "funding", "capital_raised"],
  rounds: ["funding_rounds", "rounds"],
  time: ["time_to_first_funding_months", "months_to_funding", "time_to_funding"],
  exit: ["has_previous_exit", "previous_exit", "exit", "prior_exit"],
  prevInv: ["previous_investment", "received_investment", "prior_investment"],
  rev: ["sales_amount_usd", "revenue", "sales", "arr"],
  growth: ["revenue_growth_pct", "growth", "growth_pct", "mom_growth"],
  runway: ["runway_months", "runway"],
  ask: ["ask_amount_usd", "ask", "ask_to_itpv", "raising"],
  round: ["round_size_usd", "round_size", "total_round_size"],
  founder: ["founder", "founder_name", "ceo"],
  desc: ["description", "summary", "one_liner", "pitch"],
};

const truthy = (v: string) =>
  ["yes", "true", "1", "b2b", "y", "✓"].includes(v.trim().toLowerCase());
const num = (v: string) => Math.max(0, Number(String(v).replace(/[^0-9.]/g, "")) || 0);

function rowsToStartups(rows: string[][], startId: number): Startup[] {
  const clean = rows.filter((r) => r.some((c) => String(c).trim() !== ""));
  if (clean.length < 2)
    throw new Error("The file needs a header row and at least one company.");

  const header = clean[0].map((h) =>
    String(h).trim().toLowerCase().replace(/[\s-]+/g, "_")
  );
  const col = (key: keyof typeof HEADER_ALIASES) =>
    header.findIndex((h) => HEADER_ALIASES[key].includes(h));

  const iName = col("name");
  if (iName < 0)
    throw new Error(
      'No "name" (or "company") column found. Download the template to see the expected format.'
    );

  const idx = {
    name: iName, ind: col("industry"), model: col("model"), stage: col("stage"),
    team: col("team"), tech: col("tech"), country: col("country"), fund: col("fund"),
    rounds: col("rounds"), time: col("time"), exit: col("exit"), prevInv: col("prevInv"),
    rev: col("rev"), growth: col("growth"), runway: col("runway"), ask: col("ask"),
    round: col("round"), founder: col("founder"), desc: col("desc"),
  };

  const cell = (cols: string[], i: number) =>
    i >= 0 && i < cols.length ? String(cols[i] ?? "").trim() : "";
  const opt = (cols: string[], i: number) =>
    i >= 0 && cell(cols, i) !== "" ? num(cell(cols, i)) : undefined;

  return clean.slice(1, 501).map((cols, n) =>
    evaluateStartup(
      {
        name: cell(cols, idx.name) || `Company ${n + 1}`,
        industry: cell(cols, idx.ind) || "SaaS",
        is_b2b: idx.model >= 0 ? truthy(cell(cols, idx.model)) : true,
        stage: cell(cols, idx.stage) || undefined,
        team_size: Math.max(1, num(cell(cols, idx.team)) || 1),
        unique_tech: idx.tech >= 0 ? truthy(cell(cols, idx.tech)) : undefined,
        country: cell(cols, idx.country) || undefined,
        funding_total_usd: num(cell(cols, idx.fund)),
        funding_rounds: num(cell(cols, idx.rounds)),
        time_to_first_funding_months: num(cell(cols, idx.time)),
        has_previous_exit: truthy(cell(cols, idx.exit)),
        previous_investment: idx.prevInv >= 0 ? truthy(cell(cols, idx.prevInv)) : undefined,
        sales_amount_usd: num(cell(cols, idx.rev)),
        revenue_growth_pct: opt(cols, idx.growth),
        runway_months: opt(cols, idx.runway),
        ask_amount_usd: opt(cols, idx.ask),
        round_size_usd: opt(cols, idx.round),
        founder_name: cell(cols, idx.founder) || undefined,
        description: cell(cols, idx.desc) || undefined,
      },
      startId + n
    )
  );
}

function parseCsvText(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(",").map((c) => c.trim()));
}

export async function parseStartupsFromFile(
  file: File,
  startId: number
): Promise<Startup[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = await file.text();
    return rowsToStartups(parseCsvText(text), startId);
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
      defval: "",
    }) as string[][];
    return rowsToStartups(rows.map((r) => r.map((c) => String(c ?? ""))), startId);
  }
  throw new Error("Unsupported file — upload a .csv, .xlsx or .xls file.");
}

/* ---------- template + export ---------- */

const TEMPLATE_HEADER =
  "name,industry,business_model,stage,team_size,unique_tech,country,funding_total_usd,funding_rounds,time_to_first_funding_months,has_previous_exit,previous_investment,sales_amount_usd,revenue_growth_pct,runway_months,ask_amount_usd,round_size_usd";

const TEMPLATE_ROWS = [
  "Helios Robotics,DeepTech,B2B,MVP,8,yes,Uzbekistan,450000,2,7,no,yes,25000,18,14,300000,800000",
  "Cadence Fintech,Fintech,B2B,Launched,12,no,Uzbekistan,1200000,3,5,yes,yes,180000,24,10,750000,2000000",
  "Verdant AgriTech,AgriTech,B2B,Growth,6,yes,Kazakhstan,220000,1,9,no,yes,60000,12,16,200000,500000",
];

function downloadBlob(content: string, filename: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsvTemplate() {
  downloadBlob(
    [TEMPLATE_HEADER, ...TEMPLATE_ROWS].join("\n"),
    "dealflow-import-template.csv"
  );
}

export function exportCsv(data: Startup[]) {
  const rows = [
    ["Rank", "Company", "Industry", "Model", "Stage", "Team", "Funding USD", "Score", "Verdict", "Confidence"],
    ...[...data]
      .sort((a, b) => b.score - a.score)
      .map((s, i) => [
        i + 1, s.name, s.industry, s.is_b2b ? "B2B" : "B2C", s.stage,
        s.team_size, s.funding_total_usd, s.score, VERDICT[s.verdict].action, `${s.confidence}%`,
      ]),
  ];
  downloadBlob(
    rows.map((r) => r.join(",")).join("\n"),
    "dealflow-screening-results.csv"
  );
}
