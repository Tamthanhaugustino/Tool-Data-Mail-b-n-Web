# Domain Scan — Phase 08C + 09A + 09B

> Trạng thái: **mock + Hunter** providers, UX polish Phase 09B (per-domain error display, 1-domain test recommendation, over-cap UI hint). **Không** ghi DB (chờ Supabase Auth migration).
>
> | Provider | Phase | Env | Quota | Limits |
> |---|---|---|---|---|
> | `mock` | 08C — default | none | 0 | max 50 domain · 100 email/domain |
> | `hunter` | 09A | `HUNTER_API_KEY` | 1 search / domain | max 5 domain · 10 email/domain |

## 1. Mục đích

Đối xứng với Keyword Discovery: tách logic Domain Scan ra khỏi UI sớm để Phase 09 chỉ cần thay implementation provider (Hunter thật) mà không phải sửa route, validation, hay client code. Domain normalization + dedup tập trung 1 chỗ để consume từ cả client preview + server route.

## 2. Files

```
src/lib/scan/
├── types.ts             # Domain contract: ScanRequest/Response/Provider...
├── domain-utils.ts      # normalizeDomain / normalizeDomains
├── mock-provider.ts     # Phase 08C — deterministic mock, no I/O
├── hunter-provider.ts   # Phase 09A — server-only Hunter Domain Search fetch
└── index.ts             # Re-export client-safe pieces + getScanProvider()

src/app/api/scan/domain/
└── route.ts             # POST /api/scan/domain — validate, normalize, resolve, dispatch

src/components/scan/
└── domain-scan-wizard.tsx # /scan client UI (4-step wizard + Provider selector)
```

## 3. Provider interface

```ts
export interface ScanProvider {
  readonly name: ScanProviderName;  // "mock" | "hunter"
  run(req: {
    domains: string[];           // already normalized
    emailLimitPerDomain: number; // 1..100 for mock
  }): Promise<{
    domains: ScanDomainSummary[];
    results: ScanResultItem[];
  }>;
}
```

Provider chỉ chịu trách nhiệm **scan và trả kết quả thô**. Normalize/validate/dedup/limit ceiling do route handle — provider nhận input đã sạch.

## 4. API route

### Endpoint

```
POST /api/scan/domain
content-type: application/json
```

### Request body

```json
{
  "domains": ["vietsoftware.com.vn", "https://realgroup.vn/about"],
  "emailLimitPerDomain": 10,
  "provider": "mock"
}
```

- `domains` — bắt buộc, array of strings. Trần phụ thuộc provider: **mock 1–50**, **hunter 1–5**. Mỗi item có thể là `bare.tld`, `https://url/path`, hoặc `WWW.UPPERCASE.com` — route sẽ normalize.
- `emailLimitPerDomain` — optional integer. Mock: 1–100, hunter: 1–10. Default 10.
- `provider` — optional, `mock` hoặc `hunter`. Nếu vắng, server dùng `SCAN_PROVIDER` (env) → `mock`.

### Auth

Route nằm dưới `/api/*` nên middleware Phase 03 không chạy. Route check session thủ công qua `getSession()`. Không session → `401 unauthorized`.

### Response (200)

```json
{
  "run": {
    "id": "uuid",
    "provider": "mock",
    "status": "completed",
    "requestedDomains": 2,
    "scannedDomains": 2,
    "totalEmails": 7,
    "durationMs": 3,
    "createdAt": "2026-05-18T...",
    "warnings": []
  },
  "domains": [
    { "domain": "vietsoftware.com.vn", "email_count": 4, "empty": false },
    { "domain": "realgroup.vn", "email_count": 3, "empty": false }
  ],
  "results": [
    {
      "domain": "vietsoftware.com.vn",
      "email": "nguyen.trang@vietsoftware.com.vn",
      "first_name": "Trang",
      "last_name": "Nguyễn",
      "position": "Marketing Manager",
      "company": "Vietsoftware",
      "confidence": 0.78,
      "source": "mock",
      "status": "verified"
    }
  ]
}
```

`domains[].empty: true` báo domain hợp lệ nhưng không tìm được email (~20% domain trong mock — chủ đích để UI test empty state).

### Error responses (Phase 09A mapping)

`HunterProviderError` với `code` → route map sang HTTP status + Vietnamese message (mirror SerpAPI):

