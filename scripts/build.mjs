import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const rootDir = process.cwd();
const outputDir = path.resolve(rootDir, "dist");

const config = JSON.parse(await fs.readFile(path.join(rootDir, "src/data/site.config.json"), "utf8"));
const productsData = JSON.parse(await fs.readFile(path.join(rootDir, "src/data/products.json"), "utf8"));
const fortunesData = JSON.parse(await fs.readFile(path.join(rootDir, "src/data/fortunes.json"), "utf8"));
const charityData = JSON.parse(await fs.readFile(path.join(rootDir, "src/data/charity.json"), "utf8"));
const sanctuaryData = JSON.parse(await fs.readFile(path.join(rootDir, "src/data/sanctuary.json"), "utf8"));

const cssHash = crypto
  .createHash("sha256")
  .update(await fs.readFile(path.join(rootDir, "public/assets/styles.css")))
  .digest("hex")
  .slice(0, 10);

const jsHash = crypto
  .createHash("sha256")
  .update(await fs.readFile(path.join(rootDir, "public/assets/app.js")))
  .digest("hex")
  .slice(0, 10);

function formatVND(amount) {
  return new Intl.NumberFormat("vi-VN").format(Number(amount) || 0) + "đ";
}

function getArtworkSvg(type) {
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

const schemaJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${config.domain}/#organization`,
      "name": config.fullTitle,
      "alternateName": config.brandName,
      "url": config.domain,
      "logo": `${config.domain}/favicon.svg`,
      "description": config.description,
      "sameAs": [
        config.contact.facebookUrl,
        config.contact.tiktokUrl,
        config.contact.zaloUrl
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": `+84-${config.contact.zalo.slice(1)}`,
        "contactType": "customer service",
        "areaServed": "VN",
        "availableLanguage": ["Vietnamese"]
      }
    },
    {
      "@type": "WebSite",
      "@id": `${config.domain}/#website`,
      "url": config.domain,
      "name": config.fullTitle,
      "publisher": { "@id": `${config.domain}/#organization` }
    }
  ]
};

const defaultRoom = sanctuaryData.rooms[0];

