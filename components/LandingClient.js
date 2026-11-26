"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import TopBar from "./TopBar";
import {
  CALENDAR_DAYS,
  CALENDAR_EVENTS,
  HERO_FILTERS,
  INITIAL_HERO_TASKS,
  PRICING_PLANS,
  SUBJECTS,
  SUBJECT_BG_MAP,
  WORKFLOW_TABS,
} from "@/lib/landing-data";

const HERO_VIEW_TABS = [
  { id: "board", label: "Board" },
  { id: "list", label: "List" },
];

const BILLING_OPTIONS = [
  { id: "term", label: "Per Term" },
  { id: "year", label: "Yearly (-20%)" },
];

// Handle navigation at the group so arrow keys use the same order and action as a click.
function navigateOptions(event) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const group = event.currentTarget;
  const isRadio = group.getAttribute("role") === "radiogroup";
  const buttons = Array.from(group.querySelectorAll(isRadio ? '[role="radio"]' : '[role="tab"]'));
  const index = buttons.indexOf(event.target);
  if (index < 0) return;

  let next;
  if (event.key === "ArrowRight" || (isRadio && event.key === "ArrowDown")) {
    next = (index + 1) % buttons.length;
  } else if (event.key === "ArrowLeft" || (isRadio && event.key === "ArrowUp")) {
    next = (index + buttons.length - 1) % buttons.length;
  } else if (!isRadio && event.key === "Home") {
    next = 0;
  } else if (!isRadio && event.key === "End") {
    next = buttons.length - 1;
  } else {
    return;
  }

  event.preventDefault();
  buttons[next].focus();
  buttons[next].click();
}

