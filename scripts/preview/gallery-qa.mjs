import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.DAYMARK_PLAYWRIGHT_PATH || "playwright");
const directory = fileURLToPath(new URL(".", import.meta.url));
const out = path.join(directory, "screenshots");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
try {
  for (const width of [320, 390, 1200]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(directory, "index.html")).href + "?theme=dark");
    await page.waitForFunction(() => window.previewReady);
    await page.getByRole("tab", { name: "Blender 展柜" }).click();
    assert.equal(await page.locator(".daymark-gallery-empty").count(), 1);
    // Synthetic local test artwork, not shipped as user gallery content.
    const png = await page.evaluate(() => {
      const canvas = document.createElement("canvas"); canvas.width = 700; canvas.height = 500;
      const ctx = canvas.getContext("2d");
      const gradient = ctx.createLinearGradient(0, 0, 700, 500);
      gradient.addColorStop(0, "#173c46"); gradient.addColorStop(1, "#100e23");
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 700, 500);
      ctx.fillStyle = "#9ce8d2"; ctx.beginPath(); ctx.moveTo(350, 110); ctx.lineTo(490, 190); ctx.lineTo(350, 275); ctx.lineTo(210, 190); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#5a9ba8"; ctx.beginPath(); ctx.moveTo(210, 190); ctx.lineTo(350, 275); ctx.lineTo(350, 420); ctx.lineTo(210, 335); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#3a547b"; ctx.beginPath(); ctx.moveTo(350, 275); ctx.lineTo(490, 190); ctx.lineTo(490, 335); ctx.lineTo(350, 420); ctx.closePath(); ctx.fill();
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await page.locator('input[type="file"]').setInputFiles(["形体练习.png", "光影试验.png", "材质研究.png"].map((name) => ({ name, mimeType: "image/png", buffer: Buffer.from(png, "base64") })));
    assert.equal(await page.locator(".daymark-gallery-card").count(), 3);
    await page.getByRole("button", { name: "编辑作品：形体练习.png", exact: true }).click();
    await page.getByLabel("作品标题", { exact: true }).fill("静物 · 形体练习");
    await page.getByLabel("作品说明", { exact: true }).fill("测试作品：玻璃与金属的光影。\n支持后续持续添加。" );
    await page.getByRole("button", { name: "保存作品说明", exact: true }).click();
    await page.getByRole("button", { name: "放大作品：静物 · 形体练习", exact: true }).click();
    assert.equal(await page.locator(".daymark-gallery-lightbox img").count(), 1);
    await page.getByRole("button", { name: "关闭", exact: true }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(overflow, false);
    await page.screenshot({ path: path.join(out, `gallery-${width}.png`), fullPage: true });
    await page.getByRole("tab", { name: "日常打卡" }).click();
    await page.evaluate(() => { window.preview.controller.deviceState.runningTimer.pausedAt = Date.now(); window.preview.view.refresh(); });
    const before = await page.locator(".daymark-focus-clock .daymark-timer-label").textContent();
    await page.waitForTimeout(2100);
    assert.equal(await page.locator(".daymark-focus-clock .daymark-timer-label").textContent(), before);
    await page.getByRole("tab", { name: "积累统计" }).click();
    const totals = await page.locator("[data-cumulative-seconds]").allTextContents();
    await page.waitForTimeout(2100);
    assert.deepEqual(await page.locator("[data-cumulative-seconds]").allTextContents(), totals);
    assert.deepEqual(errors, []);
    results.push({ width, imported: 3, edited: true, lightbox: true, overflow, pausedTaskAndTotalsStable: true, errors });
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(path.join(out, "gallery-qa.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
