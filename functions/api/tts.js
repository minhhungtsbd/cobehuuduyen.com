/**
 * CLOUDFLARE PAGES FUNCTION: /api/tts
 * Hỗ trợ Microsoft Neural TTS (Hoài My - Nữ & Nam Minh - Nam)
 * Tự động chuyển đổi theo tham số voice=vi-VN-HoaiMyNeural hoặc voice=vi-VN-NamMinhNeural
 * Fallback thông minh có phân biệt tốc độ & ngữ điệu cho Nam và Nữ
 */

const WIN_EPOCH = 11644473600n;
const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

async function generateSecMSGec() {
  const ts = BigInt(Math.floor(Date.now() / 1000)) + WIN_EPOCH;
  const roundedTicks = (ts / 300n) * 300n;
  const fileTime = roundedTicks * 1000000000n;
  const strToHash = `${fileTime.toString()}${TRUSTED_CLIENT_TOKEN}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(strToHash);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256Hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  const ticksHex = fileTime.toString(16).toUpperCase().padStart(16, "0");
  return `${ticksHex}-${sha256Hex}`;
}

async function synthesizeMicrosoftNeuralTTS(text, voice = "vi-VN-HoaiMyNeural") {
  const connectionId = crypto.randomUUID().replace(/-/g, "");
  const token = await generateSecMSGec();
  const wssUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${token}&Sec-MS-GEC-Version=1-134.0.3124.51&ConnectionId=${connectionId}`;

  const resp = await fetch(wssUrl, {
    headers: {
      Upgrade: "websocket",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0",
      Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold"
    }
  });

  const ws = resp.webSocket;
  if (!ws) {
    throw new Error(`Cloudflare failed to upgrade to Microsoft WebSocket (Status: ${resp.status})`);
  }
  ws.accept();

  return new Promise((resolve, reject) => {
    const chunks = [];
    const timeout = setTimeout(() => {
      try {
        ws.close();
      } catch {
        // ignore
      }
      reject(new Error("Microsoft Neural TTS timeout"));
    }, 5500);

    ws.addEventListener("message", (event) => {
      if (typeof event.data === "string") {
        if (event.data.includes("Path:turn.end")) {
          clearTimeout(timeout);
          try {
            ws.close();
          } catch {
            // ignore
          }
          if (chunks.length === 0) {
            reject(new Error("No audio chunks received"));
            return;
          }
          const totalLen = chunks.reduce((acc, c) => acc + c.byteLength, 0);
          const merged = new Uint8Array(totalLen);
          let offset = 0;
          for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.byteLength;
          }
          resolve(merged);
        }
      } else if (event.data instanceof ArrayBuffer) {
        const view = new DataView(event.data);
        if (event.data.byteLength > 2) {
          const headerLen = view.getUint16(0);
          if (event.data.byteLength > 2 + headerLen) {
            const headerStr = new TextDecoder().decode(new Uint8Array(event.data, 2, headerLen));
            if (headerStr.includes("Path:audio")) {
              const audioBytes = new Uint8Array(event.data, 2 + headerLen);
              chunks.push(audioBytes);
            }
          }
        }
      }
    });

    ws.addEventListener("error", (e) => {
      clearTimeout(timeout);
      reject(e);
    });

    ws.addEventListener("close", () => {
      clearTimeout(timeout);
      if (chunks.length > 0) {
        const totalLen = chunks.reduce((acc, c) => acc + c.byteLength, 0);
        const merged = new Uint8Array(totalLen);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.byteLength;
        }
        resolve(merged);
      } else {
        reject(new Error("WebSocket closed without audio"));
      }
    });

    // 1. Send speech.config
    const dateStr = new Date().toISOString();
    ws.send(
      `X-Timestamp:${dateStr}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`
    );

    // 2. Send SSML
    const requestId = crypto.randomUUID().replace(/-/g, "");
    const escapedText = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const targetVoice = voice === "vi-VN-NamMinhNeural" ? "vi-VN-NamMinhNeural" : "vi-VN-HoaiMyNeural";
    const prosodyRate = voice === "vi-VN-NamMinhNeural" ? "-8%" : "-4%";
    const prosodyPitch = voice === "vi-VN-NamMinhNeural" ? "-4%" : "0%";
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='vi-VN'><voice name='${targetVoice}'><prosody rate='${prosodyRate}' pitch='${prosodyPitch}'>${escapedText}</prosody></voice></speak>`;
    ws.send(
      `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`
    );
  });
}

async function fallbackGoogleTTS(text, voice) {
  const isMale = voice === "vi-VN-NamMinhNeural";
  const speed = isMale ? "0.76" : "0.86";
  const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&ttsspeed=${speed}&q=${encodeURIComponent(text.slice(0, 220))}`;
  const upstream = await fetch(ttsUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Referer: "https://translate.google.com/"
    }
  });

  if (!upstream.ok) {
    throw new Error(`Google TTS upstream status ${upstream.status}`);
  }

  const arrayBuffer = await upstream.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const rawText = (url.searchParams.get("text") || "").trim().slice(0, 360);
  const voice = (url.searchParams.get("voice") || "vi-VN-HoaiMyNeural").trim();

  if (!rawText) {
    return new Response("Missing text", { status: 400 });
  }

  let audioBytes = null;
  let engine = "microsoft-neural";

  try {
    audioBytes = await synthesizeMicrosoftNeuralTTS(rawText, voice);
  } catch {
    try {
      audioBytes = await fallbackGoogleTTS(rawText, voice);
      engine = "google-tts-fallback";
    } catch (fallbackErr) {
      return new Response(`TTS Error: ${fallbackErr.message}`, { status: 502 });
    }
  }

  return new Response(audioBytes, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
      "X-TTS-Engine": engine,
      "X-TTS-Voice": voice
    }
  });
}
