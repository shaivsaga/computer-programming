import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import pg from "pg";

const origin = new URL(process.env.BASE_URL || "http://127.0.0.1:3412");
const testDb = process.env.TEST_DATABASE_URL;
const loopback = ["localhost", "127.0.0.1", "[::1]"];
assert(loopback.includes(origin.hostname), "Run against a local app server.");
if (testDb) {
  assert(
    loopback.includes(new URL(testDb).hostname),
    "Use a disposable local PostgreSQL database."
  );
}

const fallbackExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  "/home/markus/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell";

async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch (error) {
    if (existsSync(fallbackExecutable)) {
      return await chromium.launch({ executablePath: fallbackExecutable });
    }
    throw error;
  }
}

const db = testDb && new pg.Client({ connectionString: testDb });
const browser = await launchBrowser();
const errors = [];
let allowExpected401 = false;

async function auditPage(page, path, theme) {
  assert.equal(new URL(page.url()).pathname, path);
  const expectedGroups = path === "/" ? 4 : path === "/signup" ? 1 : 0;
  assert.equal(
    await page.locator('[role="tablist"],[role="radiogroup"]').count(),
    expectedGroups,
    `Unexpected widget group count on ${path}`
  );
  const title = page.getByRole("heading", { level: 1 });
  assert(await title.isVisible());
  const body = page.locator(
    ({ "/": ".hero-sub", "/dashboard": ".account-details dd" })[path] || ".alt"
  );
  const styles = await page.evaluate(
    async ([heading, copy]) => {
      await document.fonts.ready;
      const family = (el) =>
        getComputedStyle(el).fontFamily.split(",")[0].replaceAll('"', "");
      const control = document.querySelector(
        "main [role=radio], .auth-submit-slot button"
      );
      const overflow = [];
      for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) {
        scrollTo({ top: y, behavior: "instant" });
        await new Promise(requestAnimationFrame);
        overflow.push(document.documentElement.scrollWidth - innerWidth);
      }
      scrollTo({ top: 0, behavior: "instant" });
      await new Promise(requestAnimationFrame);
      return {
        heading: family(heading),
        body: family(copy),
        control: family(control),
        theme: document.documentElement.dataset.theme,
        loaded: [
          ...new Set(
            [...document.fonts]
              .filter((f) => f.status === "loaded")
              .map((f) => f.family.replaceAll('"', ""))
          ),
        ],
        overflow: Math.max(...overflow),
      };
    },
    [await title.elementHandle(), await body.elementHandle()]
  );
  assert.equal(styles.theme, theme);
  assert.equal(styles.heading, "Pixelify Sans Variable");
  assert.equal(styles.body, "Geist Variable");
  assert.equal(styles.control, "Geist Variable");
  for (const face of [styles.heading, styles.body]) {
    assert(styles.loaded.includes(face));
  }
  assert.equal(styles.overflow, 0, `Horizontal overflow at ${path}`);
  console.log(page.viewportSize().width, path, JSON.stringify(styles));
}

async function checkGroupKeyboard(page, expectedCount) {
  const groups = await page.locator('[role="tablist"], [role="radiogroup"]').all();
  assert.equal(groups.length, expectedCount);
  for (const group of groups) {
    const tabs = (await group.getAttribute("role")) === "tablist";
    const items = group.getByRole(tabs ? "tab" : "radio");
    const attr = tabs ? "aria-selected" : "aria-checked";
    const selected = group.locator(`[${attr}="true"]`);
    const size = await items.count();
    const first = items.first();

    async function check(index) {
      const item = items.nth(index);
      assert(await item.evaluate((el) => document.activeElement === el));
      assert.equal(await item.getAttribute(attr), "true");
      assert.equal(await selected.count(), 1);
      assert.equal(
        await items.evaluateAll((els) => els.filter((el) => el.tabIndex === 0).length),
        1
      );
      if (tabs) {
        assert(
          await item.evaluate((el) => {
            const panel = document.getElementById(el.getAttribute("aria-controls"));
            return (
              panel?.getAttribute("role") === "tabpanel" &&
              panel.checkVisibility() &&
              !!el.id &&
              panel.getAttribute("aria-labelledby") === el.id
            );
          })
        );
      }
    }

    await first.click();
    await first.focus();
    await check(0);
    await page.keyboard.press("ArrowLeft");
    await check(size - 1);
    for (let index = 0; index < size; index++) {
      await page.keyboard.press("ArrowRight");
      await check(index);
    }
    if (tabs) {
      await page.keyboard.press("ArrowUp");
      await check(size - 1);
      await page.keyboard.press("ArrowDown");
      await check(size - 1);
      await page.keyboard.press("Home");
      await check(0);
      await page.keyboard.press("End");
      await check(size - 1);
    } else {
      await page.keyboard.press("ArrowDown");
      await check(0);
      await page.keyboard.press("ArrowUp");
      await check(size - 1);
    }
    await page.keyboard.press("Tab");
    assert(await group.evaluate((el) => !el.contains(document.activeElement)));
    await page.keyboard.press("Shift+Tab");
    await check(size - 1);
    console.log("keyboard", await group.getAttribute("aria-label") || await group.getAttribute("aria-labelledby"), size);
  }
}

