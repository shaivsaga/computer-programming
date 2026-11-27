"use client";

import { useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Field } from "@astryxdesign/core/Field";
import AuthShell from "./AuthShell";
import Link from "next/link";
import { navigateOptions } from "@/lib/keyboard";
import { PRICING_PLANS } from "@/lib/landing-data";
import { prefersReducedMotion, UNLOCK_REDIRECT_MS } from "@/lib/motion";

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

function resolveInitialPlan(selectedPlan) {
  const match = PRICING_PLANS.find((plan) => plan.name === selectedPlan);
  return match ? match.name : PRICING_PLANS[0].name;
}

export default function AuthForm({ mode, selectedPlan = "" }) {
  const copy = COPY[mode];
  const isSignup = mode === "signup";
  const submitting = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [chosenPlan, setChosenPlan] = useState(() =>
    isSignup ? resolveInitialPlan(selectedPlan) : selectedPlan
  );
  const [error, setError] = useState("");
  const [shakeCount, setShakeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

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
        setUnlocked(true);
        if (prefersReducedMotion()) {
          window.location.replace("/dashboard");
        } else {
          setTimeout(() => {
            window.location.replace("/dashboard");
          }, UNLOCK_REDIRECT_MS);
        }
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong. Try again.");
      setShakeCount((count) => count + 1);
    } catch {
      setError("Could not reach the server. Try again.");
      setShakeCount((count) => count + 1);
    }
    submitting.current = false;
    setLoading(false);
  }

  let lockState = "idle";
  let statusLabel = copy.idleStatus;
  if (unlocked) {
    lockState = "unlocked";
    statusLabel = "Portal gate unlocked";
  } else if (loading) {
    lockState = "verifying";
    statusLabel = "Verifying session";
  } else if (error) {
    lockState = "error";
    statusLabel = "Check credentials";
  } else if (showPassword) {
    lockState = "peeking";
    statusLabel = "Passkey visible";
  } else if (passwordFocused) {
    lockState = "typing";
    statusLabel = "Entering passkey";
  }

  const altHref = chosenPlan
    ? `${copy.altHref}?plan=${encodeURIComponent(chosenPlan)}`
    : copy.altHref;

  return (
    <AuthShell
      title={copy.title}
      sprite={isSignup ? "key" : "closed"}
      statusLabel={statusLabel}
      lockState={lockState}
      planName={chosenPlan}
    >
      <form
        className={`auth-form${shakeCount > 0 && error ? " is-shaking" : ""}`}
        data-shake-count={shakeCount}
        method="post"
        onSubmit={handleSubmit}
      >
        {isSignup && (
          <div className="tier-group-wrap">
            <span className="tier-group-label" id="signup-tier-label">
              Study hall tier
            </span>
            <div
              className="tier-rows"
              role="radiogroup"
              aria-labelledby="signup-tier-label"
              aria-orientation="vertical"
              onKeyDown={navigateOptions}
            >
              {PRICING_PLANS.map((plan) => {
                const active = chosenPlan === plan.name;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    tabIndex={active ? 0 : -1}
                    className={`tier-row${active ? " is-active" : ""}`}
                    onClick={() => setChosenPlan(plan.name)}
                  >
                    <span className="tier-radio" aria-hidden="true" />
                    <span className="tier-row-name">{plan.name}</span>
                    <span className="tier-row-price">{plan.termPrice}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Field label="Email" inputID="email">
          <input
            className={`credential${error ? " is-invalid" : ""}`}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(error) || undefined}
            required
          />
        </Field>
        <Field label="Password" inputID="password">
          <input
            className={`credential${error ? " is-invalid" : ""}`}
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={copy.autoComplete}
            aria-describedby={isSignup ? "password-hint" : undefined}
            aria-invalid={Boolean(error) || undefined}
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
        <div className="auth-submit-slot">
          <Button
            type="submit"
            variant="primary"
            width="100%"
            isLoading={loading && !unlocked}
            label={
              unlocked
                ? "Unlocked…"
                : loading
                  ? "Please wait…"
                  : copy.button
            }
          />
        </div>
      </form>
      <p className="alt">
        {copy.altText} <Link href={altHref}>{copy.altLabel}</Link>
      </p>
    </AuthShell>
  );
}
