"use client";

import { Bookmark, MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import type { ScanResultRow } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function statusLabel(status: ScanResultRow["status"]) {
  if (status === "verified") return { text: "Verified", variant: "default" as const };
  if (status === "accept_all") return { text: "Accept-all", variant: "secondary" as const };
  return { text: "Webmail", variant: "outline" as const };
}

export function ResultsTable({
  rows,
  emptyMessage = "Chưa có kết quả. Hãy chạy scan hoặc thử bộ lọc khác.",
}: {
  rows: ScanResultRow[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <p className="text-sm font-medium text-slate-700">Không có dữ liệu</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="w-10">
                <input type="checkbox" className="rounded border-slate-300" aria-label="Chọn tất cả" />
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Họ tên</TableHead>
              <TableHead className="hidden lg:table-cell">Chức danh</TableHead>
              <TableHead>Công ty</TableHead>
              <TableHead className="hidden sm:table-cell">Domain</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead className="hidden md:table-cell">Trạng thái</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const st = statusLabel(row.status);
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <input type="checkbox" className="rounded border-slate-300" aria-label={`Chọn ${row.email}`} />
                  </TableCell>
                  <TableCell className="font-mono text-[13px] font-medium">{row.email}</TableCell>
                  <TableCell className="hidden md:table-cell">{row.name}</TableCell>
                  <TableCell className="hidden text-slate-500 lg:table-cell">{row.title}</TableCell>
                  <TableCell className="font-medium">{row.company}</TableCell>
                  <TableCell className="hidden font-mono text-xs text-slate-500 sm:table-cell">
                    {row.domain}
                  </TableCell>
                  <TableCell>
                    <ConfidenceBadge value={row.confidence} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={st.variant}>{st.text}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className={cn(row.saved && "text-violet-600")}
                        title="Lưu lead"
                      >
                        <Bookmark className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
