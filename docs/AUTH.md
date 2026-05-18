# Auth foundation — Phase 03

> Trạng thái: **prototype-ready**. Demo users in-memory + cookie session ký HMAC. Chưa nối DB / Supabase Auth.

## Tóm tắt quyết định

Auth giai đoạn này dùng **session ký HMAC trong HttpOnly cookie**, không thêm dependency và không phụ thuộc backend ngoài. Ưu điểm:

- Không thêm thư viện (chỉ dùng Web Crypto có sẵn trên Node + Edge).
- Chạy được trên Vercel Edge middleware → bảo vệ route trước khi page render.
- Contract `Session` rõ ràng (`src/lib/auth/types.ts`) — dễ thay sang Supabase Auth / NextAuth khi có DB.
- Không expose secret ra client. Cookie là HttpOnly + SameSite=Lax + (Secure ở production).

Các phương án bị loại tạm thời:

| Lựa chọn | Lý do hoãn |
|---|---|
| Supabase Auth | Phase 03 chưa setup Supabase project, sẽ kích hoạt khi Phase 04 thêm DB. Contract `Session` hiện tại tương thích với `auth.users` của Supabase. |
| NextAuth/Auth.js | Cần adapter + provider config; với credentials-only thì chỉ chạy giống auth tự viết — dependency dư thừa cho prototype. |
| Clerk | Tốt nhưng là dịch vụ trả phí, dữ liệu user nằm ngoài DB của ta — không phù hợp khi ta sắp dựng schema riêng. |

## Files

```
src/lib/auth/
├── types.ts          # Session, Role, Plan, AUTH_COOKIE, SESSION_MAX_AGE
├── jwt.ts            # signSession / verifySession (HMAC-SHA256 qua Web Crypto)
├── session.ts        # getSession / requireSession / requireAdmin (server-only)
├── demo-users.ts     # Demo credentials (dev only)
└── actions.ts        # signInAction / signOutAction (server actions)
middleware.ts         # Bảo vệ tất cả route trừ /login và /
src/app/login/
├── page.tsx          # Server component, redirect khi đã đăng nhập
└── login-form.tsx    # Client component, dùng useActionState
src/components/layout/
├── topbar.tsx        # Hiển thị plan/role/initials thật từ session
└── user-menu.tsx     # Dropdown: Settings, Admin (chỉ admin), Đăng xuất
```

## Demo accounts

| Email | Mật khẩu | Role |
|---|---|---|
| `trang.nguyen@vietsoftware.com.vn` | `demo123` | user |
| `admin@tooldatamail.dev` | `admin123` | admin |

Demo users nằm trong `src/lib/auth/demo-users.ts` (bundled — sẽ xoá khi nối auth thật).

## Environment variables

Chỉ một biến duy nhất cho Phase 03:

```bash
# .env.local (KHÔNG commit)
AUTH_SECRET=<>=16 ký tự bất kỳ; trong production phải set>
```

Sinh giá trị nhanh:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Khi `AUTH_SECRET` thiếu trong **development**, code dùng giá trị mặc định không an toàn (kèm cảnh báo runtime). Trong **production** thiếu biến sẽ throw — không boot được app. Xem `src/lib/auth/jwt.ts`.

## Route protection

Hai lớp:

1. **Middleware** (`middleware.ts`) — chạy trên Edge trước khi render. Cookie không hợp lệ → redirect `/login?from=<original>`. Truy cập `/admin/*` với role ≠ admin → redirect `/dashboard`.
2. **Server component** — mọi protected page gọi `requireSession()` (hoặc `requireAdmin()` cho admin routes) ngay đầu file. Đây là defense-in-depth nếu middleware matcher bị bypass.

Public routes: `/` (redirect → `/dashboard`, middleware sẽ catch tiếp), `/login`.

## Session contract

```ts
// src/lib/auth/types.ts
export type Session = {
  id: string;
  email: string;
  name: string;
  initials: string;
  plan: "PRO" | "BASIC" | "TRIAL";
  role: "user" | "admin";
};
```

Khi nối Supabase Auth ở Phase 04+:

1. `signInAction` đổi từ `findDemoUser` → `supabase.auth.signInWithPassword`.
2. `getSession` đổi từ verify HMAC → `supabase.auth.getUser()` (vẫn trả về cùng `Session` shape).
3. `demo-users.ts` xoá hoặc giữ làm seed data cho `profiles` table.
4. `middleware.ts` tiếp tục verify cookie — chỉ thay nguồn cookie sang Supabase cookie helper.

## Cái CHƯA làm (out of scope Phase 03)

- Đăng ký user (chỉ admin tạo tài khoản qua hệ thống nội bộ — sẽ làm Phase 09).
- Quên / đổi mật khẩu thật (placeholder UI có sẵn).
- OAuth (Google) — nút disabled, sẽ làm khi đổi sang Supabase Auth.
- CSRF token riêng — server actions Next.js đã có built-in protection theo origin.
- Refresh token / rotation — không cần khi session là 30 ngày HMAC stateless.
- Audit log đăng nhập — chờ DB ở Phase 04.

## Khi nào chuyển sang Supabase Auth

Mốc đề xuất: ngay khi Phase 04 dựng schema (`profiles` table + RLS). Lúc đó:

- `Session.id` map thẳng vào `auth.users.id` (uuid).
- Role chuyển từ baked-in sang `profiles.role` (enum).
- Plan đọc từ `subscriptions` table thay vì cứng trong demo user.
- Bỏ `AUTH_SECRET`, dùng Supabase service-role + anon key (cấu hình ở Vercel).
