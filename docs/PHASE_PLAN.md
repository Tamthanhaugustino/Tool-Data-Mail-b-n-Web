# Lộ trình phase — Tool Data Mail Web

> Phát triển theo **phase Web 01–07**. Mỗi phase có deliverable rõ; không nhảy cóc sang code production trước khi planning & UI ổn định.

---

## Phase Web 01 — Planning & UI/UX

**Trạng thái:** Đang thực hiện

**Mục tiêu:** Thống nhất phạm vi, stack, draft dữ liệu/API; chuẩn bị input cho thiết kế.

**Deliverable:**

- [x] `README.md`
- [x] `plans/tool-data-mail-web-ui-brief.md`
- [x] `docs/PROJECT_STATE.md`, `TECH_DECISION.md`, `PHASE_PLAN.md`, `API_DATABASE_DRAFT.md`
- [ ] `docs/ui-design-handoff.md` (Claude Design — wireframe/mockup/component spec)

**Không làm trong phase này:** Scaffold app, backend, database thật.

**Tiêu chí hoàn thành:** UI brief + planning docs được review; handoff design có đủ page list và states để sang phase 02.

---

## Phase Web 02 — Frontend Prototype

**Mục tiêu:** Scaffold Next.js + UI shell theo handoff; dữ liệu mock, chưa gọi API thật.

**Công việc chính:**

- Khởi tạo Next.js (TypeScript, Tailwind, shadcn/ui)
- Layout: auth shell, dashboard sidebar, navigation theo brief
- Các page: Login, Dashboard, Settings/API Keys, Keyword Discovery, Domain Scan, Results, Saved Leads, Scan History, Export modal, Subscription, Admin (placeholder)
- Empty / loading / error states theo handoff
- Copy tiếng Việt theo tone trong UI brief

**Deliverable:** App chạy local (`npm run dev`), flow click-through với mock data.

**Phụ thuộc:** Phase 01 — `ui-design-handoff.md` xong.

---

## Phase Web 03 — Auth + Database

**Mục tiêu:** Supabase Auth + schema DB v1 + RLS; user đăng nhập và lưu profile/settings cơ bản.

**Công việc chính:**

- Tạo Supabase project (dev/staging)
- Migration bảng: `profiles`, `user_api_keys` (structure), `subscriptions` (skeleton)
- Đăng ký / đăng nhập / session trong Next.js
- Trang Settings: form lưu key (server-side persist, không expose key ra client sau lưu)
- Kết nối prototype với data thật cho phần user/settings

**Deliverable:** User có thể auth và lưu cấu hình; chưa chạy scan thật.

**Phụ thuộc:** Phase 02 — cấu trúc page ổn định.

---

## Phase Web 04 — Hunter / SerpAPI Integration

**Mục tiêu:** Keyword Discovery và Domain Scan chạy thật qua backend.

**Công việc chính:**

- Route handlers: `keyword-discovery`, `domain-scan`
- Đọc `user_api_keys` server-side; xử lý lỗi quota/invalid key
- Ghi `scan_runs`, `scan_results`
- UI: progress, cancel (nếu có), hiển thị Results Table từ DB

**Deliverable:** Một lượt scan end-to-end lưu được lịch sử.

**Phụ thuộc:** Phase 03 — auth + keys + bảng scan.

---

## Phase Web 05 — Saved Leads + Export + History

**Mục tiêu:** Parity nghiệp vụ cốt lõi với desktop cho phần lưu trữ & xuất dữ liệu.

**Công việc chính:**

- `saved_leads` CRUD, gắn nguồn từ `scan_results`
- Export CSV/JSON (server generate hoặc signed URL)
- Scan History: danh sách `scan_runs`, xem lại kết quả
- Export modal UX theo handoff

**Deliverable:** User lưu lead, xuất file, xem lại scan cũ.

**Phụ thuộc:** Phase 04.

---

## Phase Web 06 — Admin Dashboard

**Mục tiêu:** Vận hành nội bộ — user, subscription, audit.

**Công việc chính:**

- Role admin (claim/metadata trên `profiles` hoặc bảng riêng)
- Trang Admin: users, subscriptions, audit_logs, thống kê scan (tối thiểu)
- Route `/api/admin/*` bảo vệ role

**Deliverable:** Admin quản lý được user và xem log cơ bản.

**Phụ thuộc:** Phase 03–05 (dữ liệu thật để quản trị).

---

## Phase Web 07 — Production Deploy

**Mục tiêu:** Đưa bản MVP lên production an toàn.

**Công việc chính:**

- Vercel production + env secrets
- Supabase production, migration, backup policy
- Rate limit, monitoring, error tracking (tùy chọn: Sentry)
- Kiểm tra bảo mật: RLS, không leak key, HTTPS
- Tài liệu vận hành ngắn (deploy, rollback)

**Deliverable:** URL production cho khách thử nghiệm / beta.

**Phụ thuộc:** Phase 04–06 đạt tiêu chí MVP.

---

## Sơ đồ phụ thuộc

```text
Web 01 (Planning & UI)
    ↓
Web 02 (Frontend Prototype)
    ↓
Web 03 (Auth + DB)
    ↓
Web 04 (Hunter/SerpAPI)
    ↓
Web 05 (Saved Leads + Export + History)
    ↓
Web 06 (Admin)
    ↓
Web 07 (Production Deploy)
```

---

## Mapping với desktop (b2b-lead-finder)

| Tính năng desktop | Phase web gần nhất |
|-------------------|-------------------|
| Keyword Discovery | Web 04 |
| Domain Scan | Web 04 |
| Results Table | Web 04 |
| Saved Leads | Web 05 |
| Export CSV/JSON | Web 05 |
| Scan History | Web 05 |
| License / Activation | Web 03 (skeleton) → Web 06/07 (billing đầy đủ) |
| Settings / API Keys | Web 03 |
| Admin (nếu có trên desktop) | Web 06 |

Logic chi tiết **không copy** từ desktop; implement lại theo API web và RLS.
