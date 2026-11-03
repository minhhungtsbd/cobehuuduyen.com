# 🪷 Cô Bé Hữu Duyên — Tâm Linh, Phong Thuỷ & Thiện Nguyện (`cobehuuduyen.com`)

Trang web chính thức của **Cô Bé Hữu Duyên** (`https://cobehuuduyen.com`), được thiết kế chuyên biệt theo phong cách **Mỹ thuật Tâm linh & Phong thuỷ Á Đông** (hỗ trợ cả **Giao diện Tối Huyền Bí** và **Giao diện Sáng Thanh Tịnh**).

## ✨ Các Tính Năng Chính
1. **Không Gian Xem Bói & Tâm Linh Tương Tác Trực Tiếp:**
   - **Xin Xăm Quán Âm:** Hiệu ứng lắc ống xăm linh ứng, trả về thơ giải nghĩa, lời bàn Công danh, Tình duyên, Sức khoẻ và nút gửi thẳng kết quả qua Zalo nhờ Cô Bé Hữu Duyên luận giải sâu.
   - **Gieo Quẻ Kinh Dịch (3 Đồng Xu Cổ):** Luận giải quẻ Chu Dịch kèm Thoán Từ và lời khuyên hành động.
   - **Bói Bài Tarot Tâm Linh (3 Lá):** Giải mã Quá Khứ – Hiện Tại – Tương Lai.
   - **Tra Cứu Bản Mệnh Ngũ Hành Theo Năm Sinh:** Tự động tính tuổi Can Chi, Mệnh Ngũ Hành (Kim, Mộc, Thuỷ, Hoả, Thổ), màu sắc hợp mệnh và gợi ý ngay vật phẩm hợp tuổi.
2. **Đặt Lịch Xem Trực Tiếp 1-1 Cùng Cô Bé Hữu Duyên:**
   - Kết nối trực tiếp qua **Zalo (`0702311558`)**, **Facebook (`fb.com/nhu.lam.545518`)**, và **TikTok (`@cobehuuduyen`)**.
3. **Cửa Hàng Vật Phẩm (Hàng Mã, Phong Thuỷ, Ấn Phẩm Tâm Linh, Lưu Niệm Bình An):**
   - Lọc theo danh mục, lọc theo mệnh Ngũ Hành và tìm kiếm tức thì.
   - **Giỏ Hàng Thông Minh (Smart Cart):** Tự động tính tổng tiền, tuỳ chọn nhờ Cô Bé Hữu Duyên khai quang/trì chú/viết sớ, tự động tạo mã **VietQR Vietcombank** (`0051000567270` - **Nguyễn Thị Thu Hồng**) và gửi đơn nhanh qua Zalo.
4. **Quỹ Từ Thiện & Công Đức (“Gieo Duyên Lành”):**
   - Theo dõi tiến độ các chiến dịch Phóng sinh, Phát quà gạo cho cụ già neo đơn, Cúng dường Tam Bảo, Sổ vàng công đức và mã QR phát tâm minh bạch.

---

## 🛠️ Cách Chạy & Chỉnh Sửa Dữ Liệu Ở Máy Local

- **Cài đặt & Build ra thư mục `dist/`:**
  ```bash
  npm run build
  ```
- **Kiểm tra chất lượng bản build:**
  ```bash
  npm run check
  ```
- **Chạy server xem thử tại máy (`http://127.0.0.1:4173`):**
  ```bash
  npm run dev
  ```

### Chỉnh sửa sản phẩm, quẻ xăm hoặc chiến dịch từ thiện
Toàn bộ nội dung được tách riêng trong thư mục `src/data/` rất dễ chỉnh sửa:
- `src/data/site.config.json`: Thông tin SĐT Zalo, Facebook, TikTok, số tài khoản Vietcombank.
- `src/data/products.json`: Danh sách sản phẩm Hàng mã, Phong thuỷ, Tâm linh, Lưu niệm và giá bán.
- `src/data/fortunes.json`: Nội dung các quẻ Xăm Quán Âm, Kinh Dịch và bài Tarot.
- `src/data/charity.json`: Các chiến dịch từ thiện và danh sách mạnh thường quân.

---

## ☁️ Hướng Dẫn Triển Khai Lên Cloudflare Pages (Tự Động Từ GitHub)

1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/) -> chọn **Workers & Pages** -> **Create** -> tab **Pages** -> **Connect to Git**.
2. Chọn tài khoản GitHub `minhhungtsbd` và repository **`cobehuuduyen.com`**.
3. Thiết lập cấu hình Build (**Build settings**):
   - **Production branch:** `main`
   - **Framework preset:** `None`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Bấm **Save and Deploy**. Chỉ sau ~15 giây trang web sẽ hoạt động.
5. Vào tab **Custom domains** trong dự án Cloudflare Pages -> bấm **Set up a custom domain** -> nhập `cobehuuduyen.com` và `www.cobehuuduyen.com` để kích hoạt HTTPS tự động.
