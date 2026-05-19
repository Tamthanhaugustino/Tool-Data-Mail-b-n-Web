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
Phase 08C Domain Scan backend   ████████████████████  DONE
Phase 09A Hunter provider       ████████████████████  DONE (quota-safe)
Phase 09B Hunter live + polish  ████████████████████  DONE
Phase 09C Saved Leads foundation ████████████████████  DONE
Phase 09D Saved Leads Supabase    ████████████████████  DONE (app_saved_leads + fallback)
Phase 09E Supabase Auth hybrid     ████████████████████  DONE (Supabase-first + demo fallback)
Phase 09F User API Keys            ████████████████████  DONE (encrypted keys + env fallback)
Phase 09G Scan Jobs persistence    ████████████████████  DONE (jobs/results + fallback)
Phase 09H Quota usage foundation   ░░░░░░░░░░░░░░░░░░░░
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

## Phase 08C — Domain Scan backend foundation — DONE

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

## Phase 09A — Hunter real provider (quota-safe) — DONE

**Mục tiêu:** Thêm Hunter.io Domain Search provider cho `/scan` theo hướng quota-safe, server-only, không lộ API key. Giữ mock provider làm default. Đối xứng cấu trúc với Phase 08A SerpAPI.

**Đã làm:**

- [x] [`src/lib/scan/hunter-provider.ts`](../src/lib/scan/hunter-provider.ts) — `import "server-only"`, fetch `https://api.hunter.io/v2/domain-search` sequential per-domain, timeout 10s, no retry, `HunterProviderError` với 7 codes mirror `SerpapiProviderError`
- [x] [`src/app/api/scan/domain/route.ts`](../src/app/api/scan/domain/route.ts) — accept `provider` body, `resolveProvider()` theo body → env (`SCAN_PROVIDER`) → mock, **dynamic import** Hunter module, return `503 provider_unavailable` (không silent fallback) khi `HUNTER_API_KEY` thiếu, sanitize `api_key=...`, lower limits cho hunter (MAX_DOMAINS=5, MAX_EMAIL_LIMIT=10), map `HunterProviderError.code` → HTTP status (429/502/503/504)
- [x] [`src/components/scan/domain-scan-wizard.tsx`](../src/components/scan/domain-scan-wizard.tsx) — Provider Select (Mock / Hunter.io), warning amber panel khi chọn Hunter, dynamic limit chips và domain cap theo provider, auto-clamp limit khi switch sang Hunter, send `provider` trong body, `ERROR_HINTS` Vietnamese cho 7 codes
- [x] `.env.example` — thêm `SCAN_PROVIDER`, `HUNTER_API_KEY` (server-only) với comment cảnh báo
- [x] [`docs/SCAN.md`](./SCAN.md) — section §5b resolution + quota-safe rules + env vars + Hunter status mapping + live test steps + troubleshooting table 7 mã code

**Quota-safe đảm bảo:**

- Sequential fetch per-domain, max 5 domain/request → 1 lần bấm = tối đa 5 Hunter searches.
- Timeout 10s qua AbortController per-domain.
- Không auto-retry.
- Hard-stop trên invalid_key/rate_limited (abort batch ngay).
- Soft error per-domain ghi vào `domains[].error`, không abort.
- Không silent fallback `hunter → mock` khi key thiếu.
- Mock deployment không bundle code Hunter (dynamic import).
- Error sanitize 2 lớp mask `api_key=`, URL, JWT.

**Chưa làm (deferred):**

- [ ] Live test với key Hunter thật trong repo này (không có key).
- [ ] User-scoped Hunter key từ `user_api_keys` (cần Supabase Auth + RLS).
- [ ] Quota counter / rate limit per user.
- [ ] Persist `scan_jobs` / `scan_results` vào DB.
- [ ] Saved Leads API thật.

**Deliverable:** Owner điền `HUNTER_API_KEY` vào `.env.local`, set `SCAN_PROVIDER=hunter` (hoặc chọn Hunter trong UI), nhập 1–5 domain thật → 1 SERP request/domain → email thật từ Hunter Domain Search. Quota tối đa 5/lần bấm.

