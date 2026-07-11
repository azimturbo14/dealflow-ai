import { resolveMarket, type MarketContext, type Band } from './markets';
import { assessThesisFit, MENA_CLIENT_THESIS, type ThesisFit } from './thesis';

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
  // Adaptive, forward-looking capital signals (resolved per country)
  market_name?: string;
  policy_rate?: string;
  cost_of_capital?: Band;
  follow_on_availability?: Band;
  fx_risk?: Band;
  assumptions?: string[];
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
  score: number;             // 0–100 company quality (thesis-independent)
  verdict: "high" | "moderate" | "low"; // pursue / review / pass — quality AND thesis fit
  thesis_fit: ThesisFit;     // how the deal matches this fund's mandate
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

// Deterministic log-linear regression on a seeded 6-year TAM series → 5-year projection.
// Accepts a resolved MarketContext, or a raw industry string (resolved with no country)
// for lightweight previews.
export function buildForecast(market: MarketContext | string, samOverride?: number, somOverride?: number, horizon = 5): MarketForecast {
  const mkt: MarketContext = typeof market === 'string' ? resolveMarket('', market) : market;
  const tamB = mkt.regional_tam_b;
  const cagr = mkt.cagr;
  const baseYear = 2025;
  // Small fixed wobble so the fit is realistic (R² < 1) yet fully deterministic
  const wob = [0.11, -0.085, 0.06, -0.10, 0.045, 0.02];
  const history: { year: number; tam: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const yr = baseYear - 5 + i;
    const base = tamB / Math.pow(1 + cagr, baseYear - yr);
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
  const sam_now = samOverride ?? mkt.sam_m;
  const som_now = somOverride ?? mkt.som_m;
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

  const stage = input.stage || (funding_rounds >= 2 ? 'Growth' : sales_amount_usd > 0 ? 'Launched' : funding_rounds >= 1 ? 'MVP' : 'Idea');
  const country = input.country || '';
  // Resolve the country × sector market once; every market/macro factor reads from it.
  const mkt = resolveMarket(country, industry);
  const key = mkt.sector.key;
  const previous_investment = input.previous_investment ?? (funding_rounds > 0);
  const unique_tech = input.unique_tech ?? false;
  const ask = input.ask_amount_usd ?? 0;
  const round_size = input.round_size_usd ?? funding_total_usd;
  const background = input.founder_background || '';
  const forecast = buildForecast(mkt, input.sam_usd, input.som_usd);

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
  const compImpact = mkt.competition === 'Low' ? 6 : mkt.competition === 'Moderate' ? 3 : 1;
  mktF.push({
    criterion: 'Competitive Density',
    value: `${mkt.competition} competition`,
    impact: compImpact, max_impact: 6,
    direction: compImpact >= 3 ? 'positive' : 'negative',
    explanation: mkt.competition === 'Low'
      ? 'A thin competitive field means room to establish a category position before incumbents react.'
      : mkt.competition === 'High'
        ? 'A crowded field with funded incumbents — the startup needs a specific niche and a sharp wedge to win.'
        : 'Moderate competition — winnable with clear differentiation and execution speed.',
    threshold: 'Low: +6 · Moderate: +3 · High: +1',
  });
  const mktScore = mktF.reduce((s, f) => s + f.impact, 0);

  // ---------------- Pillar 4 · Macro & Capital Environment (max 15) ----------------
  // Adaptive: every factor is resolved for the deal's own country (mkt.country).
  const macroF: ScoreFactor[] = [];
  const macro = getMacro(mkt);
  const cc = mkt.country;
  const marketLabel = `${cc.name}${mkt.countryConfidence !== 'exact' ? ' (est.)' : ''}`;

  const regImpact = macro.regulatory_risk === 'Low' ? 4 : macro.regulatory_risk === 'Medium' ? 2 : 1;
  macroF.push({
    criterion: 'Regulatory Environment',
    value: `${macro.regulatory_risk} risk · ${marketLabel}`,
    impact: regImpact, max_impact: 4,
    direction: regImpact >= 4 ? 'positive' : regImpact >= 2 ? 'neutral' : 'negative',
    explanation: `Ease of building and selling ${mkt.sector.label} in ${cc.name} is rated ${cc.regulatory_ease}. ${cc.ecosystem}`,
    threshold: 'Ease High: +4 · Medium: +2 · Low: +1',
  });

  // Macro stability — inflation + currency risk (the erosion risk on a UZS/EGP/TRY-type base)
  const stab = cc.fx_risk === 'Low' && cc.inflation < 6 ? 4 : cc.fx_risk === 'High' || cc.inflation >= 20 ? 1 : 2;
  macroF.push({
    criterion: 'Macro Stability (inflation & FX)',
    value: `${cc.inflation}% inflation · ${cc.fx_risk} FX risk`,
    impact: stab, max_impact: 4,
    direction: stab >= 4 ? 'positive' : stab >= 2 ? 'neutral' : 'negative',
    explanation: `${cc.fx_note}. At ${cc.inflation}% inflation, ${stab <= 1 ? 'local-currency revenue erodes fast and hard-currency costs bite — a real drag on the underlying economics.' : stab >= 4 ? 'the currency base is stable, protecting margins and reported returns.' : 'inflation is manageable but worth watching.'}`,
    threshold: 'Stable + low inflation: +4 · moderate: +2 · high FX/inflation: +1',
  });

  // Cost of capital & follow-on availability — the forward funding risk
  const capScore = (cc.capital_availability === 'High' ? 2 : cc.capital_availability === 'Medium' ? 1 : 0)
    + (mkt.cost_of_capital === 'Low' ? 2 : mkt.cost_of_capital === 'Medium' ? 1 : 0);
  macroF.push({
    criterion: 'Cost of Capital & Follow-on',
    value: `Policy rate ${cc.policy_rate}% · follow-on ${cc.capital_availability}`,
    impact: capScore, max_impact: 4,
    direction: capScore >= 3 ? 'positive' : capScore >= 2 ? 'neutral' : 'negative',
    explanation: `A ${cc.policy_rate}% benchmark rate sets a ${mkt.cost_of_capital.toLowerCase()} cost of capital, and next-round capital depth in ${cc.name} is ${cc.capital_availability.toLowerCase()}. ${cc.capital_availability === 'Low' ? 'Thin local capital means the company likely has to raise its next round out-of-market — a real execution risk.' : 'Adequate local capital supports the next raise.'}`,
    threshold: 'Cheap capital + deep follow-on: +4 · else scaled down',
  });

  // FDI / ecosystem trend
  macroF.push({
    criterion: 'Capital / FDI Trend',
    value: macro.foreign_investment_trend,
    impact: 3, max_impact: 3,
    direction: 'positive',
    explanation: `Direction of foreign investment into ${cc.name} shapes follow-on and exit optionality: ${macro.foreign_investment_trend}.`,
    threshold: 'Rising FDI: +3',
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
  // Quality verdict from the score alone …
  const qualityVerdict: "high" | "moderate" | "low" = score >= 70 ? "high" : score >= 45 ? "moderate" : "low";

  // … then thesis fit decides whether a good company is one this fund actually pursues.
  const thesis_fit = assessThesisFit({
    is_b2b, dev_stage: stage, unique_tech,
    technical_cofounder: input.technical_cofounder,
    sector_key: key, industry, description: input.description,
  }, MENA_CLIENT_THESIS);
  let verdict: "high" | "moderate" | "low" = qualityVerdict;
  if (thesis_fit.gate === 'hard-pass') verdict = 'low';                       // off-mandate → pass regardless of quality
  else if (thesis_fit.gate === 'cap-review' && verdict === 'high') verdict = 'moderate'; // strong but off-thesis → review, not pursue

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
  if (mkt.competition === 'Low') strengths.push('Low competitive density — room to build a category position');
  if (sales_amount_usd > 0) strengths.push(`${fmtUsd(sales_amount_usd)} in revenue — market validation exists`);
  if (rg != null && rg >= 20) strengths.push(`${rg}% monthly growth — top-decile trajectory`);
  if (previous_investment) strengths.push('Prior investor validation');
  if (cc.capital_availability === 'High') strengths.push(`${cc.name} — deep local capital for follow-on rounds`);
  if (cc.fx_risk === 'Low' && cc.inflation < 6) strengths.push(`Stable macro base (${cc.currency}, ${cc.inflation}% inflation)`);
  if (strengths.length === 0) strengths.push('Early-stage — upside contingent on execution and market timing');

  const red_flags: string[] = [];
  if (!has_previous_exit && !input.successful_project) red_flags.push('First-time founder, no delivery record — execution risk');
  if (sales_amount_usd === 0) red_flags.push('Pre-revenue — product-market fit unproven');
  if (rg == null && input.sam_usd == null) red_flags.push('No financial/market data supplied — verdict runs on sector defaults');
  if (mkt.competition === 'High') red_flags.push('Crowded market with funded incumbents');
  if (runway != null && runway < 6) red_flags.push(`Only ${runway} months runway — near-term funding pressure`);
  if (cc.fx_risk === 'High' || cc.inflation >= 20) red_flags.push(`Macro/FX risk in ${cc.name} — ${cc.inflation}% inflation, ${cc.fx_note}`);
  if (cc.capital_availability === 'Low') red_flags.push(`Thin local capital in ${cc.name} — next round likely raised out-of-market`);
  if (thesis_fit.gate === 'hard-pass') red_flags.push(`Off current thesis: ${thesis_fit.reasons[0]}`);
  else if (thesis_fit.gate === 'cap-review') red_flags.push(`Thesis caveat: ${thesis_fit.reasons[0]}`);
  if (red_flags.length === 0) red_flags.push('No critical red flags detected at this stage');

  // Decision path (audit log) — pillar driven
  const ranked = [...pillars].map((p) => ({ ...p, pct: p.score / p.max })).sort((a, b) => b.pct - a.pct);
  const decision_path: string[] = [];
  decision_path.push(`Market growth (regression)? → ${(forecast.cagr * 100).toFixed(0)}% CAGR ${forecast.cagr >= 0.12 ? '(healthy)' : '(slow)'}`);
  decision_path.push(`Strongest pillar → ${ranked[0].label} (${ranked[0].score}/${ranked[0].max})`);
  decision_path.push(`Weakest pillar → ${ranked[ranked.length - 1].label} (${ranked[ranked.length - 1].score}/${ranked[ranked.length - 1].max})`);
  decision_path.push(`Data confidence → ${confidence}%`);
  const gateNote = thesis_fit.gate === 'hard-pass'
    ? ` — capped to PASS (off-thesis, quality would be ${qualityVerdict === 'high' ? 'PURSUE' : qualityVerdict === 'moderate' ? 'REVIEW' : 'PASS'})`
    : thesis_fit.gate === 'cap-review' && qualityVerdict === 'high'
      ? ' — capped to REVIEW (strong company, off current thesis)'
      : '';
  decision_path.push(`Thesis fit → ${thesis_fit.band} (${thesis_fit.score}/100)`);
  decision_path.push(`→ ${verdict === 'high' ? 'PURSUE' : verdict === 'moderate' ? 'REVIEW' : 'PASS'} (${score}%)${gateNote}`);

  // Risks
  const risks: string[] = [];
  if (!has_previous_exit) risks.push('First-time founder execution risk: ~75% of first-time founders fail to reach Series A. Mitigated by domain expertise or early traction.');
  if (rg == null) risks.push('Incomplete financials: growth and runway were not supplied, so traction is scored conservatively. Request the financial model to firm up the verdict.');
  if (mkt.competition === 'High') risks.push(`Competitive risk: ${key} is a high-density market; without a sharp niche the startup competes against funded incumbents.`);
  if (forecast.cagr < 0.12) risks.push('Market growth risk: the regression projects sub-12% annual market growth, capping the venture upside.');
  if (risks.length === 0) risks.push('No significant structural risks identified across team, traction, market and macro.');

  const score_breakdown: ScoreFactor[] = pillars.flatMap((p) => p.factors);
  const market_research = getMarket(mkt, forecast);

  return {
    id,
    name: input.name,
    industry,
    description: input.description ?? `${is_b2b ? "B2B" : "B2C"} ${mkt.sector.label} venture`,
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
    thesis_fit,
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

// ---- Adaptive market research — generated from the resolved country x sector ----
const capBand = (comp: 'Low'|'Moderate'|'High'): 'Low'|'Moderate'|'High' =>
  comp === 'Low' ? 'High' : comp === 'Moderate' ? 'Moderate' : 'Low';
const usd = (m: number) => m >= 1000 ? `$${(m/1000).toFixed(1)}B` : `$${Math.round(m)}M`;

function getMarket(mkt: MarketContext, forecast: MarketForecast): MarketResearch {
  const c = mkt.country, sec = mkt.sector;
  const capture = capBand(mkt.competition);
  const viable = mkt.sam_m >= 120 && mkt.competition !== 'High';
  return {
    tam: usd(mkt.regional_tam_b * 1000),
    sam: usd(mkt.sam_m),
    som: usd(mkt.som_m),
    som_explanation: `Serviceable market of ${usd(mkt.sam_m)} in ${c.name}, with ${mkt.competition.toLowerCase()} competition implying a ${capture.toLowerCase()} realistic capture — roughly ${usd(mkt.som_m)} obtainable over five years.`,
    market_viable: viable,
    capture_potential: capture,
    growth_rate: `${(forecast.cagr * 100).toFixed(1)}% CAGR (modeled)`,
    competition: mkt.competition,
    key_trends: sec.trends,
    assessment: `${sec.label} in ${c.name}: a ${usd(mkt.regional_tam_b*1000)} addressable market growing ~${(forecast.cagr*100).toFixed(0)}%/yr. ${c.ecosystem} Competition is ${mkt.competition.toLowerCase()}${mkt.sectorConfidence!=='exact' ? ' (sector mapped to nearest reference — treat sizing as an estimate).' : '.'}`,
  };
}

// ---- Adaptive macro analysis — generated from the resolved country ----
function getMacro(mkt: MarketContext): MacroAnalysis {
  const c = mkt.country;
  const regulatory_risk: 'Low'|'Medium'|'High' = c.regulatory_ease === 'High' ? 'Low' : c.regulatory_ease === 'Medium' ? 'Medium' : 'High';
  return {
    gdp_growth: `${c.gdp_growth}%`,
    inflation: `${c.inflation}%`,
    regulatory_risk,
    foreign_investment_trend: c.fdi_trend,
    currency_stability: c.fx_note,
    market_name: c.name,
    policy_rate: `${c.policy_rate}%`,
    cost_of_capital: mkt.cost_of_capital,
    follow_on_availability: c.capital_availability,
    fx_risk: c.fx_risk,
    assumptions: mkt.assumptions,
    assessment: `${c.name}: ${c.gdp_growth}% GDP growth, ${c.inflation}% inflation, ${c.policy_rate}% policy rate (${mkt.cost_of_capital.toLowerCase()} cost of capital). ${c.fx_note}. Follow-on capital depth is ${c.capital_availability.toLowerCase()}. ${c.fdi_trend}.`,
  };
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
