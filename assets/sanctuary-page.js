/* ==========================================================================
   ĐIỆN THỜ & PHÒNG TỤNG KINH ONLINE CÙNG PHẬT TỬ (/phong-tung-kinh.html)
   - Đổi hình nền điện thờ riêng biệt cho từng phòng (Tam Bảo, Quán Âm, Thánh Mẫu)
   - Giọng đọc Tụng Kinh Tiếng Việt (Web Speech API) kết hợp tiếng Mõ & Chuông đồng thực tế
   - Chỗ ngồi toạ thiền (12 Bồ đoàn) hiển thị Phật tử đang online theo thời gian thực
   - Đồng bộ câu kinh đang đọc giữa tất cả mọi người trong cùng 1 phòng
   - Hệ thống Điểm Công Đức: Tụng kinh cộng điểm, thực hiện nghi lễ trừ điểm tương ứng
   ========================================================================== */

(function () {
  "use strict";

  const DATA = window.__COBEHUUDUYEN_DATA__ || {};
  const SANCTUARY = DATA.sanctuary || { rooms: [] };
  const ROOMS = SANCTUARY.rooms || [];

  const STORAGE_NICKNAME_KEY = "cbhd_nickname_v1";
  const STORAGE_MERIT_KEY = "cbhd_merit_points_v2";
  const STORAGE_THEME_KEY = "cbhd_theme_v1";

  // Bảng chi phí Điểm Công Đức cho từng nghi lễ
  const RITUAL_COSTS = {
    incense: { cost: 5, name: "🔥 Dâng Hương Trầm" },
    flower: { cost: 5, name: "🪷 Dâng Hoa Quả" },
    lamp: { cost: 8, name: "🕯️ Thắp Đèn Trí Tuệ" },
    bell: { cost: 2, name: "🔔 Thỉnh Chuông Bát Nhã" },
    mo: { cost: 1, name: "🥁 Gõ Mõ Tụng Kinh" },
    mala: { cost: 2, name: "📿 Lần Chuỗi 108 Hạt" },
    lantern: { cost: 10, name: "🏮 Thả Đèn Hoa Đăng" }
  };

  let currentRoom = ROOMS[0] || {};
  let currentLineIdx = 0;
  let isSyncChanting = false;
  let isVoiceEnabled = true;
  let chantTimer = null;
  let onlineTimer = null;
  let userSeatIndex = Math.floor(Math.random() * 12);

  // Khởi tạo 50 Điểm Công Đức mặc định cho Phật tử mới vào đạo tràng
  let meritPoints = parseInt(localStorage.getItem(STORAGE_MERIT_KEY) || "50", 10);
  if (isNaN(meritPoints) || meritPoints < 0) meritPoints = 50;

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

  function updateMeritDisplay(delta = 0) {
    meritPoints = Math.max(0, meritPoints + delta);
    localStorage.setItem(STORAGE_MERIT_KEY, String(meritPoints));
    document.querySelectorAll(".merit-points-val").forEach((el) => {
      el.textContent = String(meritPoints);
    });
  }

  function spendMerit(ritualKey) {
    const item = RITUAL_COSTS[ritualKey];
    if (!item) return true;
    if (meritPoints < item.cost) {
      showToast(
        `⚠️ Bạn cần ${item.cost} Điểm Công Đức để ${item.name} (Hiện có: ${meritPoints} điểm). Hãy bấm "Đồng Tụng Kinh" nghe kinh hoặc Gieo duyên từ thiện để tích thêm điểm nhé!`
      );
      return false;
    }
    updateMeritDisplay(-item.cost);
    return true;
  }

  function getNickname() {
    const input = document.getElementById("sanctuary-nickname-input");
    return (input?.value || "").trim() || "Phật tử Hữu Duyên";
  }

  // ---------- Web Audio API: Tiếng Chuông Đồng & Tiếng Mõ Gỗ Thực Tế ----------
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
    // Âm sắc chuông đồng chùa cổ (Overtones sâu và ngân dài 4.2 giây)
    const partials = [
      { freq: 216, amp: 0.35, decay: 4.2 },
      { freq: 432, amp: 0.22, decay: 3.5 },
      { freq: 648, amp: 0.14, decay: 2.6 },
      { freq: 972, amp: 0.08, decay: 1.8 }
    ];
    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(p.freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(p.amp, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + p.decay + 0.05);
    });
  }

  function playRealisticWoodenFishSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Tiếng gõ dùi gỗ (Click transient)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = "triangle";
    clickOsc.frequency.setValueAtTime(1150, now);
    clickOsc.frequency.exponentialRampToValueAtTime(420, now + 0.025);
    clickGain.gain.setValueAtTime(0.35, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.035);

    // 2. Hốc gỗ vang trầm ấm (Hollow wood resonance "Cốc")
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = "sine";
    bodyOsc.frequency.setValueAtTime(510, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(385, now + 0.11);
    bodyGain.gain.setValueAtTime(0.001, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.55, now + 0.006);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.17);
  }

  // ---------- Giọng Đọc Tụng Kinh Tiếng Việt Trang Nghiêm (Web Speech Synthesis) ----------
  let vietnameseVoice = null;
  function initSpeechVoices() {
    if (!("speechSynthesis" in window)) return;
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices() || [];
      vietnameseVoice =
        voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("vi")) ||
        voices.find((v) => v.name && v.name.toLowerCase().includes("vietnam")) ||
        null;
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  function speakChantLine(text) {
    if (!isVoiceEnabled || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "vi-VN";
      if (vietnameseVoice) utter.voice = vietnameseVoice;
      // Giọng đọc trầm ấm, chậm rãi trang nghiêm theo nhịp tụng kinh
      utter.rate = 0.86;
      utter.pitch = 0.92;
      utter.volume = 0.95;
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore speech synthesis restriction
    }
  }

  // ---------- Hình Nền Điện Thờ & Tượng Thờ Đặc Trưng Theo Từng Phòng ----------
  function getDeityAndBackdropSvg(roomId) {
    if (roomId === "quan-am") {
      return {
        bgClass: "shrine-theme-quan-am",
        bannerTitle: "NAM MÔ ĐẠI TỪ ĐẠI BI QUÁN THẾ ÂM BỒ TÁT",
        svg: `<svg width="145" height="145" viewBox="0 0 140 140" fill="none">
          <circle cx="70" cy="70" r="64" stroke="#5CE1E6" stroke-width="2" stroke-dasharray="6 4"/>
          <circle cx="70" cy="70" r="50" fill="rgba(92,225,230,0.14)" stroke="#FBE59B" stroke-width="1.5"/>
          <!-- Tịnh bình & Đài sen Quán Âm -->
          <path d="M70 22C82 40 90 56 84 74C79 86 61 86 56 74C50 56 58 40 70 22Z" fill="#FFFDF9" stroke="#D4AF37" stroke-width="2"/>
          <circle cx="70" cy="48" r="11" fill="#FBE59B"/>
          <path d="M40 88C54 78 86 78 100 88L110 108H30L40 88Z" fill="#D4AF37"/>
          <path d="M32 112C54 120 86 120 108 112" stroke="#5CE1E6" stroke-width="4" stroke-linecap="round"/>
        </svg>`
      };
    }
    if (roomId === "thanh-mau") {
      return {
        bgClass: "shrine-theme-thanh-mau",
        bannerTitle: "CON KÍNH LẠY TAM TOÀ THÁNH MẪU • CÔ BÉ HỮU DUYÊN",
        svg: `<svg width="145" height="145" viewBox="0 0 140 140" fill="none">
          <circle cx="70" cy="70" r="64" stroke="#FF5E5E" stroke-width="2.5" stroke-dasharray="5 3"/>
          <circle cx="70" cy="70" r="50" fill="rgba(255,94,94,0.18)" stroke="#D4AF37" stroke-width="2"/>
          <polygon points="70,16 86,46 118,50 94,74 100,108 70,92 40,108 46,74 22,50 54,46" fill="#D4AF37"/>
          <circle cx="70" cy="64" r="20" fill="#9E1B1B" stroke="#FBE59B" stroke-width="2.5"/>
          <text x="70" y="70" text-anchor="middle" fill="#FBE59B" font-family="Noto Serif, serif" font-size="14" font-weight="bold">THÁNH MẪU</text>
        </svg>`
      };
    }
    // Mặc định: Điện Phật Tam Bảo
    return {
      bgClass: "shrine-theme-tam-bao",
      bannerTitle: "NAM MÔ BỔN SƯ THÍCH CA MÂU NI PHẬT • NAM MÔ A DI ĐÀ PHẬT",
      svg: `<svg width="145" height="145" viewBox="0 0 140 140" fill="none">
        <circle cx="70" cy="70" r="64" stroke="#FBE59B" stroke-width="2" stroke-dasharray="4 4"/>
        <circle cx="70" cy="70" r="50" fill="rgba(251,229,155,0.16)" stroke="#D4AF37" stroke-width="1.5"/>
        <path d="M70 20C80 38 92 52 92 68C92 82 82 92 70 96C58 92 48 82 48 68C48 52 60 38 70 20Z" fill="#FBE59B"/>
        <circle cx="70" cy="52" r="12" fill="#D4AF37"/>
        <path d="M36 96C52 106 88 106 104 96" stroke="#D4AF37" stroke-width="5" stroke-linecap="round"/>
      </svg>`
    };
  }

  // ---------- Đồng Bộ Dòng Kinh Đang Đọc Giữa Tất Cả Phật Tử Trong Phòng ----------
  function getSyncedLineIndex(room) {
    const lines = room.chantLines || [];
    if (!lines.length) return 0;
    // Mỗi câu kinh kéo dài 5.5 giây theo đồng hồ chung, đảm bảo mọi người vào cùng phòng đều thấy cùng 1 câu đang tụng
    const slot = Math.floor(Date.now() / 5500);
    return slot % lines.length;
  }

  function highlightChantLine(idx, shouldSpeak = false) {
    const lines = document.querySelectorAll("#sanctuary-chant-lines .chant-line");
    if (!lines.length) return;
    lines.forEach((l) => l.classList.remove("current"));
    currentLineIdx = ((idx % lines.length) + lines.length) % lines.length;
    const activeEl = lines[currentLineIdx];
    if (activeEl) {
      activeEl.classList.add("current");
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      if (shouldSpeak) {
        speakChantLine(activeEl.textContent || "");
      }
    }
  }

  // ---------- Sơ Đồ 12 Chỗ Ngồi Toạ Thiền (Bồ Đoàn) Hiển Thị Phật Tử Đang Online ----------
  function renderMeditationSeats(onlineUsersFromDb = []) {
    const seatsGrid = document.getElementById("meditation-seats-grid");
    const onlineCountEl =
      document.getElementById("room-online-count") ||
      document.getElementById("online-users-count");
    if (!seatsGrid) return;

    const myNick = getNickname();
    const defaultPeers = (currentRoom.defaultParticipants || []).map((p, i) => ({
      nickname: p.nickname,
      seat_index: (i * 3 + 1) % 12,
      status_text: p.action
    }));

    const occupiedMap = new Map();
    defaultPeers.forEach((p) => occupiedMap.set(p.seat_index, p));
    onlineUsersFromDb.forEach((u) => {
      occupiedMap.set(Number(u.seat_index) % 12, u);
    });
    // Luôn đặt bản thân người dùng vào vị trí ghế đã chọn
    occupiedMap.set(userSeatIndex, {
      nickname: `${myNick} (Bạn)`,
      seat_index: userSeatIndex,
      status_text: isSyncChanting ? "Đang đồng tụng kinh" : "Đang toạ thiền lễ Phật",
      isMe: true
    });

    if (onlineCountEl) {
      onlineCountEl.textContent = String(occupiedMap.size);
    }

    let html = "";
    for (let i = 0; i < 12; i++) {
      const occupant = occupiedMap.get(i);
      if (occupant) {
        html += `
          <div class="meditation-seat occupied ${occupant.isMe ? "is-me" : ""}" data-seat-idx="${i}" title="${occupant.status_text || "Đang tụng kinh"}">
            <div class="seat-avatar">🧘</div>
            <div class="seat-cushions"></div>
            <strong class="seat-name">${occupant.nickname}</strong>
            <span class="seat-status">${occupant.status_text || "Đang tụng kinh"}</span>
          </div>
        `;
      } else {
        html += `
          <button type="button" class="meditation-seat empty" data-seat-idx="${i}" title="Bấm để chuyển sang ngồi tại bồ đoàn số ${i + 1}">
            <div class="seat-cushions"></div>
            <span class="seat-empty-label">Bồ đoàn #${i + 1}<br><small>(Ngồi tại đây)</small></span>
          </button>
        `;
      }
    }
    seatsGrid.innerHTML = html;

    seatsGrid.querySelectorAll(".meditation-seat.empty").forEach((btn) => {
      btn.addEventListener("click", () => {
        userSeatIndex = Number(btn.getAttribute("data-seat-idx") || 0);
        showToast(`🧘 Bạn đã chuyển sang toạ thiền tại Bồ đoàn số ${userSeatIndex + 1}`);
        sendPresenceHeartbeat();
        renderMeditationSeats(onlineUsersFromDb);
      });
    });
  }

  async function sendPresenceHeartbeat() {
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "presence_heartbeat",
          roomId: currentRoom.id,
          nickname: getNickname(),
          seatIndex: userSeatIndex,
          meritPoints,
          statusText: isSyncChanting ? "Đang đồng tụng kinh" : "Đang lễ Phật"
        })
      });
    } catch {
      // ignore offline
    }
  }

  async function syncRoomLiveState() {
    try {
      const res = await fetch(
        `/api/events?mode=sanctuary_room&room=${encodeURIComponent(currentRoom.id)}`
      );
      if (!res.ok) {
        renderMeditationSeats([]);
        return;
      }
      const data = await res.json();
      renderMeditationSeats(data.onlineUsers || []);
      if (Array.isArray(data.recentPrayers) && data.recentPrayers.length > 0) {
        renderPrayerFeed(data.recentPrayers);
      }
    } catch {
      renderMeditationSeats([]);
    }
  }

  function renderPrayerFeed(cloudPrayers = []) {
    const feedEl = document.getElementById("sanctuary-prayer-feed");
    if (!feedEl) return;

    const combined = [
      ...cloudPrayers.map((it) => ({
        nickname: it.nickname,
        action: "Vừa thả Đèn Hoa Đăng cầu nguyện",
        wish: it.message
      })),
      ...(currentRoom.defaultParticipants || [])
    ];

    feedEl.innerHTML = combined
      .slice(0, 15)
      .map(
        (p) => `
      <div class="prayer-feed-item">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem;">
          <strong style="color:var(--gold-light);">🪷 ${p.nickname}</strong>
          <span style="font-size:0.72rem;color:var(--jade-green);">● Trực tuyến</span>
        </div>
        <div style="font-size:0.76rem;color:var(--text-muted);margin-bottom:0.2rem;">${p.action}</div>
        <div style="font-style:italic;color:var(--text-primary);">“${p.wish}”</div>
      </div>`
      )
      .join("");
  }

  function renderRoom(room) {
    currentRoom = room;
    const chamberEl = document.getElementById("altar-chamber-box");
    const stageEl = document.getElementById("altar-stage-visual");
    const themeInfo = getDeityAndBackdropSvg(room.id);

    if (chamberEl) {
      chamberEl.className = `altar-chamber ${themeInfo.bgClass}`;
    }
    if (stageEl) {
      stageEl.setAttribute("data-room-theme", room.id);
    }

    document.querySelectorAll(".room-select-card").forEach((card) => {
      card.classList.toggle("active", card.getAttribute("data-room-id") === room.id);
    });

    const titleEl = document.getElementById("sanctuary-room-title");
    const deityEl = document.getElementById("sanctuary-deity-title");
    const bannerEl = document.getElementById("sanctuary-banner-inscription");
    const mantraEl = document.getElementById("sanctuary-mantra-short");
    const haloEl = document.getElementById("sanctuary-deity-halo");
    const chantTitleEl = document.getElementById("sanctuary-chant-title");
    const chantListEl = document.getElementById("sanctuary-chant-lines");

    if (titleEl) titleEl.textContent = room.name;
    if (deityEl) deityEl.textContent = room.deityTitle;
    if (bannerEl) bannerEl.textContent = themeInfo.bannerTitle;
    if (mantraEl) mantraEl.textContent = `🙏 ${room.mantraShort}`;
    if (haloEl) haloEl.innerHTML = themeInfo.svg;
    if (chantTitleEl) chantTitleEl.textContent = `📖 ${room.chantTitle}`;

    const syncedIdx = getSyncedLineIndex(room);
    if (chantListEl) {
      chantListEl.innerHTML = (room.chantLines || [])
        .map(
          (line, idx) =>
            `<div class="chant-line ${idx === syncedIdx ? "current" : ""}" data-line-idx="${idx}">${line}</div>`
        )
        .join("");
    }
    currentLineIdx = syncedIdx;

    renderPrayerFeed([]);
    sendPresenceHeartbeat();
    syncRoomLiveState();
  }

  function spawnFloatingLantern(text) {
    const stage = document.getElementById("altar-stage-visual");
    if (!stage) return;
    const lantern = document.createElement("div");
    lantern.className = "floating-lantern";
    lantern.style.left = `${Math.floor(12 + Math.random() * 68)}%`;
    lantern.textContent = `🏮 ${getNickname()}: ${text.slice(0, 42)}`;
    stage.appendChild(lantern);
    setTimeout(() => lantern.remove(), 6500);
  }

  function initSanctuaryEvents() {
    initSpeechVoices();
    updateMeritDisplay(0);

    const nicknameInput = document.getElementById("sanctuary-nickname-input");
    const savedNick = localStorage.getItem(STORAGE_NICKNAME_KEY) || "";
    if (nicknameInput && savedNick) nicknameInput.value = savedNick;

    nicknameInput?.addEventListener("change", () => {
      const val = nicknameInput.value.trim();
      if (val) {
        localStorage.setItem(STORAGE_NICKNAME_KEY, val);
        showToast(`🪷 Đã lưu Pháp danh / Tên tín chủ: ${val}`);
        sendPresenceHeartbeat();
        syncRoomLiveState();
      }
    });

    // Chuyển phòng
    document.querySelectorAll(".room-select-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-room-id");
        const found = ROOMS.find((r) => r.id === id);
        if (found) {
          renderRoom(found);
          playTempleBellSound();
          showToast(`🙏 Đã bước vào ${found.name}`);
        }
      });
    });

    // Bật / Tắt Giọng Đọc Tụng Kinh
    const voiceToggleBtn = document.getElementById("btn-toggle-voice");
    voiceToggleBtn?.addEventListener("click", () => {
      isVoiceEnabled = !isVoiceEnabled;
      voiceToggleBtn.textContent = isVoiceEnabled
        ? "🔊 Giọng Đọc Kinh: BẬT"
        : "🔇 Giọng Đọc Kinh: TẮT";
      if (!isVoiceEnabled && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      } else {
        const lines = currentRoom.chantLines || [];
        if (lines[currentLineIdx]) speakChantLine(lines[currentLineIdx]);
      }
    });

    // Chế độ Đồng Tụng Kinh Tự Động (Tự động gõ mõ + đọc kinh + Cộng +2 Điểm Công Đức mỗi câu!)
    const autoBtn = document.getElementById("btn-auto-chant");
    autoBtn?.addEventListener("click", () => {
      if (isSyncChanting) {
        isSyncChanting = false;
        clearInterval(chantTimer);
        chantTimer = null;
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        autoBtn.textContent = "▶️ Bắt Đầu Đồng Tụng Kinh & Nghe Kinh (+2 Điểm/câu)";
        sendPresenceHeartbeat();
      } else {
        isSyncChanting = true;
        autoBtn.textContent = "⏸️ Đang Đồng Tụng Kinh Cùng Đạo Tràng (Bấm Để Dừng)";
        playTempleBellSound();
        const syncedIdx = getSyncedLineIndex(currentRoom);
        highlightChantLine(syncedIdx, true);
        sendPresenceHeartbeat();

        // Nhịp mõ đều đặn + đọc câu kinh đồng bộ
        chantTimer = setInterval(() => {
          playRealisticWoodenFishSound();
          setTimeout(() => playRealisticWoodenFishSound(), 650);
          const nextIdx = (currentLineIdx + 1) % (currentRoom.chantLines?.length || 1);
          highlightChantLine(nextIdx, true);
          updateMeritDisplay(2);
          showToast("✨ +2 Điểm Công Đức (Thành tâm tụng & nghe kinh)");
        }, 5500);
      }
    });

    // Các nút Nghi Lễ (Trừ Điểm Công Đức tương ứng)
    document.getElementById("ritual-incense-btn")?.addEventListener("click", (e) => {
      if (!spendMerit("incense")) return;
      e.currentTarget.classList.add("active");
      document.getElementById("slot-incense")?.classList.add("active");
      playTempleBellSound();
      showToast(`🔥 (-5 điểm) ${getNickname()} đã thành tâm dâng 3 nén nhang trầm thơm ngát!`);
    });

    document.getElementById("ritual-flower-btn")?.addEventListener("click", (e) => {
      if (!spendMerit("flower")) return;
      e.currentTarget.classList.add("active");
      document.getElementById("slot-flower")?.classList.add("active");
      playTempleBellSound();
      showToast(`🪷 (-5 điểm) ${getNickname()} đã dâng Hoa Sen Vàng & Mâm Ngũ Quả!`);
    });

    document.getElementById("ritual-lamp-btn")?.addEventListener("click", (e) => {
      if (!spendMerit("lamp")) return;
      e.currentTarget.classList.add("active");
      document.getElementById("slot-lamp")?.classList.add("active");
      playTempleBellSound();
      showToast(`🕯️ (-8 điểm) ${getNickname()} đã thắp sáng Đèn Liên Hoa Trí Tuệ!`);
    });

    document.getElementById("ritual-bell-btn")?.addEventListener("click", () => {
      if (!spendMerit("bell")) return;
      playTempleBellSound();
      showToast("🔔 (-2 điểm) Tiếng chuông Bát Nhã ngân vang khắp điện thờ...");
    });

    document.getElementById("ritual-mo-btn")?.addEventListener("click", () => {
      if (!spendMerit("mo")) return;
      playRealisticWoodenFishSound();
      const nextIdx = (currentLineIdx + 1) % (currentRoom.chantLines?.length || 1);
      highlightChantLine(nextIdx, true);
    });

    document.getElementById("ritual-mala-btn")?.addEventListener("click", () => {
      if (!spendMerit("mala")) return;
      playRealisticWoodenFishSound();
      spawnFloatingLantern(currentRoom.mantraShort);
      showToast("📿 (-2 điểm) Lần chuỗi 108 hạt niệm Phật hiệu...");
    });

    // Thả Đèn Hoa Đăng Cầu Nguyện (-10 Điểm Công Đức, Lưu D1 để mọi người cùng thấy, KHÔNG gửi Telegram)
    const prayerForm = document.getElementById("sanctuary-prayer-form");
    prayerForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const wishInput = document.getElementById("sanctuary-wish-input");
      const wish = (wishInput?.value || "").trim();
      if (!wish) {
        showToast("⚠️ Vui lòng nhập lời nguyện cầu trước khi thả đèn!");
        return;
      }

      const tsInput = prayerForm.querySelector('input[name="cf-turnstile-response"]');
      const tsToken = tsInput ? tsInput.value.trim() : "sanctuary-verified";
      if (window.turnstile && !tsToken) {
        showToast("🛡️ Vui lòng tích xác thực Cloudflare Turnstile bên dưới!");
        return;
      }

      if (!spendMerit("lantern")) return;

      const nick = getNickname();
      localStorage.setItem(STORAGE_NICKNAME_KEY, nick);
      playTempleBellSound();
      spawnFloatingLantern(wish);

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
          <div style="font-size:0.76rem;color:var(--text-muted);margin-bottom:0.2rem;">Tại ${currentRoom.name}</div>
          <div style="font-style:italic;color:var(--text-primary);">“${wish}”</div>
        `;
        feedEl.prepend(item);
      }

      if (wishInput) wishInput.value = "";
      showToast(`🏮 (-10 điểm) Đèn Hoa Đăng của ${nick} đã bay lên điện thờ!`);

      try {
        await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "chant_room",
            roomId: currentRoom.id,
            nickname: nick,
            message: wish,
            "cf-turnstile-response": tsToken,
            payload: { roomName: currentRoom.name }
          })
        });
      } catch {
        // ignore offline
      }
    });

    // Khởi tạo phòng theo URL (?room=...) hoặc phòng đầu tiên và đồng bộ mỗi 18 giây
    const urlRoomId = new URLSearchParams(window.location.search).get("room");
    const initialRoom = ROOMS.find((r) => r.id === urlRoomId) || ROOMS[0];
    if (initialRoom) {
      renderRoom(initialRoom);
    }
    onlineTimer = setInterval(() => {
      sendPresenceHeartbeat();
      syncRoomLiveState();
    }, 18000);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem(STORAGE_THEME_KEY) || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    const toggleBtn = document.getElementById("theme-toggle-btn");
    toggleBtn?.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme") || "dark";
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(STORAGE_THEME_KEY, next);
    });
    initSanctuaryEvents();
  });
})();
