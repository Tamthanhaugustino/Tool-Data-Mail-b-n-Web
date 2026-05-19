# Private Beta Release Checklist — Phase 09K

> Trạng thái: **private beta ready** (hybrid auth + Supabase persistence + provider integration). Tài liệu này tổng hợp setup, test, limitations để owner/tester có thể tự triển khai.
>
> **Để deploy thật** (Vercel + Supabase + rotate key + rollback) xem [`PRODUCTION_DEPLOY_RUNBOOK.md`](./PRODUCTION_DEPLOY_RUNBOOK.md) — runbook bước-từng-bước cho owner. File này tập trung overview + test flows + limitations.

## 1. Status hiện tại

| Mảng | Trạng thái |
|---|---|
| Auth | Hybrid — Supabase Auth (nếu env) + demo HMAC fallback |
| Database | Supabase Postgres + 5 migrations (0001–0005); RLS enabled, service-role only |
| User API keys | Encrypted AES-256-GCM, ciphertext-only trong DB; fallback server env |
| Saved Leads | Supabase `app_saved_leads` + in-memory fallback |
| Domain Scan | Mock + Hunter.io real (quota-safe, max 5 domain/request) |
| Keyword Discovery | Mock + SerpAPI real (quota-safe, max 1 search/run) |
| Scan Jobs/Results | Persist `app_scan_jobs`/`app_scan_results` + fallback |
| Usage Events | `app_usage_events` foundation, best-effort writes (no enforcement) |
| Billing/Quota | **Chưa enforce** — chuẩn bị schema, chờ phase sau |
| Production deploy | **Chưa làm** — chỉ local/staging-ready |

Chi tiết phase: xem [`ROADMAP.md`](./ROADMAP.md).

## 2. Yêu cầu môi trường

### Local / staging

- Node.js 20+
- npm 10+
- Supabase project (cloud hoặc self-hosted) nếu muốn persistence thật
- SerpAPI / Hunter.io account nếu muốn test provider thật (optional cho beta)

### Production (private beta — sau khi self-host hoặc Vercel deploy)

- HTTPS (cookie session yêu cầu `secure=true` ngoài dev)
- Node.js runtime (route handler dùng `runtime: "nodejs"` cho `node:crypto`)
- Supabase cloud (free tier đủ cho private beta < 25 tester)
- Domain riêng (subdomain `app.tooldatamail.com` chẳng hạn)

## 3. Env vars checklist

Sao chép `.env.example` → `.env.local`:

| Biến | Bắt buộc | Mục đích |
|---|---|---|
| `AUTH_SECRET` | Production: ≥16 ký tự random | Ký HMAC cookie session (demo fallback). Dev có fallback insecure. |
| `NEXT_PUBLIC_SUPABASE_URL` | Khi muốn Supabase persistence | URL project. Safe ở browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Khi muốn Supabase persistence | Anon key. RLS protect. |
| `SUPABASE_SERVICE_ROLE_KEY` | Khi muốn persistence Saved Leads/API keys/Scan/Usage | **Server-only.** Bypass RLS. KHÔNG để prefix `NEXT_PUBLIC_*`. |
| `APP_ENCRYPTION_KEY` | Khi muốn lưu user API key cá nhân | Server-only ≥32 ký tự **random/high-entropy** (xem §4) |
| `HUNTER_API_KEY` | Optional | Server fallback nếu user chưa lưu key cá nhân |
| `SERPAPI_API_KEY` | Optional | Server fallback nếu user chưa lưu key cá nhân |
| `SCAN_PROVIDER` | Optional, default `mock` | `mock` hoặc `hunter` — provider mặc định khi UI không chỉ định |
| `DISCOVERY_PROVIDER` | Optional, default `mock` | `mock` hoặc `serpapi` |

> **Quy tắc vàng**: bất kỳ biến nào KHÔNG có prefix `NEXT_PUBLIC_` đều **không** được leak ra browser. Đừng paste service role key hay encryption key vào file client.

## 4. APP_ENCRYPTION_KEY — random/high-entropy guidance

`APP_ENCRYPTION_KEY` là **passphrase** cho AES-256-GCM. KDF là SHA-256, không salt → **entropy của passphrase = entropy thực của key**.

### KHÔNG dùng

- Password người-có-thể-đoán-được (`hello-world-1234567890123456789012`)
- Chuỗi lặp (`aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`)
- Tên project + năm (`tool-data-mail-2026-private-beta!!`)

### NÊN sinh bằng

