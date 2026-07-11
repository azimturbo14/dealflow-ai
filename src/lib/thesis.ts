// Thesis-fit layer.
//
// WHY THIS EXISTS
//   Analysis of the client's real Streak pipeline showed that ~half of their
//   passes have nothing to do with company quality — they are mandate/thesis
//   passes: "we're not investing in B2C right now", "travel retail is not a
//   focus", "no interest in podcast businesses", "doesn't fit our thesis".
//   A pure quality score can never predict those. So the VERDICT (pursue /
//   review / pass) is a function of BOTH the quality score AND thesis fit,
//   while the 0-100 quality score stays a clean measure of the company itself.
//
// The thesis below is DERIVED FROM THE CLIENT'S OWN DECISIONS, and is a plain,
// editable config object — the client can tune it as their mandate shifts.

import type { ScoreFactor } from './mock-data';

export type ThesisBand = 'on-thesis' | 'partial' | 'off-thesis';
export type ThesisGate = 'none' | 'cap-review' | 'hard-pass';

export interface FundThesis {
  label: string;
  b2c_stance: 'pass' | 'review-cap' | 'ok'; // how B2C companies are treated
  min_dev_stage: string;                     // earlier than this reads as "too early"
  require_moat: boolean;                      // defensibility expected
  preferred_sectors: string[];               // canonical sector keys the fund actively wants
  avoid_sectors: string[];                    // canonical sectors the fund is out of
  avoid_keywords: string[];                   // narrow verticals explicitly passed on
  notes: string;
}

// Derived from the MENA client's pursued (Signed/DD/IC) vs passed history.
export const MENA_CLIENT_THESIS: FundThesis = {
  label: 'B2B deep-tech · FinTech · AI — defensible, Series-A-ready',
  b2c_stance: 'review-cap',
  min_dev_stage: 'MVP',
  require_moat: true,
  preferred_sectors: ['FinTech', 'AI', 'SaaS', 'DeepTech', 'BioTech', 'HealthTech', 'CyberSec', 'RegTech', 'ClimateTech', 'SpaceTech', 'Robotics'],
  avoid_sectors: [],
  avoid_keywords: ['podcast', 'travel retail', 'femcare', 'dating'],
  notes: 'Pursued deals cluster in B2B FinTech/AI/SaaS/DeepTech/BioTech at Series A+. B2C explicitly deprioritized ("not actively investing in B2C"); "too early" and "no defensible moat / business model" are recurring quality-adjacent pass reasons; several niche consumer verticals passed outright.',
};

const STAGE_ORDER = ['Idea', 'MVP', 'Launched', 'Growth', 'Scaling'];

export interface ThesisInput {
  is_b2b: boolean;
  dev_stage: string;
  unique_tech: boolean;
  technical_cofounder?: boolean;
  sector_key: string;
  industry: string;
  description?: string;
}

export interface ThesisFit {
  score: number;        // 0-100 how well the deal matches the fund's mandate
  band: ThesisBand;
  gate: ThesisGate;     // how it constrains the verdict
  reasons: string[];
  factors: ScoreFactor[];
}

// Precedence: hard-pass beats cap-review beats none.
function stronger(a: ThesisGate, b: ThesisGate): ThesisGate {
  const rank: Record<ThesisGate, number> = { 'none': 0, 'cap-review': 1, 'hard-pass': 2 };
  return rank[a] >= rank[b] ? a : b;
}

