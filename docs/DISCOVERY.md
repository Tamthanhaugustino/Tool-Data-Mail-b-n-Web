# Keyword Discovery — Phase 07 + 08A

> Trạng thái: **mock + SerpAPI** providers. API route + provider interface + UI wiring đã có. **Không** gọi Hunter, **không** ghi DB (chờ Supabase Auth migration).
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

### Error responses

| Status | Body |
|---|---|
| 400 | `{ error: "invalid_input", message: "<sanitized>" }` |
| 401 | `{ error: "unauthorized" }` |
| 503 | `{ error: "provider_unavailable", provider: "serpapi", message }` |
| 500 | `{ error: "internal", message: "<sanitized>", provider? }` |

Error sanitize: strip newline, mask `api_key=...` → `api_key=[redacted]`, mask URL → `[url]`, mask JWT-shaped strings → `[jwt]`, cắt 200 ký tự. `cache-control: no-store` luôn được set. SerpAPI request body chứa `api_key` trong query string — sanitize đảm bảo không lộ key trong error message tới client.

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

## 8. Cái KHÔNG làm ở Phase 08A

- Không gọi Hunter / Hunter Domain Search (đó là việc của Domain Scan ở Phase 08B+).
- Không ghi `discovery_runs` / `scan_results` vào DB (chờ Supabase Auth migration để có `auth.users` row hợp lệ).
- Không đọc `user_api_keys` (key SerpAPI lấy từ env, không phải user-scoped).
- Không rate limit (Phase 09 sẽ thêm).
- Không silent fallback `serpapi → mock` khi env thiếu — luôn trả `503 provider_unavailable`.
- Không multi-page / pagination — 1 request / 1 run.
- Không lưu lịch sử run vào `/history` (data còn in-memory ở client).
- Không gọi SerpAPI từ unit/integration test ở repo này.
