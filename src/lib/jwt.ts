// Decode the (non-secret) payload of a JWT to surface things like expiry.
// We never verify the signature here — this is purely for showing the user
// when their captured token will stop working.

export interface JwtInfo {
  email?: string;
  name?: string;
  role?: string;
  exp?: number; // unix seconds
  iat?: number;
}

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  if (typeof atob === "function") return atob(b64);
  return Buffer.from(b64, "base64").toString("binary");
}

export function decodeJwt(token: string): JwtInfo | null {
  const parts = token.replace(/^Bearer\s+/i, "").split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(b64urlDecode(parts[1])) as JwtInfo;
  } catch {
    return null;
  }
}

// Find the bearer token inside a captured request's headers (case-insensitive).
export function getAuthToken(headers: Record<string, string>): string | null {
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === "authorization") return v.replace(/^Bearer\s+/i, "");
  }
  return null;
}

export interface ExpiryStatus {
  exp?: number;
  expired: boolean;
  label: string;
}

export function expiryStatus(headers: Record<string, string>): ExpiryStatus | null {
  const tok = getAuthToken(headers);
  if (!tok) return null;
  const info = decodeJwt(tok);
  if (!info?.exp) return null;
  const ms = info.exp * 1000;
  const expired = Date.now() >= ms;
  const d = new Date(ms);
  const label = expired
    ? `Token expired ${d.toLocaleString()}`
    : `Token valid until ${d.toLocaleString()}`;
  return { exp: info.exp, expired, label };
}
