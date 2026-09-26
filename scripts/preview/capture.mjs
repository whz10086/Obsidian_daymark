import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Use an existing Playwright installation; this script never installs packages.
const require = createRequire(import.meta.url);
const playwrightLocation = process.env.DAYMARK_PLAYWRIGHT_PATH;
const { chromium } = playwrightLocation ? require(playwrightLocation) : require("playwright");
const directory = fileURLToPath(new URL(".", import.meta.url));
const out = path.join(directory, "screenshots");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.DAYMARK_BROWSER_PATH
    ? { executablePath: process.env.DAYMARK_BROWSER_PATH }
    : { channel: "msedge" }),
});
const results = [];
const ranges = [
  { id: "7d", label: /近\s*7\s*天/ },
  { id: "30d", label: /近\s*30\s*天/ },
  { id: "90d", label: /近\s*90\s*天/ },
  { id: "all", label: /全部/ },
];

async function inspectClock(page, verifyTick = false) {
  const clock = page.locator("time.daymark-live-clock");
  const count = await clock.count();
  const before = count === 1 ? (await clock.textContent())?.trim() ?? "" : "";
  let ticked = null;
  if (count === 1 && verifyTick) {
    try {
      await page.waitForFunction(
        (previous) => document.querySelector("time.daymark-live-clock")?.textContent?.trim() !== previous,
        before,
        { timeout: 2_500 },
      );
      ticked = true;
    } catch {
      ticked = false;
    }
  }
  const after = count === 1 ? (await clock.textContent())?.trim() ?? "" : "";
  const dateTime = count === 1 ? await clock.getAttribute("datetime") : null;
  return {
    count,
    before,
    after,
    dateTime,
    visible: count === 1 && await clock.isVisible(),
    validFormat: /^\d{2}:\d{2}:\d{2}$/u.test(after),
    validDateTime: Boolean(dateTime && Number.isFinite(Date.parse(dateTime))),
    silentUpdates: count === 1 && await clock.getAttribute("aria-live") === null,
    ticked,
  };
}

async function inspectDailyIChing(page) {
  const card = page.locator('.daymark-daily-iching[aria-label="今日一爻"]');
  const count = await card.count();
  const lineId = count === 1 ? await card.getAttribute("data-line-id") : null;
  const original = count === 1
    ? (await card.locator("blockquote.daymark-iching-original").textContent())?.trim() ?? ""
    : "";
  const explanation = count === 1
    ? (await card.locator(".daymark-iching-explanation p").textContent())?.trim() ?? ""
    : "";
  const disclaimer = count === 1
    ? (await card.locator(".daymark-iching-disclaimer").textContent())?.trim() ?? ""
    : "";
  return {
    count,
    lineId,
    original,
    explanation,
    visible: count === 1 && await card.isVisible(),
    validLineId: /^(0[1-9]|[1-5]\d|6[0-4])-[1-6]$/u.test(lineId ?? ""),
    hasOriginal: original.length > 0,
    hasExplanation: explanation.length > 0,
    hasReflectionDisclaimer: disclaimer.includes("不是对未来的预测"),
  };
}

async function inspectDailyCheckIn(page) {
  const card = page.locator('.daymark-daily-check-in[aria-label^="今日经典签到"]');
  const count = await card.count();
  const action = card.locator("button.daymark-check-in-action");
  return {
    count,
    visible: count === 1 && await card.isVisible(),
    state: count === 1 ? await card.getAttribute("data-check-in-state") : null,
    status: count === 1
      ? (await card.locator(".daymark-check-in-heading h2").textContent())?.trim() ?? ""
      : "",
    source: count === 1
      ? (await card.locator(".daymark-check-in-heading > span").textContent())?.trim() ?? ""
      : "",
    actionCount: count === 1 ? await action.count() : 0,
    actionLabel: count === 1 ? await action.getAttribute("aria-label") : null,
    actionDisabled: count === 1 && await action.isDisabled(),
  };
}

async function inspectMysticBackdrop(page) {
  return page.evaluate(() => {
    const expectedHexagrams = Array.from(
      { length: 64 },
      (_, index) => String.fromCodePoint(0x4dc0 + index),
    );
    const expectedRunes = [
      "ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ",
      "ᚺ", "ᚾ", "ᛁ", "ᛃ", "ᛇ", "ᛈ", "ᛉ", "ᛊ",
      "ᛏ", "ᛒ", "ᛖ", "ᛗ", "ᛚ", "ᛜ", "ᛞ", "ᛟ",
    ];
    const backdrops = [...document.querySelectorAll(".daymark-view .daymark-mystic-backdrop")];
    const backdrop = backdrops[0];
    const hexagrams = backdrop
      ? [...backdrop.querySelectorAll(".daymark-mystic-hexagram")]
        .map((element) => (element.textContent ?? "").trim())
      : [];
    const runes = backdrop
      ? [...backdrop.querySelectorAll(".daymark-mystic-rune")]
        .map((element) => (element.textContent ?? "").trim())
      : [];
    return {
      count: backdrops.length,
      ariaHidden: backdrop?.getAttribute("aria-hidden") === "true",
      hexagramCount: hexagrams.length,
      uniqueHexagramCount: new Set(hexagrams).size,
      hexagramsComplete:
        hexagrams.length === expectedHexagrams.length &&
        expectedHexagrams.every((symbol) => hexagrams.includes(symbol)),
      runeCount: runes.length,
      uniqueRuneCount: new Set(runes).size,
      runesComplete:
        runes.length === expectedRunes.length &&
        expectedRunes.every((symbol) => runes.includes(symbol)),
    };
  });
}

