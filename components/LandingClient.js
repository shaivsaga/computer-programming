"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import TopBar from "./TopBar";
import { useStudyTheme } from "@/app/providers";
import { navigateOptions } from "@/lib/keyboard";
import {
  BOARD_COLUMNS,
  CALENDAR_DAYS,
  CALENDAR_EVENTS,
  HERO_FILTERS,
  INITIAL_HERO_TASKS,
  NEXT_TASK_STATUS,
  PRICING_PLANS,
  SUBJECTS,
  SUBJECT_BG_MAP,
  WORKFLOW_TABS,
} from "@/lib/landing-data";
import {
  FLIGHT_CARD_MS,
  FLIP_REFLOW_MS,
  FLUID_EASE,
  TRIAGE_ANTICIPATION_MS,
  TRIAGE_CARD_MS,
  TRIAGE_STAGGER_MS,
  captureRects,
  createAnimationRegistry,
  hasSeenTriage,
  markTriageSeen,
  playFlip,
  playIndicatorGlide,
  prefersReducedMotion,
  spawnAllClearCanvasBurst,
} from "@/lib/motion";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const HERO_VIEW_TABS = [
  { id: "board", label: "Board" },
  { id: "list", label: "List" },
];

const BILLING_OPTIONS = [
  { id: "term", label: "Per Term" },
  { id: "year", label: "Yearly (-20%)" },
];

// Measured via CDP experiment: 650ms rejects accidental 250ms taps cleanly while
// committing ~300ms faster than 950ms at identical paint cost.
const HOLD_PUBLISH_MS = 650;

