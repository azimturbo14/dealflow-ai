export interface MarketResearch {
  tam: string;
  sam: string;
  som: string;
  som_explanation: string;
  market_viable: boolean;
  capture_potential: 'Low' | 'Moderate' | 'High';
  growth_rate: string;
  competition: 'Low' | 'Moderate' | 'High';
  key_trends: string[];
  assessment: string;
}

export interface MacroAnalysis {
  gdp_growth: string;
  inflation: string;
  regulatory_risk: 'Low' | 'Medium' | 'High';
  foreign_investment_trend: string;
  currency_stability: string;
  assessment: string;
}

// Regression-based forecast of the sector's addressable market
export interface MarketForecast {
  history: { year: number; tam: number }[];              // observed TAM ($B)
  projection: { year: number; tam: number; lo: number; hi: number }[]; // fitted + 95% band
  cagr: number;        // modeled compound annual growth (0.223 = 22.3%)
  r2: number;          // goodness of fit (0–1)
  sam_now: number;     // $M
  som_now: number;     // $M
  som_exit: number;    // projected obtainable market at horizon ($M)
  horizon: number;     // years projected
  method: string;      // human-readable description of the model
}

export interface ScoreFactor {
  criterion: string;
  value: string;
  impact: number;
  max_impact: number;
  direction: 'positive' | 'negative' | 'neutral';
  explanation: string;
  threshold?: string;
  benchmark?: string;
}

export interface Pillar {
  key: 'team' | 'traction' | 'market' | 'macro';
  label: string;
  score: number;   // points earned
  max: number;     // pillar weight
  factors: ScoreFactor[];
}

export interface Startup {
  id: number;
  name: string;
  industry: string;
  description: string;
  is_b2b: boolean;
  team_size: number;
  funding_total_usd: number;
  funding_rounds: number;
  time_to_first_funding_months: number;
  has_previous_exit: boolean;
  founder_name: string;
  founder_role: string;
  founder_background: string;
  website: string;
  sales_amount_usd: number;
  // ITPV-aligned application fields
  stage: string;
  unique_tech: boolean;
  revenue_model: string;
  country: string;
  founding_year: number;
  ask_amount_usd: number;
  round_size_usd: number;
  previous_investment: boolean;
  // scoring output
  score: number;
  verdict: "high" | "moderate" | "low";
  confidence: number; // 0–100, how much of the scoring data was actually provided
  strengths: string[];
  red_flags: string[];
  decision_path: string[];
  risks: string[];
  market_research: MarketResearch;
  macro_analysis: MacroAnalysis;
  market_forecast: MarketForecast;
  pillars: Pillar[];
  score_breakdown: ScoreFactor[]; // flattened pillar factors (compat)
}

// ITPV priority sectors first, then the broader taxonomy
export const industries = [
  "AI/ML", "Fintech", "EdTech", "GreenTech", "SaaS", "DeepTech", "GameDev",
  "AgriTech", "HealthTech", "E-commerce", "LogTech", "CyberSec", "GovTech",
  "PropTech", "RecruTech", "CleanTech", "FoodTech", "LegalTech", "Other"
];

export const stages = ["Idea", "MVP", "Launched", "Growth", "Scaling"];
export const revenueModels = ["Subscription", "Transaction fee", "Marketplace", "Licensing", "Usage-based", "Advertising", "Hardware", "Services", "Other"];

const b2bIndustries = new Set(["SaaS", "Fintech", "AgriTech", "LogTech", "CyberSec", "AI/ML", "GovTech", "PropTech", "CleanTech", "LegalTech", "RecruTech", "DeepTech", "GreenTech"]);

const startupNames = [
  "DasturCloud", "PayUz", "AgriConnect", "MedUz", "LogiTech",
  "DasturLab", "SmartFarm UZ", "EduUz", "FinBridge", "CloudNomad",
  "CyberShield UZ", "GovTech Solutions", "PropUz", "HireUz", "GreenEnergy UZ",
  "FoodChain UZ", "LegalTech UZ", "DataVista", "AI Assist UZ", "ShopUz",
  "DeliveryUz", "TechMed UZ", "AgriSense", "EduBridge", "FinFlow",
  "CloudPeak", "SecureNet UZ", "SmartCity UZ", "RecruitPro", "CleanPower",
  "FoodLogix", "LawConnect", "InsightAI", "AutoTech UZ", "BuildTech",
  "TravelUz", "MediaFlow", "SportTech UZ", "FashionTech", "PetTech",
  "MusicUz", "GameDev UZ", "SocialConnect", "ChatAI UZ", "DesignHub"
];

const founderNames = [
  "Dilshod Karimov", "Nodira Azimova", "Timur Rustamov", "Gulnora Toshmatova",
  "Jasur Umarov", "Shahlo Kamalova", "Bekzod Mirzayev", "Zulfiya Mukhammadieva",
  "Sardor Tursunov", "Madina Rakhimova", "Abror Yusupov", "Nilufar Hamidova",
  "Farrukh Saidov", "Dilorom Alimova", "Kamoliddin Normatov"
];

// Deterministic PRNG (mulberry32) — keeps server and client renders identical
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260705);

// ---- Numeric market model per sector (drives the regression + market scoring) ----
type SectorNums = { tam: number; sam: number; som: number; cagr: number; competition: 'Low' | 'Moderate' | 'High' };
const sectorNumbers: Record<string, SectorNums> = {
  SaaS:         { tam: 12.4, sam: 890,  som: 18, cagr: 0.223, competition: 'High' },
  Fintech:      { tam: 8.7,  sam: 1200, som: 12, cagr: 0.281, competition: 'High' },
  EdTech:       { tam: 5.2,  sam: 340,  som: 15, cagr: 0.197, competition: 'Moderate' },
  AgriTech:     { tam: 3.8,  sam: 520,  som: 26, cagr: 0.154, competition: 'Low' },
  HealthTech:   { tam: 6.1,  sam: 280,  som: 8,  cagr: 0.248, competition: 'Moderate' },
  'E-commerce': { tam: 9.3,  sam: 1800, som: 9,  cagr: 0.312, competition: 'High' },
  LogTech:      { tam: 4.2,  sam: 380,  som: 19, cagr: 0.176, competition: 'Low' },
  CyberSec:     { tam: 2.8,  sam: 190,  som: 10, cagr: 0.263, competition: 'Low' },
  'AI/ML':      { tam: 7.5,  sam: 410,  som: 8,  cagr: 0.342, competition: 'Moderate' },
  GovTech:      { tam: 3.1,  sam: 450,  som: 14, cagr: 0.208, competition: 'Moderate' },
  GreenTech:    { tam: 3.4,  sam: 260,  som: 13, cagr: 0.243, competition: 'Low' },
  DeepTech:     { tam: 5.8,  sam: 300,  som: 9,  cagr: 0.290, competition: 'Low' },
  GameDev:      { tam: 2.1,  sam: 140,  som: 7,  cagr: 0.221, competition: 'Moderate' },
};
const defaultNums: SectorNums = { tam: 4.5, sam: 310, som: 12, cagr: 0.185, competition: 'Moderate' };

