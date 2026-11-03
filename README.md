# 🪷 Cô Bé Hữu Duyên — Tâm Linh, Phong Thuỷ & Thiện Nguyện (`cobehuuduyen.com`)

Trang web chính thức của **Cô Bé Hữu Duyên** (`https://cobehuuduyen.com`), được thiết kế theo phong cách **Mỹ thuật Tâm linh & Phong thuỷ Á Đông** (hỗ trợ cả **Giao diện Tối Huyền Bí** và **Giao diện Sáng Thanh Tịnh**).

## ✨ Các Tính Năng Chính
1. **Điện Thờ & Phòng Tụng Kinh Online (3 Phòng Linh Thiêng):**
   - **Điện Phật Tam Bảo:** Tụng Bát Nhã Tâm Kinh & Niệm Phật A Di Đà.
   - **Điện Quán Thế Âm Bồ Tát:** Trì Chú Đại Bi cầu bình an, tiêu trừ tật bệnh.
   - **Điện Tam Toà Thánh Mẫu & Cô Bé:** Dâng văn khấn Mẫu & Cô Bé Hữu Duyên cầu tài lộc, hanh thông.
   - **Nghi lễ tương tác có âm thanh thực tế (Web Audio):** Đặt Pháp danh/Tên tín chủ, Dâng hương trầm (khói bay), Dâng hoa sen, Thắp đèn liên hoa, Thỉnh chuông Bát Nhã, Gõ mõ chạy chữ kinh tự động, Lần chuỗi 108 hạt tích công đức và Thả Đèn Hoa Đăng nguyện cầu.
2. **Xem Bói & Tâm Linh Tương Tác Trực Tiếp:**
   - **Xin Xăm Quán Âm**, **Gieo Quẻ Kinh Dịch 3 Đồng Xu Cổ**, **Bói Bài Tarot 3 Lá**, **Tra Cứu Mệnh Ngũ Hành & Vật Phẩm Hợp Tuổi**.
3. **Cửa Hàng Vật Phẩm (Hàng Mã, Phong Thuỷ, Ấn Phẩm Tâm Linh, Lưu Niệm Bình An) & Quỹ Từ Thiện:**
   - Giỏ Hàng Thông Minh + Mã **VietQR Vietcombank** (`0051000567270` – **Nguyễn Thị Thu Hồng**) tự động điền số tiền.
   - Khi khách bấm gửi đơn hàng, đặt lịch hoặc báo công đức qua Zalo/Facebook, hệ thống **đồng thời tự động bắn thông báo về nhóm Telegram** và **lưu vào Cloudflare D1 Database** qua Pages Function `/api/events`.

---

## 🤖 Hướng Dẫn Kết Nối Nhóm Telegram & Cloudflare D1 Database

Dự án đã tích hợp sẵn Serverless API tại [`functions/api/events.js`](functions/api/events.js) và cấu trúc bảng tại [`schema.sql`](schema.sql).

### Bước 1: Cài đặt tự động bắn tin nhắn về nhóm Telegram
1. Trên Telegram, nhắn tin cho `@BotFather` -> gõ `/newbot` để tạo 1 Bot và lấy mã **`TELEGRAM_BOT_TOKEN`** (ví dụ: `712345678:AAH...`).
2. Thêm Bot đó vào nhóm Telegram nhận đơn hàng/công đức của bạn, lấy **`TELEGRAM_CHAT_ID`** của nhóm (thường bắt đầu bằng dấu trừ, ví dụ `-100123456789`).
3. Vào **Cloudflare Dashboard** -> **Workers & Pages** -> chọn dự án **`cobehuuduyen`** -> **Settings** -> **Variables and Secrets** -> thêm 2 biến:
   - `TELEGRAM_BOT_TOKEN` = *(Mã token bot của bạn)*
   - `TELEGRAM_CHAT_ID` = *(ID nhóm Telegram của bạn)*

### Bước 2: Cài đặt lưu lịch sử vào Cloudflare D1 Database (Tuỳ chọn)
1. Trong **Cloudflare Dashboard** -> vào mục **Storage & Databases** -> **D1 SQL Database** -> bấm **Create Database** -> đặt tên là `cobehuuduyen-db`.
2. Vào tab **Console** của `cobehuuduyen-db`, dán nội dung file [`schema.sql`](schema.sql) vào và bấm **Execute** để tạo bảng `spiritual_events`.
3. Quay lại dự án Pages **`cobehuuduyen`** -> **Settings** -> **Bindings** -> bấm **Add** -> chọn **D1 database**:
   - **Variable name:** `DB`
   - **D1 database:** chọn `cobehuuduyen-db`
4. Lưu lại. Từ lần deploy tiếp theo, mọi đơn hàng, đặt lịch, công đức và lời cầu nguyện trong Phòng Tụng Kinh đều vừa được lưu vào D1 vừa gửi về Telegram!