```bash
# Mỗi lệnh sinh 64 ký tự hex (256 bit entropy). Chỉ chạy 1 lần.
openssl rand -hex 32

# Hoặc Node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Hoặc Python
python -c "import secrets; print(secrets.token_hex(32))"
```

Paste vào `.env.local`:

```
APP_ENCRYPTION_KEY=<output-64-hex-chars>
```

### Rotation

**Chưa hỗ trợ rotate tự động.** Đổi giá trị `APP_ENCRYPTION_KEY` sau khi đã có user key → tất cả ciphertext cũ decrypt fail → user phải xóa key cũ + lưu lại. Chấp nhận được cho private beta vì user pool nhỏ. Sẽ làm versioned KMS rotation ở phase sau.

## 5. Supabase migration checklist

Vào Supabase Studio → SQL Editor → chạy theo thứ tự (apply 1 lần):

| # | File | Bảng/đối tượng tạo | Cần thiết khi |
|---|---|---|---|
| 1 | `supabase/migrations/0001_initial_schema.sql` | Workspace-scoped tables (profiles, workspaces, memberships, …) + enums + helper functions | Chuẩn bị schema dài hạn; chưa wire active |
| 2 | `supabase/migrations/0002_app_saved_leads.sql` | `app_saved_leads` | Persist Saved Leads (Phase 09D) |
| 3 | `supabase/migrations/0003_app_user_api_keys.sql` | `app_user_api_keys` | Lưu user API key encrypted (Phase 09F) |
| 4 | `supabase/migrations/0004_app_scan_jobs.sql` | `app_scan_jobs`, `app_scan_results` | History `/history` + `/results?jobId=` (Phase 09G) |
| 5 | `supabase/migrations/0005_app_usage_events.sql` | `app_usage_events` | Usage tracking foundation (Phase 09H) |

Verify ở Supabase Dashboard → Database → Tables.

> Migration `0001` chứa workspace-scoped tables sẽ dùng sau khi swap toàn bộ sang Supabase Auth. Phase 09 series hiện dùng các bảng `app_*` (tách riêng, `user_id text`) để bridge hybrid auth.

### Re-apply

Tất cả migrations đều idempotent (`create if not exists`, `create or replace`, `drop trigger if exists`). Có thể chạy lại an toàn.

## 6. Test flows

Login → demo `trang.nguyen@vietsoftware.com.vn` / `demo123` (user) hoặc `admin@tooldatamail.dev` / `admin123` (admin), hoặc Supabase Auth nếu đã seed.

### F1 — Auth demo

1. `/login` → nhập credentials demo.
2. **Pass**: redirect `/dashboard`, topbar hiện tên + plan PRO.
3. Logout: dropdown topbar → Đăng xuất → `/login`.

### F2 — Auth Supabase (nếu seed)

1. Tạo user Supabase Auth (Dashboard → Authentication → Add user) với cùng email demo.
2. Login bằng password Supabase.
3. **Pass**: `getSession()` trả về user Supabase, không fallback demo.

### F3 — Settings · API Keys

1. `/settings` → tab **API Keys** (nếu UI mở).
2. Lưu Hunter key: gọi `PUT /api/settings/api-keys` qua UI → success → `keyHint: ****abcd`, `hasUserKey: true`.
3. Lưu key 15 ký tự → **Pass**: API trả 400 `invalid_input` "≥16 ký tự".
4. Thiếu `APP_ENCRYPTION_KEY` env → save trả 409 `api_key_encryption_not_configured`, **không** ghi DB.
5. Xóa key: `DELETE /api/settings/api-keys/hunter` → `{ok: true}` → status lại `hasUserKey: false`.

### F4 — Keyword Discovery — mock

1. `/discover` → Provider = Mock → keyword "marketing agency" → bấm Tìm website.
2. **Pass**: HTTP 200, badge `provider: mock`, ~10 result, snippet ghi "mock provider, không gọi SerpAPI".

### F5 — Keyword Discovery — SerpAPI missing key

1. Provider = SerpAPI, **không** set `SERPAPI_API_KEY` server + user chưa lưu key.
2. **Pass**: HTTP 503 `provider_unavailable`, UI hint "Lưu SerpAPI key cá nhân trong Settings hoặc set SERPAPI_API_KEY".

### F6 — Keyword Discovery — SerpAPI user key

1. Lưu SerpAPI key cá nhân ở Settings.
2. Provider = SerpAPI, keyword "marketing agency".
3. **Pass**: 1 SerpAPI search thật, ~10 domain thật, badge `provider: serpapi`.

### F7 — Domain Scan — mock