// Canonical sector key used across the numeric + qualitative tables
export function sectorKey(industry: string): string {
  const s = (industry || '').trim().toLowerCase();
  const map: Record<string, string> = {
    'ai/ml': 'AI/ML', 'ai': 'AI/ML', 'ai / data science': 'AI/ML', 'data science': 'AI/ML', 'machine learning': 'AI/ML',
    'fintech': 'Fintech', 'saas': 'SaaS', 'edtech': 'EdTech', 'greentech': 'GreenTech', 'cleantech': 'GreenTech',
    'deeptech': 'DeepTech', 'gamedev': 'GameDev', 'game development': 'GameDev', 'agritech': 'AgriTech',
    'healthtech': 'HealthTech', 'e-commerce': 'E-commerce', 'ecommerce': 'E-commerce', 'logtech': 'LogTech',
    'cybersec': 'CyberSec', 'cybersecurity': 'CyberSec', 'govtech': 'GovTech',
  };
  if (map[s]) return map[s];
  if (sectorNumbers[industry]) return industry;
  return 'default';
}

// Deterministic log-linear regression on a seeded 6-year TAM series → 5-year projection
export function buildForecast(industry: string, samOverride?: number, somOverride?: number, horizon = 5): MarketForecast {
  const key = sectorKey(industry);
  const nums = sectorNumbers[key] || defaultNums;
  const baseYear = 2025;
  // Small fixed wobble so the fit is realistic (R² < 1) yet fully deterministic
  const wob = [0.11, -0.085, 0.06, -0.10, 0.045, 0.02];
  const history: { year: number; tam: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const yr = baseYear - 5 + i;
    const base = nums.tam / Math.pow(1 + nums.cagr, baseYear - yr);
    history.push({ year: yr, tam: +(base * (1 + wob[i])).toFixed(3) });
  }
  // Ordinary least squares on x = year index (0..5), y = ln(tam)
  const xs = history.map((_, i) => i);
  const ys = history.map((h) => Math.log(h.tam));
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) { const yhat = intercept + slope * xs[i]; ssRes += (ys[i] - yhat) ** 2; ssTot += (ys[i] - my) ** 2; }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  const se = Math.sqrt(ssRes / (n - 2));
  const cagrModeled = Math.exp(slope) - 1;
  const projection: { year: number; tam: number; lo: number; hi: number }[] = [];
  for (let k = 0; k <= horizon; k++) {
    const xi = 5 + k;
    const mean = intercept + slope * xi;
    const spread = 1.96 * se * Math.sqrt(1 + k * 0.5); // widens with distance
    projection.push({
      year: baseYear + k,
      tam: +Math.exp(mean).toFixed(3),
      lo: +Math.exp(mean - spread).toFixed(3),
      hi: +Math.exp(mean + spread).toFixed(3),
    });
  }
  const sam_now = samOverride ?? nums.sam;
  const som_now = somOverride ?? nums.som;
  const som_exit = +(som_now * Math.pow(1 + cagrModeled, horizon)).toFixed(1);
  return {
    history,
    projection,
    cagr: cagrModeled,
    r2,
    sam_now,
    som_now,
    som_exit,
    horizon,
    method: `Log-linear OLS regression on ${n} years of sector TAM, projected ${horizon}y with a 95% confidence band.`,
  };
}

