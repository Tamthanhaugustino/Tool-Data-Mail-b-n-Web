import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MOCK_ADMIN_USERS } from "@/lib/mock-data";
import { Users, Zap, Shield } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminPage() {
  const session = await requireAdmin();
  return (
    <AppShell title="Admin" breadcrumb={{ parent: "Admin", current: "Tổng quan" }} session={session}>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Vận hành nội bộ — user, usage, audit (mock)."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Người dùng active", value: "128", icon: Users },
          { label: "Scan hôm nay", value: "1.240", icon: Zap },
          { label: "Audit events", value: "56", icon: Shield },
        ].map((s) => (
          <Card key={s.label} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-500">{s.label}</CardTitle>
              <s.icon className="size-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Người dùng gần đây</CardTitle>
          <Link href="/admin/users" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Xem tất cả
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Gói</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Scan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ADMIN_USERS.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="font-mono text-xs">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === "active" ? "default" : "destructive"}>
                      {u.status === "active" ? "Active" : "Locked"}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.scans}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
