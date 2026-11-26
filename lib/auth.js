import crypto from "node:crypto";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

export const SESSION_COOKIE = "session_id";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// Route handlers only: sets the cookie.
export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MS);

  await query("DELETE FROM sessions WHERE expires_at < $1", [new Date()]);
  await query(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
    [hashToken(token), userId, expiresAt]
  );

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

// Safe in server components: only reads the cookie.
export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { rows } = await query(
    `SELECT u.id, u.email
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = $1 AND s.expires_at > $2`,
    [hashToken(token), new Date()]
  );

  return rows[0] ?? null;
}

// Route handlers only: deletes the cookie.
export async function destroySession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await query("DELETE FROM sessions WHERE id = $1", [hashToken(token)]);
  }
  cookies().delete(SESSION_COOKIE);
}
