"use client";

import Image from "next/image";
import TopBar from "./TopBar";
import { useStudyTheme } from "@/app/providers";
import { SUBJECT_BG_MAP } from "@/lib/landing-data";

export default function AuthShell({
  title,
  sprite,
  isSignedIn = false,
  statusLabel,
  lockState = "idle",
  planName,
  children,
}) {
  const { focusSubject } = useStudyTheme();
  const hasFocus = focusSubject !== "ALL" && SUBJECT_BG_MAP[focusSubject];

  return (
    <div className="auth-page pixel-grid-bg">
      <TopBar isSignedIn={isSignedIn} />
      <main className="auth-shell">
        <div className="auth-layout">
          <div className="art-stage">
            <div
              className="art-card"
              data-lock-state={lockState}
              data-focus-active={hasFocus ? "true" : undefined}
            >
              <div className="art-card-head">
                <span className="art-status" aria-live="polite">
                  {lockState === "unlocked" && (
                    <svg
                      className="check-draw-svg"
                      width="16"
                      height="16"
                      viewBox="0 0 18 18"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        className="check-draw-path"
                        pathLength="1"
                        d="M3.5 9.5L7.2 13.2L14.5 5"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="square"
                      />
                    </svg>
                  )}
                  <span>{statusLabel}</span>
                </span>
                <div className="art-meta-group">
                  {hasFocus && (
                    <span
                      className="art-focus"
                      data-focus-subject={focusSubject}
                    >
                      <span
                        className="art-focus-swatch"
                        style={{ backgroundColor: SUBJECT_BG_MAP[focusSubject] }}
                        aria-hidden="true"
                      />
                      Focus: {focusSubject}
                    </span>
                  )}
                  {planName && <span className="art-plan">Plan: {planName}</span>}
                </div>
              </div>
              <div className="art-canvas">
                <Image
                  className="lock-sprite"
                  src={`/art/lock-${lockState === "unlocked" ? "open" : sprite}.png`}
                  alt=""
                  width={380}
                  height={296}
                  loading="eager"
                  unoptimized
                />
              </div>
              <p className="art-caption">
                Sign in with your section email to access your PostgreSQL-backed
                account session.
              </p>
            </div>
          </div>

          <section className="auth-panel" aria-labelledby="screen-title">
            <h1 id="screen-title">{title}</h1>
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}
