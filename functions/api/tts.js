/**
 * CLOUDFLARE PAGES FUNCTION: /api/tts
 * Proxy & Edge Cache cho Giọng Đọc Tụng Kinh Tiếng Việt Tự Nhiên
 * Giúp mọi thiết bị (iPhone, Android, Windows, Mac) đều có giọng đọc Tiếng Việt mềm mại, tự nhiên, không bị phụ thuộc vào giọng đọc máy tính cục bộ.
 */

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const rawText = (url.searchParams.get("text") || "").trim().slice(0, 220);

  if (!rawText) {
    return new Response("Missing text", { status: 400 });
  }

  const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&ttsspeed=0.82&q=${encodeURIComponent(rawText)}`;

  try {
    const upstream = await fetch(ttsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://translate.google.com/"
      },
      cf: {
        cacheTtl: 604800,
        cacheEverything: true
      }
    });

    if (!upstream.ok || !upstream.body) {
      return new Response("TTS upstream unavailable", { status: 502 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=604800, immutable",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(`TTS Error: ${err.message}`, { status: 500 });
  }
}
