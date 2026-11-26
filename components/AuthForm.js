"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COPY = {
  login: {
    title: "Log in",
    button: "Log in",
    endpoint: "/api/login",
    autoComplete: "current-password",
    altText: "No account yet?",
    altHref: "/signup",
    altLabel: "Sign up",
  },
  signup: {
    title: "Sign up",
    button: "Create account",
    endpoint: "/api/signup",
    autoComplete: "new-password",
    altText: "Already have an account?",
    altHref: "/login",
    altLabel: "Log in",
  },
};

export default function AuthForm({ mode }) {
  const copy = COPY[mode];
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(copy.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        setLoading(false);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
      setLoading(false);
    }
  }

  return (
    <main className="card">
      <h1>{copy.title}</h1>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete={copy.autoComplete}
            required
            minLength={mode === "signup" ? 8 : undefined}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className="show-password">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />{" "}
            Show password
          </label>
          {mode === "signup" && <p className="hint">At least 8 characters.</p>}
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Please wait…" : copy.button}
        </button>
      </form>

      <p className="alt">
        {copy.altText} <Link href={copy.altHref}>{copy.altLabel}</Link>
      </p>
    </main>
  );
}
