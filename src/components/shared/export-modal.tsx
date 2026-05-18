"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { useState } from "react";

type ExportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  recordCount?: number;
};

export function ExportModal({
  open,
  onOpenChange,
  title = "Xuất dữ liệu",
  recordCount = 348,
}: ExportModalProps) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setDone(true);
    }, 1200);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setDone(false);
      setExporting(false);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Xuất <b>{recordCount}</b> bản ghi đã chọn. File tạm có hiệu lực 1 giờ (mock).
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Export sẵn sàng! Tải file <b>leads-{format === "csv" ? "export.csv" : "export.json"}</b>{" "}
            (mock — chưa có file thật).
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <Label>Định dạng</Label>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { id: "csv" as const, label: "CSV", icon: FileSpreadsheet },
                    { id: "json" as const, label: "JSON", icon: FileJson },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFormat(id)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors",
                      format === id
                        ? "border-primary bg-blue-50 text-primary"
                        : "border-slate-200 hover:bg-slate-50",
                    )}
                  >
                    <Icon className="size-6" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              Cột: email, họ tên, chức danh, công ty, domain, confidence, tags, ghi chú.
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {done ? "Đóng" : "Huỷ"}
          </Button>
          {!done && (
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Đang tạo file…
                </>
              ) : (
                "Xuất file"
              )}
            </Button>
          )}
          {done && (
            <Button onClick={() => handleClose(false)}>Tải xuống (mock)</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
