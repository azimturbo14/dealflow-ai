"use client";

import { useState, useRef, useCallback } from "react";
import {
  ArrowLeft, ArrowRight, UploadCloud, Sparkles, FileSpreadsheet,
  Download, TriangleAlert, Loader2, Database, ShieldCheck,
} from "lucide-react";
import { parseStartupsFromFile, downloadCsvTemplate } from "@/lib/import";
import { mockStartups, type Startup } from "@/lib/mock-data";
import { Logo } from "@/components/app/Logo";

export type SourceKind = "upload" | "demo";

export function SourcePicker({
  onData,
  onBack,
}: {
  onData: (companies: Startup[], kind: SourceKind, label: string) => void;
  onBack: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<null | "upload" | "demo">(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      setError(null);
      setFileName(file.name);
      setBusy("upload");
      try {
        const companies = await parseStartupsFromFile(file, 1);
        if (companies.length === 0) throw new Error("No companies found in that file.");
        onData(companies, "upload", file.name);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read that file.");
        setBusy(null);
        setFileName("");
      }
    },
    [onData]
  );

  const loadDemo = useCallback(() => {
    setBusy("demo");
    // clone so the workspace can mutate/append without touching the source
    const cohort = mockStartups.map((s) => ({ ...s }));
    onData(cohort, "demo", "Demo cohort · 50 companies");
  }, [onData]);

  return (
    <div className="min-h-dvh bg-canvas text-ink flex flex-col">
      {/* top bar */}
      <div className="border-b border-line bg-pane/70 backdrop-blur">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-5 sm:px-8 h-16">
          <Logo subtitle="New screening" />
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center">
        <div className="max-w-5xl mx-auto w-full px-5 sm:px-8 py-12 sm:py-16">
          {/* progress */}
          <div className="flex items-center gap-2 text-[12px] text-ink-3 mb-8">
            <span className="font-mono text-ink">01</span>
            <span className="w-8 h-px bg-line" />
            <span className="font-medium text-ink">Choose a data source</span>
            <span className="w-8 h-px bg-line" />
            <span className="font-mono">02 Score</span>
          </div>

          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
              Where should we start?
            </h1>
            <p className="text-[15px] text-ink-2 mt-3 leading-relaxed">
              Bring your own pipeline as a spreadsheet, or explore a fully-worked demo cohort first. Nothing is scored until you choose.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-10">
            {/* Upload */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className={`relative rounded-2xl border bg-pane p-6 sm:p-7 transition-all shadow-[var(--shadow-xs)] ${
                dragging ? "border-accent ring-4 ring-accent/15" : "border-line"
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-accent-soft border border-accent/20 grid place-items-center text-accent-deep">
                <UploadCloud className="w-5 h-5" />
              </div>
              <h2 className="text-[17px] font-semibold mt-4">Upload your pipeline</h2>
              <p className="text-[13px] text-ink-2 mt-1.5 leading-relaxed">
                A CSV or Excel export of the companies you're evaluating. One row per company.
              </p>

              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
              />

              <button
                onClick={() => inputRef.current?.click()}
                disabled={busy === "upload"}
                className="mt-5 w-full rounded-xl border border-dashed border-line hover:border-accent hover:bg-accent-soft/30 transition-colors py-6 grid place-items-center text-center disabled:opacity-70"
              >
                {busy === "upload" ? (
                  <span className="inline-flex items-center gap-2 text-[13px] text-ink-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Reading {fileName}…
                  </span>
                ) : (
                  <>
                    <FileSpreadsheet className="w-6 h-6 text-ink-3" />
                    <span className="text-[13px] font-medium text-ink mt-2">
                      Click to browse or drop a file
                    </span>
                    <span className="text-[11px] text-ink-3 mt-0.5">CSV, XLSX or XLS · up to 500 rows</span>
                  </>
                )}
              </button>

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-bad-soft border border-bad/20 px-3 py-2.5 text-[12px] text-bad">
                  <TriangleAlert className="w-4 h-4 shrink-0 mt-px" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              <button
                onClick={downloadCsvTemplate}
                className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent-deep hover:underline"
              >
                <Download className="w-3.5 h-3.5" /> Download the CSV template
              </button>
            </div>

            {/* Demo */}
            <div className="relative rounded-2xl border border-line bg-pane p-6 sm:p-7 shadow-[var(--shadow-xs)] flex flex-col">
              <div className="w-11 h-11 rounded-xl bg-ink/5 border border-line grid place-items-center text-ink">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="text-[17px] font-semibold mt-4 flex items-center gap-2">
                Explore the demo dataset
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent-deep bg-accent-soft border border-accent/20 rounded px-1.5 py-0.5">
                  <Sparkles className="w-3 h-3" /> Fastest
                </span>
              </h2>
              <p className="text-[13px] text-ink-2 mt-1.5 leading-relaxed">
                A curated cohort of 50 realistic startups across 13 sectors — already structured for scoring.
              </p>

              <ul className="mt-5 space-y-2.5 text-[13px] text-ink-2">
                {[
                  "See a full ranked portfolio instantly",
                  "Open any company as an investment memo",
                  "Understand the scoring before you upload",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>

              <button
                onClick={loadDemo}
                disabled={busy === "demo"}
                className="mt-auto pt-6"
              >
                <span className="w-full inline-flex items-center justify-center gap-2 bg-ink text-canvas font-medium text-[13px] px-4 py-3 rounded-xl hover:bg-ink/90 transition-colors">
                  {busy === "demo" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Loading cohort…</>
                  ) : (
                    <>Use demo dataset <ArrowRight className="w-4 h-4" /></>
                  )}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-2 text-[12px] text-ink-3">
            <ShieldCheck className="w-4 h-4 text-ink-3" />
            Files are parsed locally in your browser — nothing is uploaded to a server.
          </div>
        </div>
      </div>
    </div>
  );
}