const indexHtml = `<!DOCTYPE html>
<html lang="vi" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.fullTitle}</title>
  <meta name="description" content="${config.description}" />
  <meta name="keywords" content="Cô Bé Hữu Duyên, tụng kinh online, đi chùa online, xem bói, gieo quẻ kinh dịch, xin xăm quán âm, vật phẩm phong thuỷ, đồ hàng mã cúng lễ, từ thiện phóng sinh, cobehuuduyen" />
  <link rel="canonical" href="${config.domain}/" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

  <!-- Open Graph / Social Sharing -->
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="vi_VN" />
  <meta property="og:site_name" content="${config.brandName}" />
  <meta property="og:title" content="${config.fullTitle}" />
  <meta property="og:description" content="${config.description}" />
  <meta property="og:url" content="${config.domain}/" />
  <meta property="og:image" content="${config.domain}/og-banner.svg" />

  <!-- Google Fonts: Noto Serif (Chuẩn mực Tâm linh Á Đông) + Plus Jakarta Sans (Hiện đại, rõ nét) -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="/assets/styles.css?v=${cssHash}" />
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <script type="application/ld+json">${JSON.stringify(schemaJsonLd)}</script>
</head>
<body>
  <a class="skip-link" href="#main-content">Chuyển đến nội dung chính</a>

  <!-- Top Auspicious Lunar & Contact Bar -->
  <div class="top-auspicious-bar">
    <div class="container top-bar-inner">
      <div class="lunar-ticker">
        <span class="lunar-badge">☯️ Lịch Vạn Niên</span>
        <span id="top-lunar-text">Đang tải thông tin ngày Hoàng Đạo & Can Chi...</span>
      </div>
      <div class="top-bar-links">
        <a href="${config.contact.zaloUrl}" target="_blank" rel="noopener">💬 Zalo Thầy: <strong>${config.contact.phoneDisplay}</strong></a>
        <span>•</span>
        <a href="${config.contact.tiktokUrl}" target="_blank" rel="noopener">🎵 TikTok: <strong>${config.contact.tiktokHandle}</strong></a>
        <span>•</span>
        <a href="${config.contact.facebookUrl}" target="_blank" rel="noopener">📘 Facebook Chính Chủ</a>
      </div>
    </div>
  </div>

  <!-- Sticky Main Header (Mobile & Desktop Optimized, No Wrapping) -->
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="brand-logo" aria-label="${config.brandName}">
        <img src="/favicon.svg" alt="Logo ${config.brandName}" class="brand-emblem" width="42" height="42" />
        <div class="brand-text">
          <span class="brand-name">${config.brandName}</span>
          <span class="brand-sub">Tâm Linh • Phong Thuỷ • Thiện Nguyện</span>
        </div>
      </a>

      <nav class="main-nav" id="main-nav" aria-label="Điều hướng chính">
        <a href="/phong-tung-kinh.html" class="nav-link nav-link-highlight">🙏 Phòng Tụng Kinh Online</a>
        <a href="#xem-boi" class="nav-link">☯️ Xem Bói</a>
        <a href="#vat-pham" class="nav-link">🪷 Hàng Mã & Phong Thuỷ</a>
        <a href="#dat-si" class="nav-link">📦 Đặt Sỉ</a>
        <a href="#dat-lich" class="nav-link">📿 Đặt Lịch 1-1</a>
        <a href="#tu-thien" class="nav-link">💛 Từ Thiện</a>
      </nav>

      <div class="header-actions">
        <button type="button" class="icon-btn" id="theme-toggle-btn" title="Chuyển đổi giao diện Sáng / Tối">
          <span id="theme-toggle-icon">☀️</span>
          <span id="theme-toggle-label">Sáng</span>
        </button>

        <button type="button" class="icon-btn" id="open-cart-btn" aria-label="Mở giỏ vật phẩm">
          <span>🛒 Giỏ<span class="cart-btn-text-extra"> Thỉnh</span></span>
          <span class="cart-badge" id="cart-count-badge">0</span>
        </button>

        <button type="button" class="icon-btn mobile-menu-btn" id="mobile-menu-btn" aria-label="Mở menu">
          ☰
        </button>
      </div>
    </div>
  </header>

  <main id="main-content">
    <!-- HERO SECTION -->
    <section class="hero-section">
      <svg class="hero-bg-mandala" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="200" cy="200" r="190" stroke="#D4AF37" stroke-width="2" stroke-dasharray="8 8"/>
        <circle cx="200" cy="200" r="155" stroke="#D4AF37" stroke-width="1.5"/>
        <polygon points="200,25 324,76 375,200 324,324 200,375 76,324 25,200 76,76" stroke="#D4AF37" stroke-width="1.5" fill="none"/>
        <circle cx="200" cy="200" r="85" stroke="#D4AF37" stroke-width="2"/>
        <path d="M200 115 A42.5 42.5 0 0 1 200 200 A42.5 42.5 0 0 0 200 285 A85 85 0 1 1 200 115 Z" fill="#D4AF37" opacity="0.25"/>
      </svg>

      <div class="container hero-grid">
        <div>
          <div class="auspicious-seal">
            <span class="seal-stamp">HỮU DUYÊN</span>
            <span>Khơi Nguồn Bình An • Chiêu Tài Nạp Phúc • Tâm Sáng Hướng Thiện</span>
          </div>

          <h1 class="hero-title">
            Kết Nối Tâm Linh Chân Chính Cùng <span class="gold-highlight">Cô Bé Hữu Duyên</span>
          </h1>

          <p class="hero-subtitle">
            Không gian tâm linh trực tuyến: <strong>Toạ Phòng Tụng Kinh & Dâng Lễ Online</strong> cùng đạo tràng Phật tử, <strong>Xin Xăm – Kinh Dịch – Tarot</strong>, Đặt lịch xem 1-1 cùng thầy qua Zalo/TikTok/Facebook, thỉnh <strong>Đồ Hàng Mã – Vật Phẩm Phong Thuỷ trì chú</strong> và <strong>Quỹ Từ Thiện Minh Bạch</strong>.
          </p>

          <div class="hero-cta-group">
            <a href="/phong-tung-kinh.html" class="btn btn-gold">🙏 Vào Phòng Tụng Kinh Online</a>
            <a href="#xem-boi" class="btn btn-crimson">☯️ Gieo Quẻ & Xin Xăm</a>
            <a href="#vat-pham" class="btn btn-outline">🪷 Thỉnh Hàng Mã & Phong Thuỷ</a>
          </div>

          <div class="hero-stats">
            ${config.stats
              .map(
                (st) => `
              <div class="stat-item">
                <strong>${st.value}</strong>
                <span>${st.label}</span>
              </div>`
              )
              .join("")}
          </div>
        </div>

        <!-- Master Altar & Daily Lunar Card -->
        <aside class="hero-altar-card" aria-label="Thông tin Cô Bé Hữu Duyên & Lịch Vạn Niên">
          <div class="altar-header">
            <div class="altar-avatar">
              <img src="/favicon.svg" alt="Ấn triện Cô Bé Hữu Duyên" width="46" height="46" />
            </div>
            <div class="altar-title">
              <h2>${config.contact.masterName}</h2>
              <div class="altar-verified">✔ Luận giải thực tế • Uy tín • Tận tâm</div>
            </div>
          </div>

          <div class="lunar-daily-box">
            <div class="lunar-daily-title">
              <span>📜 Lịch Vạn Niên & Vận Khí Hôm Nay</span>
              <span>Cát Tường</span>
            </div>
            <div class="lunar-date-grid">
              <div class="lunar-cell">
                <small>Dương Lịch</small>
                <strong id="hero-solar-date">Hôm nay</strong>
              </div>
              <div class="lunar-cell">
                <small>Âm Lịch & Can Chi</small>
                <strong id="hero-lunar-date">Ngày Hoàng Đạo</strong>
              </div>
            </div>
            <div class="lunar-hours" id="hero-auspicious-hours">
              <strong>Giờ Hoàng Đạo:</strong> Tý, Sửu, Mão, Ngọ, Thân, Dậu.<br />
              <strong>Việc tốt:</strong> Vào phòng tụng kinh, dâng hương, gieo quẻ, phóng sinh.
            </div>
          </div>

          <p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:0.75rem;">
            Kết nối trực tiếp với <strong>Cô Bé Hữu Duyên</strong> qua 3 kênh chính thức:
          </p>

          <div class="master-channels">
            <a href="${config.contact.zaloUrl}" target="_blank" rel="noopener" class="channel-pill">
              <strong style="color:var(--gold-light);">💬 Zalo Thầy</strong>
              <span>${config.contact.phoneDisplay}</span>
            </a>
            <a href="${config.contact.tiktokUrl}" target="_blank" rel="noopener" class="channel-pill">
              <strong style="color:var(--gold-light);">🎵 TikTok</strong>
              <span>${config.contact.tiktokHandle}</span>
            </a>
            <a href="${config.contact.facebookUrl}" target="_blank" rel="noopener" class="channel-pill">
              <strong style="color:var(--gold-light);">📘 Facebook</strong>
              <span>Nhắn tin ngay</span>
            </a>
          </div>
        </aside>
      </div>
    </section>

    <!-- GATEWAY SECTION: ĐIỆN THỜ & PHÒNG TỤNG KINH ONLINE (TRANG RIÊNG /phong-tung-kinh.html) -->
    <section class="section section-alt" id="tung-kinh">
      <div class="container">
        <div class="sanctuary-gateway-banner">
          <div>
            <span class="result-rank-badge">Không Gian Tụng Kinh Riêng Biệt • Có Giọng Đọc Kinh & Tiếng Mõ Thực Tế</span>
            <h2 style="font-size:2rem;color:var(--gold-light);margin:0.45rem 0 0.65rem;">
              🙏 Điện Thờ & Phòng Tụng Kinh Online Cùng Phật Tử
            </h2>
            <p style="font-size:0.95rem;color:var(--text-secondary);margin-bottom:1.1rem;">
              Bước vào không gian Đạo Tràng trực tuyến tách biệt trang nghiêm với <strong>3 Điện Thờ theo chủ đề riêng</strong> (Điện Phật Tam Bảo, Điện Quán Thế Âm Bồ Tát, Điện Tam Toà Thánh Mẫu & Cô Bé), <strong>12 Bồ Đoàn toạ thiền hiển thị Phật tử đang online</strong>, đồng bộ câu kinh theo thời gian thực cùng <strong>Giọng Đọc Kinh & Tiếng Chuông Mõ</strong>.
            </p>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center;">
              <a href="/phong-tung-kinh.html" class="btn btn-gold" style="padding:0.85rem 1.5rem;font-size:0.96rem;">
                🪷 Bước Vào Điện Thờ & Phòng Tụng Kinh Online →
              </a>
              <span style="font-size:0.85rem;color:var(--gold-light);background:var(--bg-secondary);padding:0.55rem 0.95rem;border-radius:99px;border:1px solid var(--border-subtle);">
                📿 Điểm Công Đức hiện có của bạn: <strong id="home-merit-points">30</strong> điểm
              </span>
            </div>
          </div>

          <div style="display:grid;gap:0.7rem;">
            ${sanctuaryData.rooms
              .map(
                (room) => `
              <a href="/phong-tung-kinh.html?room=${room.id}" class="social-card-link" style="text-decoration:none;">
                <div>
                  <span style="font-size:0.72rem;color:var(--jade-green);font-weight:700;">● Đang tụng kinh • ${room.badge}</span>
                  <strong style="color:var(--gold-light);display:block;font-size:1.05rem;">${room.name}</strong>
                  <small style="color:var(--text-secondary);">${room.deityTitle}</small>
                </div>
                <span class="btn btn-outline" style="padding:0.4rem 0.8rem;font-size:0.78rem;white-space:nowrap;">Vào Điện →</span>
              </a>`
              )
              .join("")}
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 1: GÓC XEM BÓI & TRẢI NGHIỆM TÂM LINH TƯƠNG TÁC -->
    <section class="section" id="xem-boi">
      <div class="container">
        <div class="section-header">
          <span class="section-eyebrow">Gieo Quẻ Vấn Đạo • Thành Tâm Tất Ứng</span>
          <h2 class="section-title">Không Gian Xem Bói & Tra Cứu Tâm Linh</h2>
          <p class="section-desc">
            Hãy giữ tâm thanh tịnh, hít thở sâu và chọn phương pháp luận giải bên dưới. Sau khi nhận quẻ, bạn có thể gửi trực tiếp qua Zalo để <strong>Cô Bé Hữu Duyên</strong> luận giải chuyên sâu.
          </p>
        </div>

        <div class="divination-tabs" role="tablist">
          <button type="button" class="tab-btn active" data-tab="xam">🎋 1. Xin Xăm Quán Âm</button>
          <button type="button" class="tab-btn" data-tab="iching">☯️ 2. Gieo Quẻ Kinh Dịch</button>
          <button type="button" class="tab-btn" data-tab="tarot">🔮 3. Bói Bài Tarot 3 Lá</button>
          <button type="button" class="tab-btn" data-tab="element">🧭 4. Tra Cứu Mệnh & Vật Phẩm Hợp Tuổi</button>
        </div>

        <!-- TAB 1: XIN XĂM QUÁN ÂM -->
        <div class="divination-panel active" id="panel-xam">
          <div class="oracle-layout">
            <div class="oracle-stage">
              <div class="xam-cylinder-wrap" id="xam-cylinder">
                <svg width="130" height="165" viewBox="0 0 130 165" fill="none">
                  <rect x="38" y="8" width="6" height="65" rx="3" fill="#FBE59B" transform="rotate(-10 38 8)"/>
                  <rect x="52" y="4" width="6" height="68" rx="3" fill="#D4AF37"/>
                  <rect x="65" y="2" width="6" height="70" rx="3" fill="#B82525"/>
                  <rect x="78" y="5" width="6" height="68" rx="3" fill="#FBE59B" transform="rotate(8 78 5)"/>
                  <rect x="88" y="10" width="6" height="65" rx="3" fill="#D4AF37" transform="rotate(14 88 10)"/>
                  <path d="M26 55H104L96 152C96 157 82 160 65 160C48 160 34 157 34 152L26 55Z" fill="#6B1111" stroke="#D4AF37" stroke-width="3"/>
                  <ellipse cx="65" cy="55" rx="39" ry="9" fill="#3B0909" stroke="#D4AF37" stroke-width="2.5"/>
                  <circle cx="65" cy="108" r="22" fill="#D4AF37" opacity="0.2" stroke="#FBE59B" stroke-width="1.5"/>
                  <text x="65" y="114" text-anchor="middle" fill="#FBE59B" font-family="serif" font-size="16" font-weight="bold">LINH XĂM</text>
                </svg>
              </div>
              <h3 style="font-size:1.3rem;color:var(--gold-light);margin-bottom:0.6rem;">Thành Tâm Khấn Nguyện Xin Xăm</h3>
              <div class="oracle-form-row">
                <div class="form-group">
                  <label for="xam-user-name">Họ tên tín chủ (tuỳ chọn)</label>
                  <input type="text" id="xam-user-name" class="form-control" placeholder="VD: Nguyễn Văn An" />
                </div>
                <div class="form-group">
                  <label for="xam-topic">Việc đang mong cầu</label>
                  <select id="xam-topic" class="form-control">
                    <option value="Công danh, Sự nghiệp & Tài lộc">Công danh, Sự nghiệp & Tài lộc</option>
                    <option value="Tình duyên, Hôn nhân & Gia đạo">Tình duyên, Hôn nhân & Gia đạo</option>
                    <option value="Sức khoẻ, Bình an & Giải hạn">Sức khoẻ, Bình an & Giải hạn</option>
                    <option value="Buôn bán, Kinh doanh & Khai trương">Buôn bán, Kinh doanh & Khai trương</option>
                  </select>
                </div>
              </div>
              <button type="button" class="btn btn-gold" id="btn-shake-xam" style="width:100%;">
                🙏 Thành Tâm Lắc Ống Xăm
              </button>
            </div>

            <div class="oracle-result-card" id="xam-result-box">
              <div style="text-align:center;color:var(--text-secondary);">
                <div style="font-size:2.4rem;margin-bottom:0.5rem;">🪷</div>
                <h3 style="font-size:1.35rem;color:var(--gold-light);margin-bottom:0.5rem;">Lời Khuyên Trước Khi Xin Xăm</h3>
                <p style="font-size:0.92rem;max-width:460px;margin:0 auto 1rem;">
                  “Tâm thành tắc linh”. Hãy tập trung suy nghĩ về một vấn đề duy nhất mà bạn đang trăn trở, sau đó nhấn nút <strong>Lắc Ống Xăm</strong> để nhận thẻ xăm ứng nghiệm.
                </p>
                <small style="color:var(--text-muted);">Mỗi sự việc chỉ nên xin xăm 1 lần trong ngày để quẻ giữ độ linh ứng cao nhất.</small>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: GIEO QUẺ KINH DỊCH -->
        <div class="divination-panel" id="panel-iching">
          <div class="oracle-layout">
            <div class="oracle-stage">
              <h3 style="font-size:1.3rem;color:var(--gold-light);margin-bottom:0.4rem;">Gieo 3 Đồng Xu Cổ Kinh Dịch</h3>
              <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:1rem;">
                Phương pháp Chu Dịch Lục Hào cổ truyền giúp soi sáng cát hung, thời vận và hướng đi đúng đắn.
              </p>
              <div class="coins-row">
                <div class="ancient-coin" title="Đồng xu Càn Long Thông Bảo"></div>
                <div class="ancient-coin" title="Đồng xu Càn Long Thông Bảo"></div>
                <div class="ancient-coin" title="Đồng xu Càn Long Thông Bảo"></div>
              </div>
              <div class="form-group">
                <label for="iching-question">Nhập câu hỏi hoặc dự định bạn muốn hỏi quẻ:</label>
                <input type="text" id="iching-question" class="form-control" placeholder="VD: Tháng này mở cửa hàng / đầu tư có thuận lợi không?" />
              </div>
              <button type="button" class="btn btn-gold" id="btn-cast-iching" style="width:100%;">
                ☯️ Gieo Quẻ Âm Dương Ngay
              </button>
            </div>

            <div class="oracle-result-card" id="iching-result-box">
              <div style="text-align:center;color:var(--text-secondary);">
                <div style="font-size:2.4rem;margin-bottom:0.5rem;">☯️</div>
                <h3 style="font-size:1.35rem;color:var(--gold-light);margin-bottom:0.5rem;">Sẵn Sàng Luận Quẻ Kinh Dịch</h3>
                <p style="font-size:0.92rem;">
                  Nhấn nút <strong>Gieo Quẻ Âm Dương</strong> để nhận 1 trong các quẻ Kinh Dịch kèm Thoán Từ và lời bàn ứng dụng thực tế từ Cô Bé Hữu Duyên.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 3: BÓI BÀI TAROT 3 LÁ -->
        <div class="divination-panel" id="panel-tarot">
          <div class="oracle-layout">
            <div class="oracle-stage">
              <h3 style="font-size:1.3rem;color:var(--gold-light);margin-bottom:0.4rem;">Trải Bài Tarot Tâm Linh (3 Lá)</h3>
              <p style="font-size:0.86rem;color:var(--text-secondary);">
                Chạm vào lá bài bất kỳ hoặc bấm nút bên dưới để lật mở thông điệp <strong>Quá Khứ – Hiện Tại – Tương Lai</strong>.
              </p>
              <div class="tarot-spread">
                <div class="tarot-card-slot">
                  <span class="tarot-slot-label">Lá số I</span>
                  <div style="font-size:1.9rem;margin:0.45rem 0;">🌙</div>
                  <small style="color:var(--text-muted);">Chạm để lật</small>
                </div>
                <div class="tarot-card-slot">
                  <span class="tarot-slot-label">Lá số II</span>
                  <div style="font-size:1.9rem;margin:0.45rem 0;">☀️</div>
                  <small style="color:var(--text-muted);">Chạm để lật</small>
                </div>
                <div class="tarot-card-slot">
                  <span class="tarot-slot-label">Lá số III</span>
                  <div style="font-size:1.9rem;margin:0.45rem 0;">⭐</div>
                  <small style="color:var(--text-muted);">Chạm để lật</small>
                </div>
              </div>
              <button type="button" class="btn btn-gold" id="btn-draw-tarot" style="width:100%;">
                🔮 Xào Bài & Lật Mở 3 Lá Tarot
              </button>
            </div>

            <div class="oracle-result-card" id="tarot-result-box">
              <div style="text-align:center;color:var(--text-secondary);">
                <div style="font-size:2.4rem;margin-bottom:0.5rem;">🔮</div>
                <h3 style="font-size:1.35rem;color:var(--gold-light);margin-bottom:0.5rem;">Kết Nối Năng Lượng Trực Giác</h3>
                <p style="font-size:0.92rem;">
                  Trải bài 3 lá giúp bạn nhìn thấu nguyên nhân gốc rễ từ quá khứ, năng lượng hiện tại và lời khuyên hành động cho tương lai gần.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 4: TRA CỨU NGŨ HÀNH & VẬT PHẨM HỢP TUỔI -->
        <div class="divination-panel" id="panel-element">
          <div class="oracle-layout">
            <div class="oracle-stage">
              <h3 style="font-size:1.3rem;color:var(--gold-light);margin-bottom:0.5rem;">Tra Cứu Bản Mệnh Theo Năm Sinh</h3>
              <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:1.1rem;">
                Nhập năm sinh Âm/Dương lịch để biết chính xác tuổi Can Chi, Mệnh Ngũ Hành, Màu sắc hợp mệnh và gợi ý Vật Phẩm Phong Thuỷ hộ thân.
              </p>
              <div class="oracle-form-row">
                <div class="form-group">
                  <label for="birth-year-input">Năm sinh (VD: 1995)</label>
                  <input type="number" id="birth-year-input" class="form-control" value="1995" min="1930" max="2030" />
                </div>
                <div class="form-group">
                  <label for="birth-gender-input">Giới tính</label>
                  <select id="birth-gender-input" class="form-control">
                    <option value="Nữ">Nữ mạng</option>
                    <option value="Nam">Nam mạng</option>
                  </select>
                </div>
              </div>
              <button type="button" class="btn btn-gold" id="btn-calc-element" style="width:100%;">
                🧭 Xem Bản Mệnh & Gợi Ý Vật Phẩm Hợp Tuổi
              </button>
            </div>

            <div class="oracle-result-box oracle-result-card" id="element-result-box">
              <div style="text-align:center;color:var(--text-secondary);">
                <div style="font-size:2.4rem;margin-bottom:0.5rem;">🧭</div>
                <h3 style="font-size:1.35rem;color:var(--gold-light);margin-bottom:0.5rem;">Chọn Đúng Vật Phẩm Hợp Bản Mệnh</h3>
                <p style="font-size:0.92rem;">
                  Trong Phong Thuỷ Chính Tông, sử dụng vật phẩm tương sinh hoặc tương hợp với Ngũ Hành bản mệnh sẽ giúp kích hoạt tối đa vượng khí và bình an.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 2: CỬA HÀNG VẬT PHẨM (HÀNG MÃ, PHONG THUỶ, TÂM LINH, LƯU NIỆM) -->
    <section class="section section-alt" id="vat-pham">
      <div class="container">
        <div class="section-header">
          <span class="section-eyebrow">Cửa Hàng Tâm Linh Chính Hãng • Trì Chú Theo Tuổi</span>
          <h2 class="section-title">Vật Phẩm Hàng Mã, Phong Thuỷ & Lưu Niệm Bình An</h2>
          <p class="section-desc">
            Tất cả bộ lễ <strong>Hàng Mã</strong> đều được tuyển chọn thủ công trang nghiêm, đầy đủ văn khấn; các <strong>Vật Phẩm Phong Thuỷ & Lưu Niệm</strong> đều được Cô Bé Hữu Duyên tẩy uế, trì chú bình an trước khi gửi tới tay tín chủ.
          </p>
        </div>

        <div class="shop-controls">
          <div class="category-pills" role="tablist" aria-label="Danh mục vật phẩm">
            ${productsData.categories
              .map(
                (cat, idx) => `
              <button type="button" class="cat-pill ${idx === 0 ? "active" : ""}" data-cat="${cat.id}">
                ${cat.name}
              </button>`
              )
              .join("")}
          </div>

          <div class="shop-filter-right">
            <select id="shop-element-filter" class="form-control" style="width:auto;min-width:170px;" aria-label="Lọc theo mệnh ngũ hành">
              <option value="all">☯️ Tất cả bản mệnh</option>
              <option value="Kim">Hợp mệnh Kim</option>
              <option value="Mộc">Hợp mệnh Mộc</option>
              <option value="Thuỷ">Hợp mệnh Thuỷ</option>
              <option value="Hoả">Hợp mệnh Hoả</option>
              <option value="Thổ">Hợp mệnh Thổ</option>
            </select>

            <input
              type="search"
              id="shop-search-input"
              class="form-control"
              style="width:auto;min-width:210px;"
              placeholder="🔍 Tìm hàng mã, chu sa, trầm..."
              aria-label="Tìm kiếm vật phẩm"
            />
          </div>
        </div>

        <div class="products-grid" id="products-grid">
          ${productsData.products
            .map(
              (p) => `
            <article class="product-card" data-product-id="${p.id}">
              <div class="product-visual">
                <span class="product-badge">${p.badge}</span>
                ${getArtworkSvg(p.artworkType)}
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
                  <button type="button" class="btn btn-gold" style="padding:0.62rem 0.95rem;font-size:0.86rem;" data-add-cart="${p.id}">
                    🛒 Thỉnh Vật Phẩm
                  </button>
                  <button type="button" class="btn btn-outline" style="padding:0.62rem 0.85rem;font-size:0.84rem;" data-detail-product="${p.id}">
                    Chi tiết
                  </button>
                </div>
              </div>
            </article>`
            )
            .join("")}
        </div>

        <!-- WHOLESALE INQUIRY BANNER ("LIÊN HỆ ĐẶT HÀNG SỈ") -->
        <div class="wholesale-banner-card" id="dat-si">
          <div>
            <span class="result-rank-badge">Chiết Khấu Tốt Nhất • Nguồn Hàng Tận Xưởng</span>
            <h3 style="font-size:1.6rem;color:var(--gold-light);margin:0.4rem 0 0.6rem;">
              📦 Liên Hệ Đặt Hàng Sỉ (Đồ Hàng Mã, Vật Phẩm Phong Thuỷ & Trầm Hương)
            </h3>
            <p style="font-size:0.92rem;color:var(--text-secondary);margin-bottom:1rem;">
              <strong>Cô Bé Hữu Duyên</strong> chuyên cung cấp sỉ số lượng lớn các bộ lễ Hàng Mã truyền thống, Vòng Chu Sa, Tỳ Hưu, Nhang Trầm Hương sạch và Vật Phẩm Lưu Niệm Bình An cho các cửa hàng, đại lý, đền phủ và đạo tràng trên toàn quốc.
            </p>
            <ul class="service-check-list" style="margin:0.85rem 0;">
              <li>
                <span>✔</span>
                <div>
                  <strong style="color:var(--gold-light);">Giá sỉ tận gốc – Hỗ trợ đóng gói & vận chuyển toàn quốc</strong>
                  <div style="font-size:0.83rem;color:var(--text-secondary);">Nhận gia công bộ lễ cúng theo yêu cầu riêng của từng vùng miền và bản mệnh.</div>
                </div>
              </li>
              <li>
                <span>✔</span>
                <div>
                  <strong style="color:var(--gold-light);">Hỗ trợ tư vấn danh mục bán chạy & bài trí cửa hàng</strong>
                  <div style="font-size:0.83rem;color:var(--text-secondary);">Liên hệ trực tiếp Zalo Thầy: <strong>${config.contact.phoneDisplay}</strong> để nhận bảng giá sỉ mới nhất.</div>
                </div>
              </li>
            </ul>
          </div>

          <div style="background:var(--bg-card);padding:1.4rem;border-radius:18px;border:1px solid var(--border-subtle);">
            <h4 style="font-size:1.2rem;color:var(--gold-light);margin-bottom:0.65rem;">📝 Đăng Ký Nhận Bảng Giá Sỉ Qua Zalo</h4>
            <form id="wholesale-inquiry-form">
              <div class="oracle-form-row">
                <div class="form-group">
                  <label for="wholesale-name">Tên Đại Lý / Cửa Hàng / Tín Chủ *</label>
                  <input type="text" id="wholesale-name" class="form-control" placeholder="VD: Cửa hàng Tâm Phúc (TP.HCM)" required />
                </div>
                <div class="form-group">
                  <label for="wholesale-phone">Số điện thoại / Zalo nhận báo giá *</label>
                  <input type="tel" id="wholesale-phone" class="form-control" placeholder="VD: 090xxxxxxx" required />
                </div>
              </div>

              <div class="oracle-form-row">
                <div class="form-group">
                  <label for="wholesale-category">Nhóm mặt hàng muốn nhập sỉ</label>
                  <select id="wholesale-category" class="form-control">
                    <option value="Đồ Lễ Hàng Mã Cao Cấp">Đồ Lễ Hàng Mã Cao Cấp</option>
                    <option value="Vòng Phong Thuỷ, Chu Sa, Tỳ Hưu">Vòng Phong Thuỷ, Chu Sa, Tỳ Hưu</option>
                    <option value="Nhang Trầm Hương, Nụ Trầm, Nước Ngũ Vị">Nhang Trầm Hương, Nụ Trầm, Nước Ngũ Vị</option>
                    <option value="Quà Lưu Niệm Bình An, Túi Lộc, Dây Treo">Quà Lưu Niệm Bình An, Túi Lộc, Dây Treo</option>
                    <option value="Nhập sỉ tổng hợp tất cả mặt hàng">Nhập sỉ tổng hợp tất cả mặt hàng</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="wholesale-qty">Số lượng / Ngân sách dự kiến</label>
                  <input type="text" id="wholesale-qty" class="form-control" placeholder="VD: 50 - 200 bộ / tháng" />
                </div>
              </div>

              <div class="form-group">
                <label for="wholesale-note">Ghi chú thêm (Khu vực giao hàng, yêu cầu riêng)</label>
                <input type="text" id="wholesale-note" class="form-control" placeholder="VD: Giao về Hà Nội, cần báo giá sỉ đại lý cấp 1..." />
              </div>

              <div class="turnstile-guard-wrap">
                <span class="turnstile-guard-label">🛡️ Xác thực chống Spam báo giá sỉ (Cloudflare Turnstile)</span>
                <div class="cf-turnstile" data-sitekey="0x4AAAAAAFxsWkkTeXBYGsul" data-theme="dark" data-size="flexible"></div>
              </div>

              <button type="submit" class="btn btn-gold" style="width:100%;">
                📦 Gửi Yêu Cầu Báo Giá Sỉ (Lưu Admin & Mở Zalo ${config.contact.phoneDisplay})
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 3: ĐẶT LỊCH XEM BÓI TRỰC TIẾP 1-1 VỚI CÔ BÉ HỮU DUYÊN -->
    <section class="section" id="dat-lich">
      <div class="container">
        <div class="section-header">
          <span class="section-eyebrow">Hữu Duyên Thiên Lý Năng Tương Ngộ</span>
          <h2 class="section-title">Đặt Lịch Xem Trực Tiếp 1-1 Cùng Cô Bé Hữu Duyên</h2>
          <p class="section-desc">
            Ngoài các công cụ gieo quẻ nhanh trên web, bạn có thể đặt lịch xem thực tế 1-1 qua <strong>Zalo (${config.contact.phoneDisplay})</strong>, <strong>Facebook</strong> hoặc theo dõi phiên Live trên <strong>TikTok (${config.contact.tiktokHandle})</strong>.
          </p>
        </div>

        <div class="booking-grid">
          <div class="master-profile-card">
            <span class="result-rank-badge">Chuyên Gia Tâm Linh & Phong Thuỷ Thực Chiến</span>
            <h3 style="font-size:1.55rem;color:var(--gold-light);margin-bottom:0.5rem;">
              Các Lĩnh Vực Cô Bé Hữu Duyên Trực Tiếp Luận Giải
            </h3>
            <p style="color:var(--text-secondary);font-size:0.92rem;">
              Tư vấn tận tâm, đi thẳng vào trọng tâm vấn đề, hướng dẫn cách hoá giải đúng chánh pháp, không mê tín dị đoan hay vẽ vời tốn kém.
            </p>

            <ul class="service-check-list">
              <li>
                <span style="font-size:1.3rem;">🔮</span>
                <div>
                  <strong style="color:var(--gold-light);display:block;">Xem Tử Vi, Tướng Số, Chỉ Tay & Vận Hạn Năm</strong>
                  <span>Luận giải chi tiết công danh, tài lộc, tình duyên, gia đạo và hạn tam tai – thái tuế – sao chiếu mệnh.</span>
                </div>
              </li>
              <li>
                <span style="font-size:1.3rem;">🏮</span>
                <div>
                  <strong style="color:var(--gold-light);display:block;">Tư Vấn Sắm Lễ Hàng Mã & Nghi Thức Cúng Kiếng</strong>
                  <span>Hướng dẫn chuẩn bị mâm cúng Gia tiên, Thần Tài, Khai trương, Nhập trạch, Cúng sao giải hạn đúng cổ truyền.</span>
                </div>
              </li>
              <li>
                <span style="font-size:1.3rem;">🧭</span>
                <div>
                  <strong style="color:var(--gold-light);display:block;">Phong Thuỷ Nhà Ở, Cửa Hàng & Bàn Thờ</strong>
                  <span>Xem hướng bàn thờ, vị trí đặt két sắt, ban Thần Tài – Thổ Địa giúp tụ khí sinh tài.</span>
                </div>
              </li>
            </ul>

            <div class="social-connect-cards">
              <a href="${config.contact.zaloUrl}" target="_blank" rel="noopener" class="social-card-link">
                <div>
                  <strong style="color:var(--gold-light);display:block;">💬 Zalo Xem Riêng 1-1: ${config.contact.phoneDisplay}</strong>
                  <small style="color:var(--text-secondary);">Phản hồi nhanh nhất • Gửi ảnh chỉ tay / ngày sinh trực tiếp</small>
                </div>
                <span class="btn btn-gold" style="padding:0.42rem 0.9rem;font-size:0.8rem;">Mở Zalo</span>
              </a>

              <a href="${config.contact.tiktokUrl}" target="_blank" rel="noopener" class="social-card-link">
                <div>
                  <strong style="color:var(--gold-light);display:block;">🎵 Kênh TikTok: ${config.contact.tiktokHandle}</strong>
                  <small style="color:var(--text-secondary);">Follow để xem video chia sẻ tâm linh & các buổi Livestream hữu duyên</small>
                </div>
                <span class="btn btn-outline" style="padding:0.42rem 0.9rem;font-size:0.8rem;">Xem TikTok</span>
              </a>

              <a href="${config.contact.facebookUrl}" target="_blank" rel="noopener" class="social-card-link">
                <div>
                  <strong style="color:var(--gold-light);display:block;">📘 Facebook Cá Nhân Chính Chủ</strong>
                  <small style="color:var(--text-secondary);">Cập nhật hoạt động thiện nguyện, phản hồi khách hàng & nhắn tin Messenger</small>
                </div>
                <span class="btn btn-outline" style="padding:0.42rem 0.9rem;font-size:0.8rem;">Mở Facebook</span>
              </a>
            </div>
          </div>

          <!-- Booking Form -->
          <div class="master-profile-card">
            <h3 style="font-size:1.45rem;color:var(--gold-light);margin-bottom:0.4rem;">Phiếu Đăng Ký Đặt Lịch Hữu Duyên</h3>
            <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:1.15rem;">
              Khi gửi phiếu hẹn, hệ thống vừa mở Zalo/Facebook vừa tự động lưu dữ liệu lên hệ thống D1 & báo về nhóm Telegram của Cô Bé Hữu Duyên.
            </p>

            <form id="master-booking-form">
              <div class="oracle-form-row">
                <div class="form-group">
                  <label for="book-name">Họ và tên tín chủ *</label>
                  <input type="text" id="book-name" class="form-control" placeholder="Nhập họ và tên..." required />
                </div>
                <div class="form-group">
                  <label for="book-phone">Số điện thoại / Zalo *</label>
                  <input type="tel" id="book-phone" class="form-control" placeholder="VD: 090xxxxxxx" required />
                </div>
              </div>

              <div class="form-group">
                <label for="book-dob">Ngày tháng năm sinh (Âm/Dương) & Giờ sinh (nếu nhớ) *</label>
                <input type="text" id="book-dob" class="form-control" placeholder="VD: 15/08/1995 Dương lịch - Sinh khoảng 9h sáng" required />
              </div>

              <div class="oracle-form-row">
                <div class="form-group">
                  <label for="book-service">Nội dung muốn xem *</label>
                  <select id="book-service" class="form-control">
                    <option value="Xem tổng quan Tử Vi, Vận Hạn & Tài Lộc">Xem tổng quan Tử Vi, Vận Hạn & Tài Lộc</option>
                    <option value="Xem Tình Duyên, Gia Đạo & Hôn Nhân">Xem Tình Duyên, Gia Đạo & Hôn Nhân</option>
                    <option value="Xem Chỉ Tay / Tướng Số qua Zalo">Xem Chỉ Tay / Tướng Số qua Zalo</option>
                    <option value="Tư vấn Bộ Lễ Hàng Mã & Cúng Sao Giải Hạn">Tư vấn Bộ Lễ Hàng Mã & Cúng Sao Giải Hạn</option>
                    <option value="Tư vấn Phong Thuỷ Bàn Thờ / Kinh Doanh">Tư vấn Phong Thuỷ Bàn Thờ / Kinh Doanh</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="book-channel">Kênh liên hệ thuận tiện nhất</label>
                  <select id="book-channel" class="form-control">
                    <option value="Qua Zalo (0702311558)">Qua Zalo (0702.311.558)</option>
                    <option value="Qua Facebook Messenger">Qua Facebook Messenger</option>
                    <option value="Qua Điện thoại trực tiếp">Qua Điện thoại trực tiếp</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="book-note">Câu hỏi hoặc mong muốn cụ thể (tuỳ chọn)</label>
                <textarea id="book-note" rows="3" class="form-control" placeholder="Chia sẻ ngắn gọn điều bạn đang băn khoăn để Cô nắm trước thông tin..."></textarea>
              </div>

              <div class="turnstile-guard-wrap">
                <span class="turnstile-guard-label">🛡️ Bảo vệ chống Spam đặt lịch ảo (Cloudflare Turnstile)</span>
                <div class="cf-turnstile" data-sitekey="0x4AAAAAAFxsWkkTeXBYGsul" data-theme="dark" data-size="flexible"></div>
              </div>

              <button type="submit" class="btn btn-gold" style="width:100%;margin-top:0.35rem;">
                📿 Tạo Phiếu Hẹn & Kết Nối Với Cô Bé Hữu Duyên
              </button>
            </form>

            <div id="booking-confirmation-preview" style="display:none;margin-top:1.1rem;padding:1rem;border-radius:12px;background:var(--bg-secondary);border:1px solid var(--gold-primary);"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 4: QUỸ TỪ THIỆN & CÔNG ĐỨC ("GIEO DUYÊN LÀNH") -->
    <section class="section section-alt" id="tu-thien">
      <div class="container">
        <div class="section-header">
          <span class="section-eyebrow">Tích Thiện Chi Gia Tất Hữu Dư Khánh</span>
          <h2 class="section-title">Quỹ Từ Thiện & Công Đức “Gieo Duyên Lành”</h2>
          <p class="section-desc">
            ${charityData.summary.commitment}
          </p>
        </div>

        <div class="charity-banner">
          <div style="max-width:680px;">
            <span class="result-rank-badge">Minh Bạch 100% • Công Khai Sao Kê & Hình Ảnh</span>
            <h3 style="font-size:1.45rem;color:var(--gold-light);margin-bottom:0.35rem;">
              Cùng Cô Bé Hữu Duyên Lan Toả Tình Thương & Tích Tạo Phước Báo
            </h3>
            <p style="font-size:0.9rem;color:var(--text-secondary);">
              Mỗi sự phát tâm dù nhỏ đều mang năng lượng từ bi to lớn, hồi hướng công đức bình an, sức khoẻ và may mắn đến bản thân cùng gia quyến.
            </p>
          </div>
          <div style="display:flex;gap:1.2rem;align-items:center;flex-wrap:wrap;">
            <div style="text-align:right;">
              <small style="color:var(--text-muted);display:block;">Tổng quỹ đã gieo duyên:</small>
              <strong id="charity-total-raised-val" style="font-size:1.6rem;color:var(--gold-light);font-family:'Noto Serif',serif;">${formatVND(charityData.summary.totalRaised)}</strong>
            </div>
            <button type="button" class="btn btn-gold" data-open-charity="all">
              💛 Phát Tâm Gieo Duyên Ngay
            </button>
          </div>
        </div>

        <div class="charity-campaigns-grid">
          ${charityData.campaigns
            .map((camp) => {
              const pct = Math.min(100, Math.round((camp.raised / camp.goal) * 100));
              return `
              <article class="campaign-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                  <span class="product-cat-label">${camp.category}</span>
                  <span style="font-size:0.74rem;color:var(--jade-green);font-weight:700;">● ${camp.status}</span>
                </div>
                <h3 style="font-size:1.25rem;color:var(--gold-light);margin-bottom:0.5rem;">${camp.title}</h3>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.85rem;flex:1;">${camp.description}</p>
                <ul style="padding-left:1.1rem;font-size:0.82rem;color:var(--text-secondary);margin-bottom:0.95rem;display:grid;gap:0.3rem;">
                  ${camp.highlights.map((h) => `<li>${h}</li>`).join("")}
                </ul>
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:0.83rem;font-weight:600;">
                    <span>Đã tiếp nhận: <strong style="color:var(--gold-light);">${formatVND(camp.raised)}</strong></span>
                    <span>${pct}%</span>
                  </div>
                  <div class="progress-bar-track">
                    <div class="progress-bar-fill" style="width:${pct}%;"></div>
                  </div>
                  <div class="campaign-stats-row">
                    <span>Mục tiêu đợt này: ${formatVND(camp.goal)}</span>
                    <span>🙏 ${camp.donorsCount} lượt phát tâm</span>
                  </div>
                  <button type="button" class="btn btn-crimson" style="width:100%;" data-open-charity="${camp.id}">
                    🪷 Gieo Duyên Công Đức Chiến Dịch Này
                  </button>
                </div>
              </article>`;
            })
            .join("")}
        </div>

        <!-- Bảng Vàng Công Đức -->
        <div class="donors-ledger">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
            <div>
              <h3 style="font-size:1.35rem;color:var(--gold-light);">📜 Sổ Vàng Ghi Danh Công Đức Gần Đây</h3>
              <p style="font-size:0.85rem;color:var(--text-secondary);">
                Thành tâm tri ân công đức của các tín chủ và mạnh thường quân gần xa.
              </p>
            </div>
            <button type="button" class="btn btn-outline" id="btn-copy-bank-no" style="padding:0.5rem 0.95rem;font-size:0.82rem;">
              📋 Sao chép STK Vietcombank: ${config.bank.accountNo}
            </button>
          </div>

          <div style="overflow-x:auto;">
            <table class="ledger-table">
              <thead>
                <tr>
                  <th>Tín chủ / Mạnh thường quân</th>
                  <th>Số tiền phát tâm</th>
                  <th>Hạng mục thiện nguyện</th>
                  <th>Lời cầu nguyện / Hồi hướng</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody id="charity-ledger-tbody">
                ${charityData.recentDonors
                  .map(
                    (d) => `
                  <tr>
                    <td><strong>${d.name}</strong></td>
                    <td style="color:var(--gold-light);font-weight:700;">${formatVND(d.amount)}</td>
                    <td>${d.campaign}</td>
                    <td style="color:var(--text-secondary);font-style:italic;">“${d.wish}”</td>
                    <td style="color:var(--text-muted);">${d.date}</td>
                  </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- FOOTER -->
  <footer class="site-footer" id="lien-he">
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="brand-logo" style="margin-bottom:0.85rem;">
            <img src="/favicon.svg" alt="Logo ${config.brandName}" class="brand-emblem" width="42" height="42" />
            <div class="brand-text">
              <span class="brand-name">${config.brandName}</span>
              <span class="brand-sub">Tâm Linh • Phong Thuỷ • Thiện Nguyện</span>
            </div>
          </div>
          <p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:0.9rem;">
            ${config.description}
          </p>
          <p style="font-size:0.82rem;color:var(--text-muted);">
            🌐 Website chính thức: <a href="${config.domain}" style="color:var(--gold-light);">${config.domain}</a><br />
            ⏰ Giờ làm việc: ${config.contact.workingHours}
          </p>
        </div>

        <div>
          <h3 style="font-size:1.18rem;color:var(--gold-light);margin-bottom:0.8rem;">Kết Nối Trực Tiếp</h3>
          <ul style="list-style:none;display:grid;gap:0.55rem;font-size:0.88rem;">
            <li>💬 <strong>Zalo / SĐT:</strong> <a href="${config.contact.zaloUrl}" target="_blank" rel="noopener" style="color:var(--gold-light);">${config.contact.phoneDisplay}</a></li>
            <li>🎵 <strong>TikTok:</strong> <a href="${config.contact.tiktokUrl}" target="_blank" rel="noopener" style="color:var(--gold-light);">${config.contact.tiktokHandle}</a></li>
            <li>📘 <strong>Facebook:</strong> <a href="${config.contact.facebookUrl}" target="_blank" rel="noopener" style="color:var(--gold-light);">${config.contact.facebookDisplay}</a></li>
            <li><a href="/phong-tung-kinh.html" style="color:var(--gold-light);font-weight:600;">🙏 Phòng Tụng Kinh & Dâng Lễ Online (Trang Riêng)</a></li>
            <li><a href="#xem-boi">☯️ Xin Xăm & Gieo Quẻ Kinh Dịch</a></li>
            <li><a href="#vat-pham">🪷 Cửa Hàng Hàng Mã, Phong Thuỷ & Đặt Sỉ</a></li>
            <li><a href="/admin.html" style="color:var(--text-muted);font-size:0.8rem;">🔐 Quản Trị Admin D1</a></li>
          </ul>
        </div>

        <div>
          <h3 style="font-size:1.18rem;color:var(--gold-light);margin-bottom:0.8rem;">Tài Khoản Thanh Toán & Công Đức</h3>
          <div style="background:var(--bg-card);padding:0.95rem;border-radius:14px;border:1px solid var(--border-subtle);font-size:0.86rem;">
            <p style="margin-bottom:0.3rem;">🏦 <strong>Ngân hàng:</strong> ${config.bank.shortName} (VCB)</p>
            <p style="margin-bottom:0.3rem;">🔢 <strong>Số tài khoản:</strong> <span style="color:var(--gold-light);font-weight:700;font-size:1rem;">${config.bank.accountNo}</span></p>
            <p style="margin-bottom:0.55rem;">👤 <strong>Chủ tài khoản:</strong> <strong>${config.bank.accountNameDisplay}</strong></p>
            <small style="color:var(--text-muted);display:block;">
              Hỗ trợ quét mã <strong>VietQR</strong> tự động điền số tiền & đồng bộ thông báo về Telegram / D1 Database.
            </small>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} <strong>${config.fullTitle}</strong> (${config.domain}). Bảo lưu mọi quyền.</span>
        <span>Thiết kế chuẩn SEO • Kết nối Telegram Bot & Cloudflare D1</span>
      </div>
    </div>
  </footer>

  <!-- PRODUCT DETAIL MODAL -->
  <div class="modal-backdrop" id="product-detail-modal" role="dialog" aria-modal="true" aria-label="Chi tiết vật phẩm">
    <div class="modal-dialog" id="product-modal-content"></div>
  </div>

  <!-- CHARITY VIETQR DONATION MODAL -->
  <div class="modal-backdrop" id="charity-donate-modal" role="dialog" aria-modal="true" aria-label="Gieo duyên công đức từ thiện">
    <div class="modal-dialog">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.9rem;">
        <div>
          <span class="result-rank-badge">Quỹ Thiện Nguyện Minh Bạch</span>
          <h3 id="charity-modal-campaign-title" style="font-size:1.35rem;color:var(--gold-light);">
            Quỹ Từ Thiện & Phóng Sinh Cô Bé Hữu Duyên
          </h3>
        </div>
        <button type="button" class="icon-btn" id="close-charity-modal">✕ Đóng</button>
      </div>

      <div class="oracle-form-row">
        <div class="form-group">
          <label for="charity-donor-name">Tên tín chủ / Pháp danh phát tâm</label>
          <input type="text" id="charity-donor-name" class="form-control" placeholder="VD: Phật tử Minh Tâm" />
        </div>
        <div class="form-group">
          <label for="charity-custom-amount">Số tiền phát tâm (VNĐ)</label>
          <input type="number" id="charity-custom-amount" class="form-control" value="200000" step="10000" min="10000" />
        </div>
      </div>

      <div class="form-group">
        <label for="charity-donor-wish">Lời cầu nguyện / Hồi hướng công đức (hiển thị lên Sổ Vàng)</label>
        <input type="text" id="charity-donor-wish" class="form-control" placeholder="VD: Cầu gia đạo bình an, mẹ sớm khoẻ mạnh..." />
      </div>

      <div style="display:flex;gap:0.45rem;flex-wrap:wrap;margin-bottom:0.85rem;">
        <button type="button" class="cat-pill" data-donate-amount="50000">50.000đ</button>
        <button type="button" class="cat-pill" data-donate-amount="100000">100.000đ</button>
        <button type="button" class="cat-pill" data-donate-amount="200000">200.000đ</button>
        <button type="button" class="cat-pill" data-donate-amount="350000">350.000đ (1 phần quà gạo)</button>
        <button type="button" class="cat-pill" data-donate-amount="500000">500.000đ</button>
      </div>

      <div class="vietqr-box">
        <span class="vietqr-box-title">QUÉT MÃ VIETQR<br />GIEO DUYÊN CÔNG ĐỨC</span>
        <img
          id="charity-vietqr-img"
          src="https://img.vietqr.io/image/VCB-0051000567270-compact.png?amount=200000&addInfo=GIEODUYEN&accountName=NGUYEN%20THI%20THU%20HONG"
          alt="Mã VietQR Vietcombank 0051000567270 Nguyễn Thị Thu Hồng"
          loading="lazy"
        />
        <div class="vietqr-bank-details">
          <div class="vietqr-detail-row">
            <span class="vietqr-detail-label">Ngân hàng:</span>
            <span class="vietqr-detail-val">Vietcombank (VCB)</span>
          </div>
          <div class="vietqr-detail-row">
            <span class="vietqr-detail-label">Số tài khoản:</span>
            <span class="vietqr-account-group">
              <strong class="vietqr-account-highlight">0051000567270</strong>
              <button type="button" class="vietqr-copy-tag" onclick="navigator.clipboard.writeText('0051000567270');alert('Đã sao chép STK: 0051000567270')">Sao chép</button>
            </span>
          </div>
          <div class="vietqr-detail-row">
            <span class="vietqr-detail-label">Chủ tài khoản:</span>
            <span class="vietqr-detail-val" style="color:#8b1e1e;font-size:0.95rem;">NGUYỄN THỊ THU HỒNG</span>
          </div>
          <div class="vietqr-detail-row">
            <span class="vietqr-detail-label">Nội dung CK:</span>
            <strong id="charity-transfer-syntax" style="color:#b82525;font-size:0.92rem;text-align:right;">GIEODUYEN PHAT TU</strong>
          </div>
        </div>
      </div>

      <div class="turnstile-guard-wrap">
        <span class="turnstile-guard-label">🛡️ Xác thực chống Spam báo công đức (Cloudflare Turnstile)</span>
        <div class="cf-turnstile" data-sitekey="0x4AAAAAAFxsWkkTeXBYGsul" data-theme="dark" data-size="flexible"></div>
      </div>

      <button type="button" class="btn btn-gold" id="btn-confirm-charity-zalo" style="width:100%;">
        💛 Xác Nhận Đã Chuyển Khoản (Ghi Sổ Vàng & Báo Qua Zalo + Telegram)
      </button>
    </div>
  </div>

  <!-- SLIDE-OVER SMART CART DRAWER -->
  <div class="drawer-backdrop" id="cart-drawer-backdrop" role="dialog" aria-modal="true" aria-label="Giỏ thỉnh vật phẩm">
    <div class="cart-drawer">
      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:0.9rem;border-bottom:1px solid var(--border-subtle);">
        <h3 style="font-size:1.35rem;color:var(--gold-light);">🛒 Giỏ Thỉnh Vật Phẩm</h3>
        <button type="button" class="icon-btn" id="close-cart-btn">✕ Đóng</button>
      </div>

      <div id="cart-items-list" style="flex:1;overflow-y:auto;"></div>

      <div id="cart-checkout-area" style="display:none;padding-top:0.95rem;border-top:1px solid var(--border-strong);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
          <span style="font-weight:600;">Tổng phí thỉnh:</span>
          <strong id="cart-total-amount" style="font-size:1.35rem;color:var(--gold-light);">0đ</strong>
        </div>

        <div class="form-group">
          <label for="cart-customer-name">Họ tên người nhận *</label>
          <input type="text" id="cart-customer-name" class="form-control" placeholder="Nhập họ và tên của bạn" />
        </div>

        <div class="form-group">
          <label for="cart-customer-phone">Số điện thoại Zalo nhận hàng *</label>
          <input type="tel" id="cart-customer-phone" class="form-control" placeholder="VD: 090xxxxxxx" />
        </div>

        <div class="form-group">
          <label for="cart-customer-address">Địa chỉ nhận vật phẩm *</label>
          <input type="text" id="cart-customer-address" class="form-control" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP" />
        </div>

        <div class="form-group">
          <label for="cart-customer-note">Năm sinh gia chủ & Ghi chú viết sớ / trì chú</label>
          <input type="text" id="cart-customer-note" class="form-control" placeholder="VD: Sinh năm 1992, nhờ Cô ghi sớ cúng Thần Tài" />
        </div>

        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.83rem;color:var(--gold-light);margin-bottom:0.75rem;cursor:pointer;">
          <input type="checkbox" id="cart-bless-checkbox" checked />
          <span>Nhờ Cô Bé Hữu Duyên trì chú / khai quang miễn phí trước khi gửi</span>
        </label>

        <div class="vietqr-box">
          <span class="vietqr-box-title">QUÉT MÃ VIETQR<br />THANH TOÁN ĐƠN THỈNH</span>
          <img
            id="cart-vietqr-img"
            src="https://img.vietqr.io/image/VCB-0051000567270-compact.png?amount=0&addInfo=THINH%20VAT%20PHAM&accountName=NGUYEN%20THI%20THU%20HONG"
            alt="VietQR Thanh Toán Đơn Hàng"
            loading="lazy"
          />
          <div class="vietqr-bank-details">
            <div class="vietqr-detail-row">
              <span class="vietqr-detail-label">Ngân hàng:</span>
              <span class="vietqr-detail-val">Vietcombank</span>
            </div>
            <div class="vietqr-detail-row">
              <span class="vietqr-detail-label">Số tài khoản:</span>
              <span class="vietqr-account-group">
                <strong class="vietqr-account-highlight">0051000567270</strong>
                <button type="button" class="vietqr-copy-tag" onclick="navigator.clipboard.writeText('0051000567270');alert('Đã sao chép STK: 0051000567270')">Sao chép</button>
              </span>
            </div>
            <div class="vietqr-detail-row">
              <span class="vietqr-detail-label">Chủ tài khoản:</span>
              <span class="vietqr-detail-val" style="color:#8b1e1e;font-size:0.95rem;">NGUYỄN THỊ THU HỒNG</span>
            </div>
          </div>
        </div>

        <div class="turnstile-guard-wrap">
          <span class="turnstile-guard-label">🛡️ Xác thực chống Spam đơn hàng ảo (Cloudflare Turnstile)</span>
          <div class="cf-turnstile" data-sitekey="0x4AAAAAAFxsWkkTeXBYGsul" data-theme="dark" data-size="flexible"></div>
        </div>

        <button type="button" class="btn btn-gold" id="btn-checkout-zalo" style="width:100%;margin-bottom:0.5rem;">
          💬 Gửi Đơn Qua Zalo & Đồng Bộ Telegram (${config.contact.phoneDisplay})
        </button>
        <button type="button" class="btn btn-outline" id="btn-checkout-fb" style="width:100%;font-size:0.85rem;">
          📘 Gửi Đơn Qua Facebook & Đồng Bộ Telegram
        </button>
      </div>
    </div>
  </div>

  <!-- FLOATING QUICK CONTACT BUTTONS -->
  <div class="floating-contact" aria-label="Liên hệ nhanh">
    <a href="${config.contact.zaloUrl}" target="_blank" rel="noopener" class="float-btn float-zalo" title="Chat Zalo với Cô Bé Hữu Duyên: 0702311558">
      💬 <span>Zalo: ${config.contact.phoneDisplay}</span>
    </a>
    <a href="${config.contact.tiktokUrl}" target="_blank" rel="noopener" class="float-btn float-tiktok" title="Xem kênh TikTok @cobehuuduyen">
      🎵 <span>TikTok ${config.contact.tiktokHandle}</span>
    </a>
    <a href="${config.contact.facebookUrl}" target="_blank" rel="noopener" class="float-btn float-fb" title="Nhắn tin Facebook Cô Bé Hữu Duyên">
      📘 <span>Facebook Thầy</span>
    </a>
  </div>

  <div class="toast-container" id="toast-container" aria-live="polite"></div>

  <!-- Embedded Structured Data -->
  <script>
    window.__COBEHUUDUYEN_DATA__ = ${JSON.stringify({
      config,
      products: productsData,
      fortunes: fortunesData,
      charity: charityData,
      sanctuary: sanctuaryData
    })};
  </script>
  <script src="/assets/app.js?v=${jsHash}" defer></script>
