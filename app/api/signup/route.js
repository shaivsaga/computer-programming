import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { readCredentials, passwordProblem } from "@/lib/validate";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const creds = readCredentials(body);
  if (creds.error) {
    return NextResponse.json({ error: creds.error }, { status: 400 });
  }

  const problem = passwordProblem(creds.password);
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(creds.password, 12);
    const [result] = await pool.execute(
      "INSERT INTO users (email, password_hash) VALUES (?, ?)",
      [creds.email, passwordHash]
    );
    await createSession(result.insertId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "That email is already in use." },
        { status: 409 }
      );
    }
    console.error("signup failed:", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
