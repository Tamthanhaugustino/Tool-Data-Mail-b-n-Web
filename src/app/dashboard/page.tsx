import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Download,
  History,
  Mail,
  MailSearch,
  PieChart,
  Target,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_SCAN_HISTORY, MOCK_STATS } from "@/lib/mock-data";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const session = await requireSession();
  return (
    <AppShell title="Dashboard" session={session}>
      <PageHeader
        title={`Chào ${session.name} 👋`}
        subtitle="Số liệu mẫu — Phase 09 chưa wire dashboard analytics thật."
        actions={
          <>
            <Link href="/history" className={cn(buttonVariants({ variant: "outline" }))}>
              <History className="size-4" />
              Lịch sử
            </Link>
            <Link href="/scan" className={cn(buttonVariants())}>
              <Zap className="size-4" />
              Scan nhanh
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Lần scan tháng này", value: String(MOCK_STATS.scansThisMonth), delta: MOCK_STATS.scansDelta, icon: Zap },
          { label: "Email tìm được", value: MOCK_STATS.emailsFound.toLocaleString("vi-VN"), delta: MOCK_STATS.emailsDelta, icon: Mail, accent: "teal" },
          { label: "Lead đã lưu", value: String(MOCK_STATS.savedLeads), delta: MOCK_STATS.savedDelta, icon: Bookmark, accent: "violet" },
          {
            label: "Hunter quota",
            value: `${MOCK_STATS.hunterQuota.used}`,
            suffix: `/${MOCK_STATS.hunterQuota.total}`,
            delta: MOCK_STATS.hunterQuota.resetLabel,
            icon: PieChart,
            accent: "amber",
          },
        ].map((stat) => (
          <Card key={stat.label} className="shadow-sm" title="Số liệu mẫu — chưa nối analytics thật">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                {stat.label}
                <span className="rounded bg-slate-100 px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                  demo
                </span>
              </CardTitle>
              <stat.icon className="size-[18px] text-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums text-slate-900">
                {stat.value}
                {"suffix" in stat && stat.suffix ? (
                  <span className="text-sm font-normal text-slate-500">{stat.suffix}</span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-slate-500">{stat.delta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h3 className="mb-3 mt-8 text-[15px] font-semibold">Bắt đầu nhanh</h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { href: "/discover", title: "Keyword Discovery", desc: "Tìm website công ty từ keyword + quốc gia.", icon: Target },
          { href: "/scan", title: "Domain Scan", desc: "Nhập danh sách domain để tìm email liên hệ.", icon: MailSearch, accent: "border-teal-200 bg-teal-50/50" },
          { href: "/leads", title: "Saved Leads", desc: "Mở mini-CRM của bạn để chăm sóc lead.", icon: Bookmark, accent: "border-violet-200 bg-violet-50/50" },
          { href: "/leads", title: "Export Leads", desc: "Tải lead đã lưu thành CSV / JSON.", icon: Download, accent: "border-amber-200 bg-amber-50/50" },
        ].map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className={`group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${card.accent ?? ""}`}
          >
            <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-blue-50 text-primary">
              <card.icon className="size-[18px]" />
            </div>
            <h4 className="font-semibold text-slate-900">{card.title}</h4>
            <p className="mt-1 text-sm text-slate-500">{card.desc}</p>
            <ArrowRight className="absolute right-4 top-4 size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Thiết lập API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <span>Hunter.io</span>
              <span className="text-xs font-medium text-green-700">Đã kết nối</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <span>SerpAPI</span>
              <span className="text-xs font-medium text-green-700">Đã kết nối</span>
            </div>
            <Link href="/settings" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Quản lý API Keys
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Scan gần đây</CardTitle>
            <Link href="/history" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {MOCK_SCAN_HISTORY.slice(0, 3).map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-800">{run.label}</p>
                  <p className="text-xs text-slate-500">{run.startedAt}</p>
                </div>
                <span className="text-xs font-medium text-slate-600">{run.resultCount} kết quả</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