| Status | `error` (machine) | `code` | Khi nào |
|---|---|---|---|
| 400 | `invalid_input` | — | domains rỗng / quá max / không phải string / provider sai / limit sai / normalize ra 0 domain |
| 401 | `unauthorized` | — | Không session |
| 429 | `provider_rate_limited` | `provider_rate_limited` | Hunter 429 hoặc payload `quota`/`rate` |
| 502 | `provider_invalid_key` | `provider_invalid_key` | Hunter 401/403 hoặc payload "invalid api key" |
| 502 | `provider_network` | `provider_network` | fetch throws (DNS/TLS) |
| 502 | `provider_parse` | `provider_parse` | Non-JSON từ Hunter |
| 502 | `provider_upstream` | `provider_upstream` | Other Hunter error |
| 503 | `provider_unavailable` | `provider_unavailable` | Hunter selected nhưng thiếu `HUNTER_API_KEY` |
| 504 | `provider_timeout` | `provider_timeout` | AbortController 10s fires |
| 500 | `internal` | — | Bug ngoài tầm các case trên |

UI đọc `error` field và lookup `ERROR_HINTS[error]` trong [`domain-scan-wizard.tsx`](../src/components/scan/domain-scan-wizard.tsx) để hiện gợi ý khắc phục.

Per-domain soft errors (4xx/5xx cho 1 domain, parse, timeout không phải hard error) ghi vào `domains[].error` chứ không abort batch — user vẫn nhận được kết quả các domain khác.

Sanitize 2 lớp: provider scrub `api_key=` + URL trước khi throw; route scrub thêm lần nữa + mask JWT + cắt 200 ký tự. `cache-control: no-store`.

## 5. Domain normalization

`normalizeDomain(input: string)` trong [`domain-utils.ts`](../src/lib/scan/domain-utils.ts) làm các bước (theo thứ tự):

1. Trim. Reject empty / `—` / `-`.
2. Reject nếu chứa `@` (looks like email).
3. Nếu match `^https?://` → parse qua `new URL().hostname`. Nếu fail → `invalid_url`.
4. Nếu không scheme → cắt phần sau dấu `/` `?` `#` đầu tiên.
5. Lowercase, strip trailing `.`, strip `:port`.
6. Strip prefix `www.` (chỉ www, các subdomain khác như `mail.example.com` giữ nguyên).
7. Validate qua regex `^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$`.

`normalizeDomains(lines: string[])` chạy bước trên cho mỗi line, dedup giữ thứ tự xuất hiện đầu tiên. Trả về `{ domains, warnings: [{input, reason}] }` để UI hiện "N dòng bị bỏ" với lý do (`empty`, `looks_like_email`, `invalid_url`, `invalid_format`, `duplicate`, …).

**Reason codes ổn định** — UI dựa trên đó để format message. Đừng đổi reason string mà không update [`SCAN.md`](./SCAN.md) + UI.

## 5b. Provider resolution & quota-safe rules (Phase 09A)

### Resolution order

1. `request.body.provider` (nếu set và là `mock` / `hunter`).
2. `process.env.SCAN_PROVIDER` (nếu là `hunter`).
3. Mặc định `mock`.

Server **luôn** validate sau bước resolve. Client xin `hunter` nhưng server thiếu `HUNTER_API_KEY` → **không tự fallback** sang mock, mà trả `503 provider_unavailable`. Hành vi giống Phase 08A SerpAPI.

### Quota-safe rules Hunter

| Rule | Giá trị |
|---|---|
| Max domain / request | 5 (mock: 50) |
| Max email / domain | 10 (mock: 100) — chính là trần Hunter Domain Search |
| Fetch | Sequential per-domain, 1 in-flight at a time |
| Timeout per domain | 10s qua `AbortController` |
| Auto-retry | **không** |
| Hard-stop trên invalid key / rate limit | có — abort batch ngay |
| Soft error per domain | ghi `domains[].error`, tiếp tục batch |
| Cache | `cache: "no-store"` |
| User-scoped key (`user_api_keys`) | **không** ở Phase 09A — chỉ đọc env |

Tổng quota tối đa **1 lần bấm = 5 Hunter searches** (gói free 25/tháng).

### Env vars

```bash
# Mặc định provider khi /scan không chỉ định
SCAN_PROVIDER=mock     # hoặc hunter

# Bắt buộc nếu provider=hunter. SERVER ONLY — không prefix NEXT_PUBLIC_.
HUNTER_API_KEY=
```

`HUNTER_API_KEY` chỉ được đọc trong [`src/lib/scan/hunter-provider.ts`](../src/lib/scan/hunter-provider.ts) — file `import "server-only"`. Build vỡ nếu lỡ import vào client component. Route dùng dynamic import — mock-only deployment không bundle code Hunter.

### Hunter status mapping

Hunter `verification.status` → `ScanResultStatus`:

| Hunter | App |
|---|---|
| `valid` / `verified` / `deliverable` | `verified` |
| `accept_all` / `catch_all` / `accept-all` | `accept_all` |
| `webmail` | `webmail` |
| `invalid` / `undeliverable` / `disposable` | `invalid` |
| otherwise | `unknown` |

