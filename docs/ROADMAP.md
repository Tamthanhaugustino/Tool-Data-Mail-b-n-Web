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
Phase 04  Database              ████████████████░░░░  CURRENT (foundation)
Phase 05  Keyword Discovery     ░░░░░░░░░░░░░░░░░░░░
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

## Phase 04 — Database schema + Supabase foundation — CURRENT

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

## Phase 05 — Keyword Discovery real workflow + Supabase wiring

**Mục tiêu:** Provision Supabase, apply migration Phase 04, swap auth, rồi `/discover` gọi SerpAPI thật, lưu vào `discovery_runs` / `scan_results`.

**Công việc dự kiến:**

- Provision Supabase project (cloud) + apply [`0001_initial_schema.sql`](../supabase/migrations/0001_initial_schema.sql)
- Cài `@supabase/supabase-js`, `@supabase/ssr`
- Swap `src/lib/auth/*` từ HMAC cookie sang Supabase Auth (giữ `Session` shape)
- Seed demo users qua Supabase Admin API
- `POST /api/discovery` insert vào `discovery_runs`, gọi SerpAPI với key user từ `user_api_keys`, insert `scan_results`
- `/discover` page đọc/ghi data thật, loading/error/empty states
- Quyết định encryption scheme cho `user_api_keys.encrypted_key`

**Deliverable:** Một lượt keyword discovery end-to-end có lịch sử trong DB thật.

**Phụ thuộc:** Phase 03–04.

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
