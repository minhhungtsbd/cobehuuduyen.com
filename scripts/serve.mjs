import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve("dist");
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

http
  .createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      let filePath = path.resolve(root, "." + urlPath);
      if (!filePath.startsWith(root + path.sep) && filePath !== root) {
        res.writeHead(403).end("Forbidden");
        return;
      }
      try {
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) filePath = path.join(filePath, "index.html");
      } catch {
        if (!path.extname(filePath)) filePath += ".html";
      }

      let data;
      try {
        data = await fs.readFile(filePath);
      } catch {
        res.statusCode = 404;
        filePath = path.join(root, "404.html");
        data = await fs.readFile(filePath);
      }

      res.setHeader("Content-Type", mimeTypes[path.extname(filePath)] || "application/octet-stream");
      res.end(data);
    } catch {
      res.writeHead(500).end("Internal Server Error");
    }
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`🪷 Server local Cô Bé Hữu Duyên đang chạy tại: http://127.0.0.1:${port}`);
  });
