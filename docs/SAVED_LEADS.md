# Saved Leads — Phase 09C + 09D

> **09C:** API + UI + in-memory fallback.
> **09D:** Persist Supabase bảng `app_saved_leads` khi env service role sẵn sàng.
> `user_id` = `session.id` demo HMAC — **chưa** `auth.users` UUID.

## 1. Mục đích

1. Chọn lead từ Domain Scan → **Lưu lead đã chọn** → `POST /api/leads`.
2. Xem / tìm / xóa / CSV tại `/leads`.
3. Dedupe **email + domain** (case-insensitive) per user.

## 2. Storage backends

| `storage` trong API | Điều kiện |
|-------------------|-----------|
| `supabase` | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + bảng `app_saved_leads` đã migrate |
| `memory` | Thiếu env **hoặc** bảng chưa có (`storageFallback: true`) |

Repository: [`src/lib/leads/repository.ts`](../src/lib/leads/repository.ts) — API route chỉ gọi facade, không import Supabase trực tiếp.

```
src/lib/leads/
├── repository.ts      # chọn supabase vs memory
├── memory-store.ts    # globalThis Map (Phase 09C)
├── supabase-store.ts  # admin client, server-only
├── types.ts
├── validate.ts
├── export-csv.ts
└── sanitize.ts
```

## 3. Supabase migration (Phase 09D)

File: [`supabase/migrations/0002_app_saved_leads.sql`](../supabase/migrations/0002_app_saved_leads.sql)

Bảng **`app_saved_leads`** (tách khỏi `saved_leads` workspace-scoped trong `0001`):

| Cột | Kiểu |
|-----|------|
| `id` | uuid PK |
| `user_id` | text NOT NULL (demo session id) |
| `email` | citext NOT NULL |
| `name`, `title`, `company` | text nullable |
| `domain` | text NOT NULL |
| `confidence` | numeric(5,2) |
| `status` | text (`verified` \| `accept_all` \| `webmail`) |
| `source` | text nullable |
| `created_at`, `updated_at` | timestamptz |

Unique index: `(user_id, lower(email), lower(domain))`.
Index: `(user_id, created_at desc)`.

### Cách apply

1. Provision project theo [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md).
2. SQL Editor → chạy `0002_app_saved_leads.sql` (hoặc `supabase db push` nếu dùng CLI).
3. `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (build-safe; leads API dùng service role)
   - `SUPABASE_SERVICE_ROLE_KEY` (**server-only**, không commit)
4. Restart `npm run dev` → `/leads` banner xanh “Lưu bền vững”.

Không cần dependency mới — dùng `@supabase/supabase-js` đã có.

## 4. API

### `GET /api/leads`

Response: `{ leads, storage: "supabase" | "memory", storageFallback?: true }`

### `POST /api/leads`

- Body: `{ leads: SaveLeadInput[] }`, max **100**.
- Response: `{ savedCount, duplicateCount, saved, duplicates, storage, storageFallback? }`

### `DELETE /api/leads/[id]`

- Scope: chỉ lead có `user_id` = session hiện tại.

Lỗi sanitize — không lộ URL/key/JWT ([`sanitize.ts`](../src/lib/leads/sanitize.ts)).

## 5. UI

| Trạng thái | Copy |
|------------|------|
| Supabase OK | Banner xanh — lưu bền vững, nhắc session demo |
| Memory | Banner amber — chưa cấu hình env |
| `storageFallback` | Banner amber — env có, chưa migrate bảng |

Empty state:

> Chưa có lead nào được lưu. Hãy scan domain và lưu lead từ bảng kết quả trên trang Domain Scan.

## 6. Giới hạn (chưa làm)

- Supabase Auth + map `user_id` → `auth.users`
- Workspace-scoped `saved_leads` (0001) + CRM tags/notes
- Lưu từ `/results` / Discovery
- Export JSON signed URL
- RLS policies cho `authenticated` role (hiện service role + filter app)

## 7. CSV export

Cột: `email, name, title, company, domain, confidence, status, source, savedAt` — UTF-8 BOM, RFC 4180 escape.
