"use client";

import { useState, useCallback } from "react";
import type { Startup } from "@/lib/mock-data";
import { Landing } from "@/components/app/Landing";
import { SourcePicker, type SourceKind } from "@/components/app/SourcePicker";
import { Processing } from "@/components/app/Processing";
import { Workspace } from "@/components/app/Workspace";

type Phase = "landing" | "source" | "processing" | "workspace";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [companies, setCompanies] = useState<Startup[]>([]);
  const [sourceLabel, setSourceLabel] = useState<string>("");

  const startScreening = useCallback(() => setPhase("source"), []);

  const handleData = useCallback(
    (data: Startup[], _kind: SourceKind, label: string) => {
      setCompanies(data);
      setSourceLabel(label);
      setPhase("processing");
    },
    []
  );

  const handleAddCompanies = useCallback((created: Startup[]) => {
    setCompanies((prev) => [...created, ...prev]);
  }, []);

  const reset = useCallback(() => {
    setCompanies([]);
    setSourceLabel("");
    setPhase("source");
  }, []);

  switch (phase) {
    case "landing":
      return <Landing onStart={startScreening} onDemo={startScreening} />;
    case "source":
      return (
        <SourcePicker onData={handleData} onBack={() => setPhase("landing")} />
      );
    case "processing":
      return (
        <Processing
          companies={companies}
          sourceLabel={sourceLabel}
          onDone={() => setPhase("workspace")}
        />
      );
    case "workspace":
      return (
        <Workspace
          companies={companies}
          sourceLabel={sourceLabel}
          onAddCompanies={handleAddCompanies}
          onReset={reset}
        />
      );
  }
}