async function continuumHeaderAndReel(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  const header = page.locator("header.tb");
  await page.waitForFunction(
    () =>
      document.querySelector("header.tb")?.dataset.moved === "false" &&
      getComputedStyle(document.querySelector("header.tb")).backgroundColor ===
        "rgba(0, 0, 0, 0)"
  );
  assert.equal(await header.getAttribute("data-moved"), "false");

  await page.evaluate(() => window.scrollTo({ top: 420, behavior: "instant" }));
  await page.waitForFunction(
    () =>
      document.querySelector("header.tb")?.dataset.moved === "true" &&
      getComputedStyle(document.querySelector("header.tb")).backgroundColor !==
        "rgba(0, 0, 0, 0)"
  );
  assert.equal(await header.getAttribute("data-moved"), "true");

  const reelShift = await page.locator(".reel-track").evaluate((el) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return { tx: matrix.m41, animationName: getComputedStyle(el).animationName };
  });
  assert.equal(reelShift.animationName, "none");
  assert(reelShift.tx < -5, `Expected scroll-scrubbed negative translateX, got ${reelShift.tx}`);

  // Reduced motion freezes reel transform and wraps chips cleanly with zero overflow.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector(".reel-track")).flexWrap === "wrap"
  );
  const reducedReel = await page.locator(".reel-track").evaluate((el) => ({
    transform: getComputedStyle(el).transform,
    wrap: getComputedStyle(el).flexWrap,
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  assert.equal(reducedReel.transform, "none");
  assert.equal(reducedReel.wrap, "wrap");
  assert.equal(reducedReel.overflow, 0);
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForFunction(
    () => document.querySelector("header.tb")?.dataset.moved === "false"
  );
  assert.equal(await header.getAttribute("data-moved"), "false");
}

async function kanbanBoardAndTaxonomy(page) {
  const getColStats = async () =>
    page.locator(".mini-col").evaluateAll((cols) =>
      cols.map((col) => ({
        title: col.querySelector(".mini-col-hd span")?.textContent.trim() ?? "",
        count: col.querySelector(".count-badge")?.textContent.trim() ?? "",
        width: Math.round(col.getBoundingClientRect().width),
      }))
    );

  const initial = await getColStats();
  assert.deepEqual(
    initial.map((c) => c.title),
    ["To Do", "In Progress", "Done"]
  );
  assert.deepEqual(
    initial.map((c) => c.count),
    ["3", "1", "0"]
  );
  if (page.viewportSize().width === 1440) {
    for (const col of initial) {
      assert(col.width >= 300, `Expected desktop Kanban column >= 300px, got ${col.width}px`);
    }
  }

  // Advance "Oral recitation: Newton's laws": To Do -> In Progress -> Done -> To Do
  await page
    .getByRole("button", { name: "Move Oral recitation: Newton's laws to In Progress" })
    .click();
  assert.deepEqual(
    (await getColStats()).map((c) => c.count),
    ["2", "2", "0"]
  );
  const inProgressBtn = page.getByRole("button", {
    name: "Mark Oral recitation: Newton's laws as Done",
  });
  assert(await inProgressBtn.evaluate((el) => el.classList.contains("in-progress")));

  await inProgressBtn.click();
  assert.deepEqual(
    (await getColStats()).map((c) => c.count),
    ["2", "1", "1"]
  );
  const doneBtn = page.getByRole("button", {
    name: "Move Oral recitation: Newton's laws back to To Do",
  });
  assert(await doneBtn.evaluate((el) => el.classList.contains("checked")));

  await doneBtn.click();
  assert.deepEqual(
    (await getColStats()).map((c) => c.count),
    ["3", "1", "0"]
  );

  await page.getByRole("button", { name: "Reset demo" }).click();
  assert.deepEqual(
    (await getColStats()).map((c) => c.count),
    ["3", "1", "0"]
  );

  const reelText = await page.locator(".reel-track").innerText();
  for (const subjectName of [
    "Personal Development",
    "Mabisang Komunikasyon",
    "Effective Communication",
    "Computer Programming 104",
    "Finite Mathematics 101",
    "Pag-aaral ng Kasaysayang Lipunang Pilipino",
  ]) {
    assert(reelText.includes(subjectName), `Missing corrected subject name: ${subjectName}`);
  }
  console.log("kanban 3-column workflow and taxonomy verified");
}

async function dotCalendarAndHoldPublish(page) {
  await page.getByRole("tab", { name: "Calm Calendar" }).click();
  const day27 = page.getByRole("button", { name: /^Day 27,/ });
  assert.equal(await day27.getAttribute("data-density"), "3");
  assert.equal(await page.locator(".cal-agenda").count(), 3);
  const minDayHeight = await page.locator(".cal-day").evaluateAll((els) =>
    Math.min(...els.map((el) => el.getBoundingClientRect().height))
  );
  assert(minDayHeight >= 44, `Expected calendar day height >= 44, got ${minDayHeight}`);

  const day28 = page.getByRole("button", { name: /^Day 28,/ });
  await day28.click();
  assert.equal(await day28.getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator(".cal-agenda").count(), 2);
  const agendaText = await page.locator(".cal-agenda-list").innerText();
  assert(agendaText.includes("Newton's laws") && agendaText.includes("Cavite Mutiny"));

  // Hold to publish finite state machine
  await page.getByRole("tab", { name: "Draft & Publish" }).click();
  const holdBtn = page.locator(".hold-btn");
  await holdBtn.scrollIntoViewIfNeeded();
  const holdBox = await holdBtn.boundingBox();
  assert(holdBox.height >= 44 && holdBox.width >= 44);
  assert.equal(await holdBtn.getAttribute("data-state"), "idle");

  // 1. Short pointer press cancels cleanly
  await page.mouse.move(holdBox.x + holdBox.width / 2, holdBox.y + holdBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(200);
  assert.equal(await holdBtn.getAttribute("data-state"), "holding");
  await page.mouse.up();
  assert.equal(await holdBtn.getAttribute("data-state"), "cancelled");

  // 2. Full pointer hold commits v15 + checkmark draw
  await page.mouse.down();
  await page.waitForFunction(
    () => document.querySelector(".hold-btn")?.dataset.state === "committed"
  );
  await page.mouse.up();
  assert(await page.locator(".hold-btn .check-draw-path").isVisible());
  assert((await holdBtn.innerText()).includes("Published v15"));

  // 3. Stage new draft + keyboard Space early abort + full hold commit v16
  await page.getByRole("button", { name: "Stage new draft" }).click();
  assert.equal(await holdBtn.getAttribute("data-state"), "idle");
  await holdBtn.focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(180);
  await page.keyboard.up("Space");
  assert.equal(await holdBtn.getAttribute("data-state"), "cancelled");

  await page.keyboard.down("Space");
  await page.waitForFunction(
    () => document.querySelector(".hold-btn")?.dataset.state === "committed"
  );
  await page.keyboard.up("Space");
  assert((await holdBtn.innerText()).includes("Published v16"));

  // 4. Reduced motion commits immediately on press
  await page.getByRole("button", { name: "Stage new draft" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await holdBtn.click();
  assert.equal(await holdBtn.getAttribute("data-state"), "committed");
  assert((await holdBtn.innerText()).includes("Published v17"));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  console.log("landing micro-stages verified (dot-calendar + hold-to-publish FSM)");
}

async function tactileAuthUx(page) {
  await page.goto("/signup");
  await checkGroupKeyboard(page, 1);
  // After keyboard loop ends at last option (School Portal), art-plan matches
  assert.equal(await page.locator(".art-plan").innerText(), "Plan: School Portal");

  // Focus & Show password lock-stage reactivity
  await page.locator("#password").focus();
  assert.equal(await page.locator(".art-card").getAttribute("data-lock-state"), "typing");
  await page.getByLabel("Show password").click();
  assert.equal(await page.locator(".art-card").getAttribute("data-lock-state"), "peeking");
  await page.getByLabel("Show password").click();

  // Invalid login shake + alert state
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("nobody@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password-123");
  allowExpected401 = true;
  const failRes = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/login");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  assert.equal((await failRes).status(), 401);
  await page.locator("main [role=alert]").waitFor();
  await page.waitForTimeout(50);
  allowExpected401 = false;
  assert.equal(await page.locator(".auth-form").getAttribute("data-shake-count"), "1");
  assert.equal(await page.locator(".art-card").getAttribute("data-lock-state"), "error");
  console.log("tactile auth UX verified (signup tier radio + lock states + 401 shake)");
}

async function sessionRows(cookie, email) {
  const hash = createHash("sha256").update(cookie.value).digest("hex");
  const result = await db.query(
    "SELECT 1 FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.email = $1 AND s.id = $2 AND s.expires_at > NOW()",
    [email, hash]
  );
  return result.rowCount;
}

async function auth(page, theme) {
  const context = page.context();
  const email = `pw-${randomUUID()}@example.invalid`;
  const password = randomUUID();
  let previous;
  try {
    for (const mode of ["signup", "login"]) {
      await page.goto("/" + mode);
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      const result = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/" + mode);
      await page
        .getByRole("button", {
          name: mode === "signup" ? "Create account" : "Log in",
          exact: true,
        })
        .click();
      assert.equal((await result).status(), mode === "signup" ? 201 : 200);
      await page.waitForURL("**/dashboard");
      await page.reload();
      await auditPage(page, "/dashboard", theme);
      assert.equal(await page.locator(".account-details dd").innerText(), email);
      const cookie = (await context.cookies()).find((c) => c.name === "session_id");
      assert(
        cookie?.httpOnly &&
          cookie.secure &&
          cookie.sameSite === "Lax" &&
          cookie.path === "/"
      );
      assert(cookie.value !== previous);
      assert.equal(await sessionRows(cookie, email), 1);
      previous = cookie.value;
      const logout = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/logout");
      await page.getByRole("button", { name: "Log out" }).click();
      assert.equal((await logout).status(), 200);
      await page.waitForURL("**/login");
      assert(!(await context.cookies()).some((c) => c.name === "session_id"));
      assert.equal(await sessionRows(cookie, email), 0);
      await page.goto("/dashboard");
      await page.waitForURL("**/login");
      console.log(mode, "session verified in PostgreSQL, logout revoked");
    }
  } finally {
    await db.query("DELETE FROM users WHERE email = $1", [email]);
  }
}

try {
  if (db) await db.connect();
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ baseURL: origin.href, viewport });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        if (allowExpected401 && msg.text().includes("401")) return;
        errors.push(msg.text());
      }
    });
    page.on("response", (res) => {
      if (res.status() >= 400) {
        if (allowExpected401 && res.status() === 401 && res.url().includes("/api/login")) {
          return;
        }
        errors.push(res.status() + " " + res.url());
      }
    });
    for (const theme of ["light", "dark"]) {
      await page.goto("/");
      if (theme === "dark") {
        await page.getByRole("button", { name: "Switch to dark theme" }).click();
        await page.getByRole("button", { name: "Switch to light theme" }).waitFor();
      }
      await auditPage(page, "/", theme);
      await kanbanBoardAndTaxonomy(page);
      await checkGroupKeyboard(page, 4);
      await continuumHeaderAndReel(page);
      await dotCalendarAndHoldPublish(page);
      for (const path of ["/login", "/signup"]) {
        await page.goto(path);
        await auditPage(page, path, theme);
      }
      if (db) {
        await tactileAuthUx(page);
        await page.goto("/dashboard");
        await page.waitForURL("**/login");
        await auth(page, theme);
      } else {
        await page.goto("/dashboard");
        await page.waitForURL("**/login");
      }
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS" +
      (db
        ? " including PostgreSQL"
        : " (authenticated dashboard and database flow skipped)")
  );
} finally {
  await browser.close();
  if (db) await db.end();
}