**Phụ thuộc:** Phase 08C.

---

## Phase 09B — Hunter live smoke test + UX polish — DONE

**Mục tiêu:** Polish UX để live test Hunter thật quota-safe, hiển thị per-domain partial-success/error, hướng dẫn owner 1-domain test path mà không leak key. Đối xứng cấu trúc với Phase 08B SerpAPI live polish.

**Đã làm:**

- [x] Polish Hunter warning copy trong `domain-scan-wizard.tsx`: thêm khuyến nghị "test 1 domain trước", live cap warning khi `normalizedPreview.domains.length > 5` (hiển thị ngay ở Input/Preview, không cần submit để biết)
- [x] Tách per-domain `errorDomains` vs `emptyDomains` trong Results: red alert riêng cho domain bị provider trả lỗi (kèm `domains[].error` chi tiết, max 5 dòng), giúp owner thấy chính xác domain nào tiêu quota mà fail
- [x] Smoke test regression 3 path (mock 200, hunter missing-key 503, invalid provider 400) — UX polish không phá luồng cũ
- [x] [`docs/SCAN.md §5b`](./SCAN.md) — section "Khuyến nghị Phase 09B" với 4 quy tắc vàng (1 domain trước, ≤5 max, domain sạch, không retry on hard error)
- [x] [`docs/SCAN.md §9`](./SCAN.md) — Phase 09B test record với 3 regression path

**Chưa làm (deferred):**

- [ ] Live test với Hunter key thật (repo không có key — owner tự test theo §5b 1-domain path)
- [ ] Confidence/status badge visual polish nếu cần sau khi owner test thật
- [ ] User-scoped Hunter key, quota counter, DB persistence — Phase 10+

**Deliverable:** Owner mở `/scan` chọn Hunter → thấy warning rõ ràng + khuyến nghị 1-domain + cap UI live → test 1 domain → nếu OK thì tăng dần. Error path phân biệt được "domain không có email" (empty) vs "domain bị Hunter trả lỗi" (error) — đủ thông tin để debug.

**Phụ thuộc:** Phase 09A.

---

## Phase 09C — Saved Leads web foundation — DONE

**Mục tiêu:** Bật lưu lead từ Domain Scan, trang `/leads` dùng được, foundation không phụ thuộc Supabase DB.

**Đã làm:**

- [x] [`src/lib/leads/*`](../src/lib/leads/) — types, in-memory store (`globalThis` Map per `session.id`), validate, CSV export, error sanitize
- [x] [`GET/POST /api/leads`](../src/app/api/leads/route.ts) + [`DELETE /api/leads/[id]`](../src/app/api/leads/[id]/route.ts) — session-gated, dedupe email+domain, max 100/request
- [x] [`domain-scan-wizard.tsx`](../src/components/scan/domain-scan-wizard.tsx) — nút **Lưu lead đã chọn** wire API, feedback success/duplicate/error
- [x] [`leads-content.tsx`](../src/app/leads/leads-content.tsx) — list, search, delete, export CSV, empty state tiếng Việt, banner demo in-memory
- [x] [`docs/SAVED_LEADS.md`](./SAVED_LEADS.md) — API, giới hạn, luồng UI

**Chưa làm (chuyển 09D+):**

- [ ] Supabase persist (→ Phase 09D)
- [ ] CRM fields (tags, notes, pipeline status)
- [ ] Lưu từ `/results` / Keyword Discovery
- [ ] Export JSON production / signed URL

**Deliverable:** User scan → chọn lead → lưu → thấy trên `/leads` → xóa / CSV.

**Phụ thuộc:** Phase 09B.

---

## Phase 09D — Saved Leads Supabase persist — DONE

**Mục tiêu:** Ghi lead lên Supabase khi env sẵn sàng; giữ in-memory fallback khi chưa cấu hình hoặc chưa migrate.

**Đã làm:**

