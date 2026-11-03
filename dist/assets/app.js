/* ==========================================================================
   CÔ BÉ HỮU DUYÊN — TÂM LINH, PHONG THUỶ & THIỆN NGUYỆN (https://cobehuuduyen.com)
   Interactive Client Application:
   - Điện Thờ & Phòng Tụng Kinh Online (3 Phòng + Web Audio Chuông/Mõ + Chuỗi 108 Hạt)
   - Tự động gửi thông báo Telegram + Lưu Cloudflare D1 Database qua /api/events
   - Xem Bói (Xin Xăm, Kinh Dịch, Tarot, Tra Cứu Mệnh) & Giỏ Hàng VietQR
   ========================================================================== */

(function () {
  "use strict";

  const DATA = window.__COBEHUUDUYEN_DATA__ || {};
  const CONFIG = DATA.config || {};
  let PRODUCTS = [...((DATA.products && DATA.products.products) || [])];
  const FORTUNES = DATA.fortunes || {};
  const CHARITY = DATA.charity || {};
  const SANCTUARY = DATA.sanctuary || { rooms: [] };

  const STORAGE_CART_KEY = "cbhd_cart_v1";
  const STORAGE_THEME_KEY = "cbhd_theme_v1";
  const STORAGE_NICKNAME_KEY = "cbhd_nickname_v1";
  const STORAGE_MERIT_KEY = "cbhd_merit_points_v2";

  let cart = loadCart();
  let activeCategory = "all";
  let activeElementFilter = "all";
  let searchQuery = "";

  function getMeritPoints() {
    const val = parseInt(localStorage.getItem(STORAGE_MERIT_KEY) || "30", 10);
    return Number.isNaN(val) ? 30 : Math.max(0, val);
  }

  function awardMeritPoints(points) {
    const next = getMeritPoints() + (Number(points) || 0);
    localStorage.setItem(STORAGE_MERIT_KEY, String(next));
    const el = document.getElementById("home-merit-points");
    if (el) el.textContent = String(next);
    return next;
  }

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
    return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact.png?amount=${amt}&addInfo=${cleanInfo}&accountName=${accountName}`;
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

  // ---------- Cloudflare Turnstile Anti-Spam & Cooldown Guard ----------
  const TURNSTILE_SITE_KEY =
    (CONFIG.turnstile && CONFIG.turnstile.siteKey) || "0x4AAAAAAFxsWkkTeXBYGsul";
  const lastSubmitTimestamps = {};

  function checkCooldown(actionKey, cooldownMs = 6000) {
    const now = Date.now();
    const prev = lastSubmitTimestamps[actionKey] || 0;
    if (now - prev < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - (now - prev)) / 1000);
      showToast(`⏳ Xin chớ nóng vội! Vui lòng đợi ${waitSec} giây nữa trước khi gửi tiếp.`);
      return false;
    }
    return true;
  }

  function markCooldown(actionKey) {
    lastSubmitTimestamps[actionKey] = Date.now();
  }

  function getTurnstileToken(containerEl) {
    if (!containerEl) return "";
    const input = containerEl.querySelector('input[name="cf-turnstile-response"]');
    return input ? input.value.trim() : "";
  }

  function resetTurnstileInContainer(containerEl) {
    if (!containerEl || !window.turnstile) return;
    const widget = containerEl.querySelector(".cf-turnstile");
    if (widget) {
      try {
        window.turnstile.reset(widget);
      } catch {
        // ignore reset error
      }
    }
  }

  // ---------- Cloud Sync: Telegram Group + Cloudflare D1 (/api/events) ----------
  async function syncEventToCloud(eventData) {
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback silently when offline or local preview
    }
    return { ok: false };
  }

  // ---------- Web Audio API: Tiếng Chuông Bát Nhã & Tiếng Mõ Tụng Kinh ----------
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTempleBellSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Harmonic frequencies for a resonant bronze meditation bowl / bell
    const freqs = [264, 528, 792, 1056];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now);

      const initialGain = 0.28 / (idx + 1);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(initialGain, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4 - idx * 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 3.5);
    });
  }

  function playWoodenFishSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.09);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.42, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
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
    if (labelEl) labelEl.textContent = theme === "dark" ? "Sáng" : "Tối";
    if (iconEl) iconEl.textContent = theme === "dark" ? "☀️" : "🌙";
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

  // ---------- 3. Vietnamese Lunar Calendar ----------
  function initLunarCalendar() {
    const now = new Date();
    const solarStr = now.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

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

    let lunarDayMonth = "";
    try {
      lunarDayMonth = new Intl.DateTimeFormat("vi-VN-u-ca-chinese", {
        day: "numeric",
        month: "numeric"
      }).format(now);
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
      hoursEl.innerHTML = `<strong>Giờ Hoàng Đạo:</strong> ${auspiciousHours}.<br><strong>Việc tốt:</strong> Vào phòng tụng kinh, dâng hương, gieo quẻ, phóng sinh.`;
    }
  }

  // ---------- 4. ĐIỆN THỜ & PHÒNG TỤNG KINH ONLINE (3 PHÒNG) ----------
  function initOnlineChantSanctuary() {
    const rooms = SANCTUARY.rooms || [];
    if (!rooms.length) return;

    let currentRoom = rooms[0];
    let currentLineIdx = 0;
    let autoChantTimer = null;
    let meritCount = parseInt(localStorage.getItem(STORAGE_MERIT_KEY) || "18", 10);

    const nicknameInput = document.getElementById("sanctuary-nickname-input");
    const savedNick = localStorage.getItem(STORAGE_NICKNAME_KEY) || "";
    if (nicknameInput && savedNick) {
      nicknameInput.value = savedNick;
    }
    nicknameInput?.addEventListener("change", () => {
      const val = nicknameInput.value.trim();
      if (val) {
        localStorage.setItem(STORAGE_NICKNAME_KEY, val);
        showToast(`🪷 Đã lưu Pháp danh / Tên tín chủ: ${val}`);
      }
    });

    function getNickname() {
      return (nicknameInput?.value || "").trim() || "Phật tử Hữu Duyên";
    }

    function getDeitySvg(roomId) {
      if (roomId === "quan-am") {
        return `<svg width="110" height="110" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="52" stroke="#5CE1E6" stroke-width="1.5" stroke-dasharray="4 4"/>
          <path d="M60 20C70 34 76 48 72 64C68 74 52 74 48 64C44 48 50 34 60 20Z" fill="#FBE59B"/>
          <path d="M36 74C46 66 74 66 84 74L92 92H28L36 74Z" fill="#D4AF37"/>
          <circle cx="60" cy="44" r="10" fill="#FFFDF9"/>
        </svg>`;
      }
      if (roomId === "thanh-mau") {
        return `<svg width="110" height="110" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="52" stroke="#FF5E5E" stroke-width="2" stroke-dasharray="5 3"/>
          <polygon points="60,16 74,42 102,46 80,66 86,94 60,80 34,94 40,66 18,46 46,42" fill="#D4AF37"/>
          <circle cx="60" cy="56" r="16" fill="#B82525" stroke="#FBE59B" stroke-width="2"/>
        </svg>`;
      }
      return `<svg width="110" height="110" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="52" stroke="#FBE59B" stroke-width="2" stroke-dasharray="4 4"/>
        <path d="M60 18C68 34 78 46 78 60C78 72 70 80 60 84C50 80 42 72 42 60C42 46 52 34 60 18Z" fill="#FBE59B"/>
        <path d="M32 82C46 90 74 90 88 82" stroke="#D4AF37" stroke-width="4" stroke-linecap="round"/>
      </svg>`;
    }

    function renderRoom(room) {
      currentRoom = room;
      currentLineIdx = 0;
      if (autoChantTimer) {
        clearInterval(autoChantTimer);
        autoChantTimer = null;
        const autoBtn = document.getElementById("btn-auto-chant");
        if (autoBtn) autoBtn.textContent = "▶️ Tự Động Chạy Kinh Theo Nhịp Mõ";
      }

      document.querySelectorAll(".room-select-card").forEach((card) => {
        card.classList.toggle("active", card.getAttribute("data-room-id") === room.id);
      });

      const titleEl = document.getElementById("sanctuary-room-title");
      const deityEl = document.getElementById("sanctuary-deity-title");
      const mantraEl = document.getElementById("sanctuary-mantra-short");
      const haloEl = document.getElementById("sanctuary-deity-halo");
      const chantTitleEl = document.getElementById("sanctuary-chant-title");
      const chantListEl = document.getElementById("sanctuary-chant-lines");

      if (titleEl) titleEl.textContent = room.name;
      if (deityEl) deityEl.textContent = room.deityTitle;
      if (mantraEl) mantraEl.textContent = `🙏 ${room.mantraShort}`;
      if (haloEl) haloEl.innerHTML = getDeitySvg(room.id);
      if (chantTitleEl) chantTitleEl.textContent = `📖 ${room.chantTitle}`;

      if (chantListEl) {
        chantListEl.innerHTML = (room.chantLines || [])
          .map(
            (line, idx) =>
              `<div class="chant-line ${idx === 0 ? "current" : ""}" data-line-idx="${idx}">${line}</div>`
          )
          .join("");
      }

      renderParticipantsFeed(room);
      loadCloudRoomFeed(room.id);
    }

    function renderParticipantsFeed(room, extraItems = []) {
      const feedEl = document.getElementById("sanctuary-prayer-feed");
      if (!feedEl) return;

      const combined = [
        ...extraItems.map((it) => ({
          nickname: it.nickname,
          action: "Vừa gửi lời nguyện cầu & tụng kinh",
          wish: it.message
        })),
        ...(room.defaultParticipants || [])
      ];

      feedEl.innerHTML = combined
        .map(
          (p) => `
        <div class="prayer-feed-item">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem;">
            <strong style="color:var(--gold-light);">🪷 ${p.nickname}</strong>
            <span style="font-size:0.72rem;color:var(--jade-green);">● Trực tuyến</span>
          </div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.25rem;">${p.action}</div>
          <div style="font-style:italic;color:var(--text-primary);">“${p.wish}”</div>
        </div>`
        )
        .join("");
    }

    async function loadCloudRoomFeed(roomId) {
      try {
        const res = await fetch(`/api/events?type=chant_room&room=${encodeURIComponent(roomId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          renderParticipantsFeed(currentRoom, data.items);
        }
      } catch {
        // Use default local feed if offline
      }
    }

    function addMerit(points) {
      meritCount += points;
      localStorage.setItem(STORAGE_MERIT_KEY, String(meritCount));
      const meritEl = document.getElementById("sanctuary-merit-count");
      if (meritEl) meritEl.textContent = String(meritCount);
    }

    function advanceChantLine() {
      const lines = document.querySelectorAll("#sanctuary-chant-lines .chant-line");
      if (!lines.length) return;
      lines.forEach((l) => l.classList.remove("current"));
      currentLineIdx = (currentLineIdx + 1) % lines.length;
      const target = lines[currentLineIdx];
      if (target) {
        target.classList.add("current");
        target.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }

    function spawnFloatingLantern(text) {
      const stage = document.getElementById("altar-stage-visual");
      if (!stage) return;
      const lantern = document.createElement("div");
      lantern.className = "floating-lantern";
      lantern.style.left = `${Math.floor(15 + Math.random() * 60)}%`;
      lantern.textContent = `🏮 ${getNickname()}: ${text.slice(0, 38)}`;
      stage.appendChild(lantern);
      setTimeout(() => lantern.remove(), 6500);
    }

    // Bind Room Selector Cards
    document.querySelectorAll(".room-select-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-room-id");
        const found = rooms.find((r) => r.id === id);
        if (found) {
          renderRoom(found);
          playTempleBellSound();
          showToast(`🙏 Đã bước vào ${found.name}`);
        }
      });
    });

    // Bind Ritual Buttons (Thắp Hương, Dâng Hoa, Thắp Đèn, Thỉnh Chuông, Gõ Mõ, Lần Chuỗi 108 Hạt)
    document.getElementById("ritual-incense-btn")?.addEventListener("click", (e) => {
      e.currentTarget.classList.add("active");
      document.getElementById("slot-incense")?.classList.add("active");
      playTempleBellSound();
      addMerit(3);
      showToast(`🔥 ${getNickname()} đã thành tâm dâng 3 nén nhang trầm thơm ngát!`);
    });

    document.getElementById("ritual-flower-btn")?.addEventListener("click", (e) => {
      e.currentTarget.classList.add("active");
      document.getElementById("slot-flower")?.classList.add("active");
      addMerit(2);
      showToast(`🪷 ${getNickname()} đã dâng Hoa Sen Vàng & Mâm Ngũ Quả lên bàn thờ!`);
    });

    document.getElementById("ritual-lamp-btn")?.addEventListener("click", (e) => {
      e.currentTarget.classList.add("active");
      document.getElementById("slot-lamp")?.classList.add("active");
      addMerit(2);
      showToast(`🕯️ ${getNickname()} đã thắp sáng Đèn Liên Hoa khai mở trí tuệ!`);
    });

    document.getElementById("ritual-bell-btn")?.addEventListener("click", () => {
      playTempleBellSound();
      addMerit(1);
      showToast("🔔 Tiếng chuông Bát Nhã ngân vang, phiền não tan biến...");
    });

    document.getElementById("ritual-mo-btn")?.addEventListener("click", () => {
      playWoodenFishSound();
      advanceChantLine();
      addMerit(1);
    });

    document.getElementById("ritual-mala-btn")?.addEventListener("click", () => {
      playWoodenFishSound();
      addMerit(1);
      spawnFloatingLantern(currentRoom.mantraShort);
    });

    // Auto Chant Teleprompter
    const autoBtn = document.getElementById("btn-auto-chant");
    if (autoBtn) {
      autoBtn.addEventListener("click", () => {
        if (autoChantTimer) {
          clearInterval(autoChantTimer);
          autoChantTimer = null;
          autoBtn.textContent = "▶️ Tự Động Chạy Kinh Theo Nhịp Mõ";
        } else {
          playWoodenFishSound();
          autoBtn.textContent = "⏸️ Đang Tụng Kinh Cùng Đạo Tràng (Bấm Để Dừng)";
          autoChantTimer = setInterval(() => {
            playWoodenFishSound();
            advanceChantLine();
            addMerit(1);
          }, 2600);
        }
      });
    }

    // Submit Prayer / Lantern to Room & Telegram / D1 (Protected by Cloudflare Turnstile + Cooldown)
    const prayerForm = document.getElementById("sanctuary-prayer-form");
    if (prayerForm) {
      prayerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!checkCooldown("sanctuary_prayer", 6000)) return;

        const wishInput = document.getElementById("sanctuary-wish-input");
        const wish = (wishInput?.value || "").trim();
        if (!wish) {
          showToast("⚠️ Vui lòng nhập lời nguyện cầu hoặc hồi hướng công đức!");
          return;
        }

        const tsToken = getTurnstileToken(prayerForm);
        if (window.turnstile && !tsToken) {
          showToast("🛡️ Vui lòng tích xác thực bảo mật Cloudflare Turnstile bên dưới trước khi thả đèn!");
          return;
        }

        markCooldown("sanctuary_prayer");
        const nick = getNickname();
        localStorage.setItem(STORAGE_NICKNAME_KEY, nick);
        playTempleBellSound();
        spawnFloatingLantern(wish);
        addMerit(5);

        const feedEl = document.getElementById("sanctuary-prayer-feed");
        if (feedEl) {
          const item = document.createElement("div");
          item.className = "prayer-feed-item";
          item.style.borderColor = "var(--gold-primary)";
          item.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem;">
              <strong style="color:var(--gold-light);">🪷 ${nick}</strong>
              <span style="font-size:0.72rem;color:var(--jade-green);">● Vừa thả Hoa Đăng</span>
            </div>
            <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.25rem;">Tại ${currentRoom.name}</div>
            <div style="font-style:italic;color:var(--text-primary);">“${wish}”</div>
          `;
          feedEl.prepend(item);
        }

        if (wishInput) wishInput.value = "";
        showToast(`🏮 Đã thả Đèn Hoa Đăng cầu nguyện của ${nick} lên ${currentRoom.name}!`);

        await syncEventToCloud({
          eventType: "chant_room",
          roomId: currentRoom.id,
          nickname: nick,
          message: `[${currentRoom.name}] ${wish}`,
          "cf-turnstile-response": tsToken,
          payload: { roomName: currentRoom.name, meritCount }
        });
        resetTurnstileInContainer(prayerForm);
      });
    }

    // Initialize initial merit display and first room
    const meritEl = document.getElementById("sanctuary-merit-count");
    if (meritEl) meritEl.textContent = String(meritCount);
    renderRoom(rooms[0]);
  }

  // ---------- 5. Interactive Divination Sanctuary ----------
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

    // 5.1 Xin Xăm Quán Âm
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
              <h3 style="font-size:1.45rem;color:var(--gold-light);margin-bottom:0.35rem;">${picked.title}</h3>
              <p style="font-size:0.85rem;color:var(--text-muted);">Tín chủ: <strong>${userName}</strong> • Sở cầu: <strong>${topic}</strong></p>
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
          playTempleBellSound();
          showToast(`✨ Bạn đã rút được ${picked.number}: ${picked.rank}`);
        }, 1000);
      });
    }

    // 5.2 Gieo Quẻ Kinh Dịch
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
                <span style="font-size:2.6rem;line-height:1;color:var(--gold-light);">${hex.symbol}</span>
                <div>
                  <h3 style="font-size:1.45rem;color:var(--gold-light);">${hex.name}</h3>
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
          playTempleBellSound();
          showToast(`☯️ Đã ứng ${hex.name}`);
        }, 950);
      });
    }

    // 5.3 Bói Bài Tarot
    const drawTarotBtn = document.getElementById("btn-draw-tarot");
    const tarotResult = document.getElementById("tarot-result-box");
    const tarotSlots = document.querySelectorAll(".tarot-card-slot");

    function triggerTarotReading() {
      const cards = [...(FORTUNES.tarotCards || [])];
      if (cards.length < 3 || !tarotResult) return;

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
          <div style="font-size:1.7rem;margin:0.3rem 0;">✨</div>
          <strong style="color:var(--gold-light);font-size:0.9rem;">${card.name}</strong>
          <small style="color:var(--text-secondary);margin-top:0.3rem;">${card.keywords.join(" • ")}</small>
        `;
      });

      tarotResult.innerHTML = `
        <div>
          <span class="result-rank-badge">Thông Điệp Trải Bài 3 Lá</span>
          <h3 style="font-size:1.4rem;color:var(--gold-light);margin-bottom:0.8rem;">Giải Mã Tín Hiệu Tâm Linh Của Bạn</h3>
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
      playTempleBellSound();
      showToast("🔮 Đã lật 3 lá bài Tarot hữu duyên!");
    }

    drawTarotBtn?.addEventListener("click", triggerTarotReading);
    tarotSlots.forEach((slot) => slot.addEventListener("click", triggerTarotReading));

    // 5.4 Tra Cứu Mệnh Ngũ Hành
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

        const canValues = { Giáp: 1, Ất: 1, Bính: 2, Đinh: 2, Mậu: 3, Kỷ: 3, Canh: 4, Tân: 4, Nhâm: 5, Quý: 5 };
        const chiValues = {
          Tý: 0, Sửu: 0, Ngọ: 0, Mùi: 0,
          Dần: 1, Mão: 1, Thân: 1, Dậu: 1,
          Thìn: 2, Tỵ: 2, Tuất: 2, Hợi: 2
        };
        let sum = (canValues[CAN[birthYear % 10]] || 1) + (chiValues[CHI[birthYear % 12]] || 0);
        if (sum > 5) sum -= 5;

        const ELEMENT_MAP = {
          1: {
            element: "Kim",
            Compatible: "Thổ (Tương sinh), Kim (Tương hợp)",
            Colors: "Vàng kim, Trắng, Nâu đất",
            Numbers: "6, 7, 2, 5, 8",
            Desc: "Người mệnh Kim sắc bén, trọng chữ tín. Đeo vật phẩm hành Thổ hoặc Kim giúp vượng tài lộc, công danh vững chắc."
          },
          2: {
            element: "Thuỷ",
            Compatible: "Kim (Tương sinh), Thuỷ (Tương hợp)",
            Colors: "Xanh biển, Đen, Trắng, Ánh kim",
            Numbers: "1, 6, 7",
            Desc: "Người mệnh Thuỷ thông tuệ, khéo léo. Hợp sử dụng đá Mắt Hổ Xanh Đen, Hồ Lô Đồng hoặc Khánh Ngọc Bình An."
          },
          3: {
            element: "Hoả",
            Compatible: "Mộc (Tương sinh), Hoả (Tương hợp)",
            Colors: "Đỏ chu sa, Hồng, Tím, Xanh lục",
            Numbers: "9, 3, 4",
            Desc: "Người mệnh Hoả nhiệt huyết, giàu năng lượng dương. Đại cát khi đeo Vòng Đá Chu Sa Đỏ hoặc Xông Trầm Hương tự nhiên."
          },
          4: {
            element: "Thổ",
            Compatible: "Hoả (Tương sinh), Thổ (Tương hợp)",
            Colors: "Vàng hoàng thổ, Nâu, Đỏ, Cam",
            Numbers: "2, 5, 8, 9",
            Desc: "Người mệnh Thổ bao dung, điềm đạm. Hợp với Thạch Anh Tóc Vàng, Vòng Chu Sa và Lư Xông Trầm Gốm Tử Sa."
          },
          5: {
            element: "Mộc",
            Compatible: "Thuỷ (Tương sinh), Mộc (Tương hợp)",
            Colors: "Xanh ngọc, Xanh lá, Đen, Xanh dương",
            Numbers: "3, 4, 1",
            Desc: "Người mệnh Mộc nhân hậu, vươn lên mạnh mẽ. Hợp thỉnh Trầm Hương tự nhiên, Vòng Mắt Hổ Xanh Đen và Dây Treo Khánh Ngọc."
          }
        };

        const info = ELEMENT_MAP[sum] || ELEMENT_MAP[3];
        const matchingProducts = PRODUCTS.filter((p) =>
          (p.elements || []).includes(info.element)
        ).slice(0, 3);

        elementResult.innerHTML = `
          <div>
            <span class="result-rank-badge">Tuổi ${canChiYear} (${birthYear}) • ${gender} mạng</span>
            <h3 style="font-size:1.45rem;color:var(--gold-light);margin-bottom:0.45rem;">
              Bản Mệnh Ngũ Hành: Hành ${info.element}
            </h3>
            <p style="margin-bottom:0.75rem;">${info.Desc}</p>
            <ul class="advice-list">
              <li><strong>🌟 Hành tương sinh & trợ mệnh:</strong> ${info.Compatible}</li>
              <li><strong>🎨 Màu sắc đại cát:</strong> ${info.Colors}</li>
              <li><strong>🔢 Con số may mắn:</strong> ${info.Numbers}</li>
            </ul>
            <h4 style="color:var(--gold-light);margin:0.9rem 0 0.55rem;font-size:1.02rem;">
              🪷 Vật Phẩm Hợp Mệnh ${info.element} Tại Cửa Hàng:
            </h4>
            <div style="display:grid;gap:0.5rem;margin-bottom:0.95rem;">
              ${matchingProducts
                .map(
                  (mp) => `
                <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-card);padding:0.55rem 0.8rem;border-radius:10px;border:1px solid var(--border-subtle);">
                  <div>
                    <strong style="font-size:0.88rem;">${mp.name}</strong>
                    <div style="font-size:0.78rem;color:var(--gold-primary);">${formatVND(mp.price)}</div>
                  </div>
                  <button type="button" class="btn btn-gold" style="padding:0.38rem 0.8rem;font-size:0.78rem;" data-quick-add="${mp.id}">
                    + Thỉnh Ngay
                  </button>
                </div>`
                )
                .join("")}
            </div>
            <button type="button" class="btn btn-outline" id="btn-filter-by-element" data-element="${info.element}">
              🔍 Lọc Toàn Bộ Vật Phẩm Hợp Mệnh ${info.element}
            </button>
          </div>
        `;

        elementResult.querySelectorAll("[data-quick-add]").forEach((btn) => {
          btn.addEventListener("click", () => addToCart(btn.getAttribute("data-quick-add")));
        });

        document.getElementById("btn-filter-by-element")?.addEventListener("click", (e) => {
          const el = e.currentTarget.getAttribute("data-element");
          const selectEl = document.getElementById("shop-element-filter");
          if (selectEl && el) {
            selectEl.value = el;
            activeElementFilter = el;
            renderProducts();
          }
          document.getElementById("vat-pham")?.scrollIntoView({ behavior: "smooth" });
        });
      });
    }
  }

  // ---------- 6. Product Shop & Filtering ----------
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
        <div style="grid-column:1/-1;text-align:center;padding:2.5rem;background:var(--bg-card);border-radius:18px;border:1px solid var(--border-subtle);">
          <p style="font-size:1.05rem;color:var(--text-secondary);margin-bottom:1rem;">Không tìm thấy vật phẩm phù hợp với bộ lọc hiện tại.</p>
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
          ${
            p.imageUrl
              ? `<img src="${p.imageUrl}" alt="${p.name}" class="product-real-img" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" /><div class="product-fallback-svg" style="display:none;">${getProductArtworkSvg(p.artworkType)}</div>`
              : getProductArtworkSvg(p.artworkType)
          }
          <span class="product-element-tag">☯️ Mệnh: ${(p.elements || []).join(", ")}</span>
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
            <button type="button" class="btn btn-gold" style="padding:0.62rem 0.95rem;font-size:0.86rem;" data-add-cart="${p.id}">
              🛒 Thỉnh Vật Phẩm
            </button>
            <button type="button" class="btn btn-outline" style="padding:0.62rem 0.85rem;font-size:0.84rem;" data-detail-product="${p.id}">
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
          <h3 style="font-size:1.5rem;color:var(--gold-light);">${product.name}</h3>
        </div>
        <button type="button" class="icon-btn" id="close-product-modal">✕ Đóng</button>
      </div>
      ${
        product.imageUrl
          ? `<div style="text-align:center;margin-bottom:1.15rem;max-height:260px;overflow:hidden;border-radius:14px;border:1px solid var(--border-gold);background:var(--bg-card);"><img src="${product.imageUrl}" alt="${product.name}" style="width:100%;max-height:260px;object-fit:cover;" /></div>`
          : ""
      }
      <p style="color:var(--text-secondary);margin-bottom:1rem;">${product.shortDesc}</p>
      <div style="background:var(--bg-secondary);padding:1rem;border-radius:12px;border:1px solid var(--border-subtle);margin-bottom:1rem;">
        <p style="margin-bottom:0.5rem;"><strong>☯️ Bản mệnh phù hợp:</strong> ${product.elementText}</p>
        <strong style="color:var(--gold-light);display:block;margin-bottom:0.4rem;">✨ Đặc điểm & Ý nghĩa tâm linh:</strong>
        <ul style="padding-left:1.2rem;display:grid;gap:0.35rem;font-size:0.9rem;">
          ${(product.benefits || []).map((b) => `<li>${b}</li>`).join("")}
        </ul>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;padding-top:0.5rem;">
        <div>
          <small style="color:var(--text-muted);display:block;">Phí thỉnh vật phẩm:</small>
          <span class="price-current" style="font-size:1.45rem;">${formatVND(product.price)}</span>
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

  // ---------- 7. Smart Cart + Checkout (Zalo / FB + Auto Telegram & D1) ----------
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
      // ignore
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
        <div style="text-align:center;padding:2.2rem 1rem;color:var(--text-muted);">
          <p style="font-size:0.98rem;margin-bottom:0.65rem;">Giỏ thỉnh vật phẩm của bạn đang trống.</p>
          <p style="font-size:0.84rem;">Hãy chọn các bộ lễ Hàng Mã, Vòng Phong Thuỷ hoặc Trầm Hương hợp mệnh nhé!</p>
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
          <strong style="font-size:0.9rem;display:block;">${item.name}</strong>
          <span style="font-size:0.82rem;color:var(--gold-primary);">${formatVND(item.price)} x ${item.qty}</span>
        </div>
        <div class="qty-control">
          <button type="button" class="qty-btn" data-cart-dec="${item.id}">-</button>
          <span style="padding:0 0.55rem;font-size:0.86rem;font-weight:600;">${item.qty}</span>
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

  async function handleOrderSubmit(targetChannel) {
    if (!checkCooldown("order_submit", 8000)) return;

    const checkoutArea = document.getElementById("cart-checkout-area");
    const name = (document.getElementById("cart-customer-name")?.value || "").trim();
    const phone = (document.getElementById("cart-customer-phone")?.value || "").trim();
    const address = (document.getElementById("cart-customer-address")?.value || "").trim();
    const note = (document.getElementById("cart-customer-note")?.value || "").trim();
    const blessCheck = document.getElementById("cart-bless-checkbox")?.checked;

    if (!name || !phone || !address) {
      showToast("⚠️ Vui lòng điền Họ tên, Số điện thoại và Địa chỉ nhận vật phẩm!");
      return;
    }

    const tsToken = getTurnstileToken(checkoutArea);
    if (window.turnstile && !tsToken) {
      showToast("🛡️ Vui lòng xác thực bảo mật Cloudflare Turnstile trước khi gửi đơn hàng!");
      return;
    }

    markCooldown("order_submit");
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const itemsText = cart
      .map((i, idx) => `${idx + 1}. ${i.name} (SL: ${i.qty}) - ${formatVND(i.price * i.qty)}`)
      .join("\n");

    const orderSummary = [
      "🪷 ĐƠN THỈNH VẬT PHẨM - CÔ BÉ HỮU DUYÊN",
      `• Tín chủ: ${name}`,
      `• SĐT: ${phone}`,
      `• Địa chỉ nhận: ${address}`,
      `• Trì chú/Ghi sớ: ${blessCheck ? "Nhờ Cô trì chú khai quang theo tuổi" : "Không"}`,
      note ? `• Ghi chú năm sinh: ${note}` : "",
      "--- Danh sách vật phẩm ---",
      itemsText,
      `👉 TỔNG CỘNG: ${formatVND(total)}`,
      "• Thanh toán: Vietcombank 0051000567270 (Nguyễn Thị Thu Hồng)"
    ]
      .filter(Boolean)
      .join("\n");

    const bonusPoints = Math.min(100, Math.max(20, Math.round(total / 10000)));
    const newMerit = awardMeritPoints(bonusPoints);

    copyToClipboard(
      orderSummary,
      `✅ Đã lưu đơn chờ duyệt & tặng +${bonusPoints} Điểm Công Đức (Tổng: ${newMerit}đ)!`
    );

    // 1. Tự động đẩy về Telegram Group & Cloudflare D1 Database (Kèm Turnstile Token, status = pending)
    syncEventToCloud({
      eventType: "order",
      nickname: name,
      phone,
      amount: total,
      message: orderSummary,
      "cf-turnstile-response": tsToken,
      payload: { address, note, blessCheck, items: cart, channel: targetChannel }
    });
    resetTurnstileInContainer(checkoutArea);

    // 2. Mở Zalo hoặc Facebook theo lựa chọn của khách
    setTimeout(() => {
      if (targetChannel === "facebook") {
        window.open("https://www.facebook.com/nhu.lam.545518", "_blank", "noopener");
      } else {
        window.open(
          `https://zalo.me/0702311558?text=${encodeURIComponent(orderSummary)}`,
          "_blank",
          "noopener"
        );
      }
    }, 450);
  }

  function initCartEvents() {
    updateCartBadge();
    document.getElementById("open-cart-btn")?.addEventListener("click", openCartDrawer);
    document.getElementById("close-cart-btn")?.addEventListener("click", closeCartDrawer);

    const backdrop = document.getElementById("cart-drawer-backdrop");
    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) closeCartDrawer();
    });

    const phoneInput = document.getElementById("cart-customer-phone");
    phoneInput?.addEventListener("input", () => {
      const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
      const qrImg = document.getElementById("cart-vietqr-img");
      if (qrImg && total > 0) {
        qrImg.src = buildVietQrUrl(total, `THINH VAT PHAM ${phoneInput.value.trim()}`);
      }
    });

    document
      .getElementById("btn-checkout-zalo")
      ?.addEventListener("click", () => handleOrderSubmit("zalo"));
    document
      .getElementById("btn-checkout-fb")
      ?.addEventListener("click", () => handleOrderSubmit("facebook"));
  }

  // ---------- 8. 1-1 Master Booking Form (Auto Telegram & D1 + Turnstile) ----------
  function initBookingForm() {
    const form = document.getElementById("master-booking-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!checkCooldown("booking_submit", 8000)) return;

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

      const tsToken = getTurnstileToken(form);
      if (window.turnstile && !tsToken) {
        showToast("🛡️ Vui lòng tích xác thực bảo mật Cloudflare Turnstile trước khi tạo phiếu hẹn!");
        return;
      }

      markCooldown("booking_submit");
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

      awardMeritPoints(10);
      copyToClipboard(
        bookingMsg,
        "✨ Đã sao chép phiếu đặt lịch, gửi về Admin/Telegram & tặng +10 Điểm Công Đức!"
      );

      syncEventToCloud({
        eventType: "booking",
        nickname: name,
        phone,
        message: bookingMsg,
        "cf-turnstile-response": tsToken,
        payload: { dob, service, channel, note }
      });
      resetTurnstileInContainer(form);

      const previewBox = document.getElementById("booking-confirmation-preview");
      if (previewBox) {
        previewBox.style.display = "block";
        previewBox.innerHTML = `
          <strong style="color:var(--gold-light);display:block;margin-bottom:0.35rem;">✅ Đã Ghi Nhận & Đồng Bộ Lịch Hẹn!</strong>
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem;">
            Thông tin của <strong>${name}</strong> đã được lưu vào hệ thống quản trị của Cô Bé Hữu Duyên. Bạn bấm chọn kênh bên dưới để trò chuyện ngay:
          </p>
          <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
            <a href="https://zalo.me/0702311558?text=${encodeURIComponent(bookingMsg)}" target="_blank" rel="noopener" class="btn btn-gold" style="padding:0.55rem 1rem;font-size:0.84rem;">
              💬 Mở Zalo Gửi Ngay (0702.311.558)
            </a>
            <a href="https://www.facebook.com/nhu.lam.545518" target="_blank" rel="noopener" class="btn btn-outline" style="padding:0.55rem 1rem;font-size:0.84rem;">
              📘 Nhắn Qua Facebook
            </a>
          </div>
        `;
      }
    });
  }

  // ---------- 8B. Wholesale Inquiry Form ("Liên Hệ Đặt Hàng Sỉ") ----------
  function initWholesaleForm() {
    const form = document.getElementById("wholesale-inquiry-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!checkCooldown("wholesale_submit", 8000)) return;

      const name = (document.getElementById("wholesale-name")?.value || "").trim();
      const phone = (document.getElementById("wholesale-phone")?.value || "").trim();
      const category = (document.getElementById("wholesale-category")?.value || "").trim();
      const quantity = (document.getElementById("wholesale-qty")?.value || "").trim();
      const note = (document.getElementById("wholesale-note")?.value || "").trim();

      if (!name || !phone) {
        showToast("⚠️ Vui lòng nhập Tên đại lý / khách sỉ và Số điện thoại Zalo!");
        return;
      }

      const tsToken = getTurnstileToken(form);
      if (window.turnstile && !tsToken) {
        showToast("🛡️ Vui lòng xác thực Cloudflare Turnstile trước khi gửi yêu cầu báo giá sỉ!");
        return;
      }

      markCooldown("wholesale_submit");
      const wholesaleMsg = [
        "📦 ĐĂNG KÝ NHẬP SỈ VẬT PHẨM & HÀNG MÃ — CÔ BÉ HỮU DUYÊN",
        `• Đại lý / Tín chủ: ${name}`,
        `• SĐT / Zalo: ${phone}`,
        `• Nhóm hàng quan tâm: ${category}`,
        `• Số lượng / Quy mô dự kiến: ${quantity}`,
        note ? `• Ghi chú thêm: ${note}` : ""
      ]
        .filter(Boolean)
        .join("\n");

      awardMeritPoints(15);
      copyToClipboard(
        wholesaleMsg,
        "📦 Đã lưu yêu cầu đặt sỉ vào Admin D1 & gửi thông báo về Telegram!"
      );

      syncEventToCloud({
        eventType: "wholesale",
        nickname: name,
        phone,
        message: wholesaleMsg,
        "cf-turnstile-response": tsToken,
        payload: { category, quantity, note }
      });
      resetTurnstileInContainer(form);

      setTimeout(() => {
        window.open(
          `https://zalo.me/0702311558?text=${encodeURIComponent(wholesaleMsg)}`,
          "_blank",
          "noopener"
        );
      }, 450);
    });
  }

  // ---------- 9. Charity & Merit Donation Modal (Pending Admin Approval + Merit Points) ----------
  function initCharityActions() {
    const modal = document.getElementById("charity-donate-modal");
    const closeBtn = document.getElementById("close-charity-modal");
    const amountBtns = document.querySelectorAll("[data-donate-amount]");
    const customAmountInput = document.getElementById("charity-custom-amount");
    const donorNameInput = document.getElementById("charity-donor-name");
    const donorWishInput = document.getElementById("charity-donor-wish");
    const campaignTitleEl = document.getElementById("charity-modal-campaign-title");
    const qrImg = document.getElementById("charity-vietqr-img");
    const syntaxTextEl = document.getElementById("charity-transfer-syntax");

    let currentSyntax = "GIEODUYEN";
    let currentCampaignName = "Quỹ Từ Thiện & Phóng Sinh Cô Bé Hữu Duyên";

    function updateCharityQr() {
      const amt = parseInt(customAmountInput?.value || "200000", 10) || 200000;
      const donor = (donorNameInput?.value || "").trim() || "PHAT TU";
      const content = `${currentSyntax} ${donor}`.toUpperCase();
      if (qrImg) qrImg.src = buildVietQrUrl(amt, content);
      if (syntaxTextEl) syntaxTextEl.textContent = content;
    }

    document.querySelectorAll("[data-open-charity]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const campaignId = btn.getAttribute("data-open-charity");
        const found = (CHARITY.campaigns || []).find((c) => c.id === campaignId);
        if (found) {
          currentSyntax = found.transferSyntax || "GIEODUYEN";
          currentCampaignName = found.title;
        } else {
          currentSyntax = "GIEODUYEN";
          currentCampaignName = "Quỹ Từ Thiện & Phóng Sinh Cô Bé Hữu Duyên";
        }
        if (campaignTitleEl) campaignTitleEl.textContent = currentCampaignName;
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

    // Confirm Merit Donation -> Save to D1 (Pending Admin Approval) + Award Merit Points + Open Zalo
    document.getElementById("btn-confirm-charity-zalo")?.addEventListener("click", async () => {
      if (!checkCooldown("charity_submit", 8000)) return;

      const tsToken = getTurnstileToken(modal);
      if (window.turnstile && !tsToken) {
        showToast("🛡️ Vui lòng xác thực bảo mật Cloudflare Turnstile trước khi xác nhận công đức!");
        return;
      }

      markCooldown("charity_submit");
      const donor = (donorNameInput?.value || "").trim() || "Phật tử Hữu Duyên";
      const amt = parseInt(customAmountInput?.value || "200000", 10) || 200000;
      const wish =
        (donorWishInput?.value || "").trim() ||
        "Cầu gia đạo bình an, hồi hướng công đức cho khắp pháp giới chúng sinh";

      const msg = [
        "💛 BÁO CÔNG ĐỨC THIỆN NGUYỆN — CÔ BÉ HỮU DUYÊN",
        `• Tín chủ phát tâm: ${donor}`,
        `• Số tiền gieo duyên: ${formatVND(amt)}`,
        `• Chiến dịch: ${currentCampaignName}`,
        `• Lời cầu nguyện / Hồi hướng: ${wish}`,
        "• Đã chuyển khoản vào Vietcombank 0051000567270 (Nguyễn Thị Thu Hồng)"
      ].join("\n");

      const bonusPoints = Math.min(120, Math.max(25, Math.round(amt / 5000)));
      const newMerit = awardMeritPoints(bonusPoints);

      copyToClipboard(
        msg,
        `🙏 Đã gửi xác nhận chờ Admin duyệt lên Sổ Vàng & tặng +${bonusPoints} Điểm Công Đức (Tổng: ${newMerit}đ)!`
      );

      syncEventToCloud({
        eventType: "charity",
        nickname: donor,
        amount: amt,
        message: `${currentCampaignName} — Lời nguyện: ${wish}`,
        "cf-turnstile-response": tsToken,
        payload: { campaign: currentCampaignName, wish }
      });
      resetTurnstileInContainer(modal);

      setTimeout(() => {
        window.open(
          `https://zalo.me/0702311558?text=${encodeURIComponent(msg)}`,
          "_blank",
          "noopener"
        );
      }, 450);
    });

    document.getElementById("btn-copy-bank-no")?.addEventListener("click", () => {
      copyToClipboard("0051000567270", "✅ Đã sao chép STK Vietcombank: 0051000567270");
    });
  }

  // ---------- 10. Real D1 Database Sync for Homepage (Approved Golden Ledger, Total Raised & Products) ----------
  async function loadPublicHomeDataFromD1() {
    const meritEl = document.getElementById("home-merit-points");
    if (meritEl) meritEl.textContent = String(getMeritPoints());

    try {
      const res = await fetch("/api/events?mode=home_public");
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.ok) return;

      // 1. Merge Custom / Edited Products from D1 Database
      if (Array.isArray(data.customProducts) && data.customProducts.length > 0) {
        const normalizedCustom = data.customProducts.map((cp) => {
          let elements = ["Kim", "Mộc", "Thuỷ", "Hoả", "Thổ"];
          try {
            if (cp.elements_json) elements = JSON.parse(cp.elements_json);
          } catch {
            // ignore
          }
          return {
            id: cp.id,
            name: cp.name,
            category: cp.category,
            categoryName: cp.category_name,
            price: Number(cp.price || 0),
            originalPrice: Number(cp.original_price || 0),
            badge: cp.badge || "Vật phẩm tâm linh",
            elements: Array.isArray(cp.elements) ? cp.elements : elements,
            elementText: cp.element_text || "Hợp mọi bản mệnh",
            shortDesc: cp.short_desc || "",
            artworkType: cp.artwork_type || "shrine-gold",
            imageUrl: cp.image_url || cp.imageUrl || ""
          };
        });

        const customMap = new Map(normalizedCustom.map((p) => [p.id, p]));
        const merged = PRODUCTS.map((p) => (customMap.has(p.id) ? customMap.get(p.id) : p));
        normalizedCustom.forEach((cp) => {
          if (!PRODUCTS.some((p) => p.id === cp.id)) {
            merged.unshift(cp);
          }
        });
        PRODUCTS = merged;
        renderProducts();
      }

      // 2. Update "Tổng quỹ đã gieo duyên" (Demo base + Real Approved D1 sum)
      const baseRaised = Number((CHARITY.summary && CHARITY.summary.totalRaised) || 148500000);
      const d1ApprovedSum = Number(data.approvedTotalAmount || 0);
      const totalRaisedEl = document.getElementById("charity-total-raised-val");
      if (totalRaisedEl && d1ApprovedSum > 0) {
        totalRaisedEl.textContent = formatVND(baseRaised + d1ApprovedSum);
      }

      // 3. Prepend Approved Donors from D1 into "📜 Sổ Vàng Ghi Danh Công Đức Gần Đây"
      if (Array.isArray(data.approvedDonors) && data.approvedDonors.length > 0) {
        const tbody = document.getElementById("charity-ledger-tbody");
        if (tbody) {
          const d1RowsHtml = data.approvedDonors
            .map((row) => {
              let campaign = "Quỹ Từ Thiện Cô Bé Hữu Duyên";
              let wish = row.message || "Cầu bình an, hồi hướng công đức";
              try {
                if (row.payload_json) {
                  const parsed = JSON.parse(row.payload_json);
                  if (parsed.campaign) campaign = parsed.campaign;
                  if (parsed.wish) wish = parsed.wish;
                }
              } catch {
                // ignore
              }
              const dateLabel = row.created_at
                ? new Date(row.created_at + "Z").toLocaleDateString("vi-VN")
                : "Đã duyệt";
              return `
                <tr class="d1-approved-row">
                  <td><strong>🪷 ${row.nickname || "Phật tử Hữu Duyên"}</strong> <span style="font-size:0.7rem;color:var(--jade-green);">(Đã duyệt)</span></td>
                  <td style="color:var(--gold-light);font-weight:700;">${formatVND(row.amount || 0)}</td>
                  <td>${campaign}</td>
                  <td style="color:var(--text-secondary);font-style:italic;">“${wish}”</td>
                  <td style="color:var(--jade-green);">${dateLabel}</td>
                </tr>
              `;
            })
            .join("");
          tbody.insertAdjacentHTML("afterbegin", d1RowsHtml);
        }
      }
    } catch {
      // Fallback silently to default static data if offline
    }
  }

  // ---------- Bootstrapping ----------
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initMobileMenu();
    initLunarCalendar();
    initOnlineChantSanctuary();
    initDivinationTabs();
    initShopControls();
    initCartEvents();
    initBookingForm();
    initWholesaleForm();
    initCharityActions();
    loadPublicHomeDataFromD1();

    const productModal = document.getElementById("product-detail-modal");
    productModal?.addEventListener("click", (e) => {
      if (e.target === productModal) productModal.classList.remove("open");
    });
  });
})();
