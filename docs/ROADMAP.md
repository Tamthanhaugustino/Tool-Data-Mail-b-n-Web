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
Phase 06  Supabase setup        ████████████████████  DONE
Phase 07  Discovery backend     ████████████████████  DONE
Phase 08A SerpAPI provider      ████████████████████  DONE (quota-safe)
Phase 08B SerpAPI live + polish ████████████████████  DONE
Phase 08C Domain Scan backend   ████████████████░░░░  CURRENT (mock + API + wizard)
Phase 09  Hunter / Auth migration   ░░░░░░░░░░░░░░░░░░░░
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

## Phase 06 — Supabase project setup + health check — DONE

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

## Phase 07 — Keyword Discovery backend foundation — DONE

**Mục tiêu:** Tách logic Keyword Discovery khỏi UI sớm: provider interface, API route nội bộ, validate input, sanitize error. Mock provider để demo UI mà không tiêu quota / không gọi external. Phase 08+ chỉ thay implementation.

**Đã làm:**

- [x] [`src/lib/discovery/types.ts`](../src/lib/discovery/types.ts) — `DiscoveryRequest/Response/Provider...` contract
- [x] [`src/lib/discovery/mock-provider.ts`](../src/lib/discovery/mock-provider.ts) — deterministic mock (FNV-1a hash), zero I/O, không consume quota
- [x] [`src/lib/discovery/index.ts`](../src/lib/discovery/index.ts) — `getDiscoveryProvider()` switch điểm cho Phase 08
- [x] [`src/app/api/discovery/keyword/route.ts`](../src/app/api/discovery/keyword/route.ts) — `POST /api/discovery/keyword`, manual `getSession()` (middleware exclude `/api/*`), validate keyword/country/limit, sanitize error, `cache-control: no-store`
- [x] [`src/app/discover/discover-content.tsx`](../src/app/discover/discover-content.tsx) — wire UI gọi API thật, hiển thị loading/error/provider badge/duration
- [x] [`docs/DISCOVERY.md`](./DISCOVERY.md) — endpoint, request/response, provider plug-in plan, swap path Phase 08

**Chưa làm (deferred):**

- [ ] Gọi SerpAPI thật
- [ ] Persist `discovery_runs` + `scan_results` vào DB (chờ Supabase Auth migration để FK xuống `auth.users` hợp lệ)
- [ ] Quota / rate limit
- [ ] Lịch sử run hiển thị ở `/history` (data còn in-memory ở client)
- [ ] Nút "Chuyển sang Domain Scan" thật

**Deliverable:** User đã login bấm tìm trên `/discover` → POST API → trả 10 kết quả mock có domain/company/title/snippet/confidence/status, không cần Supabase project. UI hiển thị provider + duration để dev biết đang dùng mock.

**Phụ thuộc:** Phase 03 (session check).

---

## Phase 08A — SerpAPI real provider (quota-safe) — DONE

**Mục tiêu:** Thêm SerpAPI provider cho Keyword Discovery theo hướng quota-safe, server-only, không lộ API key. Giữ mock provider làm default.

**Đã làm:**

- [x] [`src/lib/discovery/serpapi-provider.ts`](../src/lib/discovery/serpapi-provider.ts) — server-only (`import "server-only"`), fetch trực tiếp `https://serpapi.com/search.json`, timeout 10s, lọc mega-domain (facebook/youtube/linkedin…), dedupe theo hostname, confidence dựa trên `position`, không retry
- [x] [`src/app/api/discovery/keyword/route.ts`](../src/app/api/discovery/keyword/route.ts) — accept `provider` trong body, resolve theo body → env → mock, **dynamic import** SerpAPI module để mock deployment không bundle code SerpAPI, return `503 provider_unavailable` (không silent fallback) khi `SERPAPI_API_KEY` thiếu, sanitize `api_key=...` trong error
- [x] [`src/app/discover/discover-content.tsx`](../src/app/discover/discover-content.tsx) — thêm Provider Select (mock/serpapi), warning rõ ràng khi chọn SerpAPI, gửi `provider` trong body
- [x] `.env.example` — thêm `DISCOVERY_PROVIDER`, `SERPAPI_API_KEY` (server-only) với comment cảnh báo
- [x] [`docs/DISCOVERY.md`](./DISCOVERY.md) — section provider resolution + quota-safe rules + env vars + filter domain list

