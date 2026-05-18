"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ResultsTable } from "@/components/shared/results-table";
import { DEFAULT_DOMAINS, MOCK_RESULTS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const STEPS = ["Input", "Preview", "Scanning", "Results"] as const;
type Step = (typeof STEPS)[number];

type DomainScanWizardProps = {
  /** Mỗi dòng một domain — thường từ ?domains= trên /scan sau Keyword Discovery. */
  initialDomains?: string;
  fromDiscovery?: boolean;
};

export function DomainScanWizard({
  initialDomains,
  fromDiscovery = false,
}: DomainScanWizardProps) {
  const [step, setStep] = useState<Step>("Input");
  const [domains, setDomains] = useState(initialDomains ?? DEFAULT_DOMAINS);
  const [limit, setLimit] = useState(50);
  const [progress, setProgress] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [autoHistory, setAutoHistory] = useState(true);

  const domainList = useMemo(
    () =>
      domains
        .split("\n")
        .map((d) => d.trim())
        .filter(Boolean),
    [domains],
  );

  const estimatedRequests = domainList.length * Math.min(limit, 10);

  const goScanning = () => {
    setStep("Scanning");
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setStep("Results");
          return 100;
        }
        return p + 12;
      });
    }, 400);
  };

  return (
    <div className="space-y-6">
      {fromDiscovery && domainList.length > 0 && (
        <Alert>
          <AlertDescription>
            Đã nhận <b>{domainList.length}</b> domain từ Keyword Discovery. Kiểm tra danh sách
            bên dưới rồi tiếp tục Preview.
          </AlertDescription>
        </Alert>
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
                <b>{domainList.length} domain</b> · tối đa 500
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
                  <span className="font-mono">{domainList.length} / 500</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  <Upload className="size-4" />
                  Upload CSV
                </Button>
                <Button variant="outline" size="sm">
                  + Dán từ clipboard
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDomains("")}>
                  Xoá tất cả
                </Button>
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t">
              <Button onClick={() => setStep("Preview")} disabled={domainList.length === 0}>
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
                <Label>Email limit / domain</Label>
                <div className="flex flex-wrap gap-2">
                  {[10, 50, 100, 500].map((n) => (
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
                  Limit cao ⇒ Hunter.io có thể tính nhiều request hơn cho domain nhiều email.
                </p>
              </div>
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Chỉ giữ email đã verified</span>
                  <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Auto-save scan vào History</span>
                  <Switch checked={autoHistory} onCheckedChange={setAutoHistory} />
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
              Checkpoint bảo vệ quota — kiểm tra ước tính request trước khi gọi Hunter.io.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Sẽ quét <b>{domainList.length}</b> domain · limit <b>{limit}</b>/domain · ước tính{" "}
                <b>~{estimatedRequests}</b> request Hunter.io.
              </AlertDescription>
            </Alert>
            <ul className="grid gap-2 sm:grid-cols-2">
              {domainList.map((d) => (
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
            <Button onClick={goScanning}>Bắt đầu scan</Button>
          </CardFooter>
        </Card>
      )}

      {step === "Scanning" && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Loader2 className="size-4 animate-spin text-primary" />
              Đang quét domain…
            </CardTitle>
            <CardDescription>
              vietsoftware.com.vn · 2/4 domain (mock)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} />
            <p className="text-sm text-slate-500">{progress}% · Ước tính còn 1 phút 12 giây</p>
            <Button variant="outline" size="sm" onClick={() => setStep("Results")}>
              (Demo) Bỏ qua chờ
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "Results" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Kết quả scan</h3>
              <p className="text-sm text-slate-500">{MOCK_RESULTS.length} email tìm được (mock)</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("Input")}>
                Scan mới
              </Button>
              <Button>Lưu tất cả vào Saved Leads</Button>
            </div>
          </div>
          <ResultsTable rows={MOCK_RESULTS} />
        </div>
      )}
    </div>
  );
}
