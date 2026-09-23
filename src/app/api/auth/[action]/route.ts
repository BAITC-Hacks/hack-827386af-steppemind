import { NextResponse } from "next/server";
import { z } from "zod";
import { checkMutation, consumeAuthAttempt, createSession, deleteSession, hashPassword, verifyPassword } from "@/lib/auth";
import { sqlite } from "@/lib/db";
import type { SessionUser } from "@/lib/auth-types";

export const runtime = "nodejs";

const credentials = z.object({
  login: z.string().trim().toLowerCase().min(3).max(40).regex(/^[a-z0-9._-]+$/),
  password: z.string().min(8).max(128),
});
const registration = credentials.extend({
  name: z.string().trim().min(2).max(100),
  role: z.enum(["business", "student"]),
});
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const rejected = checkMutation(request);
  if (rejected) return rejected;
  const { action } = await context.params;
  if (action === "logout") {
    await deleteSession();
    return NextResponse.json({ ok: true });
  }
  if (action !== "login" && action !== "register") return fail("not_found", 404);
  const body = await request.json().catch(() => null);
  const parsed = (action === "register" ? registration : credentials).safeParse(body);
  if (!parsed.success) return fail("invalid_data", 400);
  const { login, password } = parsed.data;
  if (!consumeAuthAttempt(login)) return fail("too_many_attempts", 429);

  let user: SessionUser;
  if (action === "register") {
    const data = registration.parse(body);
    const passwordHash = await hashPassword(password);
    const result = sqlite.prepare(`INSERT INTO accounts (login, name, role, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(login) DO NOTHING`).run(login, data.name, data.role, passwordHash, Date.now());
    if (!result.changes) return fail("login_taken", 409);
    user = { id: Number(result.lastInsertRowid), login, name: data.name, role: data.role };
  } else {
    const account = sqlite.prepare("SELECT id, login, name, role, password_hash FROM accounts WHERE login = ?")
      .get(login) as (SessionUser & { password_hash: string }) | undefined;
    // Derive even when the account is absent to avoid a fast username probe.
    const valid = await verifyPassword(password, account?.password_hash ?? `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`);
    if (!account || !valid) return fail("invalid_credentials", 401);
    user = { id: account.id, login: account.login, name: account.name, role: account.role };
  }
  sqlite.prepare("DELETE FROM auth_attempts WHERE login = ?").run(login);
  await createSession(user);
  return NextResponse.json({ user }, { status: action === "register" ? 201 : 200, headers: { "Cache-Control": "no-store" } });
}