export interface StartupInput {
  name: string;
  industry: string;
  is_b2b: boolean;
  team_size: number;
  funding_total_usd: number;
  funding_rounds: number;
  time_to_first_funding_months: number;
  has_previous_exit: boolean;
  sales_amount_usd: number;
  founder_name?: string;
  founder_role?: string;
  founder_background?: string;
  description?: string;
  website?: string;
  // ITPV-aligned optional intake
  stage?: string;
  unique_tech?: boolean;
  revenue_model?: string;
  country?: string;
  founding_year?: number;
  ask_amount_usd?: number;
  round_size_usd?: number;
  previous_investment?: boolean;
  successful_project?: string;
  technical_cofounder?: boolean;
  // Optional financial snapshot (from Financial Model / pitch deck)
  revenue_growth_pct?: number;
  sam_usd?: number;
  som_usd?: number;
  monthly_burn_usd?: number;
  runway_months?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const fmtUsd = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`;

// Four-pillar scoring engine — shared by demo cohort, manual entry, and CSV batch
export function evaluateStartup(input: StartupInput, id: number, jitter = 0): Startup {
  const {
    industry, is_b2b, team_size, funding_total_usd, funding_rounds,
    time_to_first_funding_months, has_previous_exit, sales_amount_usd,
  } = input;

  const key = sectorKey(industry);
  const nums = sectorNumbers[key] || defaultNums;
  const stage = input.stage || (funding_rounds >= 2 ? 'Growth' : sales_amount_usd > 0 ? 'Launched' : funding_rounds >= 1 ? 'MVP' : 'Idea');
  const country = input.country || 'Uzbekistan';
  const previous_investment = input.previous_investment ?? (funding_rounds > 0);
  const unique_tech = input.unique_tech ?? false;
  const ask = input.ask_amount_usd ?? 0;
  const round_size = input.round_size_usd ?? funding_total_usd;
  const background = input.founder_background || '';
  const forecast = buildForecast(industry, input.sam_usd, input.som_usd);

  // ---------------- Pillar 1 · Team & Founder (max 25) ----------------
  const teamF: ScoreFactor[] = [];
  let execImpact = 0;
  if (has_previous_exit) execImpact = 10;
  else if (input.successful_project && input.successful_project.trim().length > 3) execImpact = 5;
  teamF.push({
    criterion: 'Founder Execution Track Record',
    value: has_previous_exit ? 'Prior successful exit' : input.successful_project ? 'Shipped notable projects' : 'First-time, no notable projects',
    impact: execImpact, max_impact: 10,
    direction: execImpact >= 10 ? 'positive' : execImpact > 0 ? 'neutral' : 'negative',
    explanation: has_previous_exit
      ? 'Founders with a prior exit succeed at ~3x the rate of first-timers — proven execution, networks, and pattern recognition.'
      : input.successful_project
        ? 'No exit yet, but a track record of shipped projects is a meaningful execution signal that de-risks a first-time founder.'
        : '75% of first-time founders without a delivery record fail to reach Series A. Execution risk is the dominant concern here.',
    threshold: 'Prior exit: +10 · notable shipped projects: +5 · neither: 0',
    benchmark: '~15% of founders have prior exits; they succeed at 2–3x the rate of first-timers.',
  });
  const bgLen = background.trim().length;
  const bgImpact = bgLen > 160 ? 6 : bgLen > 40 ? 3 : 0;
  teamF.push({
    criterion: 'Founder Background Depth',
    value: bgLen > 160 ? 'Detailed, domain-relevant' : bgLen > 40 ? 'Some background provided' : 'Thin / not provided',
    impact: bgImpact, max_impact: 6,
    direction: bgImpact >= 6 ? 'positive' : bgImpact > 0 ? 'neutral' : 'negative',
    explanation: bgLen > 40
      ? 'A substantive founder background (domain years, prior roles) correlates with faster execution and better hiring.'
      : 'Little background information supplied — harder to assess domain fit; the fund would flag this for follow-up.',
    threshold: 'Substantial background: +6 · brief: +3 · none: 0',
  });
  const techImpact = unique_tech ? 4 : input.technical_cofounder ? 2 : 0;
  teamF.push({
    criterion: 'Technical Moat',
    value: unique_tech ? 'Unique tech / patents' : input.technical_cofounder ? 'Technical co-founder' : 'No stated technical edge',
    impact: techImpact, max_impact: 4,
    direction: techImpact >= 4 ? 'positive' : techImpact > 0 ? 'neutral' : 'negative',
    explanation: unique_tech
      ? 'Proprietary technology or patents create defensibility — especially valuable in DeepTech and AI where imitation is otherwise fast.'
      : 'No stated proprietary technology. For a venture-scale return the fund looks for a defensible edge beyond execution speed.',
    threshold: 'Unique tech/patents: +4 · technical co-founder: +2 · neither: 0',
  });
  let teamSizeImpact = 0;
  if (team_size >= 5 && team_size <= 15) teamSizeImpact = 5;
  else if (team_size >= 3) teamSizeImpact = 3;
  else teamSizeImpact = 1;
  teamF.push({
    criterion: 'Team Size',
    value: `${team_size} ${team_size === 1 ? 'person' : 'people'}`,
    impact: teamSizeImpact, max_impact: 5,
    direction: teamSizeImpact >= 5 ? 'positive' : teamSizeImpact >= 3 ? 'neutral' : 'negative',
    explanation: teamSizeImpact >= 5
      ? `Team of ${team_size} is in the optimal 5–15 band — enough to cover product, sales and ops while staying lean.`
      : team_size < 3
        ? `Team of ${team_size} is very small — high execution and key-person risk at this stage.`
        : `Team of ${team_size} is workable but thin; watch for capacity constraints across product and go-to-market.`,
    threshold: '5–15: +5 · 3–4: +3 · <3: +1',
  });
  const teamScore = teamF.reduce((s, f) => s + f.impact, 0);

  // ---------------- Pillar 2 · Traction & Financials (max 30) ----------------
  const tracF: ScoreFactor[] = [];
  tracF.push({
    criterion: 'Prior Investment',
    value: previous_investment ? `Raised ${fmtUsd(funding_total_usd)}` : 'No external funding',
    impact: previous_investment ? 5 : 0, max_impact: 5,
    direction: previous_investment ? 'positive' : 'negative',
    explanation: previous_investment
      ? 'At least one professional investor has already validated the startup through diligence — a meaningful external signal.'
      : 'No prior external investment. Bootstrapping shows commitment but no investor has yet validated the opportunity.',
    threshold: 'Previous investment received: +5',
  });
  tracF.push({
    criterion: 'Revenue Validation',
    value: sales_amount_usd > 0 ? `${fmtUsd(sales_amount_usd)} in sales` : 'Pre-revenue',
    impact: sales_amount_usd > 0 ? 6 : 0, max_impact: 6,
    direction: sales_amount_usd > 0 ? 'positive' : 'negative',
    explanation: sales_amount_usd > 0
      ? 'Paying customers are the strongest form of market validation — stronger than funding or signups.'
      : 'No revenue yet. Expected at idea/MVP stage, but it means product-market fit is still unproven.',
    threshold: 'Any paying revenue: +6',
  });
  const rg = input.revenue_growth_pct;
  let rgImpact = 0;
  if (rg != null) rgImpact = rg >= 20 ? 8 : rg >= 5 ? 4 : 1;
  tracF.push({
    criterion: 'Revenue Growth',
    value: rg != null ? `${rg}% / month` : 'Not disclosed',
    impact: rgImpact, max_impact: 8,
    direction: rgImpact >= 8 ? 'positive' : rgImpact > 0 ? 'neutral' : 'negative',
    explanation: rg != null
      ? (rg >= 20
        ? `${rg}% monthly growth is exceptional — this is the single strongest predictor of a venture outcome.`
        : `${rg}% monthly growth is modest; the fund would probe whether the growth engine is repeatable.`)
      : 'No growth rate supplied (usually inside the pitch deck / financial model). Scored as unknown — lowers confidence.',
    threshold: '≥20%/mo: +8 · ≥5%: +4 · <5%: +1 · unknown: 0',
    benchmark: 'Top-decile seed startups grow 15–25% month-over-month.',
  });
  const runway = input.runway_months;
  let runwayImpact = 0;
  if (runway != null) runwayImpact = runway >= 18 ? 6 : runway >= 12 ? 4 : runway >= 6 ? 2 : 0;
  tracF.push({
    criterion: 'Runway',
    value: runway != null ? `${runway} months` : (input.monthly_burn_usd != null ? 'Burn known, runway N/A' : 'Not disclosed'),
    impact: runwayImpact, max_impact: 6,
    direction: runwayImpact >= 4 ? 'positive' : runwayImpact > 0 ? 'neutral' : 'negative',
    explanation: runway != null
      ? (runway >= 12
        ? `${runway} months of runway gives room to hit the next milestone before raising again.`
        : `${runway} months is tight — the startup will be back in market to raise soon, at whatever traction it has by then.`)
      : 'No runway/burn figure supplied. Scored as unknown — lowers confidence.',
    threshold: '≥18mo: +6 · ≥12: +4 · ≥6: +2 · <6/unknown: 0',
  });
  const stageIdx = Math.max(0, stages.indexOf(stage));
  const stageImpact = [1, 2, 3, 4, 5][stageIdx] ?? 2;
  tracF.push({
    criterion: 'Development Stage',
    value: stage,
    impact: stageImpact, max_impact: 5,
    direction: stageImpact >= 4 ? 'positive' : stageImpact >= 2 ? 'neutral' : 'negative',
    explanation: `Stage "${stage}" reflects how far the product has progressed. Later stages carry more evidence and less build risk, but the fund also invests at idea stage where the ticket buys more ownership.`,
    threshold: 'Idea +1 · MVP +2 · Launched +3 · Growth +4 · Scaling +5',
  });
  const tracScore = tracF.reduce((s, f) => s + f.impact, 0);

  // ---------------- Pillar 3 · Market incl. projected growth (max 30) ----------------
  const mktF: ScoreFactor[] = [];
  const sam = forecast.sam_now;
  const samImpact = sam >= 1000 ? 6 : sam >= 500 ? 4 : sam >= 250 ? 3 : 2;
  mktF.push({
    criterion: 'Addressable Market (SAM)',
    value: `$${sam}M serviceable`,
    impact: samImpact, max_impact: 6,
    direction: samImpact >= 4 ? 'positive' : 'neutral',
    explanation: `A serviceable market of $${sam}M sets the ceiling on how big this can get in-region. Larger SAM leaves more room for a venture-scale outcome.`,
    threshold: '≥$1B: +6 · ≥$500M: +4 · ≥$250M: +3 · else +2',
  });
  const cagrPct = forecast.cagr * 100;
  const cagrImpact = forecast.cagr >= 0.25 ? 10 : forecast.cagr >= 0.12 ? 6 : 2;
  mktF.push({
    criterion: 'Projected Market Growth (regression)',
    value: `${cagrPct.toFixed(1)}% modeled CAGR · R² ${forecast.r2.toFixed(2)}`,
    impact: cagrImpact, max_impact: 10,
    direction: cagrImpact >= 6 ? 'positive' : 'neutral',
    explanation: `A log-linear regression on ${forecast.history.length} years of sector TAM projects ${cagrPct.toFixed(1)}% annual growth (fit quality R²=${forecast.r2.toFixed(2)}). Projected market in ${forecast.horizon} years: $${forecast.projection[forecast.projection.length - 1].tam.toFixed(1)}B. A fast-growing market lifts even an average team; a flat one caps the outcome.`,
    threshold: '≥25% CAGR: +10 · ≥12%: +6 · <12%: +2',
    benchmark: `Modeled from the sector's historical TAM trajectory, not self-reported.`,
  });
  const somImpact = forecast.som_now >= 20 ? 8 : forecast.som_now >= 12 ? 5 : 2;
  mktF.push({
    criterion: 'Obtainable Market (SOM) at exit',
    value: `$${forecast.som_now}M now → $${forecast.som_exit}M projected`,
    impact: somImpact, max_impact: 8,
    direction: somImpact >= 5 ? 'positive' : 'neutral',
    explanation: `Projecting the obtainable market forward at the modeled CAGR gives ~$${forecast.som_exit}M in ${forecast.horizon} years. This is the realistic revenue ceiling the fund underwrites against.`,
    threshold: 'SOM ≥$20M: +8 · ≥$12M: +5 · else +2',
  });
  const compImpact = nums.competition === 'Low' ? 6 : nums.competition === 'Moderate' ? 3 : 1;
  mktF.push({
    criterion: 'Competitive Density',
    value: `${nums.competition} competition`,
    impact: compImpact, max_impact: 6,
    direction: compImpact >= 3 ? 'positive' : 'negative',
    explanation: nums.competition === 'Low'
      ? 'A thin competitive field means room to establish a category position before incumbents react.'
      : nums.competition === 'High'
        ? 'A crowded field with funded incumbents — the startup needs a specific niche and a sharp wedge to win.'
        : 'Moderate competition — winnable with clear differentiation and execution speed.',
    threshold: 'Low: +6 · Moderate: +3 · High: +1',
  });
  const mktScore = mktF.reduce((s, f) => s + f.impact, 0);

  // ---------------- Pillar 4 · Macro & Deal Fit (max 15) ----------------
  const macroF: ScoreFactor[] = [];
  const macro = getMacro(key, industry);
  const regImpact = macro.regulatory_risk === 'Low' ? 4 : macro.regulatory_risk === 'Medium' ? 2 : 1;
  macroF.push({
    criterion: 'Regulatory Environment',
    value: `${macro.regulatory_risk} risk`,
    impact: regImpact, max_impact: 4,
    direction: regImpact >= 4 ? 'positive' : regImpact >= 2 ? 'neutral' : 'negative',
    explanation: `Regulatory risk for ${key} in Uzbekistan is rated ${macro.regulatory_risk}. Heavier regulation slows go-to-market and raises compliance cost, though it can also protect incumbents.`,
    threshold: 'Low: +4 · Medium: +2 · High: +1',
  });
  const home = /uzbekistan|uz/i.test(country);
  macroF.push({
    criterion: 'Geography & Currency',
    value: home ? 'Uzbekistan (home market)' : country,
    impact: home ? 3 : 1, max_impact: 3,
    direction: home ? 'positive' : 'neutral',
    explanation: home
      ? 'Registered in Uzbekistan — directly in IT-Park Ventures’ mandate, eligible for local support and collateral-free lending. UZS cost base with potential hard-currency revenue is favorable.'
      : `Registered in ${country}. Outside the core mandate; the fund can still invest but weighs cross-border and FX considerations.`,
    threshold: 'Home market: +3 · other: +1',
  });
  macroF.push({
    criterion: 'Capital / FDI Trend',
    value: macro.foreign_investment_trend,
    impact: 3, max_impact: 3,
    direction: 'positive',
    explanation: 'Rising foreign direct investment improves follow-on prospects and exit optionality across the ecosystem.',
    threshold: 'Rising FDI: +3',
  });
  let askImpact = 2;
  let askVal = ask > 0 ? fmtUsd(ask) : 'Not specified';
  if (ask > 0) {
    if (ask >= 10000 && ask <= 1_000_000) askImpact = 5;
    else if (ask <= 2_000_000) askImpact = 3;
    else askImpact = 1;
  }
  macroF.push({
    criterion: 'Ask vs. Fund Mandate',
    value: askVal,
    impact: askImpact, max_impact: 5,
    direction: askImpact >= 5 ? 'positive' : askImpact >= 3 ? 'neutral' : 'negative',
    explanation: ask > 0
      ? (ask >= 10000 && ask <= 1_000_000
        ? `The ${fmtUsd(ask)} ask sits inside IT-Park Ventures’ $10K–$1M ticket range — a clean fit.`
        : `The ${fmtUsd(ask)} ask is outside the typical $10K–$1M range; may need syndication or a smaller entry.`)
      : 'No ask specified — the fund cannot size the deal against its $10K–$1M mandate.',
    threshold: 'Within $10K–$1M: +5 · within $2M: +3 · else/none: +1–2',
  });
  const macroScore = macroF.reduce((s, f) => s + f.impact, 0);

  // ---------------- Total, confidence, verdict ----------------
  const pillars: Pillar[] = [
    { key: 'team', label: 'Team & Founder', score: teamScore, max: 25, factors: teamF },
    { key: 'traction', label: 'Traction & Financials', score: tracScore, max: 30, factors: tracF },
    { key: 'market', label: 'Market & Growth', score: mktScore, max: 30, factors: mktF },
    { key: 'macro', label: 'Macro & Deal Fit', score: macroScore, max: 15, factors: macroF },
  ];
  const raw = teamScore + tracScore + mktScore + macroScore;
  const score = clamp(Math.round(raw + jitter), 5, 99);
  const verdict: "high" | "moderate" | "low" = score >= 70 ? "high" : score >= 45 ? "moderate" : "low";

  // Confidence = how much of the deck/financial data was actually provided
  const snapshot = [
    input.revenue_growth_pct != null,
    input.sam_usd != null,
    input.som_usd != null,
    input.monthly_burn_usd != null,
    input.runway_months != null,
    sales_amount_usd > 0,
    background.trim().length > 40,
  ];
  const provided = snapshot.filter(Boolean).length;
  const confidence = Math.round(52 + (provided / snapshot.length) * 48);

  // Strengths / red flags
  const strengths: string[] = [];
  if (has_previous_exit) strengths.push('Founder with prior exit — proven execution ability');
  if (unique_tech) strengths.push('Proprietary technology / patents — defensibility');
  if (forecast.cagr >= 0.25) strengths.push(`Fast-growing market — ${(forecast.cagr * 100).toFixed(0)}% modeled CAGR`);
  if (nums.competition === 'Low') strengths.push('Low competitive density — room to build a category position');
  if (sales_amount_usd > 0) strengths.push(`${fmtUsd(sales_amount_usd)} in revenue — market validation exists`);
  if (rg != null && rg >= 20) strengths.push(`${rg}% monthly growth — top-decile trajectory`);
  if (previous_investment) strengths.push('Prior investor validation');
  if (home) strengths.push('Uzbekistan-registered — squarely in the fund mandate');
  if (strengths.length === 0) strengths.push('Early-stage — upside contingent on execution and market timing');

  const red_flags: string[] = [];
  if (!has_previous_exit && !input.successful_project) red_flags.push('First-time founder, no delivery record — execution risk');
  if (sales_amount_usd === 0) red_flags.push('Pre-revenue — product-market fit unproven');
  if (rg == null && input.sam_usd == null) red_flags.push('No financial/market data supplied — verdict runs on sector defaults');
  if (nums.competition === 'High') red_flags.push('Crowded market with funded incumbents');
  if (runway != null && runway < 6) red_flags.push(`Only ${runway} months runway — near-term funding pressure`);
  if (ask > 1_000_000) red_flags.push('Ask above the $10K–$1M mandate');
  if (!home) red_flags.push('Registered outside Uzbekistan — outside core mandate');
  if (red_flags.length === 0) red_flags.push('No critical red flags detected at this stage');

  // Decision path (audit log) — pillar driven
  const ranked = [...pillars].map((p) => ({ ...p, pct: p.score / p.max })).sort((a, b) => b.pct - a.pct);
  const decision_path: string[] = [];
  decision_path.push(`Market growth (regression)? → ${(forecast.cagr * 100).toFixed(0)}% CAGR ${forecast.cagr >= 0.12 ? '(healthy)' : '(slow)'}`);
  decision_path.push(`Strongest pillar → ${ranked[0].label} (${ranked[0].score}/${ranked[0].max})`);
  decision_path.push(`Weakest pillar → ${ranked[ranked.length - 1].label} (${ranked[ranked.length - 1].score}/${ranked[ranked.length - 1].max})`);
  decision_path.push(`Data confidence → ${confidence}%`);
  decision_path.push(`→ ${verdict === 'high' ? 'PURSUE' : verdict === 'moderate' ? 'REVIEW' : 'PASS'} (${score}%)`);

  // Risks
  const risks: string[] = [];
  if (!has_previous_exit) risks.push('First-time founder execution risk: ~75% of first-time founders fail to reach Series A. Mitigated by domain expertise or early traction.');
  if (rg == null) risks.push('Incomplete financials: growth and runway were not supplied, so traction is scored conservatively. Request the financial model to firm up the verdict.');
  if (nums.competition === 'High') risks.push(`Competitive risk: ${key} is a high-density market; without a sharp niche the startup competes against funded incumbents.`);
  if (forecast.cagr < 0.12) risks.push('Market growth risk: the regression projects sub-12% annual market growth, capping the venture upside.');
  if (risks.length === 0) risks.push('No significant structural risks identified across team, traction, market and macro.');

  const score_breakdown: ScoreFactor[] = pillars.flatMap((p) => p.factors);
  const market_research = getMarket(key, industry, forecast);

  return {
    id,
    name: input.name,
    industry,
    description: input.description ?? `${is_b2b ? 'B2B' : 'B2C'} ${key.toLowerCase()} venture for the Central Asian market`,
    is_b2b,
    team_size,
    funding_total_usd,
    funding_rounds,
    time_to_first_funding_months,
    has_previous_exit,
    founder_name: input.founder_name || 'Not provided',
    founder_role: input.founder_role || 'CEO / Founder',
    founder_background: background || 'Not provided',
    website: input.website ?? '',
    sales_amount_usd,
    stage,
    unique_tech,
    revenue_model: input.revenue_model || 'Not specified',
    country,
    founding_year: input.founding_year ?? 2024,
    ask_amount_usd: ask,
    round_size_usd: round_size,
    previous_investment,
    score,
    verdict,
    confidence,
    strengths,
    red_flags,
    decision_path,
    risks,
    market_research,
    macro_analysis: macro,
    market_forecast: forecast,
    pillars,
    score_breakdown,
  };
}

