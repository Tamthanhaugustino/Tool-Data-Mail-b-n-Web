# Auth foundation — Phase 03 + 09E

> Trạng thái: **hybrid foundation**. Supabase Auth được ưu tiên khi env/cookie sẵn sàng; nếu không, app fallback demo users + cookie HMAC để không phá local/dev flow.

## Tóm tắt quyết định

Auth giai đoạn này dùng adapter `Session` chung:

- Supabase Auth: `getSession()` đọc `createSupabaseServerClient().auth.getUser()` và map về `Session`.
- Demo fallback: nếu Supabase chưa cấu hình hoặc không có Supabase session, app đọc cookie HMAC `tdm_session`.
- Login: `signInAction()` thử `supabase.auth.signInWithPassword()` trước, sau đó fallback demo credentials.
- Middleware: chấp nhận cookie demo hoặc Supabase user hợp lệ; `/admin/*` vẫn dựa trên `Session.role`.

Demo HMAC vẫn giữ vì local build phải chạy được khi thiếu Supabase env.

## Files

```text
src/lib/auth/
├── types.ts             # Session, Role, Plan, AUTH_COOKIE, SESSION_MAX_AGE
├── jwt.ts               # signSession / verifySession (HMAC-SHA256)
├── session.ts           # getSession / requireSession / requireAdmin (Supabase-first)
├── supabase-session.ts  # map Supabase user metadata về Session
├── demo-users.ts        # Demo credentials fallback
└── actions.ts           # signInAction / signOutAction
middleware.ts            # Protect routes bằng demo cookie hoặc Supabase cookie
```

## Demo accounts

| Email | Mật khẩu | Role |
|---|---|---|
| `trang.nguyen@vietsoftware.com.vn` | `demo123` | user |
| `admin@tooldatamail.dev` | `admin123` | admin |

Demo users nằm trong `src/lib/auth/demo-users.ts` và sẽ chỉ nên giữ tới khi owner xác nhận Supabase Auth production đã thay thế hoàn toàn.

## Environment variables

Biến tối thiểu cho demo fallback:

```bash
AUTH_SECRET=<>=16 ký tự bất kỳ; production bắt buộc>
```

Biến Supabase Auth hybrid:

```bash
NEXT_PUBLIC_SUPABASE_URL=<project url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

`SUPABASE_SERVICE_ROLE_KEY` không cần cho login Supabase Auth, nhưng vẫn cần cho các server admin/persistence flow như Saved Leads 09D. Service role không được import vào client.

## Route protection

Hai lớp:

1. **Middleware** (`middleware.ts`) chạy trước page render. Nếu có cookie demo hợp lệ hoặc Supabase Auth user hợp lệ thì cho qua. Nếu không có session, redirect `/login?from=<original>`.
2. **Server component / API route** gọi `getSession()` hoặc `requireSession()` để defense-in-depth. API `/api/*` vẫn tự check session vì middleware matcher bỏ qua API routes.

Public routes: `/` và `/login`.

## Session contract

```ts
export type Session = {
  id: string;
  email: string;
  name: string;
  initials: string;
  plan: "PRO" | "BASIC" | "TRIAL";
  role: "user" | "admin";
  authProvider?: "demo" | "supabase";
};
```

Với Supabase Auth, `Session.id = auth.users.id`. Với demo fallback, `Session.id` vẫn là text như `u-trang`, nên các bảng app phase 09D đang dùng `user_id text` vẫn build/run an toàn.

## Chưa làm

- Đăng ký user, quên mật khẩu, đổi mật khẩu thật.
- Seed/tạo demo accounts trong Supabase Auth.
- Đọc role/plan từ `profiles`/subscription DB; hiện Supabase user dùng metadata/default.
- Disable demo HMAC fallback.
- Migrate `app_saved_leads.user_id` demo text sang Supabase UUID nếu cần giữ dữ liệu cũ.
- OAuth Google.

## Production-only Supabase Auth checklist

1. Apply Supabase schema và trigger profile/workspace nếu dùng `profiles`.
2. Tạo/seed users trong Supabase Auth.
3. Set `app_metadata.role = "admin"` cho admin nếu vẫn muốn middleware check admin bằng metadata.
4. Đọc role/plan từ DB thay vì metadata/default.
5. Migrate dữ liệu demo user_id nếu cần.
6. Tắt demo fallback và bỏ `AUTH_SECRET` khi không còn cần HMAC.
