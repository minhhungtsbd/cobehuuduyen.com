/* ==========================================================================
   CÔ BÉ HỮU DUYÊN — TÂM LINH, PHONG THUỶ & THIỆN NGUYỆN (https://cobehuuduyen.com)
   Interactive Client Application (Zero-Dependency ES Module)
   ========================================================================== */

(function () {
  "use strict";

  const DATA = window.__COBEHUUDUYEN_DATA__ || {};
  const CONFIG = DATA.config || {};
  const PRODUCTS = (DATA.products && DATA.products.products) || [];
  const FORTUNES = DATA.fortunes || {};
  const CHARITY = DATA.charity || {};

  const STORAGE_CART_KEY = "cbhd_cart_v1";
  const STORAGE_THEME_KEY = "cbhd_theme_v1";

  let cart = loadCart();
  let activeCategory = "all";
  let activeElementFilter = "all";
  let searchQuery = "";

  // ---------- Utility Helpers ----------
  function formatVND(amount) {
    return new Intl.NumberFormat("vi-VN").format(Number(amount) || 0) + "đ";
  }

  function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast-msg";
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function buildVietQrUrl(amount, addInfo) {
    const bankId = (CONFIG.bank && CONFIG.bank.bankId) || "VCB";
    const accountNo = (CONFIG.bank && CONFIG.bank.accountNo) || "0051000567270";
    const accountName = encodeURIComponent(
      (CONFIG.bank && CONFIG.bank.accountName) || "NGUYEN THI THU HONG"
    );
    const cleanInfo = encodeURIComponent(
      (addInfo || "CO BE HUU DUYEN").slice(0, 50)
    );
    const amt = Math.max(0, Math.round(Number(amount) || 0));
    return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amt}&addInfo=${cleanInfo}&accountName=${accountName}`;
  }

  function copyToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg || "Đã sao chép vào bộ nhớ tạm!");
      });
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast(successMsg || "Đã sao chép vào bộ nhớ tạm!");
    }
  }

  // ---------- 1. Dual-Theme System (Dark / Light) ----------
  function initTheme() {
    const saved = localStorage.getItem(STORAGE_THEME_KEY) || "dark";
    applyTheme(saved);

    const toggleBtn = document.getElementById("theme-toggle-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme") || "dark";
        const next = current === "dark" ? "light" : "dark";
        applyTheme(next);
        localStorage.setItem(STORAGE_THEME_KEY, next);
        showToast(
          next === "dark"
            ? "🌙 Đã chuyển sang Giao Diện Tối (Huyền Bí Á Đông)"
            : "☀️ Đã chuyển sang Giao Diện Sáng (Thiền & Thanh Tịnh)"
        );
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const labelEl = document.getElementById("theme-toggle-label");
    const iconEl = document.getElementById("theme-toggle-icon");
    if (labelEl) {
      labelEl.textContent = theme === "dark" ? "Sáng" : "Tối";
    }
    if (iconEl) {
      iconEl.textContent = theme === "dark" ? "☀️" : "🌙";
    }
  }

  // ---------- 2. Mobile Navigation ----------
  function initMobileMenu() {
    const btn = document.getElementById("mobile-menu-btn");
    const nav = document.getElementById("main-nav");
    if (!btn || !nav) return;

    btn.addEventListener("click", () => {
      nav.classList.toggle("open");
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => nav.classList.remove("open"));
    });
  }

  // ---------- 3. Vietnamese Lunar Calendar & Can Chi Calculator ----------
  function initLunarCalendar() {
    const now = new Date();
    const solarStr = now.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    // Calculate Julian Day Number for accurate Sexagenary Day (Can Chi Ngày)
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const a = Math.floor((14 - m) / 12);
    const y1 = y + 4800 - a;
    const m1 = m + 12 * a - 3;
    const jdn =
      d +
      Math.floor((153 * m1 + 2) / 5) +
      365 * y1 +
      Math.floor(y1 / 4) -
      Math.floor(y1 / 100) +
      Math.floor(y1 / 400) -
      32045;

    const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
    const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];

    const dayCan = CAN[(jdn + 9) % 10];
    const dayChi = CHI[(jdn + 1) % 12];
    const yearCan = CAN[(y + 6) % 10];
    const yearChi = CHI[(y + 8) % 12];

    // Approximate Lunar Date via Intl Chinese/Lunar calendar when supported by browser
    let lunarDayMonth = "";
    try {
      const intlLunar = new Intl.DateTimeFormat("vi-VN-u-ca-chinese", {
        day: "numeric",
        month: "numeric"
      }).format(now);
      lunarDayMonth = intlLunar;
    } catch {
      lunarDayMonth = `${((d + 18) % 30) + 1}/${((m + 10) % 12) + 1}`;
    }

    const GIO_HOANG_DAO_MAP = {
      Tý: "Tý (23h-1h), Sửu (1h-3h), Mão (5h-7h), Ngọ (11h-13h), Thân (15h-17h), Dậu (17h-19h)",
      Sửu: "Dần (3h-5h), Mão (5h-7h), Tỵ (9h-11h), Thân (15h-17h), Tuất (19h-21h), Hợi (21h-23h)",
      Dần: "Tý (23h-1h), Sửu (1h-3h), Thìn (7h-9h), Tỵ (9h-11h), Mùi (13h-15h), Tuất (19h-21h)",
      Mão: "Tý (23h-1h), Dần (3h-5h), Mão (5h-7h), Ngọ (11h-13h), Mùi (13h-15h), Dậu (17h-19h)",
      Thìn: "Dần (3h-5h), Thìn (7h-9h), Tỵ (9h-11h), Thân (15h-17h), Dậu (17h-19h), Hợi (21h-23h)",
      Tỵ: "Sửu (1h-3h), Thìn (7h-9h), Ngọ (11h-13h), Mùi (13h-15h), Tuất (19h-21h), Hợi (21h-23h)",
      Ngọ: "Tý (23h-1h), Sửu (1h-3h), Mão (5h-7h), Ngọ (11h-13h), Thân (15h-17h), Dậu (17h-19h)",
      Mùi: "Dần (3h-5h), Mão (5h-7h), Tỵ (9h-11h), Thân (15h-17h), Tuất (19h-21h), Hợi (21h-23h)",
      Thân: "Tý (23h-1h), Sửu (1h-3h), Thìn (7h-9h), Tỵ (9h-11h), Mùi (13h-15h), Tuất (19h-21h)",
      Dậu: "Tý (23h-1h), Dần (3h-5h), Mão (5h-7h), Ngọ (11h-13h), Mùi (13h-15h), Dậu (17h-19h)",
      Tuất: "Dần (3h-5h), Thìn (7h-9h), Tỵ (9h-11h), Thân (15h-17h), Dậu (17h-19h), Hợi (21h-23h)",
      Hợi: "Sửu (1h-3h), Thìn (7h-9h), Ngọ (11h-13h), Mùi (13h-15h), Tuất (19h-21h), Hợi (21h-23h)"
    };

    const auspiciousHours = GIO_HOANG_DAO_MAP[dayChi] || GIO_HOANG_DAO_MAP.Tý;

    const topTicker = document.getElementById("top-lunar-text");
    if (topTicker) {
      topTicker.textContent = `${solarStr} • Âm lịch: ${lunarDayMonth} (Ngày ${dayCan} ${dayChi} - Năm ${yearCan} ${yearChi})`;
    }

    const solarEl = document.getElementById("hero-solar-date");
    const lunarEl = document.getElementById("hero-lunar-date");
    const hoursEl = document.getElementById("hero-auspicious-hours");

    if (solarEl) solarEl.textContent = `${d}/${m}/${y}`;
    if (lunarEl) lunarEl.textContent = `${lunarDayMonth} ÂL • Ngày ${dayCan} ${dayChi}`;
    if (hoursEl) {
      hoursEl.innerHTML = `<strong>Giờ Hoàng Đạo:</strong> ${auspiciousHours}.<br><strong>Việc tốt:</strong> Cầu an, dâng hương, gieo quẻ, phóng sinh, làm việc thiện.`;
    }
  }

  // ---------- 4. Interactive Divination Sanctuary ----------
  function initDivinationTabs() {
    const tabBtns = document.querySelectorAll(".divination-tabs .tab-btn");
    const panels = document.querySelectorAll(".divination-panel");

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-tab");
        tabBtns.forEach((b) => b.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        const activePanel = document.getElementById(`panel-${target}`);
        if (activePanel) activePanel.classList.add("active");
      });
    });

    // 4.1 Xin Xăm Quán Âm
    const shakeBtn = document.getElementById("btn-shake-xam");
    const cylinder = document.getElementById("xam-cylinder");
    const xamResult = document.getElementById("xam-result-box");

    if (shakeBtn && xamResult) {
      shakeBtn.addEventListener("click", () => {
        const userName =
          (document.getElementById("xam-user-name")?.value || "").trim() ||
          "Tín chủ hữu duyên";
        const topic =
          document.getElementById("xam-topic")?.value || "Gia đạo & Bình an";

        if (cylinder) cylinder.classList.add("shaking");
        shakeBtn.disabled = true;
        shakeBtn.textContent = "Đang thành tâm lắc ống xăm...";

        setTimeout(() => {
          if (cylinder) cylinder.classList.remove("shaking");
          shakeBtn.disabled = false;
          shakeBtn.textContent = "🙏 Xin Quẻ Xăm Khác";

          const sticks = FORTUNES.quanAmSticks || [];
          const picked = sticks[Math.floor(Math.random() * sticks.length)];
          if (!picked) return;

          const zaloMsg = encodeURIComponent(
            `Chào Cô Bé Hữu Duyên, mình là ${userName}. Mình vừa rút được ${picked.number} (${picked.rank} - ${picked.title}) cầu về ${topic} trên web cobehuuduyen.com. Nhờ Cô hữu duyên luận giải chi tiết giúp mình ạ!`
          );

          xamResult.innerHTML = `
            <div>
              <span class="result-rank-badge">${picked.number} • ${picked.rank}</span>
              <h3 style="font-size:1.5rem;color:var(--gold-light);margin-bottom:0.35rem;">${picked.title}</h3>
              <p style="font-size:0.86rem;color:var(--text-muted);">Tín chủ: <strong>${userName}</strong> • Sở cầu: <strong>${topic}</strong></p>
              <div class="poem-scroll">${picked.poem}</div>
              <p style="margin-bottom:0.75rem;"><strong>Ý nghĩa quẻ xăm:</strong> ${picked.meaning}</p>
              <ul class="advice-list">
                <li><strong>💼 Công danh & Tài lộc:</strong> ${picked.advice.career}</li>
                <li><strong>❤️ Tình duyên & Gia đạo:</strong> ${picked.advice.love}</li>
                <li><strong>🌿 Sức khoẻ & Hoá giải:</strong> ${picked.advice.health}</li>
              </ul>
              <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:1rem;">
                <a href="https://zalo.me/0702311558?text=${zaloMsg}" target="_blank" rel="noopener" class="btn btn-gold">
                  💬 Nhờ Cô Bé Hữu Duyên Giải Chi Tiết (Zalo)
                </a>
                <a href="#vat-pham" class="btn btn-outline">🪷 Thỉnh Vật Phẩm Trợ Vận</a>
              </div>
            </div>
          `;
          showToast(`✨ Bạn đã rút được ${picked.number}: ${picked.rank}`);
        }, 1100);
      });
    }

    // 4.2 Gieo Quẻ Kinh Dịch (3 Đồng Xu Cổ)
    const castBtn = document.getElementById("btn-cast-iching");
    const ichingResult = document.getElementById("iching-result-box");
    const coins = document.querySelectorAll(".ancient-coin");

    if (castBtn && ichingResult) {
      castBtn.addEventListener("click", () => {
        const question =
          (document.getElementById("iching-question")?.value || "").trim() ||
          "Cầu hỏi vận trình công việc, tài lộc sắp tới";

        coins.forEach((c) => c.classList.add("spinning"));
        castBtn.disabled = true;
        castBtn.textContent = "Đang gieo đồng xu Âm Dương...";

        setTimeout(() => {
          coins.forEach((c) => c.classList.remove("spinning"));
          castBtn.disabled = false;
          castBtn.textContent = "☯️ Gieo Quẻ Kinh Dịch Mới";

          const hexagrams = FORTUNES.ichingHexagrams || [];
          const hex = hexagrams[Math.floor(Math.random() * hexagrams.length)];
          if (!hex) return;

          ichingResult.innerHTML = `
            <div>
              <span class="result-rank-badge">${hex.rating}</span>
              <div style="display:flex;align-items:center;gap:0.85rem;margin:0.4rem 0 0.75rem;">
                <span style="font-size:2.8rem;line-height:1;color:var(--gold-light);">${hex.symbol}</span>
                <div>
                  <h3 style="font-size:1.55rem;color:var(--gold-light);">${hex.name}</h3>
                  <small style="color:var(--text-muted);">Ngũ hành quẻ: <strong>${hex.element}</strong> • Việc hỏi: ${question}</small>
                </div>
              </div>
              <div class="poem-scroll">“${hex.judgment}”</div>
              <p style="margin-bottom:1.1rem;"><strong>Lời bàn của Cô Bé Hữu Duyên:</strong> ${hex.interpretation}</p>
              <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                <a href="#dat-lich" class="btn btn-gold">📅 Đặt Lịch Xem Chuyên Sâu 1-1</a>
                <a href="https://zalo.me/0702311558" target="_blank" rel="noopener" class="btn btn-outline">Hỏi Thầy Qua Zalo 0702.311.558</a>
              </div>
            </div>
          `;
          showToast(`☯️ Đã ứng ${hex.name}`);
        }, 1000);
      });
    }

    // 4.3 Bói Bài Tarot Tâm Linh (3 Lá)
    const drawTarotBtn = document.getElementById("btn-draw-tarot");
    const tarotResult = document.getElementById("tarot-result-box");
    const tarotSlots = document.querySelectorAll(".tarot-card-slot");

    function triggerTarotReading() {
      const cards = [...(FORTUNES.tarotCards || [])];
      if (cards.length < 3 || !tarotResult) return;

      // Shuffle
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      const picked = cards.slice(0, 3);
      const positions = ["Quá Khứ & Căn Nguyên", "Hiện Tại & Năng Lượng", "Tương Lai & Lời Khuyên"];

      tarotSlots.forEach((slot, idx) => {
        const card = picked[idx];
        slot.innerHTML = `
          <span class="tarot-slot-label">${positions[idx]}</span>
          <div style="font-size:1.8rem;margin:0.35rem 0;">✨</div>
          <strong style="color:var(--gold-light);font-size:0.95rem;">${card.name}</strong>
          <small style="color:var(--text-secondary);margin-top:0.35rem;">${card.keywords.join(" • ")}</small>
        `;
      });

      tarotResult.innerHTML = `
        <div>
          <span class="result-rank-badge">Thông Điệp Trải Bài 3 Lá</span>
          <h3 style="font-size:1.45rem;color:var(--gold-light);margin-bottom:0.85rem;">Giải Mã Tín Hiệu Tâm Linh Của Bạn</h3>
          <ul class="advice-list">
            ${picked
              .map(
                (c, i) => `
              <li>
                <strong style="color:var(--gold-light);">${positions[i]} — ${c.name}:</strong><br>
                ${c.message}
              </li>`
              )
              .join("")}
          </ul>
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:1rem;">
            <a href="https://www.tiktok.com/@cobehuuduyen" target="_blank" rel="noopener" class="btn btn-crimson">
              🎵 Xem Phiên Live Giải Bài Trên TikTok @cobehuuduyen
            </a>
            <a href="https://zalo.me/0702311558" target="_blank" rel="noopener" class="btn btn-outline">
              Trải Bài Riêng 1-1 Qua Zalo
            </a>
          </div>
        </div>
      `;
      showToast("🔮 Đã lật 3 lá bài Tarot hữu duyên!");
    }

    if (drawTarotBtn) {
      drawTarotBtn.addEventListener("click", triggerTarotReading);
    }
    tarotSlots.forEach((slot) => {
      slot.addEventListener("click", triggerTarotReading);
    });

    // 4.4 Tra Cứu Bản Mệnh Ngũ Hành & Gợi Ý Vật Phẩm Hợp Tuổi
    const calcElementBtn = document.getElementById("btn-calc-element");
    const elementResult = document.getElementById("element-result-box");

    if (calcElementBtn && elementResult) {
      calcElementBtn.addEventListener("click", () => {
        const birthYear = parseInt(
          document.getElementById("birth-year-input")?.value || "1995",
          10
        );
        const gender = document.getElementById("birth-gender-input")?.value || "Nữ";

        if (isNaN(birthYear) || birthYear < 1930 || birthYear > 2030) {
          showToast("Vui lòng nhập năm sinh hợp lệ (1930 - 2030)");
          return;
        }

        const CAN = ["Canh", "Tân", "Nhâm", "Quý", "Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ"];
        const CHI = ["Thân", "Dậu", "Tuất", "Hợi", "Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi"];
        const canChiYear = `${CAN[birthYear % 10]} ${CHI[birthYear % 12]}`;

        // Ngu Hanh Nap Am formula
        const canValues = { Giáp: 1, Ất: 1, Bính: 2, Đinh: 2, Mậu: 3, Kỷ: 3, Canh: 4, Tân: 4, Nhâm: 5, Quý: 5 };
        const chiValues = {
          Tý: 0, Sửu: 0, Ngọ: 0, Mùi: 0,
          Dần: 1, Mão: 1, Thân: 1, Dậu: 1,
          Thìn: 2, Tỵ: 2, Tuất: 2, Hợi: 2
        };
        const cName = CAN[birthYear % 10];
        const zName = CHI[birthYear % 12];
        let sum = (canValues[cName] || 1) + (chiValues[zName] || 0);
        if (sum > 5) sum -= 5;

        const ELEMENT_MAP = {
          1: {
            element: "Kim",
            Compatible: "Thổ (Tương sinh), Kim (Tương hợp)",
            Colors: "Vàng kim, Trắng, Nâu đất",
            Numbers: "6, 7, 2, 5, 8",
            Desc: "Người mệnh Kim có tư duy sắc bén, trọng chữ tín và có tố chất lãnh đạo. Đeo vật phẩm hành Thổ hoặc Kim giúp vượng tài lộc, công danh vững chắc."
          },
          2: {
            element: "Thuỷ",
            Compatible: "Kim (Tương sinh), Thuỷ (Tương hợp)",
            Colors: "Xanh biển, Đen, Trắng, Ánh kim",
            Numbers: "1, 6, 7",
            Desc: "Người mệnh Thuỷ thông tuệ, khéo léo trong giao tiếp và giàu lòng trắc ẩn. Hợp sử dụng đá Mắt Hổ Xanh Đen, Hồ Lô Đồng hoặc Khánh Ngọc Bình An."
          },
          3: {
            element: "Hoả",
            Compatible: "Mộc (Tương sinh), Hoả (Tương hợp)",
            Colors: "Đỏ chu sa, Hồng, Tím, Xanh lục",
            Numbers: "9, 3, 4",
            Desc: "Người mệnh Hoả nhiệt huyết, sáng tạo và tràn đầy năng lượng dương. Đặc biệt đại cát khi đeo Vòng Đá Chu Sa Đỏ hoặc Xông Trầm Hương tự nhiên."
          },
          4: {
            element: "Thổ",
            Compatible: "Hoả (Tương sinh), Thổ (Tương hợp)",
            Colors: "Vàng hoàng thổ, Nâu, Đỏ, Cam",
            Numbers: "2, 5, 8, 9",
            Desc: "Người mệnh Thổ bao dung, điềm đạm, là điểm tựa vững chắc cho gia đình. Hợp với Thạch Anh Tóc Vàng, Vòng Chu Sa và Lư Xông Trầm Gốm Tử Sa."
          },
          5: {
            element: "Mộc",
            Compatible: "Thuỷ (Tương sinh), Mộc (Tương hợp)",
            Colors: "Xanh ngọc, Xanh lá, Đen, Xanh dương",
            Numbers: "3, 4, 1",
            Desc: "Người mệnh Mộc nhân hậu, vươn lên mạnh mẽ như cây đại thụ. Hợp thỉnh Trầm Hương tự nhiên, Vòng Mắt Hổ Xanh Đen và Dây Treo Khánh Ngọc."
          }
        };

        const info = ELEMENT_MAP[sum] || ELEMENT_MAP[3];
        const matchingProducts = PRODUCTS.filter((p) =>
          (p.elements || []).includes(info.element)
        ).slice(0, 3);

        elementResult.innerHTML = `
          <div>
            <span class="result-rank-badge">Tuổi ${canChiYear} (${birthYear}) • ${gender} mạng</span>
            <h3 style="font-size:1.5rem;color:var(--gold-light);margin-bottom:0.5rem;">
              Bản Mệnh Ngũ Hành: Hành ${info.element}
            </h3>
            <p style="margin-bottom:0.8rem;">${info.Desc}</p>
            <ul class="advice-list">
              <li><strong>🌟 Hành tương sinh & trợ mệnh:</strong> ${info.Compatible}</li>
              <li><strong>🎨 Màu sắc đại cát:</strong> ${info.Colors}</li>
              <li><strong>🔢 Con số may mắn:</strong> ${info.Numbers}</li>
            </ul>
            <h4 style="color:var(--gold-light);margin:1rem 0 0.6rem;font-size:1.1rem;">
              🪷 Vật Phẩm Hợp Mệnh ${info.element} Tại Cửa Hàng:
            </h4>
            <div style="display:grid;gap:0.55rem;margin-bottom:1rem;">
              ${matchingProducts
                .map(
                  (mp) => `
                <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-card);padding:0.6rem 0.85rem;border-radius:10px;border:1px solid var(--border-subtle);">
                  <div>
                    <strong style="font-size:0.9rem;">${mp.name}</strong>
                    <div style="font-size:0.8rem;color:var(--gold-primary);">${formatVND(mp.price)}</div>
                  </div>
                  <button type="button" class="btn btn-gold" style="padding:0.4rem 0.85rem;font-size:0.8rem;" data-quick-add="${mp.id}">
                    + Thỉnh Ngay
                  </button>
                </div>`
                )
                .join("")}
            </div>
            <button type="button" class="btn btn-outline" id="btn-filter-by-element" data-element="${info.element}">
              🔍 Lọc Toàn Bộ Vật Phẩm Hợp Mệnh ${info.element} Dưới Cửa Hàng
            </button>
          </div>
        `;

        elementResult.querySelectorAll("[data-quick-add]").forEach((btn) => {
          btn.addEventListener("click", () => {
            addToCart(btn.getAttribute("data-quick-add"));
          });
        });

        const filterBtn = document.getElementById("btn-filter-by-element");
        if (filterBtn) {
          filterBtn.addEventListener("click", () => {
            const el = filterBtn.getAttribute("data-element");
            const selectEl = document.getElementById("shop-element-filter");
            if (selectEl) {
              selectEl.value = el;
              activeElementFilter = el;
              renderProducts();
            }
            document.getElementById("vat-pham")?.scrollIntoView({ behavior: "smooth" });
          });
        }
      });
    }
  }

  // ---------- 5. Product Shop & Filtering ----------
  function getProductArtworkSvg(type) {
    const svgMap = {
      "shrine-gold": `<svg width="96" height="96" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="44" stroke="#D4AF37" stroke-width="2" stroke-dasharray="4 3"/><path d="M22 65C22 52 35 45 50 45C65 45 78 52 78 65L70 76H30L22 65Z" fill="#D4AF37"/><ellipse cx="50" cy="46" rx="16" ry="9" fill="#FBE59B"/><path d="M35 30L50 18L65 30" stroke="#FBE59B" stroke-width="3" stroke-linecap="round"/></svg>`,
      "ancestral-box": `<svg width="96" height="96" viewBox="0 0 100 100" fill="none"><rect x="20" y="26" width="60" height="48" rx="6" fill="#8B1E1E" stroke="#D4AF37" stroke-width="2.5"/><path d="M20 42H80" stroke="#D4AF37" stroke-width="2"/><circle cx="50" cy="56" r="10" fill="#D4AF37"/></svg>`,
      "star-ritual": `<svg width="96" height="96" viewBox="0 0 100 100" fill="none"><polygon points="50,14 61,38 87,41 67,59 73,85 50,71 27,85 33,59 13,41 39,38" fill="#D4AF37" opacity="0.9"/><circle cx="50" cy="52" r="12" fill="#8B1E1E"/></svg>`,
      "red-horse": `<svg width="96" height="96" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="42" stroke="#D4AF37" stroke-width="2"/><path d="M30 68L38 42L52 34L65 24L72 34L62 48L70 68H30Z" fill="#B82525" stroke="#FBE59B" stroke-width="2"/></svg>`,
      "cinnabar-bracelet": `<svg width="96" height="96" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="30" stroke="#D4AF37" stroke-width="2" stroke-dasharray="2 6"/><circle cx="50" cy="20" r="8" fill="#FBE59B"/><circle cx="71" cy="29" r="7" fill="#B82525"/><circle cx="80" cy="50" r="7" fill="#B82525"/><circle cx="71" cy="71" r="7" fill="#B82525"/><circle cx="50" cy="80" r="7" fill="#B82525"/><circle cx="29" cy="71" r="7" fill="#B82525"/><circle cx="20" cy="50" r="7" fill="#B82525"/><circle cx="29" cy="29" r="7" fill="#B82525"/></svg>`,
      "gold-quartz": `<svg width="96" height="96" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="30" stroke="#FBE59B" stroke-width="10" stroke-dasharray="12 6"/><circle cx="50" cy="50" r="14" fill="#D4AF37" opacity="0.35"/></svg>`,
      "pixiu-bracelet": `<svg width="96" height="96" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="29" stroke="#2EA87E" stroke-width="9" stroke-dasharray="10 5"/><rect x="38" y="14" width="24" height="14" rx="5" fill="#D4AF37"/></svg>`,
      "bronze-gourd": `<svg width="96" height="96" viewBox="0 0 100 100" fill="none"><path d="M50 16V24M38 36C38 29 43 24 50 24C57 24 62 29 62 36C62 41 58 45 55 47C63 50 68 58 68 67C68 78 60 85 50 85C40 85 32 78 32 67C32 58 37 50 45 47C42 45 38 41 38 36Z" fill="#D4AF37" stroke="#FBE59B" stroke-width="2"/></svg>`,
      "incense-cones": `<svg width="96" height="96" viewBox="0 0 100 100" fill="none"><path d="M50 18C44 26 56 32 50 40" stroke="#FBE59B" stroke-width="2.5" stroke-linecap="round"/><polygon points="50,44 68,78 32,78" fill="#9C7A1C" stroke="#D4AF37" stroke-width="2"/></svg>`,
      "lotus-burner": `<svg width="96" height="96" viewBox="0 0 100 100" fill="none"><path d="M26 56C26 72 37 80 50 80C63 80 74 72 74 56H26Z" fill="#785407" stroke="#D4AF37" stroke-width="2"/><path d="M34 54L50 32L66 54H34Z" fill="#D4AF37"/></svg>`,
      "sacred-water": `<svg width="96" height="96" viewBox="0 0 100 100" fill="none"><rect x="42" y="20" width="16" height="12" rx="2" fill="#D4AF37"/><path d="M36 42C36 36 42 32 50 32C58 32 64 36 64 42V78C64 82 60 85 50 85C40 85 36 82 36 78V42Z" fill="#8B1E1E" stroke="#D4AF37" stroke-width="2"/></svg>`,
      "amulet-pouch": `<svg width="96" height="96" viewBox="0 0 100 100" fill="none"><path d="M34 32L50 24L66 32L72 78C72 82 62 85 50 85C38 85 28 82 28 78L34 32Z" fill="#B82525" stroke="#D4AF37" stroke-width="2.5"/><circle cx="50" cy="58" r="11" stroke="#FBE59B" stroke-width="2"/></svg>`,
      "car-tassel": `<svg width="96" height="96" viewBox="0 0 100 100" fill="none"><line x1="50" y1="12" x2="50" y2="86" stroke="#B82525" stroke-width="4"/><polygon points="50,30 68,48 50,66 32,48" fill="#D4AF37" stroke="#FBE59B" stroke-width="2"/></svg>`,
      "gold-card": `<svg width="96" height="96" viewBox="0 0 100 100" fill="none"><rect x="26" y="20" width="48" height="64" rx="6" fill="#D4AF37" stroke="#FBE59B" stroke-width="2"/><circle cx="50" cy="46" r="12" stroke="#5C0D0D" stroke-width="2.5"/></svg>`
    };
    return svgMap[type] || svgMap["shrine-gold"];
  }

  function renderProducts() {
    const grid = document.getElementById("products-grid");
    if (!grid) return;

    const filtered = PRODUCTS.filter((p) => {
      const matchCat = activeCategory === "all" || p.category === activeCategory;
      const matchEl =
        activeElementFilter === "all" ||
        (p.elements && p.elements.includes(activeElementFilter));
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.shortDesc.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q);
      return matchCat && matchEl && matchSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:3rem;background:var(--bg-card);border-radius:18px;border:1px solid var(--border-subtle);">
          <p style="font-size:1.1rem;color:var(--text-secondary);margin-bottom:1rem;">Không tìm thấy vật phẩm phù hợp với bộ lọc hiện tại.</p>
          <button type="button" class="btn btn-gold" id="btn-reset-shop-filter">Xem Tất Cả Vật Phẩm</button>
        </div>
      `;
      document.getElementById("btn-reset-shop-filter")?.addEventListener("click", () => {
        activeCategory = "all";
        activeElementFilter = "all";
        searchQuery = "";
        const searchInput = document.getElementById("shop-search-input");
        const elSelect = document.getElementById("shop-element-filter");
        if (searchInput) searchInput.value = "";
        if (elSelect) elSelect.value = "all";
        document.querySelectorAll(".cat-pill").forEach((b) => {
          b.classList.toggle("active", b.getAttribute("data-cat") === "all");
        });
        renderProducts();
      });
      return;
    }

    grid.innerHTML = filtered
      .map(
        (p) => `
      <article class="product-card" data-product-id="${p.id}">
        <div class="product-visual">
          <span class="product-badge">${p.badge}</span>
          ${getProductArtworkSvg(p.artworkType)}
          <span class="product-element-tag">☯️ Mệnh: ${p.elements.join(", ")}</span>
        </div>
        <div class="product-body">
          <div class="product-cat-label">${p.categoryName}</div>
          <h3 class="product-title">${p.name}</h3>
          <p class="product-desc">${p.shortDesc}</p>
          <div class="product-price-row">
            <span class="price-current">${formatVND(p.price)}</span>
            ${p.originalPrice ? `<span class="price-old">${formatVND(p.originalPrice)}</span>` : ""}
          </div>
          <div class="product-actions">
            <button type="button" class="btn btn-gold" style="padding:0.65rem 1rem;font-size:0.88rem;" data-add-cart="${p.id}">
              🛒 Thỉnh Vật Phẩm
            </button>
            <button type="button" class="btn btn-outline" style="padding:0.65rem 0.9rem;font-size:0.86rem;" data-detail-product="${p.id}" title="Xem ý nghĩa chi tiết">
              Chi tiết
            </button>
          </div>
        </div>
      </article>
    `
      )
      .join("");

    grid.querySelectorAll("[data-add-cart]").forEach((btn) => {
      btn.addEventListener("click", () => addToCart(btn.getAttribute("data-add-cart")));
    });

    grid.querySelectorAll("[data-detail-product]").forEach((btn) => {
      btn.addEventListener("click", () =>
        openProductModal(btn.getAttribute("data-detail-product"))
      );
    });
  }

  function initShopControls() {
    document.querySelectorAll(".cat-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(".cat-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        activeCategory = pill.getAttribute("data-cat") || "all";
        renderProducts();
      });
    });

    const elFilter = document.getElementById("shop-element-filter");
    if (elFilter) {
      elFilter.addEventListener("change", () => {
        activeElementFilter = elFilter.value;
        renderProducts();
      });
    }

    const searchInput = document.getElementById("shop-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        searchQuery = searchInput.value.trim();
        renderProducts();
      });
    }

    // Bind initial static product buttons before dynamic re-render
    document.querySelectorAll("[data-add-cart]").forEach((btn) => {
      btn.addEventListener("click", () => addToCart(btn.getAttribute("data-add-cart")));
    });
    document.querySelectorAll("[data-detail-product]").forEach((btn) => {
      btn.addEventListener("click", () =>
        openProductModal(btn.getAttribute("data-detail-product"))
      );
    });
  }

  function openProductModal(productId) {
    const product = PRODUCTS.find((p) => p.id === productId);
    const modal = document.getElementById("product-detail-modal");
    const content = document.getElementById("product-modal-content");
    if (!product || !modal || !content) return;

    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1rem;">
        <div>
          <span class="result-rank-badge">${product.categoryName} • ${product.badge}</span>
          <h3 style="font-size:1.6rem;color:var(--gold-light);">${product.name}</h3>
        </div>
        <button type="button" class="icon-btn" id="close-product-modal">✕ Đóng</button>
      </div>
      <p style="color:var(--text-secondary);margin-bottom:1rem;">${product.shortDesc}</p>
      <div style="background:var(--bg-secondary);padding:1rem;border-radius:12px;border:1px solid var(--border-subtle);margin-bottom:1rem;">
        <p style="margin-bottom:0.5rem;"><strong>☯️ Bản mệnh phù hợp:</strong> ${product.elementText}</p>
        <strong style="color:var(--gold-light);display:block;margin-bottom:0.4rem;">✨ Đặc điểm & Ý nghĩa tâm linh:</strong>
        <ul style="padding-left:1.2rem;display:grid;gap:0.35rem;font-size:0.92rem;">
          ${(product.benefits || []).map((b) => `<li>${b}</li>`).join("")}
        </ul>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;padding-top:0.5rem;">
        <div>
          <small style="color:var(--text-muted);display:block;">Phí thỉnh vật phẩm:</small>
          <span class="price-current" style="font-size:1.5rem;">${formatVND(product.price)}</span>
        </div>
        <div style="display:flex;gap:0.65rem;flex-wrap:wrap;">
          <button type="button" class="btn btn-gold" id="modal-add-to-cart">🛒 Thêm Vào Giỏ & Đặt Thỉnh</button>
          <a href="https://zalo.me/0702311558" target="_blank" rel="noopener" class="btn btn-outline">Tư Vấn Qua Zalo</a>
        </div>
      </div>
    `;

    modal.classList.add("open");
    document.getElementById("close-product-modal")?.addEventListener("click", () => {
      modal.classList.remove("open");
    });
    document.getElementById("modal-add-to-cart")?.addEventListener("click", () => {
      addToCart(product.id);
      modal.classList.remove("open");
      openCartDrawer();
    });
  }

  // ---------- 6. Smart Cart & VietQR / Zalo Checkout ----------
  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
    updateCartBadge();
  }

  function updateCartBadge() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById("cart-count-badge");
    if (badge) badge.textContent = String(count);
  }

  function addToCart(productId) {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;

    const existing = cart.find((item) => item.id === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        qty: 1
      });
    }
    saveCart();
    renderCartDrawer();
    showToast(`🪷 Đã thêm "${product.name}" vào giỏ thỉnh!`);
  }

  function openCartDrawer() {
    const drawer = document.getElementById("cart-drawer-backdrop");
    if (drawer) {
      renderCartDrawer();
      drawer.classList.add("open");
    }
  }

  function closeCartDrawer() {
    document.getElementById("cart-drawer-backdrop")?.classList.remove("open");
  }

  function renderCartDrawer() {
    const listEl = document.getElementById("cart-items-list");
    const summaryEl = document.getElementById("cart-checkout-area");
    if (!listEl || !summaryEl) return;

    if (cart.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center;padding:2.5rem 1rem;color:var(--text-muted);">
          <p style="font-size:1rem;margin-bottom:0.8rem;">Giỏ thỉnh vật phẩm của bạn đang trống.</p>
          <p style="font-size:0.86rem;">Hãy chọn các bộ lễ Hàng Mã, Vòng Phong Thuỷ hoặc Trầm Hương hợp mệnh nhé!</p>
        </div>
      `;
      summaryEl.style.display = "none";
      return;
    }

    summaryEl.style.display = "block";
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    listEl.innerHTML = cart
      .map(
        (item) => `
      <div class="cart-item">
        <div style="flex:1;">
          <strong style="font-size:0.92rem;display:block;">${item.name}</strong>
          <span style="font-size:0.84rem;color:var(--gold-primary);">${formatVND(item.price)} x ${item.qty}</span>
        </div>
        <div class="qty-control">
          <button type="button" class="qty-btn" data-cart-dec="${item.id}">-</button>
          <span style="padding:0 0.6rem;font-size:0.88rem;font-weight:600;">${item.qty}</span>
          <button type="button" class="qty-btn" data-cart-inc="${item.id}">+</button>
        </div>
      </div>
    `
      )
      .join("");

    const totalEl = document.getElementById("cart-total-amount");
    if (totalEl) totalEl.textContent = formatVND(total);

    const customerPhone =
      (document.getElementById("cart-customer-phone")?.value || "").trim() || "SDT";
    const qrImg = document.getElementById("cart-vietqr-img");
    if (qrImg) {
      qrImg.src = buildVietQrUrl(total, `THINH VAT PHAM ${customerPhone}`);
    }

    listEl.querySelectorAll("[data-cart-dec]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-cart-dec");
        const found = cart.find((i) => i.id === id);
        if (found) {
          found.qty -= 1;
          if (found.qty <= 0) cart = cart.filter((i) => i.id !== id);
          saveCart();
          renderCartDrawer();
        }
      });
    });

    listEl.querySelectorAll("[data-cart-inc]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-cart-inc");
        const found = cart.find((i) => i.id === id);
        if (found) {
          found.qty += 1;
          saveCart();
          renderCartDrawer();
        }
      });
    });
  }

  function initCartEvents() {
    updateCartBadge();
    document.getElementById("open-cart-btn")?.addEventListener("click", openCartDrawer);
    document.getElementById("close-cart-btn")?.addEventListener("click", closeCartDrawer);

    const backdrop = document.getElementById("cart-drawer-backdrop");
    if (backdrop) {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) closeCartDrawer();
      });
    }

    const phoneInput = document.getElementById("cart-customer-phone");
    if (phoneInput) {
      phoneInput.addEventListener("input", () => {
        const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        const qrImg = document.getElementById("cart-vietqr-img");
        if (qrImg && total > 0) {
          qrImg.src = buildVietQrUrl(total, `THINH VAT PHAM ${phoneInput.value.trim()}`);
        }
      });
    }

    const submitZaloBtn = document.getElementById("btn-checkout-zalo");
    if (submitZaloBtn) {
      submitZaloBtn.addEventListener("click", () => {
        const name = (document.getElementById("cart-customer-name")?.value || "").trim();
        const phone = (document.getElementById("cart-customer-phone")?.value || "").trim();
        const address = (document.getElementById("cart-customer-address")?.value || "").trim();
        const note = (document.getElementById("cart-customer-note")?.value || "").trim();
        const blessCheck = document.getElementById("cart-bless-checkbox")?.checked;

        if (!name || !phone || !address) {
          showToast("⚠️ Vui lòng điền Họ tên, Số điện thoại và Địa chỉ nhận vật phẩm!");
          return;
        }

        const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        const itemsText = cart
          .map((i, idx) => `${idx + 1}. ${i.name} (SL: ${i.qty}) - ${formatVND(i.price * i.qty)}`)
          .join("\n");

        const orderSummary = [
          "🪷 ĐƠN THỈNH VẬT PHẨM - CÔ BÉ HỮU DUYÊN",
          `• Tín chủ: ${name}`,
          `• SĐT: ${phone}`,
          `• Địa chỉ nhận: ${address}`,
          `• Yêu cầu trì chú/ghi sớ: ${blessCheck ? "Có nhờ Cô trì chú khai quang theo tuổi" : "Không"}`,
          note ? `• Ghi chú năm sinh/lời nhắn: ${note}` : "",
          "--- Danh sách vật phẩm ---",
          itemsText,
          `👉 TỔNG CỘNG: ${formatVND(total)}`,
          "• Thanh toán: Chuyển khoản Vietcombank 0051000567270 (Nguyễn Thị Thu Hồng) / Hoặc xác nhận qua Zalo."
        ]
          .filter(Boolean)
          .join("\n");

        copyToClipboard(
          orderSummary,
          "✅ Đã sao chép nội dung đơn hàng! Đang mở Zalo Cô Bé Hữu Duyên (0702311558)..."
        );

        setTimeout(() => {
          window.open(
            `https://zalo.me/0702311558?text=${encodeURIComponent(orderSummary)}`,
            "_blank",
            "noopener"
          );
        }, 500);
      });
    }
  }

  // ---------- 7. 1-1 Master Booking Form ----------
  function initBookingForm() {
    const form = document.getElementById("master-booking-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = (document.getElementById("book-name")?.value || "").trim();
      const phone = (document.getElementById("book-phone")?.value || "").trim();
      const dob = (document.getElementById("book-dob")?.value || "").trim();
      const service = (document.getElementById("book-service")?.value || "").trim();
      const channel = (document.getElementById("book-channel")?.value || "Zalo 0702311558").trim();
      const note = (document.getElementById("book-note")?.value || "").trim();

      if (!name || !phone || !dob) {
        showToast("⚠️ Vui lòng điền Họ tên, SĐT và Ngày tháng năm sinh!");
        return;
      }

      const bookingMsg = [
        "🙏 ĐẶT LỊCH XEM TRỰC TIẾP 1-1 — CÔ BÉ HỮU DUYÊN",
        `• Họ tên tín chủ: ${name}`,
        `• Số điện thoại / Zalo: ${phone}`,
        `• Ngày tháng năm sinh & Giờ sinh: ${dob}`,
        `• Nội dung hữu duyên cần xem: ${service}`,
        `• Kênh mong muốn: ${channel}`,
        note ? `• Tâm sự / Câu hỏi thêm: ${note}` : ""
      ]
        .filter(Boolean)
        .join("\n");

      copyToClipboard(
        bookingMsg,
        "✨ Đã sao chép phiếu đặt lịch! Đang kết nối tới Cô Bé Hữu Duyên..."
      );

      const previewBox = document.getElementById("booking-confirmation-preview");
      if (previewBox) {
        previewBox.style.display = "block";
        previewBox.innerHTML = `
          <strong style="color:var(--gold-light);display:block;margin-bottom:0.4rem;">✅ Phiếu Đặt Lịch Đã Sẵn Sàng!</strong>
          <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.75rem;">
            Hệ thống đã tự động sao chép thông tin của <strong>${name}</strong>. Bạn bấm chọn kênh bên dưới để gửi trực tiếp cho Cô Bé Hữu Duyên nhé:
          </p>
          <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
            <a href="https://zalo.me/0702311558?text=${encodeURIComponent(bookingMsg)}" target="_blank" rel="noopener" class="btn btn-gold" style="padding:0.55rem 1rem;font-size:0.85rem;">
              💬 Gửi Qua Zalo (0702.311.558)
            </a>
            <a href="https://www.facebook.com/nhu.lam.545518" target="_blank" rel="noopener" class="btn btn-outline" style="padding:0.55rem 1rem;font-size:0.85rem;">
              📘 Nhắn Qua Facebook
            </a>
            <a href="https://www.tiktok.com/@cobehuuduyen" target="_blank" rel="noopener" class="btn btn-outline" style="padding:0.55rem 1rem;font-size:0.85rem;">
              🎵 TikTok @cobehuuduyen
            </a>
          </div>
        `;
      }
    });
  }

  // ---------- 8. Charity & Merit Donation Modal ----------
  function initCharityActions() {
    const modal = document.getElementById("charity-donate-modal");
    const closeBtn = document.getElementById("close-charity-modal");
    const amountBtns = document.querySelectorAll("[data-donate-amount]");
    const customAmountInput = document.getElementById("charity-custom-amount");
    const donorNameInput = document.getElementById("charity-donor-name");
    const campaignTitleEl = document.getElementById("charity-modal-campaign-title");
    const qrImg = document.getElementById("charity-vietqr-img");
    const syntaxTextEl = document.getElementById("charity-transfer-syntax");

    let currentSyntax = "GIEODUYEN";

    function updateCharityQr() {
      const amt = parseInt(customAmountInput?.value || "200000", 10) || 200000;
      const donor = (donorNameInput?.value || "").trim() || "PHAT TU";
      const content = `${currentSyntax} ${donor}`.toUpperCase();
      if (qrImg) {
        qrImg.src = buildVietQrUrl(amt, content);
      }
      if (syntaxTextEl) {
        syntaxTextEl.textContent = content;
      }
    }

    document.querySelectorAll("[data-open-charity]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const campaignId = btn.getAttribute("data-open-charity");
        const found = (CHARITY.campaigns || []).find((c) => c.id === campaignId);
        if (found) {
          currentSyntax = found.transferSyntax || "GIEODUYEN";
          if (campaignTitleEl) campaignTitleEl.textContent = found.title;
        } else {
          currentSyntax = "GIEODUYEN";
          if (campaignTitleEl) {
            campaignTitleEl.textContent = "Quỹ Từ Thiện & Phóng Sinh Cô Bé Hữu Duyên";
          }
        }
        updateCharityQr();
        modal?.classList.add("open");
      });
    });

    closeBtn?.addEventListener("click", () => modal?.classList.remove("open"));
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("open");
    });

    amountBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.getAttribute("data-donate-amount");
        if (customAmountInput && val) {
          customAmountInput.value = val;
          updateCharityQr();
        }
      });
    });

    customAmountInput?.addEventListener("input", updateCharityQr);
    donorNameInput?.addEventListener("input", updateCharityQr);

    document.getElementById("btn-copy-bank-no")?.addEventListener("click", () => {
      copyToClipboard("0051000567270", "✅ Đã sao chép STK Vietcombank: 0051000567270");
    });
  }

  // ---------- Bootstrapping ----------
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initMobileMenu();
    initLunarCalendar();
    initDivinationTabs();
    initShopControls();
    initCartEvents();
    initBookingForm();
    initCharityActions();

    const productModal = document.getElementById("product-detail-modal");
    productModal?.addEventListener("click", (e) => {
      if (e.target === productModal) productModal.classList.remove("open");
    });
  });
})();
