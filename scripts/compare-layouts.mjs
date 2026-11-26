import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = process.env.BASE_URL || "http://127.0.0.1:3412";
const railStyles = `
  .board-toolbar [role="radiogroup"] { flex-wrap: nowrap !important; overflow-x: auto; }
  .board-toolbar [role="radio"] { flex: none !important; }
  @media (max-width: 920px) {
    .stage-tabs { display: flex; overflow-x: auto; }
    .stage-tab { flex: 0 0 140px; }
  }
`;

// Use the shipped layout as the control. Both variants navigate the same
// options with the keyboard. Reduced motion removes unrelated marquee paints.
async function trial(browser, viewport, layout) {
  const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
  try {
    await page.goto(origin);
    await page.evaluate(() => document.fonts.ready);
    if (layout === "rail") await page.addStyleTag({ content: railStyles });
    const groups = page.locator('[role="tablist"], [role="radiogroup"]');
    const geometry = await groups.evaluateAll(elements => elements.map(group => {
      const bounds = group.getBoundingClientRect();
      const buttons = [...group.querySelectorAll("button")].map(el => el.getBoundingClientRect());
      return {
        group: group.getAttribute("aria-label"),
        overflow: group.scrollWidth - group.clientWidth,
        clipped: buttons.filter(b => b.left < bounds.left - 0.5 || b.right > bounds.right + 0.5).length,
        minWidth: Math.min(...buttons.map(b => b.width)),
        minHeight: Math.min(...buttons.map(b => b.height)),
      };
    }));
    const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const cdp = await page.context().newCDPSession(page);
    let paints = 0;
    let paintMicros = 0;
    cdp.on("Tracing.dataCollected", ({ value }) => {
      for (const event of value) {
        if (event.name === "Paint" && event.ph === "X") {
          paints++;
          paintMicros += event.dur;
        }
      }
    });
    await cdp.send("Tracing.start", { categories: "devtools.timeline", transferMode: "ReportEvents" });
    for (const group of await groups.all()) {
      const options = group.getByRole(await group.getAttribute("role") === "tablist" ? "tab" : "radio");
      const count = await options.count();
      await options.first().focus();
      for (let index = 0; index < count; index++) {
        await page.keyboard.press("ArrowRight");
        assert(await options.nth((index + 1) % count).evaluate(el => document.activeElement === el));
        await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
      }
    }
    const finished = new Promise(resolve => cdp.once("Tracing.tracingComplete", resolve));
    await cdp.send("Tracing.end");
    await finished;
    return { width: viewport.width, layout, geometry, docOverflow, paints, paintMs: paintMicros / 1000 };
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch();
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    for (let run = 0; run < 3; run++) {
      for (const layout of (run % 2 ? ["wrap", "rail"] : ["rail", "wrap"])) {
        console.log(JSON.stringify(await trial(browser, viewport, layout)));
      }
    }
  }
} finally {
  await browser.close();
}
