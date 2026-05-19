# Supabase setup — Phase 06

> Hướng dẫn provision Supabase project và apply schema cho **Tool Data Mail Web**. Phase 06 chỉ wiring foundation — auth của app vẫn dùng demo HMAC từ Phase 03, **không** swap sang Supabase Auth trong phase này.

## Trình tự ngắn gọn

1. Tạo Supabase project (cloud).
2. Lấy 3 giá trị env: URL, anon key, service role key.
3. Tạo `.env.local` từ `.env.example` và điền vào.
4. Apply migration `0001_initial_schema.sql` qua Supabase SQL Editor.
5. Verify bằng route `GET /api/health/supabase`.

Mỗi bước chi tiết bên dưới.

---

## 1. Tạo Supabase project

1. Vào [supabase.com](https://supabase.com), đăng nhập (GitHub/Google/email đều được).
2. **New project** → chọn org → đặt name (ví dụ `tool-data-mail-dev`), region gần Việt Nam (`Southeast Asia (Singapore)`), database password mạnh (lưu lại nếu cần).
3. Đợi ~2 phút project khởi tạo xong.

Khuyến nghị: tạo 2 project — `tool-data-mail-dev` và `tool-data-mail-prod` — nhưng Phase 06 chỉ cần 1 dev project.

---

## 2. Lấy env values

Trong Supabase Dashboard:

- **Settings → API** → tab **Project URL** → copy giá trị → `NEXT_PUBLIC_SUPABASE_URL`.
- **Settings → API** → block **Project API Keys** → row `anon` `public` → copy → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Settings → API** → row `service_role` `secret` → **reveal** → copy → `SUPABASE_SERVICE_ROLE_KEY`.

> ⚠️ **Service role key bypass RLS.** Đừng paste vào bất kỳ env nào prefix `NEXT_PUBLIC_*`. Đừng commit. Đừng share Slack/Discord. Repo này guard bằng `import "server-only"` ở [`src/lib/supabase/admin.ts`](../src/lib/supabase/admin.ts) — nếu lỡ import vào client component, Next.js sẽ vỡ build.

---

## 3. Tạo `.env.local`

```bash
cp .env.example .env.local
# rồi mở .env.local và điền 3 giá trị Supabase + AUTH_SECRET
```

`.env.local` đã được `.gitignore` từ Phase 03 — không lo commit nhầm. Nội dung mẫu (giá trị thật của anh ở chỗ `<...>`):

```bash
AUTH_SECRET=<>=16 ký tự — sinh bằng: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<eyJhbGciOi...>
SUPABASE_SERVICE_ROLE_KEY=<eyJhbGciOi... — KHÔNG commit>
```

Restart `npm run dev` sau khi cập nhật `.env.local` để Next.js đọc lại env.

---

## 4. Apply schema

Mở **SQL Editor** trong Supabase Dashboard:

1. **+ New query**.
2. Mở file [`supabase/migrations/0001_initial_schema.sql`](../supabase/migrations/0001_initial_schema.sql) ở repo, copy toàn bộ nội dung.
3. Paste vào SQL Editor → **Run**.
4. Verify ở **Database → Tables**: phải có 11 bảng (`profiles`, `workspaces`, `memberships`, `user_api_keys`, `discovery_runs`, `scan_jobs`, `scan_results`, `saved_leads`, `exports`, `billing_subscriptions`, `audit_logs`).

### Trigger `handle_new_user`

Khi migrate sang Supabase Auth (Phase 07+), uncomment block cuối file SQL để mỗi `auth.users` insert tự tạo profile + workspace + membership + subscription:

```sql
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

Phase 06 **chưa cần** trigger — app vẫn dùng demo auth, không insert vào `auth.users`.

### Migration Phase 09D — `app_saved_leads` (Saved Leads persist)

Sau `0001` (hoặc trên project trống chỉ cần function `set_updated_at` nếu đã có từ 0001):

1. Chạy [`supabase/migrations/0002_app_saved_leads.sql`](../supabase/migrations/0002_app_saved_leads.sql) trong SQL Editor.
2. Verify bảng **`app_saved_leads`** (khác `saved_leads` workspace trong 0001).
3. Đảm bảo `.env.local` có `SUPABASE_SERVICE_ROLE_KEY` — API leads dùng admin client server-only.
4. Mở `/leads` → banner xanh nếu persist OK; amber + `storageFallback` nếu thiếu bảng.

Chi tiết: [`SAVED_LEADS.md`](./SAVED_LEADS.md).

### Re-apply / reset

Nếu cần xoá hết để chạy lại migration:

```sql
-- DANGER: xoá toàn bộ data nghiệp vụ. Chỉ dùng ở dev project.
drop table if exists audit_logs, billing_subscriptions, exports,
  saved_leads, scan_results, scan_jobs, discovery_runs,
  user_api_keys, memberships, workspaces, profiles cascade;

drop type if exists subscription_status, plan_tier, export_status,
  export_format, export_kind, lead_status, result_status, run_status,
  api_provider, profile_role, membership_role cascade;
```

Sau đó chạy lại `0001_initial_schema.sql` từ đầu.

---

## 5. Verify bằng health check

App có route diagnostic công khai (excluded khỏi middleware auth):

```bash
# Chạy dev server
npm run dev

# Ở terminal khác
curl -s http://localhost:3000/api/health/supabase
```

### Kết quả mong đợi

| Tình huống | Response (JSON) |
|---|---|
| Chưa điền env public | `{ "service":"supabase", "configured":false, "reason":"missing_public_env" }` |
| Có public nhưng thiếu service role | `{ "service":"supabase", "configured":false, "reason":"missing_service_role_env" }` |
| Đã điền env + đã apply schema | `{ "service":"supabase", "configured":true, "ok":true, "latencyMs":<n> }` |
| Đã điền env, chưa apply schema | `{ "service":"supabase", "configured":true, "ok":false, "latencyMs":<n>, "error":"relation \"profiles\" does not exist" }` |
| URL/key sai | `{ "service":"supabase", "configured":true, "ok":false, "error":"..." }` |

Route luôn HTTP 200 — phân biệt healthy/degraded qua field `ok`. Error message đã sanitize (strip newline, mask URL/JWT, cắt 200 ký tự).

> Route này **không** trả URL, key hay bất kỳ giá trị env nào. Có thể để public mà không ảnh hưởng bảo mật.

---

## 6. Khi nào cần làm gì kế tiếp

- **Phase 09E là hybrid auth foundation.** Nếu `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` có sẵn và user có Supabase Auth session, app dùng Supabase user. Nếu chưa, demo HMAC vẫn chạy.
- Demo users `trang.nguyen@vietsoftware.com.vn / demo123` và `admin@tooldatamail.dev / admin123` vẫn login được.
- Để test Supabase Auth thật: tạo user trong Supabase Auth, bật email/password provider, rồi login bằng email/password đó. Role admin có thể set qua `app_metadata.role = "admin"` nếu cần vào `/admin`.
- Production-only migration còn deferred: seed users, đọc role/plan từ DB, disable demo fallback, và migrate `app_saved_leads.user_id` nếu cần.

---

## Checklist nhanh

- [ ] Project Supabase đã tạo
- [ ] `.env.local` có đủ 4 biến (`AUTH_SECRET` + 3 Supabase)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` **không** ở dòng `NEXT_PUBLIC_*`
- [ ] Migration `0001_initial_schema.sql` đã chạy thành công
- [ ] 11 bảng + enum types xuất hiện ở **Database → Tables / Types**
- [ ] `curl /api/health/supabase` trả `{ ok: true }`
