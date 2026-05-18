Project: tool-data-mail-web

Mục tiêu:
Khởi tạo tài liệu ban đầu cho bản Web App/SaaS của Tool Data Mail.

Bối cảnh:
Đây là source mới, tách riêng khỏi desktop app b2b-lead-finder.
Desktop app hiện tại đã có logic chính: Keyword Discovery, Domain Scan, Hunter.io, SerpAPI, Results Table, Saved Leads, Export CSV/JSON, Scan History, License/Activation, Settings.
Mục tiêu của project này là thiết kế và phát triển bản web để khách dùng trực tiếp trên trình duyệt.

Yêu cầu:
1. Tạo README.md giới thiệu project:
   - Tool Data Mail Web là gì
   - Desktop app nằm ở project b2b-lead-finder
   - Project này dùng để phát triển bản Web App/SaaS
   - Chưa có code production
   - Phát triển theo phase

2. Tạo file:
   plans/tool-data-mail-web-ui-brief.md

3. Nội dung brief cần đầy đủ cho Claude Design:
   - Mục tiêu thiết kế
   - Target user
   - Style SaaS dashboard
   - Các page cần có:
     Login
     Dashboard
     Settings/API Keys
     Keyword Discovery
     Domain Scan
     Results Table
     Saved Leads
     Scan History
     Export Modal
     Subscription/License
     Admin Dashboard
   - Navigation structure
   - Component list
   - Empty/loading/error states
   - Copy tone tiếng Việt
   - Developer handoff notes

4. Không code app thật.
5. Không tạo backend.
6. Không copy secret/API key/license.
7. Không sửa project b2b-lead-finder.

Sau khi xong, báo cáo bằng tiếng Việt:
- Đã tạo file nào
- Cấu trúc thư mục hiện tại
- Bước tiếp theo để đưa qua Claude Design