- [x] [`supabase/migrations/0002_app_saved_leads.sql`](../supabase/migrations/0002_app_saved_leads.sql) — `app_saved_leads`, unique `(user_id, email, domain)`, indexes
- [x] [`repository.ts`](../src/lib/leads/repository.ts) + [`supabase-store.ts`](../src/lib/leads/supabase-store.ts) — admin client server-only, probe bảng, fallback memory
- [x] API `GET/POST/DELETE` trả `storage` + `storageFallback`
- [x] UI `/leads` + Domain Scan save feedback theo backend
- [x] [`docs/SAVED_LEADS.md`](./SAVED_LEADS.md) — migration, env, fallback

**Chưa làm (deferred):**

- [ ] Map `user_id` → `auth.users` / workspace `saved_leads` (0001)
- [ ] RLS cho role `authenticated` (không chỉ service role)
- [ ] CRM fields, export JSON

**Deliverable:** Owner apply migration 0002 + service role env → lead survive restart. Thiếu env vẫn build/run với memory.

**Phụ thuộc:** Phase 09C, Phase 05–06 Supabase wiring.

---

## Phase 09E — Supabase Auth migration foundation — DONE

**Mục tiêu:** Chuẩn bị adapter auth Supabase-first mà không phá demo HMAC khi env/Auth chưa sẵn sàng.

**Đã làm:**

- [x] `Session.authProvider` để UI/API biết nguồn auth (`demo` hoặc `supabase`)
- [x] [`src/lib/auth/supabase-session.ts`](../src/lib/auth/supabase-session.ts) — map Supabase user metadata về session contract hiện tại
- [x] [`src/lib/auth/session.ts`](../src/lib/auth/session.ts) — `getSession()` ưu tiên Supabase Auth, fallback HMAC demo
- [x] [`src/lib/auth/actions.ts`](../src/lib/auth/actions.ts) — login thử Supabase trước, fallback demo; logout sign out cả Supabase + demo cookie
- [x] [`middleware.ts`](../middleware.ts) — route protection chấp nhận Supabase cookie hoặc demo cookie
- [x] Login/settings/docs ghi rõ trạng thái hybrid foundation

**Chưa làm (deferred):**

- [ ] Seed/tạo user thật trong Supabase Auth
- [ ] Đọc role/plan từ `profiles`/subscription thay vì metadata/default
- [ ] Bỏ demo HMAC fallback
- [ ] Migrate `app_saved_leads.user_id` demo text sang Supabase UUID nếu cần giữ dữ liệu cũ

**Deliverable:** App build/run khi thiếu Supabase env; khi có Supabase Auth cookie hợp lệ thì `Session.id = auth.users.id`; demo login vẫn hoạt động.

**Phụ thuộc:** Phase 09D, Supabase public env nếu muốn test Supabase Auth thật.

---

## Phase 09F — User API Keys foundation — DONE

**Mục tiêu:** Cho user lưu Hunter/SerpAPI key cá nhân an toàn, không lưu plaintext, vẫn giữ server env fallback.

**Đã làm:**

- [x] [`supabase/migrations/0003_app_user_api_keys.sql`](../supabase/migrations/0003_app_user_api_keys.sql) — `app_user_api_keys`, `user_id` text, `provider`, `key_ciphertext`, `key_hint`, unique `(user_id, provider)`, RLS on
- [x] [`src/lib/api-keys/crypto.ts`](../src/lib/api-keys/crypto.ts) — AES-256-GCM server-only, `APP_ENCRYPTION_KEY`
- [x] [`src/lib/api-keys/repository.ts`](../src/lib/api-keys/repository.ts) — list masked, encrypt upsert, scoped delete, decrypt for providers
- [x] API `GET/PUT /api/settings/api-keys`, `DELETE /api/settings/api-keys/[provider]`
- [x] Hunter/SerpAPI provider resolution: user key → server env fallback → provider_unavailable
- [x] Settings API Keys UI dùng masked status, không hiển thị plaintext
- [x] [`docs/API_KEYS.md`](./API_KEYS.md)

**Chưa làm (deferred):**

- [ ] Test connection riêng cho từng provider key
- [ ] Audit log cho thao tác save/delete key
- [ ] KMS/Vault managed key rotation

**Deliverable:** Thiếu `APP_ENCRYPTION_KEY` thì API không lưu key cá nhân; có env đầy đủ thì key được encrypt trước khi ghi DB.

