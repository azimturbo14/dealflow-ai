"use client";

import { useState, useEffect } from "react";
import {
  X, ArrowLeft, ArrowRight, Check, Sparkles, FileText, Loader2, UploadCloud,
  Download,
} from "lucide-react";
import {
  evaluateStartup, buildForecast, industries, stages, revenueModels,
  type Startup, type StartupInput,
} from "@/lib/mock-data";
import { extractFromFile, type ExtractedFields } from "@/lib/extract";
import { parseStartupsFromFile, downloadCsvTemplate } from "@/lib/import";
import { Button } from "@/components/app/primitives";
import { cn } from "@/lib/utils";

const COUNTRIES = ["Uzbekistan", "Kazakhstan", "Kyrgyzstan", "Tajikistan", "Turkmenistan", "Azerbaijan", "Russia", "United States", "United Kingdom", "Other"];
const YEARS = Array.from({ length: 12 }, (_, i) => 2026 - i);

const emptyForm = {
  name: "", industry: "AI/ML", custom_industry: "", stage: "Idea",
  is_b2b: true, team_size: 5, unique_tech: false, revenue_model: revenueModels[0],
  founding_year: 2024, country: "Uzbekistan", description: "",
  ask_amount_usd: 0, round_size_usd: 0, previous_investment: false,
  founder_name: "", founder_role: "CEO / Founder", founder_background: "", successful_project: "",
  technical_cofounder: false,
  funding_total_usd: 0, funding_rounds: 0, time_to_first_funding_months: 0, has_previous_exit: false,
  sales_amount_usd: 0,
  revenue_growth_pct: "" as number | "", runway_months: "" as number | "", monthly_burn_usd: "" as number | "",
  sam_usd: "" as number | "", som_usd: "" as number | "",
};
type FormState = typeof emptyForm;

const inputCls =
  "w-full bg-canvas border border-line rounded-lg px-3 py-2 text-[13px] placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors";

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="microlabel block mb-1.5 text-[10px]">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-ink-3 mt-1">{hint}</p>}
    </div>
  );
}