</body>
</html>
`;

const notFoundHtml = `<!DOCTYPE html>
<html lang="vi" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Không tìm thấy trang | ${config.fullTitle}</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="stylesheet" href="/assets/styles.css?v=${cssHash}" />
</head>
<body style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:2rem;">
  <main style="max-width:540px;background:var(--bg-card);border:1px solid var(--border-strong);border-radius:22px;padding:2.5rem;">
    <img src="/favicon.svg" alt="${config.brandName}" width="72" height="72" style="margin:0 auto 1rem;" />
    <h1 style="font-size:2rem;color:var(--gold-light);margin-bottom:0.75rem;">Hữu Duyên Quay Về Trang Chủ</h1>
    <p style="color:var(--text-secondary);margin-bottom:1.5rem;">
      Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được chuyển về trang chính thức của <strong>${config.brandName}</strong>.
    </p>
    <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
      <a href="/" class="btn btn-gold">🪷 Về Trang Chủ cobehuuduyen.com</a>
      <a href="${config.contact.zaloUrl}" class="btn btn-outline">💬 Liên Hệ Zalo ${config.contact.phoneDisplay}</a>
    </div>
  </main>
</body>
</html>
`;

const ogBannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#3D0E0E"/>
      <stop offset="60%" stop-color="#170B09"/>
      <stop offset="100%" stop-color="#0B0706"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBE59B"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#9C7A1C"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="36" y="36" width="1128" height="558" rx="24" fill="none" stroke="url(#gold)" stroke-width="3"/>
  <circle cx="600" cy="180" r="76" fill="none" stroke="url(#gold)" stroke-width="3"/>
  <text x="600" y="195" text-anchor="middle" fill="url(#gold)" font-family="Georgia, serif" font-size="44" font-weight="bold">HỮU DUYÊN</text>
  <text x="600" y="335" text-anchor="middle" fill="#FBE59B" font-family="Georgia, serif" font-size="64" font-weight="bold">CÔ BÉ HỮU DUYÊN</text>
  <text x="600" y="405" text-anchor="middle" fill="#F7EFE4" font-family="sans-serif" font-size="30">Phòng Tụng Kinh Online • Xem Bói • Hàng Mã & Phong Thuỷ • Từ Thiện</text>
  <text x="600" y="490" text-anchor="middle" fill="#D4AF37" font-family="sans-serif" font-size="26" font-weight="bold">Zalo: 0702.311.558  |  TikTok: @cobehuuduyen  |  cobehuuduyen.com</text>
</svg>`;