export function assessThesisFit(input: ThesisInput, thesis: FundThesis = MENA_CLIENT_THESIS): ThesisFit {
  const factors: ScoreFactor[] = [];
  const reasons: string[] = [];
  let score = 60;
  let gate: ThesisGate = 'none';

  const haystack = `${input.industry} ${input.description ?? ''}`.toLowerCase();

  // 1) Sector stance
  const preferred = thesis.preferred_sectors.includes(input.sector_key);
  const avoided = thesis.avoid_sectors.includes(input.sector_key);
  let sectorImpact = 0;
  if (avoided) { sectorImpact = -35; gate = stronger(gate, 'hard-pass'); reasons.push(`${input.sector_key} is a sector the fund is currently out of.`); }
  else if (preferred) { sectorImpact = 22; }
  score += sectorImpact;
  factors.push({
    criterion: 'Sector vs. mandate',
    value: avoided ? `${input.sector_key} — out of mandate` : preferred ? `${input.sector_key} — core focus` : `${input.sector_key} — neutral`,
    impact: sectorImpact, max_impact: 22,
    direction: sectorImpact > 0 ? 'positive' : sectorImpact < 0 ? 'negative' : 'neutral',
    explanation: avoided
      ? `The fund is explicitly not investing in ${input.sector_key} at present — an automatic pass regardless of company quality.`
      : preferred
        ? `${input.sector_key} sits inside the fund's active focus (${thesis.preferred_sectors.slice(0, 5).join(', ')}…).`
        : `${input.sector_key} is neither a stated focus nor an explicit avoid — judged on quality.`,
  });

  // 2) Narrow avoid-vertical keywords (podcast, travel retail, …)
  const hitKw = thesis.avoid_keywords.find((k) => haystack.includes(k));
  if (hitKw) {
    gate = stronger(gate, 'hard-pass');
    score -= 30;
    reasons.push(`"${hitKw}" is a vertical the fund has explicitly passed on before.`);
    factors.push({
      criterion: 'Vertical exclusion',
      value: `Matches "${hitKw}"`,
      impact: -30, max_impact: 0, direction: 'negative',
      explanation: `The deal falls in "${hitKw}", a niche the fund has previously declined as out-of-thesis.`,
    });
  }

  // 3) B2B / B2C stance
  let bcImpact = 0;
  if (input.is_b2b) {
    bcImpact = 12;
  } else {
    if (thesis.b2c_stance === 'pass') { bcImpact = -25; gate = stronger(gate, 'hard-pass'); reasons.push('B2C — the fund does not invest in consumer.'); }
    else if (thesis.b2c_stance === 'review-cap') { bcImpact = -15; gate = stronger(gate, 'cap-review'); reasons.push('B2C — the fund deprioritizes consumer; tracks rather than leads.'); }
  }
  score += bcImpact;
  factors.push({
    criterion: 'Business model (B2B/B2C)',
    value: input.is_b2b ? 'B2B' : 'B2C / consumer',
    impact: bcImpact, max_impact: 12,
    direction: bcImpact > 0 ? 'positive' : bcImpact < 0 ? 'negative' : 'neutral',
    explanation: input.is_b2b
      ? 'B2B matches the fund\'s stated preference for enterprise / deep-tech over consumer.'
      : thesis.b2c_stance === 'ok'
        ? 'Consumer model — no thesis penalty under the current mandate.'
        : `Consumer model — the fund is ${thesis.b2c_stance === 'pass' ? 'not investing in B2C' : 'deprioritizing B2C'} at present.`,
  });

  // 4) Stage — "too early" is a recurring pass reason
  const idx = STAGE_ORDER.indexOf(input.dev_stage);
  const minIdx = STAGE_ORDER.indexOf(thesis.min_dev_stage);
  let stageImpact = 0;
  if (idx >= 0 && minIdx >= 0 && idx < minIdx) {
    stageImpact = -12; gate = stronger(gate, 'cap-review');
    reasons.push(`Stage "${input.dev_stage}" is earlier than the fund typically enters — likely "too early".`);
  }
  factors.push({
    criterion: 'Stage vs. entry point',
    value: input.dev_stage || 'Unknown',
    impact: stageImpact, max_impact: 0,
    direction: stageImpact < 0 ? 'negative' : 'neutral',
    explanation: stageImpact < 0
      ? `The fund's pursued deals cluster at ${thesis.min_dev_stage}+; "${input.dev_stage}" reads as too early and is usually tracked, not led.`
      : `Stage is at or beyond the fund's usual entry point.`,
  });

  // 5) Moat / defensibility — "no defensible model / no defense against competition"
  if (thesis.require_moat && !input.unique_tech && !input.technical_cofounder) {
    score -= 12;
    reasons.push('No stated defensibility (no unique tech or technical co-founder) — the fund passes on undefensible models.');
    factors.push({
      criterion: 'Defensibility',
      value: 'No stated moat',
      impact: -12, max_impact: 0, direction: 'negative',
      explanation: 'A recurring pass reason for this fund is weak defensibility ("no defense against competition", "no defendable business model").',
    });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const band: ThesisBand = gate === 'hard-pass' ? 'off-thesis' : score >= 70 ? 'on-thesis' : score >= 45 ? 'partial' : 'off-thesis';
  if (reasons.length === 0) reasons.push('No thesis conflicts — judged on company quality.');

  return { score, band, gate, reasons, factors };
}
