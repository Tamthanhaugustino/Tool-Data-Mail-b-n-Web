# Trạng thái dự án — Tool Data Mail Web

> Cập nhật: giai đoạn khởi tạo repo & planning (chưa có code ứng dụng).

## Tóm tắt

**Tool Data Mail Web** là repo source riêng cho bản Web App/SaaS, tách khỏi desktop app **b2b-lead-finder**. Hiện repo chỉ chứa tài liệu và kế hoạch; chưa có implementation.

## Trạng thái hiện tại của repo

| Hạng mục | Trạng thái |
|----------|------------|
| Git repo | Đã khởi tạo (`main`) |
| README | Có — [`README.md`](../README.md) |
| UI brief cho design | Có — [`plans/tool-data-mail-web-ui-brief.md`](../plans/tool-data-mail-web-ui-brief.md) |
| Planning docs (`docs/`) | Đang được điền (`PROJECT_STATE`, `TECH_DECISION`, `PHASE_PLAN`, `API_DATABASE_DRAFT`) |
| UI/UX handoff | Claude Design đang thiết kế; file dự kiến: [`docs/ui-design-handoff.md`](./ui-design-handoff.md) (chưa có nội dung) |
| Frontend app | **Chưa có** (chưa scaffold Next.js) |
| Backend / API | **Chưa có** |
| Database | **Chưa có** |
| Deploy / CI | **Chưa có** |
| Secrets / API keys trong repo | **Không có** (và không được thêm) |

## Cấu trúc thư mục hiện tại (ước lượng)

```text
tool-data-mail-web/
├── README.md
├── plans/
│   └── tool-data-mail-web-ui-brief.md
└── docs/
    ├── PROJECT_STATE.md          ← file này
    ├── TECH_DECISION.md
    ├── PHASE_PLAN.md
    ├── API_DATABASE_DRAFT.md
    └── ui-design-handoff.md      ← chờ Claude Design
```

## Quan hệ với desktop app

- **Desktop (Tool Data Mail gốc):** vẫn nằm tại project **`b2b-lead-finder`** — logic Keyword Discovery, Domain Scan, Hunter.io, SerpAPI, Saved Leads, Export, Scan History, License, Settings, v.v.
- **Web (repo này):** phát triển độc lập; tham chiếu nghiệp vụ từ desktop nhưng **không copy source**, **không copy secret/API key/license** từ desktop.

## Đang làm

1. **Planning & tài liệu kỹ thuật** — stack, phase, draft API/DB (xem các file trong `docs/`).
2. **UI/UX (Claude Design)** — wireframe/mockup/handoff dựa trên UI brief; output vào `docs/ui-design-handoff.md`.

## Chưa làm / chưa bắt đầu

- Scaffold Next.js hoặc bất kỳ app code nào
- Supabase project, schema migration, RLS
- Tích hợp Hunter.io / SerpAPI trên server
- Auth production, billing, admin dashboard code
- Deploy Vercel

## Rủi ro / lưu ý

- Mọi API key của user phải lưu và gọi **phía server**; không đưa key vào frontend hoặc commit repo.
- Draft API/DB trong `API_DATABASE_DRAFT.md` có thể thay đổi sau khi có UI handoff và review phase 02–03.

## Liên kết tài liệu

| File | Mục đích |
|------|----------|
| [README.md](../README.md) | Giới thiệu project |
| [plans/tool-data-mail-web-ui-brief.md](../plans/tool-data-mail-web-ui-brief.md) | Brief cho Claude Design |
| [TECH_DECISION.md](./TECH_DECISION.md) | Đề xuất stack & nguyên tắc bảo mật |
| [PHASE_PLAN.md](./PHASE_PLAN.md) | Lộ trình phase Web 01–07 |
| [API_DATABASE_DRAFT.md](./API_DATABASE_DRAFT.md) | Draft bảng DB & API (chưa implement) |
