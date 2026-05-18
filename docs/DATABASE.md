# Database foundation — Phase 04

> Trạng thái: **foundation-only**. SQL migration đã viết, TypeScript types đã có, nhưng **chưa apply vào Supabase project nào**. Repo này không tạo Supabase project tự động.

## 1. Quyết định: Supabase Postgres

Phase 04 chọn **Supabase Postgres** làm database foundation.

Lý do:
- **Phù hợp SaaS đa user** — Postgres + RLS cho phép isolation theo workspace ngay từ DB, không phụ thuộc check ở app layer.
- **Auth + DB + Storage cùng nhà cung cấp** — sẽ thay demo auth Phase 03 bằng Supabase Auth ở Phase 05+, không phải tích hợp 2 dịch vụ.
- **Deploy Vercel-friendly** — connection pooling sẵn (PgBouncer/Supavisor), không cần tự dựng.
- **Mở rộng tốt cho billing/quota/admin** — RLS + `service_role` cho admin-only writes; webhooks Stripe → Supabase Edge Functions cùng repo logic.
- **Đã chốt trong [`TECH_DECISION.md`](./TECH_DECISION.md)** — Phase 04 chỉ là hiện thực hoá quyết định đó bằng SQL.

Phương án bị loại tạm:
| Alternative | Lý do |
|---|---|
| Planetscale / Neon | Auth/Storage tách rời — phải tự lo thêm provider. |
| Prisma + tự host Postgres | Vận hành DB tự host không hợp prototype/MVP. |
| Firestore | NoSQL không khớp model quan hệ phức tạp (scan_runs ↔ scan_results ↔ saved_leads). |

## 2. Files thuộc phase này

```
supabase/
└── migrations/
    └── 0001_initial_schema.sql       # Toàn bộ schema + RLS draft + bootstrap trigger
src/lib/db/
└── types.ts                          # App-level TypeScript types khớp schema
docs/
└── DATABASE.md                       # File này
```

Tất cả phụ thuộc dùng dependency có sẵn — **không** thêm package mới ở Phase 04.

## 3. Entity overview

```text
auth.users (Supabase managed)
    │ 1:1
    ▼
profiles ───────────────── 1:N ──── user_api_keys (personal Hunter/SerpAPI keys)
    │
    │ owns
    ▼
workspaces ────────── 1:N ──── memberships ─── N:1 ─── profiles
    │
    │ 1:1
    ▼
billing_subscriptions
    │
    │ scoped tenant for everything below
    ▼
discovery_runs ─── 1:N ─── scan_results ─── 0:1 ─── saved_leads
scan_jobs       ─── 1:N ─── scan_results ─── 0:1 ─── saved_leads
exports
audit_logs
```

`scan_results` có CHECK constraint: **đúng một** trong `discovery_run_id` / `scan_job_id` non-null. Mỗi result vẫn carry `workspace_id` denormalized để RLS đơn giản và index hiệu quả.

## 4. Tables

| Bảng | Mục đích | Scope RLS |
|---|---|---|
| `profiles` | App-level extension của `auth.users` (display name, role, locale). | self + global admin |
| `workspaces` | Đơn vị tenancy. Phase 04: 1 workspace/user (auto-create). | members |
| `memberships` | Liên kết user ↔ workspace với role per-workspace (owner/admin/member). | members |
| `user_api_keys` | Hunter / SerpAPI keys cá nhân. Ciphertext only. | owner |
| `discovery_runs` | Một lần Keyword Discovery (SerpAPI). | members |
| `scan_jobs` | Một lần Domain Scan (Hunter.io). | members |
| `scan_results` | Dòng kết quả thuộc một run/job. | members |
| `saved_leads` | Mini-CRM lead đã lưu. Unique (workspace, email). | members |
| `exports` | Job export CSV/JSON, file đặt trong Supabase Storage. | members |
| `billing_subscriptions` | 1 row/workspace; plan + status; Stripe hoặc activation code. | members read, owner write |
| `audit_logs` | Append-only log thao tác nhạy cảm. | members read, system writes (service_role) |

Chi tiết cột/index/check — xem trực tiếp [`supabase/migrations/0001_initial_schema.sql`](../supabase/migrations/0001_initial_schema.sql).

### Enums tập trung

`run_status`, `result_status`, `lead_status`, `export_kind`, `export_format`, `export_status`, `plan_tier`, `subscription_status`, `membership_role`, `profile_role`, `api_provider` đều là PostgreSQL enum types. Cùng tên (snake_case) được giữ trong `src/lib/db/types.ts` ở dạng TypeScript union để chia sẻ contract giữa SQL và TS.

## 5. Bảo mật & RLS

### Nguyên tắc

1. **RLS bật trên mọi bảng business** (đã `alter table … enable row level security` trong migration).
2. **Mọi truy cập từ client đi qua role `authenticated`** với cookie Supabase Auth. RLS chặn dựa trên `auth.uid()`.
3. **`service_role` chỉ dùng server-side** — ví dụ webhook Stripe, audit log insert, admin actions. Tuyệt đối không leak vào `NEXT_PUBLIC_*`.
4. **Helper `public.is_workspace_member(ws uuid)`** dùng lại trong tất cả policy workspace-scoped — tránh lặp subquery và dễ audit.

