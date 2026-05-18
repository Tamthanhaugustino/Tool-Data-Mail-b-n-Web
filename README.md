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
| Auth (Supabase hoặc tương đương) | Chưa có |
| Database | Chưa có |
| Hunter.io / SerpAPI integration | Chưa có (chỉ mock trên UI) |
| Billing / payment | Chưa có |
| Production deploy | Chưa có |

**Phase hiện tại:** [Phase 02 — Docs & SaaS planning](./docs/ROADMAP.md#phase-02--docs-and-saas-planning--current)

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

Tất cả route app dùng **mock data** và **local state**; chưa có route handler production.

---

## Local development

**Yêu cầu:** Node.js 20+ và npm.

```bash
git clone https://github.com/Tamthanhaugustino/Tool-Data-Mail-b-n-Web.git
cd Tool-Data-Mail-b-n-Web   # hoặc thư mục clone local của bạn
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Đăng nhập thử: `/login` → submit form → chuyển `/dashboard` (mock, không auth thật).

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
│   ├── PROJECT_STATE.md    # Snapshot trạng thái (có thể lỗi thời)
│   ├── TECH_DECISION.md    # Đề xuất stack & bảo mật
│   ├── PHASE_PLAN.md       # Kế hoạch phase cũ (Web 01–07)
│   └── API_DATABASE_DRAFT.md
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
│       ├── mock-data.ts
│       └── navigation.ts
├── package.json
└── README.md
```

---

## Roadmap (tóm tắt)

| Phase | Nội dung | Trạng thái |
|-------|----------|------------|
| 01 | Frontend prototype scaffold | **Done** |
| 02 | Docs & SaaS planning | **Current** |
| 03 | Auth + user account foundation | Planned |
| 04 | Database schema + lead/project models | Planned |
| 05 | Keyword Discovery real workflow | Planned |
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
- [Tech decisions](./docs/TECH_DECISION.md)
- [API & database draft](./docs/API_DATABASE_DRAFT.md)
- [UI brief](./plans/tool-data-mail-web-ui-brief.md)
