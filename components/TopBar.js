"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStudyTheme } from "@/app/providers";

function BrandMark() {
  return (
    <svg
      className="brand-mark"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="4" y="0" width="2" height="1" fill="#14183A" />
      <rect x="10" y="0" width="2" height="1" fill="#14183A" />
      <rect x="2" y="1" width="12" height="1" fill="#14183A" />
      <rect x="1" y="2" width="1" height="11" fill="#14183A" />
      <rect x="14" y="2" width="1" height="11" fill="#14183A" />
      <rect x="2" y="2" width="12" height="1" fill="#4D7CFF" />
      <rect x="2" y="3" width="12" height="10" fill="#2E4FB3" />
      <rect x="11" y="4" width="2" height="1" fill="#FFFFFF" />
      <rect x="10" y="5" width="2" height="1" fill="#FFFFFF" />
      <rect x="3" y="6" width="2" height="1" fill="#FFFFFF" />
      <rect x="9" y="6" width="2" height="1" fill="#FFFFFF" />
      <rect x="4" y="7" width="2" height="1" fill="#FFFFFF" />
      <rect x="8" y="7" width="2" height="1" fill="#FFFFFF" />
      <rect x="5" y="8" width="4" height="1" fill="#FFFFFF" />
      <rect x="6" y="9" width="2" height="1" fill="#FFFFFF" />
      <rect x="3" y="11" width="2" height="2" fill="#C9D6FF" />
      <rect x="7" y="11" width="2" height="2" fill="#F7CD54" />
      <rect x="11" y="11" width="2" height="2" fill="#5BD08A" />
      <rect x="2" y="13" width="12" height="1" fill="#1F3A8A" />
      <rect x="2" y="14" width="12" height="1" fill="#14183A" />
    </svg>
  );
}

export default function TopBar({
  isLanding = false,
  isSignedIn = false,
  activeSection = "top",
  onThemeSwitch,
}) {
  const { theme, toggleTheme } = useStudyTheme();
  const [moved, setMoved] = useState(false);
  const sentinelRef = useRef(null);

  // Toggle continuum header surface via an 8px top sentinel without per-scroll layout reads.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setMoved(!entry.isIntersecting);
        }
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  function handleThemeClick() {
    const next = theme === "light" ? "dark" : "light";
    toggleTheme();
    if (onThemeSwitch) {
      onThemeSwitch(next);
    }
  }

  return (
    <>
      <div ref={sentinelRef} className="tb-sentinel" aria-hidden="true" />
      <header className="tb" data-moved={moved ? "true" : "false"}>
        <div className="tb-inner">
          <Link className="brand" href="/">
            <BrandMark />
            <span className="brand-name">TaskTracker</span>
          </Link>

          {isLanding ? (
            <nav className="nav-links" aria-label="Primary">
              <a
                className={`nav-link${activeSection === "top" ? " is-active" : ""}`}
                href="#top"
              >
                Overview
              </a>
              <a
                className={`nav-link${activeSection === "workflow" ? " is-active" : ""}`}
                href="#workflow"
              >
                Workflow
              </a>
              <a
                className={`nav-link${activeSection === "pricing" ? " is-active" : ""}`}
                href="#pricing"
              >
                Plans
              </a>
            </nav>
          ) : (
            <nav className="nav-links" aria-label="Primary">
              <Link className="nav-link" href="/">
                Overview
              </Link>
              <Link className="nav-link" href="/#workflow">
                Workflow
              </Link>
              <Link className="nav-link" href="/#pricing">
                Plans
              </Link>
            </nav>
          )}

          <div className="tb-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={handleThemeClick}
              aria-label={
                theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
              }
              title={
                theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
              }
            >
              {theme === "dark" ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  aria-hidden="true"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {isSignedIn ? (
              <Link className="btn-primary btn-sm" href="/dashboard">
                Account
              </Link>
            ) : (
              <>
                <Link className="btn-secondary btn-sm nav-login-btn" href="/login">
                  Log in
                </Link>
                <Link className="btn-primary btn-sm" href="/signup">
                  Start free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
