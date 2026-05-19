# Saved Leads — Phase 09C (foundation)

> Trạng thái: **foundation / demo** — lưu lead qua API in-memory trên server, **chưa** ghi bảng `saved_leads` trên Supabase. Dữ liệu theo `session.id` (demo HMAC cookie).

## 1. Mục đích

Cho phép user đã đăng nhập:

1. Chọn lead từ kết quả Domain Scan (`/scan` → Results).
2. Bấm **Lưu lead đã chọn** → `POST /api/leads`.
3. Xem / tìm / xóa / tải CSV tại `/leads`.

Dedupe: cùng **email + domain** (không phân biệt hoa thường) chỉ lưu một lần.

## 2. Giới hạn hiện tại

| Hạng mục | Phase 09C |
|----------|-----------|
| Storage | `globalThis` Map in-memory trên Node server |
| Persist sau restart / cold start Vercel | **Không** — có thể mất toàn bộ |
| Đồng bộ đa thiết bị | **Không** |
| CRM status (contacted, tags, notes) | **Chưa** — chỉ lưu verification status từ scan |
| Billing / quota | **Không** |
| Supabase Auth | **Chưa** — vẫn demo session Phase 03 |

Đây **không phải** CRM production. UI và docs ghi rõ để tránh hiểu nhầm.

## 3. Files

```
src/lib/leads/
├── types.ts          # SavedLeadRecord, SaveLeadInput
├── store.ts          # server-only in-memory store (per userId)
├── validate.ts       # parseSaveLeadInput
├── export-csv.ts     # CSV escape + download helper (client)
└── sanitize.ts       # API error sanitizer

src/app/api/leads/
├── route.ts          # GET list, POST batch save
└── [id]/route.ts     # DELETE one lead

src/app/leads/
├── page.tsx          # requireSession + AppShell
└── leads-content.tsx # list, search, delete, export CSV

src/components/scan/domain-scan-wizard.tsx
└── ScanResultsView   # wire "Lưu lead đã chọn"
```

## 4. API

### `GET /api/leads`

- Auth: cookie session (`getSession()`), 401 nếu chưa login.
- Response: `{ leads: SavedLeadRecord[], storage: "memory" }`

### `POST /api/leads`

Body:

```json
{
  "leads": [
    {
      "email": "a@example.com",
      "name": "Nguyễn A",
      "title": "CEO",
      "company": "Example Co",
      "domain": "example.com",
      "confidence": 90,
      "status": "verified",
      "source": "mock"
    }
  ]
}
```

- `status`: `verified` | `accept_all` | `webmail`
- Tối đa **100** lead / request
- Response: `{ savedCount, duplicateCount, saved[], duplicates[], storage: "memory" }`

### `DELETE /api/leads/[id]`

- 404 nếu id không thuộc user hiện tại

## 5. Luồng UI

### Domain Scan → Lưu

1. `/scan` — chạy scan (mock hoặc Hunter).
2. Results — tick checkbox, **Lưu lead đã chọn**.
3. Alert xanh: số lead mới + số trùng; link **Xem Saved Leads →**.

### Saved Leads page

1. `/leads` — banner amber giải thích in-memory.
2. Ô tìm theo email / domain / công ty / tên.
3. Nút **Tải CSV** (toàn bộ hoặc theo filter).
4. Icon thùng rác — `DELETE /api/leads/[id]`.

Empty state:

> Chưa có lead nào được lưu. Hãy scan domain và lưu lead từ bảng kết quả trên trang Domain Scan.

## 6. CSV export

Cột: `email, name, title, company, domain, confidence, status, source, savedAt`

UTF-8 BOM (`\uFEFF`) để Excel mở tiếng Việt đúng. Field có dấu phẩy/newline được quote theo RFC.

## 7. Phase tiếp theo (deferred)

- [ ] Persist `saved_leads` qua Supabase + RLS
- [ ] CRM fields: tags, notes, pipeline status
- [ ] Lưu từ `/results` và Keyword Discovery
- [ ] Export JSON + signed URL
- [ ] Đồng bộ badge sidebar theo count thật

**Phụ thuộc:** Supabase Auth migration (để FK `saved_by` / workspace hợp lệ).
