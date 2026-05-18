import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";

export default async function HelpPage() {
  const session = await requireSession();
  return (
    <AppShell title="Help" session={session}>
      <PageHeader title="Trợ giúp" subtitle="Hướng dẫn sử dụng Tool Data Mail Web." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Bắt đầu nhanh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>1. Cấu hình Hunter.io và SerpAPI tại Settings.</p>
            <p>2. Chạy Keyword Discovery hoặc Domain Scan.</p>
            <p>3. Lưu lead và xuất CSV / JSON.</p>
            <Button variant="outline" size="sm" className="mt-2">
              Xem tài liệu đầy đủ (mock)
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Liên hệ support</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <p>Email: support@tooldatamail.com (mock)</p>
            <p className="mt-2">Giờ làm việc: T2–T6, 9:00–18:00</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
