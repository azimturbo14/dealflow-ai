// Free, browser-side extraction of an uploaded pitch deck / financial model.
// PDFs are parsed with pdf.js, spreadsheets with SheetJS, then simple heuristics
// pull out the figures the scoring engine needs. No backend, no API key, no cost.
// Everything extracted is pre-filled into the form for the analyst to confirm/edit.

export interface ExtractedFields {
  sales_amount_usd?: number;
  funding_total_usd?: number;
  ask_amount_usd?: number;
  round_size_usd?: number;
  team_size?: number;
  revenue_growth_pct?: number;
  runway_months?: number;
  monthly_burn_usd?: number;
  sam_usd?: number; // stored in $M to match the sector model
  som_usd?: number; // stored in $M
  founding_year?: number;
}

export interface ExtractResult {
  fields: ExtractedFields;
  rawTextPreview: string;
  matched: { label: string; value: string }[];
  source: 'pdf' | 'xlsx' | 'csv' | 'unknown';
  error?: string;
}

// "$1.2M" | "500k" | "1,200,000" | "usd 300 000" -> number of dollars
function money(raw: string): number | null {
  // strip thousands separators (commas and spaces between digit groups) before parsing
  const cleaned = raw.replace(/,/g, '').replace(/(\d)\s+(?=\d{3}\b)/g, '$1').trim();
  const m = cleaned.match(/\$?\s*([0-9]+(?:\.[0-9]+)?)\s*(k|m|b|thousand|million|billion)?/i);
  if (!m) return null;
  let v = parseFloat(m[1]);
  if (isNaN(v)) return null;
  const unit = (m[2] || '').toLowerCase();
  if (unit === 'k' || unit === 'thousand') v *= 1e3;
  else if (unit === 'm' || unit === 'million') v *= 1e6;
  else if (unit === 'b' || unit === 'billion') v *= 1e9;
  return Math.round(v);
}

const MONEY = `\\$?\\s*[0-9][0-9.,]*\\s*(?:k|m|b|thousand|million|billion)?`;

function firstMoney(text: string, labels: string[]): number | null {
  for (const label of labels) {
    const re = new RegExp(`${label}[^.\\n]{0,24}?(${MONEY})`, 'i');
    const m = text.match(re);
    if (m) { const v = money(m[1]); if (v && v > 0) return v; }
    // also try "value ... label" order
    const re2 = new RegExp(`(${MONEY})[^.\\n]{0,14}?${label}`, 'i');
    const m2 = text.match(re2);
    if (m2) { const v = money(m2[1]); if (v && v > 0) return v; }
  }
  return null;
}

function firstInt(text: string, labels: string[], max = 100000): number | null {
  for (const label of labels) {
    const re = new RegExp(`${label}[^.\\n]{0,16}?([0-9]{1,6})`, 'i');
    const m = text.match(re);
    if (m) { const v = parseInt(m[1], 10); if (v > 0 && v <= max) return v; }
    const re2 = new RegExp(`([0-9]{1,6})[^.\\n]{0,10}?${label}`, 'i');
    const m2 = text.match(re2);
    if (m2) { const v = parseInt(m2[1], 10); if (v > 0 && v <= max) return v; }
  }
  return null;
}

function firstPct(text: string, labels: string[]): number | null {
  for (const label of labels) {
    const re = new RegExp(`${label}[^.\\n]{0,24}?([0-9]{1,3}(?:\\.[0-9]+)?)\\s*%`, 'i');
    const m = text.match(re);
    if (m) { const v = parseFloat(m[1]); if (v >= 0 && v <= 500) return Math.round(v); }
    const re2 = new RegExp(`([0-9]{1,3}(?:\\.[0-9]+)?)\\s*%[^.\\n]{0,24}?${label}`, 'i');
    const m2 = text.match(re2);
    if (m2) { const v = parseFloat(m2[1]); if (v >= 0 && v <= 500) return Math.round(v); }
  }
  return null;
}

