"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ResultsTable } from "@/components/shared/results-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScanResultRow } from "@/lib/mock-data";
import type {
  DiscoveryProviderName,
  DiscoveryResponse,
  DiscoveryResultItem,
} from "@/lib/discovery";
import { buildScanHref, uniqueDomainsFromRows } from "@/lib/discovery";

function statusForTable(s: DiscoveryResultItem["status"]): ScanResultRow["status"] {
  if (s === "verified") return "verified";
  if (s === "accept_all") return "accept_all";
  return "webmail";
}

function mapToRows(resp: DiscoveryResponse): ScanResultRow[] {
  return resp.results.map((r, idx) => ({
    id: `${resp.run.id}-${idx}`,
    email: "—",
    name: "—",
    title: r.title,
    company: r.company_name ?? "—",
    domain: r.domain,
    confidence: Math.round(r.confidence * 100),
    status: statusForTable(r.status),
  }));
}

export function DiscoverContent() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("phần mềm ERP doanh nghiệp");
  const [country, setCountry] = useState("vn");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ScanResultRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<DiscoveryProviderName>("mock");
  const [providerUsed, setProviderUsed] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  const trimmed = keyword.trim();

  const transferDomains = useMemo(() => uniqueDomainsFromRows(rows), [rows]);
  const scanHref = useMemo(() => buildScanHref(transferDomains), [transferDomains]);

  const goToDomainScan = () => {
    if (!scanHref) return;
    router.push(scanHref);
  };

  const runDiscover = async () => {
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setHasRun(true);
    try {
      const res = await fetch("/api/discovery/keyword", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keyword: trimmed, country, provider: selectedProvider }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const err = (data as { message?: string; error?: string } | null) ?? null;
        setError(err?.message ?? err?.error ?? `HTTP ${res.status}`);
        setRows([]);
        return;
      }
      const resp = data as DiscoveryResponse;
      setRows(mapToRows(resp));
      setProviderUsed(resp.run.provider);
      setDurationMs(resp.run.durationMs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Keyword Discovery"
        subtitle="Tìm website công ty từ keyword + quốc gia. Phase 07: mock provider, chưa gọi SerpAPI thật."
      />

      <Card className="mb-6 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Tìm kiếm</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_160px_180px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="kw">Keyword</Label>
            <Input
              id="kw"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập keyword…"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label>Quốc gia</Label>
            <Select value={country} onValueChange={(v) => v && setCountry(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vn">Việt Nam</SelectItem>
                <SelectItem value="us">Hoa Kỳ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={selectedProvider}
              onValueChange={(v) => v && setSelectedProvider(v as DiscoveryProviderName)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mock">Mock (offline)</SelectItem>
                <SelectItem value="serpapi">SerpAPI (quota)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={runDiscover} disabled={loading || trimmed.length === 0}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Tìm website
          </Button>
        </CardContent>
      </Card>

      {selectedProvider === "serpapi" && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <b>SerpAPI dùng quota thật.</b> Server chỉ chạy khi đã cấu hình{" "}
          <code className="font-mono">SERPAPI_API_KEY</code>. Nếu chưa, request sẽ trả lỗi{" "}
          <code className="font-mono">provider_unavailable</code> mà không tiêu quota.
        </div>
      )}

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50 shadow-sm">
          <CardContent className="py-4 text-sm text-red-800">
            <b>Lỗi:</b> {error}
          </CardContent>
        </Card>
      )}

      {hasRun && !loading && !error && (
        <p className="mb-3 text-sm text-slate-500">
          Tìm thấy <b>{rows.length}</b> website
          {providerUsed ? ` · provider: ${providerUsed}` : ""}
          {durationMs != null ? ` · ${durationMs}ms` : ""}
          {rows.length > 0 ? " · có thể chuyển sang Domain Scan." : "."}
        </p>
      )}

      {hasRun && !loading && (
        <ResultsTable
          rows={rows}
          emptyMessage="Không tìm thấy kết quả nào. Thử keyword khác."
        />
      )}

      {hasRun && rows.length > 0 && !loading && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={goToDomainScan} disabled={transferDomains.length === 0}>
            Chuyển sang Domain Scan
          </Button>
          {transferDomains.length === 0 ? (
            <span className="text-sm text-slate-500">
              Không có domain hợp lệ để chuyển sang.
            </span>
          ) : (
            <span className="text-sm text-slate-500">
              Sẽ chuyển <b>{transferDomains.length}</b> domain sang Domain Scan.
            </span>
          )}
        </div>
      )}
    </>
  );
}
