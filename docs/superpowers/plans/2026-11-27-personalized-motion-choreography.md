# Personalized motion choreography implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the five-beat personalized state choreography system across `/`, `/login`, `/signup`, and `/dashboard` inside `login-next`, anchored around the non-blocking Desk Triage chaos-to-clarity centerpiece.

**Architecture:** Extract a focused browser motion utility module (`lib/motion.js`) backed by native WAAPI FLIP, `document.startViewTransition` stepped wipes, a transient integer-snapped 2D `<canvas>` burst, and safe storage parsers. Wire cross-route `tt_theme` and `tt_focus_subject` state through React context post-mount so SSR and hydration stay warning-free, while server-side PostgreSQL identity stays strictly in `getCurrentUser()`.

**Tech Stack:** Next.js 16.4.6 App Router, React 19.3.1 (`flushSync`, `useLayoutEffect`), CSS custom properties + `@keyframes steps()`, Web Animations API, View Transition API, 2D Canvas, Playwright + PostgreSQL (`scripts/check-routes.mjs`).

**Spec:** [2026-11-27-personalized-motion-choreography-design.md](file:///home/markus/Documents/CP104/login-next/docs/superpowers/specs/2026-11-27-personalized-motion-choreography-design.md)

## Global Constraints

- Work strictly inside `/home/markus/Documents/CP104/login-next`; never edit TaskTracker, `lib/auth.js`, `lib/db.js`, `lib/validate.js`, `sql/*`, `app/api/*`, or `package.json`.
- Preserve `0px` corners, `2px` hard borders, Warm Paper and Deep Navy tokens, Royal Blue (`--ac`) on primary CTAs and focus rings, Geist Variable + Pixelify Sans Variable fonts, Astryx form controls, and `body { overflow-x: clip }`.
- Keep `.reel-track` `animationName === "none"` under single-`rAF` scrub, interactive targets at least `44x44px`, `[role="tablist"], [role="radiogroup"]` counts at `4` on `/` and `1` on `/signup`, and `0px` horizontal overflow across `1440x900` and `390x844`.
- Maintain full `prefers-reduced-motion: reduce` parity, no-JS readable HTML, zero console hydration warnings, and `CLS === 0` during automatic Desk Triage.

## Review Focus

1. Tap inside `.board-body` during `400ms` triage pile anticipation causes `.task-card` to snap on `pointerdown` before `mouseup`, dropping the click. Settle `.board-body` clicks on `onClickCapture` / handler instead of `onPointerDown`, while cancelling `.board-chrome` / `.board-toolbar` clicks on `onPointerDownCapture`.
2. Returning visitor has `tt_focus_subject = "CP104"` stored in `localStorage` from a prior visit and opens `/`. Keep initial `heroFilter` at `"ALL"` on `/` mount so the full 4-task board appears while `tt_focus_subject` tints focus markers cleanly.
3. Unrecognized or threw `localStorage` / `sessionStorage` values (private browsing or corrupted string). Wrap all storage reads/writes in `try/catch` and normalize against `"ALL"` plus `SUBJECTS` codes.
4. Rapid double-clicks on theme toggle or 5 clicks inside `500ms` across board filters, `Board`/`List`, and `.task-check`. Cancel active `ViewTransition` via `skipTransition()` and active WAAPI animations via `createAnimationRegistry()` before starting new ones, and remove `.motion-ghost` on both `onfinish` and `oncancel`.
5. Pre-paint `data-triage="pending"` attribute stuck if hydration delays or script aborts, or firing under reduced motion. Gate `THEME_INIT_SCRIPT` strictly on `pathname === "/"` plus `!prefersReducedMotion()` plus `tt_triage_seen !== "1"` with a `1500ms` cleanup timeout and CSS fallback hiding only `.mini-col-hd` opacity, never hiding `.task-card`.

---

### Task 1: Shared motion utility module (`lib/motion.js`)

**Files:**
- Create: `lib/motion.js`
- Verify via: `scripts/check-routes.mjs` (in Task 5)

**Interfaces:**
- Consumes: `SUBJECT_BG_MAP` from `@/lib/landing-data`
- Produces: timing constants (`TRIAGE_ANTICIPATION_MS`, `TRIAGE_CARD_MS`, `TRIAGE_STAGGER_MS`, `THEME_WIPE_MS`, `FLIP_REFLOW_MS`, `FLIGHT_CARD_MS`, `ALL_CLEAR_BURST_MS`, `UNLOCK_REDIRECT_MS`, `FLUID_EASE`), `prefersReducedMotion()`, `normalizeFocusSubject(value)`, `readFocusSubject()`, `writeFocusSubject(value)`, `hasSeenTriage()`, `markTriageSeen()`, `createAnimationRegistry()`, `captureRects(container, selector)`, `playFlip(container, prevRects, options)`, `playIndicatorGlide(container, prevRect, options)`, `spawnAllClearCanvasBurst(anchorEl, colors, options)`

- [x] Export timing constants matching spec values (`400ms` anticipation, `480ms` card + `20ms` stagger = `540ms` total span, `280ms` theme wipe, `260ms` FLIP, `320ms` flight, `360ms` canvas burst, `220ms` unlock redirect).
- [x] Implement storage parsers wrapped in `try/catch`, `createAnimationRegistry()` tracking live `Animation` instances, compositor-only `playFlip` using `fill: "backwards"` so finished cards never retain inline transform locks against `:hover`, and `spawnAllClearCanvasBurst` drawing `18` integer-snapped squares over `360ms` with synchronous `cancel()` removal.

### Task 2: Pre-paint gating, ViewTransition theme wipe, and focus context

**Files:**
- Modify: `app/layout.js`
- Modify: `app/providers.js`
- Modify: `components/TopBar.js`

**Interfaces:**
- Consumes: `SUBJECT_BG_MAP`, `lib/motion` helpers
- Produces: `useStudyTheme()` returning `{ theme, toggleTheme, focusSubject, setFocusSubject }`

- [x] Extend `THEME_INIT_SCRIPT` in `app/layout.js` to set `data-triage="pending"` on `/` when `sessionStorage.tt_triage_seen !== "1"` and `!prefersReducedMotion`, with a `1500ms` failsafe cleanup.
- [x] Update `app/providers.js` to sync `focusSubject` post-mount in `useEffect` (zero SSR hydration mismatch), set `--focus-subj-bg` on `.study-root`, and wrap theme toggles in `document.startViewTransition(() => flushSync(apply))` using `.icon-btn` rect origin with `skipTransition()` cleanup and instant fallback.
- [x] Update `TopBar.js` to pass `event.currentTarget.getBoundingClientRect()` to `toggleTheme`.

### Task 3: Desk Triage centerpiece, subordinate exploration beats, and live FLIP

**Files:**
- Modify: `components/LandingClient.js`

**Interfaces:**
- Consumes: `useStudyTheme()`, `lib/motion` helpers
- Produces: `data-triage-phase`, `Replay triage` button, interactive `44px` `.ticker-chip` focus triggers, scroll-scrubbed `#workflow` SVG route, quiet all-clear burst

- [x] Implement `triagePhase` state machine (`"pile" | "converging" | "settled"`) with `translate3d` centered stack inversion inside `.board-body` (`CLS === 0`), non-blocking cancellation (`onPointerDownCapture` on chrome/toolbar, `onClickCapture` inside `.board-body` to avoid tap drift), and manual `Replay triage` button.
- [x] Wire interruptible FLIP across filters/views/task moves, gliding `.seg-active-glide` indicator, subject-tinted `flyCardToBadge` cleaning up ghosts on both `onfinish` and `oncancel`, transient 2D `<canvas>` all-clear burst, clickable `.ticker-chip` focus controls, Calm Calendar focus highlights, QR stepped cascade, and single-`rAF` `#workflow` SVG path draw.

### Task 4: Auth route continuity and Pixel Study Hall motion styles

**Files:**
- Modify: `components/AuthShell.js`
- Modify: `components/AuthForm.js`
- Modify: `app/dashboard/page.js`
- Modify: `app/globals.css`

- [x] Convert `AuthShell.js` to client component reading `focusSubject` post-mount, rendering crisp `Focus: <code>` status alongside `Plan: ...` with subject swatch accent, and pass `lockState="unlocked"` in `app/dashboard/page.js`.
- [x] Share `prefersReducedMotion()` and `UNLOCK_REDIRECT_MS` from `lib/motion.js` inside `AuthForm.js`.
- [x] Add `::view-transition-*` stepped clip-path wipe, `[data-triage="pending"]` pre-paint header opacity rules, stepped `.stamp-*`/`.reveal` shutters, `.seg-active-glide`, `#workflow` SVG route rules, `.ticker-chip` `44px` hit rules, calendar/QR focus states, and full `@media (prefers-reduced-motion: reduce)` parity in `app/globals.css`.

### Task 5: End-to-end automated verification and CDP trace check

**Files:**
- Modify: `scripts/check-routes.mjs`

- [x] Add automated assertions covering Desk Triage once-per-session auto-resolve, `CLS === 0`, mid-anticipation immediate click, 5-click rapid FLIP hygiene (`0` ghosts, `0` invisible cards, exact counts), all-clear burst cleanup, `tt_focus_subject` cross-route persistence to `/login` and `/signup`, and reduced-motion parity.
- [x] Run `npm run build` (`6/6` routes) and execute `scripts/check-routes.mjs` against disposable PostgreSQL (`e17e86066e5e`) across `1440x900` and `390x844` in `light` and `dark` themes with `0` console/page/HTTP errors.