async function inspectViewBackground(page) {
  return page.evaluate(() => {
    const view = document.querySelector(".daymark-view");
    const computed = view ? getComputedStyle(view) : null;
    const backgroundColor = computed?.backgroundColor ?? "";
    const backgroundImage = computed?.backgroundImage ?? "";
    const samples = [];
    for (const source of [backgroundColor, backgroundImage]) {
      const pattern = /rgba?\(\s*([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*(?:,|\/)\s*([\d.]+)(%)?)?\s*\)/giu;
      for (const match of source.matchAll(pattern)) {
        const alphaValue = match[4] === undefined ? 1 : Number(match[4]);
        samples.push({
          rgb: match.slice(1, 4).map(Number),
          alpha: match[5] === "%" ? alphaValue / 100 : alphaValue,
        });
      }
    }
    const opaqueSamples = samples.filter((sample) => sample.alpha >= 0.95);
    const evaluatedSamples = opaqueSamples.map((sample) => {
      const linear = sample.rgb.map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return {
        ...sample,
        relativeLuminance: 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2],
      };
    });
    return {
      backgroundColor,
      backgroundImage,
      opaqueSamples: evaluatedSamples,
      dark:
        evaluatedSamples.length > 0 &&
        evaluatedSamples.every(
          (sample) =>
            sample.rgb.every((channel) => channel <= 96) &&
            sample.relativeLuminance <= 0.1,
        ),
    };
  });
}

