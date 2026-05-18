# Tool Data Mail Web — UI/UX Design Brief

> Source brief provided by user. See companion file `Tool Data Mail Web - Design Handoff.html` for the full visual + spec output.

## Product
Tool Data Mail hiện đã có bản desktop app dùng Wails + Go + React (License Activation, Hunter.io, SerpAPI/Keyword Discovery, Domain Scan, Results Table, Saved Leads, Export CSV/JSON, Scan History). Mục tiêu: thiết kế bản web để khách dùng trực tiếp trên trình duyệt.

## Target user
- Sales, marketing, B2B outreach
- Chủ doanh nghiệp nhỏ
- Người cần tìm email công ty từ keyword hoặc domain
- Không rành kỹ thuật → thao tác phải đơn giản

## Design language
- SaaS dashboard hiện đại; rõ flow; không màu mè.
- Cảm giác tin cậy, business, sạch sẽ.
- Ưu tiên dễ dùng hơn nhiều hiệu ứng.
- Tiếng Việt rõ ràng, thân thiện, gọn.

## Main flow
1. Đăng nhập → 2. Dashboard → 3. Cấu hình API key → 4. Keyword Discovery / Domain Scan → 5. Xem kết quả → 6. Lọc → 7. Lưu vào Saved Leads → 8. Export → 9. Xem History.

## Pages
Login • Dashboard • Settings/API Keys • Keyword Discovery • Domain Scan (Input → Preview → Scan → Results) • Results Table • Saved Leads • Scan History • Export Modal • Subscription/License • Admin Dashboard.

## UX rules
1. Không kỹ thuật quá. 2. Luôn giải thích API key dùng làm gì. 3. Luôn preview trước scan tốn quota. 4. Cảnh báo khi limit cao. 5. Empty state rõ. 6. Data table là phần mạnh nhất. 7. Export CSV dễ thấy. 8. Saved Leads như mini-CRM. 9. Web app không có "Open output folder" → thay bằng "Download CSV/JSON". 10. Không có Machine ID offline → thay bằng login/subscription.