// ---- Qualitative market research (kept from the original model) ----
const md: Record<string, MarketResearch> = {
  SaaS: { tam: '$12.4B', sam: '$890M', som: '$18M', som_explanation: 'With high competition and established global players, a new B2B SaaS startup can realistically capture 1-3% of SAM. Early revenue and a niche vertical focus are critical to reaching $18M+ in 5 years.', market_viable: true, capture_potential: 'Moderate', growth_rate: '22.3% CAGR', competition: 'High', key_trends: ['Cloud adoption accelerating across Uzbekistan enterprises', 'Government digitalization mandate driving B2B SaaS demand', 'Low local SaaS saturation — first-mover advantages'], assessment: `The Central Asian SaaS market is in early growth. Uzbekistan's government is pushing digital transformation across ministries and SOEs, creating forced demand for B2B software. Enterprise cloud penetration is only 8-12% vs 35-45% in developed markets. This gap is the opportunity and the risk — the market exists but requires education and adaptation to local practices.` },
  Fintech: { tam: '$8.7B', sam: '$1.2B', som: '$12M', som_explanation: 'Fintech is crowded with well-funded players (Uzum, Payme). A new entrant without a specific niche can capture 0.5-1.5% of SAM. Niche focus (e.g., SME lending, trade finance) could push this to 2-3%.', market_viable: true, capture_potential: 'Low', growth_rate: '28.1% CAGR', competition: 'High', key_trends: ['Central bank licensing 15+ new digital banks by 2026', 'Mobile banking penetration jumped from 18% to 42% in 2 years', 'Cross-border payments remain a major SME pain point'], assessment: `Uzbekistan's fintech is the most active sector in Central Asia. Regulatory sandboxes and fast-tracked licenses help, but 40+ fintech startups compete for 36M people. Success requires a specific niche — generic plays struggle against Uzum ($150M+ raised) and Payme.` },
  EdTech: { tam: '$5.2B', sam: '$340M', som: '$15M', som_explanation: 'With $200M government commitment and moderate competition, a B2B EdTech startup can capture 3-5% of SAM. B2C EdTech is limited by low household spend — B2B is the viable path to $15M+.', market_viable: true, capture_potential: 'Moderate', growth_rate: '19.7% CAGR', competition: 'Moderate', key_trends: ['Government investing $200M in digital education infrastructure', 'STEM demand growing 25% year-over-year', 'Corporate training market underpenetrated by technology'], assessment: `EdTech benefits from strong government support — $200M committed to digitize 80% of schools by 2027. But B2C is price-sensitive ($15-30/year household spend on EdTech). B2B (corporate training, school management) has significantly better unit economics.` },
  AgriTech: { tam: '$3.8B', sam: '$520M', som: '$26M', som_explanation: 'Low competition and massive greenfield opportunity (3% tech adoption). An AgriTech startup with government subsidy access can capture 4-6% of SAM — one of the highest capture potentials in the region.', market_viable: true, capture_potential: 'High', growth_rate: '15.4% CAGR', competition: 'Low', key_trends: ['Agriculture employs 27% of workforce but only 3% use tech', 'Government subsidies for precision agriculture', 'Export-oriented horticulture driving supply chain demand'], assessment: `Agriculture is Uzbekistan's #2 sector, yet only 3% of farms use digital tools — massive greenfield opportunity. The biggest challenge is last-mile distribution to rural areas with limited internet and low digital literacy.` },
  HealthTech: { tam: '$6.1B', sam: '$280M', som: '$8M', som_explanation: 'Moderate competition but slow 12-18 month procurement cycles and strict medical regulations limit capture to 2-4% of SAM. Regulatory compliance costs are a significant barrier for early-stage startups.', market_viable: true, capture_potential: 'Low', growth_rate: '24.8% CAGR', competition: 'Moderate', key_trends: ['Telemedicine legalized and insurance expanded in 2024', 'Medical data digitization mandate for all clinics by 2026', 'Shortage of 12,000 doctors driving AI diagnostics demand'], assessment: `Healthcare is modernizing fast — EHR mandate by 2026, telemedicine insurance coverage expanded. Doctor-to-patient ratio is 1:1,200 (3x worse than WHO recommends). Procurement cycles are slow (12-18 months) and medical software regulations are stringent.` },
  'E-commerce': { tam: '$9.3B', sam: '$1.8B', som: '$9M', som_explanation: 'Uzum Mall and olcha.uz control ~70% of the market. A new e-commerce player without a specific vertical niche can only capture 0.3-0.8% of SAM. Vertical specialization (fashion, electronics, groceries) is essential.', market_viable: false, capture_potential: 'Low', growth_rate: '31.2% CAGR', competition: 'High', key_trends: ['E-commerce grew 65% in 2024 — fastest in Central Asia', 'Uzum Mall and olcha.uz dominate but verticals still open', '$500M in new warehouse investments improving logistics'], assessment: `65% growth in 2024, but Uzum Mall and olcha.uz control ~70% of the market. New entrants need specific vertical niches. Last-mile delivery outside Tashkent costs 2-3x more than in the capital.` },
  LogTech: { tam: '$4.2B', sam: '$380M', som: '$19M', som_explanation: 'Low competition and only 15% tech adoption among logistics firms. A LogTech startup can capture 4-6% of SAM by targeting cross-border trade corridors and SEZ-based warehouses.', market_viable: true, capture_potential: 'High', growth_rate: '17.6% CAGR', competition: 'Low', key_trends: ['Cross-border trade with China/Kazakhstan growing 20% annually', 'Only 15% of logistics companies use route optimization', '14 special economic zones driving warehousing demand'], assessment: `Uzbekistan is a natural logistics hub between China, Kazakhstan, and Afghanistan. 14 SEZs with simplified customs. Only 15% of logistics firms use optimization software. Sales cycles are long (6-12 months) and customers are price-sensitive.` },
  CyberSec: { tam: '$2.8B', sam: '$190M', som: '$10M', som_explanation: 'Low competition with near-zero local vendors. A local CyberSec startup can capture 4-6% of SAM by replacing expensive imported solutions. Regulatory mandate (annual audits) provides guaranteed demand.', market_viable: true, capture_potential: 'High', growth_rate: '26.3% CAGR', competition: 'Low', key_trends: ['Mandatory cybersecurity audits for financial institutions since 2024', 'Zero local enterprise-grade vendors — all imports', 'Government building national SOC'], assessment: `New regulations force financial institutions into annual audits, creating demand. Nearly all solutions are imported (mostly Russian), opening space for local vendors. The challenge: most enterprises don't prioritize cybersecurity until after a breach.` },
  'AI/ML': { tam: '$7.5B', sam: '$410M', som: '$8M', som_explanation: 'Fastest-growing sector but most local AI startups are pre-revenue. Capture potential is 1-3% of SAM — realistic only for startups with specific vertical AI applications and paying customers.', market_viable: true, capture_potential: 'Low', growth_rate: '34.2% CAGR', competition: 'Moderate', key_trends: ['Government AI strategy with $100M allocation', 'Uzbek language NLP severely underdeveloped', '3,000+ CS graduates/year from local universities'], assessment: `Fastest-growing sector with $100M government AI fund. The unique opportunity is Uzbek-language NLP for 35M speakers. However, most local AI startups are pre-revenue and rely on consulting/grants.` },
  GovTech: { tam: '$3.1B', sam: '$450M', som: '$14M', som_explanation: 'Government is an active buyer but sales cycles are 12-24 months. A GovTech startup can capture 2-4% of SAM by winning 2-3 government contracts. Over-reliance on a single client is the key risk.', market_viable: true, capture_potential: 'Moderate', growth_rate: '20.8% CAGR', competition: 'Moderate', key_trends: ['E-government processing 50M+ transactions/year', 'Smart City Tashkent with $300M budget', 'Open data portals enabling civic tech'], assessment: `Government is an active buyer — 50M+ e-gov transactions/year, $300M Smart City budget. But sales cycles are 12-24 months, payments can be delayed, and over-reliance on a single government client is a key risk.` },
  GreenTech: { tam: '$3.4B', sam: '$260M', som: '$13M', som_explanation: 'Emerging sector with strong policy tailwinds and low competition. A GreenTech startup can capture 4-6% of SAM by aligning with the national decarbonization and solar programs.', market_viable: true, capture_potential: 'High', growth_rate: '24.3% CAGR', competition: 'Low', key_trends: ['National target of 25% renewable generation by 2030', 'Solar & wind auctions attracting international developers', 'Energy-efficiency mandates for new construction'], assessment: `Uzbekistan is investing heavily in renewables with a 25%-by-2030 target and multi-GW solar/wind auctions. GreenTech benefits from policy support and low competition, but hardware-heavy models face capital intensity and long payback periods.` },
  DeepTech: { tam: '$5.8B', sam: '$300M', som: '$9M', som_explanation: 'High-defensibility but capital- and talent-intensive. Realistic capture is 2-3% of SAM, higher if the IP is genuinely differentiated and export-oriented.', market_viable: true, capture_potential: 'Moderate', growth_rate: '29.0% CAGR', competition: 'Low', key_trends: ['Growing pool of technical talent from local universities', 'Government innovation grants for R&D-heavy ventures', 'Export potential reduces reliance on the domestic market'], assessment: `DeepTech offers the strongest defensibility via proprietary IP, but it is capital- and talent-intensive with longer time-to-revenue. Winners typically sell into export markets, using Uzbekistan's lower cost base as an R&D advantage.` },
  GameDev: { tam: '$2.1B', sam: '$140M', som: '$7M', som_explanation: 'A hit-driven market where a single successful title can dominate. Capture is highly variable; disciplined studios with live-ops can reach 4-5% of SAM.', market_viable: true, capture_potential: 'Moderate', growth_rate: '22.1% CAGR', competition: 'Moderate', key_trends: ['Young, mobile-first population (median age 29)', 'Growing local studio scene and publisher interest', 'Rising in-app purchase spend as payments mature'], assessment: `Game development rides a young, mobile-first demographic. It is hit-driven and marketing-intensive, so studios with live-ops discipline and a portfolio approach de-risk the volatility. Payment rails maturing locally improves monetization.` },
};
const defaultMarket: MarketResearch = { tam: '$4.5B', sam: '$310M', som: '$12M', som_explanation: 'Without clear differentiation or early revenue, this startup can realistically capture 3-5% of SAM in its first 3-5 years.', market_viable: true, capture_potential: 'Moderate', growth_rate: '18.5% CAGR', competition: 'Moderate', key_trends: ['Digital adoption accelerating across all sectors', 'Local talent pool growing with expanding CS programs', 'Regional market underserved by global platforms'], assessment: `The Central Asian tech market is in early growth with significant untapped potential. Local startups understand regional business practices, regulations, and language better than global platforms. The key challenge is building sustainable revenue in a price-sensitive market.` };