async function inspectMilestones(page) {
  const section = page.locator('.daymark-milestone-journey[aria-label="全部时间里程碑"]');
  const count = await section.count();
  if (count !== 1) return { count, visible: false };

  return section.evaluate((root) => {
    const text = (element) => (element?.textContent ?? "").trim();
    const label = (element) => (element?.getAttribute("aria-label") ?? "").trim();
    const isRendered = (element) => Boolean(element && element.getClientRects().length > 0);
    const geomanticSignature = (pattern) => [...pattern.querySelectorAll(":scope > .daymark-geomantic-row")]
      .map((row) => row.querySelectorAll(":scope > .daymark-geomantic-dot").length)
      .join("");

    const total = text(root.querySelector(".daymark-milestone-total strong"));
    const progressBars = [...root.querySelectorAll('[role="progressbar"]')];
    const progressValues = progressBars.map((bar) => bar.getAttribute("aria-valuenow") ?? "");
    const progressBarsValid =
      progressBars.length === 2 &&
      progressBars.every((bar) => {
        const value = Number(bar.getAttribute("aria-valuenow"));
        return bar.getAttribute("aria-valuemin") === "0" &&
          bar.getAttribute("aria-valuemax") === "100" &&
          Number.isFinite(value) &&
          value >= 0 &&
          value <= 100 &&
          label(bar).length > 0 &&
          (bar.getAttribute("aria-valuetext") ?? "").trim().length > 0;
      }) &&
      label(progressBars[0]).includes("卦内计时进度") &&
      label(progressBars[1]).includes("六十四卦进度");

    const expectedHexagrams = Array.from(
      { length: 64 },
      (_, index) => String.fromCodePoint(0x4dc0 + index),
    );
    const hexagramCells = [...root.querySelectorAll(".daymark-hexagram-grid > .daymark-hexagram-cell")];
    const hexagramGlyphs = hexagramCells.map((cell) => text(cell.querySelector(":scope > span")));
    const completedHexagrams = hexagramCells.filter((cell) => cell.classList.contains("is-completed"));
    const currentHexagrams = hexagramCells.filter((cell) => cell.classList.contains("is-current"));
    const pendingHexagrams = hexagramCells.filter(
      (cell) => !cell.classList.contains("is-completed") && !cell.classList.contains("is-current"),
    );
    const currentMatch = label(currentHexagrams[0]).match(/^本轮第(\d+)小时对应第(\d+)卦/u);
    const currentNumber = currentMatch && currentMatch[1] === currentMatch[2]
      ? Number(currentMatch[2])
      : null;

    const systems = [...root.querySelectorAll(".daymark-symbol-system-list > .daymark-symbol-system")];
    const systemRewardCounts = systems.map(
      (system) => system.querySelectorAll(".daymark-symbol-grid > .daymark-symbol-tile").length,
    );
    const rewardTiles = [...root.querySelectorAll(".daymark-symbol-grid > .daymark-symbol-tile")];
    const rewardLabels = rewardTiles.map(label);
    const overviewGeomancy = [...root.querySelectorAll(
      ".daymark-symbol-grid .daymark-geomantic-pattern",
    )];
    const overviewGeomancySignatures = overviewGeomancy.map(geomanticSignature);

    const archive = root.querySelector(".daymark-symbol-archive");
    const archiveGroups = archive
      ? [...archive.querySelectorAll(":scope > .daymark-symbol-archive-body > .daymark-symbol-archive-group")]
      : [];
    const archiveItems = archive
      ? [...archive.querySelectorAll(".daymark-symbol-archive-item")]
      : [];
    const archiveLabels = archiveItems.map(label);
    const archiveMeanings = archiveItems.map((item) => text(item.querySelector(".daymark-symbol-archive-copy small")));
    const archiveCycles = archiveItems.map((item) => text(item.querySelector(".daymark-symbol-archive-meta strong")));
    const archiveDurations = archiveItems.map((item) => text(item.querySelector(".daymark-symbol-archive-meta span")));
    const runeItems = archiveGroups[0]
      ? [...archiveGroups[0].querySelectorAll(".daymark-symbol-archive-item")]
      : [];
    const runeSounds = runeItems.map((item) => text(item.querySelector(".daymark-symbol-archive-copy span")));
    const archiveGeomancy = archive
      ? [...archive.querySelectorAll(".daymark-geomantic-pattern")]
      : [];
    const archiveGeomancySignatures = archiveGeomancy.map(geomanticSignature);

    return {
      count: 1,
      total,
      validTotal: /^\d{2,}:\d{2}:\d{2}$/u.test(total),
      visible: isRendered(root),
      rangeIndependentCopy: text(root).includes("不受上方范围影响"),
      progressBarCount: progressBars.length,
      progressNow: progressValues.join("|"),
      progressBarsValid,
      hexagramCount: hexagramCells.length,
      uniqueHexagramCount: new Set(hexagramGlyphs).size,
      hexagramOrderComplete:
        hexagramGlyphs.length === expectedHexagrams.length &&
        hexagramGlyphs.every((glyph, index) => glyph === expectedHexagrams[index]),
      hexagramLabelsComplete: hexagramCells.every(
        (cell, index) => label(cell).startsWith(
          `本轮第${index + 1}小时对应第${index + 1}卦`,
        ) &&
          ["已完成", "当前", "未完成"].some((status) => label(cell).endsWith(`，${status}`)),
      ),
      hexagramHourLabelsComplete: hexagramCells.every((cell, index) => {
        const hour = cell.querySelector(":scope > small");
        return text(hour) === `${index + 1}h` && hour?.getAttribute("aria-hidden") === "true";
      }),
      completedHexagramCount: completedHexagrams.length,
      currentHexagramCount: currentHexagrams.length,
      pendingHexagramCount: pendingHexagrams.length,
      currentHexagramNumber: currentNumber,
      currentFollowsCompleted:
        currentHexagrams.length === 1 &&
        currentHexagrams[0].getAttribute("aria-current") === "step" &&
        currentNumber === completedHexagrams.length + 1 &&
        completedHexagrams.every((cell, index) => cell === hexagramCells[index]),
      symbolSystemCount: systems.length,
      symbolSystemLabelsComplete: systems.every((system) => label(system).length > 0),
      systemRewardCounts,
      rewardCount: rewardTiles.length,
      rewardLabelsComplete:
        rewardLabels.length === 59 &&
        rewardLabels.every((item) => item.length > 0) &&
        new Set(rewardLabels).size === rewardLabels.length,
      unlockedRewardCount: rewardTiles.filter((tile) => tile.classList.contains("is-unlocked")).length,
      nextRewardCount: rewardTiles.filter((tile) => tile.classList.contains("is-next")).length,
      overviewGeomancyCount: overviewGeomancy.length,
      overviewGeomancyComplete:
        overviewGeomancySignatures.length === 16 &&
        new Set(overviewGeomancySignatures).size === 16 &&
        overviewGeomancySignatures.every((signature) => /^[12]{4}$/u.test(signature)),
      archiveCount: archive ? 1 : 0,
      archiveExpanded: archive?.hasAttribute("open") ?? false,
      archiveGroupCount: archiveGroups.length,
      archiveGroupItemCounts: archiveGroups.map(
        (group) => group.querySelectorAll(".daymark-symbol-archive-item").length,
      ),
      archiveItemCount: archiveItems.length,
      archiveVisibleItemCount: archiveItems.filter(isRendered).length,
      archiveLabelsComplete:
        archiveLabels.length === 59 &&
        archiveLabels.every((item) => item.length > 0) &&
        new Set(archiveLabels).size === archiveLabels.length,
      archiveMeaningsComplete:
        archiveMeanings.length === 59 &&
        archiveMeanings.every((meaning) => meaning.startsWith("象征主题：") && meaning.length > 5),
      archiveCyclesComplete:
        archiveCycles.length === 59 &&
        archiveCycles.every((cycle, index) => cycle === `第 ${index + 1} 轮`) &&
        archiveDurations.every(
          (duration) => duration.includes("小时") &&
            ["已解锁", "下一奖励", "未解锁"].some((status) => duration.includes(status)),
        ),
      runeDetailCount: runeItems.length,
      runeReadingsComplete:
        runeSounds.length === 24 &&
        runeSounds.every((sound) => sound.startsWith("读音 ") && sound.includes("/")),
      archiveGeomancyCount: archiveGeomancy.length,
      archiveGeomancyComplete:
        archiveGeomancySignatures.length === 16 &&
        new Set(archiveGeomancySignatures).size === 16 &&
        archiveGeomancySignatures.every((signature) => /^[12]{4}$/u.test(signature)),
    };
  });
}

