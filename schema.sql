-- ==========================================================================
-- CÔ BÉ HỮU DUYÊN (cobehuuduyen.com) — Cloudflare D1 Database Schema
-- Chạy lệnh khởi tạo: npx wrangler d1 execute cobehuuduyen-db --file=./schema.sql
-- ==========================================================================

CREATE TABLE IF NOT EXISTS spiritual_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL, -- 'order' | 'booking' | 'charity' | 'chant_room'
  room_id TEXT DEFAULT '',
  nickname TEXT NOT NULL,
  phone TEXT DEFAULT '',
  amount INTEGER DEFAULT 0,
  message TEXT DEFAULT '',
  payload_json TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_type_created
ON spiritual_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_room_created
ON spiritual_events (room_id, created_at DESC);
