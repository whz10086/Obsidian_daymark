import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.DAYMARK_PLAYWRIGHT_PATH || "playwright");
const directory = fileURLToPath(new URL(".", import.meta.url));
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const width of [320, 390, 1200]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(pathToFileURL(path.join(directory, "index.html")).href + "?theme=dark");
    await page.waitForFunction(() => window.previewReady);
    await page.evaluate(() => window.preview.openRestReminder());
    const modal = page.locator(".daymark-rest-modal");
    assert.equal(await modal.getByText("再响一次", { exact: true }).count(), 0);
    await modal.getByRole("button", { name: "敲钟", exact: true }).click();
    await page.waitForSelector(".daymark-rest-merit");
    assert.equal(await page.locator(".daymark-rest-merit").textContent(), "清净 +1");
    await modal.getByRole("button", { name: "木鱼", exact: true }).click();
    assert.equal(await modal.locator(".daymark-woodfish").count(), 1);
    await modal.getByRole("button", { name: "敲木鱼", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector(".daymark-rest-instrument").disabled);
    assert.equal(await page.evaluate(() => window.preview.restChimeReplayCount), 2);
    assert.equal(await modal.locator(".daymark-rest-merit").count(), 1);
    await page.screenshot({ path: path.join(directory, "screenshots", `woodfish-${width}.png`) });
    await modal.getByRole("button", { name: "知道了", exact: true }).click();
    assert.equal(await page.locator(".daymark-rest-modal").count(), 0);
    await page.close();
  }
  console.log("INSTRUMENT_QA_PASS: bell, woodfish, feedback, dismissal at 320/390/1200px");
} finally { await browser.close(); }
