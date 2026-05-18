"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ExportModal } from "@/components/shared/export-modal";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import Link from "next/link";
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
import { MOCK_SAVED_LEADS } from "@/lib/mock-data";

const statusMap = {
  new: { label: "Mới", className: "bg-slate-100 text-slate-700" },
  contacted: { label: "Đã liên hệ", className: "bg-blue-100 text-blue-800" },
  interested: { label: "Quan tâm", className: "bg-violet-100 text-violet-800" },
  customer: { label: "Khách hàng", className: "bg-green-100 text-green-800" },
  not_relevant: { label: "Không phù hợp", className: "bg-slate-100 text-slate-500" },
};

export function LeadsContent() {
  const [exportOpen, setExportOpen] = useState(false);
  const [empty, setEmpty] = useState(false);
  const leads = empty ? [] : MOCK_SAVED_LEADS;

  return (
    <>
      <PageHeader
        title="Saved Leads"
        subtitle="Mini-CRM — quản lý lead đã lưu từ scan."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setEmpty(!empty)}>
              (Demo) {empty ? "Có data" : "Empty"}
            </Button>
            <Button variant="outline">
              <Plus className="size-4" />
              Thêm lead
            </Button>
            <Button onClick={() => setExportOpen(true)}>
              <Download className="size-4" />
              Xuất CSV / JSON
            </Button>
          </>
        }
      />

      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="font-medium text-slate-700">Chưa có lead nào được lưu</p>
          <p className="mt-1 text-sm text-slate-500">
            Lưu email từ Results hoặc Domain Scan để xuất hiện tại đây.
          </p>
          <Link href="/results" className={cn(buttonVariants(), "mt-4")}>
            Mở Results
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Liên hệ</TableHead>
                  <TableHead>Công ty</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="hidden lg:table-cell">Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const st = statusMap[lead.status];
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="font-mono text-[13px]">{lead.email}</TableCell>
                      <TableCell className="hidden md:table-cell">{lead.contactName}</TableCell>
                      <TableCell>{lead.company}</TableCell>
                      <TableCell>
                        <ConfidenceBadge value={lead.confidence} />
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}>
                          {st.label}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {lead.tags.map((t) => (
                            <Badge key={t} variant="secondary">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ExportModal open={exportOpen} onOpenChange={setExportOpen} title="Xuất Saved Leads" />
    </>
  );
}
