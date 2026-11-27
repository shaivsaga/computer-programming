# Personalized motion choreography design for login-next

## Intent and emotional arc

TaskTracker already ships dark and light themes, an interactive Kanban hero board, a dot calendar, a hold-to-publish flow, and PostgreSQL authentication inside [login-next](file:///home/markus/Documents/CP104/login-next). Right now those screens feel disconnected in motion because most transitions use one generic timing curve and never visualize a messy semester turning orderly.

This design turns the moment chaos becomes clarity into the centerpiece across `/`, `/login`, `/signup`, and `/dashboard`. Every interaction moves a visiting classmate through five deliberate emotional beats:

1. Impressed on arrival and theme switch through stepped pixel shutter entrances and an origin-anchored theme wipe.
2. Curious while exploring through subject-tinted accents, stepped calendar and QR cascades, and a scroll-scrubbed study route trace.
3. In control while learning the product through interruptible fluid FLIP card moves, gliding active tab indicators, and subject-colored flight trails.
4. Relieved emotionally at the opening Desk Triage convergence (`400ms` anticipation followed by `540ms` total span convergence to quiet stillness) and the quiet all-clear burst when visible tasks finish.
5. Confident before opening the portal through persisted theme and subject focus carried into deterministic stepped lock states and a crisp unlock into `/dashboard`.

Chaos-to-clarity carries the longest duration (`400ms` anticipation plus `480ms` per card over `540ms`) and highest visual contrast on the page. Every supporting animation stays at or below `320ms` so nothing competes with the centerpiece.

## Goals, non-goals, and anti-goals

### Goals

- Anchor the landing page around Approach A (auto-resolving opening Desk Triage once per session with optional manual replay).
- Preserve the Pixel Study Hall visual rules (`0px` corners, `2px` hard borders, Royal Blue accent, Warm Paper and Deep Navy themes, Geist Variable and Pixelify Sans Variable).
- Pair stepped `steps()` timing on decorative pixel stamps and lock transitions with fluid spatial FLIP movement on `.task-card` elements.
- Persist `tt_theme` and `tt_focus_subject` across `/`, `/login`, `/signup`, and `/dashboard`, while deriving user identity solely from PostgreSQL `getCurrentUser()`.
- Keep every user control immediately clickable without waiting for any animation timer to finish.
- Maintain `prefers-reduced-motion: reduce` parity, no-JS readable HTML, and graceful fallback when View Transition or Web Animations APIs are absent.

### Non-goals

- Adding Framer Motion, GSAP, Lenis, or any external animation runtime to [package.json](file:///home/markus/Documents/CP104/login-next/package.json).
- Modifying TaskTracker files outside [login-next](file:///home/markus/Documents/CP104/login-next).
- Altering PostgreSQL tables, cookies, API endpoints, or Astryx form submission behavior.
- Synchronizing demo board task statuses into PostgreSQL.

### Anti-goals

- Ambient looping background motion exceeding 5 seconds, violating [WCAG 2.2 SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).
- Dropping below `0px` sharpness with glowing gradients, glass blurs, or overshoot shadows on cards.
- Trading away user legibility or click responsiveness just to chase synthetic zero-paint metrics on stateful UI transitions.
- Introducing DOM reparenting during automatic page load motion that causes Cumulative Layout Shift (`CLS > 0`).

## Constraints and existing invariants

All implementation work must preserve the existing tokens and test gates verified in [globals.css](file:///home/markus/Documents/CP104/login-next/app/globals.css) and [check-routes.mjs](file:///home/markus/Documents/CP104/login-next/scripts/check-routes.mjs).

- **Design tokens.** Preserve [globals.css](file:///home/markus/Documents/CP104/login-next/app/globals.css#L12-L74) tokens `--bg`, `--sf`, `--sf2`, `--ln`, `--tx`, `--mu`, `--ac`, `--acd`, `--ach`, `--acs`, `--onac`, `--ok`, `--wn`, `--er`, `--sh`, `--oa`, and `--ease` (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Layout overflow guard.** Keep `overflow-x: clip` on `body` so `.tb-sentinel` in [TopBar.js](file:///home/markus/Documents/CP104/login-next/components/TopBar.js) fires accurately at `390x844` in dark mode. Horizontal overflow must remain `0px` across `1440x900` and `390x844` in both themes.
- **Subject reel check.** Keep `.reel-track` at `animationName === "none"` under `requestAnimationFrame` scroll scrubbing (`tx < -5` on scroll) and wrap cleanly (`transform: none`) under `prefers-reduced-motion: reduce`.
- **Hit targets and widget groups.** Keep interactive controls at or above `44x44px` click areas, and keep `[role="tablist"], [role="radiogroup"]` counts exact at `4` on `/`, `1` on `/signup`, and `0` on `/login` and `/dashboard`.
- **Typographic hierarchy and controls.** Preserve `.study-root` font overrides (`Pixelify Sans Variable` headings, `Geist Variable` body and controls) in [providers.js](file:///home/markus/Documents/CP104/login-next/app/providers.js) and Astryx form controls (`Field`, `CheckboxInput`, `Button`) in [AuthForm.js](file:///home/markus/Documents/CP104/login-next/components/AuthForm.js).

## Approaches considered, selected option, and benchmark results

### Approaches evaluated

1. **Approach A. Auto-resolving Desk Triage opening plus live FLIP focus (selected).** On initial landing view per browser session, `.board-frame` opens with the 4 deadlines in a compact centered pile for a `400ms` anticipation beat, then converges cleanly (`480ms` per card over a `540ms` total stagger window) into the 3-column Kanban board, accompanied by an optional `Replay triage` button. Picking a subject persists `tt_focus_subject` into `/login`, `/signup`, and `/dashboard`. Every visitor sees disorder turn into calm structure.
2. **Approach B. Filter-triggered clarity lens without an opening pile.** Starts organized from millisecond zero and relies on subject filtering to trigger convergence. Keeps arrival calm, yet passive scrollers miss chaos becoming clarity.
3. **Approach C. Scroll-scrubbed transition band between hero and workflow.** Expands the subject band into a tall vertical scroll sequence. Adds mobile height on `390x844` and shifts weight away from interactive product controls.

### Measured prototype results

Before writing code, three throwaway prototypes ran inside headless Chromium `1248` against the real Next.js production server (`login-next` build `.next/BUILD_ID`) across both `1440x900` and `390x844` viewports on a 12-core Linux host (`uptime` load average `1.28`). Each engineering decision used 5 alternating A/B trials per viewport (`n = 5` per side).

#### Discovery 1. Layout shift fix in Prototype 2

In Run 1, prepending a separate `.proto-triage-pile` element and reparenting `.task-card` DOM nodes back into `.mini-cols` without prior user click generated Cumulative Layout Shift (`CLS`) of `0.17601` at `1440x900` (`20` layouts, `154` paints) and `0.15362` at `390x844` (`18` layouts, `150` paints). Because the `400ms` auto-resolve runs without `hadRecentInput`, Chromium counts existing column and card box shifts as unexpected layout instability.

In Run 2, keeping `.mini-cols` and `.task-card` mounted in their settled layout slots from frame zero and positioning the `400ms` pile using compositor `translate3d` transforms eliminated layout shift (`CLS = 0` across all `20` desktop and mobile runs), reduced `Layout` events from `20` to `4`, and cut `Paint` events from `154` to `17`.

#### Benchmark table (`n = 5` interleaved trials per viewport)

| Prototype comparison | Viewport | Variant | Median layouts (range) | Median paints (range) | Median paintMs (range) | Median CLS | p95FrameMs (range) | maxFrameMs (range) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1. Theme wipe | `1440x900` | `startViewTransition` stepped clip-path | `6` (`6` to `6`) | `47` (`42` to `49`) | `8.74` (`7.33` to `11.49`) | `0` | `66.6` (`50.1` to `83.3`) | `66.6` (`50.1` to `83.3`) |
| 1. Theme wipe | `1440x900` | CSS stepped curtain overlay | `2` (`2` to `2`) | `81` (`75` to `82`) | `14.74` (`12.99` to `16.02`) | `0` | `16.8` (`16.7` to `16.8`) | `33.3` (`16.7` to `33.4`) |
| 1. Theme wipe | `390x844` | `startViewTransition` stepped clip-path | `6` (`6` to `6`) | `77` (`70` to `79`) | `13.04` (`12.39` to `14.96`) | `0` | `16.8` (`16.8` to `33.3`) | `33.4` (`33.3` to `33.4`) |
| 1. Theme wipe | `390x844` | CSS stepped curtain overlay | `2` (`2` to `2`) | `81` (`75` to `81`) | `14.97` (`11.50` to `16.31`) | `0` | `16.7` (`16.7` to `16.8`) | `16.8` (`16.7` to `16.8`) |
| 2. Desk Triage FLIP | `1440x900` | Fluid FLIP + stepped badges | `4` (`4` to `4`) | `17` (`17` to `17`) | `3.21` (`2.89` to `3.25`) | `0` | `16.8` (`16.7` to `16.8`) | `16.8` (`16.8` to `16.8`) |
| 2. Desk Triage FLIP | `1440x900` | Stepped card FLIP | `4` (`4` to `4`) | `17` (`17` to `17`) | `3.63` (`3.01` to `4.07`) | `0` | `16.7` (`16.7` to `16.8`) | `16.8` (`16.7` to `16.8`) |
| 2. Desk Triage FLIP | `390x844` | Fluid FLIP + stepped badges | `4` (`4` to `4`) | `17` (`17` to `17`) | `3.14` (`3.08` to `3.62`) | `0` | `16.7` (`16.7` to `16.7`) | `16.8` (`16.7` to `16.8`) |
| 2. Desk Triage FLIP | `390x844` | Stepped card FLIP | `4` (`4` to `4`) | `17` (`17` to `17`) | `3.55` (`3.13` to `4.75`) | `0` | `16.8` (`16.7` to `16.8`) | `16.8` (`16.7` to `16.8`) |
| 3. All-Clear burst | `1440x900` | Transient 2D `<canvas>` (`18` squares) | `3` (`3` to `3`) | `5` (`5` to `5`) | `0.63` (`0.47` to `0.76`) | `0` | `16.8` (`16.7` to `16.8`) | `16.8` (`16.7` to `16.8`) |
| 3. All-Clear burst | `1440x900` | Inline SVG stroke + ticks | `20` (`19` to `20`) | `34` (`34` to `34`) | `2.63` (`2.49` to `2.71`) | `0` | `16.7` (`16.7` to `16.8`) | `16.8` (`16.7` to `16.8`) |
| 3. All-Clear burst | `390x844` | Transient 2D `<canvas>` (`18` squares) | `3` (`3` to `3`) | `5` (`5` to `5`) | `0.70` (`0.65` to `1.03`) | `0` | `16.7` (`16.7` to `16.8`) | `16.8` (`16.7` to `16.8`) |
| 3. All-Clear burst | `390x844` | Inline SVG stroke + ticks | `20` (`19` to `20`) | `34` (`34` to `34`) | `2.64` (`2.39` to `2.73`) | `0` | `16.7` (`16.7` to `16.8`) | `16.8` (`16.7` to `16.8`) |

### Prototype recommendations and limiters

1. **Theme wipe.** Pick `document.startViewTransition` with stepped `clip-path: inset(...)` (`280ms`, `steps(6, end)`) anchored to the theme toggle button.
   - **Reason.** Reveals the new theme UI directly from the clicked toggle without hiding page text behind an opaque curtain, while cutting desktop paint time by `41%` (`8.74ms` versus `14.74ms`). Rapid double-toggles resolved cleanly via `skipTransition()` in all trials, and removing `startViewTransition` fell back cleanly to an instant `data-theme` swap (`fallbackOk: true`).
   - **Limiter.** Software snapshot upload in Chromium headless shell (`--disable-gpu-compositing`) bounded `maxFrameMs` at `1440x900` (`66.6ms` versus `33.4ms` at `390x844` where pixel area is 4x smaller). Real hardware GPU compositors capture snapshots off the CPU thread.

2. **Desk Triage and FLIP.** Pick transform-only pile inversion with fluid spatial FLIP (`cubic-bezier(0.16, 1, 0.3, 1)`) on cards (`480ms` per card plus `20ms` stagger = `540ms` total) plus stepped decorative badge confirms (`steps(4, end)`, `220ms`).
   - **Reason.** Frame timing hits the `60fps` `16.8ms` vsync floor identically for fluid and stepped card motion across all `20` runs, and fluid card motion fits spatial relocation while stepped badges keep the pixel craft. Mid-anticipation clicks resolved in median `87ms` mobile and `103ms` desktop with `100%` immediate timer cancellation, `0` orphaned ghosts, `0` invisible cards, and exact badge counts after 5 rapid clicks in `500ms`.

3. **Quiet All-Clear completion burst.** Pick transient integer-snapped 2D `<canvas>` (`18` subject-colored squares, `360ms`) plus a quiet status confirmation.
   - **Reason.** Uses `85%` fewer `Layout` events (`3` versus `20`), `85%` fewer `Paint` events (`5` versus `34`), `4x` lower paint time (`0.63ms` versus `2.63ms`), and adds only `+1` temporary fixed DOM node (`+7` for SVG). Both variants cleaned up synchronously on `Reset demo` and showed only the static confirmation under `prefers-reduced-motion: reduce`.

## Motion grammar and five-beat specification

Every animation uses composable GPU transforms, `opacity`, `clip-path`, or 2D canvas drawing. No scroll callback writes CSS transition rules onto scrubbed properties, matching [house-style.md](file:///home/markus/Documents/CP104/.agents/skills/scrolltide-ai-studio/house-style.md#L91).

| Beat and role | Trigger | Targets and files | Mechanism and easing | Duration | Hierarchy rule | Interruption and fallback |
| --- | --- | --- | --- | --- | --- | --- |
| 1. Impressed (arrival) | First page paint on `/` | `.stamp-1`, `.stamp-2`, `.stamp-3` in [LandingClient.js](file:///home/markus/Documents/CP104/login-next/components/LandingClient.js) and [globals.css](file:///home/markus/Documents/CP104/login-next/app/globals.css) | Stepped shutter `clip-path: inset(...)` + `translateY` (`steps(5, end)`) | `260ms`, `40ms` stagger | Subordinate to `.board-frame` triage | Instant visible (`clip-path: none`) on `prefers-reduced-motion: reduce` and no-JS |
| 1. Impressed (theme flip) | Click theme button in [TopBar.js](file:///home/markus/Documents/CP104/login-next/components/TopBar.js) | `:root` snapshot from `.icon-btn` rect via [providers.js](file:///home/markus/Documents/CP104/login-next/app/providers.js) | `startViewTransition` stepped `clip-path: inset(...)` (`steps(6, end)`) | `280ms` | Quick tactile response, never blocks clicks | Calls `skipTransition()` on rapid repeat; instant swap under reduced motion or missing API |
| 2. Curious (exploration) | Scroll and stage explore on `/` | `.reel-track`, `#workflow` `2px` SVG route, `.cal-agenda`, `.qr-cell` in [LandingClient.js](file:///home/markus/Documents/CP104/login-next/components/LandingClient.js) | Single `rAF` scroll loop writes `.reel-track` `translate3d` and SVG route `stroke-dashoffset`; stepped agenda/QR cell cascades (`steps(4, end)`) | `0ms` scrub, `180ms` cascade | Subordinate textures that pause cleanly when user stops | Route renders static full (`stroke-dashoffset: 0`) under reduced motion and mobile `<= 920px` |
| 3. In control (product) | Filter click, Board/List toggle, task advance | `.task-card`, `.seg-item`, `.stage-tab`, `.motion-ghost` in [LandingClient.js](file:///home/markus/Documents/CP104/login-next/components/LandingClient.js) | FLIP card reflow (`cubic-bezier(0.16, 1, 0.3, 1)`), active indicator glide (`180ms`), `flyCardToBadge` tinted with `SUBJECT_BG_MAP` | `260ms` filter FLIP, `320ms` card flight | Direct manipulation response, crisper and shorter than triage | Registry cancels active WAAPI handles before capturing next rects |
| 4. Relieved (centerpiece) | Auto once per session on `/` load or `Replay triage` | `.task-card`, `.mini-col`, `.count-badge`, `.triage-pill` inside `.board-frame` | `400ms` stepped anticipation press (`steps(3, end)`), then `480ms` card FLIP (`20ms` stagger, `540ms` total, `cubic-bezier(0.16, 1, 0.3, 1)`), stepped badge pop (`steps(4, end)`) | `400ms` wait + `540ms` span | Main centerpiece; settles into complete stillness | Any pointer or key inside `.board-frame` cancels immediately and executes input in one event |
| 4. Relieved (all clear) | All visible tasks in `Done` | `.board-frame` overlay canvas + quiet status slot | Transient integer-snapped `<canvas>` (`18` squares from `SUBJECT_BG_MAP`) + calm status line | `360ms` burst, static note stays | Rewards completion without noisy shaking | Removed cleanly on `Reset demo` / filter switch; text-only under reduced motion |
| 5. Confident (portal unlock) | Route switch, typing, submit, logout | `.art-card`, `.lock-sprite`, `.check-draw-path` in [AuthShell.js](file:///home/markus/Documents/CP104/login-next/components/AuthShell.js) and [AuthForm.js](file:///home/markus/Documents/CP104/login-next/components/AuthForm.js) | Focus/peek stepped border and lock badge transitions (`steps(4, end)`, `180ms`), `fieldShake` (`320ms`) on error, SVG `checkDraw` unlock (`220ms`) | `180ms` to `260ms` | Confirms PostgreSQL session security without delay | Reduced motion skips `220ms` redirect wait cleanly (`window.location.replace`) |

## Desk triage state machine and personalization contract

### Desk Triage finite state machine

The centerpiece uses an explicit state variable `triagePhase` (`"pile" | "converging" | "settled"`) inside [LandingClient.js](file:///home/markus/Documents/CP104/login-next/components/LandingClient.js), managed with helpers from `lib/motion.js`:

1. **Hydration-safe first paint.** Server rendering outputs `"settled"` semantics (`To Do (3)`, `In Progress (1)`, `Done (0)` inside `.mini-cols`) so SSR HTML matches React's initial hydration tree with zero console mismatch warnings and works cleanly with JavaScript disabled.
2. **Zero-flash pre-paint handoff.** Inline `THEME_INIT_SCRIPT` in [layout.js](file:///home/markus/Documents/CP104/login-next/app/layout.js) sets `document.documentElement.dataset.triage = "pending"` only when `window.location.pathname === "/"`, `!window.matchMedia("(prefers-reduced-motion: reduce)").matches`, and `sessionStorage.getItem("tt_triage_seen") !== "1"` (with a `1500ms` failsafe timeout clearing `data-triage` if mounting ever stalls). While `data-triage="pending"`, CSS hides `.mini-col-hd` opacity and column chrome only (keeping `.task-card` elements rendered and accessible).
3. **Pile anticipation (`400ms`).** Before paint in `useLayoutEffect`, [LandingClient.js](file:///home/markus/Documents/CP104/login-next/components/LandingClient.js) reads `data-triage === "pending"`, clears `data-triage`, records `sessionStorage.setItem("tt_triage_seen", "1")` safely inside `try/catch`, sets `triagePhase = "pile"`, aligns all 4 visible `.task-card` nodes at centered stack coordinates using compositor `translate3d` offsets (no DOM reparenting, `CLS === 0`), shows the compact `triage-pill` hint inside `.board-hint`, and plays a `400ms` `steps(3, end)` subtle press (`-4px` lift at the end of anticipation).
4. **Convergence (`540ms` total span).** After `400ms`, cards animate cleanly from their pile offsets back to `translate3d(0px, 0px, 0)` over `480ms` per card (`20ms` stagger across 4 cards = `540ms` total span) using `cubic-bezier(0.16, 1, 0.3, 1)`, while `.mini-col-hd` fades in over `240ms` and `.count-badge` pops using `steps(4, end)`. On finish, `triagePhase` becomes `"settled"` and cancels inline WAAPI transforms cleanly.
5. **Non-blocking cancellation without tap drift.** Clicking controls inside `.board-chrome` or `.board-toolbar` cancels `triagePhase` immediately on `onPointerDownCapture` or `onKeyDownCapture` because those controls do not shift when cards settle. Clicking `.task-check` inside `.board-body` during `"pile"` or `"converging"` cancels triage inside `onClickCapture` and `handleAdvanceTask` rather than `onPointerDown`, so a tapped card stays stationary between `pointerdown` and `pointerup` and never drops a click.
6. **Manual `Replay triage` button (builder call).** Placed as a plain `<button type="button" className="btn-secondary btn-compact">` right beside `Reset demo` inside `.board-chrome` so widget group counts stay untouched (`4` on `/`). Clicking `Replay triage` switches `heroView` to `"board"` if `"list"`, resets `heroFilter` to `"ALL"` only if fewer than 2 tasks are currently visible so multi-card convergence stays legible, keeps existing task completion statuses intact, and replays `"pile"` to `"converging"` to `"settled"`. Under `prefers-reduced-motion: reduce`, clicking `Replay triage` keeps the board static and shows the toast `"Reduced motion active: board stays settled"`. Clicking `Reset demo` restores `INITIAL_HERO_TASKS`, resets `heroFilter` to `"ALL"`, resets `focusSubject` to `"ALL"`, cancels active bursts and FLIPs, and lands cleanly on `"settled"`.

### Cross-route personalization and identity contract

- **`tt_theme` (`localStorage`, existing).** Managed by `Providers` in [providers.js](file:///home/markus/Documents/CP104/login-next/app/providers.js) and `THEME_INIT_SCRIPT` in [layout.js](file:///home/markus/Documents/CP104/login-next/app/layout.js). Toggling inside [TopBar.js](file:///home/markus/Documents/CP104/login-next/components/TopBar.js) reads the button bounding box and wraps synchronous DOM `dataset.theme` update (`flushSync` inside callback) in the `280ms` stepped `startViewTransition` clip-path wipe when enabled and supported.
- **`tt_focus_subject` (`localStorage`, new).** Validated strictly against `"ALL"` and `SUBJECTS[].code` from [landing-data.js](file:///home/markus/Documents/CP104/login-next/lib/landing-data.js); invalid or unreadable storage falls back cleanly to `"ALL"`.
  - On every `/` load, `heroFilter` initializes at `"ALL"` so all 4 demo tasks always appear cleanly on the board and returning visitors do not land on a 1-card pre-filtered demo.
  - Choosing a hero subject filter radio updates both local `heroFilter` and global `tt_focus_subject`.
  - In `.reel-track`, making each `.ticker-chip` a clickable `<button type="button" aria-pressed={focusSubject === subject.code}>` (`min-height: 44px`, not a tablist or radiogroup) updates `tt_focus_subject`. If the subject belongs to `HERO_FILTERS`, it also syncs `heroFilter`; otherwise it keeps visible hero tasks intact while updating `--focus-subj-bg` and highlighting matching dots inside Calm Calendar.
  - Across `/login`, `/signup`, and `/dashboard`, `AuthShell` becomes a client component reading `useStudyTheme()` post-mount (`useEffect` sync prevents SSR hydration mismatch) and displays a compact `Focus: <code>` indicator beside `Plan: ...` with a `2px` subject swatch strip on `.art-card` when `focusSubject !== "ALL"`. Royal Blue (`--ac`) stays unchanged on all primary actions and focus rings.
- **Authenticated PostgreSQL session.** Derived solely on the server via `getCurrentUser()` in [page.js](file:///home/markus/Documents/CP104/login-next/app/page.js) and [dashboard/page.js](file:///home/markus/Documents/CP104/login-next/app/dashboard/page.js), never written to `localStorage`. When signed in, `/` displays the user's email inside the account CTA and `/dashboard` lands directly in the calm unlocked state with `Session active`.

## Target file map (post-approval implementation scope)

- `lib/motion.js` (new). Exports `prefersReducedMotion()`, `captureRects()`, `playFlip()`, active WAAPI cancellation registry, transient 2D canvas pixel burst helper, and safe `tt_focus_subject` and `tt_triage_seen` storage parsers.
- [app/layout.js](file:///home/markus/Documents/CP104/login-next/app/layout.js). Extends `THEME_INIT_SCRIPT` for `/` `data-triage="pending"` detection and `1500ms` failsafe cleanup.
- [app/providers.js](file:///home/markus/Documents/CP104/login-next/app/providers.js). Holds `focusSubject` state, sets `--focus-subj-bg` on `.study-root` post-mount, and wraps theme flip in `startViewTransition` stepped clip-path using toggle coordinates.
- [components/TopBar.js](file:///home/markus/Documents/CP104/login-next/components/TopBar.js). Passes `.icon-btn` `getBoundingClientRect()` coordinates to `toggleTheme(originRect)`.
- [components/LandingClient.js](file:///home/markus/Documents/CP104/login-next/components/LandingClient.js). Runs Desk Triage FSM, non-blocking cancel handlers, `Replay triage` button, live FLIP on filter, view, and task moves, subject-tinted `flyCardToBadge`, `#workflow` scroll-scrubbed `2px` SVG route, interactive subject reel chips, stepped calendar and QR cascades, and transient `<canvas>` all-clear burst.
- [components/AuthShell.js](file:///home/markus/Documents/CP104/login-next/components/AuthShell.js) and [components/AuthForm.js](file:///home/markus/Documents/CP104/login-next/components/AuthForm.js). Reads `focusSubject` context, shows subject continuity swatch and stepped lock-state transitions, and preserves `fieldShake` and `220ms` unlock checkmark draw.
- [app/globals.css](file:///home/markus/Documents/CP104/login-next/app/globals.css). Adds `::view-transition-*` stepped clip-path wipe, `[data-triage="pending"]` pre-paint header styling, workflow SVG study route styles, stepped shutter reveals, active sliding pill, clickable `.ticker-chip` `44px` hit target rules, and matching `@media (prefers-reduced-motion: reduce)` resets.
- [scripts/check-routes.mjs](file:///home/markus/Documents/CP104/login-next/scripts/check-routes.mjs). Adds automated checks for Desk Triage once-per-session behavior, zero automatic CLS, mid-anticipation immediate click, rapid 5-click interruption hygiene, `tt_focus_subject` persistence across `/login` and `/signup`, and reduced-motion parity.

## Split between user decisions and builder calls

| Decision | Owner | Choice fixed |
| --- | --- | --- |
| Chaos-to-clarity mechanism | User | Approach A (`400ms` pile anticipation plus `480` to `550ms` convergence, once per session, manual replay) |
| Subordinate hierarchy and non-blocking input | User | Triage centerpiece dominates; clicks never delayed |
| Stepped decorative vs fluid card motion | User | Stepped `steps()` on stamps, locks, and wipes; fluid `cubic-bezier(0.16, 1, 0.3, 1)` on `.task-card` FLIP |
| Persistence boundary | User | Theme and focus subject in `localStorage`; session identity from PostgreSQL only |
| Theme wipe implementation | Builder call | `startViewTransition` stepped `clip-path: inset(...)` (`280ms`, `steps(6, end)`), instant fallback |
| Zero-CLS triage mechanism and timing | Builder call | Compositor `translate3d` pile inversion (zero DOM reparenting); `480ms` card FLIP plus `20ms` stagger (`540ms` total span) |
| All-clear burst implementation | Builder call | Transient integer-snapped 2D `<canvas>` (`18` squares, `360ms`) |
| `Replay triage`, tap safety, and filter rules | Builder call | Plain `<button>` beside `Reset demo`; `onClickCapture` settle inside `.board-body` prevents card tap drift; `/` loads with `heroFilter = "ALL"` while restoring `tt_focus_subject`; `Reset demo` clears both to `"ALL"` |
| Hydration and context placement | Builder call | `AuthShell` becomes a client component reading `tt_focus_subject` in `useEffect` post-mount |

## Verification plan

After building against the approved plan, verify everything in one clean pipeline against a fresh `npm run build` (`6/6` routes) and disposable PostgreSQL container.

1. Extend and pass `node scripts/check-routes.mjs` across `1440x900` and `390x844` in `light` and `dark` themes to verify zero console, page, or HTTP errors, `0px` horizontal overflow, font checks, keyboard navigation, Desk Triage once-per-session replay, mid-anticipation click responsiveness, 5-click FLIP interruption hygiene, `tt_focus_subject` cross-route persistence, `prefers-reduced-motion: reduce` parity, and full PostgreSQL auth round-trips.
2. Run a focused Chromium CDP measurement pass on the finished build confirming `CLS === 0` during automatic Desk Triage, healthy frame pacing on theme wipe and card FLIP, and zero leftover `.motion-ghost` or `<canvas>` elements.
3. Review desktop (`1440x900`) and mobile (`390x844`) captures of arrival pile, settled clarity, theme wipe, and `/signup` focus continuity in both light and dark modes (delegating image inspection to keep main coding context clean).