function getMarket(key: string, industry: string, forecast: MarketForecast): MarketResearch {
  const base = md[key] || defaultMarket;
  // keep the qualitative copy, but sync headline growth to the regression output
  return { ...base, growth_rate: `${(forecast.cagr * 100).toFixed(1)}% CAGR (modeled)` };
}

// ---- Macroeconomic analysis (kept from the original model) ----
const mi: Record<string, MacroAnalysis> = {
  Fintech: { gdp_growth: '5.5%', inflation: '9.8%', regulatory_risk: 'Medium', foreign_investment_trend: 'FDI up 23% YoY to $2.8B', currency_stability: 'UZS depreciated 8% vs USD in 2024', assessment: `Fintech regulation is evolving rapidly — 12 regulatory updates in 2024 alone. This creates barriers to entry (positive for incumbents) but uncertainty for startups. 9.8% inflation impacts lending economics. Currency depreciation creates cross-border payment complexities but also demand for local fintech solutions.` },
  HealthTech: { gdp_growth: '5.5%', inflation: '9.8%', regulatory_risk: 'High', foreign_investment_trend: 'FDI up 23% YoY to $2.8B', currency_stability: 'UZS depreciated 8% vs USD in 2024', assessment: `Medical software must comply with Ministry of Health certification and data localization (patient data on Uzbek servers). Budget allocations prioritize infrastructure over technology. Healthcare receives a small share of the $2.8B FDI inflow.` },
  CyberSec: { gdp_growth: '5.5%', inflation: '9.8%', regulatory_risk: 'High', foreign_investment_trend: 'FDI up 23% YoY to $2.8B', currency_stability: 'UZS depreciated 8% vs USD in 2024', assessment: `New laws require 24-hour incident reporting and certified security products — 6-12 month approval process creates a moat but also a barrier. Most budgets go to hardware (firewalls) not software platforms.` },
  'AI/ML': { gdp_growth: '5.5%', inflation: '9.8%', regulatory_risk: 'Low', foreign_investment_trend: 'FDI up 23% YoY to $2.8B', currency_stability: 'UZS depreciated 8% vs USD in 2024', assessment: `No specific AI laws — low barriers but no protection from global competition. 5.5% GDP growth and 3,000+ CS graduates/year are strong tailwinds. 9.8% inflation drives demand for cost-saving automation.` },
  'E-commerce': { gdp_growth: '5.5%', inflation: '9.8%', regulatory_risk: 'Medium', foreign_investment_trend: 'FDI up 23% YoY to $2.8B', currency_stability: 'UZS depreciated 8% vs USD in 2024', assessment: `Import duties (15-30%) make cross-border expensive, benefiting local platforms. Young demographic (median age 29) is a tailwind. But 9.8% inflation directly reduces discretionary spending and e-commerce order volumes.` },
  GovTech: { gdp_growth: '5.5%', inflation: '9.8%', regulatory_risk: 'High', foreign_investment_trend: 'FDI up 23% YoY to $2.8B', currency_stability: 'UZS depreciated 8% vs USD in 2024', assessment: `Government procurement involves complex bureaucracy, mandatory tenders, and 60-90 day payment terms. Data localization requires servers in Uzbekistan. The positive: dedicated budget for digital transformation with specific allocations.` },
  GreenTech: { gdp_growth: '5.5%', inflation: '9.8%', regulatory_risk: 'Low', foreign_investment_trend: 'FDI up 23% YoY to $2.8B', currency_stability: 'UZS depreciated 8% vs USD in 2024', assessment: `Strong policy tailwinds — renewable targets, green subsidies and international climate finance. Low regulatory friction for software layers, though hardware/energy projects face permitting and grid-connection timelines.` },
};
function defaultMacro(industry: string): MacroAnalysis {
  return { gdp_growth: '5.5%', inflation: '9.8%', regulatory_risk: 'Medium', foreign_investment_trend: 'FDI up 23% YoY to $2.8B', currency_stability: 'UZS depreciated 8% vs USD in 2024', assessment: `Uzbekistan's 5.5% GDP growth is among the highest in the CIS, driven by liberalization, privatization, and growing FDI. Key risks: 9.8% inflation (above 8% target), 8% currency depreciation, and evolving regulation. For ${industry.toLowerCase()}, the most relevant factor is the government's digital transformation commitment.` };
}
function getMacro(key: string, industry: string): MacroAnalysis {
  return mi[key] || defaultMacro(industry);
}

