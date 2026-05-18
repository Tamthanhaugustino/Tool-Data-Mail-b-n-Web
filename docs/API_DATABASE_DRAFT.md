# Draft API & Database — Tool Data Mail Web

> **Cảnh báo:** Đây chỉ là **bản nháp** để align planning và UI. **Chưa implement** — không có migration, không có Route Handler, không có Supabase project trong repo này. Tên cột, quan hệ và endpoint có thể đổi sau phase 02–03.

---

## Quy ước chung

- Mọi bảng nghiệp vụ (trừ lookup hệ thống) gắn `user_id` → **RLS** theo user đăng nhập.
- `id`: UUID primary key (đề xuất).
- Timestamp: `created_at`, `updated_at` (timestamptz).
- API key: **không** trả về plaintext sau khi lưu; client chỉ thấy mask (`sk-...xxxx`).

---

## Draft — Database tables

### `profiles`

Mở rộng Supabase Auth user.

| Cột | Kiểu (draft) | Ghi chú |
|-----|--------------|---------|
| `id` | uuid PK | = `auth.users.id` |
| `email` | text | Denormalized hoặc view từ auth |
| `display_name` | text | nullable |
| `role` | text | `user` \| `admin` — default `user` |
| `locale` | text | default `vi` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `user_api_keys`

Key Hunter / SerpAPI do user tự cung cấp.

| Cột | Kiểu (draft) | Ghi chú |
|-----|--------------|---------|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles | |
| `provider` | text | `hunter` \| `serpapi` |
| `encrypted_key` | text / bytea | Mã hóa at-rest — chi tiết phase 03 |
| `key_hint` | text | 4 ký tự cuối để hiển thị UI |
| `is_active` | boolean | |
| `last_validated_at` | timestamptz | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Unique (draft):** `(user_id, provider)` — một key active mỗi provider.

---

### `scan_runs`

Một phiên Keyword Discovery hoặc Domain Scan.

| Cột | Kiểu (draft) | Ghi chú |
|-----|--------------|---------|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `scan_type` | text | `keyword_discovery` \| `domain_scan` |
| `status` | text | `pending` \| `running` \| `completed` \| `failed` \| `cancelled` |
| `input_payload` | jsonb | keyword, domain list, filters… |
| `provider_used` | text[] | ví dụ `['serpapi']`, `['hunter']` |
| `error_message` | text | nullable |
| `started_at` | timestamptz | |
| `finished_at` | timestamptz | nullable |
| `result_count` | int | denormalized |
| `created_at` | timestamptz | |

---

### `scan_results`

Từng dòng kết quả thuộc một `scan_run`.

| Cột | Kiểu (draft) | Ghi chú |
|-----|--------------|---------|
| `id` | uuid PK | |
| `scan_run_id` | uuid FK → scan_runs | |
| `user_id` | uuid FK | denormalized cho RLS đơn giản |
| `domain` | text | nullable |
| `company_name` | text | nullable |
| `email` | text | nullable |
| `name` | text | nullable |
| `title` | text | nullable |
| `source` | text | hunter, serp, manual… |
| `confidence` | numeric | nullable |
| `raw_payload` | jsonb | response gốc đã lọc |
| `created_at` | timestamptz | |

**Index (draft):** `(scan_run_id)`, `(user_id, email)`, `(user_id, domain)`.

---

### `saved_leads`

Lead user đánh dấu lưu từ kết quả scan.

| Cột | Kiểu (draft) | Ghi chú |
|-----|--------------|---------|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `scan_result_id` | uuid FK | nullable nếu thêm tay |
| `email` | text | |
| `domain` | text | nullable |
| `company_name` | text | nullable |
| `contact_name` | text | nullable |
| `notes` | text | nullable |
| `tags` | text[] | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `subscriptions`

Gói / license SaaS (skeleton MVP).

| Cột | Kiểu (draft) | Ghi chú |
|-----|--------------|---------|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `plan` | text | `free` \| `pro` \| `enterprise` |
| `status` | text | `active` \| `expired` \| `cancelled` |
| `expires_at` | timestamptz | nullable |
| `stripe_customer_id` | text | nullable — phase sau |
| `stripe_subscription_id` | text | nullable |
| `metadata` | jsonb | quota, features |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `audit_logs`

