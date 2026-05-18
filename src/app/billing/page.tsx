import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { requireSession } from "@/lib/auth/session";

const PLANS = [
  {
    id: "basic",
    name: "BASIC",
    price: "990.000đ",
    period: "/ tháng",
    features: ["100 scan / tháng", "1 API key", "Export CSV"],
    current: false,
  },
  {
    id: "pro",
    name: "PRO",
    price: "2.490.000đ",
    period: "/ tháng",
    features: ["500 scan / tháng", "Hunter + SerpAPI", "Export CSV & JSON", "Ưu tiên support"],
    current: true,
    highlight: true,
  },
  {
    id: "agency",
    name: "AGENCY",
    price: "Liên hệ",
    period: "",
    features: ["Unlimited scan", "Nhiều workspace", "Admin dashboard", "SLA"],
    current: false,
  },
];

export default async function BillingPage() {
  const session = await requireSession();
  return (
    <AppShell title="Subscription" session={session}>
      <PageHeader
        title="Subscription"
        subtitle="Gói PRO đang active · gia hạn 01 / 06 / 2026 (mock)."
      />

      <Card className="mb-6 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Gói hiện tại</CardTitle>
            <Badge className="bg-amber-200 text-amber-900 hover:bg-amber-200">PRO</Badge>
          </div>
          <CardDescription>
            42 / 500 scan tháng này · Hunter quota 320 / 500 request.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            Nhập mã kích hoạt
          </Button>
          <Button variant="outline" size="sm">
            Xem hoá đơn
          </Button>
        </CardContent>
      </Card>

      <h3 className="mb-4 text-[15px] font-semibold">So sánh gói</h3>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={
              plan.highlight
                ? "border-primary shadow-md ring-1 ring-primary/20"
                : "shadow-sm"
            }
          >
            <CardHeader>
              <CardTitle className="text-base">{plan.name}</CardTitle>
              <p className="text-2xl font-semibold">
                {plan.price}
                <span className="text-sm font-normal text-slate-500">{plan.period}</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm text-slate-600">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-green-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.current ? "secondary" : plan.highlight ? "default" : "outline"}
                disabled={plan.current}
              >
                {plan.current ? "Đang dùng" : plan.id === "agency" ? "Liên hệ sales" : "Nâng cấp"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
