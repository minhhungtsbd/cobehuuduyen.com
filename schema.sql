-- ==========================================================================
-- CÔ BÉ HỮU DUYÊN (cobehuuduyen.com) — Cloudflare D1 Full Database Schema
-- Chạy trên tab Console của D1 Database (cobehuuduyen-db)
-- ==========================================================================

-- 1. Bảng Sự Kiện Tâm Linh (Đơn hàng, Đặt lịch, Công đức, Hoa đăng, Đặt sỉ)
CREATE TABLE IF NOT EXISTS spiritual_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL, -- 'order' | 'booking' | 'charity' | 'chant_room' | 'wholesale'
  room_id TEXT DEFAULT '',
  nickname TEXT NOT NULL,
  phone TEXT DEFAULT '',
  amount INTEGER DEFAULT 0,
  message TEXT DEFAULT '',
  status TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  merit_awarded INTEGER DEFAULT 0,
  payload_json TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_type_status
ON spiritual_events (event_type, status, created_at DESC);

-- 2. Bảng Quản Lý Sản Phẩm Động (Thêm / Sửa / Xoá từ Trang Admin)
CREATE TABLE IF NOT EXISTS products_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  category_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  original_price INTEGER DEFAULT 0,
  badge TEXT DEFAULT 'Vật phẩm tâm linh',
  elements_json TEXT DEFAULT '["Kim","Mộc","Thuỷ","Hoả","Thổ"]',
  element_text TEXT DEFAULT 'Hợp mọi bản mệnh',
  short_desc TEXT DEFAULT '',
  benefits_json TEXT DEFAULT '[]',
  artwork_type TEXT DEFAULT 'shrine-gold',
  image_url TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Hiện Diện Trực Tuyến Tại Phòng Tụng Kinh (Chỗ ngồi toạ thiền & Điểm Công Đức)
CREATE TABLE IF NOT EXISTS sanctuary_presence (
  seat_key TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  seat_index INTEGER DEFAULT 0,
  merit_points INTEGER DEFAULT 50,
  status_text TEXT DEFAULT 'Đang tụng kinh',
  last_seen INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_presence_room
ON sanctuary_presence (room_id, last_seen DESC);
