# Keyword Discovery — Phase 07 + 08A + 08B

> Trạng thái: **mock + SerpAPI** providers, đã smoke test offline 6 path (xem §10). Error codes mapped tới HTTP status có ý nghĩa + UI hint friendly. **Không** gọi Hunter, **không** ghi DB (chờ Supabase Auth migration).
>
> | Provider | Phase | Env | Quota |
> |---|---|---|---|
> | `mock` | 07 — default | none | 0 |
> | `serpapi` | 08A | `SERPAPI_API_KEY` | 1 search per discovery run |

## 1. Mục đích

Tách logic Keyword Discovery ra khỏi UI sớm để Phase 08+ chỉ cần thay implementation provider (SerpAPI thật) mà không phải sửa route, validation, hay client code.

## 2. Files

```
src/lib/discovery/
├── types.ts             # Domain contract: DiscoveryRequest/Response/Provider...
├── mock-provider.ts     # Phase 07 — deterministic mock, no I/O
├── serpapi-provider.ts  # Phase 08A — server-only SerpAPI fetch (`import "server-only"`)
├── scan-transfer.ts     # Helper chuyển kết quả → /scan query string
└── index.ts             # Re-export types + getDiscoveryProvider() (mock default) + scan-transfer

src/app/api/discovery/keyword/
└── route.ts             # POST /api/discovery/keyword — resolve provider, validate, sanitize

src/app/discover/
└── discover-content.tsx # /discover client UI
```

## 3. Provider interface

```ts
export interface DiscoveryProvider {
  readonly name: DiscoveryProviderName;       // "mock" | "serpapi"
  run(req: { keyword: string; country: string; limit: number }): Promise<DiscoveryResultItem[]>;
}
```

Provider chỉ chịu trách nhiệm **chạy query và trả kết quả thô**. Validation input + uuid run id + timestamp + duration đo ở route. Lý do tách: provider có thể là pure function (mock) hoặc fetch ra ngoài (serpapi) — đo thời gian ở route giúp so sánh provider công bằng.

## 4. API route

### Endpoint

```
POST /api/discovery/keyword
content-type: application/json
```

### Request body

```json
{
  "keyword": "phần mềm ERP doanh nghiệp",
  "country": "vn",
  "limit": 10,
  "provider": "mock"
}
```

- `keyword` — bắt buộc, 1–200 ký tự.
- `country` — optional, `vn` (default) hoặc `us`.
- `limit` — optional, integer. Trần phụ thuộc provider: **mock 1–50**, **serpapi 1–30**. Default 10.
- `provider` — optional, `mock` hoặc `serpapi`. Nếu vắng, server dùng `DISCOVERY_PROVIDER` (env) → `mock`.

### Auth

Route nằm dưới `/api/*` nên middleware Phase 03 **không** chạy. Route check session thủ công qua `getSession()`. Không session → `401 { error: "unauthorized" }`.

### Response (200)

```json
{
  "run": {
    "id": "uuid",
    "keyword": "...",
    "country": "vn",
    "status": "completed",
    "provider": "mock",
    "resultCount": 10,
    "createdAt": "2026-05-18T08:30:00.000Z",
    "durationMs": 4
  },
  "results": [
    {
      "domain": "viet-phan-mem-erp-doanh-nghiep-123.vn",
      "company_name": "Viet phần mềm ERP doanh nghiệp 1",
      "title": "Viet phần mềm ERP doanh nghiệp 1 — phần mềm ERP doanh nghiệp",
      "snippet": "...",
      "source": "mock",
      "confidence": 0.78,
      "status": "verified"
    }
  ]
}
```

### Error responses (Phase 08B mapping)

Provider lỗi → `SerpapiProviderError` với `code` → route map sang HTTP status + Vietnamese message:

