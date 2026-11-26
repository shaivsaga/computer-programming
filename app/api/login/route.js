import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { readCredentials } from "@/lib/validate";

const INVALID = "Invalid email or password.";

// Compared against when the email doesn't exist, so both failure paths take
// about the same time.
let dummyHash;
const getDummyHash = () =>
  (dummyHash ??= bcrypt.hashSync("not-a-real-password", 12));

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const creds = readCredentials(body);
  if (creds.error || !creds.password || creds.password.length > 200) {
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT id, password_hash FROM users WHERE email = ?",
      [creds.email]
    );
    const user = rows[0];

    const ok = await bcrypt.compare(
      creds.password,
      user ? user.password_hash : getDummyHash()
    );

    if (!user || !ok) {
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("login failed:", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