function Segmented({ value, options, onChange }: {
  value: string; options: { key: string; label: string }[]; onChange: (key: string) => void;
}) {
  return (
    <div className="flex bg-canvas border border-line rounded-lg p-0.5">
      {options.map((o) => (
        <button key={o.key} type="button" onClick={() => onChange(o.key)}
          className={cn("flex-1 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
            value === o.key ? "bg-pane text-ink border border-line shadow-[var(--shadow-xs)]" : "text-ink-3 hover:text-ink")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FileDrop({ label, accept, fileName, hint, onFile }: {
  label: string; accept: string; fileName: string; hint: string; onFile: (f: File | undefined | null) => void;
}) {
  return (
    <label className={cn("block border border-dashed rounded-lg px-3 py-4 text-center cursor-pointer transition-colors",
      fileName ? "border-accent/50 bg-accent-soft/30" : "border-line hover:border-accent hover:bg-tint/40")}>
      <input type="file" accept={accept} className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink"><FileText className="w-4 h-4" /> {label}</span>
      <span className="block text-[11px] mt-1 truncate text-ink-3">{fileName || `Click to upload · ${hint}`}</span>
    </label>
  );
}

export function EvaluateModal({ open, onClose, onCreate, nextId }: {
  open: boolean; onClose: () => void; onCreate: (created: Startup[]) => void; nextId: number;
}) {
  const [mode, setMode] = useState<"app" | "batch">("app");
  const [step, setStep] = useState(1);
  const [evaluating, setEvaluating] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deckName, setDeckName] = useState("");
  const [finName, setFinName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extract, setExtract] = useState<{ matched: { label: string; value: string }[]; error?: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setStep(1); setMode("app"); setForm(emptyForm); setDeckName(""); setFinName("");
      setExtract(null); setBatchError(null);
    }
  }, [open]);

  if (!open) return null;

  const num = (v: string) => Math.max(0, Math.round(Number(v) || 0));
  const toOpt = (v: number | ""): number | undefined => (v === "" ? undefined : Math.max(0, Number(v) || 0));
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const resolvedIndustry = form.industry === "Other" ? (form.custom_industry.trim() || "Other") : form.industry;
  const preview = buildForecast(resolvedIndustry);
  const askOk = form.ask_amount_usd === 0 || (form.ask_amount_usd >= 10000 && form.ask_amount_usd <= 1_000_000);

  const runExtract = async (file: File | undefined | null, kind: "deck" | "financial") => {
    if (!file) return;
    if (kind === "deck") setDeckName(file.name); else setFinName(file.name);
    setExtracting(true); setExtract(null);
    const res = await extractFromFile(file);
    const x = res.fields;
    const patch: Partial<FormState> = {};
    const setIf = <K extends keyof ExtractedFields>(k: K, apply: (v: number) => void) => { if (x[k] != null) apply(x[k] as number); };
    setIf("sales_amount_usd", (v) => (patch.sales_amount_usd = v));
    setIf("funding_total_usd", (v) => (patch.funding_total_usd = v));
    setIf("ask_amount_usd", (v) => (patch.ask_amount_usd = v));
    setIf("round_size_usd", (v) => (patch.round_size_usd = v));
    setIf("team_size", (v) => (patch.team_size = v));
    setIf("revenue_growth_pct", (v) => (patch.revenue_growth_pct = v));
    setIf("runway_months", (v) => (patch.runway_months = v));
    setIf("monthly_burn_usd", (v) => (patch.monthly_burn_usd = v));
    setIf("sam_usd", (v) => (patch.sam_usd = v));
    setIf("som_usd", (v) => (patch.som_usd = v));
    setIf("founding_year", (v) => (patch.founding_year = v));
    setForm((f) => ({ ...f, ...patch }));
    setExtract({ matched: res.matched, error: res.error });
    setExtracting(false);
  };

  const submit = () => {
    if (!form.name.trim() || evaluating) return;
    setEvaluating(true);
    setTimeout(() => {
      const input: StartupInput = {
        name: form.name.trim(), industry: resolvedIndustry, is_b2b: form.is_b2b,
        team_size: Math.max(1, form.team_size), funding_total_usd: form.funding_total_usd,
        funding_rounds: form.funding_rounds, time_to_first_funding_months: form.time_to_first_funding_months,
        has_previous_exit: form.has_previous_exit, sales_amount_usd: form.sales_amount_usd,
        founder_name: form.founder_name.trim() || undefined, founder_role: form.founder_role,
        founder_background: form.founder_background.trim() || undefined, description: form.description.trim() || undefined,
        stage: form.stage, unique_tech: form.unique_tech, revenue_model: form.revenue_model,
        country: form.country, founding_year: form.founding_year,
        ask_amount_usd: form.ask_amount_usd || undefined, round_size_usd: form.round_size_usd || undefined,
        previous_investment: form.previous_investment, successful_project: form.successful_project.trim() || undefined,
        technical_cofounder: form.technical_cofounder, revenue_growth_pct: toOpt(form.revenue_growth_pct),
        runway_months: toOpt(form.runway_months), monthly_burn_usd: toOpt(form.monthly_burn_usd),
        sam_usd: toOpt(form.sam_usd), som_usd: toOpt(form.som_usd),
      };
      const s = evaluateStartup(input, nextId);
      setEvaluating(false);
      onCreate([s]);
    }, 700);
  };

  const handleBatch = async (file: File | undefined | null) => {
    if (!file) return;
    setBatchError(null); setBatchBusy(true);
    try {
      const created = await parseStartupsFromFile(file, nextId);
      onCreate(created);
    } catch (e) {
      setBatchError(e instanceof Error ? e.message : "Could not parse that file.");
    } finally {
      setBatchBusy(false);
    }
  };

  const stepLabels = ["Company", "Team", "Financials"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-pane border border-line rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-[var(--shadow-pop)] animate-scale-in">
        <div className="flex items-center justify-between px-5 pt-4 shrink-0">
          <h2 className="text-[15px] font-semibold">Add a company</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-3 hover:text-ink p-1 rounded-lg hover:bg-tint transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-1 px-5 pt-3 border-b border-line shrink-0">
          {([["app", "Single entry"], ["batch", "Import file"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setMode(key)}
              className={cn("px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors",
                mode === key ? "border-accent text-accent-deep" : "border-transparent text-ink-3 hover:text-ink")}>
              {label}
            </button>
          ))}
        </div>

        {mode === "app" ? (
          <>
            <div className="flex items-center justify-center gap-2 py-4 shrink-0">
              {stepLabels.map((label, i) => {
                const n = i + 1; const done = step > n; const active = step === n;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <button onClick={() => setStep(n)}
                      className={cn("w-6 h-6 rounded-full grid place-items-center text-[11px] font-semibold transition-colors",
                        done || active ? "bg-accent text-white" : "bg-tint text-ink-3")}>
                      {done ? <Check className="w-3.5 h-3.5" /> : n}
                    </button>
                    <span className={cn("text-[11px] font-medium hidden sm:inline", active ? "text-ink" : "text-ink-3")}>{label}</span>
                    {n < 3 && <span className={cn("w-6 h-px", done ? "bg-accent" : "bg-line")} />}
                  </div>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto scroll-thin px-5 pb-2">
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Company name *" htmlFor="ev-name">
                      <input id="ev-name" className={inputCls} placeholder="Helios Robotics" value={form.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
                    </Field>
                    <Field label="Industry" htmlFor="ev-industry">
                      <select id="ev-industry" className={inputCls} value={form.industry} onChange={(e) => set({ industry: e.target.value })}>
                        {industries.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                      </select>
                    </Field>
                    {form.industry === "Other" && (
                      <Field label="Custom industry" htmlFor="ev-custom">
                        <input id="ev-custom" className={inputCls} placeholder="AI / Data Science" value={form.custom_industry} onChange={(e) => set({ custom_industry: e.target.value })} />
                      </Field>
                    )}
                    <Field label="Development stage" htmlFor="ev-stage">
                      <select id="ev-stage" className={inputCls} value={form.stage} onChange={(e) => set({ stage: e.target.value })}>
                        {stages.map((st) => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </Field>
                    <Field label="Employees" htmlFor="ev-team">
                      <input id="ev-team" type="number" min={1} className={inputCls} value={form.team_size} onChange={(e) => set({ team_size: Math.max(1, num(e.target.value)) })} />
                    </Field>
                    <Field label="Business model">
                      <Segmented value={form.is_b2b ? "b2b" : "b2c"} options={[{ key: "b2b", label: "B2B" }, { key: "b2c", label: "B2C" }]} onChange={(k) => set({ is_b2b: k === "b2b" })} />
                    </Field>
                    <Field label="Unique tech / patents?">
                      <Segmented value={form.unique_tech ? "yes" : "no"} options={[{ key: "no", label: "No" }, { key: "yes", label: "Yes" }]} onChange={(k) => set({ unique_tech: k === "yes" })} />
                    </Field>
                    <Field label="Revenue model" htmlFor="ev-revmodel">
                      <select id="ev-revmodel" className={inputCls} value={form.revenue_model} onChange={(e) => set({ revenue_model: e.target.value })}>
                        {revenueModels.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </Field>
                    <Field label="Founding year" htmlFor="ev-year">
                      <select id="ev-year" className={inputCls} value={form.founding_year} onChange={(e) => set({ founding_year: Number(e.target.value) })}>
                        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </Field>
                    <Field label="Country" htmlFor="ev-country">
                      <select id="ev-country" className={inputCls} value={form.country} onChange={(e) => set({ country: e.target.value })}>
                        {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Ask ($)" htmlFor="ev-ask" hint={!askOk ? "Outside a typical $10K–$1M ticket" : undefined}>
                      <input id="ev-ask" type="number" min={0} step={10000} className={cn(inputCls, !askOk && "border-warn")} placeholder="e.g. 300000" value={form.ask_amount_usd || ""} onChange={(e) => set({ ask_amount_usd: num(e.target.value) })} />
                    </Field>
                    <Field label="Round size ($)" htmlFor="ev-round">
                      <input id="ev-round" type="number" min={0} step={10000} className={inputCls} placeholder="e.g. 1000000" value={form.round_size_usd || ""} onChange={(e) => set({ round_size_usd: num(e.target.value) })} />
                    </Field>
                  </div>
                  <Field label="Description" htmlFor="ev-desc">
                    <textarea id="ev-desc" rows={2} className={inputCls} placeholder="What the company does, in one or two sentences." value={form.description} onChange={(e) => set({ description: e.target.value })} />
                  </Field>
                  <div className="flex items-start gap-2.5 bg-accent-soft/50 border border-accent/15 rounded-lg px-3 py-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent-deep shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed text-ink-2">
                      Market &amp; macro auto-filled from <span className="font-medium text-ink">{resolvedIndustry}</span>: modeled growth <span className="font-mono text-accent-deep">{(preview.cagr * 100).toFixed(1)}% CAGR</span>, SAM ${preview.sam_now}M. Refine numbers in step 3.
                    </p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Founder name" htmlFor="ev-founder">
                      <input id="ev-founder" className={inputCls} placeholder="Full name" value={form.founder_name} onChange={(e) => set({ founder_name: e.target.value })} />
                    </Field>
                    <Field label="Role" htmlFor="ev-role">
                      <input id="ev-role" className={inputCls} placeholder="CEO / Founder" value={form.founder_role} onChange={(e) => set({ founder_role: e.target.value })} />
                    </Field>
                    <Field label="Technical co-founder?">
                      <Segmented value={form.technical_cofounder ? "yes" : "no"} options={[{ key: "no", label: "No" }, { key: "yes", label: "Yes" }]} onChange={(k) => set({ technical_cofounder: k === "yes" })} />
                    </Field>
                    <Field label="Previous founder exit?">
                      <Segmented value={form.has_previous_exit ? "yes" : "no"} options={[{ key: "no", label: "No" }, { key: "yes", label: "Yes" }]} onChange={(k) => set({ has_previous_exit: k === "yes" })} />
                    </Field>
                  </div>
                  <Field label="Founder background" htmlFor="ev-bg" hint="The more detail, the higher the data confidence.">
                    <textarea id="ev-bg" rows={3} className={inputCls} placeholder="Domain experience, prior roles…" value={form.founder_background} onChange={(e) => set({ founder_background: e.target.value })} />
                  </Field>
                  <Field label="Notable / successful projects (optional)" htmlFor="ev-proj">
                    <textarea id="ev-proj" rows={2} className={inputCls} placeholder="Products shipped, prior ventures, exits…" value={form.successful_project} onChange={(e) => set({ successful_project: e.target.value })} />
                  </Field>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <div className="microlabel mb-2 text-[10px]">Upload materials — read in your browser, nothing leaves the page</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FileDrop label="Pitch deck" accept=".pdf" fileName={deckName} hint="PDF" onFile={(f) => runExtract(f, "deck")} />
                      <FileDrop label="Financial model" accept=".xlsx,.xls,.csv,.pdf" fileName={finName} hint="XLSX, CSV, PDF" onFile={(f) => runExtract(f, "financial")} />
                    </div>
                    {extracting && <p className="text-xs text-ink-2 mt-2 inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading document…</p>}
                    {extract && !extracting && (
                      extract.error ? <p className="text-xs text-bad mt-2">{extract.error}</p>
                      : extract.matched.length > 0 ? (
                        <div className="mt-2 bg-good-soft/60 border border-good/20 rounded-lg px-3 py-2.5">
                          <p className="text-[11px] font-medium text-good mb-1.5 inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Extracted &amp; pre-filled — confirm below</p>
                          <div className="flex flex-wrap gap-1.5">
                            {extract.matched.map((m, i) => (
                              <span key={i} className="text-[11px] bg-pane border border-line rounded px-1.5 py-0.5 text-ink-2"><span className="text-ink-3">{m.label}:</span> {m.value}</span>
                            ))}
                          </div>
                        </div>
                      ) : <p className="text-xs text-ink-3 mt-2">Read the file, but couldn&apos;t auto-detect figures — enter them below.</p>
                    )}
                  </div>

                  <div>
                    <div className="microlabel mb-2 text-[10px]">Financial snapshot <span className="text-ink-3 normal-case tracking-normal">(optional — sharpens score &amp; confidence)</span></div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <Field label="Revenue ($)" htmlFor="ev-rev"><input id="ev-rev" type="number" min={0} step={1000} className={inputCls} value={form.sales_amount_usd || ""} placeholder="0" onChange={(e) => set({ sales_amount_usd: num(e.target.value) })} /></Field>
                      <Field label="Growth (%/mo)" htmlFor="ev-growth"><input id="ev-growth" type="number" min={0} className={inputCls} value={form.revenue_growth_pct} placeholder="—" onChange={(e) => set({ revenue_growth_pct: e.target.value === "" ? "" : num(e.target.value) })} /></Field>
                      <Field label="Runway (mo)" htmlFor="ev-runway"><input id="ev-runway" type="number" min={0} className={inputCls} value={form.runway_months} placeholder="—" onChange={(e) => set({ runway_months: e.target.value === "" ? "" : num(e.target.value) })} /></Field>
                      <Field label="Monthly burn ($)" htmlFor="ev-burn"><input id="ev-burn" type="number" min={0} step={1000} className={inputCls} value={form.monthly_burn_usd} placeholder="—" onChange={(e) => set({ monthly_burn_usd: e.target.value === "" ? "" : num(e.target.value) })} /></Field>
                      <Field label="SAM ($M)" htmlFor="ev-sam" hint="Blank = sector default"><input id="ev-sam" type="number" min={0} className={inputCls} value={form.sam_usd} placeholder={String(preview.sam_now)} onChange={(e) => set({ sam_usd: e.target.value === "" ? "" : num(e.target.value) })} /></Field>
                      <Field label="SOM ($M)" htmlFor="ev-som" hint="Blank = sector default"><input id="ev-som" type="number" min={0} className={inputCls} value={form.som_usd} placeholder={String(preview.som_now)} onChange={(e) => set({ som_usd: e.target.value === "" ? "" : num(e.target.value) })} /></Field>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field label="Total funding ($)" htmlFor="ev-fund"><input id="ev-fund" type="number" min={0} step={10000} className={inputCls} value={form.funding_total_usd || ""} placeholder="0" onChange={(e) => set({ funding_total_usd: num(e.target.value) })} /></Field>
                    <Field label="Funding rounds" htmlFor="ev-rounds"><input id="ev-rounds" type="number" min={0} className={inputCls} value={form.funding_rounds || ""} placeholder="0" onChange={(e) => set({ funding_rounds: num(e.target.value) })} /></Field>
                    <Field label="Months to funding" htmlFor="ev-time"><input id="ev-time" type="number" min={0} className={inputCls} value={form.time_to_first_funding_months || ""} placeholder="0" onChange={(e) => set({ time_to_first_funding_months: num(e.target.value) })} /></Field>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-line shrink-0">
              <Button variant="outline" size="sm" onClick={() => (step > 1 ? setStep(step - 1) : onClose())}>
                <ArrowLeft className="w-3.5 h-3.5" /> {step > 1 ? "Back" : "Cancel"}
              </Button>
              {step < 3 ? (
                <Button variant="brand" size="sm" onClick={() => setStep(step + 1)} disabled={step === 1 && !form.name.trim()}>
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button variant="brand" size="sm" onClick={submit} disabled={!form.name.trim() || evaluating} className="min-w-[140px]">
                  {evaluating ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Scoring…</>) : (<>Score company <ArrowRight className="w-3.5 h-3.5" /></>)}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="p-5 space-y-4">
            <label className="block border border-dashed border-line rounded-xl px-4 py-9 text-center cursor-pointer hover:border-accent hover:bg-accent-soft/30 transition-colors">
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { handleBatch(e.target.files?.[0]); e.target.value = ""; }} />
              {batchBusy ? (
                <span className="inline-flex items-center gap-2 text-[13px] text-ink-2"><Loader2 className="w-5 h-5 animate-spin" /> Scoring companies…</span>
              ) : (
                <>
                  <UploadCloud className="w-6 h-6 text-ink-3 mx-auto mb-2" />
                  <span className="block text-[13px] font-medium text-ink">Upload a CSV or Excel file</span>
                  <span className="block text-xs text-ink-3 mt-1">Every row is scored and added on import</span>
                </>
              )}
            </label>
            {batchError && <p className="text-xs text-bad">{batchError}</p>}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-ink-3">Columns: name, industry, stage, team, funding, ask, revenue, growth, runway…</p>
              <button onClick={downloadCsvTemplate} className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-accent-deep hover:underline">
                <Download className="w-3.5 h-3.5" /> Template
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