1. `/scan` → Provider Mock → nhập 1–3 domain → Tiếp tục Preview → Bắt đầu scan.
2. **Pass**: HTTP 200, results table có email mock, `scanJobId` xuất hiện, link "xem lại run này" → `/results?jobId=<id>`.

### F8 — Domain Scan — Hunter missing key

1. Provider Hunter, không set `HUNTER_API_KEY` + chưa lưu user key.
2. **Pass**: HTTP 503 `provider_unavailable`, không tiêu quota Hunter.

### F9 — Domain Scan — Hunter live (1 domain)

1. Lưu Hunter key cá nhân ở Settings (hoặc set env).
2. Provider Hunter → **1 domain** (vd `stripe.com`) → limit 5–10.
3. **Pass**: 1 Hunter search, ~3–10 email thật, `provider: hunter` badge, durationMs ~500–3000ms.

### F10 — Save selected leads

1. Sau khi scan xong (F7/F9), tick một số dòng → "Lưu lead đã chọn".
2. **Pass**: Alert "Đã lưu N lead." kèm link "Xem Saved Leads →".
3. Bấm lưu lại lần 2 với cùng row → "N lead đã tồn tại (trùng email + domain, bỏ qua)".

### F11 — Saved Leads list / search / delete / CSV

1. `/leads` → bảng có lead vừa lưu.
2. Search "stripe" → filter live.
3. Tải CSV → file `saved-leads-<date>.csv`, mở Excel/LibreOffice OK.
4. Bấm trash 1 lần → button đổi "Xác nhận xóa" (5s).
5. Bấm lần 2 → DELETE, row biến mất.
6. Không xác nhận trong 5s → tự revert về trash icon.

### F12 — Scan History

1. `/history` → bảng các run đã chạy theo `session.id`.
2. **Pass**: storage banner đúng (Supabase / memory fallback), mỗi row có link "Xem" → `/results?jobId=<id>`.
3. Trường hợp empty: CTA "Mở Domain Scan".

### F13 — Results by jobId

1. Từ `/history` bấm Xem → `/results?jobId=<id>`.
2. **Pass**: subtitle có totalEmails/scannedDomains/provider/durationMs, results table render đúng, banner storage hiển thị.

### F14 — Usage summary

```bash
curl -sS -b "tdm_session=<cookie>" http://localhost:3000/api/usage/summary?days=30
```

- **Pass khi Supabase ready**: trả `{days: 30, totals: [...6 event types...], usageStorage: "supabase"}`.
- **Pass khi không**: totals = 0, `usageStorage: "none"`, `usageStorageReason: "not_configured" | "table_missing"`.

## 7. Expected results / pass criteria

- Tất cả 14 test flow trên trả đúng status code + body.
- `npm run lint` không output lỗi.
- `npm run build` build 23+ routes, middleware OK.
- `curl /api/health/supabase` trả `ok: true` khi đã apply migrations.
- Không có lỗi runtime trong console server log (`npm run dev`) khi test theo thứ tự trên.

## 8. Known limitations (private beta)

| # | Hạn chế | Workaround |
|---|---|---|
| L1 | Auth còn hybrid demo HMAC + Supabase | Cho phép cả hai; production nên seed Supabase users sớm |
| L2 | `user_id text` ở `app_*` tables không FK xuống `auth.users` | Đảm bảo consistency ở app layer; sẽ migrate Phase 10+ |
| L3 | Billing/quota chưa enforce | User có thể spam endpoint; usage chỉ analytics |
| L4 | Usage có thể overcount provider error path (Hunter/SerpAPI `missing_key`/`invalid_key`) | Filter `metadata.status` khi đọc summary |
| L5 | Dashboard stats + sidebar quota box còn dùng `MOCK_STATS` | Đã gắn nhãn `demo` Phase 09I; thay bằng real data ở phase sau |
| L6 | CSV export là client-only (Blob) → không ghi `csv_export` usage event | Chấp nhận; khi tách server export sẽ wire |
| L7 | Không có background queue / cancel / retry cho scan | Synchronous run; max 5 domain Hunter/request |
| L8 | `APP_ENCRYPTION_KEY` rotation chỉ thủ công (decrypt fail → xóa key cũ) | Acceptable cho beta < 25 tester |
| L9 | Probe table-missing cache 30s; probe-OK không reset trong process | Restart server nếu drop bảng giữa session |
| L10 | "Lọc", "Upload CSV", "Lưu vào Saved Leads" trong ResultsTable là placeholder disabled | Tooltip đã giải thích |

