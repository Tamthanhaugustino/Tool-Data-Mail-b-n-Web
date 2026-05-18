"use client";

import { LogOut, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/auth/actions";
import type { Session } from "@/lib/auth/types";

export function UserMenu({ session }: { session: Session }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex max-w-[200px] items-center gap-2 rounded-lg py-1 pr-1 pl-0.5 outline-none ring-offset-2 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary"
            title={session.email}
            aria-label="Mở menu tài khoản"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-xs font-semibold text-white">
              {session.initials}
            </span>
            <span className="hidden min-w-0 flex-col items-start text-left md:flex">
              <span className="truncate text-sm font-medium text-slate-900">
                {session.name}
              </span>
              <span className="truncate text-xs text-slate-500">{session.email}</span>
            </span>
          </button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-56">
        <div className="flex flex-col gap-0.5 px-2 py-1.5">
          <span className="text-sm font-semibold text-slate-900">{session.name}</span>
          <span className="truncate text-xs text-slate-500">{session.email}</span>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-amber-900">
              {session.plan}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-slate-600">
              {session.role === "admin" ? (
                <>
                  <ShieldCheck className="size-3" />
                  Admin
                </>
              ) : (
                "User"
              )}
            </span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings className="size-4" />
          Settings
        </DropdownMenuItem>
        {session.role === "admin" ? (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <ShieldCheck className="size-4" />
            Admin dashboard
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-slate-700 outline-none hover:bg-slate-100"
          >
            <LogOut className="size-4" />
            Đăng xuất
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
