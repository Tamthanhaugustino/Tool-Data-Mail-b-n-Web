# Roadmap — Tool Data Mail Web

> Lộ trình phát triển SaaS, cập nhật sau khi hoàn thành frontend prototype (Phase 01).  
> Repo: [Tool-Data-Mail-b-n-Web](https://github.com/Tamthanhaugustino/Tool-Data-Mail-b-n-Web)

Tài liệu phase cũ (Web 01–07, planning-only): [`PHASE_PLAN.md`](./PHASE_PLAN.md). **Roadmap file này là bản tham chiếu chính** cho các phase tiếp theo.

---

## Tổng quan

```text
Phase 01  Prototype UI          ████████████████████  DONE
Phase 02  Docs & planning       ████████░░░░░░░░░░░░  CURRENT
Phase 03  Auth                  ░░░░░░░░░░░░░░░░░░░░
Phase 04  Database              ░░░░░░░░░░░░░░░░░░░░
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

## Phase 02 — Docs and SaaS planning — CURRENT

**Mục tiêu:** Chuẩn hóa tài liệu repo để team/onboarding rõ trạng thái, lộ trình và ràng buộc kỹ thuật trước khi viết backend.

**Công việc:**

- [x] README.md dự án (không dùng template Next.js mặc định)
- [x] `docs/ROADMAP.md` (file này)
- [ ] Review & cập nhật `PROJECT_STATE.md` theo prototype (tùy chọn)
- [ ] Chốt mapping phase 03–10 với `API_DATABASE_DRAFT.md` / `TECH_DECISION.md`

**Deliverable:** Developer mới clone repo → đọc README + ROADMAP là đủ để biết chạy app và phase tiếp theo.

**Không làm trong phase:** Thay đổi UI/logic app, thêm dependency, backend.

---

## Phase 03 — Auth + user account foundation

**Mục tiêu:** Đăng nhập/đăng xuất thật, session bảo vệ route app, profile cơ bản.

**Công việc dự kiến:**

- Supabase Auth (hoặc quyết định cuối từ `TECH_DECISION.md`)
- Route guard: redirect `/login` khi chưa auth
- Trang Settings → tab Tài khoản / Đổi mật khẩu nối API thật
- Bảng `profiles` + RLS

**Deliverable:** User có tài khoản thật, không truy cập dashboard khi chưa login.

**Phụ thuộc:** Phase 02.

---

## Phase 04 — Database schema + lead/project models

**Mục tiêu:** Schema Postgres v1, migration, RLS; model dữ liệu cho scan và lead.

**Công việc dự kiến:**

- Migration: `user_api_keys`, `scan_runs`, `scan_results`, `saved_leads`, `subscriptions` (skeleton), `audit_logs`
- Implement draft trong [`API_DATABASE_DRAFT.md`](./API_DATABASE_DRAFT.md)
- Shared types / Zod schema giữa client và server

**Deliverable:** DB dev/staging sẵn sàng; chưa cần chạy scan thật.

**Phụ thuộc:** Phase 03.

---

## Phase 05 — Keyword Discovery real workflow

**Mục tiêu:** `/discover` gọi SerpAPI qua backend; lưu kết quả vào `scan_runs` / `scan_results`.

**Công việc dự kiến:**

- `POST /api/keyword-discovery` (hoặc tương đương)
- Đọc SerpAPI key server-side từ `user_api_keys`
- UI: loading, error quota, empty states với data thật

**Deliverable:** Một lượt keyword discovery end-to-end có lịch sử.

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