function milestoneOverviewValid(milestone) {
  return Boolean(
    milestone?.visible &&
    milestone.validTotal &&
    milestone.rangeIndependentCopy &&
    milestone.progressBarCount === 2 &&
    milestone.progressBarsValid &&
    milestone.hexagramCount === 64 &&
    milestone.uniqueHexagramCount === 64 &&
    milestone.hexagramOrderComplete &&
    milestone.hexagramLabelsComplete &&
    milestone.hexagramHourLabelsComplete &&
    milestone.currentHexagramCount === 1 &&
    milestone.currentFollowsCompleted &&
    milestone.completedHexagramCount + milestone.currentHexagramCount + milestone.pendingHexagramCount === 64 &&
    milestone.symbolSystemCount === 4 &&
    milestone.symbolSystemLabelsComplete &&
    JSON.stringify(milestone.systemRewardCounts) === JSON.stringify([24, 7, 12, 16]) &&
    milestone.rewardCount === 59 &&
    milestone.rewardLabelsComplete &&
    milestone.unlockedRewardCount > 0 &&
    milestone.unlockedRewardCount < 59 &&
    milestone.nextRewardCount === 1 &&
    milestone.overviewGeomancyCount === 16 &&
    milestone.overviewGeomancyComplete &&
    milestone.archiveCount === 1
  );
}

function milestoneArchiveValid(milestone) {
  return Boolean(
    milestone?.archiveExpanded &&
    milestone.archiveGroupCount === 4 &&
    JSON.stringify(milestone.archiveGroupItemCounts) === JSON.stringify([24, 7, 12, 16]) &&
    milestone.archiveItemCount === 59 &&
    milestone.archiveVisibleItemCount === 59 &&
    milestone.archiveLabelsComplete &&
    milestone.archiveMeaningsComplete &&
    milestone.archiveCyclesComplete &&
    milestone.runeDetailCount === 24 &&
    milestone.runeReadingsComplete &&
    milestone.archiveGeomancyCount === 16 &&
    milestone.archiveGeomancyComplete
  );
}

async function inspectFontReadability(page, rootSelector = ".daymark-view") {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (!root) return { minFontSize: null, tooSmall: [{ selector, text: "missing root", size: 0 }] };
    const candidates = [...root.querySelectorAll("span, strong, p, small, button, summary, time, h1, h2, h3, label")]
      .filter((element) => {
        if (element.closest(".daymark-sr-only") || element.classList.contains("daymark-done-badge")) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 &&
          (element.textContent ?? "").trim().length > 0;
      });
    const samples = candidates.map((element) => ({
      selector: element.className ? `.${String(element.className).trim().replace(/\s+/g, ".")}` : element.tagName.toLowerCase(),
      text: (element.textContent ?? "").trim().slice(0, 60),
      size: Number.parseFloat(getComputedStyle(element).fontSize),
    }));
    return {
      minFontSize: samples.length ? Math.min(...samples.map((sample) => sample.size)) : null,
      tooSmall: samples.filter((sample) => sample.size > 0 && sample.size < 12),
    };
  }, rootSelector);
}

async function inspectDailyRitual(page) {
  const modal = page.locator(".daymark-ritual-modal");
  const title = (await modal.locator(".modal-title").textContent())?.trim() ?? "";
  const original = (await modal.locator(".daymark-ritual-original").textContent())?.trim() ?? "";
  const translation = (await modal.locator(".daymark-ritual-translation p").textContent())?.trim() ?? "";
  const transcription = modal.getByRole("textbox", { name: "今日签到篇章抄写区（选填，不保存）" });
  return {
    visible: (await modal.count()) === 1 && await modal.isVisible(),
    title,
    titleValid: title === "今日签到 · 抄读入定",
    originalLength: [...original].length,
    translationLength: [...translation].length,
    transcriptionVisible: (await transcription.count()) === 1 && await transcription.isVisible(),
    finishVisible: await modal.getByRole("button", { name: "完成今日签到" }).isVisible(),
  };
}

