# Domain Scan — Phase 08C

> Trạng thái: **mock backend foundation**. API route + provider interface + domain-utils + UI wiring đã có. **Không** gọi Hunter, **không** consume quota, **không** ghi DB (chờ Supabase Auth migration).
>
> | Provider | Phase | Env | Quota |
> |---|---|---|---|
> | `mock` | 08C — default | none | 0 |
> | `hunter` | 09 (planned) | `HUNTER_API_KEY` | 1 request / email tìm được |

## 1. Mục đích

Đối xứng với Keyword Discovery: tách logic Domain Scan ra khỏi UI sớm để Phase 09 chỉ cần thay implementation provider (Hunter thật) mà không phải sửa route, validation, hay client code. Domain normalization + dedup tập trung 1 chỗ để consume từ cả client preview + server route.

## 2. Files

```
src/lib/scan/
├── types.ts             # Domain contract: ScanRequest/Response/Provider...
├── domain-utils.ts      # normalizeDomain / normalizeDomains
├── mock-provider.ts     # Phase 08C — deterministic mock, no I/O
└── index.ts             # Re-export client-safe pieces + getScanProvider()

src/app/api/scan/domain/
└── route.ts             # POST /api/scan/domain — validate, normalize, dispatch

src/components/scan/
└── domain-scan-wizard.tsx # /scan client UI (4-step wizard)
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

- `domains` — bắt buộc, array of strings, **max 50** ở Phase 08C. Mỗi item có thể là `bare.tld`, `https://url/path`, hoặc `WWW.UPPERCASE.com` — route sẽ normalize.
- `emailLimitPerDomain` — optional integer. Mock: 1..100, default 10. Hunter (Phase 09): 1..10.
- `provider` — optional, `mock` (default Phase 08C) hoặc `hunter` (returns 503 cho tới Phase 09).

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

### Error responses

| Status | Body | Khi nào |
|---|---|---|
| 400 | `{ error: "invalid_input", message, warnings? }` | domains rỗng / >50 / không phải string / provider sai / limit sai / không có domain hợp lệ sau normalize |
| 401 | `{ error: "unauthorized" }` | Không session |
| 503 | `{ error: "provider_unavailable", provider }` | `provider: "hunter"` — chờ Phase 09 |
| 500 | `{ error: "internal", message: "<sanitized>" }` | Bug ngoài tầm các case trên |

Sanitize: strip newline, mask `api_key=...`, mask URL, mask JWT, cắt 200 ký tự. `cache-control: no-store`.

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

## 9. Smoke test record (Phase 08C, 2026-05-18)

Offline — không gọi Hunter, không tiêu quota.

| # | Test | Expected | Actual |
|---|---|---|---|
| 1 | No session cookie | 401 `unauthorized` | ✓ HTTP 401 `{"error":"unauthorized"}` |
| 2 | Empty array `domains: []` | 400 invalid_input | ✓ "domains is empty" |
| 3 | Provider `hunter` (deferred) | 503 provider_unavailable | ✓ "hunter provider chưa được wire ở Phase 08C", `provider:"hunter"` |
| 4 | 51 domains | 400 too_many | ✓ "too many domains: 51 > 50", `max:50` |
| 5 | `emailLimitPerDomain: 0` | 400 invalid | ✓ "must be 1..100 for provider mock" |
| 6 | Mixed input — URL + email + `www.` + dup | 200 normalize + warnings | ✓ 6 input → 3 normalized (vietsoftware.com.vn / realgroup.vn / fpt.com.vn); warnings: `looks_like_email` + `invalid_format` + `duplicate`; `realgroup.vn` empty:true (hits seed%5 branch); totalEmails=12, durationMs=0 |

## 10. Cái KHÔNG làm ở Phase 08C

- Không gọi Hunter / Hunter Domain Search.
- Không đọc `user_api_keys`.
- Không persist `scan_jobs` / `scan_results` vào DB.
- Không export CSV/JSON (Phase 09+ qua bảng `exports`).
- Không "Lưu Saved Leads" thật — nút disabled.
- Không Upload CSV — nút disabled.
- Không rate limit per user (Phase 09).
- Không Hunter live test ở repo này.