**Quota-safe đảm bảo:**

- 1 outbound fetch / discovery run, max 30 results / 1 request.
- Timeout 10s qua AbortController.
- Không auto-retry.
- Không silent fallback `serpapi → mock` khi key thiếu.
- Mock deployment không bundle code SerpAPI (dynamic import).
- Error sanitize mask `api_key=...`, URL, JWT.

**Chưa làm (deferred):**

- [ ] User-scoped SerpAPI key từ `user_api_keys` — Phase 09 (cần Supabase Auth).
- [ ] Quota counter / rate limit per user — Phase 09.
- [ ] Persist discovery runs vào DB — chờ Supabase Auth migration.
- [ ] Pagination / multi-page SerpAPI.

**Deliverable:** Owner điền `SERPAPI_API_KEY` vào `.env.local`, set `DISCOVERY_PROVIDER=serpapi` (hoặc chọn SerpAPI trong UI), bấm "Tìm website" → 1 SERP request → kết quả thật từ Google. Quota tiêu thụ tối đa 1 search / lần bấm.

**Phụ thuộc:** Phase 07.

---

## Phase 08B — SerpAPI live smoke test + provider UX polish — DONE

**Mục tiêu:** Polish error path SerpAPI (typed errors + UI hint friendly), smoke test 6 path offline, hướng dẫn owner tự bật live SerpAPI mà không leak key.

**Đã làm:**