| Status | `error` (machine) | `code` (UI hint key) | Khi nào xảy ra |
|---|---|---|---|
| 400 | `invalid_input` | — | keyword/country/limit/provider sai format |
| 401 | `unauthorized` | — | Không có session cookie |
| 429 | `provider_rate_limited` | `provider_rate_limited` | SerpAPI 429 hoặc payload báo hết quota |
| 502 | `provider_invalid_key` | `provider_invalid_key` | SerpAPI 401/403 hoặc payload "invalid api key" |
| 502 | `provider_network` | `provider_network` | fetch throws (DNS/TLS) |
| 502 | `provider_parse` | `provider_parse` | Non-JSON từ SerpAPI |
| 502 | `provider_upstream` | `provider_upstream` | Other 5xx từ SerpAPI |
| 503 | `provider_unavailable` | `provider_unavailable` | SerpAPI selected nhưng thiếu `SERPAPI_API_KEY` |
| 504 | `provider_timeout` | `provider_timeout` | AbortController 10s fires |
| 500 | `internal` | — | Bug ngoài tầm các case trên |

UI (`/discover`) đọc field `error` của response và lookup `ERROR_HINTS[error]` trong [`discover-content.tsx`](../src/app/discover/discover-content.tsx) để hiện thêm 1 dòng gợi ý cách khắc phục (ví dụ: "Set SERPAPI_API_KEY trong .env.local rồi restart").

Error sanitize layer 2 lớp: provider scrub `api_key=...` + URL trước khi throw; route scrub thêm lần nữa + mask JWT + cắt 200 ký tự. SerpAPI request body chứa `api_key` trong query string — đảm bảo không lộ key trong error message tới client.

### Persistence

Phase 07 **không** insert vào `discovery_runs` / `scan_results`. Lý do: rows trong các bảng đó FK xuống `auth.users` qua `profiles`, mà Phase 03 vẫn dùng demo HMAC (không có `auth.users` row tương ứng). Sẽ wire DB persistence ngay sau khi Supabase Auth migration hoàn tất (Phase 08 nhánh A).

## 4b. Provider resolution & quota-safe rules (Phase 08A)

### Resolution order

1. `request.body.provider` (nếu set và là `mock` / `serpapi`).
2. `process.env.DISCOVERY_PROVIDER` (nếu là `serpapi`).
3. Mặc định `mock`.

Server **luôn** validate sau bước resolve. Ví dụ client xin `serpapi` nhưng server không có `SERPAPI_API_KEY` → **không tự fallback** sang mock, mà trả `503 provider_unavailable`. Lý do: silent fallback sẽ làm caller hiểu sai vì sao kết quả nhìn fake.

### Quota-safe rules SerpAPI

| Rule | Giá trị |
|---|---|
| 1 outbound fetch / discovery run | không pagination |
| Timeout | 10s qua `AbortController` |
| `num` gửi tới SerpAPI | `min(limit + 5, 30)` — buffer để filter excluded vẫn đủ |
| Limit ceiling server | 30 (vs 50 cho mock) |
| Auto-retry | **không** |
| Cache | `cache: "no-store"` |
| User-scoped key (`user_api_keys`) | **không** ở Phase 08A — chỉ đọc `SERPAPI_API_KEY` từ env |

### Env vars

```bash
# Mặc định provider khi /discover không chỉ định
DISCOVERY_PROVIDER=mock     # hoặc serpapi

# Bắt buộc nếu provider=serpapi. SERVER ONLY — không prefix NEXT_PUBLIC_.
SERPAPI_API_KEY=
```

`SERPAPI_API_KEY` chỉ được đọc trong [`src/lib/discovery/serpapi-provider.ts`](../src/lib/discovery/serpapi-provider.ts) — file `import "server-only"`. Build sẽ vỡ nếu lỡ import vào client component. Route handler dùng `dynamic import` để khi `DISCOVERY_PROVIDER=mock` deployment không bundle code SerpAPI.

### Filter domain

