# Tool Data Mail Web

Bản **Web App / SaaS** của [Tool Data Mail](https://github.com/Tamthanhaugustino/Tool-Data-Mail-b-n-Web) — giúp khách hàng tìm email doanh nghiệp từ **keyword** hoặc **domain** trực tiếp trên trình duyệt, không cần cài app desktop.

Desktop app (logic gốc) phát triển riêng tại project **`b2b-lead-finder`**. Repo này là source web độc lập; không copy secret, license hay API key từ desktop.

**Repository:** [github.com/Tamthanhaugustino/Tool-Data-Mail-b-n-Web](https://github.com/Tamthanhaugustino/Tool-Data-Mail-b-n-Web)

---

## Current status

| Hạng mục | Trạng thái |
|----------|------------|
| Frontend prototype (UI shell + mock data) | **Done** — `npm run build` / `npm run lint` pass |
| Design handoff (`design/`) | Có — HTML/CSS mock + screenshots |
| Backend / API thật | Chưa có |
| Auth foundation (cookie HMAC + demo users) | **Done (Phase 03)** — xem [`docs/AUTH.md`](./docs/AUTH.md) |
| Supabase Auth hybrid foundation | **Done (Phase 09E)** — Supabase session/sign-in nếu env sẵn sàng, fallback demo HMAC |
| Database schema (SQL migration + TS types) | **Done (Phase 04 foundation)** — xem [`docs/DATABASE.md`](./docs/DATABASE.md) |
| Supabase client wiring (browser/server/admin) | **Done (Phase 05 prep)** — factories sẵn sàng, env-gated |
| Supabase setup guide + health check route | **Done (Phase 06)** — xem [`docs/SUPABASE_SETUP.md`](./docs/SUPABASE_SETUP.md) |
| Keyword Discovery backend (mock provider + API + UI wire) | **Done (Phase 07)** — xem [`docs/DISCOVERY.md`](./docs/DISCOVERY.md) |
| SerpAPI real provider (quota-safe, server-only) | **Done (Phase 08A)** — `SERPAPI_API_KEY` + `DISCOVERY_PROVIDER` env-gated |
| SerpAPI live smoke test + typed error UX | **Done (Phase 08B)** — 6 mã code → HTTP status + UI hint; offline smoke test ✓ |
| Domain Scan backend foundation (mock + API + UI wired) | **Done (Phase 08C)** — xem [`docs/SCAN.md`](./docs/SCAN.md) |
| Hunter.io real provider (quota-safe, server-only) | **Done (Phase 09A)** — `HUNTER_API_KEY` + `SCAN_PROVIDER` env-gated, max 5 domain/request |
| Hunter UX polish + 1-domain live guide | **Done (Phase 09B)** — over-cap UI hint, per-domain error display, regression OK |
| Saved Leads foundation (API + `/leads` + lưu từ scan) | **Done (Phase 09C)** — xem [`docs/SAVED_LEADS.md`](./docs/SAVED_LEADS.md) |
| Saved Leads Supabase persist (`app_saved_leads`) | **Done (Phase 09D)** — service role + migration 0002; fallback memory nếu chưa env |
| Supabase Auth migration production | Chưa hoàn tất — hybrid fallback, chưa bắt buộc Supabase Auth |
| User API Keys foundation | **Done (Phase 09F)** — encrypted personal Hunter/SerpAPI keys; env fallback |
| Billing / payment | Chưa có |
| Production deploy | Chưa có |

**Phase hiện tại:** [Phase 09E — Supabase Auth foundation](./docs/ROADMAP.md#phase-09e--supabase-auth-migration-foundation--done)

Chi tiết lộ trình: [`docs/ROADMAP.md`](./docs/ROADMAP.md)

---

## Tech stack

| Layer | Công nghệ |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack dev) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI | [shadcn/ui](https://ui.shadcn.com) + [lucide-react](https://lucide-react.dev) |
| Font | Geist / Geist Mono (`next/font`) |

Đề xuất stack tương lai (chưa implement): Supabase (Auth + Postgres), Vercel deploy — xem [`docs/TECH_DECISION.md`](./docs/TECH_DECISION.md).

---

## Available routes

| Route | Mô tả |
|-------|--------|
| `/` | Redirect → `/dashboard` |
| `/login` | Đăng nhập (UI mock) |
| `/dashboard` | Trang chủ workspace |
| `/discover` | Keyword Discovery |
| `/scan` | Domain Scan (Input → Preview → Scanning → Results) |
| `/results` | Bảng kết quả scan |
| `/leads` | Saved Leads |
| `/history` | Scan History |
| `/settings` | Settings · API Keys (mock connected / partial / error) |
| `/billing` | Subscription / gói |
| `/admin` | Admin dashboard |
| `/admin/users` | Quản lý người dùng (admin) |
| `/help` | Trợ giúp |

Tất cả route trừ `/` và `/login` đều **yêu cầu đăng nhập** (middleware redirect về `/login`). Route `/admin/*` yêu cầu role `admin`. Data nội bộ vẫn là mock cho tới Phase 04+.

---

## Local development

**Yêu cầu:** Node.js 20+ và npm.

```bash
git clone https://github.com/Tamthanhaugustino/Tool-Data-Mail-b-n-Web.git
cd Tool-Data-Mail-b-n-Web   # hoặc thư mục clone local của bạn
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Đăng nhập thử tại `/login`:

| Tài khoản demo | Mật khẩu | Role |
|---|---|---|
| `trang.nguyen@vietsoftware.com.vn` | `demo123` | user |
| `admin@tooldatamail.dev` | `admin123` | admin |

Auth giai đoạn này là hybrid: nếu Supabase Auth cookie hợp lệ thì dùng Supabase user, còn không fallback demo HMAC. Chi tiết: [`docs/AUTH.md`](./docs/AUTH.md).

### Environment

Copy `.env.example` sang `.env.local` rồi điền:

```bash
cp .env.example .env.local
```

| Biến | Bắt buộc | Mục đích |
|---|---|---|
| `AUTH_SECRET` | ≥16 ký tự, prod bắt buộc | Ký HMAC cookie session (Phase 03). Dev có fallback. |
| `NEXT_PUBLIC_SUPABASE_URL` | Phase 06+ | URL Supabase project. Public — safe ở browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Phase 06+ | Anon key Supabase. RLS protect data. |
| `SUPABASE_SERVICE_ROLE_KEY` | Phase 06+ | **Server-only.** Bypass RLS. KHÔNG đặt trong `NEXT_PUBLIC_*`. |
| `APP_ENCRYPTION_KEY` | Phase 09F | **Server-only.** Mã hóa API key cá nhân. Thiếu env thì không lưu plaintext. |

Phase 05–06 chỉ cần `AUTH_SECRET` để chạy local (Supabase client factories return `null` khi thiếu env nên `npm run build` vẫn pass). Khi muốn nối Supabase thật, làm theo [`docs/SUPABASE_SETUP.md`](./docs/SUPABASE_SETUP.md):

```bash
curl -s http://localhost:3000/api/health/supabase
# Chưa cấu hình:
# { "service":"supabase", "configured":false, "reason":"missing_public_env" }
# Đã cấu hình + apply schema:
# { "service":"supabase", "configured":true, "ok":true, "latencyMs":<n> }
```

Route này không trả secret — an toàn để gọi từ monitoring.

---

## Build & lint

```bash
npm run lint    # eslint .
npm run build   # next build (production)
npm run start   # chạy bản build (sau build)
```

---

## Project structure

```text
tool-data-mail-web/
├── design/                 # Design handoff (HTML partials, CSS, screenshots)
├── docs/
│   ├── ROADMAP.md          # Lộ trình phase 01–10 (canonical)
│   ├── AUTH.md             # Phase 03 auth foundation
│   ├── DATABASE.md         # Phase 04 DB foundation (schema + RLS plan)
│   ├── PROJECT_STATE.md    # Snapshot trạng thái (có thể lỗi thời)
│   ├── TECH_DECISION.md    # Đề xuất stack & bảo mật
│   ├── PHASE_PLAN.md       # Kế hoạch phase cũ (Web 01–07)
│   └── API_DATABASE_DRAFT.md
├── supabase/
│   └── migrations/         # SQL migrations (apply qua Supabase Studio/CLI)
├── plans/
│   └── tool-data-mail-web-ui-brief.md
├── public/
├── src/
│   ├── app/                # Next.js App Router (pages)
│   ├── components/
│   │   ├── layout/         # Sidebar 240px, Topbar 60px, AppShell
│   │   ├── scan/           # Domain scan wizard
│   │   ├── shared/         # ResultsTable, ExportModal, …
│   │   ├── prototype/      # Mock API status context
│   │   └── ui/             # shadcn components
│   └── lib/
│       ├── auth/           # Phase 03 — cookie HMAC session
│       ├── db/             # Phase 04 — TS types khớp DB schema
│       ├── supabase/       # Phase 05 — client factories (browser/server/admin) + health
│       ├── discovery/      # Phase 07/08 — Keyword Discovery (mock + SerpAPI)
│       ├── scan/           # Phase 08C — Domain Scan (mock provider, domain-utils)
│       ├── mock-data.ts
│       └── navigation.ts
├── middleware.ts
├── package.json
└── README.md
```

---

## Roadmap (tóm tắt)

| Phase | Nội dung | Trạng thái |
|-------|----------|------------|
| 01 | Frontend prototype scaffold | **Done** |
| 02 | Docs & SaaS planning | **Done** |
| 03 | Auth + user account foundation | **Done** (demo HMAC; bridge sang Supabase Auth ở Phase 06) |
| 04 | Database schema foundation | **Done** (SQL migration + TS types) |
| 05 | Supabase client wiring + auth migration prep | **Done** (browser/server/admin clients + health, env-gated) |
| 06 | Supabase project setup + health check | **Done** (setup guide + `/api/health/supabase`) |
| 07 | Keyword Discovery backend foundation | **Done** (mock provider + `/api/discovery/keyword` + wired `/discover`) |
| 08A | SerpAPI real provider (quota-safe) | **Done** (server-only fetch, env-gated, dynamic import) |
| 08B | SerpAPI live smoke test + typed error UX | **Done** (6 mã code → HTTP status + UI hint) |
| 08C | Domain Scan backend foundation | **Done** (mock provider + `/api/scan/domain` + wired wizard) |
| 09A | Hunter real provider (quota-safe) | **Done** (server-only fetch, env-gated, max 5 domain/request) |
| 09B | Hunter live smoke test + UX polish | **Done** |
| 09C | Saved Leads foundation | **Done** |
| 09D | Saved Leads Supabase persist | **Done** |
| 09E | Supabase Auth hybrid foundation | **Done** |
| 09F | User API Keys foundation | **Done** |
| 06 | Domain Scan job system | Planned |
| 07 | Results, Saved Leads, Export | Planned |
| 08 | Billing / subscription / credit limits | Planned |
| 09 | Admin dashboard | Planned |
| 10 | Deployment & production readiness | Planned |

Bảng đầy đủ, deliverable và phụ thuộc: **[`docs/ROADMAP.md`](./docs/ROADMAP.md)**

---

## Notes for future development

1. **Không commit secret** — không `.env` chứa Hunter/SerpAPI key; key user chỉ lưu server-side (xem draft DB).
2. **Desktop ≠ Web** — tham chiếu nghiệp vụ `b2b-lead-finder`, không merge source hay credential.
3. **API key không ở frontend** — mọi gọi Hunter/SerpAPI qua Route Handlers / server actions.
4. **Prototype context** — `PrototypeProvider` trong `AppShell` chỉ phục vụ demo trạng thái API; thay bằng session + API thật ở Phase 03+.
5. **Tài liệu kỹ thuật** — khi implement backend, cập nhật `API_DATABASE_DRAFT.md` và `TECH_DECISION.md` trước khi code migration.

---

## Related documentation

- [Roadmap](./docs/ROADMAP.md)
- [Auth foundation (Phase 03)](./docs/AUTH.md)
- [Database foundation (Phase 04)](./docs/DATABASE.md)
- [Supabase setup (Phase 06)](./docs/SUPABASE_SETUP.md)
- [Keyword Discovery backend (Phase 07)](./docs/DISCOVERY.md)
- [Domain Scan backend (Phase 08C)](./docs/SCAN.md)
- [Tech decisions](./docs/TECH_DECISION.md)
- [API & database draft](./docs/API_DATABASE_DRAFT.md)
- [UI brief](./plans/tool-data-mail-web-ui-brief.md)