## 9. Troubleshooting

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `npm run build` báo lỗi env | Mặc định build không cần env Supabase; lỗi khác → đọc full output | Đảm bảo Node 20+ |
| `curl /api/health/supabase` → `configured: false` | Thiếu `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` / `SERVICE_ROLE_KEY` | Điền `.env.local`, restart dev |
| `503 provider_unavailable` khi POST `/api/scan/domain` provider=hunter | Thiếu `HUNTER_API_KEY` env + user chưa lưu key | Lưu key Settings hoặc set env |
| `409 api_key_encryption_not_configured` khi PUT `/api/settings/api-keys` | Thiếu `APP_ENCRYPTION_KEY` | Sinh + điền `.env.local`, restart dev |
| `409 provider_key_unreadable` | `APP_ENCRYPTION_KEY` đã đổi → ciphertext cũ decrypt fail | Xóa user key cũ, lưu lại |
| `/history` báo "Đang dùng in-memory fallback vì chưa có migration" | Chưa apply `0004_app_scan_jobs.sql` | Chạy migration trong SQL Editor |
| `git push` báo 403 hoặc credential prompt | Sai account hoặc thiếu remote PAT | `git remote -v` verify, dùng SSH hoặc PAT cá nhân |
| `warning: in the working copy of '…', LF will be replaced by CRLF` | Windows core.autocrlf | Không phải lỗi; có thể set `git config core.autocrlf false` nếu muốn LF |
| `curl /api/scan/jobs/<id>` trả 404 | jobId không tồn tại hoặc thuộc user khác | Verify session.id, check id trong `app_scan_jobs` |

## 10. Release sign-off checklist

Trước khi cho tester đầu tiên, owner tự verify:

### Code / build

- [ ] `git status -sb` → clean (đã commit hết)
- [ ] `npm run lint` → no output
- [ ] `npm run build` → 23+ routes + middleware build OK
- [ ] `git diff --check` → no whitespace errors

### Secret scan (manual)

- [ ] `.env.local` **không** commit (`.gitignore` đã chặn)
- [ ] Không file `.env*` thật trong git
- [ ] `git log --all -p | rg "(HUNTER|SERPAPI|SUPABASE_SERVICE|APP_ENCRYPTION)_KEY\s*=\s*[A-Za-z0-9]" | head` → không match
- [ ] `process.env.{secret}` chỉ trong 5 server file: `supabase/{env,admin}.ts`, `api-keys/{crypto,repository}.ts`, `discovery/serpapi-provider.ts`, `scan/hunter-provider.ts`
- [ ] `console.log/warn/error` trong `src/` → 0 hit
- [ ] `key_ciphertext` chỉ trong `api-keys/{repository,crypto}.ts`

### Supabase setup

- [ ] Project provisioned (region phù hợp địa lý tester)
- [ ] 5 migrations 0001–0005 đã apply, verify ở Database → Tables
- [ ] Service role key đã copy vào `SUPABASE_SERVICE_ROLE_KEY` server env (không phải `NEXT_PUBLIC_*`)
- [ ] `curl /api/health/supabase` → `{ok: true}` từ máy chạy server

### Manual test

- [ ] F1 demo login OK
- [ ] F3 lưu/xóa API key OK
- [ ] F4 + F7 mock providers OK
- [ ] F5 + F8 missing key trả 503 đúng, không tiêu quota
- [ ] (Optional) F6 + F9 live providers với 1–2 request
- [ ] F10 + F11 save/list/search/delete/CSV leads OK
- [ ] F12 + F13 history → jobId OK
- [ ] F14 usage summary OK

### Communication tester

- [ ] Gửi tester link `/login` + credentials demo (hoặc Supabase Auth signup link)
- [ ] Gửi tester link tài liệu này
- [ ] Ghi rõ "private beta, dữ liệu có thể reset, không dùng cho khách hàng thật"
- [ ] Setup channel báo lỗi (email/Slack/Discord)

## 11. Sau private beta — Phase 10+ candidates

- Disable demo HMAC fallback, ép Supabase Auth.
- Migrate `app_*.user_id` từ text sang uuid (FK auth.users).
- Billing/quota enforcement theo `app_usage_events` totals.
- Background queue cho Hunter scan (cancel/retry).
- CSV export server-side với usage tracking.
- Real dashboard analytics từ `app_usage_events` + `app_scan_jobs` + `app_saved_leads`.
- KMS-backed key rotation cho `APP_ENCRYPTION_KEY`.
- Audit log production (bảng `audit_logs` từ 0001 đã có schema).
- Stripe webhook + subscription tier.

Khi nào cần phase nào — tham khảo [`ROADMAP.md`](./ROADMAP.md).