async function inspectRestReminder(page) {
  const modal = page.locator(".daymark-rest-modal");
  const replay = modal.locator("button.daymark-rest-instrument");
  const title = (await modal.locator(".modal-title").textContent())?.trim() ?? "";
  const resonance = (await modal.locator(".daymark-rest-resonance").textContent())?.trim() ?? "";
  return {
    visible: (await modal.count()) === 1 && await modal.isVisible(),
    title,
    titleValid: title === "钟声已响 · 该休息了",
    bellCount: await modal.locator(".daymark-rest-icon .lucide-bell-ring").count(),
    ringCount: await modal.locator(".daymark-rest-chime-ring").count(),
    resonance,
    hasTenSecondResonance: resonance.includes("10 秒"),
    replayCount: await replay.count(),
    replayVisible: (await replay.count()) === 1 && await replay.isVisible(),
    replayLabel: await replay.getAttribute("aria-label"),
  };
}

async function layoutMetrics(page, selector = ".daymark-view") {
  return page.evaluate((rootSelector) => {
    const root = document.querySelector(rootSelector);
    const elements = root ? [...root.querySelectorAll("*")] : [];
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      shellWidth: root?.querySelector(".daymark-shell")?.getBoundingClientRect().width ?? null,
      overflows: elements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.width > 0 &&
            (rect.right > innerWidth + 1 || rect.left < -1) &&
            !element.classList.contains("daymark-sr-only")
          );
        })
        .map((element) => ({
          tag: element.tagName,
          class: element.className,
          text: element.textContent?.slice(0, 50),
          left: Math.round(element.getBoundingClientRect().left),
          right: Math.round(element.getBoundingClientRect().right),
        })),
    };
  }, selector);
}

function observeErrors(page, errors) {
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
}

async function inspectDailyDurationTrend(page) {
  const section = page.locator('section[aria-label="每日投入时长趋势"]');
  const count = await section.count();
  if (count !== 1) return { count, visible: false };

  return section.evaluate((root) => {
    const svgs = [...root.querySelectorAll("svg.daymark-line-chart-svg[data-daily-points]")];
    const lines = [...root.querySelectorAll("polyline.daymark-line-chart-line")];
    const dataPointCount = Number(svgs[0]?.getAttribute("data-daily-points"));
    const renderedPointCount = (lines[0]?.getAttribute("points") ?? "")
      .trim()
      .split(/\s+/u)
      .filter(Boolean)
      .length;
    const copy = (root.textContent ?? "").trim();
    return {
      count: 1,
      visible: root.getClientRects().length > 0,
      svgCount: svgs.length,
      lineCount: lines.length,
      dataPointCount,
      renderedPointCount,
      accessible:
        svgs[0]?.getAttribute("role") === "img" &&
        (svgs[0]?.getAttribute("aria-label") ?? "").includes("每日投入时长折线"),
      hasNoBars:
        root.querySelectorAll("rect, .daymark-trend-row, .daymark-trend-fill").length === 0,
      hasNoCompletionTrend:
        !copy.includes("完成项目") &&
        !copy.includes("达成次数") &&
        document.querySelectorAll('[aria-label="投入与达成趋势"]').length === 0,
    };
  });
}

function dailyDurationTrendValid(trend) {
  return Boolean(
    trend?.visible &&
    trend.count === 1 &&
    trend.svgCount === 1 &&
    trend.lineCount === 1 &&
    Number.isInteger(trend.dataPointCount) &&
    trend.dataPointCount > 0 &&
    (trend.renderedPointCount === trend.dataPointCount ||
      (trend.dataPointCount === 1 && trend.renderedPointCount === 2)) &&
    trend.accessible &&
    trend.hasNoBars &&
    trend.hasNoCompletionTrend
  );
}

async function exerciseStatisticsRanges(page, theme, width) {
  const group = page.getByRole("group", { name: /统计时间范围/ });
  const rangeResults = [];
  for (const range of ranges) {
    const button = group.getByRole("button", { name: range.label });
    await button.click();
    await page.waitForFunction(
      (rangeId) => document.querySelector(`[data-statistics-range="${rangeId}"]`)?.getAttribute("aria-pressed") === "true",
      range.id,
    );
    const overview = page.getByRole("region", { name: /累计概览/ });
    const values = await overview.locator(".daymark-overview-value").allTextContents();
    const period = await page
      .getByRole("region", { name: /^积累统计$/ })
      .locator(".daymark-statistics-copy p")
      .textContent();
    const selectedCount = await group.locator('[aria-pressed="true"]').count();
    const dailyDurationTrend = await inspectDailyDurationTrend(page);
    const habitGroups = await page
      .getByRole("region", { name: /项目累计明细/ })
      .locator(".daymark-stat-group")
      .count();
    const milestone = await inspectMilestones(page);
    const metrics = await layoutMetrics(page);
    rangeResults.push({
      range: range.id,
      selected: (await button.getAttribute("aria-pressed")) === "true" && selectedCount === 1,
      period,
      values,
      signature: values.join("|"),
      dailyDurationTrend,
      habitGroups,
      milestone,
      ...metrics,
    });
    await page.screenshot({
      path: path.join(out, `${theme}-${width}-history-${range.id}.png`),
      fullPage: true,
    });
  }
  return rangeResults;
}