const sanctuaryPageHtml = `<!DOCTYPE html>
<html lang="vi" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Điện Thờ & Phòng Tụng Kinh Online Cùng Phật Tử | ${config.fullTitle}</title>
  <meta name="description" content="Không gian Điện Thờ & Phòng Tụng Kinh Online cùng đạo tràng Phật tử Cô Bé Hữu Duyên: Có giọng đọc kinh, tiếng mõ gỗ, chuông đồng, chỗ ngồi toạ thiền trực tuyến và thả đèn hoa đăng." />
  <link rel="canonical" href="${config.domain}/phong-tung-kinh.html" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/assets/styles.css?v=${cssHash}" />
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="brand-logo" aria-label="${config.brandName}">
        <img src="/favicon.svg" alt="Logo ${config.brandName}" class="brand-emblem" width="42" height="42" />
        <div class="brand-text">
          <span class="brand-name">${config.brandName}</span>
          <span class="brand-sub">Điện Thờ & Phòng Tụng Kinh Online</span>
        </div>
      </a>

      <nav class="main-nav" id="main-nav">
        <a href="/" class="nav-link">🏠 Về Trang Chủ</a>
        <a href="/#xem-boi" class="nav-link">☯️ Xem Bói</a>
        <a href="/#vat-pham" class="nav-link">🪷 Hàng Mã & Phong Thuỷ</a>
        <a href="/#dat-lich" class="nav-link">📿 Đặt Lịch 1-1</a>
        <a href="/#tu-thien" class="nav-link">💛 Quỹ Từ Thiện</a>
      </nav>

      <div class="header-actions">
        <button type="button" class="icon-btn" id="theme-toggle-btn">
          <span id="theme-toggle-icon">☀️</span>
          <span id="theme-toggle-label">Sáng</span>
        </button>
        <a href="/" class="btn btn-outline" style="padding:0.45rem 0.9rem;font-size:0.82rem;">← Trang Chủ</a>
      </div>
    </div>
  </header>

  <main class="section" style="padding-top:2rem;">
    <div class="container">
      <div class="section-header" style="margin-bottom:1.8rem;">
        <span class="section-eyebrow">Đạo Tràng Trực Tuyến • Đồng Thanh Tụng Niệm • Có Giọng Đọc Kinh & Tiếng Mõ Thực Tế</span>
        <h1 class="section-title">Điện Thờ & Phòng Tụng Kinh Online Cùng Phật Tử</h1>
        <p class="section-desc">
          Chọn 1 trong 3 Điện Thờ theo chủ đề bên dưới để thay đổi không gian thờ tự, lắng nghe <strong>Giọng Đọc Kinh kết hợp Tiếng Mõ – Chuông Bát Nhã</strong>, cùng ngồi toạ thiền với các Phật tử đang online và sử dụng <strong>Điểm Công Đức</strong> để dâng lễ.
        </p>
      </div>

      <!-- 3 Room Cards -->
      <div class="sanctuary-room-selector" role="tablist" aria-label="Chọn điện thờ online">
        ${sanctuaryData.rooms
          .map(
            (room, idx) => `
          <button type="button" class="room-select-card ${idx === 0 ? "active" : ""}" data-room-id="${room.id}">
            <span class="room-live-pill">● Đang đồng bộ kinh • ${room.badge}</span>
            <h2 style="font-size:1.22rem;color:var(--gold-light);margin-bottom:0.25rem;">${room.name}</h2>
            <p style="font-size:0.82rem;color:var(--text-secondary);">${room.deityTitle}</p>
          </button>`
          )
          .join("")}
      </div>

      <div class="sanctuary-main-grid">
        <!-- Left Column: Themed Altar, Ritual Controls, Synchronized Chanting & 12 Meditation Seats -->
        <div class="altar-chamber shrine-theme-tam-bao" id="altar-chamber-box">
          <div class="altar-top-bar">
            <div>
              <h2 id="sanctuary-room-title" style="font-size:1.45rem;color:#fbe59b;">${defaultRoom.name}</h2>
              <small id="sanctuary-deity-title" style="color:#d7c7b5;">${defaultRoom.deityTitle}</small>
            </div>
            <div class="nickname-box" title="Đặt Pháp danh hoặc Tên tín chủ hiển thị trên chiếu ngồi">
              <span style="font-size:0.8rem;color:#d7c7b5;">🪷 Pháp danh/Tên:</span>
              <input type="text" id="sanctuary-nickname-input" placeholder="Nhập tên của bạn..." value="Phật tử Hữu Duyên" />
            </div>
          </div>

          <!-- Visual Altar Stage with Dynamic Theme Background -->
          <div class="altar-stage-visual" id="altar-stage-visual">
            <div class="deity-halo" id="sanctuary-deity-halo"></div>
            <p id="sanctuary-mantra-short" style="margin-top:0.75rem;font-family:'Noto Serif',serif;font-weight:700;color:#fbe59b;text-align:center;font-size:1.08rem;">
              🙏 ${defaultRoom.mantraShort}
            </p>

            <!-- Offerings Table -->
            <div class="altar-offerings-table">
              <div class="offering-slot active" id="slot-lamp">
                <span style="font-size:1.45rem;">🕯️</span>
                <span>Đèn Trí Tuệ</span>
              </div>
              <div class="offering-slot active" id="slot-incense">
                <div class="incense-smoke-container">
                  <span class="smoke-wisp"></span>
                  <span class="smoke-wisp"></span>
                  <span style="font-size:1.55rem;">🏺</span>
                </div>
                <span>Lư Hương Trầm</span>
              </div>
              <div class="offering-slot active" id="slot-flower">
                <span style="font-size:1.45rem;">🪷</span>
                <span>Hoa Sen & Quả</span>
              </div>
            </div>
          </div>

          <!-- Interactive Ritual Buttons with Merit Point Deduction -->
          <div style="margin-bottom:0.45rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
            <small style="color:#fbe59b;font-weight:600;">✨ Nghi thức dâng lễ & pháp khí (Trừ Điểm Công Đức tương ứng):</small>
            <small style="color:#d7c7b5;">💡 Bấm chạy tụng kinh bên dưới để được <strong>+2 điểm/câu</strong></small>
          </div>
          <div class="ritual-actions-bar">
            <button type="button" class="ritual-btn" id="ritual-incense-btn">
              <span>🔥 Dâng Hương Trầm</span>
              <span class="ritual-cost-badge">-5đ</span>
            </button>
            <button type="button" class="ritual-btn" id="ritual-flower-btn">
              <span>🪷 Dâng Hoa Quả</span>
              <span class="ritual-cost-badge">-5đ</span>
            </button>
            <button type="button" class="ritual-btn" id="ritual-lamp-btn">
              <span>🕯️ Thắp Đèn Trí Tuệ</span>
              <span class="ritual-cost-badge">-8đ</span>
            </button>
            <button type="button" class="ritual-btn" id="ritual-bell-btn">
              <span>🔔 Thỉnh Chuông</span>
              <span class="ritual-cost-badge">-2đ</span>
            </button>
            <button type="button" class="ritual-btn" id="ritual-mo-btn">
              <span>🥁 Gõ Mõ Tụng Kinh</span>
              <span class="ritual-cost-badge">-1đ</span>
            </button>
            <button type="button" class="ritual-btn" id="ritual-mala-btn">
              <span>📿 Lần Chuỗi 108 Hạt</span>
              <span class="ritual-cost-badge">-2đ</span>
            </button>
          </div>

          <!-- Synchronized Scripture Teleprompter + Voice Reader Controls -->
          <div class="scripture-scroll-box">
            <div class="scripture-header">
              <div>
                <strong id="sanctuary-chant-title" style="color:#fbe59b;font-size:0.95rem;display:block;">📖 ${defaultRoom.chantTitle}</strong>
                <small style="color:#bda894;font-size:0.75rem;">🔄 Đồng bộ câu kinh trực tiếp cùng toàn bộ Phật tử trong phòng (+2 Điểm Công Đức / câu)</small>
              </div>
              <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">
                <button type="button" class="btn btn-outline" id="btn-toggle-voice" style="padding:0.38rem 0.75rem;font-size:0.76rem;color:#fbe59b;border-color:rgba(251,229,155,0.4);">
                  🔊 Giọng Đọc Kinh: BẬT
                </button>
                <button type="button" class="btn btn-gold" id="btn-auto-chant" style="padding:0.38rem 0.85rem;font-size:0.78rem;">
                  ▶️ Bắt Đầu Tụng Kinh & Gõ Mõ (+2đ/câu)
                </button>
              </div>
            </div>
            <div class="chant-lines-list" id="sanctuary-chant-lines">
              ${defaultRoom.chantLines
                .map(
                  (line, idx) =>
                    `<div class="chant-line ${idx === 0 ? "current" : ""}" data-line-idx="${idx}">${line}</div>`
                )
                .join("")}
            </div>
          </div>

          <!-- 12 Meditation Seats Grid (Bồ Đoàn Toạ Thiền) -->
          <div class="meditation-hall-box">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
              <strong style="color:#fbe59b;font-size:0.95rem;">🧘 Chỗ Ngồi Toạ Thiền Tại Điện (<span id="online-users-count">5</span> Phật tử đang online)</strong>
              <small style="color:#d7c7b5;font-size:0.76rem;">Hiển thị thời gian thực các tín chủ đang tụng kinh tại phòng này</small>
            </div>
            <div class="meditation-seats-grid" id="meditation-seats-grid"></div>
          </div>
        </div>

        <!-- Right Sidebar: Merit Wallet, How to Earn Points, Sky Lanterns & Feed -->
        <aside class="sanctuary-sidebar">
          <div class="merit-counter-card">
            <div>
              <small style="color:var(--text-muted);display:block;">Ví Điểm Công Đức của bạn:</small>
              <strong style="font-size:1.45rem;color:var(--gold-light);"><span id="sanctuary-merit-count">30</span> Điểm Công Đức</strong>
            </div>
            <span style="font-size:2.2rem;">📿</span>
          </div>

          <div style="background:var(--bg-secondary);padding:0.95rem 1.05rem;border-radius:14px;border:1px solid var(--border-subtle);font-size:0.82rem;">
            <strong style="color:var(--gold-light);display:block;margin-bottom:0.35rem;">🌟 Cách Tích Luỹ Điểm Công Đức:</strong>
            <ul style="padding-left:1.1rem;display:grid;gap:0.28rem;color:var(--text-secondary);">
              <li><strong>Online đọc kinh / nghe tụng kinh:</strong> Cộng tự động <strong>+2 điểm</strong> mỗi câu kinh chạy qua.</li>
              <li><strong>Thỉnh Vật Phẩm Phong Thuỷ / Hàng Mã:</strong> Tặng từ <strong>+20 đến +100 điểm</strong> mỗi đơn hàng.</li>
              <li><strong>Phát tâm Quỹ Từ Thiện & Phóng Sinh:</strong> Tặng từ <strong>+25 đến +120 điểm</strong> công đức.</li>
            </ul>
          </div>

          <div>
            <h3 style="font-size:1.18rem;color:var(--gold-light);margin-bottom:0.25rem;">
              🏮 Thả Đèn Hoa Đăng & Hồi Hướng (-10 Điểm)
            </h3>
            <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.65rem;">
              Đèn Hoa Đăng sẽ bay lên giữa Điện Thờ và ghi nhận vào sổ cầu an tại phòng (không gửi thông báo làm phiền Telegram).
            </p>
            <form id="sanctuary-prayer-form">
              <div class="form-group">
                <textarea
                  id="sanctuary-wish-input"
                  rows="2"
                  class="form-control"
                  placeholder="Nhập lời nguyện cầu bình an, sức khoẻ, tài lộc..."
                ></textarea>
              </div>
              <div class="turnstile-guard-wrap">
                <span class="turnstile-guard-label">🛡️ Xác thực chống Spam (Cloudflare Turnstile)</span>
                <div class="cf-turnstile" data-sitekey="0x4AAAAAAFxsWkkTeXBYGsul" data-theme="dark" data-size="flexible"></div>
              </div>
              <button type="submit" class="btn btn-gold" style="width:100%;padding:0.65rem 1rem;font-size:0.86rem;">
                🏮 Thả Đèn Hoa Đăng & Hồi Hướng (-10 Điểm)
              </button>
            </form>
          </div>

          <div>
            <h4 style="font-size:0.92rem;color:var(--gold-light);margin-bottom:0.55rem;">
              📜 Lời Cầu Nguyện & Hồi Hướng Tại Điện Này:
            </h4>
            <div class="prayer-feed-list" id="sanctuary-prayer-feed"></div>
          </div>
        </aside>
      </div>
    </div>
  </main>

  <div class="toast-container" id="toast-container" aria-live="polite"></div>

  <script>
    window.__COBEHUUDUYEN_DATA__ = ${JSON.stringify({
      config,
      sanctuary: sanctuaryData
    })};
  </script>
  <script src="/assets/sanctuary-page.js?v=${jsHash}" defer></script>
</body>
</html>
`;