### Policy hiện tại (draft)

| Bảng | Policy chính |
|---|---|
| `profiles` | `profiles_self_select` (self hoặc global admin), `profiles_self_update` (self) |
| `workspaces` | `workspaces_member_select` (member), `workspaces_owner_update` (owner) |
| `memberships` | `memberships_member_select` (member), `memberships_owner_manage` (owner/admin) |
| `user_api_keys` | `user_api_keys_owner_all` (chỉ chính chủ) |
| `discovery_runs`, `scan_jobs`, `scan_results`, `saved_leads`, `exports` | `*_member_all` (mọi member làm mọi thao tác trong workspace) |
| `billing_subscriptions` | `billing_member_select`, `billing_owner_update` |
| `audit_logs` | `audit_logs_member_select` (read-only client; insert qua service_role) |

### Điểm cần audit trước khi production

- Tách quyền write theo `membership.role` (owner vs admin vs member) cho `scan_jobs`/`exports`/`saved_leads`. Hiện tại tất cả member ngang nhau.
- `audit_logs` không có policy INSERT — đúng ý đồ, nhưng cần verify mọi server action ghi qua client `service_role`.
- Encryption cho `user_api_keys.encrypted_key`: chọn Supabase Vault (pgsodium) hay app-level KMS — chốt ở Phase 05.

## 6. Bootstrap mới user

Trigger `public.handle_new_user()` chạy sau khi `auth.users` insert:

1. Tạo `profiles` row (display_name từ metadata hoặc local-part email).
2. Tạo `workspaces` row default (`<name> workspace`, slug auto).
3. Insert `memberships` với role `owner`.
4. Insert `billing_subscriptions` với `plan=trial`, `status=trialing`.

Trigger creation **commented** trong migration — uncomment khi apply lần đầu vào Supabase project. Lý do: để file SQL có thể chạy lại idempotent ở môi trường test khi `auth.users` chưa tồn tại.

## 7. Chuyển từ demo auth (Phase 03) sang Supabase Auth

Phase 03 dùng cookie HMAC + demo users in-memory (`src/lib/auth/demo-users.ts`). Khi chuyển sang Supabase Auth:

1. **Provision Supabase project** — lấy URL, anon key, service role key. Cập nhật `.env.local` (theo `.env.example`).
2. **Apply migration** — chạy `0001_initial_schema.sql` qua Supabase Studio hoặc CLI. Uncomment trigger `on_auth_user_created`.
3. **Tạo demo accounts** trên Supabase Auth — viết script ngắn dùng `service_role` để tạo cùng email/password trong `demo-users.ts`. Trigger sẽ tự tạo profile + workspace.
4. **Đổi `src/lib/auth/session.ts`**:
   - `getSession()` đổi từ `verifySession(cookie)` → đọc Supabase session qua `@supabase/ssr` helper.
   - Shape `Session` giữ nguyên (id, email, name, initials, plan, role) — chỉ thay nguồn dữ liệu.
5. **Đổi `src/lib/auth/actions.ts`**:
   - `signInAction` → `supabase.auth.signInWithPassword`.
   - `signOutAction` → `supabase.auth.signOut`.
6. **Xoá / archive `src/lib/auth/demo-users.ts`** sau khi seed xong.
7. **Middleware không cần đổi nhiều** — vẫn check cookie tồn tại; có thể đổi sang `@supabase/ssr` middleware helper khi cài lib.

Estimated effort: ~1 ngày engineering, không thay UI.

## 8. Cái CHƯA làm ở Phase 04

- Không apply schema lên Supabase project — chỉ kiểm tra cú pháp manual.
- Không tạo Supabase client (`createClient`) trong codebase — chờ Phase 05 khi có route handler thật.
- Không cài `@supabase/supabase-js` hay `@supabase/ssr` — chờ khi có Supabase URL/key thật để test.
- Không generate Supabase types (`supabase gen types typescript`) — hand-written tạm trong `src/lib/db/types.ts`.
- Không billing thật, không Stripe — bảng `billing_subscriptions` có sẵn nhưng không có route ghi.
- Không ghi audit log thật — bảng có nhưng chưa có server action insert.

## 9. Phase tiếp theo

Phase 05 — Keyword Discovery real workflow:
- Cài `@supabase/supabase-js` + `@supabase/ssr`.
- Apply migration này lên Supabase dev project.
- Route handler `POST /api/discovery` insert vào `discovery_runs`, gọi SerpAPI với key user, insert `scan_results`.
- Chuyển `/discover` page từ mock sang đọc data thật.

Phase 05 chính là điểm RLS draft hôm nay được test thật. Nếu phát hiện gap (ví dụ cần policy write per-role), iterate ở migration `0002_*.sql`.
