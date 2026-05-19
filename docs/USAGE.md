# Usage / Quota Foundation — Phase 09H

> Trạng thái: foundation only. App ghi usage events để chuẩn bị quota/billing/admin dashboard, nhưng **chưa enforce quota**, chưa Stripe, chưa subscription.

## 1. Migration

Chạy migration:

```text
supabase/migrations/0005_app_usage_events.sql
```

Bảng `public.app_usage_events`:

| Cột | Ghi chú |
|---|---|
| `id` | UUID primary key, `gen_random_uuid()` |
| `user_id` | text, lấy từ hybrid `session.id` |
| `event_type` | `discovery_search`, `domain_scan`, `hunter_search`, `serpapi_search`, `saved_lead`, `csv_export` |
| `provider` | nullable, ví dụ `mock`, `hunter`, `serpapi` |
| `quantity` | số lượng usage, default 1 |
| `subject_type`, `subject_id` | link nhẹ tới object liên quan, ví dụ `scan_job` |
| `metadata` | JSON object đã sanitize |
| `created_at` | timestamp |

Indexes:

- `(user_id, created_at desc)`
- `(user_id, event_type, created_at desc)`

RLS bật, không anon policy. App dùng service-role client server-side và luôn filter `user_id`.

## 2. Repository behavior

Code nằm ở `src/lib/usage/*`:

- `repository.ts`: `recordUsageEvent()` và `getUsageSummary()`, server-only.
- `supabase-store.ts`: insert/read qua Supabase admin client.
- `sanitize.ts`: scrub metadata trước khi ghi.
- `types.ts`: event type contract.

Nếu thiếu Supabase env, thiếu bảng, hoặc ghi usage lỗi, `recordUsageEvent()` không throw ra caller. Core flow như Discovery, Domain Scan, Save Leads vẫn chạy.

## 3. Event writes hiện có

| Flow | Event |
|---|---|
| `POST /api/discovery/keyword` | `discovery_search`; thêm `serpapi_search` nếu provider là SerpAPI |
| `POST /api/scan/domain` | `domain_scan`; thêm `hunter_search` nếu provider là Hunter |
| `POST /api/leads` | `saved_lead` với quantity = số lead mới lưu, không tính duplicate |

CSV export hiện còn client-only ở Results UI nên chưa ghi `csv_export`. Khi có export endpoint server-side, ghi event tại endpoint đó.

## 4. Summary API

```text
GET /api/usage/summary?days=30
```

Response gồm `totals` theo từng `eventType`, `days`, và metadata storage.

Nếu Supabase chưa cấu hình hoặc chưa apply migration 0005, API trả totals = 0 kèm `usageStorageReason`, không crash.

## 5. Security

Usage metadata không được chứa:

- `APP_ENCRYPTION_KEY`
- `HUNTER_API_KEY`
- `SERPAPI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Authorization header
- URL có `api_key`
- `key_ciphertext`
- plaintext user API key

Phase 09H chỉ lưu metadata tối thiểu như provider, count, status, scan job id. Không lưu raw provider payload.
