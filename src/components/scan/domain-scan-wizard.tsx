"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Download, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResultsTable } from "@/components/shared/results-table";
import type { ScanResultRow } from "@/lib/mock-data";
import { DEFAULT_DOMAINS } from "@/lib/mock-data";
import { normalizeDomains } from "@/lib/scan";
import type {
  ScanDomainSummary,
  ScanProviderName,
  ScanResponse,
  ScanResultItem,
} from "@/lib/scan";
import { cn } from "@/lib/utils";

const MAX_DOMAINS: Record<ScanProviderName, number> = { mock: 50, hunter: 5 };
const MAX_EMAIL_LIMIT: Record<ScanProviderName, number> = { mock: 100, hunter: 10 };
const LIMIT_OPTIONS: Record<ScanProviderName, number[]> = {
  mock: [5, 10, 25, 50],
  hunter: [3, 5, 10],
};

const STEPS = ["Input", "Preview", "Scanning", "Results"] as const;
type Step = (typeof STEPS)[number];

const ERROR_HINTS: Record<string, string> = {
  unauthorized: "Phiên đăng nhập đã hết hạn. Đăng nhập lại tại /login.",
  invalid_input: "Kiểm tra danh sách domain hoặc tham số request.",
  provider_unavailable:
    "Set HUNTER_API_KEY trong .env.local rồi restart npm run dev. Hoặc chọn provider Mock.",
  provider_invalid_key:
    "Kiểm tra giá trị HUNTER_API_KEY ở Settings → API của Hunter Dashboard.",
  provider_rate_limited:
    "Hunter báo hết quota tháng hoặc rate limit ngắn hạn. Đợi reset, hoặc dùng Mock.",
  provider_timeout:
    "Mạng tới Hunter chậm hoặc bị block. Thử lại sau, hoặc dùng Mock.",
  provider_network:
    "Server không gọi được Hunter. Kiểm tra mạng / firewall.",
  provider_parse:
    "Hunter trả về dữ liệu không hợp lệ. Có thể do gói Hunter bị thay đổi.",
  provider_upstream:
    "Hunter trả lỗi không xác định. Kiểm tra trạng thái tại hunter.io.",
};

type DomainScanWizardProps = {
  /** Mỗi dòng một domain — thường từ ?domains= trên /scan sau Keyword Discovery. */
  initialDomains?: string;
  fromDiscovery?: boolean;
};

function statusForTable(s: ScanResultItem["status"]): ScanResultRow["status"] {
  if (s === "verified") return "verified";
  if (s === "accept_all") return "accept_all";
  return "webmail";
}

