# Production / Supabase Deploy Runbook — Phase 09L

> Runbook chính thức để triển khai **Tool Data Mail Web** lên Supabase + Vercel (hoặc self-host) cho **private beta** và bước đầu **production**. Đọc song song với [`PRIVATE_BETA_CHECKLIST.md`](./PRIVATE_BETA_CHECKLIST.md) (tổng quan & test flows) và [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) (chi tiết Supabase từng bước).
>
> Phạm vi: setup Supabase, apply migration, set env, smoke test live, rollback, go/no-go checklist. Phase 09L **không** thay đổi code app; chỉ là procedure.

---

## 0. TL;DR

```
1. Provision Supabase project        (§2)
2. Sinh AUTH_SECRET + APP_ENCRYPTION_KEY  (§3, §4)
3. Apply 5 migrations 0001 → 0005    (§5)
4. Điền env local rồi verify         (§6)
5. Deploy Vercel (hoặc self-host)    (§7)
6. Chạy 14 smoke tests live          (§8)
7. Go/no-go decision                 (§10)
```

---

## 1. Pre-flight checklist

Trước khi bắt đầu, đảm bảo:

- [ ] Đã đọc [`PRIVATE_BETA_CHECKLIST.md`](./PRIVATE_BETA_CHECKLIST.md) §1–§4 (status + env).
- [ ] Đã đọc [`SECURITY audit Phase 09J`](./ROADMAP.md) (đã PASS).
- [ ] Tài khoản Supabase (đăng nhập được Dashboard).
- [ ] Quyết định host: **Vercel** (recommended) hoặc **Node self-host** (Docker/PM2).
- [ ] Domain dự kiến (vd `app.tooldatamail.com`) — DNS có thể trỏ sau.
- [ ] Có ≥1 SerpAPI account (optional) và ≥1 Hunter account (optional) để smoke test live.
- [ ] Local đã `npm run build` pass trên branch `main` HEAD hiện tại.
- [ ] Không có `.env.local` chứa secret thật đang commit (`git ls-files | rg "^\.env"` chỉ ra `.env.example`).

---

## 2. Supabase project setup

### 2.1. Tạo project