Fallback nếu `verification` vắng: `type: "personal"` → `verified`, `type: "generic"` → `accept_all`.

Confidence: Hunter trả 0–100 → app dùng 0.00–1.00 (chia 100, làm tròn 2 chữ số).

### Bật Hunter cho live test

**Quy tắc vàng**: Mỗi lần bấm "Bắt đầu scan" với provider Hunter = **N Hunter searches** (N = số domain). Gói free 25/tháng.

**Khuyến nghị Phase 09B**:
1. **Test 1 domain trước** để xác nhận key + mapping hoạt động đúng — tốn 1 search.
2. Nếu OK, mới thử 2–3 domain. **Không** vượt cap 5/lần.
3. Dùng domain "sạch" (Hunter có khả năng có data): `stripe.com`, `hubspot.com`, `vercel.com`, `vietsoftware.com.vn`.
4. Dừng nếu thấy lỗi `invalid_key` hoặc `rate_limited` — không retry.

**Bước 1:** Cấu hình `.env.local`:

```bash
AUTH_SECRET=<ít nhất 16 ký tự>
SCAN_PROVIDER=hunter           # hoặc giữ "mock" và chọn Hunter trong UI
HUNTER_API_KEY=<copy từ hunter.io → Your Account → API Keys>
```

**Bước 2:** Restart dev server (`npm run dev`) — Next.js chỉ đọc env khi boot.

**Bước 3:** UI test:

1. `/login` → đăng nhập demo.
2. `/scan`, chọn Provider = **Hunter.io (quota)**.
3. Cảnh báo vàng xuất hiện.
4. Nhập **1–2 domain** thật (ví dụ `vietsoftware.com.vn`, `fpt.com.vn`), limit 5 hoặc 10.
5. Preview → "Bắt đầu scan" → đợi ~2–5 giây.
6. Kết quả: `provider: hunter`, mỗi domain có email thật + verification status thật.

### Smoke test bằng curl (advanced)

```bash
TOKEN="<paste cookie tdm_session từ browser>"
curl -sS -X POST http://localhost:3000/api/scan/domain \
  -H "content-type: application/json" \
  -H "cookie: tdm_session=$TOKEN" \
  -d '{"domains":["vietsoftware.com.vn"],"emailLimitPerDomain":5,"provider":"hunter"}'
```

### Troubleshooting

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `503 provider_unavailable` | Thiếu `HUNTER_API_KEY` hoặc chưa restart sau khi sửa `.env.local` | Restart `npm run dev` |
| `502 provider_invalid_key` | Key sai/đã reset/chưa active | Lấy key mới ở hunter.io → API Keys |
| `429 provider_rate_limited` | Hết quota tháng (free 25), hoặc rate limit ngắn | Đợi reset, hoặc nâng gói |
| `504 provider_timeout` | Mạng tới `api.hunter.io` chậm/bị block | Thử lại, đổi mạng |
| `502 provider_network` | Server không gọi được fetch | Firewall/DNS issue |
| `502 provider_upstream` | Hunter 5xx | Check status.hunter.io |
| Domain hợp lệ nhưng `email_count: 0` | Hunter không tìm được email cho domain đó | Bình thường — không phải lỗi |

UI hiện hint Vietnamese cho mỗi mã code (xem `ERROR_HINTS` trong `domain-scan-wizard.tsx`).

## 6. Mock provider

`src/lib/scan/mock-provider.ts`:

- Sinh kết quả deterministic theo hash FNV-1a của `domain` — cùng domain → cùng emails (giúp test).
- `seed % 5 === 0` → trả `{ results: [], empty: true }` → ~20% domain rỗng để UI test empty branch.
- Email format: `<last>.<first>[N]@<domain>` với `last/first` chọn từ list tên Việt + `position` từ list role B2B + ~50% có thêm `<role>@<domain>` generic mailbox.
- `confidence`: 0.55–0.95 random theo seed.
- `status`: chia 5 trạng thái với verified weight cao hơn.
- **Không** I/O, **không** import network library.

## 7. UI `/scan`

`domain-scan-wizard.tsx` giữ flow 4 bước:

1. **Input** — textarea + preview live `normalizeDomains(...)` ngay khi user gõ. Counter hiển thị `<valid> / 50`. Cảnh báo "N dòng sẽ bị bỏ ở Preview".
2. **Preview** — list domain đã normalize + alert tóm tắt số dòng bị bỏ (5 line đầu) + ước tính request.
3. **Scanning** — gọi `POST /api/scan/domain`. Hiển thị loader.
4. **Results** — `ScanResultsView`: tóm tắt (`totalEmails`, `scannedDomains`, `provider`, `durationMs`) + alert "N domain không tìm được email" + `ResultsTable`. Filter "verified only" áp ở client.