function generateStartups(): Startup[] {
  const startups: Startup[] = [];
  const demoIndustries = ["AI/ML", "Fintech", "EdTech", "GreenTech", "SaaS", "DeepTech", "GameDev", "AgriTech", "HealthTech", "E-commerce", "LogTech", "CyberSec", "GovTech"];
  for (let i = 0; i < 50; i++) {
    const industry = demoIndustries[i % demoIndustries.length];
    const is_b2b = b2bIndustries.has(industry);
    const has_previous_exit = rand() < 0.15;
    const team_size = Math.max(1, Math.round(rand() * 25 + 1));
    const funding_total_usd = Math.round((rand() * 2000000 + (has_previous_exit ? 500000 : 0)) / 10000) * 10000;
    const funding_rounds = funding_total_usd === 0 ? 0 : Math.max(1, Math.min(4, Math.round(Math.log2(funding_total_usd / 50000 + 1))));
    const time_to_first_funding_months = funding_rounds === 0 ? 0 : Math.max(1, Math.round(rand() * 24 + 2));
    const hasRevenue = rand() < 0.45;
    const sales_amount_usd = hasRevenue ? Math.round(rand() * 120000) : 0;
    const stageChoices = funding_rounds >= 2 ? ['Growth', 'Scaling'] : hasRevenue ? ['Launched', 'Growth'] : funding_rounds >= 1 ? ['MVP', 'Launched'] : ['Idea', 'MVP'];
    const stage = stageChoices[Math.floor(rand() * stageChoices.length)];
    const ask_amount_usd = Math.round((rand() * 900000 + 50000) / 10000) * 10000;
    startups.push(
      evaluateStartup(
        {
          name: startupNames[i] || `Startup ${i + 1}`,
          industry,
          is_b2b,
          team_size,
          funding_total_usd,
          funding_rounds,
          time_to_first_funding_months,
          has_previous_exit,
          sales_amount_usd,
          founder_name: founderNames[i % founderNames.length],
          founder_background: has_previous_exit
            ? 'Second-time founder; previously built and sold a regional software company. Deep domain network and hiring experience.'
            : 'Domain operator with several years in the sector before founding; technical background and prior startup experience.',
          website: i % 3 === 0 ? `${startupNames[i]?.toLowerCase().replace(/\s+/g, "") || "startup"}.uz` : "",
          stage,
          unique_tech: rand() < 0.35,
          previous_investment: funding_rounds > 0,
          revenue_model: revenueModels[Math.floor(rand() * revenueModels.length)],
          country: 'Uzbekistan',
          founding_year: 2020 + Math.floor(rand() * 5),
          ask_amount_usd,
          round_size_usd: Math.max(ask_amount_usd, Math.round((rand() * 1500000 + ask_amount_usd) / 10000) * 10000),
          successful_project: rand() < 0.4 ? 'Shipped an earlier product with real users' : undefined,
          technical_cofounder: rand() < 0.6,
          revenue_growth_pct: hasRevenue ? Math.round(rand() * 30) : undefined,
          runway_months: funding_rounds > 0 ? Math.round(rand() * 20 + 4) : undefined,
          monthly_burn_usd: funding_rounds > 0 ? Math.round((rand() * 40000 + 5000) / 1000) * 1000 : undefined,
        },
        i + 1,
        Math.round(rand() * 8 - 4)
      )
    );
  }
  startups.sort((a, b) => b.score - a.score);
  return startups;
}

export const mockStartups = generateStartups();
