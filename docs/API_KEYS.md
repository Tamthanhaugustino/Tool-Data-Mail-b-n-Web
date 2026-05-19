# User API Keys — Phase 09F

> Trạng thái: **foundation an toàn**. User có thể lưu Hunter/SerpAPI key cá nhân nếu Supabase service role + migration `0003_app_user_api_keys.sql` + `APP_ENCRYPTION_KEY` đã cấu hình. Nếu thiếu encryption env, API không lưu plaintext.

## Storage

Migration: `supabase/migrations/0003_app_user_api_keys.sql`

Table `public.app_user_api_keys`:

| Cột | Ghi chú |
|---|---|
| `id` | uuid PK |
| `user_id` | text; demo HMAC id hoặc Supabase Auth UUID |
| `provider` | `hunter` hoặc `serpapi` |
| `key_ciphertext` | ciphertext app-level AES-GCM, không plaintext |
| `key_hint` | 4 ký tự cuối để UI mask dạng `****abcd` |
| `created_at`, `updated_at` | timestamps |

RLS bật, không policy anon/authenticated. App dùng service role server-only và luôn filter `user_id`.

## Encryption

- Env: `APP_ENCRYPTION_KEY`, server-only, tối thiểu 32 ký tự.
- Helper: `src/lib/api-keys/crypto.ts`, `import "server-only"`.
- Thuật toán: AES-256-GCM, IV random 12 bytes, format ciphertext `v1:<iv>:<tag>:<payload>`.
- Key lưu DB không bao giờ trả plaintext về client.
- Nếu thiếu `APP_ENCRYPTION_KEY`, `PUT /api/settings/api-keys` trả lỗi cấu hình và không ghi DB.

## API

`GET /api/settings/api-keys`

- Trả `{ providers }`
- Mỗi provider chỉ có `hasUserKey`, `maskedKey`, `keyHint`, `serverFallbackAvailable`, `encryptionConfigured`
- Không trả plaintext/ciphertext.

`PUT /api/settings/api-keys`

```json
{ "provider": "hunter", "apiKey": "..." }
```

- Validate provider + độ dài key.
- Encrypt server-side rồi upsert theo `(user_id, provider)`.
- Không log plaintext.

`DELETE /api/settings/api-keys/[provider]`

- Xóa key theo `user_id + provider`.

## Provider resolution

Hunter Domain Scan và SerpAPI Discovery dùng thứ tự:

1. User key đã lưu và decrypt được.
2. Server env fallback (`HUNTER_API_KEY` hoặc `SERPAPI_API_KEY`).
3. Nếu không có key, giữ behavior `503 provider_unavailable`.

Nếu decrypt user key fail nhưng server env có sẵn, route dùng env fallback và thêm warning nội bộ trong response. Nếu không có env fallback, route trả lỗi cấu hình thân thiện để user xóa/lưu lại key.

## Giới hạn

- Chưa có validate/test connection riêng cho provider key.
- Chưa có audit log cho thao tác đổi key.
- Auth vẫn hybrid: `user_id` có thể là demo session id hoặc Supabase Auth UUID.