**Phụ thuộc:** Phase 09E auth session, Supabase service role + migration 0003 nếu muốn persist.

---

## Phase 09G — Scan Jobs persistence — DONE

**Mục tiêu:** Persist Domain Scan jobs/results để `/history` và `/results?jobId=` đọc được dữ liệu thật, nhưng vẫn build/run khi Supabase chưa cấu hình.

**Đã làm:**

- [x] [`supabase/migrations/0004_app_scan_jobs.sql`](../supabase/migrations/0004_app_scan_jobs.sql) — `app_scan_jobs`, `app_scan_results`, indexes theo `user_id`, RLS on, không anon policy
- [x] [`src/lib/scan-jobs`](../src/lib/scan-jobs) — repository server-only, Supabase probe, memory fallback, sanitize error
- [x] `POST /api/scan/domain` tạo job/results sau scan; response giữ contract cũ và thêm `scanJobId`/`scanStorage`
- [x] API `GET /api/scan/jobs`, `GET /api/scan/jobs/[id]` scoped theo `session.id`
- [x] `/history` đọc jobs thật, có note fallback khi chưa Supabase/migration
- [x] `/results?jobId=<id>` đọc persisted results, vẫn giữ mock behavior khi không có `jobId`

**Chưa làm (deferred):**

- [ ] Background queue/worker, progress realtime, cancel job
- [ ] Persist Keyword Discovery history vào cùng model
- [ ] Delete/retry scan job
- [ ] Billing/quota enforcement

**Deliverable:** Domain Scan mock/Hunter vẫn chạy; nếu Supabase service role + migration 0004 sẵn sàng thì jobs/results bền vững, nếu thiếu thì fallback in-memory không crash.

**Phụ thuộc:** Phase 09E auth session, Phase 09F provider key resolution, Supabase service role + migration 0004 nếu muốn persist.

---

## Phase 09H — Quota and usage foundation

**Mục tiêu:** Ghi usage events tối thiểu để chuẩn bị billing/quota sau này, chưa enforce quota thật.

**Công việc dự kiến:**

- Migration `app_usage_events` hoặc `app_usage_counters`
- Helper `recordUsageEvent()` server-only, safe no-op nếu Supabase chưa cấu hình
- Ghi event nhẹ cho discovery, domain scan, saved lead, export CSV
- UI summary đơn giản nếu layout hiện tại phù hợp

**Deliverable:** Có dữ liệu usage foundation để Phase billing/quota dùng tiếp, nhưng không chặn user theo quota.

**Phụ thuộc:** Phase 09G persistence, Supabase service role nếu muốn persist.

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
| 2026-05-18 | Phase 08C done; Phase 09A in-progress — Hunter Domain Search provider, server-only + dynamic import, quota-safe (max 5 domain/request, 10s timeout/domain, sequential, no retry), env-gated, typed errors → HTTP status. Live test deferred cho owner (5 search/lần) |
| 2026-05-19 | Phase 09A done; Phase 09B in-progress — UX polish (1-domain test recommendation copy, live over-cap warning, per-domain error vs empty display). Regression smoke test 3 path OK. Live Hunter test vẫn deferred cho owner |
| 2026-05-19 | Phase 09B done; Phase 09C done — Saved Leads API (GET/POST/DELETE), in-memory store per session, `/leads` page, lưu từ Domain Scan Results, CSV export, `docs/SAVED_LEADS.md` |
| 2026-05-19 | Phase 09D done — `app_saved_leads` migration, Supabase repository + memory fallback, UI storage banners |
| 2026-05-19 | Phase 09E done — Supabase Auth hybrid foundation: `getSession()` Supabase-first, demo HMAC fallback, middleware accepts both |
| 2026-05-19 | Phase 09F done — encrypted `app_user_api_keys`, Settings API key UI, Hunter/SerpAPI user-key-first with env fallback |
| 2026-05-19 | Phase 09G done — persisted `app_scan_jobs`/`app_scan_results`, scan job APIs, `/history` real data, `/results?jobId=` |
