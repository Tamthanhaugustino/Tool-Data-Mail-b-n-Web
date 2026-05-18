# Quyết định kỹ thuật — Tool Data Mail Web

> Tài liệu **đề xuất** cho MVP và giai đoạn đầu. Có thể điều chỉnh sau phase planning & UI handoff; mọi thay đổi lớn nên ghi lại tại đây.

## Nguyên tắc chung

1. **Desktop và Web là hai source riêng** — repo `tool-data-mail-web` không phụ thuộc git/submodule vào `b2b-lead-finder`; chỉ tham chiếu nghiệp vụ.
2. **Không copy secret từ desktop** — không import file `.env`, license key, Hunter/SerpAPI key, hay credential từ máy dev desktop vào repo web.
3. **API key không xuất hiện ở frontend** — browser không gọi trực tiếp Hunter/SerpAPI với key user; mọi gọi dịch vụ bên thứ ba đi qua backend (API routes / server actions).
4. **Secrets chỉ trên server & Supabase** — biến môi trường trên Vercel (hoặc tương đương); key user lưu DB có mã hóa/at-rest policy (chi tiết khi implement phase 03).

---

## Stack đề xuất

### Frontend

| Thành phần | Lựa chọn | Ghi chú |
|------------|----------|---------|
| Framework | **Next.js** (App Router) | SSR/SSG, routing, API colocation |
| Ngôn ngữ | **TypeScript** | Type-safe cho API contract & UI |
| Styling | **Tailwind CSS** | Nhanh prototype, đồng bộ design tokens |
| UI components | **shadcn/ui** | Accessible primitives, tùy biến copy vào repo |

### Backend (MVP)

| Thành phần | Lựa chọn | Ghi chú |
|------------|----------|---------|
| API layer | **Next.js Route Handlers** + **Server Actions** | Đủ cho MVP; tránh service riêng sớm |
| Runtime | Node trên Vercel | Edge chỉ dùng khi có lý do rõ (latency, không cần secret dài) |

*Sau MVP:* nếu job scan nặng hoặc queue dài, cân nhắc worker (Supabase Edge Functions, Inngest, hoặc service tách) — **chưa quyết định**.

### Database & Auth

| Thành phần | Lựa chọn | Ghi chú |
|------------|----------|---------|
| Database | **Supabase (PostgreSQL)** | Bảng app, RLS theo `user_id` |
| Auth | **Supabase Auth** | Email/password hoặc OAuth (OAuth: phase sau nếu cần) |
| Storage (tùy chọn) | Supabase Storage | Export file tạm, avatar — phase sau |

### Deploy & vận hành

| Thành phần | Lựa chọn |
|------------|----------|
| Hosting | **Vercel** (gắn repo Git) |
| DB/Auth host | **Supabase Cloud** |
| Env | `NEXT_PUBLIC_*` chỉ cho URL anon Supabase; **không** đặt Hunter/SerpAPI key trong `NEXT_PUBLIC_` |

### Tích hợp bên thứ ba (nghiệp vụ)

| Dịch vụ | Vai trò | Gọi từ |
|---------|---------|--------|
| Hunter.io | Email discovery theo domain | Server only |
| SerpAPI | Keyword / SERP discovery | Server only |

User tự nhập key trong **Settings → API Keys**; backend đọc từ DB (đã mã hóa) khi chạy scan — xem draft [`API_DATABASE_DRAFT.md`](./API_DATABASE_DRAFT.md).

---

## Kiến trúc logic (MVP)

```text
[Browser]
    → Next.js pages (React + shadcn)
    → Server Actions / Route Handlers (session từ Supabase)
        → Supabase (Postgres + RLS)
        → Hunter.io / SerpAPI (server-side, key từ user_api_keys)
```

---

## Bảo mật & compliance (tối thiểu)

- **RLS** trên mọi bảng có `user_id`.
- **Rate limit** trên route scan (phase 04+) — tránh lạm dụng quota API.
- **Audit log** cho thao tác nhạy cảm (đổi key, export hàng loạt, admin) — xem draft bảng `audit_logs`.
- **Không log** full API key trong application logs.

---

## Những gì cố ý *không* làm ở giai đoạn planning

- Không scaffold Next.js trong repo cho đến khi UI handoff sẵn sàng (phase Web 02).
- Không thêm file `.env` mẫu có key thật vào git.
- Không sửa hoặc commit vào repo `b2b-lead-finder`.

---

## Câu hỏi mở (review sau UI handoff)

- [ ] OAuth providers nào (Google) cho đăng nhập?
- [ ] Mã hóa `user_api_keys` — Supabase Vault vs app-level encryption?
- [ ] Subscription: Stripe vs license key giống desktop?
- [ ] Giới hạn scan theo gói (quota) — lưu ở `subscriptions` hay feature flags?

Khi chốt, cập nhật file này và `API_DATABASE_DRAFT.md`.
