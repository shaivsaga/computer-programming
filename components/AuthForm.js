"use client";

import { useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Field } from "@astryxdesign/core/Field";
import AuthShell from "./AuthShell";
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
    idleStatus: "Portal gate locked",
  },
  signup: {
    title: "Sign up",
    button: "Create account",
    endpoint: "/api/signup",
    autoComplete: "new-password",
    altText: "Already have an account?",
    altHref: "/login",
    altLabel: "Log in",
    idleStatus: "Portal gate new key",
  },
};

export default function AuthForm({ mode, selectedPlan = "" }) {
  const copy = COPY[mode];
  const submitting = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting.current) return;
    const fields = new FormData(event.currentTarget);
    submitting.current = true;
    setError("");
    setLoading(true);

    try {
      const res = await fetch(copy.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fields.get("email"),
          password: fields.get("password"),
        }),
      });
      if (res.ok) {
        window.location.replace("/dashboard");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong. Try again.");
    } catch {
      setError("Could not reach the server. Try again.");
    }
    submitting.current = false;
    setLoading(false);
  }

  const isSignup = mode === "signup";
  const statusLabel = loading
    ? "Verifying session"
    : passwordFocused
      ? "Entering passkey"
      : copy.idleStatus;

  const altHref = selectedPlan
    ? `${copy.altHref}?plan=${encodeURIComponent(selectedPlan)}`
    : copy.altHref;

  return (
    <AuthShell
      title={copy.title}
      sprite={isSignup ? "key" : "closed"}
      statusLabel={statusLabel}
      planName={selectedPlan}
    >
      <form className="auth-form" method="post" onSubmit={handleSubmit}>
        <Field label="Email" inputID="email">
          <input
            className="credential"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>
        <Field label="Password" inputID="password">
          <input
            className="credential"
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={copy.autoComplete}
            aria-describedby={isSignup ? "password-hint" : undefined}
            minLength={isSignup ? 8 : undefined}
            maxLength={72}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            required
          />
          {isSignup && (
            <p id="password-hint" className="hint">
              At least 8 characters.
            </p>
          )}
        </Field>
        <CheckboxInput
          label="Show password"
          value={showPassword}
          onChange={setShowPassword}
        />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          width="100%"
          isLoading={loading}
          label={loading ? "Please wait…" : copy.button}
        />
      </form>
      <p className="alt">
        {copy.altText} <Link href={altHref}>{copy.altLabel}</Link>
      </p>
    </AuthShell>
  );
}
