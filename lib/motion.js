import { SUBJECT_BG_MAP } from "./landing-data";

export const FOCUS_SUBJECT_STORAGE_KEY = "tt_focus_subject";
export const TRIAGE_SEEN_SESSION_KEY = "tt_triage_seen";

export const TRIAGE_ANTICIPATION_MS = 400;
export const TRIAGE_CARD_MS = 480;
export const TRIAGE_STAGGER_MS = 20;
export const THEME_WIPE_MS = 280;
export const FLIP_REFLOW_MS = 260;
export const FLIGHT_CARD_MS = 320;
export const ALL_CLEAR_BURST_MS = 360;
export const UNLOCK_REDIRECT_MS = 220;

export const FLUID_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
export const STEPPED_UI_EASE = "steps(4, end)";

export function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function normalizeFocusSubject(value) {
  if (
    typeof value === "string" &&
    value !== "ALL" &&
    Object.prototype.hasOwnProperty.call(SUBJECT_BG_MAP, value)
  ) {
    return value;
  }
  return "ALL";
}

export function readFocusSubject() {
  if (typeof window === "undefined") return "ALL";
  try {
    return normalizeFocusSubject(
      window.localStorage.getItem(FOCUS_SUBJECT_STORAGE_KEY)
    );
  } catch {
    return "ALL";
  }
}

export function writeFocusSubject(code) {
  const safe = normalizeFocusSubject(code);
  if (typeof window === "undefined") return safe;
  try {
    window.localStorage.setItem(FOCUS_SUBJECT_STORAGE_KEY, safe);
  } catch {
    // Ignore storage quota or sandbox restrictions.
  }
  return safe;
}

export function hasSeenTriage() {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(TRIAGE_SEEN_SESSION_KEY) === "1";
  } catch {
    return true;
  }
}

export function markTriageSeen() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TRIAGE_SEEN_SESSION_KEY, "1");
  } catch {
    // Ignore sessionStorage restrictions.
  }
}

export function createAnimationRegistry() {
  const active = new Set();

  function track(animation) {
    if (!animation) return animation;
    active.add(animation);
    const cleanup = () => active.delete(animation);
    if (animation.finished && typeof animation.finished.then === "function") {
      animation.finished.then(cleanup, cleanup);
    }
    return animation;
  }

  function cancelAll() {
    for (const animation of active) {
      try {
        animation.cancel();
      } catch {
        // Ignore already-finished handles.
      }
    }
    active.clear();
  }

  return { track, cancelAll };
}

export function captureRects(container, selector = "[data-flip-id]") {
  const rects = new Map();
  if (!container) return rects;
  const nodes = container.querySelectorAll(selector);
  for (const el of nodes) {
    const id = el.getAttribute("data-flip-id");
    if (id) {
      rects.set(id, el.getBoundingClientRect());
    }
  }
  return rects;
}

export function playFlip(
  container,
  prevRects,
  {
    selector = "[data-flip-id]",
    duration = FLIP_REFLOW_MS,
    easing = FLUID_EASE,
    staggerMs = 0,
    registry = null,
  } = {}
) {
  if (!container || !prevRects || prevRects.size === 0 || prefersReducedMotion()) {
    return [];
  }

  const nodes = container.querySelectorAll(selector);
  const animations = [];
  let movedIndex = 0;

  for (const el of nodes) {
    if (typeof el.animate !== "function") continue;
    const id = el.getAttribute("data-flip-id");
    const prev = id ? prevRects.get(id) : null;
    if (!prev) continue;

    const next = el.getBoundingClientRect();
    const dx = prev.left - next.left;
    const dy = prev.top - next.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;

    const anim = el.animate(
      [
        { transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)` },
        { transform: "translate3d(0px, 0px, 0)" },
      ],
      {
        duration,
        delay: movedIndex * staggerMs,
        easing,
        fill: "backwards",
      }
    );
    movedIndex += 1;
    registry?.track(anim);
    animations.push(anim);
  }

  return animations;
}

export function playIndicatorGlide(
  container,
  prevRect,
  {
    selector = ".seg-active-glide",
    duration = 180,
    easing = FLUID_EASE,
    registry = null,
  } = {}
) {
  if (!container || !prevRect || prefersReducedMotion()) return null;
  const indicator = container.querySelector(selector);
  if (!indicator || typeof indicator.animate !== "function") return null;

  const next = indicator.getBoundingClientRect();
  if (next.width <= 0) return null;

  const dx = prevRect.left - next.left;
  const dy = prevRect.top - next.top;
  const sx = prevRect.width / next.width;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.02) {
    return null;
  }

  const anim = indicator.animate(
    [
      {
        transformOrigin: "left center",
        transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scaleX(${sx.toFixed(3)})`,
      },
      {
        transformOrigin: "left center",
        transform: "translate3d(0px, 0px, 0) scaleX(1)",
      },
    ],
    { duration, easing, fill: "none" }
  );
  registry?.track(anim);
  return anim;
}

export function spawnAllClearCanvasBurst(
  anchorEl,
  colors,
  { duration = ALL_CLEAR_BURST_MS, count = 18 } = {}
) {
  if (typeof window === "undefined" || !anchorEl || prefersReducedMotion()) {
    return () => {};
  }

  const rect = anchorEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return () => {};
  }

  const palette = colors?.length ? colors : ["#2E4FB3", "#5BD08A", "#F7CD54"];
  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.className = "allclear-canvas";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    left: `${Math.round(rect.left)}px`,
    top: `${Math.round(rect.top)}px`,
    width: `${Math.round(rect.width)}px`,
    height: `${Math.round(rect.height)}px`,
    pointerEvents: "none",
    zIndex: "300",
  });

  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  document.body.appendChild(canvas);
  ctx.scale(dpr, dpr);

  const originX = Math.round(rect.width * (rect.width > 520 ? 0.82 : 0.72));
  const originY = Math.round(rect.height * 0.44);
  const particles = Array.from({ length: count }, (_, idx) => {
    const angle = (Math.PI * 2 * idx) / count;
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * (2.4 + (idx % 3) * 1.25),
      vy: Math.sin(angle) * (2.0 + (idx % 4) * 1.05) - 1.4,
      size: idx % 2 === 0 ? 6 : 4,
      color: palette[idx % palette.length],
    };
  });

  let frameId = 0;
  let cancelled = false;
  const start = performance.now();

  function cleanup() {
    cancelled = true;
    if (frameId) window.cancelAnimationFrame(frameId);
    canvas.remove();
  }

  function step(now) {
    if (cancelled) return;
    const elapsed = now - start;
    if (elapsed >= duration) {
      cleanup();
      return;
    }

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.globalAlpha = Math.max(0, 1 - elapsed / duration);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.14;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    frameId = window.requestAnimationFrame(step);
  }

  frameId = window.requestAnimationFrame(step);
  return cleanup;
}
