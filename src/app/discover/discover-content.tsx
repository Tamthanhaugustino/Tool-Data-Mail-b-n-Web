"use client";

import { useState } from "react";
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
import { MOCK_RESULTS } from "@/lib/mock-data";

export function DiscoverContent() {
  const [loading, setLoading] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [view, setView] = useState<"form" | "empty" | "error">("form");

  const runDiscover = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setHasResults(true);
    }, 900);
  };

  return (
    <>
      <PageHeader
        title="Keyword Discovery"
        subtitle="Tìm website công ty từ keyword + quốc gia qua SerpAPI."
        actions={
          <Button variant="outline" size="sm" onClick={() => setView("empty")}>
            (Demo) Empty
          </Button>
        }
      />

      <Card className="mb-6 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Tìm kiếm</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_200px_auto] md:items-end">
          <div className="space-y-2">
            <Label>Keyword</Label>
            <Input defaultValue="phần mềm ERP doanh nghiệp" placeholder="Nhập keyword…" />
          </div>
          <div className="space-y-2">
            <Label>Quốc gia</Label>
            <Select defaultValue="vn">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vn">Việt Nam</SelectItem>
                <SelectItem value="us">Hoa Kỳ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={runDiscover} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Tìm website
          </Button>
        </CardContent>
      </Card>

      {view === "error" && (
        <Card className="mb-6 border-red-200 bg-red-50 shadow-sm">
          <CardContent className="py-4 text-sm text-red-800">
            SerpAPI trả lỗi: quota hết hoặc key không hợp lệ. Kiểm tra Settings → API Keys.
          </CardContent>
        </Card>
      )}

      {view === "empty" && !hasResults && (
        <ResultsTable rows={[]} emptyMessage="Nhập keyword và bấm Tìm website để bắt đầu." />
      )}

      {hasResults && view !== "empty" && (
        <>
          <p className="mb-3 text-sm text-slate-500">
            Tìm thấy <b>28</b> website (mock) · có thể chuyển sang Domain Scan.
          </p>
          <ResultsTable rows={MOCK_RESULTS} />
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setView("error")}>
              (Demo) Lỗi API
            </Button>
            <Button>Chuyển sang Domain Scan</Button>
          </div>
        </>
      )}
    </>
  );
}
