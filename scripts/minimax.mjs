import { request } from "node:https";

/**
 * A POST to the MiniMax chat API.
 *
 * Node's global fetch is built on undici, whose headersTimeout is 300
 * seconds: the request dies with "fetch failed" (UND_ERR_HEADERS_TIMEOUT)
 * before the answer arrives. A long bilingual dossier takes longer than
 * that -- the model thinks first, and the eight sections have to be
 * written in two languages -- so the generation scripts lost the hour to a
 * timeout that was never about the model.
 *
 * node:https has no such ceiling. The same request, unchanged, now waits
 * as long as the caller allows.
 */
export function postJson(url, body, { headers = {}, timeoutMs = 900_000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = Buffer.from(JSON.stringify(body));
    const req = request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": payload.length,
          ...headers,
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString("utf8") });
        });
        res.on("error", reject);
      },
    );
    req.on("timeout", () => {
      req.destroy(new Error(`request timed out after ${timeoutMs}ms`));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

/**
 * The same POST, parsed as JSON, with the error handling the generation
 * scripts expect: an HTTP error and an unparseable body are both thrown
 * with a message that says what came back.
 */
export async function postJsonOrThrow(url, body, options) {
  const res = await postJson(url, body, options);
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`HTTP ${res.status}: ${res.text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(res.text);
  } catch (err) {
    throw new Error(`unparseable reply: ${res.text.slice(0, 300)}`);
  }
}
