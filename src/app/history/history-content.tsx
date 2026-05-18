"use client";

import Link from "next/link";
import { useState } from "react";
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
import { MOCK_SCAN_HISTORY } from "@/lib/mock-data";

const statusBadge = {
  completed: { label: "Hoàn thành", variant: "default" as const },
  running: { label: "Đang chạy", variant: "secondary" as const },
  failed: { label: "Thất bại", variant: "destructive" as const },
  cancelled: { label: "Đã huỷ", variant: "outline" as const },
};

export function HistoryContent() {
  const [empty, setEmpty] = useState(false);
  const runs = empty ? [] : MOCK_SCAN_HISTORY;

  return (
    <>
      <PageHeader
        title="Scan History"
        subtitle="Lịch sử mọi lần Keyword Discovery và Domain Scan."
        actions={
          <Button variant="outline" size="sm" onClick={() => setEmpty(!empty)}>
            (Demo) {empty ? "Có data" : "Empty"}
          </Button>
        }
      />

      {runs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="font-medium text-slate-700">Chưa có lịch sử scan</p>
          <p className="mt-1 text-sm text-slate-500">Bắt đầu từ Keyword Discovery hoặc Domain Scan.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Run</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Kết quả</TableHead>
                <TableHead className="hidden md:table-cell">Thời gian</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => {
                const st = statusBadge[run.status];
                return (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.label}</TableCell>
                    <TableCell className="text-slate-500">
                      {run.type === "domain_scan" ? "Domain Scan" : "Keyword"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell>{run.resultCount}</TableCell>
                    <TableCell className="hidden text-slate-500 md:table-cell">
                      {run.startedAt}
                      {run.duration ? ` · ${run.duration}` : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href="/results" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
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
