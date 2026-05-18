"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { PrototypeProvider } from "@/components/prototype/prototype-context";
import type { Session } from "@/lib/auth/types";

export function AppShell({
  children,
  title,
  breadcrumb,
  session,
}: {
  children: React.ReactNode;
  title: string;
  breadcrumb?: { parent?: string; current: string };
  session: Session;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <PrototypeProvider>
      <div className="flex min-h-screen bg-slate-100">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-60 p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center border-b border-slate-200 bg-white px-3 py-2 lg:hidden">
            <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(true)}>
              <Menu className="size-5" />
            </Button>
            <span className="ml-2 text-sm font-semibold">{title}</span>
          </div>
          <Topbar title={title} breadcrumb={breadcrumb} session={session} />
          <main className="flex-1 overflow-auto p-4 md:p-7">{children}</main>
        </div>
      </div>
    </PrototypeProvider>
  );
}
