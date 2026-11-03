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
  let currentVoiceModel = "vi-VN-HoaiMyNeural"; // Microsoft Neural TTS: vi-VN-HoaiMyNeural hoặc vi-VN-NamMinhNeural
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
    const countEl = document.getElementById("sanctuary-merit-count");
    if (countEl) countEl.textContent = String(meritPoints);
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

  function playSmallChimeSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Tiếng khánh đồng nhỏ điểm cuối mỗi câu kinh (Thanh thoát, ngân 1.8s)
    const freqs = [528, 1056, 1584];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now);
      const amp = 0.16 / (i + 1);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(amp, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.7 - i * 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.8);
    });
  }

  function playRealisticWoodenFishSound(volumeScale = 1.0) {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Tiếng gõ dùi gỗ (Click transient)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = "triangle";
    clickOsc.frequency.setValueAtTime(1080, now);
    clickOsc.frequency.exponentialRampToValueAtTime(390, now + 0.025);
    clickGain.gain.setValueAtTime(0.28 * volumeScale, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.035);

    // 2. Hốc gỗ vang trầm ấm (Hollow wood resonance "Cốc")
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = "sine";
    bodyOsc.frequency.setValueAtTime(495, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(370, now + 0.12);
    bodyGain.gain.setValueAtTime(0.001, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.48 * volumeScale, now + 0.006);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.18);
  }

  // ---------- Giọng Đọc Tụng Kinh Tự Nhiên (Cloud Neural TTS + Nhịp Phách Tụng Kinh) ----------
  let viFemaleVoice = null;
  let viMaleVoice = null;
  let activeChantSessionId = 0;
  let currentTtsAudio = null;
  let woodenFishInterval = null;

  function initSpeechVoices() {
    if (!("speechSynthesis" in window)) return;
    const pickVoices = () => {
      const voices = window.speechSynthesis.getVoices() || [];
      if (!voices.length) return;

      const viVoices = voices.filter(
        (v) =>
          (v.lang && v.lang.toLowerCase().replace(/_/g, "-").startsWith("vi")) ||
          (v.name && /vietnam|tiếng việt/i.test(v.name))
      );

      // Giọng Nữ: Hoài My (Edge/Windows), Linh (macOS/iOS), Google tiếng Việt
      viFemaleVoice =
        viVoices.find((v) => /hoaimy|female|nữ/i.test(v.name)) ||
        viVoices.find((v) => /linh/i.test(v.name)) ||
        viVoices.find((v) => /google/i.test(v.name)) ||
        viVoices[0] ||
        null;

      // Giọng Nam: Nam Minh (Edge/Windows), An, Male
      viMaleVoice =
        viVoices.find((v) => /namminh|male|nam/i.test(v.name)) ||
        viVoices.find((v) => v !== viFemaleVoice) ||
        viFemaleVoice;
    };

    pickVoices();
    window.speechSynthesis.onvoiceschanged = pickVoices;
  }

  function stopCurrentSpeechAndRhythm() {
    activeChantSessionId += 1;
    if (woodenFishInterval) {
      clearInterval(woodenFishInterval);
      woodenFishInterval = null;
    }
    if (currentTtsAudio) {
      try {
        currentTtsAudio.pause();
        currentTtsAudio.src = "";
      } catch {
        // ignore
      }
      currentTtsAudio = null;
    }
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  function startSteadyWoodenFishRhythm() {
    if (woodenFishInterval) clearInterval(woodenFishInterval);
    // Nhịp mõ tụng kinh khoan thai đều đặn (1 tiếng mõ nhẹ mỗi 980ms làm nền cho giọng đọc)
    woodenFishInterval = setInterval(() => {
      if (isSyncChanting) {
        playRealisticWoodenFishSound(0.42);
      }
    }, 980);
  }

  // Tách câu kinh thành từng vế ngân nga tự nhiên & xử lý "(3 lần)"
  function prepareChantClauses(rawLine) {
    const clean = String(rawLine || "").trim();
    if (!clean) return [];

    // Nếu câu kinh có "(3 lần)" -> Lặp lại đúng 3 lần câu niệm trang nghiêm
    if (/\(\s*3\s*lần\s*\)/i.test(clean)) {
      const basePhrase = clean.replace(/\(\s*3\s*lần\s*\)/gi, "").trim();
      return [basePhrase, basePhrase, basePhrase];
    }

    // Với Microsoft Neural TTS, giữ nguyên trọn vẹn cả câu kinh để đọc đúng ngữ điệu và ngắt nghỉ tự nhiên theo dấu câu
    // Chỉ tách vế nếu câu kinh đặc biệt dài (> 180 ký tự) tại dấu chấm hoặc chấm phẩy
    if (clean.length > 180 && /[.;]/.test(clean)) {
      const parts = clean.split(/(?<=[.;])\s+/).map((s) => s.trim()).filter(Boolean);
      return parts.length > 0 ? parts : [clean];
    }

    return [clean];
  }

  function delayMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Đọc trọn vẹn vế/câu kinh và trả về Promise chỉ hoàn tất KHI ĐỌC XONG HẾT (Tuyệt đối không cắt ngang giữa chừng!)
  function speakSingleClause(clauseText, sessionId) {
    return new Promise((resolve) => {
      if (sessionId !== activeChantSessionId) {
        resolve();
        return;
      }

      const wordsCount = clauseText.split(/\s+/).filter(Boolean).length;
      const estimatedSilentMs = Math.max(3000, wordsCount * 450);

      if (!isVoiceEnabled) {
        setTimeout(resolve, estimatedSilentMs);
        return;
      }

      const isMale = currentVoiceModel === "vi-VN-NamMinhNeural";

      // 1. ƯU TIÊN SỐ 1: Dùng Web Speech Synthesis của trình duyệt (Hoài My / Nam Minh trên Edge/Windows, Google tiếng Việt, Linh)
      // Cho chất lượng tự nhiên cao nhất, phản hồi tức thì và đổi Nam/Nữ nghe khác biệt ngay lập tức!
      if (
        "speechSynthesis" in window &&
        (viFemaleVoice || viMaleVoice || window.speechSynthesis.getVoices().length > 0)
      ) {
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(clauseText);
          utter.lang = "vi-VN";

          if (isMale) {
            // Giọng Nam (Nam Minh): Trầm ấm, âm vực dày dặn, trang nghiêm như thầy tụng
            if (viMaleVoice) utter.voice = viMaleVoice;
            utter.pitch = 0.74; // Hạ cao độ trầm rõ rệt
            utter.rate = 0.84;  // Đọc từ tốn, khoan thai
            utter.volume = 1.0;
          } else {
            // Giọng Nữ (Hoài My): Thanh thoát, dịu dàng, trong sáng
            if (viFemaleVoice) utter.voice = viFemaleVoice;
            utter.pitch = 1.06; // Cao độ nữ thanh tịnh
            utter.rate = 0.88;  // Đọc nhịp nhàng
            utter.volume = 1.0;
          }

          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
          };

          const safetyTimer = setTimeout(finish, Math.max(16000, wordsCount * 1200));

          utter.onend = () => {
            clearTimeout(safetyTimer);
            finish();
          };

          utter.onerror = () => {
            clearTimeout(safetyTimer);
            speakViaAudioApi(clauseText, isMale, sessionId).then(finish);
          };

          window.speechSynthesis.speak(utter);
          return;
        } catch {
          // Bỏ qua lỗi và gọi fallback API bên dưới
        }
      }

      // 2. DỰ PHÒNG: Nếu trình duyệt không hỗ trợ Web Speech
      speakViaAudioApi(clauseText, isMale, sessionId).then(resolve);
    });
  }

  function speakViaAudioApi(clauseText, isMale, sessionId) {
    return new Promise((resolve) => {
      if (sessionId !== activeChantSessionId) {
        resolve();
        return;
      }

      const wordsCount = clauseText.split(/\s+/).filter(Boolean).length;
      const targetVoice = isMale ? "vi-VN-NamMinhNeural" : "vi-VN-HoaiMyNeural";
      const audioUrl = `/api/tts?text=${encodeURIComponent(clauseText)}&voice=${encodeURIComponent(targetVoice)}`;
      const audio = new Audio(audioUrl);
      currentTtsAudio = audio;

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      const maxWaitTimer = setTimeout(finish, Math.max(16000, wordsCount * 1200));

      audio.onloadedmetadata = () => {
        audio.playbackRate = isMale ? 0.82 : 0.95;
      };

      audio.onended = () => {
        clearTimeout(maxWaitTimer);
        finish();
      };

      audio.onerror = () => {
        clearTimeout(maxWaitTimer);
        finish();
      };

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          clearTimeout(maxWaitTimer);
          finish();
        });
      }
    });
  }

  // Đọc trọn vẹn 1 dòng kinh (gồm nhiều vế + nhịp nghỉ lấy hơi + tiếng mõ/khánh) trước khi qua câu mới
  async function chantFullLineAndWait(lineText, sessionId) {
    const clauses = prepareChantClauses(lineText);
    const isTripleInvocation = /\(\s*3\s*lần\s*\)/i.test(lineText);

    for (let i = 0; i < clauses.length; i++) {
      if (sessionId !== activeChantSessionId) return;
      playRealisticWoodenFishSound(0.65);
      await speakSingleClause(clauses[i], sessionId);
      if (sessionId !== activeChantSessionId) return;

      if (isTripleInvocation) {
        // Giữa mỗi lần niệm "Nam Mô..." điểm 1 tiếng chuông/khánh và nghỉ 650ms trang nghiêm
        playSmallChimeSound();
        await delayMs(700);
      } else if (i < clauses.length - 1) {
        // Nghỉ lấy hơi tự nhiên giữa các vế dấu phẩy (420ms) kèm 1 nhịp mõ
        playRealisticWoodenFishSound(0.5);
        await delayMs(420);
      }
    }

    // Kết thúc trọn vẹn 1 câu kinh: Điểm tiếng khánh đồng + nghỉ 950ms rồi mới sang câu tiếp theo
    if (sessionId === activeChantSessionId) {
      playSmallChimeSound();
      await delayMs(950);
    }
  }

  function speakChantLine(text) {
    stopCurrentSpeechAndRhythm();
    const mySession = activeChantSessionId;
    chantFullLineAndWait(text, mySession);
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

  // ---------- 7 Hiệu Ứng Trực Quan Sinh Động Khi Phật Tử Hành Lễ ----------
  function triggerRitualEffect(type) {
    const stage = document.getElementById("altar-stage-visual");
    if (!stage) return;

    if (type === "incense") {
      // 1. Dâng Hương Trầm: 3 nén nhang cháy sáng ngun ngút & khói trầm lượn sóng
      const wrap = document.createElement("div");
      wrap.className = "fx-incense-ceremony";
      wrap.innerHTML = `
        <div class="fx-smoke-cloud"></div>
        <div class="fx-incense-sticks">
          <div class="fx-incense-stick"></div>
          <div class="fx-incense-stick"></div>
          <div class="fx-incense-stick"></div>
        </div>
      `;
      stage.appendChild(wrap);
      setTimeout(() => wrap.remove(), 4200);
    } else if (type === "flower") {
      // 2. Dâng Hoa Quả: Cơn mưa hoa sen vàng & hoa cúc rải cánh trang nghiêm
      const icons = ["🪷", "🌸", "✨", "🌺", "🪷"];
      for (let i = 0; i < 9; i++) {
        setTimeout(() => {
          const petal = document.createElement("div");
          petal.className = "fx-lotus-petal";
          petal.style.left = `${10 + Math.random() * 80}%`;
          petal.style.animationDuration = `${3.2 + Math.random() * 1.5}s`;
          petal.textContent = icons[Math.floor(Math.random() * icons.length)];
          stage.appendChild(petal);
          setTimeout(() => petal.remove(), 4800);
        }, i * 220);
      }
    } else if (type === "lamp") {
      // 3. Thắp Đèn Trí Tuệ: Ánh hào quang mặt trời Bát Nhã toả sáng rực rỡ
      const sunburst = document.createElement("div");
      sunburst.className = "fx-wisdom-sunburst";
      stage.appendChild(sunburst);
      setTimeout(() => sunburst.remove(), 4000);
    } else if (type === "bell") {
      // 4. Thỉnh Chuông: Sóng âm đồng tâm lan toả & chuông đồng đung đưa ngân vang
      const bell = document.createElement("div");
      bell.className = "fx-swinging-bell";
      bell.textContent = "🔔";
      stage.appendChild(bell);
      setTimeout(() => bell.remove(), 2600);

      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const wave = document.createElement("div");
          wave.className = "fx-bell-ripple";
          stage.appendChild(wave);
          setTimeout(() => wave.remove(), 2800);
        }, i * 380);
      }
    } else if (type === "mo") {
      // 5. Gõ Mõ: Dùi gõ mõ nổi bật + chữ Phật / Vạn linh thiêng bay lên
      const moPop = document.createElement("div");
      moPop.className = "fx-wooden-fish-pop";
      moPop.innerHTML = `<span>🥁</span> <span>CỐC... Tịnh Tâm</span>`;
      stage.appendChild(moPop);
      setTimeout(() => moPop.remove(), 1400);

      const dharmaChars = ["卍", "Phật", "Tâm", "An", "Phước", "Tuệ"];
      const charEl = document.createElement("div");
      charEl.className = "fx-dharma-char";
      charEl.style.left = `${30 + Math.random() * 40}%`;
      charEl.textContent = dharmaChars[Math.floor(Math.random() * dharmaChars.length)];
      stage.appendChild(charEl);
      setTimeout(() => charEl.remove(), 2200);
    } else if (type === "mala") {
      // 6. Lần Chuỗi 108 Hạt: Vòng tràng hạt Bồ Đề vàng xoay tròn quanh điện
      const mala = document.createElement("div");
      mala.className = "fx-mala-ring";
      stage.appendChild(mala);
      setTimeout(() => mala.remove(), 3200);
    }
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
          isSyncChanting = false;
          stopCurrentSpeechAndRhythm();
          const autoBtnEl = document.getElementById("btn-auto-chant");
          if (autoBtnEl) {
            autoBtnEl.textContent = "▶️ Bắt Đầu Tụng Kinh & Gõ Mõ (+2đ/câu)";
          }
          renderRoom(found);
          playTempleBellSound();
          showToast(`🙏 Đã bước vào ${found.name}`);
        }
      });
    });

    // Đổi Giọng Đọc Microsoft Neural TTS (Hoài My - Nữ / Nam Minh - Nam)
    const switchVoiceBtn = document.getElementById("btn-switch-voice");
    switchVoiceBtn?.addEventListener("click", () => {
      stopCurrentSpeechAndRhythm(); // Dừng ngay âm thanh cũ

      if (currentVoiceModel === "vi-VN-HoaiMyNeural") {
        currentVoiceModel = "vi-VN-NamMinhNeural";
        switchVoiceBtn.textContent = "🎙️ Giọng: Nam Minh (Nam)";
        showToast("🎙️ Đã chuyển sang Giọng Nam (Nam Minh) trầm ấm, trang nghiêm");
      } else {
        currentVoiceModel = "vi-VN-HoaiMyNeural";
        switchVoiceBtn.textContent = "🎙️ Giọng: Hoài My (Nữ)";
        showToast("🎙️ Đã chuyển sang Giọng Nữ (Hoài My) thanh tịnh, từ tốn");
      }

      if (isVoiceEnabled) {
        const lines = currentRoom.chantLines || [];
        if (lines[currentLineIdx]) {
          speakChantLine(lines[currentLineIdx]);
        }
      }
    });

    // Bật / Tắt Giọng Đọc Tụng Kinh
    const voiceToggleBtn = document.getElementById("btn-toggle-voice");
    voiceToggleBtn?.addEventListener("click", () => {
      isVoiceEnabled = !isVoiceEnabled;
      voiceToggleBtn.textContent = isVoiceEnabled
        ? "🔊 Giọng Đọc Kinh: BẬT"
        : "🔇 Giọng Đọc Kinh: TẮT";
      if (!isVoiceEnabled) {
        if (currentTtsAudio) {
          try {
            currentTtsAudio.pause();
          } catch {
            // ignore
          }
        }
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
      } else if (!isSyncChanting) {
        const lines = currentRoom.chantLines || [];
        if (lines[currentLineIdx]) speakChantLine(lines[currentLineIdx]);
      }
    });

    // Chế độ Đồng Tụng Kinh Tự Động (Đọc hết trọn vẹn từng câu kinh + Gõ mõ theo nhịp + Cộng +2 Điểm Công Đức mỗi câu!)
    const autoBtn = document.getElementById("btn-auto-chant");
    autoBtn?.addEventListener("click", async () => {
      if (isSyncChanting) {
        isSyncChanting = false;
        stopCurrentSpeechAndRhythm();
        autoBtn.textContent = "▶️ Bắt Đầu Tụng Kinh & Gõ Mõ (+2đ/câu)";
        sendPresenceHeartbeat();
        return;
      }

      isSyncChanting = true;
      stopCurrentSpeechAndRhythm();
      const mySession = activeChantSessionId;
      autoBtn.textContent = "⏸️ Đang Tụng Kinh Cùng Đạo Tràng (Bấm Để Dừng)";

      playTempleBellSound();
      startSteadyWoodenFishRhythm();
      sendPresenceHeartbeat();

      let idx = getSyncedLineIndex(currentRoom);

      while (isSyncChanting && mySession === activeChantSessionId) {
        const lines = currentRoom.chantLines || [];
        if (!lines.length) break;

        idx = ((idx % lines.length) + lines.length) % lines.length;
        highlightChantLine(idx, false);

        // Chờ giọng đọc tụng XONG HOÀN TOÀN câu kinh hiện tại (kể cả câu dài) mới chuyển sang câu kế tiếp
        await chantFullLineAndWait(lines[idx], mySession);

        if (!isSyncChanting || mySession !== activeChantSessionId) break;

        updateMeritDisplay(2);
        showToast("✨ +2 Điểm Công Đức (Hoàn thành 1 câu kinh)");
        idx = (idx + 1) % lines.length;
      }
    });

    // Các nút Nghi Lễ (Trừ Điểm Công Đức tương ứng & Kích hoạt Hiệu Ứng Sinh Động)
    document.getElementById("ritual-incense-btn")?.addEventListener("click", (e) => {
      if (!spendMerit("incense")) return;
      e.currentTarget.classList.add("active");
      document.getElementById("slot-incense")?.classList.add("active");
      playTempleBellSound();
      triggerRitualEffect("incense");
      showToast(`🔥 (-5 điểm) ${getNickname()} đã thành tâm dâng 3 nén nhang trầm thơm ngát!`);
    });

    document.getElementById("ritual-flower-btn")?.addEventListener("click", (e) => {
      if (!spendMerit("flower")) return;
      e.currentTarget.classList.add("active");
      document.getElementById("slot-flower")?.classList.add("active");
      playTempleBellSound();
      triggerRitualEffect("flower");
      showToast(`🪷 (-5 điểm) ${getNickname()} đã dâng Hoa Sen Vàng & Mâm Ngũ Quả!`);
    });

    document.getElementById("ritual-lamp-btn")?.addEventListener("click", (e) => {
      if (!spendMerit("lamp")) return;
      e.currentTarget.classList.add("active");
      document.getElementById("slot-lamp")?.classList.add("active");
      playTempleBellSound();
      triggerRitualEffect("lamp");
      showToast(`🕯️ (-8 điểm) ${getNickname()} đã thắp sáng Đèn Liên Hoa Trí Tuệ!`);
    });

    document.getElementById("ritual-bell-btn")?.addEventListener("click", () => {
      if (!spendMerit("bell")) return;
      playTempleBellSound();
      triggerRitualEffect("bell");
      showToast("🔔 (-2 điểm) Tiếng chuông Bát Nhã ngân vang khắp điện thờ...");
    });

    document.getElementById("ritual-mo-btn")?.addEventListener("click", () => {
      if (!spendMerit("mo")) return;
      playRealisticWoodenFishSound();
      triggerRitualEffect("mo");
      const nextIdx = (currentLineIdx + 1) % (currentRoom.chantLines?.length || 1);
      highlightChantLine(nextIdx, true);
    });

    document.getElementById("ritual-mala-btn")?.addEventListener("click", () => {
      if (!spendMerit("mala")) return;
      playRealisticWoodenFishSound();
      triggerRitualEffect("mala");
      showToast("📿 (-2 điểm) Lần chuỗi 108 hạt Bồ Đề niệm Phật hiệu...");
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
