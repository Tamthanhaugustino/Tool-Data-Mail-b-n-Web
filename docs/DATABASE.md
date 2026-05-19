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

## 2. Files thuộc các phase

**Phase 04 — Schema foundation:**

```
supabase/
└── migrations/
    └── 0001_initial_schema.sql       # Toàn bộ schema + RLS draft + bootstrap trigger
src/lib/db/
└── types.ts                          # App-level TypeScript types khớp schema
docs/
└── DATABASE.md                       # File này
```

**Phase 05 — Supabase client wiring:**

```
src/lib/supabase/
├── env.ts                            # Public config + presence flags (safe everywhere)
├── client.ts                         # createSupabaseBrowserClient() — RSC/Client
├── server.ts                         # createSupabaseServerClient() — server-only, cookie-bound
├── admin.ts                          # getSupabaseAdminClient() — service role, server-only
├── health.ts                         # checkSupabaseHealth() — diagnostics, server-only
└── index.ts                          # Re-exports CLIENT-SAFE pieces only
```

Phase 05 thêm 3 dependency:
- `@supabase/supabase-js` — official client.
- `@supabase/ssr` — Next.js App Router cookie integration.
- `server-only` — build-time poison module để bảo vệ server modules khỏi bị import vào client bundle.

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
| `app_saved_leads` | **Phase 09D** — lead per demo `session.id` (text). Unique (user_id, email, domain). Service role + app filter; RLS on, no anon policies. | server app |
| `app_user_api_keys` | **Phase 09F** — encrypted Hunter/SerpAPI keys per hybrid auth user id. Unique (user_id, provider). | server app |
| `app_scan_jobs` | **Phase 09G** — Domain Scan job per hybrid auth user id. Stores provider/status/input domains/counts/duration/sanitized error. | server app |
| `app_scan_results` | **Phase 09G** — Results linked to `app_scan_jobs(id)` with `user_id` denormalized for scoped reads. No raw provider secrets. | server app |
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

Phase 09E đã có hybrid adapter: `getSession()` ưu tiên Supabase Auth rồi fallback cookie HMAC + demo users in-memory (`src/lib/auth/demo-users.ts`). Khi chuyển sang production-only Supabase Auth:

1. **Provision Supabase project** — lấy URL, anon key, service role key. Cập nhật `.env.local` (theo `.env.example`).
2. **Apply migration** — chạy `0001_initial_schema.sql` qua Supabase Studio hoặc CLI. Uncomment trigger `on_auth_user_created`.
3. **Tạo demo accounts** trên Supabase Auth — viết script ngắn dùng `service_role` để tạo cùng email/password trong `demo-users.ts`. Trigger sẽ tự tạo profile + workspace.
4. **Hoàn thiện role/plan source** — đọc `profiles.role` và subscription thay vì metadata/default.
5. **Xoá / archive `src/lib/auth/demo-users.ts`** sau khi seed xong.
6. **Disable HMAC fallback** khi owner xác nhận Supabase Auth đã thay thế hoàn toàn.
7. **Migration dữ liệu app tables** — map user_id text demo (`u-trang`, `u-admin`) sang `auth.users.id` nếu cần giữ Saved Leads cũ.

Estimated effort: ~1 ngày engineering, không thay UI.

## 8. Supabase client wiring (Phase 05)

### Ba loại client + nguyên tắc dùng

| Client | File | Khi nào dùng | Auth context |
|---|---|---|---|
| Browser | [`src/lib/supabase/client.ts`](../src/lib/supabase/client.ts) | Client Components, code chạy trên browser | Đọc session từ cookie Supabase Auth (sau migration auth) |
| Server | [`src/lib/supabase/server.ts`](../src/lib/supabase/server.ts) | RSC, server actions, route handlers | Cookie-bound, RLS áp dụng theo `auth.uid()` |
| Admin (service role) | [`src/lib/supabase/admin.ts`](../src/lib/supabase/admin.ts) | Audit log writes, admin actions, webhooks | Bypass RLS — chỉ server, không có user context |

### Bảo vệ service role