export default function LandingClient({ isSignedIn, userEmail }) {
  const uid = useId();
  const [heroTasks, setHeroTasks] = useState(() =>
    INITIAL_HERO_TASKS.map((task) => ({ ...task }))
  );
  const [heroFilter, setHeroFilter] = useState("ALL");
  const [heroView, setHeroView] = useState("board");
  const [stageId, setStageId] = useState("board");
  const [calDay, setCalDay] = useState(27);
  const [qrSeed, setQrSeed] = useState(1);
  const [adminDraftMode, setAdminDraftMode] = useState(false);
  const [billing, setBilling] = useState("term");
  const [ribbonPaused, setRibbonPaused] = useState(false);
  const [activeSection, setActiveSection] = useState("top");
  const [toast, setToast] = useState("");

  const scrollRailRef = useRef(null);
  const tickerRef = useRef(null);
  const doneBadgeRef = useRef(null);
  const toastTimerRef = useRef(null);
  const boardViewPanelId = `${uid}-board-view-panel`;
  const stagePanelId = `${uid}-stage-panel`;

  function showToast(message) {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2400);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Scrolltide single rAF loop for progress rail, active section, and subtle ribbon drift.
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
      if (tickerRef.current && !ribbonPaused && !reduced.matches) {
        const shift = -progress * 180;
        tickerRef.current.style.setProperty("--scroll-shift", `${shift.toFixed(1)}px`);
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

    function onScroll() {
      if (!frameId) {
        frameId = window.requestAnimationFrame(updateScrollState);
      }
    }

    updateScrollState();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [ribbonPaused]);

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

  function flyCardToDone(cardEl) {
    const badge = doneBadgeRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !cardEl || !badge || typeof cardEl.animate !== "function") {
      return;
    }

    const rect = cardEl.getBoundingClientRect();
    const target = badge.getBoundingClientRect();
    const ghost = cardEl.cloneNode(true);
    ghost.classList.add("motion-ghost");
    ghost.setAttribute("aria-hidden", "true");
    Object.assign(ghost.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
    document.body.appendChild(ghost);

    const scale = Math.max(0.18, Math.min(1, target.width / rect.width));
    const dx = target.left + target.width / 2 - (rect.width * scale) / 2 - rect.left;
    const dy = target.top + target.height / 2 - (rect.height * scale) / 2 - rect.top;

    const animation = ghost.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1, offset: 0 },
        { transform: "translate(0, -4px) scale(1.02)", opacity: 1, offset: 0.2 },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.25, offset: 1 },
      ],
      { duration: 380, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" }
    );

    animation.onfinish = () => {
      ghost.remove();
      badge.classList.remove("is-pop");
      void badge.offsetWidth;
      badge.classList.add("is-pop");
    };
  }

  function handleToggleTask(taskId, event) {
    const targetTask = heroTasks.find((task) => task.id === taskId);
    if (targetTask && !targetTask.done) {
      const cardEl = event.currentTarget.closest(".task-card");
      flyCardToDone(cardEl);
    }
    setHeroTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      )
    );
  }

  function handleResetDemo() {
    setHeroTasks(INITIAL_HERO_TASKS.map((task) => ({ ...task })));
    setHeroFilter("ALL");
    showToast("Demo board reset");
  }

  const filteredTasks =
    heroFilter === "ALL"
      ? heroTasks
      : heroTasks.filter((task) => task.subj === heroFilter);
  const todos = filteredTasks.filter((task) => !task.done);
  const dones = filteredTasks.filter((task) => task.done);

  const activeStage =
    WORKFLOW_TABS.find((tab) => tab.id === stageId) ?? WORKFLOW_TABS[0];
  const activeCalEvent = CALENDAR_EVENTS[calDay] ?? null;

  function renderTaskCard(task) {
    return (
      <div
        key={task.id}
        className={`task-card${task.done ? " is-done-card" : ""}`}
      >
        <button
          type="button"
          className={`task-check${task.done ? " checked" : ""}`}
          onClick={(event) => handleToggleTask(task.id, event)}
          aria-pressed={task.done}
          aria-label={`Mark ${task.title} as ${task.done ? "not started" : "done"}`}
        >
          {task.done && (
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
            <span className={`due-pill ${task.done ? "is-ok" : task.tone}`}>
              {task.done ? "Done locally" : task.due}
            </span>
          </div>
        </div>
      </div>
    );
  }

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

              <div
                className="board-frame stamp-2"
                aria-label="Interactive TaskTracker board preview"
              >
                <div className="board-chrome">
                  <div className="chrome-left">
                    <span className="chrome-sq is-blue" aria-hidden="true" />
                    <span className="chrome-sq" aria-hidden="true" />
                    <span className="chrome-title">Class Board Demo</span>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary btn-compact"
                    onClick={handleResetDemo}
                  >
                    Reset demo
                  </button>
                </div>

                <div className="board-toolbar">
                  <div
                    className="segmented-control"
                    role="radiogroup"
                    aria-label="Filter demo tasks by subject"
                    aria-orientation="horizontal"
                    onKeyDown={navigateOptions}
                  >
                    {HERO_FILTERS.map((subj) => (
                      <button
                        key={subj}
                        type="button"
                        role="radio"
                        aria-checked={heroFilter === subj}
                        tabIndex={heroFilter === subj ? 0 : -1}
                        className={`seg-item${heroFilter === subj ? " is-active" : ""}`}
                        onClick={() => setHeroFilter(subj)}
                      >
                        {subj === "ALL" ? "All" : subj}
                      </button>
                    ))}
                  </div>

                  <div
                    className="segmented-control"
                    role="tablist"
                    aria-label="Board view mode"
                    aria-orientation="horizontal"
                    onKeyDown={navigateOptions}
                  >
                    {HERO_VIEW_TABS.map((view) => (
                      <button
                        key={view.id}
                        id={`${uid}-board-view-tab-${view.id}`}
                        type="button"
                        role="tab"
                        aria-selected={heroView === view.id}
                        aria-controls={boardViewPanelId}
                        tabIndex={heroView === view.id ? 0 : -1}
                        className={`seg-item${heroView === view.id ? " is-active" : ""}`}
                        onClick={() => setHeroView(view.id)}
                      >
                        {view.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  id={boardViewPanelId}
                  className="board-body"
                  role="tabpanel"
                  aria-labelledby={`${uid}-board-view-tab-${heroView}`}
                  tabIndex={0}
                >
                  <div
                    className={`mini-cols${heroView === "list" ? " is-list" : ""}`}
                  >
                    <div className="mini-col">
                      <div className="mini-col-hd">
                        <span>
                          <span className="col-dot" aria-hidden="true" />
                          To Do
                        </span>
                        <span className="count-badge">{todos.length}</span>
                      </div>
                      <div className="task-stack">
                        {todos.length ? (
                          todos.map(renderTaskCard)
                        ) : (
                          <div className="empty-stack">
                            All clear in this view.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mini-col">
                      <div className="mini-col-hd">
                        <span>
                          <span className="col-dot is-done" aria-hidden="true" />
                          Done
                        </span>
                        <span
                          ref={doneBadgeRef}
                          className="count-badge is-done"
                        >
                          {dones.length}
                        </span>
                      </div>
                      <div className="task-stack">
                        {dones.length ? (
                          dones.map(renderTaskCard)
                        ) : (
                          <div className="empty-stack">
                            Check a task to move it here.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="board-hint">
                  <span>
                    Select any checkbox to fly a card into Done.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div
          className="ticker-band"
          role="region"
          aria-label="Supported subject labels"
          data-paused={ribbonPaused}
        >
          <button
            type="button"
            className="ticker-toggle btn-secondary"
            aria-label="Pause subject ribbon"
            aria-pressed={ribbonPaused}
            onClick={() => setRibbonPaused(!ribbonPaused)}
          >
            <span aria-hidden="true">{ribbonPaused ? "▶" : "Ⅱ"}</span>
          </button>
          <div className="ticker-window">
            <div ref={tickerRef} className="ticker-scroll-wrap">
              <div className="ticker-track">
                {[...SUBJECTS, ...SUBJECTS].map((subject, index) => (
                  <div
                    key={`${subject.code}-${index}`}
                    className="ticker-chip"
                    aria-hidden={index >= SUBJECTS.length || undefined}
                  >
                    <span
                      className="subj-tag"
                      style={{ backgroundColor: subject.bg }}
                    >
                      {subject.code}
                    </span>
                    <span>{subject.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <section className="section" id="workflow">
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
              className="stage-tabs reveal"
              role="tablist"
              aria-label="Feature workflow"
              aria-orientation="horizontal"
              onKeyDown={navigateOptions}
            >
              {WORKFLOW_TABS.map((tab) => (
                <button
                  key={tab.id}
                  id={`${uid}-stage-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={stageId === tab.id}
                  aria-controls={stagePanelId}
                  tabIndex={stageId === tab.id ? 0 : -1}
                  className={`stage-tab${stageId === tab.id ? " is-active" : ""}`}
                  onClick={() => setStageId(tab.id)}
                >
                  <span className="stage-tab-lbl">{tab.label}</span>
                </button>
              ))}
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
                    <span className="stage-demo-meta">Select a day</span>
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
                      const event = CALENDAR_EVENTS[day];
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`cal-day${calDay === day ? " is-selected" : ""}`}
                          onClick={() => setCalDay(day)}
                          aria-pressed={calDay === day}
                          aria-label={`November ${day}${event ? `, ${event.title}` : ""}`}
                        >
                          <span>{day}</span>
                          {event && (
                            <span className="cal-dots" aria-hidden="true">
                              <span
                                className="cal-dot"
                                style={{
                                  backgroundColor: SUBJECT_BG_MAP[event.subj],
                                }}
                              />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="cal-agenda">
                    {activeCalEvent ? (
                      <>
                        <div>
                          <strong>{activeCalEvent.title}</strong>
                          <div className="stage-demo-meta">
                            Nov {calDay} · {activeCalEvent.time}
                          </div>
                        </div>
                        <span
                          className="subj-tag"
                          style={{
                            backgroundColor: SUBJECT_BG_MAP[activeCalEvent.subj],
                          }}
                        >
                          {activeCalEvent.subj}
                        </span>
                      </>
                    ) : (
                      <span className="stage-demo-meta">
                        No deadlines scheduled for day {calDay}.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {stageId === "qr" && (
                <div className="qr-stage">
                  <div className="qr-grid" aria-hidden="true">
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
                      {adminDraftMode ? "Admin draft mode" : "Live student board"}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => setAdminDraftMode((prev) => !prev)}
                    >
                      {adminDraftMode
                        ? "Switch to Student View"
                        : "Open Draft Preview"}
                    </button>
                  </div>
                  <div
                    className={`stage-note${adminDraftMode ? " is-draft" : ""}`}
                  >
                    {adminDraftMode ? (
                      <>
                        <strong>2 unpublished edits staged:</strong> Added CP104
                        lab rubric and shifted GENSCI quiz to Friday.
                      </>
                    ) : (
                      <>
                        <strong>Published v14:</strong> All 19 students see the
                        verified live board.
                      </>
                    )}
                  </div>
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
                className="segmented-control"
                role="radiogroup"
                aria-label="Billing period"
                aria-orientation="horizontal"
                onKeyDown={navigateOptions}
              >
                {BILLING_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={billing === option.id}
                    tabIndex={billing === option.id ? 0 : -1}
                    className={`seg-item${billing === option.id ? " is-active" : ""}`}
                    onClick={() => setBilling(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
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
            <span>Study hall landing page and portal for computer-programming</span>
          </div>
          <span>Demo landing surface. Auth connects to your PostgreSQL session store.</span>
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
