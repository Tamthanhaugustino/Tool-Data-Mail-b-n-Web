"use client";

import { useState } from "react";
import { Download, Filter } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { ResultsTable } from "@/components/shared/results-table";
import { ExportModal } from "@/components/shared/export-modal";
import { Button } from "@/components/ui/button";
import { MOCK_RESULTS } from "@/lib/mock-data";

export default function ResultsPage() {
  const [exportOpen, setExportOpen] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  return (
    <AppShell title="Results" breadcrumb={{ parent: "Domain Scan", current: "Results" }}>
      <PageHeader
        title="Results Table"
        subtitle="Kết quả run gần nhất · Run #42 · 12 email (mock)."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowEmpty(!showEmpty)}>
              (Demo) {showEmpty ? "Có data" : "Empty"}
            </Button>
            <Button variant="outline">
              <Filter className="size-4" />
              Lọc
            </Button>
            <Button onClick={() => setExportOpen(true)}>
              <Download className="size-4" />
              Xuất
            </Button>
          </>
        }
      />
      <ResultsTable
        rows={showEmpty ? [] : MOCK_RESULTS}
        emptyMessage="Chưa có kết quả cho run này."
      />
      <ExportModal open={exportOpen} onOpenChange={setExportOpen} recordCount={12} />
    </AppShell>
  );
}