- [x] [`SerpapiProviderError`](../src/lib/discovery/serpapi-provider.ts) class với code `missing_key | invalid_key | rate_limited | timeout | network | parse | upstream`; provider throw typed error thay vì raw string
- [x] Route map error code → HTTP status có ý nghĩa: 429 cho rate_limited, 502 cho invalid_key/network/parse/upstream, 503 cho missing_key, 504 cho timeout
- [x] UI `/discover` hiển thị badge `error` code + dòng `ERROR_HINTS[code]` tiếng Việt friendly
- [x] Smoke test 6 path offline (xem [`DISCOVERY.md §10`](./DISCOVERY.md#10-smoke-test-record-phase-08b-2026-05-18)):
      401 no-session, 200 mock happy, 503 missing-key, 400 invalid provider, 400 limit cap, 400 empty keyword
- [x] [`docs/DISCOVERY.md §7b`](./DISCOVERY.md): hướng dẫn 3 bước bật SerpAPI cho owner (`.env.local` → restart → UI test), bảng troubleshooting 6 mã code
- [x] Live SerpAPI test ghi rõ là deferred — repo không có key thật, owner tự test (1 search / lần)

**Chưa làm (Phase 08C):**

- [ ] User-scoped SerpAPI key từ `user_api_keys` (cần Supabase Auth)
- [ ] Quota counter / rate limit per user
- [ ] Persist runs vào DB

**Deliverable:** Error path đẹp và self-documenting. Owner có file `.env.local` cộng key thật → smoke test trong 3 phút theo §7b.

**Phụ thuộc:** Phase 08A.

---

## Phase 08C — Domain Scan backend foundation — CURRENT

**Mục tiêu:** Đối xứng với Phase 07: tách logic Domain Scan khỏi UI, provider interface, normalize/validate input, API route, mock provider để demo UI mà không tiêu quota / không gọi Hunter. Phase 09 chỉ thay implementation.

**Đã làm:**

- [x] [`src/lib/scan/types.ts`](../src/lib/scan/types.ts) — `ScanRequest/Response/Provider/...` contract đối xứng Discovery
- [x] [`src/lib/scan/domain-utils.ts`](../src/lib/scan/domain-utils.ts) — `normalizeDomain` + `normalizeDomains` (strip scheme/path/port/www, lowercase, regex validate, dedup, warning codes ổn định)
- [x] [`src/lib/scan/mock-provider.ts`](../src/lib/scan/mock-provider.ts) — deterministic mock theo FNV-1a hash, ~20% domain rỗng (test empty state), email format `<last>.<first>[N]@<domain>`, không I/O
- [x] [`src/lib/scan/index.ts`](../src/lib/scan/index.ts) — barrel re-export client-safe pieces
- [x] [`src/app/api/scan/domain/route.ts`](../src/app/api/scan/domain/route.ts) — `POST /api/scan/domain`, manual `getSession()`, normalize → dispatch, MAX_DOMAINS=50, MAX_EMAIL_LIMIT_MOCK=100, `provider: hunter` → 503 (chờ Phase 09), sanitize error
- [x] [`src/components/scan/domain-scan-wizard.tsx`](../src/components/scan/domain-scan-wizard.tsx) — wire 4-step Input→Preview→Scanning→Results gọi API thật; live preview normalize ở Input; warning list ở Preview; error display có `errorCode` + `ERROR_HINTS`; "Auto-save History" và "Upload CSV" disabled (Phase 09)
- [x] [`docs/SCAN.md`](./SCAN.md) — endpoint, normalize rules, provider plug-in plan, mapping với DB schema (Phase 04)

**Chưa làm (deferred):**

- [ ] Hunter real provider (Phase 09).
- [ ] Persist `scan_jobs` / `scan_results` vào DB.
- [ ] "Lưu Saved Leads" thật (Phase 09+).
- [ ] Export CSV/JSON (Phase 09+).
- [ ] Upload CSV input.
- [ ] User-scoped Hunter key từ `user_api_keys`.

**Deliverable:** User đã login từ `/discover` bấm "Chuyển sang Domain Scan" → `/scan` nhận domains qua query → wizard hiện preview normalize → bấm "Bắt đầu scan" → POST API → trả ~7-20 email mock + per-domain summary + warnings (nếu có). UI hiển thị summary rõ + lọc verified-only client-side. Không tiêu quota Hunter.

**Phụ thuộc:** Phase 03 (session check), Phase 07 (cùng pattern).

---

## Phase 09 — Hunter real provider *or* Supabase Auth migration

**Mục tiêu:** Owner chọn hướng tiếp theo.

**Nhánh A — Hunter real provider (đối xứng với Phase 08A SerpAPI):**

- Tạo `src/lib/scan/hunter-provider.ts` `import "server-only"`.
- Quota-safe: hard-cap 10 email/domain, timeout 10s, no retry.
- API key từ env `HUNTER_API_KEY` (Phase 09); user-scoped key (`user_api_keys`) sau khi có Supabase Auth.
- Dynamic import từ `route.ts`.
- Typed errors mirror `SerpapiProviderError`.

**Nhánh B — Supabase Auth migration:**

- Swap `src/lib/auth/*` sang Supabase Auth (giữ `Session` shape).
- Uncomment trigger `on_auth_user_created`.
- Bật persistence Discovery + Scan → DB.

**Deliverable:** Một trong hai nhánh hoàn tất.

**Phụ thuộc:** Phase 08C.

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
| 2026-05-18 | Phase 06 done; Phase 07 in-progress — discovery domain types + mock provider + `POST /api/discovery/keyword` + `/discover` wired. Không gọi external, không consume quota. Auth migration / SerpAPI deferred Phase 08 |
| 2026-05-18 | Phase 07 done; Phase 08A in-progress — SerpAPI real provider, server-only + dynamic import, quota-safe (1 req/run, 10s timeout, no retry), env-gated. Auth migration / Domain Scan deferred Phase 08B |
| 2026-05-18 | Phase 08A done; Phase 08B in-progress — SerpapiProviderError typed codes (6 mã) → route map HTTP status (429/502/503/504) → UI hiển thị Vietnamese hint. Offline smoke test 6 path đều OK. Live SerpAPI test deferred cho owner (1 search/lần) |
| 2026-05-18 | Phase 08B done; Phase 08C in-progress — Domain Scan backend foundation (src/lib/scan/* + POST /api/scan/domain + wired wizard). Mock-only, max 50 domains, không gọi Hunter. Phase 09 sẽ wire Hunter hoặc Supabase Auth |
