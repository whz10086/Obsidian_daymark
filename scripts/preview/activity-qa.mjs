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
    const fixture = await page.evaluate(() => {
      const c = window.preview.controller;
      const duration = c.habits.find(h => h.type === "duration");
      const count = c.habits.find(h => h.type === "count");
      return { durationId: duration.id, durationName: duration.name, countId: count.id, date: c.deviceState.runningTimer.date, before: JSON.stringify([c.habits, c.events]) };
    });
    // Reorder before opening the compact activity pane.
    const orderCheck = await page.evaluate(async () => {
      const c = window.preview.controller;
      const peers = c.habits.filter(h => h.category === c.habits[0].category);
      const original = peers.map(h => h.id);
      return { original, first: peers[0].id, second: peers[1].id, secondName: peers[1].name };
    });
    const reorderData = await page.evaluateHandle(() => new DataTransfer());
    await page.getByRole("button", { name: `拖动排序 ${orderCheck.secondName}`, exact: true }).dispatchEvent("dragstart", {dataTransfer: reorderData});
    await page.locator(`[data-habit-id="${orderCheck.first}"]`).dispatchEvent("drop", {dataTransfer: reorderData, clientY: 0});
    assert.equal(await page.evaluate(() => window.preview.controller.habits[0].id), orderCheck.second);
    await page.getByRole("button", { name: `下移 ${orderCheck.secondName}`, exact: true }).click();
    assert.equal(await page.evaluate(() => window.preview.controller.habits[0].id), orderCheck.first);
    await page.getByRole("button", { name: "打开活动悬浮窗", exact: true }).click();
    assert.equal(await page.locator(".daymark-activity-view").count(), 1);
    const transfer = await page.evaluateHandle(() => new DataTransfer());
    const handle = page.getByRole("button", { name: `添加 ${fixture.durationName} 到活动列表`, exact: true });
    await handle.dispatchEvent("dragstart", { dataTransfer: transfer });
    // Electron may retain only the standard format across native windows.
    await transfer.evaluate(data => data.clearData("application/x-daymark-habit"));
    await page.locator(".daymark-focus-panel").dispatchEvent("dragover", { dataTransfer: transfer });
    await page.locator(".daymark-focus-panel").dispatchEvent("drop", { dataTransfer: transfer });
    await page.waitForFunction(() => document.querySelectorAll(".daymark-activity-row").length === 1);
    await page.getByRole("button", { name: "＋ 添加项目", exact: true }).click();
    await page.getByLabel("选择已有活动项目").selectOption(fixture.countId);
    await page.getByRole("button", { name: "添加已有项目", exact: true }).click();
    assert.equal(await page.locator(".daymark-activity-row").count(), 2);
    assert.equal(await page.evaluate(() => JSON.stringify([window.preview.controller.habits, window.preview.controller.events])), fixture.before);
    await page.getByRole("button", { name: `添加 ${fixture.durationName} 到活动列表`, exact: true }).dispatchEvent("click");
    assert.equal(await page.locator(".daymark-activity-row").count(), 2);
    await page.evaluate(({ durationId, countId }) => {
      const c = window.preview.controller;
      c.events.length = 0;
      const running = c.deviceState.runningTimer;
      running.startedAt = Date.now() - 2000;
      running.pausedAt = Date.now();
      c.habits.find(h => h.id === durationId).rules[0].target = 3;
      c.habits.find(h => h.id === countId).rules[0].target = 2;
      window.preview.view.refresh(); window.preview.activityView.refresh();
    }, fixture);
    await page.waitForTimeout(1600);
    assert.equal(await page.locator(`[data-activity-id="${fixture.durationId}"] .daymark-activity-check`).getAttribute("aria-label"), "尚未达标");
    await page.evaluate(() => {
      const running = window.preview.controller.deviceState.runningTimer;
      running.startedAt += Date.now() - running.pausedAt;
      delete running.pausedAt;
      window.preview.view.refresh(); window.preview.activityView.refresh();
    });
    await page.waitForFunction(id => document.querySelector(`[data-activity-id="${id}"] .daymark-activity-check`)?.getAttribute("aria-label") === "已自动完成", fixture.durationId);
    await page.evaluate(async ({ countId }) => {
      const c = window.preview.controller;
      await c.recordNumber(c.habits.find(h => h.id === countId), c.deviceState.runningTimer.date, 2);
    }, fixture);
    assert.equal(await page.locator(".daymark-activity-row.is-complete").count(), 2);
    await page.evaluate(async ({ countId }) => {
      const c = window.preview.controller;
      await c.retractEvent(c.habits.find(h => h.id === countId), c.events.find(e => e.habitId === countId && e.type === "add"));
    }, fixture);
    assert.equal(await page.locator(`[data-activity-id="${fixture.countId}"] .daymark-activity-check`).getAttribute("aria-label"), "尚未达标");
    const previous = new Date(fixture.date + "T12:00:00Z");
    previous.setUTCDate(previous.getUTCDate() - 1);
    await page.getByLabel("活动列表日期").fill(previous.toISOString().slice(0,10));
    assert.equal(await page.locator(".daymark-activity-row").count(), 0);
    await page.getByLabel("活动列表日期").fill(fixture.date);
    assert.equal(await page.locator(".daymark-activity-row").count(), 2);
    await page.locator(".daymark-focus-panel").scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.locator(".daymark-activity-view").screenshot({ path: path.join(out, `activity-${width}.png`) });
    const beforeRemoval = await page.evaluate(() => JSON.stringify([window.preview.controller.habits, window.preview.controller.events]));
    await page.getByRole("button", { name: `从活动列表移除 ${fixture.durationName}`, exact: true }).click();
    assert.equal(await page.locator(".daymark-activity-row").count(), 1);
    assert.equal(await page.evaluate(() => JSON.stringify([window.preview.controller.habits, window.preview.controller.events])), beforeRemoval);
    assert.deepEqual(errors, []);
    results.push({ width, reorderDragAndButtons: true, standalonePanel: true, dragAdd: true, mobileAdd: true, noDuplicates: true, liveCompletion: true, pausedExcluded: true, undoUnchecks: true, dateIsolation: true, sourceUnchanged: true });
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(path.join(out, "activity-qa.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
