/**
 * Cloudflare Pages Function: /api/admin
 * Quản trị viên duyệt Đơn hàng, Công đức (hiển thị ra Sổ Vàng trang chủ), Đặt lịch, Đặt sỉ
 * và Thêm / Sửa / Xoá Sản Phẩm trực tiếp trên Cloudflare D1 (`DB`).
 *
 * Bảo mật bằng mật khẩu Admin:
 * - Thiết lập biến môi trường `ADMIN_PASSWORD` trên Cloudflare Pages (Mặc định nếu chưa cài: `0702311558`).
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
  "Content-Type": "application/json; charset=utf-8"
};

function checkAuth(request, env) {
  const expected = env.ADMIN_PASSWORD || "0702311558";
  const provided = request.headers.get("X-Admin-Password") || "";
  return provided === expected;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) {
    return new Response(
      JSON.stringify({ ok: false, error: "Mật khẩu Quản trị viên không đúng!" }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  if (!env.DB) {
    return new Response(
      JSON.stringify({ ok: false, error: "Chưa kết nối D1 Database (DB)" }),
      { status: 200, headers: CORS_HEADERS }
    );
  }

  try {
    const eventsRes = await env.DB.prepare(
      `SELECT id, event_type, room_id, nickname, phone, amount, message, status, merit_awarded, payload_json, created_at
       FROM spiritual_events
       ORDER BY id DESC LIMIT 150`
    ).all();

    const productsRes = await env.DB.prepare(
      `SELECT * FROM products_catalog ORDER BY updated_at DESC`
    ).all();

    return new Response(
      JSON.stringify({
        ok: true,
        events: eventsRes.results || [],
        customProducts: productsRes.results || []
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err.message || err) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) {
    return new Response(
      JSON.stringify({ ok: false, error: "Mật khẩu Quản trị viên không đúng!" }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  if (!env.DB) {
    return new Response(
      JSON.stringify({ ok: false, error: "Chưa kết nối D1 Database" }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const body = await request.json();
    const action = body.action || "";

    // 1. Duyệt / Từ chối sự kiện (Công đức được duyệt sẽ tự động hiển thị ra Sổ Vàng trang chủ)
    if (action === "update_event_status") {
      const id = Number(body.id);
      const status = String(body.status || "approved");
      await env.DB.prepare(`UPDATE spiritual_events SET status = ?1 WHERE id = ?2`)
        .bind(status, id)
        .run();
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS_HEADERS });
    }

    // 2. Xoá sự kiện
    if (action === "delete_event") {
      const id = Number(body.id);
      await env.DB.prepare(`DELETE FROM spiritual_events WHERE id = ?1`).bind(id).run();
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS_HEADERS });
    }

    // 3. Thêm mới sự kiện Sổ Vàng Công Đức trực tiếp từ Admin
    if (action === "add_charity_record") {
      const nickname = String(body.nickname || "Phật tử Hữu Duyên");
      const amount = Number(body.amount || 200000);
      const campaign = String(body.campaign || "Phóng Sinh Rằm");
      const wish = String(body.wish || "Cầu gia đạo bình an");

      await env.DB.prepare(
        `INSERT INTO spiritual_events (event_type, nickname, amount, message, status, payload_json)
         VALUES ('charity', ?1, ?2, ?3, 'approved', ?4)`
      )
        .bind(nickname, amount, `${campaign} — Lời nguyện: ${wish}`, JSON.stringify({ campaign, wish }))
        .run();
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS_HEADERS });
    }

    // 4. Thêm hoặc Cập nhật Sản phẩm (Upsert Product)
    if (action === "upsert_product") {
      const p = body.product || {};
      const id = String(p.id || `sp-${Date.now()}`).trim();
      const name = String(p.name || "").trim();
      const category = String(p.category || "phong-thuy");
      const categoryMap = {
        "hang-ma": "Hàng Mã Chuẩn Lễ",
        "phong-thuy": "Vật Phẩm Phong Thuỷ",
        "tam-linh": "Ấn Phẩm Tâm Linh",
        "luu-niem": "Lưu Niệm Bình An"
      };
      const categoryName = p.categoryName || categoryMap[category] || "Vật Phẩm Tâm Linh";
      const price = Number(p.price || 0);
      const originalPrice = Number(p.originalPrice || 0);
      const badge = String(p.badge || "Vật phẩm trì chú");
      const elementsJson = JSON.stringify(
        Array.isArray(p.elements) ? p.elements : ["Kim", "Mộc", "Thuỷ", "Hoả", "Thổ"]
      );
      const elementText = String(p.elementText || "Hợp mọi bản mệnh");
      const shortDesc = String(p.shortDesc || "");
      const benefitsJson = JSON.stringify(Array.isArray(p.benefits) ? p.benefits : []);
      const artworkType = String(p.artworkType || "shrine-gold");

      await env.DB.prepare(
        `INSERT INTO products_catalog
          (id, name, category, category_name, price, original_price, badge, elements_json, element_text, short_desc, benefits_json, artwork_type, is_active, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 1, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          category = excluded.category,
          category_name = excluded.category_name,
          price = excluded.price,
          original_price = excluded.original_price,
          badge = excluded.badge,
          elements_json = excluded.elements_json,
          element_text = excluded.element_text,
          short_desc = excluded.short_desc,
          benefits_json = excluded.benefits_json,
          artwork_type = excluded.artwork_type,
          is_active = 1,
          updated_at = CURRENT_TIMESTAMP`
      )
        .bind(
          id,
          name,
          category,
          categoryName,
          price,
          originalPrice,
          badge,
          elementsJson,
          elementText,
          shortDesc,
          benefitsJson,
          artworkType
        )
        .run();

      return new Response(JSON.stringify({ ok: true, id }), { status: 200, headers: CORS_HEADERS });
    }

    // 5. Xoá / Ẩn Sản phẩm
    if (action === "delete_product") {
      const id = String(body.id || "");
      await env.DB.prepare(`DELETE FROM products_catalog WHERE id = ?1`).bind(id).run();
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS_HEADERS });
    }

    return new Response(
      JSON.stringify({ ok: false, error: "Unknown action" }),
      { status: 400, headers: CORS_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err.message || err) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
