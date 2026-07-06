"use client";

import { useState, useMemo, useCallback } from "react";
import {
  LayoutDashboard, Table2, BookOpen, Plus, RefreshCw, Menu, X,
} from "lucide-react";
import type { Startup } from "@/lib/mock-data";
import { countVerdicts } from "@/lib/format";
import { Logo } from "@/components/app/Logo";
import { Button } from "@/components/app/primitives";
import { Dashboard } from "@/components/app/Dashboard";
import { CompaniesTable } from "@/components/app/CompaniesTable";
import { CompanyMemo } from "@/components/app/CompanyMemo";
import { Methodology } from "@/components/app/Methodology";
import { EvaluateModal } from "@/components/app/EvaluateModal";
import { cn } from "@/lib/utils";

type Section = "dashboard" | "companies" | "methodology";

export function Workspace({
  companies,
  sourceLabel,
  onAddCompanies,
  onReset,
}: {
  companies: Startup[];
  sourceLabel: string;
  onAddCompanies: (created: Startup[]) => void;
  onReset: () => void;
}) {
  const [section, setSection] = useState<Section>("dashboard");
  const [openId, setOpenId] = useState<number | null>(null);
  const [returnTo, setReturnTo] = useState<Section>("dashboard");
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const counts = useMemo(() => countVerdicts(companies), [companies]);
  const nextId = useMemo(
    () => Math.max(999, ...companies.map((s) => s.id)) + 1,
    [companies]
  );
  const selected = useMemo(
    () => companies.find((s) => s.id === openId) ?? null,
    [companies, openId]
  );

  const open = useCallback(
    (id: number) => {
      setReturnTo(section);
      setOpenId(id);
      window.scrollTo({ top: 0 });
    },
    [section]
  );
  const closeMemo = useCallback(() => {
    setOpenId(null);
    setSection(returnTo);
  }, [returnTo]);

  const go = (s: Section) => {
    setOpenId(null);
    setSection(s);
    setMobileNav(false);
    window.scrollTo({ top: 0 });
  };

  const handleCreate = (created: Startup[]) => {
    if (created.length === 0) return;
    onAddCompanies(created);
    setModalOpen(false);
    if (created.length === 1) {
      setReturnTo("companies");
      setOpenId(created[0].id);
    } else {
      go("companies");
    }
  };

  const nav: { key: Section; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { key: "dashboard", label: "Overview", icon: LayoutDashboard },
    { key: "companies", label: "Companies", icon: Table2, badge: counts.all },
    { key: "methodology", label: "Methodology", icon: BookOpen },
  ];

  const navItems = (
    <NavItems nav={nav} section={section} openId={openId} onGo={go} />
  );

  return (
    <div className="min-h-dvh lg:h-dvh flex flex-col lg:flex-row bg-canvas text-ink lg:overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-line bg-pane">
        <div className="flex items-center px-4 h-16 border-b border-line">
          <Logo subtitle="Investment intelligence" />
        </div>
        <div className="p-2.5">
          <Button variant="brand" size="md" className="w-full" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" /> Add company
          </Button>
        </div>
        <nav className="flex-1 p-2.5 pt-0 space-y-0.5 overflow-y-auto scroll-thin">
          {navItems}
          <div className="pt-5 pb-1.5 px-2.5 microlabel text-[9px]">Verdict split</div>
          {[
            { label: "Pursue", dot: "bg-good", n: counts.high },
            { label: "Review", dot: "bg-warn", n: counts.moderate },
            { label: "Pass", dot: "bg-bad", n: counts.low },
          ].map((v) => (
            <div key={v.label} className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-ink-2">
              <span className={cn("w-2 h-2 rounded-full", v.dot)} />
              {v.label}
              <span className="ml-auto font-mono text-[11px] text-ink-3 tabular">{v.n}</span>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-line">
          <div className="text-[11px] text-ink-3 mb-2 truncate" title={sourceLabel}>{sourceLabel}</div>
          <Button variant="outline" size="sm" className="w-full" onClick={onReset}>
            <RefreshCw className="w-3.5 h-3.5" /> New screening
          </Button>
        </div>
      </aside>

      {/* Top bar — mobile */}
      <div className="lg:hidden sticky top-0 z-30 border-b border-line bg-pane/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 h-14">
          <Logo />
          <div className="flex items-center gap-2">
            <Button variant="brand" size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
            <button onClick={() => setMobileNav((v) => !v)} className="p-2 -mr-2 text-ink-2" aria-label="Menu">
              {mobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileNav && (
          <div className="border-t border-line p-2.5 space-y-0.5 animate-fade-in">
            {navItems}
            <button onClick={onReset} className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink-2 hover:bg-tint transition-colors">
              <RefreshCw className="w-4 h-4" /> New screening
            </button>
          </div>
        )}
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 lg:overflow-y-auto scroll-thin">
        {selected ? (
          <CompanyMemo startup={selected} all={companies} onBack={closeMemo} onOpen={open} />
        ) : section === "dashboard" ? (
          <Dashboard data={companies} onOpen={open} onViewAll={() => go("companies")} />
        ) : section === "companies" ? (
          <CompaniesTable data={companies} onOpen={open} onNew={() => setModalOpen(true)} />
        ) : (
          <Methodology />
        )}
      </main>

      <EvaluateModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreate} nextId={nextId} />
    </div>
  );
}

function NavItems({
  nav, section, openId, onGo,
}: {
  nav: { key: Section; label: string; icon: typeof LayoutDashboard; badge?: number }[];
  section: Section;
  openId: number | null;
  onGo: (s: Section) => void;
}) {
  return (
    <>
      {nav.map((n) => {
        const active = !openId && section === n.key;
        return (
          <button
            key={n.key}
            onClick={() => onGo(n.key)}
            className={cn(
              "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
              active ? "bg-accent-soft text-accent-deep" : "text-ink-2 hover:bg-tint"
            )}
          >
            <n.icon className="w-4 h-4" />
            {n.label}
            {n.badge != null && (
              <span className="ml-auto font-mono text-[11px] text-ink-3 tabular">{n.badge}</span>
            )}
          </button>
        );
      })}
    </>
  );
}
