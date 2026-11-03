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
  const expected = env.ADMIN_PASSWORD || env.DMIN_PASSWORD || "0702311558";
  const provided = request.headers.get("X-Admin-Password") || "";
  return provided === expected;
}

async function ensureAdminSchema(db) {
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
        image_url TEXT DEFAULT '',
        is_active INTEGER DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch {
    // ignore
  }

  // Tự động kiểm tra và thêm cột status nếu bảng cũ chưa có
  try {
    const info = await db.prepare("PRAGMA table_info(spiritual_events)").all();
    const cols = new Set((info.results || []).map((r) => r.name));
    if (!cols.has("status")) {
      await db.prepare("ALTER TABLE spiritual_events ADD COLUMN status TEXT DEFAULT 'pending'").run();
    }
    if (!cols.has("merit_awarded")) {
      await db.prepare("ALTER TABLE spiritual_events ADD COLUMN merit_awarded INTEGER DEFAULT 0").run();
    }
  } catch {
    try {
      await db.prepare("ALTER TABLE spiritual_events ADD COLUMN status TEXT DEFAULT 'pending'").run();
    } catch {}
    try {
      await db.prepare("ALTER TABLE spiritual_events ADD COLUMN merit_awarded INTEGER DEFAULT 0").run();
    } catch {}
  }

  try {
    const prodInfo = await db.prepare("PRAGMA table_info(products_catalog)").all();
    const prodCols = new Set((prodInfo.results || []).map((r) => r.name));
    if (!prodCols.has("image_url")) {
      await db.prepare("ALTER TABLE products_catalog ADD COLUMN image_url TEXT DEFAULT ''").run();
    }
  } catch {
    try {
      await db.prepare("ALTER TABLE products_catalog ADD COLUMN image_url TEXT DEFAULT ''").run();
    } catch {}
  }
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
    await ensureAdminSchema(env.DB);

    let rawEvents = [];
    try {
      const eventsRes = await env.DB.prepare(
        `SELECT * FROM spiritual_events ORDER BY id DESC LIMIT 150`
      ).all();
      rawEvents = (eventsRes.results || []).map((row) => ({
        id: row.id,
        event_type: row.event_type,
        room_id: row.room_id || "",
        nickname: row.nickname || "Tín chủ",
        phone: row.phone || "",
        amount: Number(row.amount || 0),
        message: row.message || "",
        status: row.status || "approved",
        merit_awarded: Number(row.merit_awarded || 0),
        payload_json: row.payload_json || "{}",
        created_at: row.created_at || ""
      }));
    } catch (e) {
      console.error("SELECT spiritual_events fallback error:", e);
      rawEvents = [];
    }

    let customProducts = [];
    try {
      const productsRes = await env.DB.prepare(
        `SELECT * FROM products_catalog ORDER BY updated_at DESC`
      ).all();
      customProducts = productsRes.results || [];
    } catch {
      customProducts = [];
    }

    return new Response(
      JSON.stringify({
        ok: true,
        events: rawEvents,
        customProducts
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
    await ensureAdminSchema(env.DB);
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
      const imageUrl = String(p.imageUrl || p.image_url || "").trim();

      await env.DB.prepare(
        `INSERT INTO products_catalog
          (id, name, category, category_name, price, original_price, badge, elements_json, element_text, short_desc, benefits_json, artwork_type, image_url, is_active, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 1, CURRENT_TIMESTAMP)
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
          image_url = excluded.image_url,
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
          artworkType,
          imageUrl
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
