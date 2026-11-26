import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { chromium } from "playwright";
import pg from "pg";

const origin = new URL(process.env.BASE_URL || "http://127.0.0.1:3412");
const testDb = process.env.TEST_DATABASE_URL;
const loopback = ["localhost", "127.0.0.1", "[::1]"];
assert(loopback.includes(origin.hostname), "Run against a local app server.");
if (testDb) assert(loopback.includes(new URL(testDb).hostname), "Use a disposable local PostgreSQL database.");
const db = testDb && new pg.Client({ connectionString: testDb });
const browser = await chromium.launch();
const errors = [];

async function auditPage(page, path, theme) {
  assert.equal(new URL(page.url()).pathname, path);
  if (path !== "/") assert.equal(await page.locator('[role="tablist"],[role="radiogroup"]').count(), 0);
  const title = page.getByRole("heading", { level: 1 });
  assert(await title.isVisible());
  const body = page.locator(({ "/": ".hero-sub", "/dashboard": ".account-details dd" })[path] || ".alt");
  const styles = await page.evaluate(async ([heading, copy]) => {
    await document.fonts.ready;
    const family = el => getComputedStyle(el).fontFamily.split(",")[0].replaceAll('"', "");
    const control = document.querySelector("main [role=radio], .auth-panel button");
    const overflow = [];
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) {
      scrollTo({ top: y, behavior: "instant" });
      await new Promise(requestAnimationFrame);
      overflow.push(document.documentElement.scrollWidth - innerWidth);
    }
    scrollTo({ top: 0, behavior: "instant" });
    return {
      heading: family(heading), body: family(copy), control: family(control), theme: document.documentElement.dataset.theme,
      loaded: [...new Set([...document.fonts].filter(f => f.status === "loaded").map(f => f.family.replaceAll('"', "")))],
      overflow: Math.max(...overflow),
    };
  }, [await title.elementHandle(), await body.elementHandle()]);
  assert.equal(styles.theme, theme);
  assert.equal(styles.heading, "Pixelify Sans Variable");
  assert.equal(styles.body, "Geist Variable");
  assert.equal(styles.control, "Geist Variable");
  for (const face of [styles.heading, styles.body]) assert(styles.loaded.includes(face));
  assert.equal(styles.overflow, 0, `Horizontal overflow at ${path}`);
  console.log(page.viewportSize().width, path, JSON.stringify(styles));
}

async function keyboard(page) {
  const groups = await page.locator('[role="tablist"], [role="radiogroup"]').all();
  assert.equal(groups.length, 4);
  for (const group of groups) {
    const tabs = await group.getAttribute("role") === "tablist";
    const items = group.getByRole(tabs ? "tab" : "radio");
    const attr = tabs ? "aria-selected" : "aria-checked";
    const selected = group.locator(`[${attr}="true"]`);
    const size = await items.count();
    const first = items.first();
    async function check(index) {
      const item = items.nth(index);
      assert(await item.evaluate(el => document.activeElement === el));
      assert.equal(await item.getAttribute(attr), "true");
      assert.equal(await selected.count(), 1);
      assert.equal(await items.evaluateAll(els => els.filter(el => el.tabIndex === 0).length), 1);
      if (tabs) {
        assert(await item.evaluate(el => {
          const panel = document.getElementById(el.getAttribute("aria-controls"));
          return panel?.getAttribute("role") === "tabpanel" && panel.checkVisibility() &&
            !!el.id && panel.getAttribute("aria-labelledby") === el.id;
        }));
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
    assert(await group.evaluate(el => !el.contains(document.activeElement)));
    await page.keyboard.press("Shift+Tab");
    await check(size - 1);
    console.log("keyboard", await group.getAttribute("aria-label"), size);
  }
}

async function ribbonMotion(page) {
  const toggle = page.getByRole("button", { name: "Pause subject ribbon" });
  const track = page.locator(".ticker-track");
  await toggle.focus();
  await page.keyboard.press("Space");
  assert.equal(await toggle.getAttribute("aria-pressed"), "true");
  assert.equal(await track.evaluate(el => getComputedStyle(el).animationPlayState), "paused");
  await page.keyboard.press("Enter");
  assert.equal(await toggle.getAttribute("aria-pressed"), "false");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await track.evaluate(el => getComputedStyle(el).animationName), "none");
  assert(!(await toggle.isVisible()));
  await page.emulateMedia({ reducedMotion: "no-preference" });
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
      const result = page.waitForResponse(r => new URL(r.url()).pathname === "/api/" + mode);
      await page.getByRole("button", { name: mode === "signup" ? "Create account" : "Log in", exact: true }).click();
      assert.equal((await result).status(), mode === "signup" ? 201 : 200);
      await page.waitForURL("**/dashboard");
      await page.reload();
      await auditPage(page, "/dashboard", theme);
      assert.equal(await page.locator(".account-details dd").innerText(), email);
      const cookie = (await context.cookies()).find(c => c.name === "session_id");
      assert(cookie?.httpOnly && cookie.secure && cookie.sameSite === "Lax" && cookie.path === "/");
      assert(cookie.value !== previous);
      assert.equal(await sessionRows(cookie, email), 1);
      previous = cookie.value;
      const logout = page.waitForResponse(r => new URL(r.url()).pathname === "/api/logout");
      await page.getByRole("button", { name: "Log out" }).click();
      assert.equal((await logout).status(), 200);
      await page.waitForURL("**/login");
      assert(!(await context.cookies()).some(c => c.name === "session_id"));
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
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ baseURL: origin.href, viewport });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
    page.on("response", res => { if (res.status() >= 400) errors.push(res.status() + " " + res.url()); });
    for (const theme of ["light", "dark"]) {
      await page.goto("/");
      if (theme === "dark") {
        await page.getByRole("button", { name: "Switch to dark theme" }).click();
        await page.getByRole("button", { name: "Switch to light theme" }).waitFor();
      }
      await auditPage(page, "/", theme);
      await keyboard(page);
      await ribbonMotion(page);
      for (const path of ["/login", "/signup"]) {
        await page.goto(path);
        await auditPage(page, path, theme);
      }
      await page.goto("/dashboard");
      await page.waitForURL("**/login");
      if (db) await auth(page, theme);
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log("PASS" + (db ? " including PostgreSQL" : " (authenticated dashboard and database flow skipped)"));
} finally {
  await browser.close();
  if (db) await db.end();
}
