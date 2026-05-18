"use client";

import { Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrototype } from "@/components/prototype/prototype-context";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";
import type { Session } from "@/lib/auth/types";

export function Topbar({
  title,
  breadcrumb,
  session,
}: {
  title: string;
  breadcrumb?: { parent?: string; current: string };
  session: Session;
}) {
  const { apiStatus } = usePrototype();

  const apiLabel =
    apiStatus === "ok"
      ? "API OK"
      : apiStatus === "partial"
        ? "1 API chưa kết nối"
        : "API lỗi";

  const apiDot =
    apiStatus === "ok"
      ? "bg-green-500"
      : apiStatus === "partial"
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 md:px-7">
      <div className="min-w-0 text-sm text-slate-500">
        {breadcrumb?.parent ? (
          <>
            <span className="hidden sm:inline">{breadcrumb.parent}</span>
            <span className="mx-2 hidden text-slate-300 sm:inline">/</span>
          </>
        ) : null}
        <b className="text-slate-900">{breadcrumb?.current ?? title}</b>
      </div>

      <div className="ml-2 hidden max-w-[340px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 md:flex">
        <Search className="size-3.5 shrink-0" />
        <span className="truncate">Tìm email, domain, công ty…</span>
        <span className="ml-auto hidden font-mono text-[11px] lg:inline">⌘ K</span>
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <span className="hidden rounded-full border border-amber-200 bg-gradient-to-br from-amber-100 to-amber-200 px-2.5 py-1 text-[11.5px] font-semibold text-amber-900 sm:inline">
          {session.plan}
        </span>
        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-flex",
          )}
          title="Trạng thái API (mock)"
        >
          <span className={cn("size-2 rounded-full", apiDot)} />
          {apiLabel}
        </span>
        <Button variant="ghost" size="icon-sm" className="relative text-slate-500">
          <Bell className="size-[18px]" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full border-2 border-white bg-red-500" />
        </Button>
        <UserMenu session={session} />
      </div>
    </header>
  );
}