try {
  for (const theme of ["light", "dark"]) {
    for (const width of [320, 390, 1200, 1440]) {
      const page = await browser.newPage({
        viewport: { width, height: width > 600 ? 1000 : 844 },
        deviceScaleFactor: 1,
        timezoneId: "Asia/Shanghai",
      });
      await page.addInitScript(() => {
        const fixed = Date.now();
        Date.now = () => fixed;
      });
      const errors = [];
      observeErrors(page, errors);
      await page.goto(`${pathToFileURL(path.join(directory, "index.html"))}?theme=${theme}`);
      await page.waitForFunction(() => window.previewReady === true);

      const clock = await inspectClock(page, true);
      const dailyIChing = await inspectDailyIChing(page);
      const dailyCheckIn = await inspectDailyCheckIn(page);
      const todayMysticBackdrop = await inspectMysticBackdrop(page);
      const todayViewBackground = await inspectViewBackground(page);
      const todayFonts = await inspectFontReadability(page);
      await page.screenshot({ path: path.join(out, `${theme}-${width}-today.png`), fullPage: true });
      results.push({
        theme,
        width,
        tab: "today",
        errors: [...errors],
        clock,
        dailyIChing,
        dailyCheckIn,
        mysticBackdrop: todayMysticBackdrop,
        viewBackground: todayViewBackground,
        fonts: todayFonts,
        ...(await layoutMetrics(page)),
      });

      await page.getByRole("tab", { name: /统计/ }).click();
      const rangeResults = await exerciseStatisticsRanges(page, theme, width);
      // Keep the stable overview filename on the default 30-day view.
      await page.getByRole("group", { name: /统计时间范围/ }).getByRole("button", { name: /近\s*30\s*天/ }).click();
      const symbolArchive = page.locator(".daymark-symbol-archive");
      await symbolArchive.locator("summary").click();
      const symbolArchiveExpanded = await symbolArchive.evaluate((element) => element.open);
      const historyClock = await inspectClock(page);
      const milestone = await inspectMilestones(page);
      const historyMysticBackdrop = await inspectMysticBackdrop(page);
      const historyViewBackground = await inspectViewBackground(page);
      const historyFonts = await inspectFontReadability(page);
      await page.screenshot({ path: path.join(out, `${theme}-${width}-history.png`), fullPage: true });
      results.push({
        theme,
        width,
        tab: "history",
        errors: [...errors],
        allRangesSelected: rangeResults.every((range) => range.selected),
        rangeMetricsChanged: new Set(rangeResults.map((range) => range.signature)).size === ranges.length,
        milestoneRangeStable: new Set(rangeResults.map((range) => range.milestone.total)).size === 1,
        clock: historyClock,
        milestone,
        mysticBackdrop: historyMysticBackdrop,
        viewBackground: historyViewBackground,
        fonts: historyFonts,
        symbolArchiveExpanded,
        rangeResults,
        ...(await layoutMetrics(page)),
      });

      await page.evaluate(() => window.preview.openDailyRitual());
      const ritual = await inspectDailyRitual(page);
      const ritualMetrics = await layoutMetrics(page, ".modal");
      const ritualFonts = await inspectFontReadability(page, ".modal");
      await page.screenshot({ path: path.join(out, `${theme}-${width}-ritual.png`), fullPage: false });
      await page.getByRole("button", { name: "完成今日签到" }).click();
      await page.locator(".daymark-ritual-modal").waitFor({ state: "detached" });
      await page.getByRole("tab", { name: /打卡/ }).click();
      await page.waitForSelector('.daymark-daily-check-in[data-check-in-state="signed"]');
      const signedCheckIn = await inspectDailyCheckIn(page);
      await page.screenshot({ path: path.join(out, `${theme}-${width}-checkin-signed.png`), fullPage: true });
      results.push({
        theme,
        width,
        tab: "ritual",
        errors: [...errors],
        ritual,
        signedCheckIn,
        fonts: ritualFonts,
        ...ritualMetrics,
      });

      await page.evaluate(() => window.preview.openRestReminder());
      const rest = await inspectRestReminder(page);
      await page.screenshot({ path: path.join(out, `${theme}-${width}-rest.png`), fullPage: false });
      const modalMetrics = await layoutMetrics(page, ".modal");
      const restFonts = await inspectFontReadability(page, ".modal");
      await page.emulateMedia({ reducedMotion: "reduce" });
      const reducedMotionStopsAnimation = await page.locator(".daymark-rest-modal").evaluate((modal) =>
        [...modal.querySelectorAll(".daymark-rest-chime-ring, .daymark-rest-icon")]
          .every((element) => getComputedStyle(element).animationName === "none"),
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const replay = page.locator(".daymark-rest-instrument");
      await replay.click();
      const replayDisabledDuringPlayback = await replay.isDisabled();
      await page.waitForFunction(() => !document.querySelector(".daymark-rest-instrument")?.hasAttribute("disabled"));
      const replayReturnedToReady = !await replay.isDisabled();
      const replayCalls = await page.evaluate(() => window.preview.restChimeReplayCount);
      results.push({
        theme,
        width,
        tab: "rest",
        errors: [...errors],
        rest,
        replayDisabledDuringPlayback,
        replayReturnedToReady,
        replayCalls,
        reducedMotionStopsAnimation,
        fonts: restFonts,
        ...modalMetrics,
      });
      await page.close();
    }
  }

  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, timezoneId: "Asia/Shanghai" });
  await page.addInitScript(() => {
    const fixed = Date.now();
    Date.now = () => fixed;
  });
  const errors = [];
  observeErrors(page, errors);
  await page.goto(pathToFileURL(path.join(directory, "index.html")).href);
  await page.waitForFunction(() => window.previewReady === true);

  const fixtureCoverage = await page.evaluate(() => {
    const { habits, events } = window.preview.controller;
    const dates = [...new Set(events.map((event) => event.occurredOn))].sort();
    const first = new Date(`${dates[0]}T00:00:00Z`);
    const last = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
    return {
      eventCount: events.length,
      uniqueActiveDates: dates.length,
      spanDays: Math.round((last.getTime() - first.getTime()) / 86_400_000) + 1,
      habitTypes: [...new Set(habits.map((habit) => habit.type))].sort(),
    };
  });

  await page.getByRole("button", { name: "为 喝水 快捷增加", exact: true }).click();
  const water = await page.locator("[data-habit-id]").filter({ hasText: "喝水" }).textContent();
  await page.getByRole("button", { name: "为 生活随记 写一条记录", exact: true }).click();
  await page.getByRole("textbox", { name: "文字记录内容" }).fill("预览交互验证：今晚早点休息。");
  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  const noteSaved = (await page.getByText("预览交互验证：今晚早点休息。", { exact: true }).count()) === 1;

  const readingCard = page.locator("[data-habit-id]").filter({ hasText: "深度阅读" });
  const beforeTotal = await readingCard.locator(".daymark-cumulative-value").textContent();
  await page.getByRole("tab", { name: /统计/ }).click();
  const beforeRangeTotal = await page
    .getByRole("region", { name: /累计概览/ })
    .locator(".daymark-overview-duration .daymark-overview-value")
    .textContent();
  const beforeMilestone = await inspectMilestones(page);
  await page.getByRole("tab", { name: /打卡/ }).click();
  await page.getByRole("button", { name: "停止 深度阅读 的计时并保存", exact: true }).click();
  const stopped = (await page.locator(".daymark-running-banner").count()) === 0 &&
    (await page.locator("[data-rest-countdown]").count()) === 1;
  const afterTotal = await readingCard.locator(".daymark-cumulative-value").textContent();
  await page.getByRole("tab", { name: /统计/ }).click();
  const afterRangeTotal = await page
    .getByRole("region", { name: /累计概览/ })
    .locator(".daymark-overview-duration .daymark-overview-value")
    .textContent();
  const afterMilestone = await inspectMilestones(page);
  results.push({
    interaction: true,
    fixtureCoverage,
    fixturesCoverLongRange:
      fixtureCoverage.spanDays >= 100 &&
      ["checkbox", "count", "duration", "text"].every((type) => fixtureCoverage.habitTypes.includes(type)),
    waterAdded: water?.includes("5 杯"),
    noteSaved,
    stopped,
    cumulativeStable: beforeTotal === afterTotal,
    rangeCumulativeStable: beforeRangeTotal === afterRangeTotal,
    milestoneCumulativeStable: beforeMilestone.total === afterMilestone.total,
    milestoneProgressStable: beforeMilestone.progressNow === afterMilestone.progressNow,
    beforeTotal,
    afterTotal,
    beforeRangeTotal,
    afterRangeTotal,
    beforeMilestoneTotal: beforeMilestone.total,
    afterMilestoneTotal: afterMilestone.total,
    beforeMilestoneProgress: beforeMilestone.progressNow,
    afterMilestoneProgress: afterMilestone.progressNow,
    errors,
  });
  await page.close();

  const todayResults = results.filter((result) => result.tab === "today");
  const dailyIChingConsistent =
    new Set(todayResults.map((result) => result.dailyIChing.lineId)).size === 1 &&
    new Set(todayResults.map((result) => result.dailyIChing.original)).size === 1 &&
    new Set(todayResults.map((result) => result.dailyIChing.explanation)).size === 1;
  const clockAlwaysVisible = results
    .filter((result) => result.tab === "today" || result.tab === "history")
    .every((result) => result.clock.visible && result.clock.validFormat && result.clock.validDateTime);
  results.push({ crossContext: true, dailyIChingConsistent, clockAlwaysVisible });
} finally {
  await browser.close();
}

