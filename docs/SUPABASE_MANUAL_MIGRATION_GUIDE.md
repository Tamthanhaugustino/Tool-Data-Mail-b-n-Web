# Supabase Manual Migration Guide

> Cách chạy migration 0001–0005 **một lần duy nhất** bằng cách copy-paste file SQL gộp vào Supabase SQL Editor.
>
> Đây là cách đơn giản nhất, không cần CLI. Phù hợp khi setup Supabase project lần đầu hoặc khi cần re-apply.
>
> Khi đã quen, có thể dùng [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) (chạy từng migration một) hoặc Supabase CLI (`supabase db push`).

---

## ⚠ Lưu ý trước khi bắt đầu

**Supabase SQL Editor chỉ chấp nhận lệnh SQL**, KHÔNG phải lệnh PowerShell hay shell.

Nếu lỡ paste lệnh PowerShell như `Get-Content ... | Set-Clipboard` vào ô SQL Editor:
- Supabase sẽ báo lỗi syntax SQL.
- **Không hỏng gì** — chỉ là editor không hiểu lệnh đó.
- Chỉ cần xóa hết nội dung trong ô và làm lại đúng quy trình bên dưới.

PowerShell chạy trong **terminal Windows** (không phải trong trình duyệt). SQL chạy trong **SQL Editor của Supabase** (trong trình duyệt). Hai chỗ khác nhau hoàn toàn.

---

## Bước 1 — Copy SQL vào clipboard

Mở **PowerShell** (Start → "Windows PowerShell") rồi `cd` vào repo:

```powershell
cd "C:\Code\Tool Đào Mail\tool-data-mail-web"
Get-Content supabase\migrations\ALL_0001_0005_apply_once.sql -Raw | Set-Clipboard
```

Lệnh thứ 2:
- `Get-Content -Raw` đọc toàn bộ file vào 1 string (không phải mảng từng dòng).
- `Set-Clipboard` đẩy vào clipboard Windows.

Sau khi chạy không có output gì → là đúng. Clipboard đã có ~700 dòng SQL.

> Cross-platform thay thế:
> - macOS: `cat supabase/migrations/ALL_0001_0005_apply_once.sql | pbcopy`
> - Linux: `cat supabase/migrations/ALL_0001_0005_apply_once.sql | xclip -selection clipboard`

---

## Bước 2 — Mở Supabase SQL Editor

1. Mở trình duyệt → đăng nhập [supabase.com/dashboard](https://supabase.com/dashboard).
2. Chọn project (vd `tool-data-mail-prod` hoặc `tool-data-mail-staging`).
3. Sidebar trái → **SQL Editor**.
4. Bấm **New query** (nút `+` góc trên-phải khu vực editor) để tạo query trống.

---

## Bước 3 — Dán & Run

1. Click vào ô editor (vùng trống lớn ở giữa).
2. **Xóa hết nội dung cũ** (nếu có): `Ctrl+A` → `Delete`.
3. Dán SQL từ clipboard: `Ctrl+V`.
4. Bấm nút **Run** (góc dưới-phải, hoặc `Ctrl+Enter`).
5. Đợi ~5–15 giây.

Khi xong, panel kết quả bên dưới hiện thông báo (vd `Success. No rows returned`) hoặc warning nhẹ — đó là bình thường nếu migration tạo table/trigger.

> Nếu báo lỗi đỏ:
> - Đọc message trong panel kết quả.
> - Lỗi phổ biến: paste nhầm lệnh shell vào (xem **Lưu ý** ở đầu) → xóa hết → làm lại Bước 1.
> - Nếu migration đã chạy 1 phần (vd 0001 OK nhưng 0003 fail) → **không sao**, mọi migration đều idempotent (`create if not exists` …) — chỉ cần Run lại cả file.

---

## Bước 4 — Verify

Sidebar trái → **Table Editor**. Phải thấy đủ các bảng sau (cuộn xuống schema `public`):

### Từ migration 0001 (workspace-scoped, chưa wire active)
- `profiles`
- `workspaces`
- `memberships`
- `user_api_keys`
- `discovery_runs`
- `scan_jobs`
- `scan_results`
- `saved_leads`
- `exports`
- `billing_subscriptions`
- `audit_logs`

### Từ migration 0002–0005 (active, dùng cho app hiện tại)
- `app_saved_leads`              ← Phase 09D (Saved Leads persist)
- `app_user_api_keys`            ← Phase 09F (User API Keys encrypted)
- `app_scan_jobs`                ← Phase 09G (Domain Scan history)
- `app_scan_results`             ← Phase 09G (Scan results)
- `app_usage_events`             ← Phase 09H (Usage tracking)

Nếu thiếu bảng nào → Run lại file (idempotent, an toàn).

---

## Bước 5 — Verify từ app

Mở terminal khác:

```powershell
curl http://localhost:3000/api/health/supabase
```

Mong đợi:

```json
{ "service": "supabase", "configured": true, "ok": true, "latencyMs": 123 }
```

Nếu `ok: false, error: "relation app_X does not exist"` → migration thiếu bảng đó, Run lại file gộp.

Nếu `configured: false, reason: "missing_public_env"` → chưa điền env Supabase trong `.env.local` (không phải lỗi migration). Xem [`PRODUCTION_DEPLOY_RUNBOOK.md §6`](./PRODUCTION_DEPLOY_RUNBOOK.md).

---

## Khi nào cần Run lại?

- Sau khi clone repo lên project Supabase mới.
- Sau khi `drop table` tay (xem [`PRODUCTION_DEPLOY_RUNBOOK.md §9.2`](./PRODUCTION_DEPLOY_RUNBOOK.md)).
- Sau khi reset Supabase project.

**Không cần** Run lại khi:
- Restart `npm run dev` (env reload nhưng schema không đổi).
- Đổi `APP_ENCRYPTION_KEY` (chỉ ảnh hưởng ciphertext, không ảnh hưởng schema).

---

## Phụ lục — Cách khác

| Cách | Phù hợp khi | Tham khảo |
|---|---|---|
| Copy file gộp `ALL_0001_0005_apply_once.sql` (bài này) | Setup lần đầu, không có CLI | — |
| Mở từng file 0001 → 0005 trong VS Code, copy thủ công | Muốn theo dõi từng migration | [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) |
| Supabase CLI `supabase db push` | Đã có CLI + linked project | [Supabase docs](https://supabase.com/docs/guides/cli/local-development) |
| psql `\i 0001_initial_schema.sql` | Quen psql + có connection string | Tự setup |

Cách 1 đơn giản nhất cho owner non-DBA. Cách 3 tốt nhất cho team có CI.
