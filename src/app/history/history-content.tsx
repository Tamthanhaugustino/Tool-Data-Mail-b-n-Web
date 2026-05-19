"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ScanJob = {
  id: string;
  provider: "mock" | "hunter";
  status: "completed" | "partial" | "failed";
  inputDomains: string[];
  totalDomains: number;
  scannedDomains: number;
  totalEmails: number;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
};

type JobsResponse = {
  jobs?: ScanJob[];
  scanStorage?: "supabase" | "memory" | "none";
  scanStorageFallback?: boolean;
  scanStorageReason?: "not_configured" | "table_missing" | "write_failed";
  message?: string;
  error?: string;
};

const statusBadge = {
  completed: { label: "Hoàn thành", variant: "default" as const },
  partial: { label: "Một phần", variant: "secondary" as const },
  failed: { label: "Thất bại", variant: "destructive" as const },
};

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

function storageNote(data: JobsResponse | null): string | null {
  if (!data) return null;
  if (data.scanStorage === "supabase" && !data.scanStorageFallback) {
    return "Lịch sử đang đọc từ Supabase.";
  }
  if (data.scanStorageReason === "table_missing") {
    return "Đang dùng in-memory fallback vì chưa có migration app_scan_jobs/app_scan_results.";
  }
  if (data.scanStorageReason === "not_configured") {
    return "Đang dùng in-memory fallback vì Supabase service role chưa cấu hình.";
  }
  if (data.scanStorageReason === "write_failed") {
    return "Supabase có lỗi khi đọc/ghi lịch sử, tạm dùng in-memory fallback.";
  }
  return null;
}

export function HistoryContent() {
  const [data, setData] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scan/jobs?limit=50", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as JobsResponse | null;
      if (!res.ok) {
        setError(json?.message ?? json?.error ?? `HTTP ${res.status}`);
        setData(null);
        return;
      }
      setData(json ?? { jobs: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được lịch sử scan.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch("/api/scan/jobs?limit=50", { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as JobsResponse | null;
        if (!active) return;
        if (!res.ok) {
          setError(json?.message ?? json?.error ?? `HTTP ${res.status}`);
          setData(null);
          return;
        }
        setData(json ?? { jobs: [] });
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Không tải được lịch sử scan.");
        setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const jobs = data?.jobs ?? [];
  const note = storageNote(data);

  return (
    <>
      <PageHeader
        title="Scan History"
        subtitle="Lịch sử Domain Scan đã lưu cho tài khoản hiện tại."
        actions={
          <Button variant="outline" size="sm" onClick={() => void loadJobs()} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Làm mới
          </Button>
        }
      />

      {note ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {note}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800">
          <b>Không tải được lịch sử:</b> {error}
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-12 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" />
          Đang tải lịch sử scan...
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="font-medium text-slate-700">Chưa có lịch sử scan</p>
          <p className="mt-1 text-sm text-slate-500">
            Chưa có lịch sử scan. Hãy chạy Domain Scan để tạo lịch sử.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Run</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Kết quả</TableHead>
                <TableHead className="hidden md:table-cell">Thời gian</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => {
                const st = statusBadge[job.status];
                const duration = formatDuration(job.durationMs);
                return (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="font-medium">
                        {job.totalDomains} domain · {job.scannedDomains} scanned
                      </div>
                      <div className="text-xs font-mono text-slate-500">
                        {job.inputDomains.slice(0, 3).join(", ")}
                        {job.inputDomains.length > 3 ? ", ..." : ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500">{job.provider}</TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell>{job.totalEmails} email</TableCell>
                    <TableCell className="hidden text-slate-500 md:table-cell">
                      {formatDate(job.createdAt)}
                      {duration ? ` · ${duration}` : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/results?jobId=${encodeURIComponent(job.id)}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                      >
                        Xem
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
