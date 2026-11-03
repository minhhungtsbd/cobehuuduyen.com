/* ==========================================================================
   TRANG QUẢN TRỊ VIÊN (ADMIN DASHBOARD - /admin.html)
   - Duyệt / Từ chối Công đức Từ thiện (Duyệt xong mới hiển thị ra Sổ Vàng trang chủ)
   - Quản lý Đơn hàng thỉnh vật phẩm, Đặt lịch xem 1-1 & Yêu cầu đặt hàng Sỉ
   - Thêm / Sửa / Xoá Sản Phẩm trực tiếp trên Cloudflare D1 (`products_catalog`)
   ========================================================================== */

(function () {
  "use strict";

  const SESSION_PASS_KEY = "cbhd_admin_pass_v1";
  let adminPassword = sessionStorage.getItem(SESSION_PASS_KEY) || "";
  let allEvents = [];
  let customProducts = [];
  let currentFilterType = "all";

  function formatVND(amount) {
    return new Intl.NumberFormat("vi-VN").format(Number(amount) || 0) + "đ";
  }

  function showToast(msg) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const t = document.createElement("div");
    t.className = "toast-msg";
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  async function apiAdminGet() {
    const res = await fetch("/api/admin", {
      headers: { "X-Admin-Password": adminPassword }
    });
    return await res.json();
  }

  async function apiAdminPost(payload) {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Password": adminPassword
      },
      body: JSON.stringify(payload)
    });
    return await res.json();
  }

  async function loadDashboardData() {
    const data = await apiAdminGet();
    const dashEl =
      document.getElementById("admin-dashboard-main") ||
      document.getElementById("admin-main-dashboard");
    if (!data.ok) {
      document.getElementById("admin-login-box").style.display = "block";
      if (dashEl) dashEl.style.display = "none";
      if (adminPassword) showToast("⚠️ " + (data.error || "Không thể xác thực Admin"));
      return;
    }

    sessionStorage.setItem(SESSION_PASS_KEY, adminPassword);
    document.getElementById("admin-login-box").style.display = "none";
    if (dashEl) dashEl.style.display = "block";

    allEvents = data.events || [];
    customProducts = data.customProducts || [];

    renderStats();
    renderEventsTable();
    renderCustomProductsTable();
  }

  function renderStats() {
    const pendingCount = allEvents.filter((e) => e.status === "pending").length;
    const orderCount = allEvents.filter(
      (e) => e.event_type === "order" || e.event_type === "wholesale"
    ).length;
    const charityApprovedSum = allEvents
      .filter((e) => e.event_type === "charity" && e.status === "approved")
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const bookingCount = allEvents.filter((e) => e.event_type === "booking").length;

    const elPending = document.getElementById("stat-pending");
    const elOrders = document.getElementById("stat-orders");
    const elCharity = document.getElementById("stat-approved-charity");
    const elBookings = document.getElementById("stat-bookings");
    const elProducts = document.getElementById("stat-products");

    if (elPending) elPending.textContent = String(pendingCount);
    if (elOrders) elOrders.textContent = String(orderCount);
    if (elCharity) elCharity.textContent = formatVND(charityApprovedSum);
    if (elBookings) elBookings.textContent = String(bookingCount);
    if (elProducts) elProducts.textContent = String(customProducts.length);
  }

  function renderEventsTable() {
    const tbody = document.getElementById("admin-events-tbody");
    if (!tbody) return;

    const filtered = allEvents.filter((ev) => {
      if (currentFilterType === "all") return true;
      if (currentFilterType === "pending") return ev.status === "pending";
      return ev.event_type === currentFilterType;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted);">Chưa có dữ liệu trong mục này.</td></tr>`;
      return;
    }

    const typeLabels = {
      charity: "💛 Công Đức",
      order: "🛒 Đơn Hàng Lẻ",
      booking: "📿 Đặt Lịch 1-1",
      wholesale: "📦 Đặt Hàng Sỉ",
      chant_room: "🏮 Hoa Đăng"
    };

    tbody.innerHTML = filtered
      .map((ev) => {
        const isPending = ev.status === "pending";
        const statusBadge = isPending
          ? `<span style="background:#9e1b1b;color:#fbe59b;padding:0.2rem 0.6rem;border-radius:99px;font-size:0.75rem;font-weight:700;">⏳ Chờ duyệt</span>`
          : `<span style="background:rgba(46,168,126,0.2);color:#4ade80;padding:0.2rem 0.6rem;border-radius:99px;font-size:0.75rem;font-weight:700;">✔ Đã duyệt</span>`;

        return `
        <tr>
          <td>#${ev.id}</td>
          <td><strong>${typeLabels[ev.event_type] || ev.event_type}</strong></td>
          <td>
            <strong>${ev.nickname}</strong>
            ${ev.phone ? `<div style="font-size:0.78rem;color:var(--gold-primary);">📞 ${ev.phone}</div>` : ""}
          </td>
          <td style="color:var(--gold-light);font-weight:700;">${ev.amount > 0 ? formatVND(ev.amount) : "—"}</td>
          <td style="max-width:320px;white-space:pre-wrap;font-size:0.82rem;color:var(--text-secondary);">${ev.message || ""}</td>
          <td>${statusBadge}</td>
          <td>
            <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
              ${
                isPending
                  ? `<button type="button" class="btn btn-gold" style="padding:0.35rem 0.7rem;font-size:0.76rem;" data-approve-id="${ev.id}">✔ Duyệt hiển thị</button>`
                  : `<button type="button" class="btn btn-outline" style="padding:0.35rem 0.7rem;font-size:0.76rem;" data-unapprove-id="${ev.id}">Ẩn</button>`
              }
              <button type="button" class="btn btn-crimson" style="padding:0.35rem 0.65rem;font-size:0.76rem;" data-delete-event="${ev.id}">Xoá</button>
            </div>
          </td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll("[data-approve-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-approve-id");
        await apiAdminPost({ action: "update_event_status", id, status: "approved" });
        showToast(`✅ Đã duyệt #${id}! (Nếu là Công đức sẽ hiển thị ngay lên Sổ Vàng trang chủ)`);
        loadDashboardData();
      });
    });

    tbody.querySelectorAll("[data-unapprove-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-unapprove-id");
        await apiAdminPost({ action: "update_event_status", id, status: "pending" });
        showToast(`⏳ Đã chuyển #${id} về trạng thái Chờ duyệt`);
        loadDashboardData();
      });
    });

    tbody.querySelectorAll("[data-delete-event]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-delete-event");
        if (!confirm(`Bạn có chắc muốn xoá bản ghi #${id}?`)) return;
        await apiAdminPost({ action: "delete_event", id });
        showToast(`🗑️ Đã xoá bản ghi #${id}`);
        loadDashboardData();
      });
    });
  }

  function renderCustomProductsTable() {
    const tbody = document.getElementById("admin-products-tbody");
    const defaultProducts =
      (window.__COBEHUUDUYEN_DATA__ &&
        window.__COBEHUUDUYEN_DATA__.products &&
        window.__COBEHUUDUYEN_DATA__.products.products) ||
      [];

    if (!tbody) return;

    const mergedMap = new Map();
    defaultProducts.forEach((p) =>
      mergedMap.set(p.id, { ...p, imageUrl: p.imageUrl || "", source: "Mặc định" })
    );
    customProducts.forEach((cp) => {
      let elements = ["Kim", "Mộc", "Thuỷ", "Hoả", "Thổ"];
      try {
        elements = JSON.parse(cp.elements_json || "[]");
      } catch {
        // ignore
      }
      mergedMap.set(cp.id, {
        id: cp.id,
        name: cp.name,
        category: cp.category,
        categoryName: cp.category_name,
        price: cp.price,
        originalPrice: cp.original_price,
        badge: cp.badge,
        elements,
        artworkType: cp.artwork_type || "shrine-gold",
        imageUrl: cp.image_url || cp.imageUrl || "",
        shortDesc: cp.short_desc,
        source: "D1 Custom"
      });
    });

    const list = Array.from(mergedMap.values());

    tbody.innerHTML = list
      .map(
        (p) => `
      <tr>
        <td>
          ${
            p.imageUrl
              ? `<img src="${p.imageUrl}" alt="${p.name}" class="admin-prod-thumb" loading="lazy" onerror="this.outerHTML='<div class=\\'admin-prod-thumb-empty\\'>Lỗi ảnh</div>';" />`
              : `<div class="admin-prod-thumb-empty">Biểu tượng</div>`
          }
        </td>
        <td><code>${p.id}</code></td>
        <td><strong>${p.name}</strong><div style="font-size:0.78rem;color:var(--text-muted);">${p.shortDesc || ""}</div></td>
        <td>${p.categoryName}</td>
        <td style="color:var(--gold-light);font-weight:700;">${formatVND(p.price)}</td>
        <td><span class="lunar-badge">${p.source}</span></td>
        <td>
          <div style="display:flex;gap:0.4rem;">
            <button type="button" class="btn btn-outline" style="padding:0.35rem 0.7rem;font-size:0.76rem;" data-edit-prod="${p.id}">✏️ Sửa</button>
            ${
              p.source === "D1 Custom"
                ? `<button type="button" class="btn btn-crimson" style="padding:0.35rem 0.7rem;font-size:0.76rem;" data-del-prod="${p.id}">Xoá</button>`
                : ""
            }
          </div>
        </td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll("[data-edit-prod]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-edit-prod");
        const found = mergedMap.get(id);
        if (!found) return;
        document.getElementById("prod-id").value = found.id;
        document.getElementById("prod-name").value = found.name;
        document.getElementById("prod-category").value = found.category;
        document.getElementById("prod-price").value = found.price;
        document.getElementById("prod-original-price").value = found.originalPrice || "";
        document.getElementById("prod-badge").value = found.badge || "Vật phẩm trì chú";
        document.getElementById("prod-elements").value = (found.elements || []).join(", ");
        document.getElementById("prod-desc").value = found.shortDesc || "";
        const imgInput = document.getElementById("prod-image-url");
        if (imgInput) {
          imgInput.value = found.imageUrl || "";
          updateImagePreview(found.imageUrl || "");
        }
        document.getElementById("prod-form-card")?.scrollIntoView({ behavior: "smooth" });
        showToast(`✏️ Đang nạp thông tin sản phẩm "${found.name}" lên form chỉnh sửa`);
      });
    });

    tbody.querySelectorAll("[data-del-prod]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del-prod");
        if (!confirm(`Xoá sản phẩm ${id} khỏi D1?`)) return;
        await apiAdminPost({ action: "delete_product", id });
        showToast(`🗑️ Đã xoá sản phẩm ${id}`);
        loadDashboardData();
      });
    });
  }

  function updateImagePreview(url) {
    const box = document.getElementById("prod-img-preview-box");
    if (!box) return;
    const cleanUrl = String(url || "").trim();
    if (cleanUrl) {
      box.innerHTML = `<img src="${cleanUrl}" alt="Preview" style="width:100%;height:100%;object-fit:cover;" onerror="this.outerHTML='<span style=\\'font-size:0.7rem;color:var(--crimson-light);\\'>Lỗi ảnh</span>';" />`;
    } else {
      box.innerHTML = `<span style="font-size:0.75rem;color:var(--text-muted);">Xem</span>`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("admin-login-form");
    loginForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      adminPassword = (document.getElementById("admin-password-input")?.value || "").trim();
      loadDashboardData();
    });

    document.getElementById("btn-admin-refresh")?.addEventListener("click", loadDashboardData);
    document.getElementById("btn-admin-logout")?.addEventListener("click", () => {
      sessionStorage.removeItem(SESSION_PASS_KEY);
      adminPassword = "";
      location.reload();
    });

    // Bộ lọc tab sự kiện
    document.querySelectorAll("[data-admin-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-admin-filter]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilterType = btn.getAttribute("data-admin-filter") || "all";
        renderEventsTable();
      });
    });

    // Form thêm nhanh bản ghi Sổ Vàng Công Đức
    document.getElementById("admin-add-charity-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nickname = (
        document.getElementById("direct-charity-name")?.value || ""
      ).trim();
      const amount = Number(
        document.getElementById("direct-charity-amount")?.value || 0
      );
      const campaign = (
        document.getElementById("direct-charity-campaign")?.value || ""
      ).trim();
      const wish = (
        document.getElementById("direct-charity-wish")?.value || ""
      ).trim();

      if (!nickname || amount <= 0) return;
      await apiAdminPost({
        action: "add_charity_record",
        nickname,
        amount,
        campaign,
        wish
      });
      e.target.reset();
      showToast("✅ Đã thêm trực tiếp vào Sổ Vàng Công Đức & cộng vào Tổng Quỹ!");
      loadDashboardData();
    });

    // Form Thêm / Sửa Sản Phẩm
    document.getElementById("admin-product-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id =
        document.getElementById("prod-id").value.trim() || `sp-${Date.now().toString().slice(-5)}`;
      const name = document.getElementById("prod-name").value.trim();
      const category = document.getElementById("prod-category").value;
      const categoryLabels = {
        "hang-ma": "Đồ Lễ Hàng Mã",
        "phong-thuy": "Vật Phẩm Phong Thuỷ",
        "tam-linh": "Hương Nến & Tâm Linh",
        "luu-niem": "Quà Lưu Niệm Bình An"
      };
      const categoryName = categoryLabels[category] || "Vật Phẩm Phong Thuỷ";
      const price = Number(document.getElementById("prod-price").value || 0);
      const originalPrice = Number(document.getElementById("prod-original-price").value || 0);
      const badge = document.getElementById("prod-badge").value.trim() || "Vật phẩm trì chú";
      const artworkType = document.getElementById("prod-artwork")?.value || "shrine-gold";
      const elementsRaw = document.getElementById("prod-elements").value.trim();
      const elements = elementsRaw
        ? elementsRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : ["Kim", "Mộc", "Thuỷ", "Hoả", "Thổ"];
      const shortDesc = document.getElementById("prod-desc").value.trim();
      const imageUrl = (document.getElementById("prod-image-url")?.value || "").trim();

      if (!name || price <= 0) {
        showToast("⚠️ Vui lòng nhập Tên sản phẩm và Giá bán hợp lệ!");
        return;
      }

      await apiAdminPost({
        action: "upsert_product",
        product: {
          id,
          name,
          category,
          categoryName,
          price,
          originalPrice,
          badge,
          artworkType,
          elements,
          imageUrl,
          shortDesc
        }
      });

      e.target.reset();
      document.getElementById("prod-id").value = "";
      updateImagePreview("");
      showToast(`✅ Đã lưu sản phẩm "${name}" vào cơ sở dữ liệu D1!`);
      loadDashboardData();
    });

    document.getElementById("prod-image-url")?.addEventListener("input", (e) => {
      updateImagePreview(e.target.value);
    });

    if (adminPassword) {
      loadDashboardData();
    }
  });
})();
