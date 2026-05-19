"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Download, Loader2, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadCsvFile, savedLeadsToCsv } from "@/lib/leads/export-csv";
import type {
  LeadsStorageBackend,
  SavedLeadRecord,
} from "@/lib/leads/types";

const verificationLabel: Record<SavedLeadRecord["status"], string> = {
  verified: "Verified",
  accept_all: "Accept-all",
  webmail: "Webmail",
};

function formatSavedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function storageAlertCopy(
  storage: LeadsStorageBackend,
  storageFallback?: boolean,
): { className: string; body: ReactNode } {
  if (storageFallback) {
    return {
      className: "mb-4 border-amber-200 bg-amber-50 text-amber-950",
      body: (
        <>
          <b>Fallback bộ nhớ tạm:</b> Supabase đã cấu hình nhưng bảng{" "}
          <code className="rounded bg-amber-100 px-1 font-mono text-xs">app_saved_leads</code> chưa
          được migrate. Chạy migration <code className="font-mono text-xs">0002_app_saved_leads.sql</code>{" "}
          rồi tải lại trang.
        </>
      ),
    };
  }
  if (storage === "supabase") {
    return {
      className: "mb-4 border-green-200 bg-green-50 text-green-950",
      body: (
        <>
          <b>Lưu bền vững:</b> Lead được lưu trên Supabase theo tài khoản đăng nhập (session demo).
          Chưa đồng bộ Supabase Auth — <code className="font-mono text-xs">user_id</code> là id session
          HMAC, không phải <code className="font-mono text-xs">auth.users</code>.
        </>
      ),
    };
  }
  return {
    className: "mb-4 border-amber-200 bg-amber-50 text-amber-950",
    body: (
      <>
        <b>Demo in-memory:</b> Đang dùng bộ nhớ tạm thời trên server (chưa cấu hình Supabase service
        role). Dữ liệu có thể mất khi restart. Điền{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> +{" "}
        <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> và apply migration để
        persist.
      </>
    ),
  };
}

export function LeadsContent({
  initialLeads,
  storage,
  storageFallback,
}: {
  initialLeads: SavedLeadRecord[];
  storage: LeadsStorageBackend;
  storageFallback?: boolean;
}) {
  const [leads, setLeads] = useState<SavedLeadRecord[]>(initialLeads);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.email.toLowerCase().includes(q) ||
        l.domain.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        l.title.toLowerCase().includes(q),
    );
  }, [leads, query]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const err = (data as { message?: string; error?: string } | null) ?? null;
        setError(err?.message ?? err?.error ?? `HTTP ${res.status}`);
        return;
      }
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xóa được lead.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = () => {
    const rows = filtered.length > 0 || query.trim() ? filtered : leads;
    if (rows.length === 0) return;
    const csv = savedLeadsToCsv(rows);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsvFile(csv, `saved-leads-${stamp}.csv`);
  };

  return (
    <>
      <PageHeader
        title="Saved Leads"
        subtitle={
          storage === "supabase" && !storageFallback
            ? "Phase 09D — lead lưu trên Supabase (session demo)."
            : "Foundation demo — lưu in-memory hoặc chờ cấu hình Supabase."
        }
        actions={
          <Button onClick={handleExport} disabled={leads.length === 0}>
            <Download className="size-4" />
            Tải CSV
          </Button>
        }
      />

      {(() => {
        const alert = storageAlertCopy(storage, storageFallback);
        return (
          <Alert className={alert.className}>
            <AlertDescription className="text-sm">{alert.body}</AlertDescription>
          </Alert>
        );
      })()}

      {error ? (
        <Alert className="mb-4 border-red-200 bg-red-50 text-red-900">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Tìm email, domain, công ty…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={leads.length === 0}
          />
        </div>
        <p className="text-sm text-slate-500">
          <b>{filtered.length}</b>
          {query.trim() ? ` / ${leads.length}` : ""} lead
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="font-medium text-slate-700">Chưa có lead nào được lưu</p>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            Hãy scan domain và lưu lead từ bảng kết quả trên trang Domain Scan.
          </p>
          <Link href="/scan" className={cn(buttonVariants(), "mt-4")}>
            Mở Domain Scan
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
          Không có lead khớp bộ lọc &quot;{query.trim()}&quot;.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Họ tên</TableHead>
                  <TableHead className="hidden lg:table-cell">Chức danh</TableHead>
                  <TableHead>Công ty</TableHead>
                  <TableHead className="hidden sm:table-cell">Domain</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="hidden md:table-cell">Trạng thái</TableHead>
                  <TableHead className="hidden lg:table-cell">Nguồn</TableHead>
                  <TableHead className="hidden xl:table-cell">Đã lưu</TableHead>
                  <TableHead className="w-14" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-mono text-[13px]">{lead.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{lead.name}</TableCell>
                    <TableCell className="hidden text-slate-500 lg:table-cell">{lead.title}</TableCell>
                    <TableCell>{lead.company}</TableCell>
                    <TableCell className="hidden font-mono text-xs text-slate-500 sm:table-cell">
                      {lead.domain}
                    </TableCell>
                    <TableCell>
                      <ConfidenceBadge value={lead.confidence} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary">{verificationLabel[lead.status]}</Badge>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-slate-500 lg:table-cell">
                      {lead.source}
                    </TableCell>
                    <TableCell className="hidden text-xs text-slate-500 xl:table-cell">
                      {formatSavedAt(lead.savedAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Xóa lead"
                        disabled={deletingId === lead.id}
                        onClick={() => void handleDelete(lead.id)}
                      >
                        {deletingId === lead.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4 text-red-600" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </>
  );
}
