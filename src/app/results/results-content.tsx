"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Filter, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ResultsTable } from "@/components/shared/results-table";
import { ExportModal } from "@/components/shared/export-modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { MOCK_RESULTS } from "@/lib/mock-data";
import type { ScanResultRow } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type ScanJob = {
  id: string;
  provider: "mock" | "hunter";
  status: "completed" | "partial" | "failed";
  totalDomains: number;
  scannedDomains: number;
  totalEmails: number;
  durationMs: number | null;
  createdAt: string;
  errorMessage: string | null;
};

type ScanJobResult = {
  id: string;
  email: string;
  name: string;
  title: string;
  company: string;
  domain: string;
  confidence: number;
  status: "verified" | "accept_all" | "webmail" | "invalid" | "unknown";
};

type JobResponse = {
  job?: ScanJob;
  results?: ScanJobResult[];
  scanStorage?: "supabase" | "memory" | "none";
  scanStorageFallback?: boolean;
  scanStorageReason?: "not_configured" | "table_missing" | "write_failed";
  message?: string;
  error?: string;
};

type ResultsContentProps = {
  jobId?: string;
};

function mapStatus(status: ScanJobResult["status"]): ScanResultRow["status"] {
  if (status === "verified") return "verified";
  if (status === "accept_all") return "accept_all";
  return "webmail";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${Math.round(ms / 100) / 10}s`;
}

function storageNote(data: JobResponse | null): string | null {
  if (!data) return null;
  if (data.scanStorage === "supabase" && !data.scanStorageFallback) {
    return "Kết quả đang đọc từ Supabase.";
  }
  if (data.scanStorageReason === "table_missing") {
    return "Đang dùng in-memory fallback vì chưa có migration app_scan_jobs/app_scan_results.";
  }
  if (data.scanStorageReason === "not_configured") {
    return "Đang dùng in-memory fallback vì Supabase service role chưa cấu hình.";
  }
  if (data.scanStorageReason === "write_failed") {
    return "Supabase có lỗi khi đọc/ghi kết quả, tạm dùng in-memory fallback.";
  }
  return null;
}

export function ResultsContent({ jobId }: ResultsContentProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [data, setData] = useState<JobResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [error, setError] = useState<string | null>(null);

  const loadJob = async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/scan/jobs/${encodeURIComponent(jobId)}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as JobResponse | null;
      if (!res.ok) {
        setError(json?.message ?? json?.error ?? `HTTP ${res.status}`);
        setData(null);
        return;
      }
      setData(json ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được kết quả scan.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;

    let active = true;
    fetch(`/api/scan/jobs/${encodeURIComponent(jobId)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as JobResponse | null;
        if (!active) return;
        if (!res.ok) {
          setError(json?.message ?? json?.error ?? `HTTP ${res.status}`);
          setData(null);
          return;
        }
        setData(json ?? null);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Không tải được kết quả scan.");
        setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [jobId]);

  const rows = useMemo<ScanResultRow[]>(() => {
    if (!jobId) return showEmpty ? [] : MOCK_RESULTS;
    return (data?.results ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      title: row.title,
      company: row.company,
      domain: row.domain,
      confidence: row.confidence,
      status: mapStatus(row.status),
    }));
  }, [data?.results, jobId, showEmpty]);

  const job = data?.job;
  const note = storageNote(data);
  const subtitle = job
    ? `${job.totalEmails} email · ${job.scannedDomains}/${job.totalDomains} domain · ${job.provider} · ${formatDate(job.createdAt)}${formatDuration(job.durationMs) ? ` · ${formatDuration(job.durationMs)}` : ""}`
    : jobId
      ? "Kết quả Domain Scan đã lưu."
      : "Kết quả run gần nhất · Run #42 · 12 email (mock).";

  return (
    <>
      <PageHeader
        title="Results Table"
        subtitle={subtitle}
        actions={
          <>
            {!jobId ? (
              <Button variant="outline" size="sm" onClick={() => setShowEmpty(!showEmpty)}>
                (Demo) {showEmpty ? "Có data" : "Empty"}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => void loadJob()} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Làm mới
              </Button>
            )}
            <Button variant="outline">
              <Filter className="size-4" />
              Lọc
            </Button>
            <Button onClick={() => setExportOpen(true)} disabled={rows.length === 0}>
              <Download className="size-4" />
              Xuất
            </Button>
          </>
        }
      />

      {note ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {note}
        </div>
      ) : null}

      {jobId ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Link href="/history" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Quay lại History
          </Link>
          <Link href="/scan" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Chạy scan mới
          </Link>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
          <b>Không tải được kết quả:</b> {error}
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-12 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" />
          Đang tải kết quả scan...
        </div>
      ) : (
        <ResultsTable
          rows={rows}
          emptyMessage={
            jobId
              ? "Chưa có kết quả cho scan job này."
              : "Chưa có kết quả cho run này."
          }
        />
      )}

      <ExportModal open={exportOpen} onOpenChange={setExportOpen} recordCount={rows.length} />
    </>
  );
}