const adminPageHtml = `<!DOCTYPE html>
<html lang="vi" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quản Trị Hệ Thống D1 & Sản Phẩm | ${config.fullTitle}</title>
  <meta name="robots" content="noindex, nofollow" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/assets/styles.css?v=${cssHash}" />
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="brand-logo">
        <img src="/favicon.svg" alt="${config.brandName}" class="brand-emblem" width="40" height="40" />
        <div class="brand-text">
          <span class="brand-name">Quản Trị Cô Bé Hữu Duyên</span>
          <span class="brand-sub">Cloudflare D1 Database • Duyệt Sổ Vàng, Đơn Hàng & Sản Phẩm</span>
        </div>
      </a>
      <div class="header-actions">
        <a href="/" class="btn btn-outline" style="padding:0.45rem 0.9rem;font-size:0.82rem;">🏠 Xem Trang Chủ</a>
        <a href="/phong-tung-kinh.html" class="btn btn-outline" style="padding:0.45rem 0.9rem;font-size:0.82rem;">🙏 Phòng Tụng Kinh</a>
        <button type="button" class="icon-btn" id="btn-admin-logout">Đăng xuất</button>
      </div>
    </div>
  </header>

  <main class="section" style="padding-top:2rem;">
    <div class="container">
      <!-- Login Box -->
      <div id="admin-login-box" style="max-width:460px;margin:2rem auto;background:var(--bg-card);border:1px solid var(--border-strong);border-radius:20px;padding:2rem;box-shadow:var(--shadow-card);">
        <h1 style="font-size:1.5rem;color:var(--gold-light);margin-bottom:0.4rem;">🔐 Đăng Nhập Quản Trị D1</h1>
        <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:1.2rem;">
          Nhập mật khẩu Admin để duyệt Sổ Vàng Công Đức, Đơn Hàng Lẻ/Sỉ, Lịch Hẹn 1-1 và Thêm/Sửa/Xoá Sản Phẩm. (Mặc định: <code>0702311558</code> hoặc biến <code>ADMIN_PASSWORD</code> trên Cloudflare).
        </p>
        <form id="admin-login-form">
          <div class="form-group">
            <label for="admin-password-input">Mật khẩu Quản Trị Viên *</label>
            <input type="password" id="admin-password-input" class="form-control" placeholder="Nhập mật khẩu Admin..." required />
          </div>
          <button type="submit" class="btn btn-gold" style="width:100%;">🔓 Mở Bảng Điều Khiển D1</button>
        </form>
      </div>

      <!-- Main Admin Dashboard -->
      <div id="admin-dashboard-main" style="display:none;">
        <div class="admin-stats-grid">
          <div class="admin-stat-card">
            <small>⏳ Đang chờ duyệt (Đơn / Công đức)</small>
            <strong id="stat-pending">0</strong>
          </div>
          <div class="admin-stat-card">
            <small>💛 Tổng Công Đức Đã Duyệt (D1)</small>
            <strong id="stat-approved-charity">0đ</strong>
          </div>
          <div class="admin-stat-card">
            <small>🛒 Đơn Hàng & Báo Giá Sỉ</small>
            <strong id="stat-orders">0</strong>
          </div>
          <div class="admin-stat-card">
            <small>📿 Phiếu Đặt Lịch 1-1</small>
            <strong id="stat-bookings">0</strong>
          </div>
          <div class="admin-stat-card">
            <small>🪷 Sản Phẩm Tuỳ Chỉnh Trong D1</small>
            <strong id="stat-products">0</strong>
          </div>
        </div>

        <!-- SECTION A: QUẢN LÝ & DUYỆT SỰ KIỆN (CÔNG ĐỨC, ĐƠN HÀNG, ĐẶT SỈ, ĐẶT LỊCH) -->
        <div style="background:var(--bg-card);border:1px solid var(--border-strong);border-radius:20px;padding:1.6rem;margin-bottom:2rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1rem;">
            <div>
              <h2 style="font-size:1.4rem;color:var(--gold-light);">📋 Duyệt Thanh Toán Công Đức, Đơn Hàng, Đặt Sỉ & Lịch Hẹn</h2>
              <p style="font-size:0.84rem;color:var(--text-secondary);">
                Khi khách bấm xác nhận thanh toán trên web, dữ liệu sẽ ở trạng thái <strong>⏳ Chờ duyệt</strong>. Bấm <strong>✔ Duyệt</strong> để hiển thị công khai lên Sổ Vàng & cộng vào Tổng Quỹ trang chủ.
              </p>
            </div>
            <button type="button" class="btn btn-outline" id="btn-admin-refresh" style="padding:0.45rem 0.9rem;font-size:0.82rem;">🔄 Làm mới dữ liệu</button>
          </div>

          <div class="admin-tab-bar">
            <button type="button" class="cat-pill active" data-admin-filter="all">Tất cả</button>
            <button type="button" class="cat-pill" data-admin-filter="pending">⏳ Chờ duyệt</button>
            <button type="button" class="cat-pill" data-admin-filter="charity">💛 Công đức Sổ Vàng</button>
            <button type="button" class="cat-pill" data-admin-filter="order">🛒 Đơn hàng lẻ</button>
            <button type="button" class="cat-pill" data-admin-filter="wholesale">📦 Đặt hàng sỉ</button>
            <button type="button" class="cat-pill" data-admin-filter="booking">📿 Đặt lịch 1-1</button>
          </div>

          <div class="admin-table-wrap">
            <table class="ledger-table">
              <thead>
                <tr>
                  <th>ID / Thời gian</th>
                  <th>Phân loại</th>
                  <th>Tín chủ / Khách hàng</th>
                  <th>Số tiền</th>
                  <th>Chi tiết / Lời nguyện</th>
                  <th>Trạng thái</th>
                  <th>Thao tác duyệt / xoá</th>
                </tr>
              </thead>
              <tbody id="admin-events-tbody"></tbody>
            </table>
          </div>

          <!-- Thêm nhanh vào Sổ Vàng Công Đức -->
          <div style="margin-top:1.5rem;padding-top:1.25rem;border-top:1px dashed var(--border-subtle);">
            <h3 style="font-size:1.1rem;color:var(--gold-light);margin-bottom:0.65rem;">➕ Ghi Nhận Trực Tiếp Công Đức Vào Sổ Vàng (Hiển Thị Ngay)</h3>
            <form id="admin-add-charity-form" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.75rem;align-items:end;">
              <div class="form-group" style="margin:0;">
                <label>Tên tín chủ / Pháp danh *</label>
                <input type="text" id="direct-charity-name" class="form-control" placeholder="VD: Gia đình Phật tử Minh Tâm" required />
              </div>
              <div class="form-group" style="margin:0;">
                <label>Số tiền công đức (VNĐ) *</label>
                <input type="number" id="direct-charity-amount" class="form-control" value="500000" required />
              </div>
              <div class="form-group" style="margin:0;">
                <label>Chiến dịch thiện nguyện</label>
                <input type="text" id="direct-charity-campaign" class="form-control" value="Phóng Sinh Rằm & Quà Gạo" />
              </div>
              <div class="form-group" style="margin:0;">
                <label>Lời cầu nguyện / Hồi hướng</label>
                <input type="text" id="direct-charity-wish" class="form-control" placeholder="Cầu bình an, sức khoẻ..." />
              </div>
              <button type="submit" class="btn btn-gold" style="height:42px;">+ Ghi Sổ Vàng</button>
            </form>
          </div>
        </div>

        <!-- SECTION B: QUẢN LÝ SẢN PHẨM (THÊM / SỬA / XOÁ TRÊN D1) -->
        <div style="background:var(--bg-card);border:1px solid var(--border-strong);border-radius:20px;padding:1.6rem;">
          <h2 style="font-size:1.4rem;color:var(--gold-light);margin-bottom:0.35rem;">🪷 Quản Lý Sản Phẩm Cửa Hàng (Thêm, Sửa, Xoá trên D1)</h2>
          <p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:1.25rem;">
            Mọi sản phẩm thêm hoặc chỉnh sửa tại đây sẽ được lưu vào bảng <code>products_catalog</code> trên Cloudflare D1 và tự động cập nhật ra trang chủ.
          </p>

          <form id="admin-product-form" style="background:var(--bg-secondary);padding:1.25rem;border-radius:16px;border:1px solid var(--border-subtle);margin-bottom:1.5rem;">
            <div class="oracle-form-row">
              <div class="form-group">
                <label for="prod-id">Mã sản phẩm (Để trống nếu thêm mới)</label>
                <input type="text" id="prod-id" class="form-control" placeholder="Tự động tạo nếu để trống" />
              </div>
              <div class="form-group">
                <label for="prod-name">Tên vật phẩm / Bộ lễ *</label>
                <input type="text" id="prod-name" class="form-control" placeholder="VD: Bộ Lễ Hàng Mã Cúng Thần Tài Đại Cát" required />
              </div>
            </div>

            <div class="oracle-form-row">
              <div class="form-group">
                <label for="prod-category">Danh mục *</label>
                <select id="prod-category" class="form-control">
                  <option value="hang-ma">Đồ Lễ Hàng Mã</option>
                  <option value="phong-thuy">Vật Phẩm Phong Thuỷ</option>
                  <option value="tam-linh">Hương Nến & Tâm Linh</option>
                  <option value="luu-niem">Quà Lưu Niệm Bình An</option>
                </select>
              </div>
              <div class="form-group">
                <label for="prod-badge">Nhãn nổi bật (Badge)</label>
                <input type="text" id="prod-badge" class="form-control" value="Thỉnh Nhiều Nhất" />
              </div>
            </div>

            <div class="oracle-form-row">
              <div class="form-group">
                <label for="prod-price">Giá thỉnh (VNĐ) *</label>
                <input type="number" id="prod-price" class="form-control" placeholder="VD: 350000" required />
              </div>
              <div class="form-group">
                <label for="prod-original-price">Giá gốc trước giảm (VNĐ)</label>
                <input type="number" id="prod-original-price" class="form-control" placeholder="VD: 450000" />
              </div>
            </div>

            <div class="oracle-form-row">
              <div class="form-group">
                <label for="prod-elements">Mệnh phù hợp (Cách nhau dấu phẩy)</label>
                <input type="text" id="prod-elements" class="form-control" value="Kim, Mộc, Thuỷ, Hoả, Thổ" />
              </div>
              <div class="form-group">
                <label for="prod-artwork">Biểu tượng minh hoạ</label>
                <select id="prod-artwork" class="form-control">
                  <option value="shrine-gold">Đài Vàng Tâm Linh (shrine-gold)</option>
                  <option value="ancestral-box">Rương Lễ Gia Tiên (ancestral-box)</option>
                  <option value="star-ritual">Sao Giải Hạn (star-ritual)</option>
                  <option value="cinnabar-bracelet">Vòng Chu Sa Đỏ (cinnabar-bracelet)</option>
                  <option value="pixiu-bracelet">Tỳ Hưu Chiêu Tài (pixiu-bracelet)</option>
                  <option value="incense-cones">Trầm Hương Liên Hoa (incense-cones)</option>
                  <option value="amulet-pouch">Túi Lộc Bình An (amulet-pouch)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="prod-desc">Mô tả chi tiết vật phẩm</label>
              <textarea id="prod-desc" rows="2" class="form-control" placeholder="Mô tả công năng phong thuỷ, thành phần bộ lễ..."></textarea>
            </div>

            <button type="submit" class="btn btn-gold">💾 Lưu Sản Phẩm Lên D1 Database</button>
          </form>

          <div class="admin-table-wrap">
            <table class="ledger-table">
              <thead>
                <tr>
                  <th>Mã SP</th>
                  <th>Tên vật phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá thỉnh</th>
                  <th>Mệnh hợp</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody id="admin-products-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </main>

  <div class="toast-container" id="toast-container" aria-live="polite"></div>

  <script>
    window.__COBEHUUDUYEN_DATA__ = ${JSON.stringify({
      config,
      products: productsData
    })};
  </script>
  <script src="/assets/admin-page.js?v=${jsHash}" defer></script>
</body>
</html>
`;

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });
await fs.cp(path.join(rootDir, "public"), outputDir, { recursive: true });

await fs.writeFile(path.join(outputDir, "index.html"), indexHtml, "utf8");
await fs.writeFile(path.join(outputDir, "phong-tung-kinh.html"), sanctuaryPageHtml, "utf8");
await fs.writeFile(path.join(outputDir, "admin.html"), adminPageHtml, "utf8");
await fs.writeFile(path.join(outputDir, "404.html"), notFoundHtml, "utf8");
await fs.writeFile(path.join(outputDir, "og-banner.svg"), ogBannerSvg, "utf8");

const todayIso = new Date().toISOString().split("T")[0];
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${config.domain}/</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${config.domain}/phong-tung-kinh.html</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>
`;

const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin.html
Sitemap: ${config.domain}/sitemap.xml
`;

await fs.writeFile(path.join(outputDir, "sitemap.xml"), sitemapXml, "utf8");
await fs.writeFile(path.join(outputDir, "robots.txt"), robotsTxt, "utf8");

// Sync static files to root directory as well so Cloudflare Pages works with both `/` and `dist`
await fs.cp(outputDir, rootDir, { recursive: true, force: true });

console.log(`✅ Built cobehuuduyen.com into ./dist and synced root (CSS rev: ${cssHash}, JS rev: ${jsHash})`);