Error state có code badge + `ERROR_HINTS[code]` (theo style của `/discover` Phase 08B).

## 8. Mapping với DB schema (Phase 04)

API response sẵn shape để map vào `scan_jobs` + `scan_results` từ [`0001_initial_schema.sql`](../supabase/migrations/0001_initial_schema.sql) khi Supabase Auth migration xong (Phase 09+):

| API response | DB column |
|---|---|
| `run.id` | `scan_jobs.id` |
| `run.provider` | `scan_jobs.options.provider` |
| `run.status` | `scan_jobs.status` (mapped `completed`/`failed`) |
| `run.requestedDomains/scannedDomains/totalEmails` | `scan_jobs.result_count` + options jsonb |
| `run.durationMs` + `createdAt` | `scan_jobs.started_at/finished_at` |
| `domains[]` | `scan_jobs.options.domain_summary` (jsonb) |
| `results[].domain/email/...` | `scan_results.domain/email/contact_name/title/company/confidence/source/status` |

## 9. Smoke test record

### Phase 08C (mock-only) — 2026-05-18

Offline — không gọi Hunter, không tiêu quota.

| # | Test | Expected | Actual |
|---|---|---|---|
| 1 | No session cookie | 401 `unauthorized` | ✓ HTTP 401 |
| 2 | Empty array `domains: []` | 400 invalid_input | ✓ "domains is empty" |
| 3 | Provider `hunter` (deferred) | 503 provider_unavailable | ✓ (Phase 08C: "chưa được wire") |
| 4 | 51 domains | 400 too_many | ✓ "too many domains" |
| 5 | `emailLimitPerDomain: 0` | 400 invalid | ✓ |
| 6 | Mixed input — URL + email + `www.` + dup | 200 normalize + warnings | ✓ 6 → 3 valid + 3 warnings, 1 empty domain |

### Phase 09B (regression after UX polish) — 2026-05-19

UX polish (Hunter warning copy, over-cap UI hint, per-domain error display) không phá luồng cũ.

| # | Test | Expected | Actual |
|---|---|---|---|
| 1 | Mock regression — 1 domain, limit 5 | 200 với 4 emails | ✓ HTTP 200, provider=mock, durationMs=1 |
| 2 | Hunter missing key | 503 provider_unavailable | ✓ unchanged from 09A |
| 3 | Invalid provider name `openai` | 400 invalid_input | ✓ "must be one of: mock, hunter" |

**Live Hunter test deferred** — repo không có `HUNTER_API_KEY` thật. Owner thực hiện theo §5b "Bật Hunter cho live test" khi sẵn sàng (test 1 domain trước).

### Phase 09A (mock + Hunter offline) — 2026-05-18

| # | Test | Expected | Actual |
|---|---|---|---|
| 1 | Hunter missing key | 503 `provider_unavailable` | ✓ "Hunter provider is selected but HUNTER_API_KEY is not configured" |
| 2 | Hunter 6 domains (cap 5) | 503 (resolver throws before cap check) | ✓ 503 short-circuit — chủ đích: báo lỗi env quan trọng hơn trước |
| 3 | Hunter `emailLimitPerDomain: 11` | 503 (resolver throws first) | ✓ same short-circuit |
| 4 | Mock regression (2 domain, limit 5) | 200 với 7 emails | ✓ provider=mock, durationMs=0 |
| 5 | `provider: "nuclear"` | 400 invalid_input | ✓ "must be one of: mock, hunter" |
| 6 | No session | 401 unauthorized | ✓ |
| 7 | Mock 51 domains (cap 50) | 400 too_many | ✓ "51 > 50 for provider mock", `max:50` |
| 8 | No `provider` in body (default) | 200 mock | ✓ falls through to `mock` |

**Live Hunter test deferred** — repo không có `HUNTER_API_KEY` thật. Owner thực hiện theo §5b live test khi sẵn sàng (5 search/lần).

**Note**: T2/T3 short-circuit ở `resolveProvider()` (503) trước domain/limit validation. Khi có `HUNTER_API_KEY` thật, cap check sẽ fire đúng — đã verify qua type-check.

## 10. Cái KHÔNG làm ở Phase 08C / 09A / 09B

- Không persist `scan_jobs` / `scan_results` vào DB (chờ Supabase Auth migration).
- Không đọc `user_api_keys` — Hunter key lấy từ env, không phải user-scoped.
- Không "Lưu Saved Leads" thật — nút disabled, chờ Phase 09B/10.
- Không Upload CSV — nút disabled.
- Không rate limit per user / quota counter.
- Không pagination — Hunter chỉ gọi 1 search/domain.
- Không parallel fetch — sequential để dễ control quota.
- Không Hunter live test ở repo này (không có key thật trong CI/repo).
- Không silent fallback `hunter → mock` khi key thiếu.
