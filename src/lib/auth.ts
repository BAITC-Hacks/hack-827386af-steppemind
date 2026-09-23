import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sqlite } from "./db";
import type { SessionUser } from "./auth-types";

const COOKIE = "steppemind_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

function derivePassword(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error); else resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derivePassword(password, salt);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, value] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !value) return false;
  const key = await derivePassword(password, salt);
  const expected = Buffer.from(value, "hex");
  return expected.length === key.length && timingSafeEqual(expected, key);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return sqlite.prepare(`
    SELECT a.id, a.login, a.name, a.role FROM accounts a
    JOIN sessions s ON s.account_id = a.id WHERE s.token_hash = ? AND s.expires_at > ?
  `).get(digest(token), Date.now()) as SessionUser | undefined ?? null;
}

export async function createSession(user: SessionUser) {
  const cookieStore = await cookies();
  const previous = cookieStore.get(COOKIE)?.value;
  if (previous) sqlite.prepare("DELETE FROM sessions WHERE token_hash = ?").run(digest(previous));
  sqlite.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  const token = randomBytes(32).toString("hex");
  sqlite.prepare("INSERT INTO sessions (token_hash, account_id, expires_at) VALUES (?, ?, ?)")
    .run(digest(token), user.id, Date.now() + SESSION_SECONDS * 1000);
  cookieStore.set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: SESSION_SECONDS,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (token) sqlite.prepare("DELETE FROM sessions WHERE token_hash = ?").run(digest(token));
  cookieStore.delete(COOKIE);
}

// Browsers must submit JSON from this origin, including for login and logout.
export function checkMutation(request: Request) {
  const origin = request.headers.get("origin");
  // Next may normalize request.url to localhost; Host retains the browser's actual hostname.
  const host = request.headers.get("host") ?? new URL(request.url).host;
  let sameOrigin = !origin;
  if (origin) {
    try {
      const url = new URL(origin);
      sameOrigin = url.host === host && ["http:", "https:"].includes(url.protocol);
    } catch { sameOrigin = false; }
  }
  if (!sameOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return NextResponse.json({ error: "invalid_data" }, { status: 415 });
  }
  return null;
}

// Count before password derivation, including concurrent requests. State survives hot reloads.
export function consumeAuthAttempt(login: string) {
  return sqlite.transaction(() => {
    const now = Date.now();
    sqlite.prepare("DELETE FROM auth_attempts WHERE resets_at <= ?").run(now);
    const row = sqlite.prepare("SELECT count FROM auth_attempts WHERE login = ?").get(login) as { count: number } | undefined;
    if (row && row.count >= 10) return false;
    sqlite.prepare(`INSERT INTO auth_attempts (login, count, resets_at) VALUES (?, 1, ?)
      ON CONFLICT(login) DO UPDATE SET count = count + 1`).run(login, now + 15 * 60 * 1000);
    return true;
  })();
}