export default function LandingClient({ isSignedIn, userEmail }) {
  const uid = useId();
  const { focusSubject, setFocusSubject } = useStudyTheme();

  const [heroTasks, setHeroTasks] = useState(() =>
    INITIAL_HERO_TASKS.map((task) => ({ ...task }))
  );
  const [heroFilter, setHeroFilter] = useState("ALL");
  const [heroView, setHeroView] = useState("board");
  const [triagePhase, setTriagePhase] = useState("settled"); // "pile" | "converging" | "settled"
  const [stageId, setStageId] = useState("board");
  const [calDay, setCalDay] = useState(27);
  const [qrSeed, setQrSeed] = useState(1);
  const [publishState, setPublishState] = useState({
    phase: "idle", // "idle" | "holding" | "cancelled" | "committed"
    version: 14,
    announcement: "2 unpublished edits staged for v15.",
  });
  const [billing, setBilling] = useState("term");
  const [activeSection, setActiveSection] = useState("top");
  const [boardAnnouncement, setBoardAnnouncement] = useState("");
  const [toast, setToast] = useState("");

  const boardFrameRef = useRef(null);
  const boardBodyRef = useRef(null);
  const heroFilterGroupRef = useRef(null);
  const heroViewGroupRef = useRef(null);
  const stageTabsRef = useRef(null);
  const billingGroupRef = useRef(null);
  const scrollRailRef = useRef(null);
  const reelWindowRef = useRef(null);
  const reelTrackRef = useRef(null);
  const workflowSectionRef = useRef(null);
  const workflowRoutePathRef = useRef(null);
  const badgeRefs = useRef({});
  const toastTimerRef = useRef(null);
  const holdTimerRef = useRef(null);
  const holdPointerIdRef = useRef(null);

  const triagePhaseRef = useRef("settled");
  const triageTimerRef = useRef(null);
  const triageRegistryRef = useRef(null);
  const flipRegistryRef = useRef(null);
  const allClearCancelRef = useRef(() => {});
  const pendingFlipRef = useRef(null);
  const pendingIndicatorRef = useRef(null);
  const replayPendingRef = useRef(false);
  const prevAllDoneRef = useRef(false);

  if (!triageRegistryRef.current) {
    triageRegistryRef.current = createAnimationRegistry();
  }
  if (!flipRegistryRef.current) {
    flipRegistryRef.current = createAnimationRegistry();
  }

  const boardViewPanelId = `${uid}-board-view-panel`;
  const stagePanelId = `${uid}-stage-panel`;

  function showToast(message) {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2400);
  }

  function settleTriageImmediately() {
    if (triageTimerRef.current) {
      clearTimeout(triageTimerRef.current);
      triageTimerRef.current = null;
    }
    triageRegistryRef.current?.cancelAll();
    if (typeof document !== "undefined") {
      delete document.documentElement.dataset.triage;
    }
    if (triagePhaseRef.current !== "settled") {
      triagePhaseRef.current = "settled";
      setTriagePhase("settled");
    }
  }

  function runTriageSequence() {
    if (typeof window === "undefined") return;
    if (triageTimerRef.current) {
      clearTimeout(triageTimerRef.current);
      triageTimerRef.current = null;
    }
    triageRegistryRef.current?.cancelAll();
    flipRegistryRef.current?.cancelAll();
    delete document.documentElement.dataset.triage;

    if (prefersReducedMotion()) {
      triagePhaseRef.current = "settled";
      setTriagePhase("settled");
      return;
    }

    const bodyEl = boardBodyRef.current;
    if (!bodyEl) {
      triagePhaseRef.current = "settled";
      setTriagePhase("settled");
      return;
    }

    const cards = Array.from(bodyEl.querySelectorAll(".task-card"));
    const headers = Array.from(bodyEl.querySelectorAll(".mini-col-hd"));
    const badges = Array.from(bodyEl.querySelectorAll(".count-badge"));
    if (cards.length < 2) {
      triagePhaseRef.current = "settled";
      setTriagePhase("settled");
      return;
    }

    const bodyRect = bodyEl.getBoundingClientRect();
    const cardRects = cards.map((card) => card.getBoundingClientRect());
    const stepY = bodyRect.width > 500 ? 34 : 36;
    const stackTop = bodyRect.top + 18;

    const pileOffsets = cardRects.map((rect, idx) => {
      const centerLeft = bodyRect.left + bodyRect.width / 2 - rect.width / 2;
      const jitter = (idx % 2 === 0 ? -1 : 1) * (bodyRect.width > 500 ? 10 : 4);
      const clampedLeft = Math.max(
        bodyRect.left + 8,
        Math.min(bodyRect.right - rect.width - 8, centerLeft + jitter)
      );
      const clampedTop = Math.max(
        bodyRect.top + 8,
        Math.min(bodyRect.bottom - rect.height - 8, stackTop + idx * stepY)
      );
      return {
        dx: Math.round(clampedLeft - rect.left),
        dy: Math.round(clampedTop - rect.top),
      };
    });

    triagePhaseRef.current = "pile";
    setTriagePhase("pile");

    const reg = triageRegistryRef.current;
    const holdAnims = cards.map((card, idx) => {
      const { dx, dy } = pileOffsets[idx];
      return reg.track(
        card.animate(
          [
            { transform: `translate3d(${dx}px, ${dy}px, 0)`, offset: 0 },
            { transform: `translate3d(${dx}px, ${dy}px, 0)`, offset: 0.72 },
            { transform: `translate3d(${dx}px, ${dy - 4}px, 0)`, offset: 1 },
          ],
          {
            duration: TRIAGE_ANTICIPATION_MS,
            easing: "steps(3, end)",
            fill: "forwards",
          }
        )
      );
    });

    triageTimerRef.current = setTimeout(() => {
      triageTimerRef.current = null;
      if (triagePhaseRef.current !== "pile") return;

      triagePhaseRef.current = "converging";
      setTriagePhase("converging");

      for (const anim of holdAnims) {
        try {
          anim.cancel();
        } catch {
          // Ignore cancelled handles.
        }
      }

      const convergeAnims = cards.map((card, idx) => {
        const { dx, dy } = pileOffsets[idx];
        return reg.track(
          card.animate(
            [
              { transform: `translate3d(${dx}px, ${dy - 4}px, 0)` },
              { transform: "translate3d(0px, 0px, 0)" },
            ],
            {
              duration: TRIAGE_CARD_MS,
              delay: idx * TRIAGE_STAGGER_MS,
              easing: FLUID_EASE,
              fill: "backwards",
            }
          )
        );
      });

      headers.forEach((hd) => {
        reg.track(
          hd.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 220,
            delay: 140,
            easing: "steps(4, end)",
            fill: "backwards",
          })
        );
      });

      badges.forEach((badge) => {
        reg.track(
          badge.animate(
            [
              { transform: "scale(0.86)" },
              { transform: "scale(1.16)" },
              { transform: "scale(1)" },
            ],
            {
              duration: 220,
              delay: 240,
              easing: "steps(4, end)",
              fill: "none",
            }
          )
        );
      });

      Promise.all(
        convergeAnims.map((anim) => anim.finished.catch(() => {}))
      ).then(() => {
        if (triagePhaseRef.current === "converging") {
          settleTriageImmediately();
        }
      });
    }, TRIAGE_ANTICIPATION_MS);
  }

  // Trigger opening Desk Triage once per session without blocking SSR hydration.
  useIsomorphicLayoutEffect(() => {
    const preFlag =
      typeof document !== "undefined" &&
      document.documentElement.dataset.triage === "pending";
    if (typeof document !== "undefined") {
      delete document.documentElement.dataset.triage;
    }
    if ((preFlag || !hasSeenTriage()) && !prefersReducedMotion()) {
      markTriageSeen();
      runTriageSequence();
    }
    return () => {
      if (triageTimerRef.current) clearTimeout(triageTimerRef.current);
      triageRegistryRef.current?.cancelAll();
      flipRegistryRef.current?.cancelAll();
      allClearCancelRef.current?.();
    };
  }, []);

  // Run pending FLIP animations, indicator glides, or deferred replay after state updates.
  useIsomorphicLayoutEffect(() => {
    if (replayPendingRef.current) {
      replayPendingRef.current = false;
      pendingFlipRef.current = null;
      pendingIndicatorRef.current = null;
      runTriageSequence();
      return;
    }

    if (pendingFlipRef.current) {
      const prevRects = pendingFlipRef.current;
      pendingFlipRef.current = null;
      if (boardBodyRef.current && triagePhaseRef.current === "settled") {
        flipRegistryRef.current?.cancelAll();
        playFlip(boardBodyRef.current, prevRects, {
          duration: FLIP_REFLOW_MS,
          easing: FLUID_EASE,
          registry: flipRegistryRef.current,
        });
      }
    }

    if (pendingIndicatorRef.current) {
      const { groupEl, prevRect } = pendingIndicatorRef.current;
      pendingIndicatorRef.current = null;
      playIndicatorGlide(groupEl, prevRect, {
        registry: flipRegistryRef.current,
      });
    }
  }, [heroTasks, heroFilter, heroView, stageId, billing]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  // Single rAF scroll loop driving progress rail, active nav section,
  // compositor-only subject reel scrub, and #workflow SVG study route trace.
  useEffect(() => {
    let frameId = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    function updateScrollState() {
      frameId = 0;
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;

      if (scrollRailRef.current) {
        scrollRailRef.current.style.transform = `scaleX(${progress})`;
      }

      if (reelTrackRef.current && reelWindowRef.current) {
        if (reduced.matches) {
          reelTrackRef.current.style.setProperty("--reel-x", "0px");
        } else {
          const overflowX = Math.max(
            0,
            reelTrackRef.current.scrollWidth - reelWindowRef.current.clientWidth
          );
          const travel = overflowX > 0 ? overflowX : 240;
          const shift = -progress * travel;
          reelTrackRef.current.style.setProperty(
            "--reel-x",
            `${shift.toFixed(1)}px`
          );
        }
      }

      if (workflowRoutePathRef.current && workflowSectionRef.current) {
        if (reduced.matches) {
          workflowRoutePathRef.current.style.strokeDashoffset = "0";
        } else {
          const wfRect = workflowSectionRef.current.getBoundingClientRect();
          const vh = window.innerHeight || 900;
          const raw = (vh * 0.86 - wfRect.top) / Math.max(200, vh * 0.65);
          const wfProgress = Math.min(1, Math.max(0, raw));
          workflowRoutePathRef.current.style.strokeDashoffset = String(
            (1 - wfProgress).toFixed(4)
          );
        }
      }

      const workflowEl = document.getElementById("workflow");
      const pricingEl = document.getElementById("pricing");
      const triggerY = window.scrollY + 140;
      if (pricingEl && triggerY >= pricingEl.offsetTop) {
        setActiveSection("pricing");
      } else if (workflowEl && triggerY >= workflowEl.offsetTop) {
        setActiveSection("workflow");
      } else {
        setActiveSection("top");
      }
    }

    function onScrollOrResize() {
      if (!frameId) {
        frameId = window.requestAnimationFrame(updateScrollState);
      }
    }

    updateScrollState();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  // Intersection reveal observer for below-the-fold sections.
  useEffect(() => {
    const nodes = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  // Cancel any in-progress hold when switching away from the publish tab.
  useEffect(() => {
    if (stageId !== "publish" && holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      setPublishState((prev) =>
        prev.phase === "holding"
          ? { ...prev, phase: "idle", announcement: "Publish cancelled." }
          : prev
      );
    }
  }, [stageId]);

  const filteredTasks =
    heroFilter === "ALL"
      ? heroTasks
      : heroTasks.filter((task) => task.subj === heroFilter);
  const isAllDone =
    filteredTasks.length > 0 &&
    filteredTasks.every((task) => task.status === "done");

  useEffect(() => {
    if (isAllDone && !prevAllDoneRef.current && triagePhase === "settled") {
      allClearCancelRef.current?.();
      const colors = [
        ...new Set(
          filteredTasks.map((t) => SUBJECT_BG_MAP[t.subj]).filter(Boolean)
        ),
      ];
      allClearCancelRef.current = spawnAllClearCanvasBurst(
        boardFrameRef.current,
        colors
      );
    } else if (!isAllDone) {
      allClearCancelRef.current?.();
      allClearCancelRef.current = () => {};
    }
    prevAllDoneRef.current = isAllDone;
  }, [isAllDone, triagePhase, filteredTasks]);

  function captureBoardAndIndicator(groupEl) {
    if (!prefersReducedMotion()) {
      if (boardBodyRef.current && triagePhaseRef.current === "settled") {
        pendingFlipRef.current = captureRects(
          boardBodyRef.current,
          "[data-flip-id]"
        );
      }
      if (groupEl) {
        const glide = groupEl.querySelector(".seg-active-glide");
        if (glide) {
          pendingIndicatorRef.current = {
            groupEl,
            prevRect: glide.getBoundingClientRect(),
          };
        }
      }
    }
  }

  function handleFilterChange(subj) {
    settleTriageImmediately();
    captureBoardAndIndicator(heroFilterGroupRef.current);
    setHeroFilter(subj);
    setFocusSubject(subj);
  }

  function handleViewChange(viewId) {
    settleTriageImmediately();
    captureBoardAndIndicator(heroViewGroupRef.current);
    setHeroView(viewId);
  }

  function handleStageChange(nextStageId) {
    captureBoardAndIndicator(stageTabsRef.current);
    setStageId(nextStageId);
  }

  function handleBillingChange(optionId) {
    captureBoardAndIndicator(billingGroupRef.current);
    setBilling(optionId);
  }

  function handleReelSubjectClick(code) {
    settleTriageImmediately();
    setFocusSubject(code);
    if (HERO_FILTERS.includes(code)) {
      captureBoardAndIndicator(heroFilterGroupRef.current);
      setHeroFilter(code);
    } else {
      showToast(`Focused on ${code}`);
    }
  }

  function commitPublish() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdPointerIdRef.current = null;
    setPublishState((prev) => {
      if (prev.phase === "committed") return prev;
      const nextVersion = prev.version + 1;
      showToast(`Published v${nextVersion} to section board`);
      return {
        phase: "committed",
        version: nextVersion,
        announcement: `Published v${nextVersion} live to 19 students.`,
      };
    });
  }

  function startHold(pointerTarget, pointerId) {
    if (publishState.phase === "committed" || publishState.phase === "holding") {
      return;
    }
    if (prefersReducedMotion()) {
      commitPublish();
      return;
    }

    if (
      pointerTarget &&
      pointerId !== undefined &&
      pointerTarget.setPointerCapture
    ) {
      try {
        pointerTarget.setPointerCapture(pointerId);
        holdPointerIdRef.current = pointerId;
      } catch {
        holdPointerIdRef.current = null;
      }
    }

    setPublishState((prev) => ({
      ...prev,
      phase: "holding",
      announcement: `Holding to publish v${prev.version + 1}. Release early to cancel.`,
    }));

    holdTimerRef.current = setTimeout(() => {
      commitPublish();
    }, HOLD_PUBLISH_MS);
  }

  function cancelHold(pointerTarget) {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (
      pointerTarget &&
      holdPointerIdRef.current !== null &&
      pointerTarget.releasePointerCapture
    ) {
      try {
        if (pointerTarget.hasPointerCapture?.(holdPointerIdRef.current)) {
          pointerTarget.releasePointerCapture(holdPointerIdRef.current);
        }
      } catch {
        // Ignore if capture already released.
      }
    }
    holdPointerIdRef.current = null;

    setPublishState((prev) => {
      if (prev.phase !== "holding") return prev;
      return {
        ...prev,
        phase: "cancelled",
        announcement: `Publish cancelled. Hold to publish v${prev.version + 1}.`,
      };
    });
  }

  function handleHoldKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelHold(event.currentTarget);
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (!event.repeat) {
        startHold(event.currentTarget);
      }
    }
  }

  function handleHoldKeyUp(event) {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      cancelHold(event.currentTarget);
    }
  }

  function handleStageNextDraft() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setPublishState((prev) => ({
      phase: "idle",
      version: prev.version,
      announcement: `2 unpublished edits staged for v${prev.version + 1}.`,
    }));
  }

  function flyCardToBadge(cardEl, targetStatus, subjectCode) {
    const badge = badgeRefs.current[targetStatus];
    if (
      prefersReducedMotion() ||
      !cardEl ||
      !badge ||
      typeof cardEl.animate !== "function"
    ) {
      return;
    }

    const rect = cardEl.getBoundingClientRect();
    const target = badge.getBoundingClientRect();
    const ghost = cardEl.cloneNode(true);
    const subjColor = SUBJECT_BG_MAP[subjectCode];
    ghost.classList.add("motion-ghost");
    ghost.setAttribute("aria-hidden", "true");
    Object.assign(ghost.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      ...(subjColor
        ? {
            borderColor: subjColor,
            boxShadow: `0 4px 0 ${subjColor}`,
          }
        : {}),
    });
    document.body.appendChild(ghost);

    const scale = Math.max(0.18, Math.min(1, target.width / rect.width));
    const dx = target.left + target.width / 2 - (rect.width * scale) / 2 - rect.left;
    const dy = target.top + target.height / 2 - (rect.height * scale) / 2 - rect.top;

    const animation = ghost.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1, offset: 0 },
        { transform: "translate(0, -4px) scale(1.02)", opacity: 1, offset: 0.2 },
        {
          transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
          opacity: 0.25,
          offset: 1,
        },
      ],
      { duration: FLIGHT_CARD_MS, easing: FLUID_EASE, fill: "forwards" }
    );
    flipRegistryRef.current?.track(animation);

    let removed = false;
    const removeGhost = () => {
      if (removed) return;
      removed = true;
      ghost.remove();
    };

    animation.oncancel = removeGhost;
    animation.onfinish = () => {
      removeGhost();
      badge.classList.remove("is-pop");
      void badge.offsetWidth;
      badge.classList.add("is-pop");
    };
  }

  function handleAdvanceTask(taskId, event) {
    settleTriageImmediately();
    const targetTask = heroTasks.find((task) => task.id === taskId);
    if (!targetTask) return;
    const nextStatus = NEXT_TASK_STATUS[targetTask.status] ?? "todo";
    if (nextStatus === "progress" || nextStatus === "done") {
      const cardEl = event.currentTarget.closest(".task-card");
      flyCardToBadge(cardEl, nextStatus, targetTask.subj);
    }
    captureBoardAndIndicator(null);
    const targetColumn = BOARD_COLUMNS.find((col) => col.id === nextStatus);
    setHeroTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status: nextStatus } : task
      )
    );
    setBoardAnnouncement(
      `Moved ${targetTask.title} to ${targetColumn ? targetColumn.label : nextStatus}.`
    );
  }

  function handleReplayTriage() {
    allClearCancelRef.current?.();
    allClearCancelRef.current = () => {};
    if (prefersReducedMotion()) {
      settleTriageImmediately();
      showToast("Reduced motion active: board stays settled");
      return;
    }

    const needsBoardReset = heroView !== "board";
    const needsFilterReset = heroFilter !== "ALL" && filteredTasks.length < 2;
    if (needsBoardReset || needsFilterReset) {
      replayPendingRef.current = true;
      if (needsBoardReset) setHeroView("board");
      if (needsFilterReset) setHeroFilter("ALL");
      return;
    }

    runTriageSequence();
  }

  function handleResetDemo() {
    allClearCancelRef.current?.();
    allClearCancelRef.current = () => {};
    flipRegistryRef.current?.cancelAll();
    settleTriageImmediately();
    setHeroTasks(INITIAL_HERO_TASKS.map((task) => ({ ...task })));
    setHeroFilter("ALL");
    setFocusSubject("ALL");
    setBoardAnnouncement("Demo board reset.");
    showToast("Demo board reset");
  }

  const activeStage =
    WORKFLOW_TABS.find((tab) => tab.id === stageId) ?? WORKFLOW_TABS[0];
  const activeCalEvents = CALENDAR_EVENTS[calDay] ?? [];

  function renderTaskCard(task) {
    const isProgress = task.status === "progress";
    const isDone = task.status === "done";
    const isFocused = focusSubject !== "ALL" && focusSubject === task.subj;
    const actionLabel = isProgress
      ? `Mark ${task.title} as Done`
      : isDone
        ? `Move ${task.title} back to To Do`
        : `Move ${task.title} to In Progress`;

    return (
      <div
        key={task.id}
        data-flip-id={task.id}
        className={`task-card${isProgress ? " is-progress-card" : isDone ? " is-done-card" : ""}${isFocused ? " is-focus-card" : ""}`}
      >
        <button
          type="button"
          className={`task-check${isProgress ? " in-progress" : isDone ? " checked" : ""}`}
          onClick={(event) => handleAdvanceTask(task.id, event)}
          aria-label={actionLabel}
        >
          {isProgress && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <rect x="5" y="5" width="6" height="6" fill="currentColor" />
            </svg>
          )}
          {isDone && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              aria-hidden="true"
            >
              <path d="M3 8.5L6.5 12L13 4.5" />
            </svg>
          )}
        </button>
        <div className="task-meta">
          <div className="task-title">{task.title}</div>
          <div className="task-foot">
            <span
              className="subj-tag"
              style={{ backgroundColor: SUBJECT_BG_MAP[task.subj] }}
            >
              {task.subj}
            </span>
            <span className={`due-pill ${isDone ? "is-ok" : task.tone}`}>
              {isDone ? "Done locally" : task.due}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const nextVersion = publishState.version + 1;
  const holdButtonLabel =
    publishState.phase === "committed"
      ? `Published v${publishState.version}`
      : publishState.phase === "holding"
        ? `Keep holding for v${nextVersion}`
        : `Hold to publish v${nextVersion}`;

  return (
    <>
      <div className="scroll-rail" aria-hidden="true">
        <div ref={scrollRailRef} className="scroll-rail-fill" />
      </div>

      <TopBar
        isLanding
        isSignedIn={isSignedIn}
        activeSection={activeSection}
        onThemeSwitch={(next) =>
          showToast(
            next === "dark"
              ? "Switched to Deep Navy (Dark)"
              : "Switched to Warm Paper (Light)"
          )
        }
      />

      <main>
        <section className="hero pixel-grid-bg" id="top">
          <div className="wrap">
            <div className="hero-grid">
              <div className="hero-copy">
                <h1 className="hero-title stamp-1">
                  Every class deadline, calmly in one board.
                </h1>
                <div className="hero-lead">
                  <p className="hero-sub stamp-2">
                    One shared assignment board for your section. Track personal
                    progress locally, inspect calendar deadlines, and check off
                    work without noise.
                  </p>
                  <div className="hero-actions stamp-3">
                    {isSignedIn ? (
                      <Link className="btn-primary" href="/dashboard">
                        Open account ({userEmail})
                      </Link>
                    ) : (
                      <>
                        <Link className="btn-primary" href="/signup">
                          Create free account
                        </Link>
                        <p className="hero-alt">
                          Already registered?{" "}
                          <Link href="/login">Log in to portal</Link>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div
                ref={boardFrameRef}
                className="board-frame stamp-board"
                data-triage-phase={triagePhase}
                aria-label="Interactive TaskTracker board preview"
              >
                <div
                  className="board-chrome"
                  onPointerDownCapture={() => settleTriageImmediately()}
                  onKeyDownCapture={() => settleTriageImmediately()}
                >
                  <div className="chrome-left">
                    <span className="chrome-sq is-blue" aria-hidden="true" />
                    <span className="chrome-sq" aria-hidden="true" />
                    <span className="chrome-title">Class Board Demo</span>
                    {triagePhase !== "settled" && (
                      <span className="triage-pill">
                        {triagePhase === "pile"
                          ? "Unsorted pile"
                          : "Organizing"}
                      </span>
                    )}
                  </div>
                  <div className="chrome-actions">
                    <button
                      type="button"
                      className="btn-secondary btn-compact"
                      onClick={handleReplayTriage}
                    >
                      Replay triage
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-compact"
                      onClick={handleResetDemo}
                    >
                      Reset demo
                    </button>
                  </div>
                </div>

                <div
                  className="board-toolbar"
                  onPointerDownCapture={() => settleTriageImmediately()}
                  onKeyDownCapture={() => settleTriageImmediately()}
                >
                  <div
                    ref={heroFilterGroupRef}
                    className="segmented-control"
                    role="radiogroup"
                    aria-label="Filter demo tasks by subject"
                    aria-orientation="horizontal"
                    onKeyDown={navigateOptions}
                  >
                    {HERO_FILTERS.map((subj) => {
                      const active = heroFilter === subj;
                      return (
                        <button
                          key={subj}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          tabIndex={active ? 0 : -1}
                          className={`seg-item${active ? " is-active" : ""}`}
                          onClick={() => handleFilterChange(subj)}
                        >
                          <span>{subj === "ALL" ? "All" : subj}</span>
                          {active && (
                            <span
                              className="seg-active-glide"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    ref={heroViewGroupRef}
                    className="segmented-control"
                    role="tablist"
                    aria-label="Board view mode"
                    aria-orientation="horizontal"
                    onKeyDown={navigateOptions}
                  >
                    {HERO_VIEW_TABS.map((view) => {
                      const active = heroView === view.id;
                      return (
                        <button
                          key={view.id}
                          id={`${uid}-board-view-tab-${view.id}`}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          aria-controls={boardViewPanelId}
                          tabIndex={active ? 0 : -1}
                          className={`seg-item${active ? " is-active" : ""}`}
                          onClick={() => handleViewChange(view.id)}
                        >
                          <span>{view.label}</span>
                          {active && (
                            <span
                              className="seg-active-glide"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  ref={boardBodyRef}
                  id={boardViewPanelId}
                  className="board-body"
                  role="tabpanel"
                  aria-labelledby={`${uid}-board-view-tab-${heroView}`}
                  tabIndex={0}
                  onClickCapture={() => settleTriageImmediately()}
                  onKeyDownCapture={() => settleTriageImmediately()}
                >
                  <div
                    className={`mini-cols${heroView === "list" ? " is-list" : ""}`}
                  >
                    {BOARD_COLUMNS.map((column) => {
                      const items = filteredTasks.filter(
                        (task) => task.status === column.id
                      );
                      return (
                        <div key={column.id} className="mini-col">
                          <div className="mini-col-hd">
                            <span>
                              <span
                                className={`col-dot${column.dotClass ? ` ${column.dotClass}` : ""}`}
                                aria-hidden="true"
                              />
                              {column.label}
                            </span>
                            <span
                              ref={(el) => {
                                badgeRefs.current[column.id] = el;
                              }}
                              className={`count-badge${column.badgeClass ? ` ${column.badgeClass}` : ""}`}
                            >
                              {items.length}
                            </span>
                          </div>
                          <div className="task-stack">
                            {items.length ? (
                              items.map(renderTaskCard)
                            ) : (
                              <div className="empty-stack">
                                {column.emptyText}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="board-hint">
                  <span>
                    {isAllDone
                      ? "Visible tasks complete. Enjoy the quiet board or reset demo."
                      : triagePhase === "pile"
                        ? "Four deadlines stacked in inbox pile before sorting into calm columns."
                        : "Select any task box to advance it from To Do to In Progress to Done."}
                  </span>
                  <span className="board-live" aria-live="polite">
                    {isAllDone && (
                      <span className="board-allclear">All clear</span>
                    )}
                    {boardAnnouncement}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div
          className="reel-band"
          role="region"
          aria-label="Supported subject labels"
        >
          <div ref={reelWindowRef} className="reel-window">
            <div ref={reelTrackRef} className="reel-track">
              {SUBJECTS.map((subject) => {
                const pressed = focusSubject === subject.code;
                return (
                  <button
                    key={subject.code}
                    type="button"
                    aria-pressed={pressed}
                    className={`ticker-chip${pressed ? " is-focused-chip" : ""}`}
                    onClick={() => handleReelSubjectClick(subject.code)}
                  >
                    <span
                      className="subj-tag"
                      style={{ backgroundColor: subject.bg }}
                    >
                      {subject.code}
                    </span>
                    <span>{subject.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <section ref={workflowSectionRef} className="section" id="workflow">
          <div className="wrap">
            <div className="section-head reveal">
              <div>
                <h2 className="section-title">
                  Built for calm focus, not notification fatigue.
                </h2>
                <p className="section-desc">
                  Explore how TaskTracker organizes a section&apos;s
                  assignments, calendar deadlines, device handoffs, and class
                  rep publishing.
                </p>
              </div>
            </div>

            <div
              ref={stageTabsRef}
              className="stage-tabs reveal"
              role="tablist"
              aria-label="Feature workflow"
              aria-orientation="horizontal"
              onKeyDown={navigateOptions}
            >
              {WORKFLOW_TABS.map((tab) => {
                const active = stageId === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`${uid}-stage-tab-${tab.id}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={stagePanelId}
                    tabIndex={active ? 0 : -1}
                    className={`stage-tab${active ? " is-active" : ""}`}
                    onClick={() => handleStageChange(tab.id)}
                  >
                    <span className="stage-tab-lbl">{tab.label}</span>
                    {active && (
                      <span className="seg-active-glide" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="workflow-route-wrap" aria-hidden="true">
              <svg
                className="workflow-route-svg"
                viewBox="0 0 1200 18"
                preserveAspectRatio="none"
                fill="none"
              >
                <path
                  className="workflow-route-ghost"
                  d="M 150 4 L 150 9 L 1050 9 L 1050 15"
                />
                <path
                  ref={workflowRoutePathRef}
                  className="workflow-route-fill"
                  pathLength="1"
                  d="M 150 4 L 150 9 L 1050 9 L 1050 15"
                />
                <rect className="workflow-route-node" x="147" y="1" width="6" height="6" />
                <rect className="workflow-route-node" x="447" y="6" width="6" height="6" />
                <rect className="workflow-route-node" x="747" y="6" width="6" height="6" />
                <rect className="workflow-route-node is-end" x="1047" y="12" width="6" height="6" />
              </svg>
            </div>

            <div
              id={stagePanelId}
              className="stage-panel reveal"
              role="tabpanel"
              aria-labelledby={`${uid}-stage-tab-${activeStage.id}`}
              tabIndex={0}
            >
              <div className="stage-copy">
                <h3>{activeStage.heading}</h3>
                <p>{activeStage.description}</p>
                <ul className="stage-bullets">
                  {activeStage.bullets.map((bullet) => (
                    <li key={bullet}>
                      <span className="bullet-sq" aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {stageId === "board" && (
                <div className="stage-demo-card">
                  <div className="stage-demo-head">
                    <span className="stage-demo-label">Pinned announcement</span>
                    <span className="stage-demo-meta">Nov 26</span>
                  </div>
                  <div className="stage-note">
                    <strong>Term 2 Capstone Demo:</strong> Bring your prototype
                    ready in Light and Dark mode.
                  </div>
                  <div className="stage-counts">
                    <div className="stage-count-cell is-accent">
                      <div className="stage-count-val">12</div>
                      <div className="stage-count-lbl">To Do</div>
                    </div>
                    <div className="stage-count-cell">
                      <div className="stage-count-val">3</div>
                      <div className="stage-count-lbl">In Progress</div>
                    </div>
                    <div className="stage-count-cell is-ok">
                      <div className="stage-count-val">9</div>
                      <div className="stage-count-lbl">Done</div>
                    </div>
                  </div>
                </div>
              )}

              {stageId === "calendar" && (
                <div className="cal-box">
                  <div className="cal-hd">
                    <span className="cal-month">November 2026</span>
                    <span className="stage-demo-meta">
                      Dot density shows daily load
                    </span>
                  </div>
                  <div className="cal-grid">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (dow) => (
                        <div key={dow} className="cal-dow">
                          {dow}
                        </div>
                      )
                    )}
                    {CALENDAR_DAYS.map((day) => {
                      const events = CALENDAR_EVENTS[day] ?? [];
                      const isSelected = calDay === day;
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`cal-day${isSelected ? " is-selected" : ""}${events.length ? " has-events" : ""}`}
                          data-density={events.length}
                          onClick={() => setCalDay(day)}
                          aria-pressed={isSelected}
                          aria-label={`Day ${day}, ${events.length} ${events.length === 1 ? "deadline" : "deadlines"}`}
                        >
                          <span className="cal-day-num">{day}</span>
                          <span className="cal-dots" aria-hidden="true">
                            {events.length > 0 ? (
                              events.map((event) => (
                                <span
                                  key={event.title}
                                  className={`cal-dot${focusSubject === event.subj ? " is-focus-dot" : ""}`}
                                  style={{
                                    backgroundColor: SUBJECT_BG_MAP[event.subj],
                                  }}
                                />
                              ))
                            ) : (
                              <span className="cal-dot is-quiet" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="cal-agenda-list" aria-live="polite">
                    {activeCalEvents.length > 0 ? (
                      activeCalEvents.map((event, idx) => (
                        <div
                          key={`${calDay}-${event.title}`}
                          className={`cal-agenda${focusSubject === event.subj ? " is-focus-agenda" : ""}`}
                          style={{ "--agenda-step": idx }}
                        >
                          <div>
                            <strong>{event.title}</strong>
                            <div className="stage-demo-meta">
                              Day {calDay} · {event.time}
                            </div>
                          </div>
                          <span
                            className="subj-tag"
                            style={{
                              backgroundColor: SUBJECT_BG_MAP[event.subj],
                            }}
                          >
                            {event.subj}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div
                        key={`${calDay}-empty`}
                        className="cal-agenda"
                        style={{ "--agenda-step": 0 }}
                      >
                        <span className="stage-demo-meta">
                          No deadlines scheduled for day {calDay}.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {stageId === "qr" && (
                <div className="qr-stage">
                  <div key={qrSeed} className="qr-grid" aria-hidden="true">
                    {Array.from({ length: 81 }, (_, index) => {
                      const row = Math.floor(index / 9);
                      const col = index % 9;
                      const corner =
                        (row < 3 && col < 3) ||
                        (row < 3 && col > 5) ||
                        (row > 5 && col < 3);
                      const on =
                        corner || (index * 7 + qrSeed * 13) % 3 === 0;
                      return (
                        <span
                          key={index}
                          className={`qr-cell${on ? " on" : ""}`}
                          style={{ "--qr-step": row + col }}
                        />
                      );
                    })}
                  </div>
                  <div className="qr-copy">
                    <div className="stage-demo-label">
                      Transfer code #{1040 + qrSeed}
                    </div>
                    <p className="stage-demo-meta">
                      Regenerate the pixel matrix to simulate a fresh
                      single-use device transfer token.
                    </p>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => {
                        setQrSeed((prev) => prev + 1);
                        showToast("Generated new mock QR matrix");
                      }}
                    >
                      Regenerate QR Matrix
                    </button>
                  </div>
                </div>
              )}

              {stageId === "publish" && (
                <div className="stage-demo-card">
                  <div className="stage-demo-head">
                    <span className="stage-demo-label">
                      {publishState.phase === "committed"
                        ? `Live board v${publishState.version}`
                        : `Staged draft v${nextVersion}`}
                    </span>
                    <span className="stage-demo-meta">
                      {publishState.phase === "committed"
                        ? "Synced to 19 students"
                        : "2 pending edits"}
                    </span>
                  </div>

                  <div
                    className={`stage-note${publishState.phase === "committed" ? " is-live" : " is-draft"}`}
                  >
                    {publishState.phase === "committed" ? (
                      <>
                        <strong>Published v{publishState.version}:</strong> CP104
                        lab rubric and GENSCI Friday quiz are live on the class
                        board.
                      </>
                    ) : (
                      <>
                        <strong>2 unpublished edits staged:</strong> Added CP104
                        lab rubric and shifted GENSCI quiz to Friday.
                      </>
                    )}
                  </div>

                  <div className="hold-controls">
                    <button
                      type="button"
                      className="hold-btn"
                      data-state={publishState.phase}
                      style={{ "--hold-ms": `${HOLD_PUBLISH_MS}ms` }}
                      disabled={publishState.phase === "committed"}
                      onPointerDown={(event) =>
                        startHold(event.currentTarget, event.pointerId)
                      }
                      onPointerUp={(event) => cancelHold(event.currentTarget)}
                      onPointerCancel={(event) =>
                        cancelHold(event.currentTarget)
                      }
                      onBlur={(event) => cancelHold(event.currentTarget)}
                      onKeyDown={handleHoldKeyDown}
                      onKeyUp={handleHoldKeyUp}
                    >
                      <span className="hold-fill" aria-hidden="true" />
                      <span className="hold-label">
                        {publishState.phase === "committed" && (
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
                        <span>{holdButtonLabel}</span>
                      </span>
                    </button>

                    {publishState.phase === "committed" && (
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={handleStageNextDraft}
                      >
                        Stage new draft
                      </button>
                    )}
                  </div>

                  <p className="hold-status" aria-live="polite">
                    {publishState.announcement}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="section pixel-grid-bg" id="pricing">
          <div className="wrap">
            <div className="section-head reveal">
              <div>
                <h2 className="section-title">
                  Simple tiers for any study hall.
                </h2>
                <p className="section-desc">
                  Demo pricing for this study hall showcase. Pick a tier to
                  open the PostgreSQL-backed portal.
                </p>
              </div>

              <div
                ref={billingGroupRef}
                className="segmented-control"
                role="radiogroup"
                aria-label="Billing period"
                aria-orientation="horizontal"
                onKeyDown={navigateOptions}
              >
                {BILLING_OPTIONS.map((option) => {
                  const active = billing === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      tabIndex={active ? 0 : -1}
                      className={`seg-item${active ? " is-active" : ""}`}
                      onClick={() => handleBillingChange(option.id)}
                    >
                      <span>{option.label}</span>
                      {active && (
                        <span className="seg-active-glide" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="cards-3 reveal">
              {PRICING_PLANS.map((plan) => (
                <article
                  key={plan.id}
                  className={`info-card${plan.featured ? " is-featured" : ""}`}
                >
                  <div className="plan-tier">{plan.tier}</div>
                  <h3 className="plan-name">{plan.name}</h3>
                  <div className="price-row">
                    <span className="price-num">
                      {billing === "term" ? plan.termPrice : plan.yearPrice}
                    </span>
                    <span className="price-unit">/ {plan.unit}</span>
                  </div>
                  <p className="plan-summary">{plan.summary}</p>
                  <ul className="stage-bullets plan-features">
                    {plan.features.map((feat) => (
                      <li key={feat}>
                        <span className="bullet-sq" aria-hidden="true" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    className={`${plan.featured ? "btn-primary" : "btn-secondary"} plan-cta`}
                    href={
                      isSignedIn
                        ? "/dashboard"
                        : `/signup?plan=${encodeURIComponent(plan.name)}`
                    }
                  >
                    {isSignedIn ? "Open account" : plan.cta}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-row">
          <div className="footer-brand">
            <span className="footer-wordmark">TaskTracker</span>
            <span>
              Study hall landing page and portal for computer-programming
            </span>
          </div>
          <span>
            Demo landing surface. Auth connects to your PostgreSQL session
            store.
          </span>
        </div>
      </footer>

      <div id="toast-slot" aria-live="polite">
        {toast && (
          <div className="toast">
            <span className="bullet-sq" aria-hidden="true" />
            <span>{toast}</span>
          </div>
        )}
      </div>
    </>
  );
}