SerpAPI provider lọc bỏ các mega-domain trước khi đếm vào `limit`:
`facebook.com`, `youtube.com`, `linkedin.com`, `twitter.com`, `x.com`, `wikipedia.org`, `reddit.com`, `instagram.com`, `tiktok.com`, `pinterest.com`, `google.com`, `googleusercontent.com`, `amazon.com`, `apple.com`, `microsoft.com`, `bing.com`, `quora.com` + subdomain.

Deduplicate theo hostname (sau khi strip `www.`). Confidence dựa trên `position`: ~0.95 ở vị trí 1, ~0.55 ở vị trí 10, floor 0.30. `status` luôn `unknown` (chưa xác minh email).

## 5. Mock provider

`src/lib/discovery/mock-provider.ts`:

- Sinh `limit` results dựa trên hash FNV-1a của `keyword|country` — cùng input → cùng output (giúp test).
- Domain pattern: `<prefix>-<slug(keyword)>-<n>.<tld>` với prefix ∈ {viet, global, smart, real, ...}, tld ∈ {vn, com.vn, com, net, io}.
- Confidence: 0.55–0.96 (rải đều).
- Status: 4 trạng thái rải đều (`verified`, `accept_all`, `webmail`, `unknown`).
- Snippet ghi rõ "mock provider, không gọi SerpAPI" để dev nhìn UI biết ngay.

**Không** I/O, **không** import network library. Có thể test pure-function offline.

## 6. UI (`/discover`)

`discover-content.tsx` đã chuyển sang fetch thật:

1. User nhập keyword + country → bấm "Tìm website".
2. POST `/api/discovery/keyword` với JSON body.
3. Hiển thị loading → success/error → bảng kết quả (qua `ResultsTable` chung).
4. Hiển thị badge provider + duration để dev biết đang dùng mock.

Map từ `DiscoveryResultItem` sang `ScanResultRow` (shape của `ResultsTable`): `email`/`name` để `—` vì Keyword Discovery chưa biết email/người liên hệ — đó là việc của Domain Scan.

## 7. Roadmap mở rộng SerpAPI

Phase 09+ sẽ chuyển từ env-key sang **user-scoped key** trong `user_api_keys` (đọc qua admin client). Lúc đó:
- `serpapi-provider.ts` nhận key qua đối số thay vì đọc trực tiếp `process.env`.
- Resolution thêm bước "lookup `user_api_keys` của workspace hiện tại".
- Phase 08A code chỉ cần refactor — KHÔNG cần đổi `DiscoveryProvider` contract.

## 7b. Bật SerpAPI cho live test (Phase 08B)

Lưu ý quota-safe: mỗi lần bấm "Tìm website" với provider SerpAPI **= 1 SerpAPI search**. Gói free là 100/tháng. Đừng bấm spam.

### Bước 1 — Cấu hình `.env.local`

```bash
# .env.local — KHÔNG commit. File đã trong .gitignore từ Phase 03.
AUTH_SECRET=<ít nhất 16 ký tự, sinh bằng: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
DISCOVERY_PROVIDER=serpapi
SERPAPI_API_KEY=<copy từ serpapi.com → Your Account → API Key>
```

### Bước 2 — Restart dev server

```bash
# Stop dev server đang chạy (Ctrl+C), rồi:
npm run dev
```

Next.js chỉ đọc env khi boot — `.env.local` thay đổi không hot-reload.

### Bước 3 — Smoke test qua UI

1. Mở http://localhost:3000/login → đăng nhập demo (`trang.nguyen@vietsoftware.com.vn` / `demo123`).
2. Vào `/discover`.
3. Chọn Provider = **SerpAPI (quota)** trong dropdown.
4. Cảnh báo vàng xuất hiện: "SerpAPI dùng quota thật. Server chỉ chạy khi đã cấu hình `SERPAPI_API_KEY`."
5. Keyword: `marketing agency`, Quốc gia: Việt Nam, bấm "Tìm website".
6. Kết quả mong đợi: bảng hiển thị ~10 domain thật (không phải `*.mock`), badge `provider: serpapi` + `durationMs: ~500–2000ms`.

