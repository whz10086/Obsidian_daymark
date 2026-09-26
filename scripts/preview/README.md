# Daymark real-view preview

This harness bundles the actual `src/view.ts` and `src/modals.ts` against a small Obsidian host adapter and loads the actual root `styles.css`. All sample records are memory-only. It is a layout and interaction check, not a replacement for verification inside Obsidian or on a physical phone.

Build with `node scripts/preview/build.mjs`, then open `scripts/preview/index.html` in a browser (`?theme=dark` selects the dark host palette). The checkboxes, numbers, text modal, timer stop/start, statistics, and habit editor use real view handlers with a mock controller. The fixture spans 126 days, covers duration, checkbox, count, and text habits, and varies recent and older activity so each statistics range renders distinct values and trends.

`node scripts/preview/capture.mjs` captures both palettes at 320, 390, and 1200 px, exercises the 7-, 30-, 90-day and all-time selectors, and reports horizontal overflow, browser errors, fixture coverage, and record interactions. It also verifies that live cumulative duration remains stable when a timer is stopped and saved. Point `DAYMARK_PLAYWRIGHT_PATH` to an existing Playwright installation if it is not resolvable locally; `DAYMARK_BROWSER_PATH` optionally selects an installed Chromium browser. No package installation or vault access is performed.

Generated `preview.js` and `screenshots/` can be recreated with these scripts. Obsidian's host component and icon rendering are approximated; the plugin's DOM and stylesheet are not recreated.
