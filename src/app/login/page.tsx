import { redirect } from "next/navigation";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

const PREVIEW_LEADS = [
  {
    initials: "VS",
    email: "trang.nguyen@vietsoftware.com.vn",
    company: "VietSoftware JSC",
    role: "Marketing Manager",
    confidence: 95,
  },
  {
    initials: "RG",
    email: "contact@realgroup.vn",
    company: "Real Group Marketing",
    role: "—",
    confidence: 68,
  },
  {
    initials: "GH",
    email: "hr@greenhouse.vn",
    company: "Green House Co., Ltd",
    role: "HR Director",
    confidence: 88,
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const { from } = await searchParams;
  const safeFrom = from && from.startsWith("/") && !from.startsWith("//") ? from : undefined;

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

            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] leading-relaxed text-amber-900">
              <b className="font-semibold">Auth hybrid foundation · Phase 09E</b>
              <br />
              Nếu Supabase Auth đã cấu hình, form sẽ thử đăng nhập Supabase trước; nếu chưa sẵn sàng,
              demo HMAC vẫn hoạt động.
              <br />
              <span className="font-mono">trang.nguyen@vietsoftware.com.vn / demo123</span> (user)
              <br />
              <span className="font-mono">admin@tooldatamail.dev / admin123</span> (admin)
            </div>

            <LoginForm from={safeFrom} />

            <div className="relative my-6 text-center text-xs text-slate-400">
              <span className="bg-white px-2 relative z-10">hoặc</span>
              <div className="absolute inset-x-0 top-1/2 border-t border-slate-200" />
            </div>

            <Button variant="outline" className="w-full" type="button" disabled>
              Tiếp tục với Google (sắp có)
            </Button>

            <p className="mt-6 text-center text-xs text-slate-500">
              Dành cho khách hàng đã được cấp tài khoản. Chưa có?{" "}
              <span className="text-primary">Liên hệ admin để được tạo tài khoản →</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