await writeFile(path.join(out, "qa-results.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));

const failed = results.some((result) => {
  if (result.errors?.length || result.overflows?.length || result.documentWidth > result.viewportWidth) return true;
  if (result.fonts?.tooSmall?.length) return true;
  if (result.mysticBackdrop && !(
    result.mysticBackdrop.count === 1 &&
    result.mysticBackdrop.ariaHidden &&
    result.mysticBackdrop.hexagramCount === 64 &&
    result.mysticBackdrop.uniqueHexagramCount === 64 &&
    result.mysticBackdrop.hexagramsComplete &&
    result.mysticBackdrop.runeCount === 24 &&
    result.mysticBackdrop.uniqueRuneCount === 24 &&
    result.mysticBackdrop.runesComplete
  )) return true;
  if (result.viewBackground && !result.viewBackground.dark) return true;
  if (result.width >= 1200 && result.shellWidth !== null && result.shellWidth / result.viewportWidth < 0.85) return true;
  if (result.crossContext) return !result.dailyIChingConsistent || !result.clockAlwaysVisible;
  if (result.tab === "today") {
    const reading = result.dailyIChing;
    const checkIn = result.dailyCheckIn;
    return !(
      result.clock.visible &&
      result.clock.validFormat &&
      result.clock.validDateTime &&
      result.clock.silentUpdates &&
      result.clock.ticked &&
      reading.visible &&
      reading.validLineId &&
      reading.hasOriginal &&
      reading.hasExplanation &&
      reading.hasReflectionDisclaimer &&
      checkIn.visible &&
      checkIn.state === "unsigned" &&
      checkIn.status === "今日未签到" &&
      checkIn.source.length > 0 &&
      checkIn.actionCount === 1 &&
      checkIn.actionLabel === "打开今日签到" &&
      !checkIn.actionDisabled
    );
  }
  if (result.tab === "history") {
    if (
      !result.allRangesSelected ||
      !result.rangeMetricsChanged ||
      !result.milestoneRangeStable ||
      !result.symbolArchiveExpanded ||
      !result.clock.visible ||
      !result.clock.validFormat ||
      !result.clock.validDateTime ||
      !result.clock.silentUpdates
    ) return true;
    const milestone = result.milestone;
    if (!milestoneOverviewValid(milestone) || !milestoneArchiveValid(milestone)) return true;
    return result.rangeResults.some(
      (range) =>
        range.overflows.length ||
        range.documentWidth > range.viewportWidth ||
        !range.period ||
        range.values.length !== 4 ||
        !dailyDurationTrendValid(range.dailyDurationTrend) ||
        range.habitGroups !== 4 ||
        !milestoneOverviewValid(range.milestone),
    );
  }
  if (result.tab === "ritual") {
    const signed = result.signedCheckIn;
    return !(
      result.ritual.visible &&
      result.ritual.titleValid &&
      result.ritual.originalLength > 0 &&
      result.ritual.originalLength <= 100 &&
      result.ritual.translationLength > 0 &&
      result.ritual.translationLength <= 100 &&
      result.ritual.transcriptionVisible &&
      result.ritual.finishVisible &&
      signed.visible &&
      signed.state === "signed" &&
      signed.status === "今日已签到" &&
      signed.source.length > 0 &&
      signed.actionCount === 1 &&
      signed.actionLabel === "今日已签到" &&
      signed.actionDisabled
    );
  }
  if (result.tab === "rest") {
    return !(
      result.rest.visible &&
      result.rest.titleValid &&
      result.rest.bellCount === 1 &&
      result.rest.ringCount === 3 &&
      result.rest.hasTenSecondResonance &&
      result.rest.replayCount === 1 &&
      result.rest.replayVisible &&
      result.rest.replayLabel === "敲钟" &&
      result.replayDisabledDuringPlayback &&
      result.replayReturnedToReady &&
      result.replayCalls === 1 &&
      result.reducedMotionStopsAnimation
    );
  }
  if (result.interaction) {
    return !(
      result.fixturesCoverLongRange &&
      result.waterAdded &&
      result.noteSaved &&
      result.stopped &&
      result.cumulativeStable &&
      result.rangeCumulativeStable &&
      result.milestoneCumulativeStable &&
      result.milestoneProgressStable
    );
  }
  return false;
});
if (failed) process.exitCode = 1;