Nhật ký thao tác nhạy cảm & admin.

| Cột | Kiểu (draft) | Ghi chú |
|-----|--------------|---------|
| `id` | uuid PK | |
| `actor_user_id` | uuid FK | nullable (system) |
| `target_user_id` | uuid FK | nullable |
| `action` | text | `api_key.updated`, `export.created`, `admin.user.disabled`… |
| `resource_type` | text | nullable |
| `resource_id` | uuid | nullable |
| `metadata` | jsonb | không chứa secret |
| `ip_address` | inet | nullable |
| `created_at` | timestamptz | |

---

## ER diagram (draft)

```text
profiles 1───* user_api_keys
profiles 1───* scan_runs 1───* scan_results
profiles 1───* saved_leads
profiles 1───* subscriptions
profiles 1───* audit_logs (actor / target)
scan_results 0───1 saved_leads (optional link)
```

---

## Draft — API routes

Base path đề xuất: `/api/...` (Next.js Route Handlers). Auth: session Supabase (cookie) trừ webhook/public.

| Nhóm | Method | Path (draft) | Mô tả ngắn |
|------|--------|--------------|------------|
| **auth** | POST | `/api/auth/callback` | OAuth/email callback (nếu dùng) |
| | POST | `/api/auth/signout` | Đăng xuất server |
| **settings / api-keys** | GET | `/api/settings/api-keys` | Danh sách key (masked) |
| | PUT | `/api/settings/api-keys` | Upsert key theo `provider` |
| | DELETE | `/api/settings/api-keys/:provider` | Xóa key |
| | POST | `/api/settings/api-keys/validate` | Test key với provider |
| **keyword-discovery** | POST | `/api/keyword-discovery` | Bắt đầu scan SerpAPI |
| | GET | `/api/keyword-discovery/:runId` | Trạng thái + kết quả (paginate) |
| **domain-scan** | POST | `/api/domain-scan` | Bắt đầu scan Hunter (và/hoặc pipeline) |
| | GET | `/api/domain-scan/:runId` | Trạng thái + kết quả |
| **saved-leads** | GET | `/api/saved-leads` | List + filter |
| | POST | `/api/saved-leads` | Lưu từ result hoặc body |
| | PATCH | `/api/saved-leads/:id` | Sửa notes/tags |
| | DELETE | `/api/saved-leads/:id` | Xóa |
| **exports** | POST | `/api/exports` | Tạo export CSV/JSON (scan hoặc saved) |
| | GET | `/api/exports/:id` | Tải file / signed URL |
| **scan-history** | GET | `/api/scan-history` | List `scan_runs` |
| | GET | `/api/scan-history/:runId` | Chi tiết run + results |
| | DELETE | `/api/scan-history/:runId` | Xóa run (và cascade results) |
| **admin** | GET | `/api/admin/users` | Danh sách user (admin) |
| | GET | `/api/admin/users/:id` | Chi tiết user + subscription |
| | PATCH | `/api/admin/users/:id` | Disable, đổi plan |
| | GET | `/api/admin/audit-logs` | Filter audit |
| | GET | `/api/admin/stats` | Thống kê scan/export |

### Server Actions (draft — thay thế một phần REST)

Có thể dùng Server Actions cho form Settings, Saved Leads CRUD đơn giản — quyết định cụ thể ở phase 02–03. Contract dữ liệu giữ nguyên như bảng trên.

---

## Request/response ví dụ (pseudo, chưa implement)

**POST `/api/domain-scan`**

```json
{
  "domains": ["example.com"],
  "options": { "limit": 50 }
}
```

**Response 202**

```json
{
  "runId": "uuid",
  "status": "pending"
}
```

---

## Ngoài phạm vi draft (ghi nhận sau)

- Webhook Stripe
- Realtime progress (Supabase Realtime / SSE)
- Team / multi-tenant workspace
- Public API cho bên thứ ba

---

## Checklist trước khi implement (phase 03+)

- [ ] Chốt encryption cho `user_api_keys`
- [ ] RLS policy từng bảng
- [ ] Quota theo `subscriptions.metadata`
- [ ] OpenAPI hoặc shared Zod schema giữa client/server
- [ ] Không commit secret; chỉ env trên Vercel + Supabase dashboard
