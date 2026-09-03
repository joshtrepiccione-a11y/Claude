/** Edge-safe session token helpers (Web Crypto only), shared by middleware and server code. */
export const SESSION_COOKIE = "post186_admin_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(secret: string, ttlMs: number = SESSION_TTL_MS): Promise<string> {
  const expires = Date.now() + ttlMs;
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const payload = `${expires}.${nonce}`;
  const sig = await sign(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined, secret: string | undefined): Promise<boolean> {
  if (!token || !secret || secret.length < 16) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expires, nonce, sig] = parts;
  if (!/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  const expected = await sign(secret, `${expires}.${nonce}`);
  return constantTimeEqual(expected, sig);
}
