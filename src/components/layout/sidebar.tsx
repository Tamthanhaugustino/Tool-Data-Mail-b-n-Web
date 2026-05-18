"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ACCOUNT_NAV, WORKSPACE_NAV } from "@/lib/navigation";
import { MOCK_STATS } from "@/lib/mock-data";

function NavLink({
  href,
  label,
  icon: Icon,
  badge,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-slate-600 transition-colors hover:bg-slate-50",
        active &&
          "border-l-[3px] border-l-primary bg-blue-50 pl-[calc(0.625rem-3px)] font-semibold text-primary hover:bg-blue-50",
      )}
    >
      <Icon className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-slate-500")} />
      <span className="truncate">{label}</span>
      {badge != null && (
        <span
          className={cn(
            "ml-auto rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
            active ? "bg-primary text-white" : "bg-slate-200 text-slate-500",
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const quotaPct = Math.round(
    (MOCK_STATS.hunterQuota.used / MOCK_STATS.hunterQuota.total) * 100,
  );

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4">
      <Link
        href="/dashboard"
        className="mb-2 flex items-center gap-2.5 border-b border-slate-200 px-2 pb-3.5"
        onClick={onNavigate}
      >
        <div className="flex size-[30px] items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-sm font-bold text-white shadow-sm">
          TM
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight text-slate-900">
            Tool Data Mail
          </div>
          <div className="text-[10.5px] font-medium uppercase tracking-wider text-slate-400">
            Web
          </div>
        </div>
      </Link>

      <p className="mb-1.5 mt-2 px-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
        Workspace
      </p>
      <nav className="flex flex-col gap-0.5">
        {WORKSPACE_NAV.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onNavigate} />
        ))}
      </nav>

      <p className="mb-1.5 mt-4 px-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
        Account
      </p>
      <nav className="flex flex-col gap-0.5">
        {ACCOUNT_NAV.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="mt-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
        <div className="mb-1 flex justify-between text-slate-500">
          <span>Hunter.io</span>
          <span className="font-mono text-[11px]">
            {MOCK_STATS.hunterQuota.used} / {MOCK_STATS.hunterQuota.total}
          </span>
        </div>
        <p className="text-[13px] font-semibold text-slate-900">
          Còn {MOCK_STATS.hunterQuota.total - MOCK_STATS.hunterQuota.used} request
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-primary" style={{ width: `${quotaPct}%` }} />
        </div>
      </div>
    </aside>
  );
}
