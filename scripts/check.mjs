import fs from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");
const errors = [];

const requiredFiles = [
  "index.html",
  "404.html",
  "favicon.svg",
  "og-banner.svg",
  "sitemap.xml",
  "robots.txt",
  "_headers",
  "assets/styles.css",
  "assets/app.js"
];

for (const rel of requiredFiles) {
  const full = path.join(distDir, rel);
  try {
    const stat = await fs.stat(full);
    if (stat.size === 0) errors.push(`Empty file: ${rel}`);
    if (stat.size > 25 * 1024 * 1024) errors.push(`Exceeds Cloudflare Pages 25MB limit: ${rel}`);
  } catch {
    errors.push(`Missing required output file in dist/: ${rel}`);
  }
}

const indexHtml = await fs.readFile(path.join(distDir, "index.html"), "utf8");
const requiredSnippets = [
  "Cô Bé Hữu Duyên — Tâm Linh, Phong Thuỷ & Thiện Nguyện",
  "https://cobehuuduyen.com",
  "0702311558",
  "https://www.facebook.com/nhu.lam.545518",
  "@cobehuuduyen",
  "0051000567270",
  "NGUYỄN THỊ THU HỒNG",
  "0x4AAAAAAFxsWkkTeXBYGsul",
  "challenges.cloudflare.com/turnstile/v0/api.js"
];

for (const snippet of requiredSnippets) {
  if (!indexHtml.includes(snippet)) {
    errors.push(`Missing expected content in index.html: ${snippet}`);
  }
}

const report = {
  status: errors.length === 0 ? "PASSED" : "FAILED",
  checkedFiles: requiredFiles.length,
  errors
};

console.log(JSON.stringify(report, null, 2));
if (errors.length > 0) process.exitCode = 1;
