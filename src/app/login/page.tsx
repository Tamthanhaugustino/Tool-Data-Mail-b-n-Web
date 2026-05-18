"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";

const PREVIEW_LEADS = [
  { initials: "VS", email: "trang.nguyen@vietsoftware.com.vn", company: "VietSoftware JSC", role: "Marketing Manager", confidence: 95 },
  { initials: "RG", email: "contact@realgroup.vn", company: "Real Group Marketing", role: "—", confidence: 68 },
  { initials: "GH", email: "hr@greenhouse.vn", company: "Green House Co., Ltd", role: "HR Director", confidence: 88 },
];

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    setTimeout(() => {
      setLoading(false);
      router.push("/dashboard");
    }, 600);
  };

  const handleBadLogin = () => {
    setError(true);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-slate-50 p-10 lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-sm font-bold text-white">
            TM
          </div>
          <b className="text-[15px]">Tool Data Mail</b>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-800">
            Web
          </span>
        </div>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            Tìm email doanh nghiệp nhanh hơn, có tổ chức hơn.
          </h2>
          <p className="mt-3 text-slate-600">
            Từ keyword hoặc domain, tìm — lọc — lưu — xuất file CSV trong cùng một workspace. Không cần cài app.
          </p>
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Workspace preview · Saved leads
            </p>
            {PREVIEW_LEADS.map((lead) => (
              <div
                key={lead.email}
                className="mb-2 flex items-center gap-2.5 rounded-lg bg-slate-50 p-2.5 last:mb-0"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-[11px] font-semibold text-white">
                  {lead.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{lead.email}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {lead.company} · {lead.role}
                  </p>
                </div>
                <ConfidenceBadge value={lead.confidence} />
              </div>
            ))}
            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-[11.5px] text-slate-500">
              <span>348 lead đã lưu</span>
              <span>Export CSV · JSON</span>
            </div>
          </div>
        </div>
        <p className="text-[11.5px] text-slate-400">© 2026 Tool Data Mail · v2.4</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-sm font-bold text-white">
              TM
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-xl font-semibold">Đăng nhập</h3>
            <p className="mt-1 text-sm text-slate-500">
              Chào mừng quay lại. Nhập email & mật khẩu để vào workspace.
            </p>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>Email hoặc mật khẩu chưa đúng.</AlertDescription>
              </Alert>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="trang.nguyen@vietsoftware.com.vn" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Link href="#" className="text-xs text-primary">
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative">
                  <Input id="password" type="password" defaultValue="password-mock" />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                    aria-label="Hiện mật khẩu"
                  >
                    <Eye className="size-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="remember" defaultChecked />
                <label htmlFor="remember" className="text-sm text-slate-600">
                  Ghi nhớ thiết bị này 30 ngày
                </label>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Đang đăng nhập…" : "Đăng nhập"}
              </Button>
            </form>

            <div className="relative my-6 text-center text-xs text-slate-400">
              <span className="bg-white px-2 relative z-10">hoặc</span>
              <div className="absolute inset-x-0 top-1/2 border-t border-slate-200" />
            </div>

            <Button variant="outline" className="w-full" type="button">
              Tiếp tục với Google
            </Button>

            <p className="mt-6 text-center text-xs text-slate-500">
              Dành cho khách hàng đã được cấp tài khoản. Chưa có?{" "}
              <Link href="#" className="text-primary">
                Liên hệ admin để được tạo tài khoản →
              </Link>
            </p>

            <Button
              variant="ghost"
              size="sm"
              className="mt-4 w-full text-xs text-slate-400"
              type="button"
              onClick={handleBadLogin}
            >
              (Demo) Hiện lỗi đăng nhập
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


