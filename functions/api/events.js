/**
 * Cloudflare Pages Function: /api/events
 * - Tự động khởi tạo bảng D1 nếu chưa có (Auto-Migration)
 * - Trả về dữ liệu thực tế cho trang chủ (Sổ vàng công đức đã duyệt, Tổng quỹ thực tế, Sản phẩm động, Người đang ngồi tụng kinh)
 * - Lưu Đơn hàng, Đặt lịch 1-1, Đặt hàng Sỉ, Công đức (status = 'pending' chờ Admin duyệt)
 * - Chỉ bắn thông báo Telegram cho các sự kiện có giá trị giao dịch (order, booking, charity, wholesale), KHÔNG bắn Telegram cho Thả Đèn Hoa Đăng (chant_room).
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
  "Content-Type": "application/json; charset=utf-8"
};

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

async function ensureSchema(db) {
  if (!db) return;
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS spiritual_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        room_id TEXT DEFAULT '',
        nickname TEXT NOT NULL,
        phone TEXT DEFAULT '',
        amount INTEGER DEFAULT 0,
        message TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        merit_awarded INTEGER DEFAULT 0,
        payload_json TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
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
        is_active INTEGER DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sanctuary_presence (
        seat_key TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        seat_index INTEGER DEFAULT 0,
        merit_points INTEGER DEFAULT 50,
        status_text TEXT DEFAULT 'Đang tụng kinh',
        last_seen INTEGER NOT NULL
      );
    `);
    try {
      await db.prepare("ALTER TABLE spiritual_events ADD COLUMN status TEXT DEFAULT 'pending'").run();
    } catch {
      // column already exists
    }
    try {
      await db.prepare("ALTER TABLE spiritual_events ADD COLUMN merit_awarded INTEGER DEFAULT 0").run();
    } catch {
      // column already exists
    }
    try {
      await db.prepare("ALTER TABLE products_catalog ADD COLUMN image_url TEXT DEFAULT ''").run();
    } catch {
      // column already exists
    }
  } catch {
    // ignore schema init errors
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "";
  const room = url.searchParams.get("room") || "";
  const mode = url.searchParams.get("mode") || "";

  if (!env.DB) {
    return new Response(
      JSON.stringify({ ok: true, storage: "client-fallback", items: [] }),
      { status: 200, headers: CORS_HEADERS }
    );
  }

  await ensureSchema(env.DB);

  try {
    // Mode 1: Public Home Summary (Approved Charity Ledger + Total Raised + Custom Products)
    if (mode === "home_public") {
      const approvedCharities = await env.DB.prepare(
        `SELECT id, nickname, amount, message, payload_json, created_at
         FROM spiritual_events
         WHERE event_type = 'charity' AND status = 'approved'
         ORDER BY id DESC LIMIT 25`
      ).all();

      const sumRow = await env.DB.prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total_approved, COUNT(*) AS count_approved
         FROM spiritual_events
         WHERE event_type = 'charity' AND status = 'approved'`
      ).first();

      const customProducts = await env.DB.prepare(
        `SELECT * FROM products_catalog WHERE is_active = 1 ORDER BY updated_at DESC`
      ).all();

      return new Response(
        JSON.stringify({
          ok: true,
          approvedDonors: approvedCharities.results || [],
          approvedTotalAmount: Number(sumRow?.total_approved || 0),
          approvedCount: Number(sumRow?.count_approved || 0),
          customProducts: customProducts.results || []
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Mode 2: Sanctuary Room Live State (Online Chanting Seats + Recent Lanterns + Synced Line Index)
    if (mode === "sanctuary_room") {
      const targetRoom = room || "tam-bao";
      const cutoff = Date.now() - 120000; // Active within last 2 minutes

      const presenceRes = await env.DB.prepare(
        `SELECT nickname, seat_index, merit_points, status_text, last_seen
         FROM sanctuary_presence
         WHERE room_id = ?1 AND last_seen > ?2
         ORDER BY seat_index ASC LIMIT 24`
      )
        .bind(targetRoom, cutoff)
        .all();

      const prayersRes = await env.DB.prepare(
        `SELECT id, nickname, message, created_at
         FROM spiritual_events
         WHERE event_type = 'chant_room' AND room_id = ?1
         ORDER BY id DESC LIMIT 20`
      )
        .bind(targetRoom)
        .all();

      return new Response(
        JSON.stringify({
          ok: true,
          serverTime: Date.now(),
          onlineUsers: presenceRes.results || [],
          recentPrayers: prayersRes.results || []
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Default query
    let query =
      "SELECT id, event_type, room_id, nickname, amount, message, status, created_at FROM spiritual_events";
    const binds = [];

    if (type && room) {
      query += " WHERE event_type = ?1 AND room_id = ?2";
      binds.push(type, room);
    } else if (type) {
      query += " WHERE event_type = ?1";
      binds.push(type);
    }

    query += " ORDER BY id DESC LIMIT 30";
    const stmt = env.DB.prepare(query);
    const result = binds.length ? await stmt.bind(...binds).all() : await stmt.all();

    return new Response(
      JSON.stringify({
        ok: true,
        storage: "cloudflare-d1",
        items: result.results || []
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err.message || err) }),
      { status: 200, headers: CORS_HEADERS }
    );
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const eventType = String(body.eventType || "general").slice(0, 40);

    // Heartbeat presence in Online Chanting Room (No Turnstile or Telegram needed)
    if (eventType === "presence_heartbeat") {
      if (env.DB) {
        await ensureSchema(env.DB);
        const roomId = String(body.roomId || "tam-bao").slice(0, 40);
        const nickname = String(body.nickname || "Phật tử Hữu Duyên").slice(0, 60);
        const seatIndex = Number(body.seatIndex || 0);
        const meritPoints = Number(body.meritPoints || 50);
        const statusText = String(body.statusText || "Đang đồng tụng kinh").slice(0, 80);
        const seatKey = `${roomId}:${nickname.toLowerCase()}`;

        await env.DB.prepare(
          `INSERT INTO sanctuary_presence (seat_key, room_id, nickname, seat_index, merit_points, status_text, last_seen)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
           ON CONFLICT(seat_key) DO UPDATE SET
             seat_index = excluded.seat_index,
             merit_points = excluded.merit_points,
             status_text = excluded.status_text,
             last_seen = excluded.last_seen`
        )
          .bind(seatKey, roomId, nickname, seatIndex, meritPoints, statusText, Date.now())
          .run();
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS_HEADERS });
    }

    const turnstileToken = String(
      body["cf-turnstile-response"] || body.turnstileToken || ""
    ).trim();

    if (!turnstileToken) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing Turnstile token. Vui lòng xác thực chống spam trước khi gửi."
        }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    if (env.TURNSTILE_SECRET_KEY) {
      const remoteIp = request.headers.get("CF-Connecting-IP") || "";
      const formData = new FormData();
      formData.append("secret", env.TURNSTILE_SECRET_KEY);
      formData.append("response", turnstileToken);
      if (remoteIp) formData.append("remoteip", remoteIp);

      const verifyRes = await fetch(TURNSTILE_VERIFY_URL, {
        method: "POST",
        body: formData
      });
      const outcome = await verifyRes.json();

      if (!outcome.success) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Turnstile verification failed",
            codes: outcome["error-codes"] || []
          }),
          { status: 403, headers: CORS_HEADERS }
        );
      }
    }

    const roomId = String(body.roomId || "").slice(0, 40);
    const nickname = String(body.nickname || "Tín chủ hữu duyên").slice(0, 80);
    const phone = String(body.phone || "").slice(0, 30);
    const amount = Number(body.amount || 0);
    const message = String(body.message || "").slice(0, 600);
    const payloadJson = JSON.stringify(body.payload || {});

    // Chant room lanterns are approved immediately; financial/order/charity events wait for Admin approval ('pending')
    const initialStatus = eventType === "chant_room" ? "approved" : "pending";
    // Calculate bonus merit points for user
    const meritBonus =
      eventType === "charity"
        ? Math.max(20, Math.floor(amount / 5000))
        : eventType === "order"
        ? Math.max(15, Math.floor(amount / 10000))
        : 5;

    let savedToD1 = false;
    let sentToTelegram = false;

    if (env.DB) {
      await ensureSchema(env.DB);
      try {
        await env.DB.prepare(
          `INSERT INTO spiritual_events (event_type, room_id, nickname, phone, amount, message, status, merit_awarded, payload_json)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
        )
          .bind(
            eventType,
            roomId,
            nickname,
            phone,
            amount,
            message,
            initialStatus,
            meritBonus,
            payloadJson
          )
          .run();
        savedToD1 = true;
      } catch {
        // ignore
      }
    }

    // 2. Bắn thông báo về Nhóm Telegram: CHỈ gửi cho Đơn hàng, Đặt lịch, Công đức, Đặt sỉ (KHÔNG gửi cho chant_room)
    const shouldNotifyTelegram =
      eventType !== "chant_room" &&
      Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);

    if (shouldNotifyTelegram) {
      const titleMap = {
        order: "🛒 ĐƠN THỈNH VẬT PHẨM MỚI (CHỜ DUYỆT)",
        booking: "📿 ĐẶT LỊCH XEM 1-1 MỚI",
        charity: "💛 PHÁT TÂM CÔNG ĐỨC MỚI (CHỜ ADMIN DUYỆT)",
        wholesale: "📦 YÊU CẦU ĐẶT HÀNG SỈ / ĐẠI LÝ MỚI"
      };
      const header = titleMap[eventType] || "🔔 THÔNG BÁO TỪ COBEHUUDUYEN.COM";
      const vnd = amount > 0 ? new Intl.NumberFormat("vi-VN").format(amount) + "đ" : "";

      const lines = [
        `<b>${header}</b>`,
        `• <b>Tín chủ:</b> ${escapeHtml(nickname)}`,
        phone ? `• <b>SĐT / Zalo:</b> ${escapeHtml(phone)}` : "",
        vnd ? `• <b>Số tiền:</b> ${vnd}` : "",
        `• <b>Điểm công đức thưởng:</b> +${meritBonus} điểm`,
        message ? `• <b>Chi tiết:</b>\n<pre>${escapeHtml(message)}</pre>` : "",
        `🔑 <i>Duyệt tại: https://cobehuuduyen.com/admin.html</i>`
      ].filter(Boolean);

      const tgRes = await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: env.TELEGRAM_CHAT_ID,
            text: lines.join("\n"),
            parse_mode: "HTML",
            disable_web_page_preview: true
          })
        }
      );
      sentToTelegram = tgRes.ok;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status: initialStatus,
        meritBonus,
        savedToD1,
        sentToTelegram
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err.message || err) }),
      { status: 400, headers: CORS_HEADERS }
    );
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
