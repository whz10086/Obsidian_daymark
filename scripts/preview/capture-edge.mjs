import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const edge = process.env.DAYMARK_BROWSER_PATH ?? [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find(existsSync);
if (!edge) throw new Error("Microsoft Edge not found; set DAYMARK_BROWSER_PATH");

const port = 9333;
const profile = await mkdtemp(path.join(tmpdir(), "daymark-edge-"));
const child = spawn(edge, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: "ignore", windowsHide: true });

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchJson(url, attempts = 40) {
  let latest;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
      latest = new Error(`HTTP ${response.status}`);
    } catch (error) {
      latest = error;
    }
    await pause(100);
  }
  throw latest ?? new Error(`Could not read ${url}`);
}

let socket;
try {
  const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
  const target = targets.find((item) => item.type === "page");
  if (!target?.webSocketDebuggerUrl) throw new Error("No debuggable Edge page found");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let commandId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id) return;
    const callbacks = pending.get(message.id);
    if (!callbacks) return;
    pending.delete(message.id);
    if (message.error) callbacks.reject(new Error(message.error.message));
    else callbacks.resolve(message.result);
  });
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++commandId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await command("Page.enable");
  await command("Runtime.enable");
  const url = `${pathToFileURL(path.join(here, "index.html")).href}?theme=dark&modal=ritual`;
  const results = [];
  for (const viewport of [{ width: 320, height: 844 }, { width: 390, height: 844 }, { width: 1200, height: 1000 }]) {
    await command("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.width < 600,
    });
    await command("Page.navigate", { url });
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const status = await command("Runtime.evaluate", {
        expression: "Boolean(window.previewReady && document.querySelector('.daymark-ritual-modal'))",
        returnByValue: true,
      });
      if (status.result.value) {
        ready = true;
        break;
      }
      await pause(100);
    }
    if (!ready) throw new Error(`Ritual preview did not load at ${viewport.width}px`);

    const inspected = await command("Runtime.evaluate", {
      expression: `(() => {
        const root = document.querySelector(".daymark-ritual-modal");
        const elements = [root, ...root.querySelectorAll("*")];
        const visibleText = elements.filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" &&
            (element.textContent ?? "").trim().length > 0;
        });
        const original = root.querySelector(".daymark-ritual-original")?.textContent?.trim() ?? "";
        const translation = root.querySelector(".daymark-ritual-translation p")?.textContent?.trim() ?? "";
        const title = root.querySelector(".modal-title")?.textContent?.trim() ?? "";
        const checkIn = document.querySelector(".daymark-daily-check-in");
        const rootRect = root.getBoundingClientRect();
        return {
          innerWidth,
          innerHeight,
          root: { left: rootRect.left, right: rootRect.right, top: rootRect.top, bottom: rootRect.bottom },
          overflow: elements.filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
          }).map((element) => element.className || element.tagName),
          minFontSize: Math.min(...visibleText.map((element) => Number.parseFloat(getComputedStyle(element).fontSize))),
          originalLength: [...original].length,
          translationLength: [...translation].length,
          title,
          checkInState: checkIn?.getAttribute("data-check-in-state") ?? null,
          textareaVisible: Boolean(root.querySelector('textarea[aria-label="今日签到篇章抄写区（选填，不保存）"]')),
          finishVisible: Boolean([...root.querySelectorAll("button")].find((button) => button.textContent?.includes("完成今日签到"))),
        };
      })()`,
      returnByValue: true,
    });
    const result = { width: viewport.width, ...inspected.result.value };
    const screenshot = await command("Page.captureScreenshot", { format: "png", fromSurface: true });
    await writeFile(
      path.join(here, "screenshots", `dark-${viewport.width}-ritual-edge-cdp.png`),
      Buffer.from(screenshot.data, "base64"),
    );

    await command("Runtime.evaluate", {
      expression: `(() => {
        const button = [...document.querySelectorAll(".daymark-ritual-modal button")]
          .find((element) => element.textContent?.includes("完成今日签到"));
        button?.click();
      })()`,
    });
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const closed = await command("Runtime.evaluate", {
        expression: "!document.querySelector('.daymark-ritual-modal')",
        returnByValue: true,
      });
      if (closed.result.value) break;
      await pause(50);
    }
    await command("Runtime.evaluate", { expression: "window.preview.openRestReminder()" });
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const opened = await command("Runtime.evaluate", {
        expression: "Boolean(document.querySelector('.daymark-rest-modal'))",
        returnByValue: true,
      });
      if (opened.result.value) break;
      await pause(50);
    }
    const restInspected = await command("Runtime.evaluate", {
      expression: `(() => {
        const root = document.querySelector(".daymark-rest-modal");
        const elements = [root, ...root.querySelectorAll("*")];
        const visibleText = elements.filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" &&
            (element.textContent ?? "").trim().length > 0;
        });
        const replay = root.querySelector("button.daymark-rest-replay");
        const rootRect = root.getBoundingClientRect();
        return {
          root: { left: rootRect.left, right: rootRect.right, top: rootRect.top, bottom: rootRect.bottom },
          overflow: elements.filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
          }).map((element) => element.className || element.tagName),
          minFontSize: Math.min(...visibleText.map((element) => Number.parseFloat(getComputedStyle(element).fontSize))),
          title: root.querySelector(".modal-title")?.textContent?.trim() ?? "",
          bellCount: root.querySelectorAll(".daymark-rest-icon .lucide-bell-ring").length,
          ringCount: root.querySelectorAll(".daymark-rest-chime-ring").length,
          resonance: root.querySelector(".daymark-rest-resonance")?.textContent?.trim() ?? "",
          replayVisible: Boolean(replay && replay.getClientRects().length > 0),
          replayText: replay?.textContent?.trim() ?? "",
          replayLabel: replay?.getAttribute("aria-label") ?? "",
        };
      })()`,
      returnByValue: true,
    });
    await command("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    const reducedMotion = await command("Runtime.evaluate", {
      expression: `[...document.querySelectorAll(".daymark-rest-chime-ring, .daymark-rest-icon")]
        .every((element) => getComputedStyle(element).animationName === "none")`,
      returnByValue: true,
    });
    await command("Emulation.setEmulatedMedia", { features: [] });
    const replayStarted = await command("Runtime.evaluate", {
      expression: `(() => {
        const button = document.querySelector("button.daymark-rest-replay");
        button?.click();
        return Boolean(button?.disabled);
      })()`,
      returnByValue: true,
    });
    let replayReady = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const status = await command("Runtime.evaluate", {
        expression: `(() => ({
          enabled: !document.querySelector("button.daymark-rest-replay")?.disabled,
          calls: window.preview.restChimeReplayCount,
        }))()`,
        returnByValue: true,
      });
      if (status.result.value.enabled && status.result.value.calls === 1) {
        replayReady = true;
        break;
      }
      await pause(25);
    }
    result.rest = {
      ...restInspected.result.value,
      reducedMotionStopsAnimation: reducedMotion.result.value,
      replayDisabledDuringPlayback: replayStarted.result.value,
      replayReturnedToReady: replayReady,
    };
    results.push(result);
    const restScreenshot = await command("Page.captureScreenshot", { format: "png", fromSurface: true });
    await writeFile(
      path.join(here, "screenshots", `dark-${viewport.width}-rest-edge-cdp.png`),
      Buffer.from(restScreenshot.data, "base64"),
    );
  }
  console.log(JSON.stringify(results, null, 2));
  if (results.some((result) =>
    result.innerWidth !== result.width ||
    result.overflow.length > 0 ||
    result.minFontSize < 12 ||
    result.originalLength < 1 || result.originalLength > 100 ||
    result.translationLength < 1 || result.translationLength > 100 ||
    result.title !== "今日签到 · 抄读入定" || result.checkInState !== "unsigned" ||
    !result.textareaVisible || !result.finishVisible ||
    result.rest.root.left < -1 || result.rest.root.right > result.innerWidth + 1 ||
    result.rest.overflow.length > 0 || result.rest.minFontSize < 12 ||
    result.rest.title !== "钟声已响 · 该休息了" ||
    result.rest.bellCount !== 1 || result.rest.ringCount !== 3 ||
    !result.rest.resonance.includes("10 秒") || !result.rest.replayVisible ||
    result.rest.replayText !== "再响一次" ||
    result.rest.replayLabel !== "再响一次休息钟声" ||
    !result.rest.reducedMotionStopsAnimation ||
    !result.rest.replayDisabledDuringPlayback || !result.rest.replayReturnedToReady
  )) process.exitCode = 1;
} finally {
  socket?.close();
  child.kill();
  await pause(250);
  await rm(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 200 });
}
