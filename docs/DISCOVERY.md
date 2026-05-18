# Keyword Discovery — Phase 07

> Trạng thái: **mock backend foundation**. API route + provider interface + UI wiring đã có. **Không** gọi SerpAPI thật, **không** consume quota, **không** ghi DB.

## 1. Mục đích

Tách logic Keyword Discovery ra khỏi UI sớm để Phase 08+ chỉ cần thay implementation provider (SerpAPI thật) mà không phải sửa route, validation, hay client code.

## 2. Files

```
src/lib/discovery/
├── types.ts             # Domain contract: DiscoveryRequest/Response/Provider...
├── mock-provider.ts     # Phase 07 provider (deterministic mock, no I/O)
└── index.ts             # getDiscoveryProvider() — switch điểm cho Phase 08+

src/app/api/discovery/keyword/
└── route.ts             # POST /api/discovery/keyword

src/app/discover/
└── discover-content.tsx # /discover page gọi route trên
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
  "limit": 10
}
```

- `keyword` — bắt buộc, 1–200 ký tự.
- `country` — optional, `vn` (default) hoặc `us`.
- `limit` — optional, integer 1–50, default 10.

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
| 500 | `{ error: "internal", message: "<sanitized>" }` |

Error sanitize: strip newline, mask URL/JWT-shaped strings, cắt 200 ký tự. `cache-control: no-store` luôn được set.

### Persistence

Phase 07 **không** insert vào `discovery_runs` / `scan_results`. Lý do: rows trong các bảng đó FK xuống `auth.users` qua `profiles`, mà Phase 03 vẫn dùng demo HMAC (không có `auth.users` row tương ứng). Sẽ wire DB persistence ngay sau khi Supabase Auth migration hoàn tất (Phase 08 nhánh A).

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

## 7. Khi nào swap sang SerpAPI thật

Phase 08+ (sau khi Supabase Auth + `user_api_keys` đã wire):

1. Tạo `src/lib/discovery/serpapi-provider.ts` implement cùng `DiscoveryProvider` interface.
2. Sửa `getDiscoveryProvider()` trong `index.ts` để chọn provider theo env (`DISCOVERY_PROVIDER=serpapi`) hoặc theo `user_api_keys.is_active` của user hiện tại.
3. Route không cần sửa code — chỉ cần đảm bảo provider mới đọc key user-scoped (từ `user_api_keys` qua admin client).
4. UI không cần sửa — provider name sẽ tự đổi badge ở phần "provider: serpapi".

## 8. Cái KHÔNG làm ở Phase 07

- Không gọi SerpAPI / Hunter / bất kỳ external API nào.
- Không ghi `discovery_runs` / `scan_results` vào DB.
- Không kiểm tra quota.
- Không rate limit (Phase 09 sẽ thêm).
- Không lưu lịch sử run vào `/history` (data còn nằm in-memory ở client).
- Không "Chuyển sang Domain Scan" thật — nút placeholder.