function mapToRows(resp: ScanResponse): ScanResultRow[] {
  return resp.results.map((r, idx) => ({
    id: `${resp.run.id}-${idx}`,
    email: r.email,
    name: [r.first_name, r.last_name].filter(Boolean).join(" ") || "—",
    title: r.position ?? "—",
    company: r.company ?? "—",
    domain: r.domain,
    confidence: Math.round(r.confidence * 100),
    status: statusForTable(r.status),
  }));
}

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadScanResultsCsv(rows: ScanResultRow[], filename: string) {
  const headers = [
    "email",
    "name",
    "title",
    "company",
    "domain",
    "confidence",
    "status",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [r.email, r.name, r.title, r.company, r.domain, r.confidence, r.status]
        .map(escapeCsvCell)
        .join(","),
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DomainScanWizard({
  initialDomains,
  fromDiscovery = false,
}: DomainScanWizardProps) {
  const [step, setStep] = useState<Step>("Input");
  const [domains, setDomains] = useState(initialDomains ?? DEFAULT_DOMAINS);
  const [selectedProvider, setSelectedProvider] = useState<ScanProviderName>("mock");
  const [limit, setLimit] = useState(10);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [autoHistory, setAutoHistory] = useState(true);

  const domainCap = MAX_DOMAINS[selectedProvider];
  const emailCap = MAX_EMAIL_LIMIT[selectedProvider];
  const limitChoices = LIMIT_OPTIONS[selectedProvider];

  const handleProviderChange = (next: ScanProviderName) => {
    setSelectedProvider(next);
    // Clamp limit to the new provider's ceiling (Hunter caps at 10).
    setLimit((curr) => Math.min(curr, MAX_EMAIL_LIMIT[next]));
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [response, setResponse] = useState<ScanResponse | null>(null);

  const rawList = useMemo(
    () => domains.split("\n").map((d) => d.trim()).filter(Boolean),
    [domains],
  );

  const normalizedPreview = useMemo(() => normalizeDomains(rawList), [rawList]);

  const estimatedRequests = normalizedPreview.domains.length * Math.min(limit, 10);

  const runScan = async () => {
    setStep("Scanning");
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setResponse(null);
    try {
      const res = await fetch("/api/scan/domain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          domains: rawList,
          emailLimitPerDomain: limit,
          provider: selectedProvider,
        }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const err = (data as { message?: string; error?: string } | null) ?? null;
        setError(err?.message ?? err?.error ?? `HTTP ${res.status}`);
        setErrorCode(err?.error ?? null);
        setStep("Results");
        return;
      }
      setResponse(data as ScanResponse);
      setStep("Results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
      setErrorCode("network");
      setStep("Results");
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(() => {
    if (!response) return [] as ScanResultRow[];
    const mapped = mapToRows(response);
    return verifiedOnly ? mapped.filter((r) => r.status === "verified") : mapped;
  }, [response, verifiedOnly]);

  const errorHint = errorCode ? ERROR_HINTS[errorCode] : null;

  return (
    <div className="space-y-6">
      {fromDiscovery && rawList.length > 0 && step === "Input" && (
        <Alert>
          <AlertDescription>
            Đã nhận <b>{rawList.length}</b> domain từ Keyword Discovery. Kiểm tra danh sách
            bên dưới rồi tiếp tục Preview.
          </AlertDescription>
        </Alert>
      )}
      {selectedProvider === "hunter" && step !== "Results" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <b>Hunter.io dùng quota thật.</b> Mỗi domain tốn 1 search · tối đa{" "}
          <b>{MAX_DOMAINS.hunter} domain</b> và <b>{MAX_EMAIL_LIMIT.hunter} email/domain</b> mỗi
          lần. Server chỉ chạy khi đã cấu hình{" "}
          <code className="font-mono">HUNTER_API_KEY</code>. Nếu chưa, request sẽ trả{" "}
          <code className="font-mono">provider_unavailable</code> mà không tiêu quota.
        </div>
      )}
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        {STEPS.map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="size-3.5 text-slate-300" />}
            <span
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1 font-medium",
                step === s ? "bg-primary text-white" : "bg-white text-slate-500 border border-slate-200",
              )}
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-black/10 text-xs">
                {i + 1}
              </span>
              {s}
            </span>
          </span>
        ))}
      </nav>

      {step === "Input" && (
        <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Danh sách domain</CardTitle>
              <span className="text-xs text-slate-500">
                <b>{normalizedPreview.domains.length} domain hợp lệ</b> · tối đa {domainCap}
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Mỗi dòng một domain</Label>
                <Textarea
                  className="min-h-[170px] font-mono text-[13px] leading-relaxed"
                  value={domains}
                  onChange={(e) => setDomains(e.target.value)}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Dán URL đầy đủ cũng được — sẽ tự lấy domain.</span>
                  <span className="font-mono">
                    {normalizedPreview.domains.length} / {domainCap}
                  </span>
                </div>
                {normalizedPreview.warnings.length > 0 && (
                  <p className="text-xs text-amber-700">
                    {normalizedPreview.warnings.length} dòng sẽ bị bỏ ở bước Preview (invalid/duplicate).
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled>
                  <Upload className="size-4" />
                  Upload CSV (sắp có)
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDomains("")}>
                  Xoá tất cả
                </Button>
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t">
              <Button
                onClick={() => setStep("Preview")}
                disabled={normalizedPreview.domains.length === 0}
              >
                Tiếp tục · Preview
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Tuỳ chọn scan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={selectedProvider}
                  onValueChange={(v) => v && handleProviderChange(v as ScanProviderName)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mock">Mock (offline)</SelectItem>
                    <SelectItem value="hunter">Hunter.io (quota)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Mock: max {MAX_DOMAINS.mock} domain · {MAX_EMAIL_LIMIT.mock} email/domain · 0 quota.
                  Hunter: max {MAX_DOMAINS.hunter} domain · {MAX_EMAIL_LIMIT.hunter} email/domain · 1 search / domain.
                </p>
              </div>
              <div className="space-y-2 border-t pt-4">
                <Label>Email limit / domain</Label>
                <div className="flex flex-wrap gap-2">
                  {limitChoices.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setLimit(n)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-sm font-medium",
                        limit === n
                          ? "border-primary bg-blue-50 text-blue-800"
                          : "border-slate-200 bg-white text-slate-600",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  {selectedProvider === "hunter"
                    ? `Hunter tính 1 search / domain. Tối đa ${emailCap} email/domain trên Domain Search API.`
                    : `Mock không tốn quota. Tối đa ${emailCap} email/domain.`}
                </p>
              </div>
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Chỉ giữ email đã verified</span>
                  <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Auto-save scan vào History (Phase 10+)</span>
                  <Switch checked={autoHistory} onCheckedChange={setAutoHistory} disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "Preview" && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Xác nhận trước khi scan</CardTitle>
            <CardDescription>
              {selectedProvider === "hunter"
                ? "Checkpoint trước khi gọi Hunter.io thật — sẽ tiêu quota."
                : "Checkpoint trước khi gọi mock provider — không tốn quota."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Sẽ quét <b>{normalizedPreview.domains.length}</b> domain · limit <b>{limit}</b>/domain
                · provider <b>{selectedProvider}</b>
                {selectedProvider === "hunter" ? (
                  <>
                    {" · "}sẽ tiêu <b>{normalizedPreview.domains.length}</b> Hunter search.
                  </>
                ) : (
                  <>
                    {" · "}ước tính <b>~{estimatedRequests}</b> request (mock = miễn phí).
                  </>
                )}
              </AlertDescription>
            </Alert>
            {normalizedPreview.warnings.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <AlertDescription>
                  <b>{normalizedPreview.warnings.length}</b> dòng bị bỏ:
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {normalizedPreview.warnings.slice(0, 5).map((w, i) => (
                      <li key={`${w.input}-${i}`} className="font-mono">
                        [{w.reason}] {w.input}
                      </li>
                    ))}
                    {normalizedPreview.warnings.length > 5 && (
                      <li>… và {normalizedPreview.warnings.length - 5} dòng khác</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <ul className="grid gap-2 sm:grid-cols-2">
              {normalizedPreview.domains.map((d) => (
                <li key={d} className="rounded-lg border bg-slate-50 px-3 py-2 font-mono text-sm">
                  {d}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="justify-between border-t">
            <Button variant="outline" onClick={() => setStep("Input")}>
              Quay lại
            </Button>
            <Button onClick={runScan} disabled={normalizedPreview.domains.length === 0}>
              Bắt đầu scan
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "Scanning" && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Loader2 className="size-4 animate-spin text-primary" />
              Đang quét {normalizedPreview.domains.length} domain…
            </CardTitle>
            <CardDescription>
              Provider: {selectedProvider}
              {selectedProvider === "hunter"
                ? " · gọi Hunter.io thật"
                : " · không tiêu quota Hunter"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              {loading
                ? "Đang chờ server trả về…"
                : "Đã hoàn tất, chuyển sang Results…"}
            </p>
          </CardContent>
        </Card>
      )}

      {step === "Results" && (
        <ScanResultsView
          key={response?.run.id ?? errorCode ?? "scan-error"}
          response={response}
          rows={rows}
          verifiedOnly={verifiedOnly}
          error={error}
          errorCode={errorCode}
          errorHint={errorHint}
          onReset={() => {
            setStep("Input");
            setResponse(null);
            setError(null);
            setErrorCode(null);
          }}
          onRescan={() => {
            setStep("Preview");
            setResponse(null);
            setError(null);
            setErrorCode(null);
          }}
        />
      )}
    </div>
  );
}

function ScanResultsView({
  response,
  rows,
  verifiedOnly,
  error,
  errorCode,
  errorHint,
  onReset,
  onRescan,
}: {
  response: ScanResponse | null;
  rows: ScanResultRow[];
  verifiedOnly: boolean;
  error: string | null;
  errorCode: string | null;
  errorHint: string | null;
  onReset: () => void;
  onRescan: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(r.id)),
    [rows, selectedIds],
  );
  const selectedCount = selectedRows.length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;

  const selectAll = () => setSelectedIds(new Set(rows.map((r) => r.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const exportCsv = (exportRows: ScanResultRow[], suffix: string) => {
    const stamp = response?.run.id ?? "scan";
    downloadScanResultsCsv(exportRows, `domain-scan-${stamp}-${suffix}.csv`);
  };
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 shadow-sm">
        <CardContent className="space-y-2 py-4 text-sm text-red-800">
          <p>
            <b>Scan lỗi:</b> {error}
            {errorCode ? (
              <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 font-mono text-[11px]">
                {errorCode}
              </span>
            ) : null}
          </p>
          {errorHint ? <p className="text-xs text-red-700">{errorHint}</p> : null}
          <div>
            <Button variant="outline" size="sm" onClick={onReset}>
              Thử lại
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!response) {
    return null;
  }

  const { run, domains } = response;
  const emptyDomains = domains.filter((d) => d.empty);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900">Kết quả scan</h3>
        <p className="text-sm text-slate-500">
          {run.totalEmails} email tìm được · {run.scannedDomains} domain · provider {run.provider} ·{" "}
          {run.durationMs}ms
          {verifiedOnly && rows.length !== run.totalEmails
            ? ` · đang lọc verified (${rows.length}/${run.totalEmails})`
            : ""}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
        <p className="text-sm font-medium text-slate-800">Bước tiếp theo</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onReset}>
            Quay lại nhập domain
          </Button>
          <Button variant="outline" size="sm" onClick={onRescan}>
            Scan mới
          </Button>
          <span className="hidden sm:inline w-px self-stretch bg-slate-200 mx-1" aria-hidden />
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={rows.length === 0 || allSelected}
          >
            Chọn tất cả
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            disabled={selectedCount === 0}
          >
            Bỏ chọn
          </Button>
          <span className="hidden sm:inline w-px self-stretch bg-slate-200 mx-1" aria-hidden />
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(rows, "all")}
            disabled={rows.length === 0}
          >
            <Download className="size-4" />
            Tải CSV (tất cả)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(selectedRows, "selected")}
            disabled={selectedCount === 0}
            title={
              selectedCount === 0
                ? "Chọn ít nhất 1 lead trong bảng để tải CSV đã chọn"
                : undefined
            }
          >
            <Download className="size-4" />
            Tải CSV đã chọn
          </Button>
          <Button
            size="sm"
            disabled
            title="API Saved Leads chưa có — sẽ bật ở Phase 09"
          >
            Lưu lead đã chọn (Phase 09)
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          {selectedCount > 0 ? (
            <>
              Đã chọn <b>{selectedCount}</b> / {rows.length} lead hiển thị. Tải CSV hoặc lưu lead sẽ dùng
              danh sách đã chọn (lưu DB: Phase 09).
            </>
          ) : rows.length > 0 ? (
            <>
              Chọn lead trong bảng để tải CSV đã chọn hoặc lưu sau này. &quot;Tải CSV (tất cả)&quot; xuất
              toàn bộ kết quả đang hiển thị.
            </>
          ) : (
            "Không có lead để xuất hoặc lưu."
          )}
        </p>
      </div>

      {emptyDomains.length > 0 && (
        <Alert>
          <AlertDescription>
            <b>{emptyDomains.length}</b> domain không tìm được email:{" "}
            {emptyDomains.slice(0, 6).map((d) => (
              <Badge key={d.domain} variant="secondary" className="mr-1 font-mono">
                {d.domain}
              </Badge>
            ))}
            {emptyDomains.length > 6 && <span>…</span>}
          </AlertDescription>
        </Alert>
      )}

      {run.warnings.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertDescription>
            <b>{run.warnings.length}</b> dòng input đã bị bỏ:{" "}
            <span className="font-mono text-xs">{run.warnings.slice(0, 3).join(" · ")}</span>
            {run.warnings.length > 3 && <span> … và {run.warnings.length - 3} dòng khác</span>}
          </AlertDescription>
        </Alert>
      )}

      <ResultsTable
        rows={rows}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        emptyMessage={
          verifiedOnly && run.totalEmails > 0
            ? "Không có email verified. Bỏ tick 'Chỉ giữ email đã verified' để xem tất cả."
            : "Không tìm được email cho run này."
        }
      />
    </div>
  );
}