// Pull structured fields from free text (pitch deck)
export function fieldsFromText(text: string): { fields: ExtractedFields; matched: { label: string; value: string }[] } {
  const t = text.replace(/ /g, ' ');
  const fields: ExtractedFields = {};
  const matched: { label: string; value: string }[] = [];
  const put = (k: keyof ExtractedFields, v: number | undefined, label: string, disp: string) => {
    if (v != null) { (fields as Record<string, number>)[k] = v; matched.push({ label, value: disp }); }
  };

  const revenue = firstMoney(t, ['revenue', 'annual revenue', 'arr', 'mrr', 'sales', 'gmv']);
  put('sales_amount_usd', revenue ?? undefined, 'Revenue', revenue ? `$${revenue.toLocaleString()}` : '');

  const raised = firstMoney(t, ['raised', 'total funding', 'funding to date', 'capital raised']);
  put('funding_total_usd', raised ?? undefined, 'Funding raised', raised ? `$${raised.toLocaleString()}` : '');

  const ask = firstMoney(t, ['ask', 'raising', 'seeking', 'investment ask', 'we are raising']);
  put('ask_amount_usd', ask ?? undefined, 'Ask', ask ? `$${ask.toLocaleString()}` : '');

  const round = firstMoney(t, ['round size', 'total round', 'seed round', 'pre-seed round']);
  put('round_size_usd', round ?? undefined, 'Round size', round ? `$${round.toLocaleString()}` : '');

  const burn = firstMoney(t, ['burn', 'monthly burn', 'burn rate']);
  put('monthly_burn_usd', burn ?? undefined, 'Monthly burn', burn ? `$${burn.toLocaleString()}` : '');

  const team = firstInt(t, ['team of', 'team size', 'team', 'employees', 'headcount', 'full-time', 'fte', 'people', 'staff'], 5000);
  put('team_size', team ?? undefined, 'Team size', team ? String(team) : '');

  const growth = firstPct(t, ['growth', 'growing', 'mom', 'month-over-month', 'yoy', 'month over month']);
  put('revenue_growth_pct', growth ?? undefined, 'Growth', growth ? `${growth}%` : '');

  const runway = firstInt(t, ['runway'], 120);
  put('runway_months', runway ?? undefined, 'Runway', runway ? `${runway} mo` : '');

  const tam = firstMoney(t, ['sam', 'serviceable', 'serviceable available market']);
  if (tam) put('sam_usd', Math.round(tam / 1e6), 'SAM', `$${Math.round(tam / 1e6)}M`);
  const som = firstMoney(t, ['som', 'obtainable', 'serviceable obtainable market']);
  if (som) put('som_usd', Math.round(som / 1e6), 'SOM', `$${Math.round(som / 1e6)}M`);

  const yearMatch = t.match(/(?:founded|incorporated|established|since)[^.\n]{0,12}?(20[0-2][0-9])/i);
  if (yearMatch) put('founding_year', parseInt(yearMatch[1], 10), 'Founded', yearMatch[1]);

  return { fields, matched };
}

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  // CDN worker matching the installed version — no bundler worker config needed
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${(pdfjs as unknown as { version: string }).version}/build/pdf.worker.min.mjs`;
  const buf = await file.arrayBuffer();
  const doc = await (pdfjs as unknown as { getDocument: (o: unknown) => { promise: Promise<unknown> } })
    .getDocument({ data: buf }).promise as {
      numPages: number;
      getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: { str?: string }[] }> }>;
    };
  let text = '';
  const max = Math.min(doc.numPages, 40);
  for (let i = 1; i <= max; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str || '').join(' ') + '\n';
  }
  return text;
}

async function readSheet(file: File): Promise<{ text: string }> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  let text = '';
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as unknown[][];
    for (const row of rows) {
      text += row.map((c) => (c == null ? '' : String(c))).join(' ') + '\n';
    }
  }
  return { text };
}

export async function extractFromFile(file: File): Promise<ExtractResult> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith('.pdf')) {
      const text = await readPdf(file);
      const { fields, matched } = fieldsFromText(text);
      return { fields, matched, rawTextPreview: text.slice(0, 600), source: 'pdf' };
    }
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
      const { text } = await readSheet(file);
      const { fields, matched } = fieldsFromText(text);
      return { fields, matched, rawTextPreview: text.slice(0, 600), source: name.endsWith('.csv') ? 'csv' : 'xlsx' };
    }
    return { fields: {}, matched: [], rawTextPreview: '', source: 'unknown', error: 'Unsupported file type — upload a PDF, XLSX or CSV.' };
  } catch (e) {
    return { fields: {}, matched: [], rawTextPreview: '', source: 'unknown', error: e instanceof Error ? e.message : 'Could not read the file.' };
  }
}
