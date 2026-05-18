# Roadmap — Tool Data Mail Web

> Lộ trình phát triển SaaS, cập nhật sau khi hoàn thành frontend prototype (Phase 01).  
> Repo: [Tool-Data-Mail-b-n-Web](https://github.com/Tamthanhaugustino/Tool-Data-Mail-b-n-Web)

Tài liệu phase cũ (Web 01–07, planning-only): [`PHASE_PLAN.md`](./PHASE_PLAN.md). **Roadmap file này là bản tham chiếu chính** cho các phase tiếp theo.

---

## Tổng quan

```text
Phase 01  Prototype UI          ████████████████████  DONE
Phase 02  Docs & planning       ████████████████████  DONE
Phase 03  Auth                  ████████████████████  DONE (demo)
Phase 04  Database schema       ████████████████████  DONE
Phase 05  Supabase wiring       ████████████████████  DONE
Phase 06  Supabase setup        ████████████████░░░░  CURRENT (setup guide + health)
Phase 07  Auth migration / KW   ░░░░░░░░░░░░░░░░░░░░
Phase 06  Domain Scan jobs      ░░░░░░░░░░░░░░░░░░░░
Phase 07  Results / Leads       ░░░░░░░░░░░░░░░░░░░░
Phase 08  Billing               ░░░░░░░░░░░░░░░░░░░░
Phase 09  Admin                 ░░░░░░░░░░░░░░░░░░░░
Phase 10  Production            ░░░░░░░░░░░░░░░░░░░░
```

---

## Phase 01 — Frontend prototype scaffold — DONE

**Mục tiêu:** Có app Next.js chạy local, UI khớp design handoff, toàn bộ màn chính click-through được với mock data.

**Đã hoàn thành:**

- [x] Next.js 16 + TypeScript + Tailwind + shadcn/ui + lucide-react
- [x] App shell: sidebar 240px, topbar 60px, responsive mobile (Sheet menu)
- [x] Routes: login, dashboard, discover, scan (4 bước), results, leads, history, settings, billing, admin, help
- [x] Mock data (`src/lib/mock-data.ts`), export modal mock, API status mock trên topbar
- [x] `npm run lint` và `npm run build` pass
- [x] Push GitHub

**Không nằm trong phase:** Auth thật, DB, API Hunter/SerpAPI, billing thật.

**Tham chiếu design:** thư mục `design/` (HTML handoff).

---

## Phase 02 — Docs and SaaS planning — DONE

**Mục tiêu:** Chuẩn hóa tài liệu repo để team/onboarding rõ trạng thái, lộ trình và ràng buộc kỹ thuật trước khi viết backend.

**Công việc:**

- [x] README.md dự án (không dùng template Next.js mặc định)
- [x] `docs/ROADMAP.md` (file này)
- [x] Quyết định Auth direction (xem [`AUTH.md`](./AUTH.md)) — chốt: HMAC cookie tạm, đổi Supabase Auth khi có DB
- [ ] Review & cập nhật `PROJECT_STATE.md` theo prototype (tùy chọn)
- [ ] Chốt mapping phase 04–10 với `API_DATABASE_DRAFT.md` / `TECH_DECISION.md`

**Deliverable:** Developer mới clone repo → đọc README + ROADMAP là đủ để biết chạy app và phase tiếp theo.

**Không làm trong phase:** Thay đổi UI/logic app, thêm dependency, backend.

---

## Phase 03 — Auth + user account foundation — DONE (demo)

**Mục tiêu:** Đăng nhập/đăng xuất thật, session bảo vệ route app, profile cơ bản.

**Đã làm (foundation):**

- [x] Cookie HMAC server-side (`src/lib/auth/*`) — chi tiết [`AUTH.md`](./AUTH.md)
- [x] `signInAction` / `signOutAction` (React 19 server actions + `useActionState`)
- [x] Middleware bảo vệ mọi route trừ `/` và `/login`; `/admin/*` chặn theo role
- [x] `requireSession()` / `requireAdmin()` defense-in-depth trên mọi protected page
- [x] Topbar + User menu hiển thị user/role/plan thật + nút Đăng xuất
- [x] Settings → tab Tài khoản đọc tên/email từ session
- [x] Demo users in-memory: 1 user + 1 admin
- [x] `.env.example` (chỉ cần `AUTH_SECRET`)

**Chưa làm (chuyển Phase 04 khi có DB):**

- [ ] Supabase Auth thật + bảng `profiles` + RLS
- [ ] OAuth (Google) — nút đã placeholder, disabled
- [ ] Quên / đổi mật khẩu thật
- [ ] Audit log đăng nhập

**Deliverable:** Không vào được dashboard/app/admin khi chưa đăng nhập; admin route chặn role; demo flow hoạt động end-to-end. Auth contract sẵn sàng nối Supabase ở Phase 04.

**Phụ thuộc:** Phase 02.

---

## Phase 04 — Database schema + Supabase foundation — DONE

**Mục tiêu:** SQL migration v1 + RLS draft + TS types sẵn sàng apply lên Supabase ở Phase 05. Foundation-only — không provision Supabase project trong phase này.

**Đã làm:**

- [x] [`supabase/migrations/0001_initial_schema.sql`](../supabase/migrations/0001_initial_schema.sql) — 11 bảng (`profiles`, `workspaces`, `memberships`, `user_api_keys`, `discovery_runs`, `scan_jobs`, `scan_results`, `saved_leads`, `exports`, `billing_subscriptions`, `audit_logs`) + enum types + indexes + RLS draft + bootstrap trigger
- [x] [`src/lib/db/types.ts`](../src/lib/db/types.ts) — TypeScript interfaces khớp schema (hand-written, sẽ thay bằng `supabase gen types` khi có project)
- [x] [`docs/DATABASE.md`](./DATABASE.md) — quyết định Supabase, ER diagram, table-by-table, plan RLS, plan chuyển từ demo auth sang Supabase Auth
- [x] `.env.example` thêm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Chưa làm (chuyển sang Phase 05):**

- [ ] Provision Supabase project (cloud) + apply migration
- [ ] Cài `@supabase/supabase-js` + `@supabase/ssr` (chờ có URL/key thật)
- [ ] Generate types thật từ Supabase CLI
- [ ] Swap `src/lib/auth/*` từ HMAC cookie → Supabase Auth
- [ ] Seed demo users qua Supabase Admin API

**Deliverable:** Schema ready-to-apply, contract TS sạch, docs giải thích quyết định.

**Phụ thuộc:** Phase 03.

---

## Phase 05 — Supabase wiring + auth migration prep — DONE

**Mục tiêu:** Cài Supabase SDK và viết factory client cho browser/server/admin. Build-safe khi env vắng. Auth Phase 03 chưa đổi — chỉ chuẩn bị cầu nối.

**Đã làm:**

- [x] Cài `@supabase/supabase-js`, `@supabase/ssr`, `server-only`
- [x] [`src/lib/supabase/env.ts`](../src/lib/supabase/env.ts) — public config + flags (`hasSupabasePublicEnv`, `hasSupabaseServiceRoleEnv` không return secret)
- [x] [`src/lib/supabase/client.ts`](../src/lib/supabase/client.ts) — `createSupabaseBrowserClient()` (RSC/Client Component)
- [x] [`src/lib/supabase/server.ts`](../src/lib/supabase/server.ts) — `createSupabaseServerClient()` cookie-bound, `import "server-only"`
- [x] [`src/lib/supabase/admin.ts`](../src/lib/supabase/admin.ts) — `getSupabaseAdminClient()` service role singleton, `import "server-only"`
- [x] [`src/lib/supabase/health.ts`](../src/lib/supabase/health.ts) — `checkSupabaseHealth()` diagnostics, không leak connection string
- [x] [`src/lib/supabase/index.ts`](../src/lib/supabase/index.ts) — barrel chỉ re-export client-safe modules
- [x] Mọi factory return `null` khi env vắng → build vẫn pass
- [x] `docs/DATABASE.md §8` document client wiring + bảo vệ service role + bridge demo auth

**Chưa làm (chuyển Phase 06):**

- [ ] Provision Supabase project + apply migration
- [ ] Swap `src/lib/auth/*` sang Supabase Auth
- [ ] Seed demo users qua admin client
- [ ] Middleware đổi sang Supabase middleware helper
- [ ] Generate types thật từ Supabase CLI

**Deliverable:** Bất kỳ route handler/server action nào ở Phase 06 đều có thể `await createSupabaseServerClient()` ngay. Chỉ cần điền 3 env vars Supabase và app sẽ kết nối — không có refactor cần thiết.

**Phụ thuộc:** Phase 04.

---

## Phase 06 — Supabase project setup + health check — CURRENT

**Mục tiêu:** Hướng dẫn provision Supabase project (do owner tự làm vì cần credential), thêm route diagnostic an toàn để xác nhận app kết nối được DB. Không migrate auth.

**Đã làm:**

- [x] [`docs/SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) — checklist 5 bước: tạo project → lấy env → tạo `.env.local` → apply schema → verify với health route
- [x] [`src/app/api/health/supabase/route.ts`](../src/app/api/health/supabase/route.ts) — `GET /api/health/supabase` trả JSON envelope (`configured`, `ok`, `latencyMs`, `error`); luôn HTTP 200; sanitize error (mask URL/JWT, cắt 200 ký tự); cache-control no-store
- [x] Health check phân biệt 4 state rõ ràng: missing public env / missing service role / reachable+ok / reachable+schema-not-applied
- [x] Route nằm dưới `/api/*` → middleware đã exclude → public OK (không trả secret)
- [x] Schema Phase 04 (`0001_initial_schema.sql`) **không cần sửa** — chạy được trực tiếp trong Supabase SQL Editor
- [x] README thêm section verify bằng `curl`, link `SUPABASE_SETUP.md`

**Chưa làm (deferred):**

- [ ] Provision Supabase project thật — owner tự làm theo [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md), không thể tự động hoá trong repo
- [ ] Swap demo HMAC → Supabase Auth — **chủ đích giữ lại Phase 03 auth**; chuyển sang Phase 07 nếu cần
- [ ] Seed demo users qua admin client
- [ ] Generate types thật từ Supabase CLI

**Deliverable:** Anyone clone repo, làm theo `SUPABASE_SETUP.md`, chạy `curl /api/health/supabase` → `{ ok: true }` trong < 10 phút. App vẫn chạy bình thường khi env vắng.

**Phụ thuộc:** Phase 04–05.

---

## Phase 07 — Supabase Auth migration *or* Keyword Discovery backend foundation

**Mục tiêu:** Owner quyết định mở hướng nào trước. Hai nhánh không phụ thuộc nhau quá chặt — có thể đảo thứ tự.

**Nhánh A — Auth migration (đề xuất đi trước nếu sắp có nhiều người dùng):**

- Swap `src/lib/auth/*` sang Supabase Auth (giữ `Session` shape).
- Uncomment trigger `on_auth_user_created` ở `0001_initial_schema.sql`.
- Seed demo accounts qua `getSupabaseAdminClient()`.
- Đổi middleware sang Supabase middleware helper (refresh cookie).

**Nhánh B — Keyword Discovery backend foundation (đề xuất nếu muốn demo SerpAPI sớm):**

- Quyết định encryption scheme cho `user_api_keys.encrypted_key` (Vault vs app KMS).
- `POST /api/discovery` insert vào `discovery_runs`, gọi SerpAPI với key user, insert `scan_results`.
- `/discover` page đọc/ghi data thật, loading/error/empty states.

**Deliverable:** Một lượt scan thật từ user thật, có lịch sử trong DB.

**Phụ thuộc:** Phase 06.

---

## Phase 06 — Domain Scan job system

**Mục tiêu:** Flow Input → Preview → Scanning → Results với Hunter.io thật; job async + progress.

**Công việc dự kiến:**

- Preview validate domain (không tốn quota)
- `POST /api/scan/start`, poll hoặc SSE progress
- Hủy run, ghi log; quota Hunter hiển thị thật

**Deliverable:** Domain scan nhiều domain, kết quả persist DB.

**Phụ thuộc:** Phase 04–05 (pattern scan đã có).

---

## Phase 07 — Results, Saved Leads, Export

**Mục tiêu:** Parity nghiệp vụ desktop cho lưu trữ và xuất dữ liệu.

**Công việc dự kiến:**

- `/results`, `/leads`, `/history` nối API
- CRUD `saved_leads`, bulk save từ results
- Export CSV/JSON (signed URL hoặc download server-generated)
- Export modal production

**Deliverable:** User lưu lead, xuất file, xem lại scan cũ.

**Phụ thuộc:** Phase 05–06.

---

## Phase 08 — Billing / subscription / credit limits

**Mục tiêu:** Gói PRO/BASIC, giới hạn scan/quota theo subscription.

**Công việc dự kiến:**

- `/billing` nối Stripe hoặc activation code (TDM-XXXX)
- Enforce plan trên route discover/scan
- Usage metering (scan count, Hunter quota display)

**Deliverable:** Khách không vượt quota gói; nâng cấp/hạ cấp có audit.

**Phụ thuộc:** Phase 03–04.

---

## Phase 09 — Admin dashboard

**Mục tiêu:** Vận hành nội bộ — user, subscription, audit, thống kê.

**Công việc dự kiến:**

- Role `admin` trên `profiles`
- `/admin`, `/admin/users` + API bảo vệ role
- `audit_logs` cho thao tác nhạy cảm

**Deliverable:** Admin quản lý user và xem usage cơ bản.

**Phụ thuộc:** Phase 03–08 (có dữ liệu thật).

---

## Phase 10 — Deployment and production readiness

**Mục tiêu:** Deploy production an toàn, vận hành được.

**Công việc dự kiến:**

- Vercel + Supabase production
- Env secrets, HTTPS, RLS review
- Rate limit, monitoring (Sentry tùy chọn), backup DB
- CI: lint + build on PR
- Runbook deploy / rollback

**Deliverable:** URL production cho beta khách hàng.

**Phụ thuộc:** Phase 03–09 đạt MVP.

---

## Mapping với desktop (`b2b-lead-finder`)

| Tính năng desktop | Phase web |
|-------------------|-----------|
| Settings / API Keys | 03–04 |
| Keyword Discovery | 05 |
| Domain Scan | 06 |
| Results Table | 06–07 |
| Saved Leads | 07 |
| Export CSV/JSON | 07 |
| Scan History | 07 |
| License / Subscription | 08 |
| Admin (nếu có) | 09 |

---

## Nguyên tắc xuyên suốt

1. Web và desktop là **hai repo riêng** — không copy secret từ desktop.
2. API key user **không** expose ra browser sau khi lưu.
3. Mọi thay đổi schema/API lớn → cập nhật `API_DATABASE_DRAFT.md` trước khi code.
4. Ưu tiên deliverable nhỏ, review được — tránh “big bang” backend.

---

## Lịch sử cập nhật

| Ngày | Thay đổi |
|------|----------|
| 2026-05-18 | Tạo ROADMAP phase 01–10; Phase 01 done, Phase 02 current |
| 2026-05-18 | Phase 02 done; Phase 03 in-progress — auth foundation (HMAC cookie + demo users) hoàn tất, chờ Supabase ở Phase 04 |
| 2026-05-18 | Phase 03 done (demo); Phase 04 in-progress — DB schema + RLS draft + TS types + DATABASE.md. Apply lên Supabase project ở Phase 05 |
| 2026-05-18 | Phase 04 done; Phase 05 in-progress — Supabase client wiring (browser/server/admin/health), env-gated, không đụng auth hiện tại. Provision project + auth swap chuyển sang Phase 06 |
| 2026-05-18 | Phase 05 done; Phase 06 in-progress — `SUPABASE_SETUP.md` + `GET /api/health/supabase`. Owner tự provision project; auth migration deferred Phase 07 |