- `admin.ts`, `server.ts`, `health.ts` đều có `import "server-only"` ở dòng đầu. Bất kỳ client component nào import vào sẽ vỡ build với lỗi rõ ràng từ Next.js.
- `SUPABASE_SERVICE_ROLE_KEY` chỉ được đọc trong [`admin.ts`](../src/lib/supabase/admin.ts) — không re-export, không log.
- [`src/lib/supabase/index.ts`](../src/lib/supabase/index.ts) chỉ re-export client-safe modules (`env`, `client`). Server modules phải import trực tiếp từ path tương ứng.
- `hasSupabaseServiceRoleEnv()` trong [`env.ts`](../src/lib/supabase/env.ts) trả về boolean — không bao giờ trả về giá trị key.

### Build-safe khi thiếu env

Tất cả factory return `null` khi env vars vắng mặt. Điều này cho phép `npm run build` chạy trước khi có Supabase project. Caller bắt buộc check null trước khi dùng (TypeScript enforce qua kiểu trả về `T | null`).

```ts
const supabase = await createSupabaseServerClient();
if (!supabase) {
  // Show "Supabase chưa cấu hình" hoặc fallback mock
  return ...;
}
const { data } = await supabase.from("profiles").select("...");
```

### Bridge với Phase 03 demo auth

Giai đoạn hiện tại app dùng hybrid auth: Supabase cookie hợp lệ sẽ có user context qua `auth.getUser()`, còn thiếu env/cookie sẽ fallback cookie HMAC (`tdm_session`). Các query cần RLS chỉ có context khi user đang đăng nhập bằng Supabase Auth.

Các bước còn lại:
1. Seed demo users qua admin client.
2. Đọc role/plan từ DB.
3. Disable demo HMAC fallback khi Supabase Auth đã ổn định.

## 9. App persistence migrations (Phase 09D-09G)

Các bảng `app_*` là bridge an toàn trong giai đoạn auth hybrid. `user_id` là text và có thể là demo session id hoặc Supabase `auth.users.id`. App dùng service-role client server-only và luôn filter theo `user_id`; RLS bật nhưng không có anon policy.

| Migration | Bảng | Ghi chú |
|---|---|---|
| `0002_app_saved_leads.sql` | `app_saved_leads` | Saved Leads bền vững; unique `user_id + lower(email) + lower(domain)` |
| `0003_app_user_api_keys.sql` | `app_user_api_keys` | Hunter/SerpAPI key cá nhân, ciphertext only, cần `APP_ENCRYPTION_KEY` |
| `0004_app_scan_jobs.sql` | `app_scan_jobs`, `app_scan_results` | Domain Scan history/results; `/history` và `/results?jobId=` đọc qua API scoped user |

Nếu thiếu Supabase env hoặc chưa apply migration tương ứng, repository layer fallback in-memory để app vẫn build/run. In-memory không bền vững qua restart và chỉ phục vụ demo/local.

`app_scan_results.raw` hiện để `null` trong app code để tránh lưu URL/header/API key từ provider response. Nếu sau này cần raw metadata, phải scrub `api_key`, token, Authorization header và URL nhạy cảm trước khi insert.

## 10. Cái CHƯA làm

Phase 04 (schema) và Phase 05 (client wiring) gộp lại còn dang dở:

- Không provision Supabase project trong repo này.
- Không apply migration thật — `0001_initial_schema.sql` chỉ review thủ công.
- Không generate types (`supabase gen types typescript`) — hand-written tạm trong [`src/lib/db/types.ts`](../src/lib/db/types.ts).
- Không migrate auth — demo HMAC còn nguyên.
- Không gọi Hunter/SerpAPI thật.
- Không ghi audit log thật.
- Không billing/Stripe.

## 11. Phase tiếp theo

Phase 06 (hoặc tiếp Phase 05 nếu chia nhỏ) — Keyword Discovery real workflow:
- Provision Supabase project.
- Apply migration `0001_*.sql` qua Supabase Studio/CLI; uncomment trigger `on_auth_user_created`.
- Migrate `src/lib/auth/*` sang Supabase Auth (theo `§7`).
- Seed demo users qua admin client.
- Route handler `POST /api/discovery` insert vào `discovery_runs`, gọi SerpAPI với key user từ `user_api_keys`, insert `scan_results`.
- `/discover` page đọc/ghi data thật.

Phase này chính là điểm RLS draft được test thật. Nếu phát hiện gap (ví dụ cần policy write per-role), iterate ở migration `0002_*.sql`.