### Smoke test bằng curl (advanced)

Cần session cookie hợp lệ. Cách lấy:

```bash
# Login qua browser dev tools, copy cookie tdm_session=...
TOKEN="<paste cookie value>"

curl -sS -X POST http://localhost:3000/api/discovery/keyword \
  -H "content-type: application/json" \
  -H "cookie: tdm_session=$TOKEN" \
  -d '{"keyword":"marketing agency","country":"vn","provider":"serpapi","limit":10}'
```

### Troubleshooting

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `503 provider_unavailable` | Thiếu `SERPAPI_API_KEY` hoặc chưa restart server sau khi sửa `.env.local` | Restart `npm run dev` |
| `502 provider_invalid_key` | Key sai/đã reset/ chưa active | Lấy key mới ở serpapi.com → Your Account |
| `429 provider_rate_limited` | Hết quota tháng (free tier 100), hoặc bị rate limit ngắn hạn | Đợi reset, hoặc nâng cấp gói |
| `504 provider_timeout` | Mạng tới `serpapi.com` chậm/bị block | Thử lại, hoặc đổi mạng |
| `502 provider_network` | Server không gọi được fetch | Firewall/DNS issue trên máy chạy server |
| `502 provider_upstream` | SerpAPI 5xx | Check status.serpapi.com |

UI hiện hint Vietnamese cho mỗi mã code (xem `ERROR_HINTS` trong `discover-content.tsx`).

## 8. Cái KHÔNG làm ở Phase 08A/08B

- Không gọi Hunter / Hunter Domain Search (đó là việc của Domain Scan ở Phase 08B+).
- Không ghi `discovery_runs` / `scan_results` vào DB (chờ Supabase Auth migration để có `auth.users` row hợp lệ).
- Không đọc `user_api_keys` (key SerpAPI lấy từ env, không phải user-scoped).
- Không rate limit (Phase 09 sẽ thêm).
- Không silent fallback `serpapi → mock` khi env thiếu — luôn trả `503 provider_unavailable`.
- Không multi-page / pagination — 1 request / 1 run.
- Không lưu lịch sử run vào `/history` (data còn in-memory ở client).
- Không gọi SerpAPI từ unit/integration test ở repo này.

## 10. Smoke test record (Phase 08B, 2026-05-18)

Test offline (mock + missing-key paths), không tiêu quota SerpAPI nào.

| # | Test | Method | Expected | Actual |
|---|---|---|---|---|
| 1 | No session cookie | `POST /api/discovery/keyword` no cookie | 401 `unauthorized` | ✓ HTTP 401 `{"error":"unauthorized"}` |
| 2 | Mock provider happy path | `provider:"mock"`, `limit:5` | 200 với 5 results, source="mock" | ✓ 5 results, `durationMs:0`, snippet ghi "mock provider, không gọi SerpAPI" |
| 3 | SerpAPI without `SERPAPI_API_KEY` | `provider:"serpapi"` | 503 `provider_unavailable`, không tiêu quota | ✓ HTTP 503 với message rõ + `provider:"serpapi"` |
| 4 | Invalid provider name | `provider:"hacker"` | 400 `invalid_input` | ✓ "provider must be one of: mock, serpapi" |
| 5 | Limit beyond cap | `provider:"mock"`, `limit:999` | 400 | ✓ "limit must be 1..50 for provider mock" |
| 6 | Empty keyword | `keyword:""` | 400 | ✓ "keyword length must be 1..200" |

**Live SerpAPI test deferred** — repo này không có `SERPAPI_API_KEY` thật. Owner thực hiện theo §7b khi sẵn sàng (chi phí: 1 search / lần bấm).