1. Vào [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Org → đặt name `tool-data-mail-prod` (hoặc `-staging`), region gần Việt Nam (`Southeast Asia (Singapore)`).
3. Đặt **database password** mạnh, **lưu lại** (cần khi connect qua psql).
4. Đợi ~2 phút project khởi tạo.

### 2.2. Lấy env values

Trong Dashboard → **Project Settings → API**:

| Field UI | Env name | Public? |
|---|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | yes |
| Project API Keys → `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes |
| Project API Keys → `service_role` `secret` (Reveal) | `SUPABASE_SERVICE_ROLE_KEY` | **NO — server-only** |

> ⚠ Service role bypass RLS. Tuyệt đối KHÔNG prefix `NEXT_PUBLIC_*`. Repo guard bằng `import "server-only"` ở [`src/lib/supabase/admin.ts`](../src/lib/supabase/admin.ts).

### 2.3. Khuyến nghị 2 project

- `tool-data-mail-staging` — dev/staging, dùng key SerpAPI/Hunter free tier.
- `tool-data-mail-prod` — production, key trả phí riêng.

Tách project tránh staging mistake ảnh hưởng tester.

---

## 3. Sinh `AUTH_SECRET`

`AUTH_SECRET` ký HMAC cookie session demo (fallback khi không có Supabase Auth).

```bash
# Mỗi lệnh sinh chuỗi random 64 ký tự hex (256 bit).
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# hoặc
openssl rand -hex 32
```

Yêu cầu:
- ≥16 ký tự.
- High entropy (random, không phải password người-đoán-được).
- Khác nhau giữa staging và production.

---

## 4. Sinh `APP_ENCRYPTION_KEY`

`APP_ENCRYPTION_KEY` mã hóa AES-256-GCM user API key trước khi ghi `app_user_api_keys`. KDF là SHA-256 → **entropy của passphrase = entropy thực của key**.

```bash
# Chọn 1
openssl rand -hex 32
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
python -c "import secrets; print(secrets.token_hex(32))"
```

Yêu cầu:
- **≥32 ký tự random/high-entropy.**
- Khác nhau giữa staging và production.
- Lưu vào password manager — **không có cơ chế recover** nếu mất.

> ⚠ Đổi `APP_ENCRYPTION_KEY` sau khi đã có user key → ciphertext cũ decrypt fail → user phải xóa và lưu lại. Coi như rotate thủ công. Phase này chưa có versioned KMS rotation.

---

## 5. Apply Supabase migrations (0001 → 0005)

Vào **Supabase Studio → SQL Editor**. Apply **theo thứ tự**, mỗi migration 1 query, **Run**:

| # | File | Tạo bảng/đối tượng | Bắt buộc cho |
|---|---|---|---|
| 1 | `supabase/migrations/0001_initial_schema.sql` | profiles, workspaces, memberships, enums, helper functions | Schema foundation (chưa wire active) |
| 2 | `supabase/migrations/0002_app_saved_leads.sql` | `app_saved_leads` | Saved Leads persist |
| 3 | `supabase/migrations/0003_app_user_api_keys.sql` | `app_user_api_keys` | User API key encrypted |
| 4 | `supabase/migrations/0004_app_scan_jobs.sql` | `app_scan_jobs`, `app_scan_results` | History + `/results?jobId=` |
| 5 | `supabase/migrations/0005_app_usage_events.sql` | `app_usage_events` | Usage tracking foundation |

### Verify

Trong **Database → Tables** phải thấy đủ:

- `profiles`, `workspaces`, `memberships`, `user_api_keys`, `discovery_runs`, `scan_jobs`, `scan_results`, `saved_leads`, `exports`, `billing_subscriptions`, `audit_logs` (từ 0001)
- `app_saved_leads`, `app_user_api_keys`, `app_scan_jobs`, `app_scan_results`, `app_usage_events` (từ 0002–0005)

Trong **Database → Indexes** phải thấy các index theo `user_id` của bảng `app_*`.

### Re-apply

Mọi migration idempotent (`create if not exists`, `create or replace`, `drop trigger if exists`). Chạy lại an toàn.

### Drop / reset (chỉ dev/staging)

```sql
-- DANGER: dev/staging only
drop table if exists
  public.app_usage_events,
  public.app_scan_results,
  public.app_scan_jobs,
  public.app_user_api_keys,
  public.app_saved_leads cascade;
```

Sau đó chạy lại 0002–0005.

---

## 6. Env vars + local verification

### 6.1. Điền `.env.local`

```bash
cp .env.example .env.local
```

Mở `.env.local`, điền (giữ comment, ghi đè giá trị):

```
AUTH_SECRET=<output từ §3>
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key từ Dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service_role key từ Dashboard>
APP_ENCRYPTION_KEY=<output từ §4>

# Optional — chỉ điền nếu owner muốn server fallback cho user chưa lưu key
SERPAPI_API_KEY=
HUNTER_API_KEY=

# Optional — provider default khi UI không chỉ định
SCAN_PROVIDER=mock
DISCOVERY_PROVIDER=mock
```

> `.env.local` đã trong `.gitignore` (từ Phase 03). Đừng commit.

### 6.2. Verify build local

```bash
npm install
npm run lint     # PASS — no output
npm run build    # PASS — 24+ dynamic routes
npm run dev
```

Mở `http://localhost:3000/api/health/supabase`:

| Kết quả | Ý nghĩa |
|---|---|
| `{"configured":false,"reason":"missing_public_env"}` | Thiếu `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` |
| `{"configured":false,"reason":"missing_service_role_env"}` | Thiếu `SUPABASE_SERVICE_ROLE_KEY` |
| `{"configured":true,"ok":true,"latencyMs":<n>}` | ✅ Đầy đủ + project reachable |
| `{"configured":true,"ok":false,"error":"..."}` | Có env nhưng query fail (xem error) |

### 6.3. Verify migration ở local

Login `/login` với demo `trang.nguyen@vietsoftware.com.vn` / `demo123` → vào `/leads` → ô storage banner phải báo **Supabase**, không phải in-memory.

Nếu vẫn báo "fallback in-memory vì chưa có bảng…" → chạy lại migration tương ứng và đợi probe TTL 30s (hoặc restart `npm run dev`).

---

## 7. Production deploy

Hai hướng triển khai, chọn 1.

### 7.1. Vercel (recommended)

1. Đẩy code lên GitHub branch `main` (xem [`PRIVATE_BETA_CHECKLIST.md §10`](./PRIVATE_BETA_CHECKLIST.md) secret scan trước).
2. Vào [vercel.com](https://vercel.com) → **Add New** → **Project** → Import repo.
3. Framework Preset: Next.js (auto).
4. **Environment Variables** → thêm từng cặp từ `.env.local`:
   - `AUTH_SECRET` — Production + Preview + Development.
   - `NEXT_PUBLIC_SUPABASE_URL` — Production + Preview.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Production + Preview.
   - `SUPABASE_SERVICE_ROLE_KEY` — Production + Preview (đặt **Sensitive**).
   - `APP_ENCRYPTION_KEY` — Production (đặt **Sensitive**). **Khác** value với Preview.
   - `SERPAPI_API_KEY`, `HUNTER_API_KEY` — Production (Sensitive) nếu dùng.
   - `SCAN_PROVIDER=mock`, `DISCOVERY_PROVIDER=mock` cho beta đầu (đổi sang `hunter`/`serpapi` khi sẵn sàng).
5. Deploy → đợi build (~2 phút).
6. Mở URL `https://<deployment>.vercel.app/api/health/supabase` → expect `{"ok":true}`.
7. Trỏ custom domain ở **Project → Domains** (sau).

### 7.2. Self-host (Node + PM2/Docker)

1. Build: `npm ci && npm run build`.
2. Set env trong file `.env.production` hoặc systemd unit (server-only, mode 600).
3. Start: `npm run start` (port 3000) hoặc PM2 `pm2 start npm -- start`.
4. Đảm bảo **HTTPS** trước cookie (Phase 03 cookie có `secure: process.env.NODE_ENV === "production"`).
5. Reverse proxy (nginx/Caddy) xử lý TLS + forward `Host`/`X-Forwarded-*` headers.

---

## 8. Smoke test live (14 flows)

Sau khi deploy/restart, chạy lần lượt — mục tiêu **<25 SerpAPI search và <5 Hunter search** trong toàn bộ smoke test live.

| # | Flow | Cách verify | Expected |
|---|---|---|---|
| F1 | Demo login | `/login` → `trang.nguyen@vietsoftware.com.vn` / `demo123` | Redirect `/dashboard`, topbar có tên + plan PRO |
| F2 | Supabase Auth login (nếu seed) | Tạo user ở Dashboard → Auth → Add user → login | `getSession()` trả Supabase user, không fallback |
| F3 | Save API key | `/settings` → tab API Keys → lưu Hunter key | `hasUserKey:true`, `keyHint:"****abcd"` |
| F3a | Delete API key | Bấm xóa | Status revert `hasUserKey:false` |
| F3b | Missing `APP_ENCRYPTION_KEY` | Tạm xóa env, restart, lưu key | 409 `api_key_encryption_not_configured`, **không** ghi DB |
| F4 | Discovery mock | `/discover` provider=Mock, keyword "marketing agency" | 200, ~10 result mock, badge `provider:mock` |
| F5 | Discovery SerpAPI missing key | Provider=SerpAPI, không có key | 503 `provider_unavailable`, không tiêu quota |
| F6 | Discovery SerpAPI live (optional, 1 search) | Lưu SerpAPI key cá nhân, keyword nhỏ | 200, ~10 domain thật, badge `provider:serpapi`, duration ~500–2000ms |
| F7 | Domain Scan mock | `/scan` provider=Mock, 1–3 domain | 200, results table có email mock, `scanJobId` xuất hiện |
| F8 | Domain Scan Hunter missing key | Provider=Hunter, không có key | 503, không tiêu quota |
| F9 | Domain Scan Hunter live (optional, 1 domain) | Lưu Hunter key + Provider=Hunter + 1 domain (vd `stripe.com`) | 200, ~3–10 email thật, 1 search Hunter |
| F10 | Save selected leads | Sau F7/F9, tick rows, "Lưu lead đã chọn" | Alert "Đã lưu N lead" + link `/leads` |
| F10a | Save lại duplicate | Bấm Lưu lần 2 cùng rows | "N lead đã tồn tại (trùng email + domain, bỏ qua)" |
| F11 | Leads list/search | `/leads` → search "stripe" | Filter live, banner Supabase |
| F11a | Leads delete confirm | Trash icon → "Xác nhận xóa" → bấm lần 2 | Row biến mất, không xóa khi không xác nhận |
| F11b | Leads CSV export | Bấm "Tải CSV" | File `saved-leads-<date>.csv` mở OK |
| F12 | Scan History list | `/history` | Bảng có run đã chạy, banner Supabase, link Xem |
| F13 | Results by jobId | Bấm Xem từ History | `/results?jobId=...`, subtitle có totalEmails/scannedDomains/provider |
| F14 | Usage summary | `curl /api/usage/summary?days=30` với cookie | Trả `totals[]` 6 event types với count >0 cho event đã chạy |

### Pass criteria

- F1, F3, F3a, F4, F5, F7, F8, F10, F10a, F11, F11a, F11b, F12, F13, F14: **bắt buộc** PASS.
- F2: optional (cần seed Supabase Auth).
- F6, F9: optional (tốn 1 SerpAPI search + 1–N Hunter search).
- F3b: optional smoke test config error path.

Tổng quota tối đa nếu chạy hết: ~1 SerpAPI + 1–3 Hunter searches. Vẫn an toàn cho free tier (SerpAPI 100/tháng, Hunter 25/tháng).

---

## 9. Rollback & troubleshooting

### 9.1. Triệu chứng thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `/api/health/supabase` báo `missing_public_env` | Vercel chưa pick env mới | Redeploy hoặc set lại env + redeploy |
| `/api/health/supabase` báo `ok:false, error:"relation app_X does not exist"` | Migration chưa apply | Chạy SQL migration tương ứng |
| `503 provider_unavailable` ở Discovery/Scan | Thiếu `SERPAPI_API_KEY`/`HUNTER_API_KEY` + user chưa lưu key | Lưu key Settings hoặc set env Vercel |
| `409 api_key_encryption_not_configured` ở Settings | Thiếu `APP_ENCRYPTION_KEY` | Sinh + set Vercel env Sensitive, redeploy |
| `409 provider_key_unreadable` | `APP_ENCRYPTION_KEY` đã đổi → ciphertext cũ fail | User vào Settings xóa key + lưu lại |
| `/history` banner "fallback in-memory" | Probe phát hiện bảng thiếu hoặc lỗi | Verify migration 0004 trong Database → Tables; restart 1 instance để clear probe cache |
| `git push` báo 403 | Sai GitHub account hoặc PAT hết hạn | `git remote -v` check, dùng SSH key hoặc PAT mới |
| `warning: in the working copy ... LF will be replaced by CRLF` | Windows core.autocrlf | Không phải lỗi; có thể `git config core.autocrlf false` cho repo |
| Vercel build fail "module not found" | `npm ci` trước build | Verify `package-lock.json` đã commit, retry deploy |
| Login → logout vòng lặp | Cookie không persistent (HTTP chứ không HTTPS) | Production phải có HTTPS; cookie có `secure:true` |
| Smoke test F1 demo login lỗi | Thiếu `AUTH_SECRET` (production yêu cầu set) | Set env Sensitive, redeploy |

### 9.2. Rollback Supabase migration

Migration `app_*` (0002–0005) **không** ảnh hưởng schema `0001`. Drop riêng bảng `app_*` an toàn:

```sql
-- Drop 1 phase tại 1 thời điểm để giữ data các phase khác
drop table if exists public.app_usage_events cascade;      -- 0005
drop table if exists public.app_scan_results cascade;      -- 0004
drop table if exists public.app_scan_jobs cascade;         -- 0004
drop table if exists public.app_user_api_keys cascade;     -- 0003
drop table if exists public.app_saved_leads cascade;       -- 0002
```

Sau khi drop, app fallback in-memory cho feature tương ứng.

### 9.3. Rollback deploy Vercel

Vercel → Project → **Deployments** → chọn deploy trước commit lỗi → **Promote to Production**.

### 9.4. Rotate `APP_ENCRYPTION_KEY`

1. Báo trước user (qua email/Slack) sẽ phải lưu lại API key.
2. Đổi `APP_ENCRYPTION_KEY` ở Vercel env Sensitive → Redeploy.
3. User vào `/settings` → API Keys → bấm Xóa key cũ → Lưu key mới.
4. Server fallback (env `HUNTER_API_KEY`/`SERPAPI_API_KEY`) vẫn chạy nếu owner đã set.

### 9.5. Rotate `SUPABASE_SERVICE_ROLE_KEY`

1. Supabase Dashboard → Settings → API → **Reset service_role key**.
2. Copy key mới → cập nhật Vercel env Sensitive → Redeploy.
3. Verify `/api/health/supabase` → `ok:true`.

### 9.6. Rotate `AUTH_SECRET`

Đổi → tất cả demo session cookie hiện hữu invalid → user demo phải login lại. Supabase Auth session không bị ảnh hưởng (do Supabase quản lý cookie riêng).

---

## 10. Go / no-go checklist cho private beta

Trước khi mời tester đầu tiên, **TẤT CẢ** ô dưới phải tick.

### 10.1. Code & build

- [ ] `git status -sb` → clean, không file uncommitted
- [ ] `npm run lint` → PASS (no output)
- [ ] `npm run build` → PASS (24+ dynamic routes)
- [ ] `git diff --check` → no whitespace errors (warning CRLF OK)
- [ ] Latest commit là **HEAD đã được audit** (Phase 09J/09K PASS)

### 10.2. Secret hygiene

- [ ] `git ls-files | grep -i "^\.env"` chỉ ra `.env.example`
- [ ] `git log --all -p | rg "(HUNTER|SERPAPI|SUPABASE_SERVICE|APP_ENCRYPTION)_KEY\s*=\s*[A-Za-z0-9]"` không match
- [ ] `process.env.{secret}` chỉ ở 5 server file: `supabase/{env,admin}.ts`, `api-keys/{crypto,repository}.ts`, `discovery/serpapi-provider.ts`, `scan/hunter-provider.ts`
- [ ] `console.log/warn/error` trong `src/` = 0 hit
- [ ] Vercel env có `SUPABASE_SERVICE_ROLE_KEY` đánh dấu **Sensitive**
- [ ] Vercel env có `APP_ENCRYPTION_KEY` đánh dấu **Sensitive**

### 10.3. Supabase

- [ ] Project provisioned, region phù hợp
- [ ] 5 migrations 0001–0005 apply OK, verify Database → Tables
- [ ] `/api/health/supabase` từ production URL → `{"ok":true}`
- [ ] `app_*` tables RLS enabled (kiểm `Database → Policies` thấy "no policies, RLS enabled")

### 10.4. Smoke test live

- [ ] F1 demo login OK
- [ ] F3 + F3a save/delete API key OK
- [ ] F4 + F7 mock providers OK
- [ ] F5 + F8 missing key trả 503 (không tiêu quota)
- [ ] F10 + F10a save leads + duplicate OK
- [ ] F11 + F11a + F11b leads list/delete/CSV OK
- [ ] F12 + F13 history → jobId OK
- [ ] F14 usage summary OK
- [ ] (Optional) F6 + F9 live providers với 1 search mỗi loại

### 10.5. Tester communication

- [ ] Channel báo lỗi sẵn sàng (Slack/email/Discord)
- [ ] Link `/login` + demo credentials gửi tester
- [ ] Link [`PRIVATE_BETA_CHECKLIST.md`](./PRIVATE_BETA_CHECKLIST.md) gửi tester
- [ ] Ghi rõ "private beta, dữ liệu có thể reset, không dùng cho khách hàng thật"
- [ ] Owner standby ≥4h sau khi mời tester đầu

### 10.6. Decision

- [ ] **GO** — tất cả ô tick → mời tester
- [ ] **NO-GO** — bất kỳ ô fail → log lỗi, hoãn, fix, audit lại

---

## 11. Sau private beta

Phase 10 candidates (xem [`ROADMAP.md`](./ROADMAP.md)):

- Disable demo HMAC fallback, ép Supabase Auth cho production.
- Migrate `app_*.user_id` từ `text` sang `uuid` FK `auth.users`.
- Billing/quota enforcement theo `app_usage_events`.
- Background queue cho Hunter scan (cancel/retry/SSE progress).
- Dashboard analytics thật.
- KMS-backed `APP_ENCRYPTION_KEY` rotation.
- Audit log production (`audit_logs` từ 0001).
- Stripe webhook + subscription tier.
- Production monitoring (Sentry, log retention).
- Backup/restore Supabase định kỳ.

Khi nào cần phase nào — tham khảo [`ROADMAP.md`](./ROADMAP.md) và feedback tester.
