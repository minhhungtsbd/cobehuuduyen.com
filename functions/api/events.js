/**
 * Cloudflare Pages Function: /api/events
 * - Bảo vệ chống Spam/Bot bằng Cloudflare Turnstile (`siteverify` API)
 * - Tự động lưu Đơn hàng (order), Đặt lịch 1-1 (booking), Công đức (charity),
 *   và Hoạt động Phòng Tụng Kinh Online (chant_room) vào Cloudflare D1 Database (`DB`).
 * - Đồng thời tự động bắn tin nhắn thông báo thời gian thực về Nhóm Telegram
 *   qua biến môi trường `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID`.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "";
  const room = url.searchParams.get("room") || "";

  if (!env.DB) {
    return new Response(
      JSON.stringify({
        ok: true,
        storage: "client-fallback",
        items: []
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  }

  try {
    let query =
      "SELECT id, event_type, room_id, nickname, amount, message, created_at FROM spiritual_events";
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
    const turnstileToken = String(
      body["cf-turnstile-response"] || body.turnstileToken || ""
    ).trim();

    // 0. Kiểm tra Cloudflare Turnstile chống Spam / Bot
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

    const eventType = String(body.eventType || "general").slice(0, 40);
    const roomId = String(body.roomId || "").slice(0, 40);
    const nickname = String(body.nickname || "Tín chủ hữu duyên").slice(0, 80);
    const phone = String(body.phone || "").slice(0, 30);
    const amount = Number(body.amount || 0);
    const message = String(body.message || "").slice(0, 500);
    const payloadJson = JSON.stringify(body.payload || {});

    let savedToD1 = false;
    let sentToTelegram = false;

    // 1. Lưu vào Cloudflare D1 Database (nếu đã bind biến DB)
    if (env.DB) {
      try {
        await env.DB.prepare(
          `INSERT INTO spiritual_events (event_type, room_id, nickname, phone, amount, message, payload_json)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
        )
          .bind(eventType, roomId, nickname, phone, amount, message, payloadJson)
          .run();
        savedToD1 = true;
      } catch {
        // Bỏ qua nếu bảng chưa khởi tạo để vẫn gửi Telegram bình thường
      }
    }

    // 2. Bắn thông báo tức thì về Nhóm Telegram (nếu đã cấu hình TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID)
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
      const titleMap = {
        order: "🛒 ĐƠN THỈNH VẬT PHẨM MỚI",
        booking: "📿 ĐẶT LỊCH XEM 1-1 MỚI",
        charity: "💛 PHÁT TÂM CÔNG ĐỨC MỚI",
        chant_room: "🪷 PHẬT TỬ VÀO PHÒNG TỤNG KINH & CẦU NGUYỆN"
      };
      const header = titleMap[eventType] || "🔔 THÔNG BÁO TỪ COBEHUUDUYEN.COM";
      const vnd = amount > 0 ? new Intl.NumberFormat("vi-VN").format(amount) + "đ" : "";

      const lines = [
        `<b>${header}</b>`,
        `• <b>Tín chủ / Pháp danh:</b> ${escapeHtml(nickname)}`,
        phone ? `• <b>SĐT / Zalo:</b> ${escapeHtml(phone)}` : "",
        roomId ? `• <b>Phòng / Ban thờ:</b> ${escapeHtml(roomId)}` : "",
        vnd ? `• <b>Số tiền:</b> ${vnd}` : "",
        message ? `• <b>Nội dung:</b>\n<pre>${escapeHtml(message)}</pre>` : "",
        `🛡️ <i>Đã xác thực Cloudflare Turnstile</i>`,
        `🌐 <i>Nguồn: https://cobehuuduyen.com</i>`
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
        turnstileVerified: true,
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
