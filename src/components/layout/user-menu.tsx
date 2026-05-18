"use client";

import { LogOut, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
            className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-xs font-semibold text-white outline-none ring-offset-2 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary"
            title={session.email}
            aria-label="Mở menu tài khoản"
          >
            {session.initials}
          </button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">{session.name}</span>
          <span className="truncate text-xs font-normal text-slate-500">
            {session.email}
          </span>
          <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-slate-600">
            {session.role === "admin" ? (
              <>
                <ShieldCheck className="size-3" /> Admin
              </>
            ) : (
              "User"
            )}
          </span>
        </DropdownMenuLabel>
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
