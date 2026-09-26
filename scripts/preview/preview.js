(() => {
  // obsidian.ts
  function applyOptions(element, options = {}) {
    if (typeof options === "string") element.className = options;
    else {
      if (options.cls) element.className = options.cls;
      if (options.text !== void 0) element.textContent = options.text;
      if (options.type) element.setAttribute("type", options.type);
      for (const [key, value] of Object.entries(options.attr ?? {})) element.setAttribute(key, value);
    }
    return element;
  }
  Object.assign(HTMLElement.prototype, {
    createEl(tag, options) {
      const element = applyOptions(document.createElement(tag), options);
      this.append(element);
      return element;
    },
    createDiv(options) {
      return this.createEl("div", options);
    },
    createSpan(options) {
      return this.createEl("span", options);
    },
    empty() {
      this.replaceChildren();
    },
    addClass(...names) {
      this.classList.add(...names);
    },
    removeClass(...names) {
      this.classList.remove(...names);
    },
    toggleClass(name, force) {
      this.classList.toggle(name, force);
    },
    setText(text) {
      this.textContent = text;
    },
    setAttr(name, value) {
      this.setAttribute(name, value);
    },
    setAttrs(attrs) {
      for (const [name, value] of Object.entries(attrs)) this.setAttribute(name, value);
    }
  });
  var App = class {
    constructor() {
      this.vault = { getName: () => "\u65E5\u8FF9\u9884\u89C8\u5E93" };
    }
  };
  var ItemView = class {
    constructor(_leaf) {
      this.app = new App();
      this.contentEl = document.getElementById("preview-content");
      if (_leaf.previewContainer) this.contentEl = _leaf.previewContainer;
    }
    registerInterval(_id) {
    }
  };
  var Notice = class {
    constructor(message) {
      const notice = document.body.createDiv({ cls: "preview-notice", text: message });
      window.setTimeout(() => notice.remove(), 3500);
    }
  };
  var Modal = class {
    constructor(app) {
      this.app = app;
      this.containerEl = document.createElement("div");
      this.modalEl = this.containerEl.createDiv("modal");
      this.contentEl = this.modalEl.createDiv("modal-content");
      this.containerEl.className = "modal-container";
    }
    setTitle(value) {
      let title = this.modalEl.querySelector(".modal-title");
      if (!title) {
        title = document.createElement("h2");
        title.className = "modal-title";
        this.modalEl.prepend(title);
      }
      title.textContent = value;
    }
    open() {
      document.body.append(this.containerEl);
      this.onOpen();
      this.containerEl.addEventListener("click", (event) => {
        if (event.target === this.containerEl) this.close();
      });
    }
    close() {
      this.onClose();
      this.containerEl.remove();
    }
    onOpen() {
    }
    onClose() {
    }
  };
  var InputComponent = class {
    constructor(container, type = "input") {
      this.inputEl = container.createEl(type);
    }
    setValue(value) {
      this.inputEl.value = value;
      return this;
    }
    setPlaceholder(value) {
      this.inputEl.placeholder = value;
      return this;
    }
    setDisabled(value) {
      this.inputEl.disabled = value;
      return this;
    }
    onChange(callback) {
      this.inputEl.addEventListener("input", () => callback(this.inputEl.value));
      return this;
    }
  };
  var TextComponent = class extends InputComponent {
  };
  var ColorComponent = class extends InputComponent {
    constructor(container) {
      super(container);
      this.inputEl.type = "color";
    }
  };
  var DropdownComponent = class {
    constructor(container) {
      this.selectEl = container.createEl("select");
    }
    addOptions(options) {
      for (const [value, text] of Object.entries(options)) this.selectEl.createEl("option", { text, attr: { value } });
      return this;
    }
    setValue(value) {
      this.selectEl.value = value;
      return this;
    }
    setDisabled(value) {
      this.selectEl.disabled = value;
      return this;
    }
    onChange(callback) {
      this.selectEl.addEventListener("change", () => callback(this.selectEl.value));
      return this;
    }
  };
  var ButtonComponent = class {
    constructor(container) {
      this.buttonEl = container.createEl("button");
    }
    setButtonText(value) {
      this.buttonEl.textContent = value;
      return this;
    }
    setCta() {
      this.buttonEl.classList.add("mod-cta");
      return this;
    }
    setWarning() {
      this.buttonEl.classList.add("mod-warning");
      return this;
    }
    setDisabled(value) {
      this.buttonEl.disabled = value;
      return this;
    }
    onClick(callback) {
      this.buttonEl.addEventListener("click", callback);
      return this;
    }
  };
  var Setting = class {
    constructor(container) {
      this.settingEl = container.createDiv("setting-item");
      this.infoEl = this.settingEl.createDiv("setting-item-info");
      this.controlEl = this.settingEl.createDiv("setting-item-control");
    }
    setName(value) {
      this.infoEl.createDiv({ cls: "setting-item-name", text: value });
      return this;
    }
    setDesc(value) {
      this.infoEl.createDiv({ cls: "setting-item-description", text: value });
      return this;
    }
    addText(callback) {
      callback(new TextComponent(this.controlEl));
      return this;
    }
    addTextArea(callback) {
      callback(new InputComponent(this.controlEl, "textarea"));
      return this;
    }
    addColorPicker(callback) {
      callback(new ColorComponent(this.controlEl));
      return this;
    }
    addDropdown(callback) {
      callback(new DropdownComponent(this.controlEl));
      return this;
    }
    addButton(callback) {
      callback(new ButtonComponent(this.controlEl));
      return this;
    }
  };
  var icons = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    "settings-2": '<path d="M20 7h-9M14 17H4M4 7h1M20 17h-1"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
    "chevron-left": '<path d="m15 18-6-6 6-6"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    circle: '<circle cx="12" cy="12" r="9"/>',
    "circle-check-big": '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3"/>',
    "chart-no-axes-column-increasing": '<path d="M8 20v-6M14 20V9M20 20V3"/>',
    "trending-up": '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    ellipsis: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    play: '<path d="m7 3 14 9-14 9Z"/>',
    square: '<rect x="4" y="4" width="16" height="16" rx="2"/>',
    "pencil-line": '<path d="m16 3 5 5-13 13H3v-5ZM14 5l5 5M12 21h9"/>',
    "square-pen": '<path d="m16 3 5 5-10 10-5 1 1-5ZM12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>',
    "undo-2": '<path d="M3 10h11a7 7 0 0 1 0 14M3 10l5-5M3 10l5 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    timer: '<circle cx="12" cy="14" r="8"/><path d="M10 2h4M12 14v-4M18 7l2-2"/>',
    coffee: '<path d="M4 8h14v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4ZM18 8h1a3 3 0 1 1 0 6h-1M8 2v2M12 2v2M16 2v2"/>',
    flame: '<path d="M12 3c1 5-5 5-5 10a5 5 0 0 0 10 0c0-2-1-4-2-5 0 3-2 3-2 3 1-4 0-6-1-8Z"/>',
    trophy: '<path d="M8 3h8v7a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4M16 5h4v3a4 4 0 0 1-4 4M12 14v7M8 21h8"/>'
  };
  function setIcon(element, name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    for (const [key, value] of Object.entries({ width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", class: `svg-icon lucide-${name}`, "aria-hidden": "true" })) svg.setAttribute(key, value);
    svg.innerHTML = icons[name] ?? icons.circle;
    element.replaceChildren(svg);
  }

  // ../../src/date-utils.ts
  var DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  function dateToKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  function todayKey(now = /* @__PURE__ */ new Date(), timezone) {
    if (!timezone) return dateToKey(now);
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).formatToParts(now);
      const values = new Map(parts.map((part) => [part.type, part.value]));
      return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
    } catch {
      return dateToKey(now);
    }
  }
  function keyToDate(key) {
    if (!DATE_KEY_PATTERN.test(key)) {
      throw new Error(`Invalid date key: ${key}`);
    }
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw new Error(`Invalid calendar date: ${key}`);
    }
    return date;
  }
  function addDays(key, amount) {
    if (!Number.isInteger(amount) || !Number.isFinite(amount)) {
      throw new Error(`Invalid day offset: ${amount}`);
    }
    const date = keyToDate(key);
    date.setUTCDate(date.getUTCDate() + amount);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
      date.getUTCDate()
    ).padStart(2, "0")}`;
  }
  function startOfMonth(key) {
    const date = keyToDate(key);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
  }
  function endOfMonth(key) {
    const date = keyToDate(key);
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12));
    return `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-${String(
      end.getUTCDate()
    ).padStart(2, "0")}`;
  }
  function addMonths(key, amount) {
    if (!Number.isInteger(amount) || !Number.isFinite(amount)) {
      throw new Error(`Invalid month offset: ${amount}`);
    }
    const date = keyToDate(key);
    const shifted = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1, 12));
    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-01`;
  }
  function daysBetweenInclusive(start2, end) {
    keyToDate(start2);
    keyToDate(end);
    if (start2 > end) return [];
    const dates = [];
    let cursor = start2;
    while (cursor <= end) {
      if (dates.length >= 2e4) throw new Error("Date range is too large");
      dates.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return dates;
  }
  function formatDateLabel(key) {
    const date = keyToDate(key);
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "UTC",
      month: "long",
      day: "numeric",
      weekday: "short"
    }).format(date);
  }
  function formatMonthLabel(key) {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "UTC",
      year: "numeric",
      month: "long"
    }).format(keyToDate(key));
  }
  function weekdayIndex(key) {
    return keyToDate(key).getUTCDay();
  }

  // ../../src/domain.ts
  function effectiveRule(habit, date) {
    const rules = habit.rules.filter((rule) => rule.effectiveFrom <= date).sort((a, b) => {
      const byDate = a.effectiveFrom.localeCompare(b.effectiveFrom);
      if (byDate !== 0) return byDate;
      const byCreated = a.createdAt.localeCompare(b.createdAt);
      return byCreated !== 0 ? byCreated : a.id.localeCompare(b.id);
    });
    return rules[rules.length - 1];
  }
  function isHabitScheduled(habit, date) {
    const rule = effectiveRule(habit, date) ?? habit.rules[0];
    return Boolean(rule?.enabled && rule.weekdays.includes(weekdayIndex(date)));
  }
  function compareEvents(a, b) {
    const byRecorded = a.recordedAt.localeCompare(b.recordedAt);
    return byRecorded !== 0 ? byRecorded : a.id.localeCompare(b.id);
  }
  function deduplicateEvents(events2) {
    const byId = /* @__PURE__ */ new Map();
    for (const event of [...events2].sort(compareEvents)) {
      if (!byId.has(event.id)) byId.set(event.id, event);
    }
    return [...byId.values()].sort(compareEvents);
  }
  function activeBaseEvents(events2) {
    const unique = deduplicateEvents(events2);
    const retracted = new Set(
      unique.filter((event) => event.type === "retract" && event.targetEventId).map((event) => event.targetEventId)
    );
    return unique.filter((event) => event.type !== "retract" && !retracted.has(event.id));
  }
  function cumulativeDurationSeconds(habitId, events2) {
    return activeBaseEvents(events2).reduce((total, event) => {
      if (event.habitId !== habitId || event.type !== "add" || typeof event.value !== "number" || !Number.isFinite(event.value) || event.value <= 0) {
        return total;
      }
      return total + event.value;
    }, 0);
  }
  function projectHabitDay(habit, date, allEvents) {
    const dayEvents = deduplicateEvents(
      allEvents.filter((event) => event.habitId === habit.id && event.occurredOn === date)
    );
    const retractedIds = new Set(
      dayEvents.filter((event) => event.type === "retract" && event.targetEventId).map((event) => event.targetEventId)
    );
    const activeEvents = dayEvents.filter(
      (event) => event.type !== "retract" && !retractedIds.has(event.id)
    );
    const latestEvent = activeEvents[activeEvents.length - 1];
    const rule = effectiveRule(habit, date);
    if (habit.type === "checkbox") {
      const setEvents = activeEvents.filter((event) => event.type === "set");
      const latestSet = setEvents[setEvents.length - 1];
      const value2 = latestSet?.value === true;
      return {
        habitId: habit.id,
        date,
        completed: value2,
        value: value2,
        notes: [],
        activeEvents,
        latestEvent: latestSet
      };
    }
    if (habit.type === "text") {
      const notes = activeEvents.filter(
        (event) => event.type === "note" && typeof event.value === "string"
      );
      const value2 = notes.map((event) => String(event.value)).join("\n\n");
      return {
        habitId: habit.id,
        date,
        completed: notes.some((event) => String(event.value).trim().length > 0),
        value: value2,
        notes,
        activeEvents,
        latestEvent
      };
    }
    const value = activeEvents.filter((event) => event.type === "add" && typeof event.value === "number").reduce((sum, event) => sum + event.value, 0);
    return {
      habitId: habit.id,
      date,
      completed: value >= (rule?.target ?? Number.POSITIVE_INFINITY),
      value,
      notes: [],
      activeEvents,
      latestEvent
    };
  }
  function summarizeDay(date, habits2, events2) {
    const scheduled = habits2.filter((habit) => isHabitScheduled(habit, date));
    const completed = scheduled.filter(
      (habit) => projectHabitDay(habit, date, events2).completed
    ).length;
    const hasActivity = habits2.some(
      (habit) => projectHabitDay(habit, date, events2).activeEvents.length > 0
    );
    return {
      date,
      scheduled: scheduled.length,
      completed,
      ratio: scheduled.length === 0 ? 0 : completed / scheduled.length,
      hasActivity
    };
  }
  function currentActivityStreak(habits2, events2, timezone, now = /* @__PURE__ */ new Date()) {
    const activeDates = new Set(activeBaseEvents(events2).map((event) => event.occurredOn));
    let cursor = todayKey(now, timezone);
    if (!activeDates.has(cursor)) cursor = addDays(cursor, -1);
    let streak = 0;
    while (activeDates.has(cursor)) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }
  function bestActivityStreak(habits2, events2) {
    const completedDates = [...new Set(activeBaseEvents(events2).map((event) => event.occurredOn))].sort();
    let best = 0;
    let run = 0;
    let previous;
    for (const date of completedDates) {
      run = previous && addDays(previous, 1) === date ? run + 1 : 1;
      best = Math.max(best, run);
      previous = date;
    }
    return best;
  }
  function latestRetractableEvent(projection) {
    const events2 = projection.activeEvents.filter((event) => event.type !== "set");
    return events2[events2.length - 1];
  }

  // ../../src/timer.ts
  var REST_INTERVAL_SECONDS = 30 * 60;
  function elapsedTimerSeconds(timer, now = Date.now()) {
    if (!Number.isFinite(timer.startedAt) || !Number.isFinite(now)) return 0;
    return Math.max(0, Math.floor(((timer.pausedAt ?? now) - timer.startedAt) / 1e3));
  }

  // ../../src/activity-list.ts
  function selectedActivityIds(entries, date) {
    const selected = /* @__PURE__ */ new Set();
    for (const entry of entries.filter((item) => item.date === date).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id))) {
      if (entry.included) selected.add(entry.habitId);
      else selected.delete(entry.habitId);
    }
    return [...selected];
  }
  function activityProgress(habit, date, events2, running, now = Date.now()) {
    const saved = Number(projectHabitDay(habit, date, events2).value);
    const live = habit.type === "duration" && running?.habitId === habit.id && running.date === date ? elapsedTimerSeconds(running, now) : 0;
    const target = effectiveRule(habit, date)?.target;
    const value = saved + live;
    return { value, target, completed: target !== void 0 && value >= target };
  }

  // ../../src/habit-order.ts
  var habitCategory = (habit) => habit.category || "\u65E5\u5E38";
  function applyHabitOrder(habits2, groups) {
    const categories = /* @__PURE__ */ new Map();
    for (const habit of habits2) {
      const category = habitCategory(habit);
      const group = categories.get(category) ?? [];
      group.push(habit);
      categories.set(category, group);
    }
    for (const [category, group] of categories) {
      const ids = groups.find((entry) => entry.category === category)?.ids ?? [];
      const ranks = new Map(ids.map((id, index) => [id, index]));
      group.sort((a, b) => (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity));
    }
    return [...categories.values()].flat();
  }
  function moveHabitIds(habits2, sourceId, targetId, after = false) {
    const source = habits2.find((habit) => habit.id === sourceId);
    const target = habits2.find((habit) => habit.id === targetId);
    if (!source || !target) throw new Error("\u9879\u76EE\u5DF2\u53D8\u5316\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5");
    if (habitCategory(source) !== habitCategory(target)) throw new Error("\u8BF7\u5728\u540C\u4E00\u5206\u7C7B\u5185\u8C03\u6574\u987A\u5E8F\uFF0C\u5206\u7C7B\u4E0D\u4F1A\u968F\u62D6\u52A8\u6539\u53D8");
    const category = habitCategory(source);
    const ids = habits2.filter((habit) => habitCategory(habit) === category).map((habit) => habit.id);
    if (sourceId !== targetId) {
      ids.splice(ids.indexOf(sourceId), 1);
      ids.splice(ids.indexOf(targetId) + Number(after), 0, sourceId);
    }
    return { category, ids };
  }

  // ../../src/activity-drag.ts
  var MIME = "application/x-daymark-habit";
  var PREFIX = "daymark-habit:";
  function writeActivityDrag(data, id) {
    data?.setData(MIME, id);
    data?.setData("text/plain", PREFIX + id);
  }
  function canDropActivity(data) {
    return !!data && (Array.from(data.types).includes(MIME) || Array.from(data.types).includes("text/plain"));
  }
  function readActivityDrag(data) {
    const custom = data?.getData(MIME);
    if (custom) return custom;
    const plain = data?.getData("text/plain") ?? "";
    return plain.startsWith(PREFIX) ? plain.slice(PREFIX.length) || void 0 : void 0;
  }

  // ../../src/gallery-modal.ts
  var GalleryImageModal = class extends Modal {
    constructor(app, item) {
      super(app);
      this.item = item;
    }
    onOpen() {
      this.modalEl.addClass("daymark-modal", "daymark-gallery-lightbox");
      this.setTitle(this.item.title);
      this.contentEl.createEl("img", { attr: { src: this.item.url, alt: this.item.title } });
      this.contentEl.createEl("p", { text: this.item.description });
      this.contentEl.createEl("button", { text: "\u5173\u95ED" }).addEventListener("click", () => this.close());
    }
    onClose() {
      this.contentEl.empty();
    }
  };
  var GalleryEditModal = class extends Modal {
    constructor(app, item, save) {
      super(app);
      this.item = item;
      this.save = save;
    }
    onOpen() {
      this.modalEl.addClass("daymark-modal");
      this.setTitle("\u7F16\u8F91\u4F5C\u54C1\u8BF4\u660E");
      const titleLabel = this.contentEl.createEl("label", { text: "\u4F5C\u54C1\u6807\u9898" });
      const title = titleLabel.createEl("input", { attr: { type: "text", maxlength: "200" } });
      title.value = this.item.title;
      const descriptionLabel = this.contentEl.createEl("label", { text: "\u4F5C\u54C1\u8BF4\u660E" });
      const description = descriptionLabel.createEl("textarea", { attr: { rows: "6", maxlength: "5000" } });
      description.value = this.item.description;
      const save = this.contentEl.createEl("button", { text: "\u4FDD\u5B58\u4F5C\u54C1\u8BF4\u660E", cls: "mod-cta" });
      save.addEventListener("click", async () => {
        save.disabled = true;
        try {
          await this.save(title.value, description.value);
          this.close();
        } catch (error) {
          new Notice(error instanceof Error ? error.message : String(error));
          save.disabled = false;
        }
      });
    }
    onClose() {
      this.contentEl.empty();
    }
  };

  // ../../src/id.ts
  function generateId(prefix) {
    const time = Date.now().toString(36);
    let random = "";
    try {
      const bytes = new Uint8Array(8);
      globalThis.crypto.getRandomValues(bytes);
      random = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    } catch {
      random = Math.random().toString(36).slice(2, 14);
    }
    return `${prefix}_${time}_${random}`;
  }

  // ../../src/defaults.ts
  function createHabit(name, type, date, order, options = {}) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const target = type === "duration" ? 1800 : 1;
    return {
      version: 1,
      id: generateId("habit"),
      name,
      type,
      category: options.category ?? "\u65E5\u5E38",
      emoji: options.emoji ?? "\u2728",
      color: options.color ?? "#7c6fcd",
      unit: options.unit ?? (type === "duration" ? "\u5206\u949F" : type === "count" ? "\u6B21" : ""),
      step: options.step ?? (type === "duration" ? 300 : 1),
      order,
      createdAt: now,
      updatedAt: now,
      rules: [
        {
          id: generateId("rule"),
          effectiveFrom: date,
          enabled: true,
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          target,
          createdAt: now
        }
      ]
    };
  }
  var VIEW_TYPE_DAYMARK = "daymark-life-tracker-view";

  // ../../src/iching.ts
  var ICHING_REFLECTION_DISCLAIMER = "\u6BCF\u65E5\u4E00\u723B\u7528\u4E8E\u4F20\u7EDF\u6587\u5316\u9605\u8BFB\u4E0E\u81EA\u6211\u53CD\u601D\uFF0C\u4E0D\u662F\u5BF9\u672A\u6765\u7684\u9884\u6D4B\uFF0C\u4E5F\u4E0D\u5E94\u66FF\u4EE3\u73B0\u5B9E\u5224\u65AD\u3002";
  var RAW_ORIGINALS = `
\u4E7E|\u521D\u4E5D\uFF1A\u6F5B\u9F8D\uFF0C\u52FF\u7528\u3002|\u4E5D\u4E8C\uFF1A\u898B\u9F8D\u5728\u7530\uFF0C\u5229\u898B\u5927\u4EBA\u3002|\u4E5D\u4E09\uFF1A\u541B\u5B50\u7D42\u65E5\u4E7E\u4E7E\uFF0C\u5915\u60D5\u82E5\uFF0C\u53B2\uFF0C\u65E0\u548E\u3002|\u4E5D\u56DB\uFF1A\u6216\u8E8D\u5728\u6DF5\uFF0C\u65E0\u548E\u3002|\u4E5D\u4E94\uFF1A\u98DB\u9F8D\u5728\u5929\uFF0C\u5229\u898B\u5927\u4EBA\u3002|\u4E0A\u4E5D\uFF1A\u4EA2\u9F8D\u6709\u6094\u3002
\u5764|\u521D\u516D\uFF1A\u5C65\u971C\uFF0C\u5805\u51B0\u81F3\u3002|\u516D\u4E8C\uFF1A\u76F4\uFF0C\u65B9\uFF0C\u5927\uFF0C\u4E0D\u7FD2\u65E0\u4E0D\u5229\u3002|\u516D\u4E09\uFF1A\u542B\u7AE0\u53EF\u8C9E\u3002\u6216\u5F9E\u738B\u4E8B\uFF0C\u65E0\u6210\u6709\u7D42\u3002|\u516D\u56DB\uFF1A\u62EC\u56CA\uFF1B\u65E0\u548E\uFF0C\u65E0\u8B7D\u3002|\u516D\u4E94\uFF1A\u9EC3\u88F3\uFF0C\u5143\u5409\u3002|\u4E0A\u516D\uFF1A\u9F8D\u6230\u4E8E\u91CE\uFF0C\u5176\u8840\u7384\u9EC3\u3002
\u5C6F|\u521D\u4E5D\uFF1A\u78D0\u6853\uFF1B\u5229\u5C45\u8C9E\uFF0C\u5229\u5EFA\u4FAF\u3002|\u516D\u4E8C\uFF1A\u5C6F\u5982\u9085\u5982\uFF0C\u4E58\u99AC\u73ED\u5982\u3002\u532A\u5BC7\u5A5A\u5ABE\uFF0C\u5973\u5B50\u8C9E\u4E0D\u5B57\uFF0C\u5341\u5E74\u4E43\u5B57\u3002|\u516D\u4E09\uFF1A\u5373\u9E7F\u65E0\u865E\uFF0C\u60DF\u5165\u4E8E\u6797\u4E2D\uFF0C\u541B\u5B50\u5E7E\u4E0D\u5982\u820D\uFF0C\u5F80\u541D\u3002|\u516D\u56DB\uFF1A\u4E58\u99AC\u73ED\u5982\uFF0C\u6C42\u5A5A\u5ABE\uFF0C\u5F80\u5409\uFF0C\u65E0\u4E0D\u5229\u3002|\u4E5D\u4E94\uFF1A\u5C6F\u5176\u818F\uFF0C\u5C0F\u8C9E\u5409\uFF0C\u5927\u8C9E\u51F6\u3002|\u4E0A\u516D\uFF1A\u4E58\u99AC\u73ED\u5982\uFF0C\u6CE3\u8840\u6F23\u5982\u3002
\u8499|\u521D\u516D\uFF1A\u767C\u8499\uFF0C\u5229\u7528\u5211\u4EBA\uFF0C\u7528\u8AAA\u684E\u688F\uFF0C\u4EE5\u5F80\u541D\u3002|\u4E5D\u4E8C\uFF1A\u5305\u8499\u5409\uFF1B\u7D0D\u5A66\u5409\uFF1B\u5B50\u514B\u5BB6\u3002|\u516D\u4E09\uFF1A\u52FF\u7528\u53D6\u5973\uFF1B\u898B\u91D1\u592B\uFF0C\u4E0D\u6709\u8EAC\uFF0C\u65E0\u6538\u5229\u3002|\u516D\u56DB\uFF1A\u56F0\u8499\uFF0C\u541D\u3002|\u516D\u4E94\uFF1A\u7AE5\u8499\uFF0C\u5409\u3002|\u4E0A\u4E5D\uFF1A\u64CA\u8499\uFF1B\u4E0D\u5229\u70BA\u5BC7\uFF0C\u5229\u79A6\u5BC7\u3002
\u9700|\u521D\u4E5D\uFF1A\u9700\u4E8E\u90CA\u3002\u5229\u7528\u6046\uFF0C\u65E0\u548E\u3002|\u4E5D\u4E8C\uFF1A\u9700\u4E8E\u6C99\u3002\u5C0F\u6709\u8A00\uFF0C\u7D42\u5409\u3002|\u4E5D\u4E09\uFF1A\u9700\u4E8E\u6CE5\uFF0C\u81F4\u5BC7\u81F3\u3002|\u516D\u56DB\uFF1A\u9700\u4E8E\u8840\uFF0C\u51FA\u81EA\u7A74\u3002|\u4E5D\u4E94\uFF1A\u9700\u4E8E\u9152\u98DF\uFF0C\u8C9E\u5409\u3002|\u4E0A\u516D\uFF1A\u5165\u4E8E\u7A74\uFF0C\u6709\u4E0D\u901F\u4E4B\u5BA2\u4E09\u4EBA\u4F86\uFF0C\u656C\u4E4B\u7D42\u5409\u3002
\u8A1F|\u521D\u516D\uFF1A\u4E0D\u6C38\u6240\u4E8B\uFF0C\u5C0F\u6709\u8A00\uFF0C\u7D42\u5409\u3002|\u4E5D\u4E8C\uFF1A\u4E0D\u514B\u8A1F\uFF0C\u6B78\u800C\u900B\uFF0C\u5176\u9091\u4EBA\u4E09\u767E\u6236\uFF0C\u65E0\u771A\u3002|\u516D\u4E09\uFF1A\u98DF\u820A\u5FB7\uFF0C\u8C9E\u53B2\uFF0C\u7D42\u5409\uFF0C\u6216\u5F9E\u738B\u4E8B\uFF0C\u65E0\u6210\u3002|\u4E5D\u56DB\uFF1A\u4E0D\u514B\u8A1F\uFF0C\u5FA9\u5373\u547D\u6E1D\uFF0C\u5B89\u8C9E\u5409\u3002|\u4E5D\u4E94\uFF1A\u8A1F\u5143\u5409\u3002|\u4E0A\u4E5D\uFF1A\u6216\u932B\u4E4B\u97B6\u5E36\uFF0C\u7D42\u671D\u4E09\u892B\u4E4B\u3002
\u5E2B|\u521D\u516D\uFF1A\u5E2B\u51FA\u4EE5\u5F8B\uFF0C\u5426\u81E7\u51F6\u3002|\u4E5D\u4E8C\uFF1A\u5728\u5E2B\u4E2D\u5409\uFF0C\u65E0\u548E\uFF0C\u738B\u4E09\u932B\u547D\u3002|\u516D\u4E09\uFF1A\u5E2B\u6216\u8F3F\u5C38\uFF0C\u51F6\u3002|\u516D\u56DB\uFF1A\u5E2B\u5DE6\u6B21\uFF0C\u65E0\u548E\u3002|\u516D\u4E94\uFF1A\u7530\u6709\u79BD\uFF0C\u5229\u57F7\u8A00\uFF0C\u65E0\u548E\u3002\u9577\u5B50\u5E25\u5E2B\uFF0C\u5F1F\u5B50\u8F3F\u5C38\uFF0C\u8C9E\u51F6\u3002|\u4E0A\u516D\uFF1A\u5927\u541B\u6709\u547D\uFF0C\u958B\u570B\u627F\u5BB6\uFF0C\u5C0F\u4EBA\u52FF\u7528\u3002
\u6BD4|\u521D\u516D\uFF1A\u6709\u5B5A\uFF0C\u6BD4\u4E4B\uFF0C\u65E0\u548E\u3002\u6709\u5B5A\u76C8\u7F36\uFF0C\u7D42\u4F86\u6709\u5B83\u5409\u3002|\u516D\u4E8C\uFF1A\u6BD4\u4E4B\u81EA\u5167\uFF0C\u8C9E\u5409\u3002|\u516D\u4E09\uFF1A\u6BD4\u4E4B\u532A\u4EBA\u3002|\u516D\u56DB\uFF1A\u5916\u6BD4\u4E4B\uFF0C\u8C9E\u5409\u3002|\u4E5D\u4E94\uFF1A\u986F\u6BD4\uFF0C\u738B\u7528\u4E09\u9A45\uFF0C\u5931\u524D\u79BD\u3002\u9091\u4EBA\u4E0D\u8AA1\uFF0C\u5409\u3002|\u4E0A\u516D\uFF1A\u6BD4\u4E4B\u65E0\u9996\uFF0C\u51F6\u3002
\u5C0F\u755C|\u521D\u4E5D\uFF1A\u5FA9\u81EA\u9053\uFF0C\u4F55\u5176\u548E\uFF0C\u5409\u3002|\u4E5D\u4E8C\uFF1A\u727D\u5FA9\uFF0C\u5409\u3002|\u4E5D\u4E09\uFF1A\u8F3F\u8AAA\u8F3B\uFF0C\u592B\u59BB\u53CD\u76EE\u3002|\u516D\u56DB\uFF1A\u6709\u5B5A\uFF0C\u8840\u53BB\u60D5\u51FA\uFF0C\u65E0\u548E\u3002|\u4E5D\u4E94\uFF1A\u6709\u5B5A\u6523\u5982\uFF0C\u5BCC\u4EE5\u5176\u9130\u3002|\u4E0A\u4E5D\uFF1A\u65E2\u96E8\u65E2\u8655\uFF0C\u5C1A\u5FB7\u8F09\uFF0C\u5A66\u8C9E\u53B2\u3002\u6708\u5E7E\u671B\uFF0C\u541B\u5B50\u5F81\u51F6\u3002
\u5C65|\u521D\u4E5D\uFF1A\u7D20\u5C65\uFF0C\u5F80\u65E0\u548E\u3002|\u4E5D\u4E8C\uFF1A\u5C65\u9053\u5766\u5766\uFF0C\u5E7D\u4EBA\u8C9E\u5409\u3002|\u516D\u4E09\uFF1A\u7707\u80FD\u8996\uFF0C\u8DDB\u80FD\u5C65\uFF0C\u5C65\u864E\u5C3E\uFF0C\u54A5\u4EBA\uFF0C\u51F6\u3002\u6B66\u4EBA\u70BA\u4E8E\u5927\u541B\u3002|\u4E5D\u56DB\uFF1A\u5C65\u864E\u5C3E\uFF0C\u612C\u612C\uFF0C\u7D42\u5409\u3002|\u4E5D\u4E94\uFF1A\u592C\u5C65\uFF0C\u8C9E\u53B2\u3002|\u4E0A\u4E5D\uFF1A\u8996\u5C65\u8003\u7965\uFF0C\u5176\u65CB\u5143\u5409\u3002
\u6CF0|\u521D\u4E5D\uFF1A\u62D4\u8305\u8339\uFF0C\u4EE5\u5176\u5F59\uFF0C\u5F81\u5409\u3002|\u4E5D\u4E8C\uFF1A\u5305\u8352\uFF0C\u7528\u99AE\u6CB3\uFF0C\u4E0D\u9050\u907A\uFF0C\u670B\u4EA1\uFF0C\u5F97\u5C1A\u4E8E\u4E2D\u884C\u3002|\u4E5D\u4E09\uFF1A\u65E0\u5E73\u4E0D\u9642\uFF0C\u65E0\u5F80\u4E0D\u5FA9\uFF0C\u8271\u8C9E\u65E0\u548E\u3002\u52FF\u6064\u5176\u5B5A\uFF0C\u4E8E\u98DF\u6709\u798F\u3002|\u516D\u56DB\uFF1A\u7FE9\u7FE9\uFF0C\u4E0D\u5BCC\uFF0C\u4EE5\u5176\u9130\uFF0C\u4E0D\u6212\u4EE5\u5B5A\u3002|\u516D\u4E94\uFF1A\u5E1D\u4E59\u6B78\u59B9\uFF0C\u4EE5\u7949\u5143\u5409\u3002|\u4E0A\u516D\uFF1A\u57CE\u5FA9\u4E8E\u968D\uFF0C\u52FF\u7528\u5E2B\u3002\u81EA\u9091\u544A\u547D\uFF0C\u8C9E\u541D\u3002
\u5426|\u521D\u516D\uFF1A\u62D4\u8305\u8339\uFF0C\u4EE5\u5176\u5F59\uFF0C\u8C9E\u5409\u4EA8\u3002|\u516D\u4E8C\uFF1A\u5305\u627F\u3002\u5C0F\u4EBA\u5409\uFF0C\u5927\u4EBA\u5426\uFF0C\u4EA8\u3002|\u516D\u4E09\uFF1A\u5305\u7F9E\u3002|\u4E5D\u56DB\uFF1A\u6709\u547D\uFF0C\u65E0\u548E\uFF0C\u7587\u96E2\u7949\u3002|\u4E5D\u4E94\uFF1A\u4F11\u5426\uFF0C\u5927\u4EBA\u5409\u3002\u5176\u4EA1\u5176\u4EA1\uFF0C\u7E6B\u4E8E\u82DE\u6851\u3002|\u4E0A\u4E5D\uFF1A\u50BE\u5426\uFF0C\u5148\u5426\u5F8C\u559C\u3002
\u540C\u4EBA|\u521D\u4E5D\uFF1A\u540C\u4EBA\u4E8E\u9580\uFF0C\u65E0\u548E\u3002|\u516D\u4E8C\uFF1A\u540C\u4EBA\u4E8E\u5B97\uFF0C\u541D\u3002|\u4E5D\u4E09\uFF1A\u4F0F\u620E\u4E8E\u83BD\uFF0C\u5347\u5176\u9AD8\u9675\uFF0C\u4E09\u6B72\u4E0D\u8208\u3002|\u4E5D\u56DB\uFF1A\u4E58\u5176\u5889\uFF0C\u5F17\u514B\u653B\uFF0C\u5409\u3002|\u4E5D\u4E94\uFF1A\u540C\u4EBA\uFF0C\u5148\u865F\u54B7\u800C\u5F8C\u7B11\u3002\u5927\u5E2B\u514B\u76F8\u9047\u3002|\u4E0A\u4E5D\uFF1A\u540C\u4EBA\u4E8E\u90CA\uFF0C\u65E0\u6094\u3002
\u5927\u6709|\u521D\u4E5D\uFF1A\u65E0\u4EA4\u5BB3\uFF0C\u532A\u548E\uFF0C\u8271\u5247\u65E0\u548E\u3002|\u4E5D\u4E8C\uFF1A\u5927\u8ECA\u4EE5\u8F09\uFF0C\u6709\u6538\u5F80\uFF0C\u65E0\u548E\u3002|\u4E5D\u4E09\uFF1A\u516C\u7528\u4EA8\u4E8E\u5929\u5B50\uFF0C\u5C0F\u4EBA\u5F17\u514B\u3002|\u4E5D\u56DB\uFF1A\u532A\u5176\u5F6D\uFF0C\u65E0\u548E\u3002|\u516D\u4E94\uFF1A\u53A5\u5B5A\u4EA4\u5982\uFF0C\u5A01\u5982\uFF1B\u5409\u3002|\u4E0A\u4E5D\uFF1A\u81EA\u5929\u7950\u4E4B\uFF0C\u5409\u65E0\u4E0D\u5229\u3002
\u8B19|\u521D\u516D\uFF1A\u8B19\u8B19\u541B\u5B50\uFF0C\u7528\u6D89\u5927\u5DDD\uFF0C\u5409\u3002|\u516D\u4E8C\uFF1A\u9CF4\u8B19\uFF0C\u8C9E\u5409\u3002|\u4E5D\u4E09\uFF1A\u52DE\u8B19\uFF0C\u541B\u5B50\u6709\u7D42\uFF0C\u5409\u3002|\u516D\u56DB\uFF1A\u65E0\u4E0D\u5229\uFF0C\u649D\u8B19\u3002|\u516D\u4E94\uFF1A\u4E0D\u5BCC\uFF0C\u4EE5\u5176\u9130\uFF0C\u5229\u7528\u4FB5\u4F10\uFF0C\u65E0\u4E0D\u5229\u3002|\u4E0A\u516D\uFF1A\u9CF4\u8B19\uFF0C\u5229\u7528\u884C\u5E2B\uFF0C\u5F81\u9091\u570B\u3002
\u8C6B|\u521D\u516D\uFF1A\u9CF4\u8C6B\uFF0C\u51F6\u3002|\u516D\u4E8C\uFF1A\u4ECB\u4E8E\u77F3\uFF0C\u4E0D\u7D42\u65E5\uFF0C\u8C9E\u5409\u3002|\u516D\u4E09\uFF1A\u76F1\u8C6B\uFF0C\u6094\u3002\u9072\u6709\u6094\u3002|\u4E5D\u56DB\uFF1A\u7531\u8C6B\uFF0C\u5927\u6709\u5F97\u3002\u52FF\u7591\u3002\u670B\u76CD\u7C2A\u3002|\u516D\u4E94\uFF1A\u8C9E\u75BE\uFF0C\u6046\u4E0D\u6B7B\u3002|\u4E0A\u516D\uFF1A\u51A5\u8C6B\uFF0C\u6210\u6709\u6E1D\uFF0C\u65E0\u548E\u3002
\u96A8|\u521D\u4E5D\uFF1A\u5B98\u6709\u6E1D\uFF0C\u8C9E\u5409\u3002\u51FA\u9580\u4EA4\u6709\u529F\u3002|\u516D\u4E8C\uFF1A\u7CFB\u5C0F\u5B50\uFF0C\u5931\u4E08\u592B\u3002|\u516D\u4E09\uFF1A\u7CFB\u4E08\u592B\uFF0C\u5931\u5C0F\u5B50\u3002\u96A8\u6709\u6C42\u5F97\uFF0C\u5229\u5C45\u8C9E\u3002|\u4E5D\u56DB\uFF1A\u96A8\u6709\u7372\uFF0C\u8C9E\u51F6\u3002\u6709\u5B5A\u5728\u9053\uFF0C\u4EE5\u660E\uFF0C\u4F55\u548E\u3002|\u4E5D\u4E94\uFF1A\u5B5A\u4E8E\u5609\uFF0C\u5409\u3002|\u4E0A\u516D\uFF1A\u62D8\u7CFB\u4E4B\uFF0C\u4E43\u5F9E\u7DAD\u4E4B\u3002\u738B\u7528\u4EA8\u4E8E\u897F\u5C71\u3002
\u8831|\u521D\u516D\uFF1A\u5E79\u7236\u4E4B\u8831\uFF0C\u6709\u5B50\uFF0C\u8003\u65E0\u548E\uFF0C\u53B2\u7D42\u5409\u3002|\u4E5D\u4E8C\uFF1A\u5E79\u6BCD\u4E4B\u8831\uFF0C\u4E0D\u53EF\u8C9E\u3002|\u4E5D\u4E09\uFF1A\u5E79\u7236\u4E4B\u8831\uFF0C\u5C0F\u6709\u6094\uFF0C\u65E0\u5927\u548E\u3002|\u516D\u56DB\uFF1A\u88D5\u7236\u4E4B\u8831\uFF0C\u5F80\u898B\u541D\u3002|\u516D\u4E94\uFF1A\u5E79\u7236\u4E4B\u8831\uFF0C\u7528\u8B7D\u3002|\u4E0A\u4E5D\uFF1A\u4E0D\u4E8B\u738B\u4FAF\uFF0C\u9AD8\u5C1A\u5176\u4E8B\u3002
\u81E8|\u521D\u4E5D\uFF1A\u54B8\u81E8\uFF0C\u8C9E\u5409\u3002|\u4E5D\u4E8C\uFF1A\u54B8\u81E8\uFF0C\u5409\u65E0\u4E0D\u5229\u3002|\u516D\u4E09\uFF1A\u7518\u81E8\uFF0C\u65E0\u6538\u5229\u3002\u65E2\u6182\u4E4B\uFF0C\u65E0\u548E\u3002|\u516D\u56DB\uFF1A\u81F3\u81E8\uFF0C\u65E0\u548E\u3002|\u516D\u4E94\uFF1A\u77E5\u81E8\uFF0C\u5927\u541B\u4E4B\u5B9C\uFF0C\u5409\u3002|\u4E0A\u516D\uFF1A\u6566\u81E8\uFF0C\u5409\u65E0\u548E\u3002
\u89C0|\u521D\u516D\uFF1A\u7AE5\u89C0\uFF0C\u5C0F\u4EBA\u65E0\u548E\uFF0C\u541B\u5B50\u541D\u3002|\u516D\u4E8C\uFF1A\u95DA\u89C0\uFF0C\u5229\u5973\u8C9E\u3002|\u516D\u4E09\uFF1A\u89C0\u6211\u751F\uFF0C\u9032\u9000\u3002|\u516D\u56DB\uFF1A\u89C0\u570B\u4E4B\u5149\uFF0C\u5229\u7528\u8CD3\u4E8E\u738B\u3002|\u4E5D\u4E94\uFF1A\u89C0\u6211\u751F\uFF0C\u541B\u5B50\u65E0\u548E\u3002|\u4E0A\u4E5D\uFF1A\u89C0\u5176\u751F\uFF0C\u541B\u5B50\u65E0\u548E\u3002
\u566C\u55D1|\u521D\u4E5D\uFF1A\u5C68\u6821\u6EC5\u8DBE\uFF0C\u65E0\u548E\u3002|\u516D\u4E8C\uFF1A\u566C\u819A\u6EC5\u9F3B\uFF0C\u65E0\u548E\u3002|\u516D\u4E09\uFF1A\u566C\u81D8\u8089\uFF0C\u9047\u6BD2\uFF1B\u5C0F\u541D\uFF0C\u65E0\u548E\u3002|\u4E5D\u56DB\uFF1A\u566C\u4E7E\u80CF\uFF0C\u5F97\u91D1\u77E2\uFF0C\u5229\u8271\u8C9E\uFF0C\u5409\u3002|\u516D\u4E94\uFF1A\u566C\u4E7E\u8089\uFF0C\u5F97\u9EC3\u91D1\uFF0C\u8C9E\u53B2\uFF0C\u65E0\u548E\u3002|\u4E0A\u4E5D\uFF1A\u4F55\u6821\u6EC5\u8033\uFF0C\u51F6\u3002
\u8CC1|\u521D\u4E5D\uFF1A\u8CC1\u5176\u8DBE\uFF0C\u820D\u8ECA\u800C\u5F92\u3002|\u516D\u4E8C\uFF1A\u8CC1\u5176\u9808\u3002|\u4E5D\u4E09\uFF1A\u8CC1\u5982\u6FE1\u5982\uFF0C\u6C38\u8C9E\u5409\u3002|\u516D\u56DB\uFF1A\u8CC1\u5982\u76A4\u5982\uFF0C\u767D\u99AC\u7FF0\u5982\uFF0C\u532A\u5BC7\u5A5A\u5ABE\u3002|\u516D\u4E94\uFF1A\u8CC1\u4E8E\u4E18\u5712\uFF0C\u675F\u5E1B\u6214\u6214\uFF0C\u541D\uFF0C\u7D42\u5409\u3002|\u4E0A\u4E5D\uFF1A\u767D\u8CC1\uFF0C\u65E0\u548E\u3002
\u525D|\u521D\u516D\uFF1A\u525D\u5E8A\u4EE5\u8DB3\uFF0C\u8511\u8C9E\u51F6\u3002|\u516D\u4E8C\uFF1A\u525D\u5E8A\u4EE5\u8FA8\uFF0C\u8511\u8C9E\u51F6\u3002|\u516D\u4E09\uFF1A\u525D\u4E4B\uFF0C\u65E0\u548E\u3002|\u516D\u56DB\uFF1A\u525D\u5E8A\u4EE5\u819A\uFF0C\u51F6\u3002|\u516D\u4E94\uFF1A\u8CAB\u9B5A\uFF0C\u4EE5\u5BAE\u4EBA\u5BF5\uFF0C\u65E0\u4E0D\u5229\u3002|\u4E0A\u4E5D\uFF1A\u78A9\u679C\u4E0D\u98DF\uFF0C\u541B\u5B50\u5F97\u8F3F\uFF0C\u5C0F\u4EBA\u525D\u5EEC\u3002
\u5FA9|\u521D\u4E5D\uFF1A\u4E0D\u9060\u5FA9\uFF0C\u65E0\u7957\u6094\uFF0C\u5143\u5409\u3002|\u516D\u4E8C\uFF1A\u4F11\u5FA9\uFF0C\u5409\u3002|\u516D\u4E09\uFF1A\u983B\u5FA9\uFF0C\u53B2\u65E0\u548E\u3002|\u516D\u56DB\uFF1A\u4E2D\u884C\u7368\u5FA9\u3002|\u516D\u4E94\uFF1A\u6566\u5FA9\uFF0C\u65E0\u6094\u3002|\u4E0A\u516D\uFF1A\u8FF7\u5FA9\uFF0C\u51F6\uFF0C\u6709\u707D\u771A\u3002\u7528\u884C\u5E2B\uFF0C\u7D42\u6709\u5927\u6557\uFF0C\u4EE5\u5176\u570B\u541B\uFF0C\u51F6\uFF1B\u81F3\u4E8E\u5341\u5E74\uFF0C\u4E0D\u514B\u5F81\u3002
\u65E0\u5984|\u521D\u4E5D\uFF1A\u65E0\u5984\uFF0C\u5F80\u5409\u3002|\u516D\u4E8C\uFF1A\u4E0D\u8015\u7372\uFF0C\u4E0D\u83D1\u756C\uFF0C\u5247\u5229\u6709\u6538\u5F80\u3002|\u516D\u4E09\uFF1A\u65E0\u5984\u4E4B\u707D\uFF0C\u6216\u7E6B\u4E4B\u725B\uFF0C\u884C\u4EBA\u4E4B\u5F97\uFF0C\u9091\u4EBA\u4E4B\u707D\u3002|\u4E5D\u56DB\uFF1A\u53EF\u8C9E\uFF0C\u65E0\u548E\u3002|\u4E5D\u4E94\uFF1A\u65E0\u5984\u4E4B\u75BE\uFF0C\u52FF\u85E5\u6709\u559C\u3002|\u4E0A\u4E5D\uFF1A\u65E0\u5984\uFF0C\u884C\u6709\u771A\uFF0C\u65E0\u6538\u5229\u3002
\u5927\u755C|\u521D\u4E5D\uFF1A\u6709\u53B2\u5229\u5DF2\u3002|\u4E5D\u4E8C\uFF1A\u8F3F\u8AAA\u8F39\u3002|\u4E5D\u4E09\uFF1A\u826F\u99AC\u9010\uFF0C\u5229\u8271\u8C9E\u3002\u66F0\u9591\u8F3F\u885B\uFF0C\u5229\u6709\u6538\u5F80\u3002|\u516D\u56DB\uFF1A\u7AE5\u725B\u4E4B\u727F\uFF0C\u5143\u5409\u3002|\u516D\u4E94\uFF1A\u8C76\u8C55\u4E4B\u7259\uFF0C\u5409\u3002|\u4E0A\u4E5D\uFF1A\u4F55\u5929\u4E4B\u8862\uFF0C\u4EA8\u3002
\u9824|\u521D\u4E5D\uFF1A\u820D\u723E\u9748\u9F9C\uFF0C\u89C0\u6211\u6735\u9824\uFF0C\u51F6\u3002|\u516D\u4E8C\uFF1A\u985B\u9824\uFF0C\u62C2\u7D93\uFF0C\u4E8E\u4E18\u9824\uFF0C\u5F81\u51F6\u3002|\u516D\u4E09\uFF1A\u62C2\u9824\uFF0C\u8C9E\u51F6\uFF0C\u5341\u5E74\u52FF\u7528\uFF0C\u65E0\u6538\u5229\u3002|\u516D\u56DB\uFF1A\u985B\u9824\uFF0C\u5409\uFF0C\u864E\u8996\u7708\u7708\uFF0C\u5176\u6B32\u9010\u9010\uFF0C\u65E0\u548E\u3002|\u516D\u4E94\uFF1A\u62C2\u7D93\uFF0C\u5C45\u8C9E\u5409\uFF0C\u4E0D\u53EF\u6D89\u5927\u5DDD\u3002|\u4E0A\u4E5D\uFF1A\u7531\u9824\uFF0C\u53B2\u5409\uFF0C\u5229\u6D89\u5927\u5DDD\u3002
\u5927\u904E|\u521D\u516D\uFF1A\u85C9\u7528\u767D\u8305\uFF0C\u65E0\u548E\u3002|\u4E5D\u4E8C\uFF1A\u67AF\u694A\u751F\u7A0A\uFF0C\u8001\u592B\u5F97\u5176\u5973\u59BB\uFF0C\u65E0\u4E0D\u5229\u3002|\u4E5D\u4E09\uFF1A\u68DF\u6A48\uFF0C\u51F6\u3002|\u4E5D\u56DB\uFF1A\u68DF\u9686\uFF0C\u5409\uFF1B\u6709\u5B83\u541D\u3002|\u4E5D\u4E94\uFF1A\u67AF\u694A\u751F\u83EF\uFF0C\u8001\u5A66\u5F97\u58EB\u592B\uFF0C\u65E0\u548E\u65E0\u8B7D\u3002|\u4E0A\u516D\uFF1A\u904E\u6D89\u6EC5\u9802\uFF0C\u51F6\uFF0C\u65E0\u548E\u3002
\u574E|\u521D\u516D\uFF1A\u7FD2\u574E\uFF0C\u5165\u4E8E\u574E\u7A9E\uFF0C\u51F6\u3002|\u4E5D\u4E8C\uFF1A\u574E\u6709\u96AA\uFF0C\u6C42\u5C0F\u5F97\u3002|\u516D\u4E09\uFF1A\u4F86\u4E4B\u574E\u574E\uFF0C\u96AA\u4E14\u6795\uFF0C\u5165\u4E8E\u574E\u7A9E\uFF0C\u52FF\u7528\u3002|\u516D\u56DB\uFF1A\u6A3D\u9152\u7C0B\u8CB3\uFF0C\u7528\u7F36\uFF0C\u7D0D\u7D04\u81EA\u7256\uFF0C\u7D42\u65E0\u548E\u3002|\u4E5D\u4E94\uFF1A\u574E\u4E0D\u76C8\uFF0C\u7957\u65E2\u5E73\uFF0C\u65E0\u548E\u3002|\u4E0A\u516D\uFF1A\u4FC2\u7528\u5FBD\u7E86\uFF0C\u5BD8\u4E8E\u53E2\u68D8\uFF0C\u4E09\u6B72\u4E0D\u5F97\uFF0C\u51F6\u3002
\u96E2|\u521D\u4E5D\uFF1A\u5C65\u932F\u7136\uFF0C\u656C\u4E4B\u65E0\u548E\u3002|\u516D\u4E8C\uFF1A\u9EC3\u96E2\uFF0C\u5143\u5409\u3002|\u4E5D\u4E09\uFF1A\u65E5\u6603\u4E4B\u96E2\uFF0C\u4E0D\u9F13\u7F36\u800C\u6B4C\uFF0C\u5247\u5927\u800B\u4E4B\u55DF\uFF0C\u51F6\u3002|\u4E5D\u56DB\uFF1A\u7A81\u5982\u5176\u4F86\u5982\uFF0C\u711A\u5982\uFF0C\u6B7B\u5982\uFF0C\u68C4\u5982\u3002|\u516D\u4E94\uFF1A\u51FA\u6D95\u6CB1\u82E5\uFF0C\u621A\u55DF\u82E5\uFF0C\u5409\u3002|\u4E0A\u4E5D\uFF1A\u738B\u7528\u51FA\u5F81\uFF0C\u6709\u5609\u6298\u9996\uFF0C\u7372\u532A\u5176\u919C\uFF0C\u65E0\u548E\u3002
\u54B8|\u521D\u516D\uFF0C\u54B8\u5176\u62C7\u3002|\u516D\u4E8C\uFF0C\u54B8\u5176\u8153\uFF0C\u51F6\uFF0C\u5C45\u5409\u3002|\u4E5D\u4E09\uFF0C\u54B8\u5176\u80A1\uFF0C\u57F7\u5176\u96A8\uFF0C\u5F80\u541D\u3002|\u4E5D\u56DB\uFF0C\u8C9E\u5409\uFF0C\u6094\u4EA1\uFF0C\u61A7\u61A7\u5F80\u4F86\uFF0C\u670B\u5F9E\u723E\u601D\u3002|\u4E5D\u4E94\uFF0C\u54B8\u5176\u8122\uFF0C\u65E0\u6094\u3002|\u4E0A\u516D\uFF0C\u54B8\u5176\u8F14\u9830\u820C\u3002
\u6046|\u521D\u516D\uFF1A\u6D5A\u6046\uFF0C\u8C9E\u51F6\uFF0C\u65E0\u6538\u5229\u3002|\u4E5D\u4E8C\uFF1A\u6094\u4EA1\u3002|\u4E5D\u4E09\uFF1A\u4E0D\u6046\u5176\u5FB7\uFF0C\u6216\u627F\u4E4B\u7F9E\uFF0C\u8C9E\u541D\u3002|\u4E5D\u56DB\uFF1A\u7530\u65E0\u79BD\u3002|\u516D\u4E94\uFF1A\u6046\u5176\u5FB7\uFF0C\u8C9E\uFF0C\u5A66\u4EBA\u5409\uFF0C\u592B\u5B50\u51F6\u3002|\u4E0A\u516D\uFF1A\u632F\u6046\uFF0C\u51F6\u3002
\u906F|\u521D\u516D\uFF1A\u906F\u5C3E\uFF0C\u53B2\uFF0C\u52FF\u7528\u6709\u6538\u5F80\u3002|\u516D\u4E8C\uFF1A\u57F7\u4E4B\u7528\u9EC3\u725B\u4E4B\u9769\uFF0C\u83AB\u4E4B\u52DD\u8AAA\u3002|\u4E5D\u4E09\uFF1A\u4FC2\u906F\uFF0C\u6709\u75BE\u53B2\uFF0C\u755C\u81E3\u59BE\u5409\u3002|\u4E5D\u56DB\uFF1A\u597D\u906F\uFF0C\u541B\u5B50\u5409\uFF0C\u5C0F\u4EBA\u5426\u3002|\u4E5D\u4E94\uFF1A\u5609\u906F\uFF0C\u8C9E\u5409\u3002|\u4E0A\u4E5D\uFF1A\u80A5\u906F\uFF0C\u65E0\u4E0D\u5229\u3002
\u5927\u58EF|\u521D\u4E5D\uFF1A\u58EF\u4E8E\u8DBE\uFF0C\u5F81\u51F6\uFF0C\u6709\u5B5A\u3002|\u4E5D\u4E8C\uFF1A\u8C9E\u5409\u3002|\u4E5D\u4E09\uFF1A\u5C0F\u4EBA\u7528\u58EF\uFF0C\u541B\u5B50\u7528\u7F54\uFF0C\u8C9E\u53B2\u3002\u7F9D\u7F8A\u89F8\u85E9\uFF0C\u7FB8\u5176\u89D2\u3002|\u4E5D\u56DB\uFF1A\u8C9E\u5409\u6094\u4EA1\uFF0C\u85E9\u6C7A\u4E0D\u7FB8\uFF0C\u58EF\u4E8E\u5927\u8F3F\u4E4B\u8F39\u3002|\u516D\u4E94\uFF1A\u55AA\u7F8A\u4E8E\u6613\uFF0C\u65E0\u6094\u3002|\u4E0A\u516D\uFF1A\u7F9D\u7F8A\u89F8\u85E9\uFF0C\u4E0D\u80FD\u9000\uFF0C\u4E0D\u80FD\u9042\uFF0C\u65E0\u6538\u5229\uFF0C\u8271\u5247\u5409\u3002
\u6649|\u521D\u516D\uFF1A\u6649\u5982\uFF0C\u6467\u5982\uFF0C\u8C9E\u5409\u3002\u7F54\u5B5A\uFF0C\u88D5\u65E0\u548E\u3002|\u516D\u4E8C\uFF1A\u6649\u5982\uFF0C\u6101\u5982\uFF0C\u8C9E\u5409\u3002\u53D7\u8332\u4ECB\u798F\uFF0C\u4E8E\u5176\u738B\u6BCD\u3002|\u516D\u4E09\uFF1A\u773E\u5141\uFF0C\u6094\u4EA1\u3002|\u4E5D\u56DB\uFF1A\u6649\u5982\u78A9\u9F20\uFF0C\u8C9E\u53B2\u3002|\u516D\u4E94\uFF1A\u6094\u4EA1\uFF0C\u5931\u5F97\u52FF\u6064\uFF0C\u5F80\u5409\uFF0C\u65E0\u4E0D\u5229\u3002|\u4E0A\u4E5D\uFF1A\u6649\u5176\u89D2\uFF0C\u7DAD\u7528\u4F10\u9091\uFF0C\u53B2\u5409\u65E0\u548E\uFF0C\u8C9E\u541D\u3002
\u660E\u5937|\u521D\u4E5D\uFF1A\u660E\u5937\u4E8E\u98DB\uFF0C\u5782\u5176\u7FFC\u3002\u541B\u5B50\u4E8E\u884C\uFF0C\u4E09\u65E5\u4E0D\u98DF\uFF0C\u6709\u6538\u5F80\uFF0C\u4E3B\u4EBA\u6709\u8A00\u3002|\u516D\u4E8C\uFF1A\u660E\u5937\uFF0C\u5937\u4E8E\u5DE6\u80A1\uFF0C\u7528\u62EF\u99AC\u58EF\uFF0C\u5409\u3002|\u4E5D\u4E09\uFF1A\u660E\u5937\u4E8E\u5357\u72E9\uFF0C\u5F97\u5176\u5927\u9996\uFF0C\u4E0D\u53EF\u75BE\u8C9E\u3002|\u516D\u56DB\uFF1A\u5165\u4E8E\u5DE6\u8179\uFF0C\u7372\u660E\u5937\u4E4B\u5FC3\uFF0C\u51FA\u4E8E\u9580\u5EAD\u3002|\u516D\u4E94\uFF1A\u7B95\u5B50\u4E4B\u660E\u5937\uFF0C\u5229\u8C9E\u3002|\u4E0A\u516D\uFF1A\u4E0D\u660E\u6666\uFF0C\u521D\u767B\u4E8E\u5929\uFF0C\u5F8C\u5165\u4E8E\u5730\u3002
\u5BB6\u4EBA|\u521D\u4E5D\uFF1A\u9591\u6709\u5BB6\uFF0C\u6094\u4EA1\u3002|\u516D\u4E8C\uFF1A\u65E0\u6538\u9042\uFF0C\u5728\u4E2D\u994B\uFF0C\u8C9E\u5409\u3002|\u4E5D\u4E09\uFF1A\u5BB6\u4EBA\u55C3\u55C3\uFF0C\u6094\u53B2\u5409\uFF1B\u5A66\u5B50\u563B\u563B\uFF0C\u7D42\u541D\u3002|\u516D\u56DB\uFF1A\u5BCC\u5BB6\uFF0C\u5927\u5409\u3002|\u4E5D\u4E94\uFF1A\u738B\u5047\u6709\u5BB6\uFF0C\u52FF\u6064\uFF0C\u5F80\u5409\u3002|\u4E0A\u4E5D\uFF1A\u6709\u5B5A\u5A01\u5982\uFF0C\u7D42\u5409\u3002
\u777D|\u521D\u4E5D\uFF1A\u6094\u4EA1\uFF0C\u55AA\u99AC\u52FF\u9010\uFF0C\u81EA\u5FA9\uFF1B\u898B\u60E1\u4EBA\u65E0\u548E\u3002|\u4E5D\u4E8C\uFF1A\u9047\u4E3B\u4E8E\u5DF7\uFF0C\u65E0\u548E\u3002|\u516D\u4E09\uFF1A\u898B\u8F3F\u66F3\uFF0C\u5176\u725B\u63A3\uFF0C\u5176\u4EBA\u5929\u4E14\u5293\uFF0C\u65E0\u521D\u6709\u7D42\u3002|\u4E5D\u56DB\uFF1A\u777D\u5B64\uFF0C\u9047\u5143\u592B\uFF0C\u4EA4\u5B5A\uFF0C\u53B2\u65E0\u548E\u3002|\u516D\u4E94\uFF1A\u6094\u4EA1\uFF0C\u53A5\u5B97\u566C\u819A\uFF0C\u5F80\u4F55\u548E\u3002|\u4E0A\u4E5D\uFF1A\u777D\u5B64\uFF0C\u898B\u8C55\u8CA0\u5857\uFF0C\u8F09\u9B3C\u4E00\u8ECA\uFF0C\u5148\u5F35\u4E4B\u5F27\uFF0C\u5F8C\u8AAA\u4E4B\u5F27\uFF0C\u532A\u5BC7\u5A5A\u5ABE\uFF0C\u5F80\u9047\u96E8\u5247\u5409\u3002
\u8E47|\u521D\u516D\uFF1A\u5F80\u8E47\uFF0C\u4F86\u8B7D\u3002|\u516D\u4E8C\uFF1A\u738B\u81E3\u8E47\u8E47\uFF0C\u532A\u8EAC\u4E4B\u6545\u3002|\u4E5D\u4E09\uFF1A\u5F80\u8E47\u4F86\u53CD\u3002|\u516D\u56DB\uFF1A\u5F80\u8E47\u4F86\u9023\u3002|\u4E5D\u4E94\uFF1A\u5927\u8E47\u670B\u4F86\u3002|\u4E0A\u516D\uFF1A\u5F80\u8E47\u4F86\u78A9\uFF0C\u5409\uFF1B\u5229\u898B\u5927\u4EBA\u3002
\u89E3|\u521D\u516D\uFF1A\u65E0\u548E\u3002|\u4E5D\u4E8C\uFF1A\u7530\u7372\u4E09\u72D0\uFF0C\u5F97\u9EC3\u77E2\uFF0C\u8C9E\u5409\u3002|\u516D\u4E09\uFF1A\u8CA0\u4E14\u4E58\uFF0C\u81F4\u5BC7\u81F3\uFF0C\u8C9E\u541D\u3002|\u4E5D\u56DB\uFF1A\u89E3\u800C\u62C7\uFF0C\u670B\u81F3\u65AF\u5B5A\u3002|\u516D\u4E94\uFF1A\u541B\u5B50\u7DAD\u6709\u89E3\uFF0C\u5409\uFF1B\u6709\u5B5A\u4E8E\u5C0F\u4EBA\u3002|\u4E0A\u516D\uFF1A\u516C\u7528\u5C04\u96BC\u4E8E\u9AD8\u5889\u4E4B\u4E0A\uFF0C\u7372\u4E4B\uFF0C\u65E0\u4E0D\u5229\u3002
\u640D|\u521D\u4E5D\uFF1A\u5DF3\u4E8B\u9044\u5F80\uFF0C\u65E0\u548E\uFF0C\u914C\u640D\u4E4B\u3002|\u4E5D\u4E8C\uFF1A\u5229\u8C9E\uFF0C\u5F81\u51F6\uFF0C\u5F17\u640D\uFF0C\u76CA\u4E4B\u3002|\u516D\u4E09\uFF1A\u4E09\u4EBA\u884C\uFF0C\u5247\u640D\u4E00\u4EBA\uFF1B\u4E00\u4EBA\u884C\uFF0C\u5247\u5F97\u5176\u53CB\u3002|\u516D\u56DB\uFF1A\u640D\u5176\u75BE\uFF0C\u4F7F\u9044\u6709\u559C\uFF0C\u65E0\u548E\u3002|\u516D\u4E94\uFF1A\u6216\u76CA\u4E4B\uFF0C\u5341\u670B\u4E4B\u9F9C\u5F17\u514B\u9055\uFF0C\u5143\u5409\u3002|\u4E0A\u4E5D\uFF1A\u5F17\u640D\u76CA\u4E4B\uFF0C\u65E0\u548E\uFF0C\u8C9E\u5409\uFF0C\u6709\u6538\u5F80\uFF0C\u5F97\u81E3\u65E0\u5BB6\u3002
\u76CA|\u521D\u4E5D\uFF1A\u5229\u7528\u70BA\u5927\u4F5C\uFF0C\u5143\u5409\uFF0C\u65E0\u548E\u3002|\u516D\u4E8C\uFF1A\u6216\u76CA\u4E4B\uFF0C\u5341\u670B\u4E4B\u9F9C\u5F17\u514B\u9055\uFF0C\u6C38\u8C9E\u5409\u3002\u738B\u7528\u4EAB\u4E8E\u5E1D\uFF0C\u5409\u3002|\u516D\u4E09\uFF1A\u76CA\u4E4B\u7528\u51F6\u4E8B\uFF0C\u65E0\u548E\u3002\u6709\u5B5A\u4E2D\u884C\uFF0C\u544A\u516C\u7528\u572D\u3002|\u516D\u56DB\uFF1A\u4E2D\u884C\uFF0C\u544A\u516C\u5F9E\u3002\u5229\u7528\u70BA\u4F9D\u9077\u570B\u3002|\u4E5D\u4E94\uFF1A\u6709\u5B5A\u60E0\u5FC3\uFF0C\u52FF\u554F\u5143\u5409\u3002\u6709\u5B5A\u60E0\u6211\u5FB7\u3002|\u4E0A\u4E5D\uFF1A\u83AB\u76CA\u4E4B\uFF0C\u6216\u64CA\u4E4B\uFF0C\u7ACB\u5FC3\u52FF\u6046\uFF0C\u51F6\u3002
\u592C|\u521D\u4E5D\uFF1A\u58EF\u4E8E\u524D\u8DBE\uFF0C\u5F80\u4E0D\u52DD\u70BA\u548E\u3002|\u4E5D\u4E8C\uFF1A\u60D5\u865F\uFF0C\u83AB\u591C\u6709\u620E\uFF0C\u52FF\u6064\u3002|\u4E5D\u4E09\uFF1A\u58EF\u4E8E\u9804\uFF0C\u6709\u51F6\u3002\u541B\u5B50\u592C\u592C\uFF0C\u7368\u884C\uFF0C\u9047\u96E8\uFF0C\u82E5\u6FE1\uFF0C\u6709\u614D\uFF0C\u65E0\u548E\u3002|\u4E5D\u56DB\uFF1A\u81C0\u65E0\u819A\uFF0C\u5176\u884C\u6B21\u4E14\u3002\u727D\u7F8A\u6094\u4EA1\uFF0C\u805E\u8A00\u4E0D\u4FE1\u3002|\u4E5D\u4E94\uFF1A\u83A7\u9678\u592C\u592C\uFF0C\u4E2D\u884C\u65E0\u548E\u3002|\u4E0A\u516D\uFF1A\u65E0\u865F\uFF0C\u7D42\u6709\u51F6\u3002
\u59E4|\u521D\u516D\uFF1A\u7E6B\u4E8E\u91D1\u67C5\uFF0C\u8C9E\u5409\uFF0C\u6709\u6538\u5F80\uFF0C\u898B\u51F6\uFF0C\u7FB8\u8C55\u5B5A\u8E62\u8E85\u3002|\u4E5D\u4E8C\uFF1A\u5305\u6709\u9B5A\uFF0C\u65E0\u548E\uFF0C\u4E0D\u5229\u8CD3\u3002|\u4E5D\u4E09\uFF1A\u81C0\u65E0\u819A\uFF0C\u5176\u884C\u6B21\u4E14\uFF0C\u53B2\uFF0C\u65E0\u5927\u548E\u3002|\u4E5D\u56DB\uFF1A\u5305\u65E0\u9B5A\uFF0C\u8D77\u51F6\u3002|\u4E5D\u4E94\uFF1A\u4EE5\u675E\u5305\u74DC\uFF0C\u542B\u7AE0\uFF0C\u6709\u9695\u81EA\u5929\u3002|\u4E0A\u4E5D\uFF1A\u59E4\u5176\u89D2\uFF0C\u541D\uFF0C\u65E0\u548E\u3002
\u8403|\u521D\u516D\uFF1A\u6709\u5B5A\u4E0D\u7D42\uFF0C\u4E43\u4E82\u4E43\u8403\uFF0C\u82E5\u865F\u4E00\u63E1\u70BA\u7B11\uFF0C\u52FF\u6064\uFF0C\u5F80\u65E0\u548E\u3002|\u516D\u4E8C\uFF1A\u5F15\u5409\uFF0C\u65E0\u548E\uFF0C\u5B5A\u4E43\u5229\u7528\u79B4\u3002|\u516D\u4E09\uFF1A\u8403\u5982\uFF0C\u55DF\u5982\uFF0C\u65E0\u6538\u5229\uFF0C\u5F80\u65E0\u548E\uFF0C\u5C0F\u541D\u3002|\u4E5D\u56DB\uFF1A\u5927\u5409\uFF0C\u65E0\u548E\u3002|\u4E5D\u4E94\uFF1A\u8403\u6709\u4F4D\uFF0C\u65E0\u548E\u3002\u532A\u5B5A\uFF0C\u5143\u6C38\u8C9E\uFF0C\u6094\u4EA1\u3002|\u4E0A\u516D\uFF1A\u9F4E\u54A8\u6D95\u6D1F\uFF0C\u65E0\u548E\u3002
\u5347|\u521D\u516D\uFF1A\u5141\u5347\uFF0C\u5927\u5409\u3002|\u4E5D\u4E8C\uFF1A\u5B5A\u4E43\u5229\u7528\u79B4\uFF0C\u65E0\u548E\u3002|\u4E5D\u4E09\uFF1A\u5347\u865B\u9091\u3002|\u516D\u56DB\uFF1A\u738B\u7528\u4EA8\u4E8E\u5C90\u5C71\uFF0C\u5409\u65E0\u548E\u3002|\u516D\u4E94\uFF1A\u8C9E\u5409\uFF0C\u5347\u968E\u3002|\u4E0A\u516D\uFF1A\u51A5\u5347\uFF0C\u5229\u4E8E\u4E0D\u606F\u4E4B\u8C9E\u3002
\u56F0|\u521D\u516D\uFF1A\u81C0\u56F0\u4E8E\u682A\u6728\uFF0C\u5165\u4E8E\u5E7D\u8C37\uFF0C\u4E09\u6B72\u4E0D\u89BF\u3002|\u4E5D\u4E8C\uFF1A\u56F0\u4E8E\u9152\u98DF\uFF0C\u6731\u7D31\u65B9\u4F86\uFF0C\u5229\u7528\u4EAB\u7940\uFF0C\u5F81\u51F6\uFF0C\u65E0\u548E\u3002|\u516D\u4E09\uFF1A\u56F0\u4E8E\u77F3\uFF0C\u64DA\u4E8E\u84BA\u853E\uFF0C\u5165\u4E8E\u5176\u5BAE\uFF0C\u4E0D\u898B\u5176\u59BB\uFF0C\u51F6\u3002|\u4E5D\u56DB\uFF1A\u4F86\u5F90\u5F90\uFF0C\u56F0\u4E8E\u91D1\u8ECA\uFF0C\u541D\uFF0C\u6709\u7D42\u3002|\u4E5D\u4E94\uFF1A\u5293\u5216\uFF0C\u56F0\u4E8E\u8D64\u7D31\uFF0C\u4E43\u5F90\u6709\u8AAA\uFF0C\u5229\u7528\u796D\u7940\u3002|\u4E0A\u516D\uFF1A\u56F0\u4E8E\u845B\u85DF\uFF0C\u4E8E\u81F2\u537C\uFF0C\u66F0\u52D5\u6094\u3002\u6709\u6094\uFF0C\u5F81\u5409\u3002
\u4E95|\u521D\u516D\uFF1A\u4E95\u6CE5\u4E0D\u98DF\uFF0C\u820A\u4E95\u65E0\u79BD\u3002|\u4E5D\u4E8C\uFF1A\u4E95\u8C37\u5C04\u9B92\uFF0C\u74EE\u655D\u6F0F\u3002|\u4E5D\u4E09\uFF1A\u4E95\u6E2B\u4E0D\u98DF\uFF0C\u70BA\u6211\u5FC3\u60FB\uFF0C\u53EF\u7528\u6C72\uFF0C\u738B\u660E\uFF0C\u4E26\u53D7\u5176\u798F\u3002|\u516D\u56DB\uFF1A\u4E95\u7503\uFF0C\u65E0\u548E\u3002|\u4E5D\u4E94\uFF1A\u4E95\u51BD\uFF0C\u5BD2\u6CC9\u98DF\u3002|\u4E0A\u516D\uFF1A\u4E95\u6536\u52FF\u5E55\uFF0C\u6709\u5B5A\u5143\u5409\u3002
\u9769|\u521D\u4E5D\uFF1A\u978F\u7528\u9EC3\u725B\u4E4B\u9769\u3002|\u516D\u4E8C\uFF1A\u5DF3\u65E5\u4E43\u9769\u4E4B\uFF0C\u5F81\u5409\uFF0C\u65E0\u548E\u3002|\u4E5D\u4E09\uFF1A\u5F81\u51F6\uFF0C\u8C9E\u53B2\uFF0C\u9769\u8A00\u4E09\u5C31\uFF0C\u6709\u5B5A\u3002|\u4E5D\u56DB\uFF1A\u6094\u4EA1\uFF0C\u6709\u5B5A\u6539\u547D\uFF0C\u5409\u3002|\u4E5D\u4E94\uFF1A\u5927\u4EBA\u864E\u8B8A\uFF0C\u672A\u5360\u6709\u5B5A\u3002|\u4E0A\u516D\uFF1A\u541B\u5B50\u8C79\u8B8A\uFF0C\u5C0F\u4EBA\u9769\u9762\uFF0C\u5F81\u51F6\uFF0C\u5C45\u8C9E\u5409\u3002
\u9F0E|\u521D\u516D\uFF1A\u9F0E\u985B\u8DBE\uFF0C\u5229\u51FA\u5426\uFF0C\u5F97\u59BE\u4EE5\u5176\u5B50\uFF0C\u65E0\u548E\u3002|\u4E5D\u4E8C\uFF1A\u9F0E\u6709\u5BE6\uFF0C\u6211\u4EC7\u6709\u75BE\uFF0C\u4E0D\u6211\u80FD\u5373\uFF0C\u5409\u3002|\u4E5D\u4E09\uFF1A\u9F0E\u8033\u9769\uFF0C\u5176\u884C\u585E\uFF0C\u96C9\u818F\u4E0D\u98DF\uFF0C\u65B9\u96E8\u8667\u6094\uFF0C\u7D42\u5409\u3002|\u4E5D\u56DB\uFF1A\u9F0E\u6298\u8DB3\uFF0C\u8986\u516C\u9917\uFF0C\u5176\u5F62\u6E25\uFF0C\u51F6\u3002|\u516D\u4E94\uFF1A\u9F0E\u9EC3\u8033\uFF0C\u91D1\u9249\uFF0C\u5229\u8C9E\u3002|\u4E0A\u4E5D\uFF1A\u9F0E\u7389\u9249\uFF0C\u5927\u5409\uFF0C\u65E0\u4E0D\u5229\u3002
\u9707|\u521D\u4E5D\uFF1A\u9707\u4F86\u8669\u8669\uFF0C\u5F8C\u7B11\u8A00\u555E\u555E\uFF0C\u5409\u3002|\u516D\u4E8C\uFF1A\u9707\u4F86\u53B2\uFF0C\u5104\u55AA\u8C9D\uFF0C\u8E8B\u4E8E\u4E5D\u9675\uFF0C\u52FF\u9010\uFF0C\u4E03\u65E5\u5F97\u3002|\u516D\u4E09\uFF1A\u9707\u8607\u8607\uFF0C\u9707\u884C\u65E0\u771A\u3002|\u4E5D\u56DB\uFF1A\u9707\u9042\u6CE5\u3002|\u516D\u4E94\uFF1A\u9707\u5F80\u4F86\u53B2\uFF0C\u5104\u65E0\u55AA\uFF0C\u6709\u4E8B\u3002|\u4E0A\u516D\uFF1A\u9707\u7D22\u7D22\uFF0C\u8996\u77CD\u77CD\uFF0C\u5F81\u51F6\u3002\u9707\u4E0D\u4E8E\u5176\u8EAC\uFF0C\u4E8E\u5176\u9130\uFF0C\u65E0\u548E\u3002\u5A5A\u5ABE\u6709\u8A00\u3002
\u826E|\u521D\u516D\uFF1A\u826E\u5176\u8DBE\uFF0C\u65E0\u548E\uFF0C\u5229\u6C38\u8C9E\u3002|\u516D\u4E8C\uFF1A\u826E\u5176\u8153\uFF0C\u4E0D\u62EF\u5176\u96A8\uFF0C\u5176\u5FC3\u4E0D\u5FEB\u3002|\u4E5D\u4E09\uFF1A\u826E\u5176\u9650\uFF0C\u5217\u5176\u5924\uFF0C\u53B2\u85B0\u5FC3\u3002|\u516D\u56DB\uFF1A\u826E\u5176\u8EAB\uFF0C\u65E0\u548E\u3002|\u516D\u4E94\uFF1A\u826E\u5176\u8F14\uFF0C\u8A00\u6709\u5E8F\uFF0C\u6094\u4EA1\u3002|\u4E0A\u4E5D\uFF1A\u6566\u826E\uFF0C\u5409\u3002
\u6F38|\u521D\u516D\uFF1A\u9D3B\u6F38\u4E8E\u5E72\uFF0C\u5C0F\u5B50\u53B2\uFF0C\u6709\u8A00\uFF0C\u65E0\u548E\u3002|\u516D\u4E8C\uFF1A\u9D3B\u6F38\u4E8E\u78D0\uFF0C\u98F2\u98DF\u884E\u884E\uFF0C\u5409\u3002|\u4E5D\u4E09\uFF1A\u9D3B\u6F38\u4E8E\u9678\uFF0C\u592B\u5F81\u4E0D\u5FA9\uFF0C\u5A66\u5B55\u4E0D\u80B2\uFF0C\u51F6\uFF1B\u5229\u79A6\u5BC7\u3002|\u516D\u56DB\uFF1A\u9D3B\u6F38\u4E8E\u6728\uFF0C\u6216\u5F97\u5176\u6877\uFF0C\u65E0\u548E\u3002|\u4E5D\u4E94\uFF1A\u9D3B\u6F38\u4E8E\u9675\uFF0C\u5A66\u4E09\u6B72\u4E0D\u5B55\uFF0C\u7D42\u83AB\u4E4B\u52DD\uFF0C\u5409\u3002|\u4E0A\u4E5D\uFF1A\u9D3B\u6F38\u4E8E\u9678\uFF0C\u5176\u7FBD\u53EF\u7528\u70BA\u5100\uFF0C\u5409\u3002
\u6B78\u59B9|\u521D\u4E5D\uFF1A\u6B78\u59B9\u4EE5\u5A23\uFF0C\u8DDB\u80FD\u5C65\uFF0C\u5F81\u5409\u3002|\u4E5D\u4E8C\uFF1A\u7707\u80FD\u8996\uFF0C\u5229\u5E7D\u4EBA\u4E4B\u8C9E\u3002|\u516D\u4E09\uFF1A\u6B78\u59B9\u4EE5\u9808\uFF0C\u53CD\u6B78\u4EE5\u5A23\u3002|\u4E5D\u56DB\uFF1A\u6B78\u59B9\u6106\u671F\uFF0C\u9072\u6B78\u6709\u6642\u3002|\u516D\u4E94\uFF1A\u5E1D\u4E59\u6B78\u59B9\uFF0C\u5176\u541B\u4E4B\u8882\uFF0C\u4E0D\u5982\u5176\u5A23\u4E4B\u8882\u826F\uFF0C\u6708\u5E7E\u671B\uFF0C\u5409\u3002|\u4E0A\u516D\uFF1A\u5973\u627F\u7B50\u65E0\u5BE6\uFF0C\u58EB\u5232\u7F8A\u65E0\u8840\uFF0C\u65E0\u6538\u5229\u3002
\u8C50|\u521D\u4E5D\uFF1A\u9047\u5176\u914D\u4E3B\uFF0C\u96D6\u65EC\u65E0\u548E\uFF0C\u5F80\u6709\u5C1A\u3002|\u516D\u4E8C\uFF1A\u8C50\u5176\u8500\uFF0C\u65E5\u4E2D\u898B\u6597\uFF0C\u5F80\u5F97\u7591\u75BE\uFF0C\u6709\u5B5A\u767C\u82E5\uFF0C\u5409\u3002|\u4E5D\u4E09\uFF1A\u8C50\u5176\u6C9B\uFF0C\u65E5\u4E2D\u898B\u6CAC\uFF0C\u6298\u5176\u53F3\u80B1\uFF0C\u65E0\u548E\u3002|\u4E5D\u56DB\uFF1A\u8C50\u5176\u8500\uFF0C\u65E5\u4E2D\u898B\u6597\uFF0C\u9047\u5176\u5937\u4E3B\uFF0C\u5409\u3002|\u516D\u4E94\uFF1A\u4F86\u7AE0\uFF0C\u6709\u6176\u8B7D\uFF0C\u5409\u3002|\u4E0A\u516D\uFF1A\u8C50\u5176\u5C4B\uFF0C\u8500\u5176\u5BB6\uFF0C\u95DA\u5176\u6236\uFF0C\u95C3\u5176\u65E0\u4EBA\uFF0C\u4E09\u6B72\u4E0D\u89BF\uFF0C\u51F6\u3002
\u65C5|\u521D\u516D\uFF1A\u65C5\u7463\u7463\uFF0C\u65AF\u5176\u6240\u53D6\u707D\u3002|\u516D\u4E8C\uFF1A\u65C5\u5373\u6B21\uFF0C\u61F7\u5176\u8CC7\uFF0C\u5F97\u7AE5\u50D5\u8C9E\u3002|\u4E5D\u4E09\uFF1A\u65C5\u711A\u5176\u6B21\uFF0C\u55AA\u5176\u7AE5\u50D5\uFF0C\u8C9E\u53B2\u3002|\u4E5D\u56DB\uFF1A\u65C5\u4E8E\u8655\uFF0C\u5F97\u5176\u8CC7\u65A7\uFF0C\u6211\u5FC3\u4E0D\u5FEB\u3002|\u516D\u4E94\uFF1A\u5C04\u96C9\u4E00\u77E2\u4EA1\uFF0C\u7D42\u4EE5\u8B7D\u547D\u3002|\u4E0A\u4E5D\uFF1A\u9CE5\u711A\u5176\u5DE2\uFF0C\u65C5\u4EBA\u5148\u7B11\u5F8C\u865F\u54B7\u3002\u55AA\u725B\u4E8E\u6613\uFF0C\u51F6\u3002
\u5DFD|\u521D\u516D\uFF1A\u9032\u9000\uFF0C\u5229\u6B66\u4EBA\u4E4B\u8C9E\u3002|\u4E5D\u4E8C\uFF1A\u5DFD\u5728\u5E8A\u4E0B\uFF0C\u7528\u53F2\u5DEB\u7D1B\u82E5\uFF0C\u5409\uFF0C\u65E0\u548E\u3002|\u4E5D\u4E09\uFF1A\u983B\u5DFD\uFF0C\u541D\u3002|\u516D\u56DB\uFF1A\u6094\u4EA1\uFF0C\u7530\u7372\u4E09\u54C1\u3002|\u4E5D\u4E94\uFF1A\u8C9E\u5409\u6094\u4EA1\uFF0C\u65E0\u4E0D\u5229\u3002\u65E0\u521D\u6709\u7D42\uFF0C\u5148\u5E9A\u4E09\u65E5\uFF0C\u5F8C\u5E9A\u4E09\u65E5\uFF0C\u5409\u3002|\u4E0A\u4E5D\uFF1A\u5DFD\u5728\u5E8A\u4E0B\uFF0C\u55AA\u5176\u8CC7\u65A7\uFF0C\u8C9E\u51F6\u3002
\u514C|\u521D\u4E5D\uFF1A\u548C\u514C\uFF0C\u5409\u3002|\u4E5D\u4E8C\uFF1A\u5B5A\u514C\uFF0C\u5409\uFF0C\u6094\u4EA1\u3002|\u516D\u4E09\uFF1A\u4F86\u514C\uFF0C\u51F6\u3002|\u4E5D\u56DB\uFF1A\u5546\u514C\uFF0C\u672A\u5BE7\uFF0C\u4ECB\u75BE\u6709\u559C\u3002|\u4E5D\u4E94\uFF1A\u5B5A\u4E8E\u525D\uFF0C\u6709\u53B2\u3002|\u4E0A\u516D\uFF1A\u5F15\u514C\u3002
\u6E19|\u521D\u516D\uFF1A\u7528\u62EF\u99AC\u58EF\uFF0C\u5409\u3002|\u4E5D\u4E8C\uFF1A\u6E19\u5954\u5176\u673A\uFF0C\u6094\u4EA1\u3002|\u516D\u4E09\uFF1A\u6E19\u5176\u8EAC\uFF0C\u65E0\u6094\u3002|\u516D\u56DB\uFF1A\u6E19\u5176\u7FA4\uFF0C\u5143\u5409\u3002\u6E19\u6709\u4E18\uFF0C\u532A\u5937\u6240\u601D\u3002|\u4E5D\u4E94\uFF1A\u6E19\u6C57\u5176\u5927\u865F\uFF0C\u6E19\u738B\u5C45\uFF0C\u65E0\u548E\u3002|\u4E0A\u4E5D\uFF1A\u6E19\u5176\u8840\uFF0C\u53BB\u9016\u51FA\uFF0C\u65E0\u548E\u3002
\u7BC0|\u521D\u4E5D\uFF1A\u4E0D\u51FA\u6236\u5EAD\uFF0C\u65E0\u548E\u3002|\u4E5D\u4E8C\uFF1A\u4E0D\u51FA\u9580\u5EAD\uFF0C\u51F6\u3002|\u516D\u4E09\uFF1A\u4E0D\u7BC0\u82E5\uFF0C\u5247\u55DF\u82E5\uFF0C\u65E0\u548E\u3002|\u516D\u56DB\uFF1A\u5B89\u7BC0\uFF0C\u4EA8\u3002|\u4E5D\u4E94\uFF1A\u7518\u7BC0\uFF0C\u5409\uFF1B\u5F80\u6709\u5C1A\u3002|\u4E0A\u516D\uFF1A\u82E6\u7BC0\uFF0C\u8C9E\u51F6\uFF0C\u6094\u4EA1\u3002
\u4E2D\u5B5A|\u521D\u4E5D\uFF1A\u865E\u5409\uFF0C\u6709\u5B83\u4E0D\u71D5\u3002|\u4E5D\u4E8C\uFF1A\u9CF4\u9DB4\u5728\u9670\uFF0C\u5176\u5B50\u548C\u4E4B\uFF0C\u6211\u6709\u597D\u7235\uFF0C\u543E\u8207\u723E\u9761\u4E4B\u3002|\u516D\u4E09\uFF1A\u5F97\u6575\uFF0C\u6216\u9F13\u6216\u7F77\uFF0C\u6216\u6CE3\u6216\u6B4C\u3002|\u516D\u56DB\uFF1A\u6708\u5E7E\u671B\uFF0C\u99AC\u5339\u4EA1\uFF0C\u65E0\u548E\u3002|\u4E5D\u4E94\uFF1A\u6709\u5B5A\u6523\u5982\uFF0C\u65E0\u548E\u3002|\u4E0A\u4E5D\uFF1A\u7FF0\u97F3\u767B\u4E8E\u5929\uFF0C\u8C9E\u51F6\u3002
\u5C0F\u904E|\u521D\u516D\uFF1A\u98DB\u9CE5\u4EE5\u51F6\u3002|\u516D\u4E8C\uFF1A\u904E\u5176\u7956\uFF0C\u9047\u5176\u59A3\uFF1B\u4E0D\u53CA\u5176\u541B\uFF0C\u9047\u5176\u81E3\uFF1B\u65E0\u548E\u3002|\u4E5D\u4E09\uFF1A\u5F17\u904E\u9632\u4E4B\uFF0C\u5F9E\u6216\u6215\u4E4B\uFF0C\u51F6\u3002|\u4E5D\u56DB\uFF1A\u65E0\u548E\uFF0C\u5F17\u904E\u9047\u4E4B\u3002\u5F80\u53B2\u5FC5\u6212\uFF0C\u52FF\u7528\u6C38\u8C9E\u3002|\u516D\u4E94\uFF1A\u5BC6\u96F2\u4E0D\u96E8\uFF0C\u81EA\u6211\u897F\u90CA\uFF0C\u516C\u5F0B\u53D6\u5F7C\u5728\u7A74\u3002|\u4E0A\u516D\uFF1A\u5F17\u9047\u904E\u4E4B\uFF0C\u98DB\u9CE5\u96E2\u4E4B\uFF0C\u51F6\uFF0C\u662F\u8B02\u707D\u771A\u3002
\u65E2\u6FDF|\u521D\u4E5D\uFF1A\u66F3\u5176\u8F2A\uFF0C\u6FE1\u5176\u5C3E\uFF0C\u65E0\u548E\u3002|\u516D\u4E8C\uFF1A\u5A66\u55AA\u5176\u8300\uFF0C\u52FF\u9010\uFF0C\u4E03\u65E5\u5F97\u3002|\u4E5D\u4E09\uFF1A\u9AD8\u5B97\u4F10\u9B3C\u65B9\uFF0C\u4E09\u5E74\u514B\u4E4B\uFF0C\u5C0F\u4EBA\u52FF\u7528\u3002|\u516D\u56DB\uFF1A\u7E7B\u6709\u8863\u88BD\uFF0C\u7D42\u65E5\u6212\u3002|\u4E5D\u4E94\uFF1A\u6771\u9130\u6BBA\u725B\uFF0C\u4E0D\u5982\u897F\u9130\u4E4B\u79B4\u796D\uFF0C\u5BE6\u53D7\u5176\u798F\u3002|\u4E0A\u516D\uFF1A\u6FE1\u5176\u9996\uFF0C\u53B2\u3002
\u672A\u6FDF|\u521D\u516D\uFF1A\u6FE1\u5176\u5C3E\uFF0C\u541D\u3002|\u4E5D\u4E8C\uFF1A\u66F3\u5176\u8F2A\uFF0C\u8C9E\u5409\u3002|\u516D\u4E09\uFF1A\u672A\u6FDF\uFF0C\u5F81\u51F6\uFF0C\u5229\u6D89\u5927\u5DDD\u3002|\u4E5D\u56DB\uFF1A\u8C9E\u5409\uFF0C\u6094\u4EA1\uFF0C\u9707\u7528\u4F10\u9B3C\u65B9\uFF0C\u4E09\u5E74\u6709\u8CDE\u4E8E\u5927\u570B\u3002|\u516D\u4E94\uFF1A\u8C9E\u5409\uFF0C\u65E0\u6094\uFF0C\u541B\u5B50\u4E4B\u5149\uFF0C\u6709\u5B5A\uFF0C\u5409\u3002|\u4E0A\u4E5D\uFF1A\u6709\u5B5A\u4E8E\u98F2\u9152\uFF0C\u65E0\u548E\uFF0C\u6FE1\u5176\u9996\uFF0C\u6709\u5B5A\u5931\u662F\u3002
`;
  var RAW_EXPLANATIONS = `
\u4E7E|\u624D\u534E\u5C1A\u672A\u5230\u65BD\u5C55\u65F6\u673A\uFF0C\u5148\u79EF\u84C4\u529B\u91CF\u3001\u89C2\u5BDF\u73AF\u5883\u3002|\u80FD\u529B\u5F00\u59CB\u663E\u9732\uFF0C\u9002\u5408\u4EB2\u8FD1\u6709\u5FB7\u6709\u80FD\u7684\u4EBA\u5E76\u627F\u62C5\u5C0F\u6B65\u884C\u52A8\u3002|\u5373\u4F7F\u8FDB\u5C55\u826F\u597D\u4E5F\u8981\u6301\u7EED\u52E4\u52C9\u3001\u4FDD\u6301\u8B66\u9192\uFF0C\u624D\u80FD\u5C11\u72AF\u9519\u8BEF\u3002|\u6B63\u5904\u8FDB\u9000\u4E4B\u95F4\uFF0C\u5BA1\u614E\u8BD5\u63A2\u3001\u4FDD\u7559\u4F59\u5730\u5373\u53EF\u65E0\u548E\u3002|\u80FD\u529B\u4E0E\u4F4D\u7F6E\u76F8\u79F0\uFF0C\u9002\u5408\u62C5\u5F53\u8D23\u4EFB\u5E76\u5BFB\u6C42\u8D24\u8005\u534F\u4F5C\u3002|\u53D1\u5C55\u5230\u6781\u76DB\u5BB9\u6613\u8F6C\u8870\uFF0C\u8D8A\u5728\u9AD8\u5904\u8D8A\u8981\u61C2\u5F97\u6536\u655B\u3002
\u5764|\u7EC6\u5C0F\u5F81\u5146\u4F1A\u9010\u6E10\u7D2F\u79EF\uFF0C\u5E94\u5728\u95EE\u9898\u53D8\u4E25\u91CD\u524D\u5904\u7406\u3002|\u6B63\u76F4\u3001\u65B9\u6B63\u800C\u5305\u5BB9\uFF0C\u987A\u5E94\u89C4\u5F8B\u4FBF\u80FD\u81EA\u7136\u505A\u597D\u3002|\u624D\u534E\u5B9C\u542B\u84C4\u5730\u7528\u4E8E\u6210\u4E8B\uFF0C\u4E0D\u5FC5\u4E89\u593A\u529F\u540D\uFF0C\u4ECD\u4F1A\u6709\u597D\u7ED3\u679C\u3002|\u5F62\u52BF\u4E0D\u660E\u65F6\u8C28\u8A00\u614E\u884C\uFF0C\u4E0D\u6C42\u8D5E\u8A89\u4E5F\u53EF\u907F\u514D\u8FC7\u5931\u3002|\u4EE5\u5185\u5728\u5FB7\u6027\u627F\u8F7D\u5916\u5728\u4F4D\u7F6E\uFF0C\u8C26\u548C\u5B88\u4E2D\u6700\u4E3A\u5409\u7965\u3002|\u53CC\u65B9\u5F3A\u786C\u5BF9\u6297\u4F1A\u4E24\u8D25\u4FF1\u4F24\uFF0C\u5B9C\u505C\u6B62\u4E89\u80DC\u3001\u5BFB\u627E\u8F6C\u571C\u3002
\u5C6F|\u5F00\u7AEF\u8270\u96BE\uFF0C\u5148\u7A33\u4F4F\u6839\u57FA\u3001\u5EFA\u7ACB\u53EF\u9760\u7EC4\u7EC7\uFF0C\u4E0D\u5B9C\u8E81\u8FDB\u3002|\u963B\u529B\u4F7F\u8FDB\u7A0B\u53CD\u590D\uFF0C\u771F\u6B63\u7684\u5408\u4F5C\u9700\u8981\u65F6\u95F4\u68C0\u9A8C\uFF0C\u4E0D\u5FC5\u6025\u4E8E\u5B9A\u8BBA\u3002|\u6CA1\u6709\u5411\u5BFC\u4FBF\u8D38\u7136\u9010\u9E7F\u5BB9\u6613\u8FF7\u5931\uFF1B\u770B\u4E0D\u6E05\u8DEF\u5F84\u65F6\uFF0C\u820D\u5F03\u4E5F\u662F\u667A\u6167\u3002|\u627E\u5230\u53EF\u4FE1\u4F19\u4F34\u540E\u53EF\u7EE7\u7EED\u524D\u884C\uFF0C\u5408\u4F5C\u80FD\u6253\u5F00\u56F0\u5C40\u3002|\u8D44\u6E90\u6709\u9650\u65F6\u5B9C\u505A\u5C0F\u800C\u7A33\u7684\u4E8B\uFF0C\u8FC7\u5EA6\u6269\u5F20\u53CD\u4F1A\u5E26\u6765\u5371\u9669\u3002|\u957F\u671F\u8FDB\u9000\u4E0D\u5F97\u4F1A\u6D88\u8017\u5FC3\u529B\uFF0C\u5E94\u505C\u6B62\u65E7\u8DEF\u7EBF\u3001\u91CD\u65B0\u5BFB\u627E\u51FA\u53E3\u3002
\u8499|\u542F\u8499\u9700\u8981\u89C4\u5219\u4E0E\u8FB9\u754C\uFF0C\u4F46\u7EA0\u6B63\u4E4B\u540E\u4E5F\u8981\u89E3\u9664\u675F\u7F1A\u3002|\u5305\u5BB9\u521D\u5B66\u8005\u3001\u627F\u62C5\u6559\u5BFC\u8D23\u4EFB\uFF0C\u80FD\u8BA9\u5173\u7CFB\u548C\u4E8B\u52A1\u6210\u957F\u3002|\u82E5\u53EA\u88AB\u8868\u9762\u5229\u76CA\u5438\u5F15\u800C\u5931\u53BB\u81EA\u4E3B\uFF0C\u8FD9\u6BB5\u5173\u7CFB\u4E0D\u5B9C\u8FDB\u5165\u3002|\u56F0\u5728\u65E0\u77E5\u91CC\u53C8\u62D2\u7EDD\u6C42\u52A9\uFF0C\u4F1A\u7559\u4E0B\u9057\u61BE\uFF1B\u5E94\u4E3B\u52A8\u5B66\u4E60\u3002|\u4FDD\u6709\u521D\u5B66\u8005\u7684\u8C26\u900A\u548C\u597D\u5947\uFF0C\u6700\u5BB9\u6613\u83B7\u5F97\u6210\u957F\u3002|\u7EA0\u6B63\u8499\u6627\u5E94\u4EE5\u9632\u6B62\u4F24\u5BB3\u4E3A\u76EE\u7684\uFF0C\u4E0D\u80FD\u628A\u6559\u80B2\u53D8\u6210\u653B\u51FB\u3002
\u9700|\u5371\u9669\u5C1A\u8FDC\uFF0C\u4FDD\u6301\u65E5\u5E38\u8282\u5F8B\u4E0E\u8010\u5FC3\u7B49\u5F85\u5373\u53EF\u3002|\u5DF2\u9760\u8FD1\u98CE\u9669\uFF0C\u867D\u6709\u8BAE\u8BBA\uFF0C\u7A33\u4F4F\u6700\u7EC8\u4ECD\u53EF\u8F6C\u597D\u3002|\u9677\u5165\u6CE5\u6CDE\u65F6\u518D\u63A8\u8FDB\u4F1A\u62DB\u6765\u66F4\u591A\u9EBB\u70E6\uFF0C\u5E94\u5C3D\u5FEB\u6B62\u6B65\u3002|\u5DF2\u5904\u5371\u9669\u4E4B\u4E2D\uFF0C\u8981\u9762\u5BF9\u635F\u4F24\u5E76\u627E\u5230\u79BB\u5F00\u7684\u901A\u9053\u3002|\u7B49\u5F85\u4E0D\u7B49\u4E8E\u7126\u8651\uFF1B\u7167\u987E\u597D\u8EAB\u5FC3\u3001\u5B88\u6B63\u84C4\u52BF\u66F4\u5408\u9002\u3002|\u610F\u5916\u6765\u5BA2\u6216\u53D8\u5316\u51FA\u73B0\u65F6\uFF0C\u4EE5\u5C0A\u91CD\u5E94\u5BF9\u80FD\u8BA9\u5C40\u9762\u8F6C\u597D\u3002
\u8A1F|\u4E89\u8BAE\u4E0D\u5B9C\u62D6\u957F\uFF0C\u5C3D\u65E9\u6536\u675F\uFF0C\u5373\u4F7F\u6709\u5C0F\u6469\u64E6\u4E5F\u80FD\u5584\u540E\u3002|\u4E89\u4E0D\u8FC7\u65F6\u53CA\u65F6\u9000\u8BA9\u3001\u56DE\u5230\u5B89\u5168\u8303\u56F4\uFF0C\u53EF\u907F\u514D\u66F4\u5927\u635F\u5931\u3002|\u4F9D\u9760\u65E2\u6709\u539F\u5219\u548C\u79EF\u7D2F\uFF0C\u8C28\u614E\u505A\u4E8B\u3001\u4E0D\u4E89\u529F\uFF0C\u7ED3\u5C40\u53EF\u5B89\u3002|\u653E\u4E0B\u4E89\u80DC\uFF0C\u63A5\u53D7\u73B0\u5B9E\u5E76\u6539\u53D8\u505A\u6CD5\uFF0C\u5B89\u5B88\u6B63\u9053\u66F4\u597D\u3002|\u4E8B\u5B9E\u4E0E\u7ACB\u573A\u6E05\u695A\u65F6\uFF0C\u53EF\u4F9D\u516C\u6B63\u7A0B\u5E8F\u89E3\u51B3\u4E89\u8BAE\u3002|\u9760\u4E89\u8BBC\u5F97\u6765\u7684\u8363\u8A89\u5E76\u4E0D\u7A33\u56FA\uFF0C\u53EF\u80FD\u5F88\u5FEB\u88AB\u593A\u56DE\u3002
\u5E2B|\u96C6\u4F53\u884C\u52A8\u9996\u5148\u9700\u8981\u7EAA\u5F8B\uFF1B\u79E9\u5E8F\u5931\u5F53\u4F1A\u5E26\u6765\u5931\u8D25\u3002|\u5C45\u4E2D\u7EDF\u7B79\u3001\u4E0E\u56E2\u961F\u540C\u5FC3\uFF0C\u80FD\u5F97\u5230\u4FE1\u4EFB\u548C\u6388\u6743\u3002|\u6307\u6325\u5931\u5F53\u4F1A\u4EE4\u56E2\u961F\u4ED8\u51FA\u6C89\u91CD\u4EE3\u4EF7\uFF0C\u5207\u52FF\u8BA9\u4E0D\u79F0\u804C\u8005\u9886\u961F\u3002|\u6761\u4EF6\u4E0D\u5229\u65F6\u6709\u5E8F\u64A4\u9000\u5E76\u975E\u5931\u8D25\uFF0C\u53EF\u4FDD\u5B58\u5B9E\u529B\u3002|\u76EE\u6807\u8981\u6B63\u5F53\uFF0C\u9886\u961F\u987B\u6210\u719F\uFF1B\u7528\u9519\u4EBA\u4F1A\u4F7F\u884C\u52A8\u7531\u5229\u8F6C\u51F6\u3002|\u6210\u679C\u5E94\u4EA4\u7ED9\u6709\u5FB7\u6709\u80FD\u8005\u6CBB\u7406\uFF0C\u4E0D\u80FD\u4EFB\u7528\u53EA\u56FE\u79C1\u5229\u7684\u4EBA\u3002
\u6BD4|\u4EE5\u771F\u8BDA\u4EB2\u8FD1\u4ED6\u4EBA\uFF0C\u4FE1\u4EFB\u79EF\u7D2F\u5145\u8DB3\u540E\u4F1A\u5438\u5F15\u66F4\u591A\u5584\u7F18\u3002|\u4EB2\u8FD1\u5E94\u53D1\u81EA\u5185\u5FC3\uFF0C\u5B88\u4F4F\u539F\u5219\u7684\u5173\u7CFB\u624D\u7A33\u5B9A\u3002|\u4E0E\u54C1\u884C\u4E0D\u6B63\u8005\u7ED3\u76DF\uFF0C\u4F1A\u8BA9\u81EA\u5DF1\u9677\u5165\u9519\u8BEF\u65B9\u5411\u3002|\u5411\u5916\u5BFB\u627E\u53EF\u9760\u4F19\u4F34\u5E76\u4FDD\u6301\u6B63\u76F4\uFF0C\u6709\u5229\u4E8E\u5EFA\u7ACB\u8FDE\u63A5\u3002|\u5F00\u653E\u800C\u4E0D\u8FC7\u5EA6\u63A7\u5236\uFF0C\u8BA9\u4EBA\u81EA\u7531\u6765\u53BB\uFF0C\u53CD\u800C\u80FD\u5F62\u6210\u771F\u8BDA\u5F52\u9644\u3002|\u7FA4\u4F53\u6CA1\u6709\u5171\u540C\u6838\u5FC3\u4E0E\u65B9\u5411\uFF0C\u5173\u7CFB\u6700\u7EC8\u5BB9\u6613\u74E6\u89E3\u3002
\u5C0F\u755C|\u56DE\u5230\u81EA\u5DF1\u7684\u6B63\u9053\u7EE7\u7EED\u524D\u8FDB\uFF0C\u4E0D\u4F1A\u6709\u8FC7\u5931\u3002|\u4E0E\u540C\u4F34\u5F7C\u6B64\u7275\u5F15\u56DE\u5F52\u6B63\u9053\uFF0C\u80FD\u591F\u8F6C\u597D\u3002|\u5916\u90E8\u6761\u4EF6\u5931\u7075\u53C8\u5931\u53BB\u6C9F\u901A\uFF0C\u4EB2\u8FD1\u5173\u7CFB\u5BB9\u6613\u53CD\u76EE\u3002|\u4EE5\u8BDA\u4FE1\u9762\u5BF9\u98CE\u9669\u548C\u4E0D\u5B89\uFF0C\u7D27\u5F20\u4F1A\u9010\u6E10\u89E3\u9664\u3002|\u771F\u8BDA\u4FE1\u4EFB\u628A\u90BB\u91CC\u4F19\u4F34\u8FDE\u63A5\u8D77\u6765\uFF0C\u6210\u679C\u53EF\u5F7C\u6B64\u5171\u4EAB\u3002|\u79EF\u84C4\u5DF2\u7ECF\u5230\u9876\uFF0C\u5B9C\u77E5\u8DB3\u505C\u6B65\uFF1B\u7EE7\u7EED\u8FDC\u5F81\u53CD\u4F1A\u751F\u9669\u3002
\u5C65|\u4EE5\u6734\u7D20\u672C\u5206\u7684\u65B9\u5F0F\u8D70\u8DEF\uFF0C\u8E0F\u5B9E\u524D\u884C\u4E0D\u4F1A\u6709\u8FC7\u5931\u3002|\u9053\u8DEF\u5E73\u5766\u4ECD\u5B89\u9759\u5B88\u6B63\uFF0C\u4E0D\u56E0\u987A\u5883\u5931\u53BB\u672C\u5FC3\u3002|\u80FD\u529B\u4E0D\u8DB3\u5374\u901E\u5F3A\u5192\u9669\uFF0C\u50CF\u8E29\u864E\u5C3E\u822C\u5371\u9669\uFF0C\u4E0D\u53EF\u51ED\u6B66\u529B\u5984\u4E3A\u3002|\u8EAB\u5904\u5371\u9669\u4ECD\u5FC3\u5B58\u656C\u754F\u3001\u6B65\u6B65\u8C28\u614E\uFF0C\u6700\u540E\u53EF\u5B89\u3002|\u8FC7\u4E8E\u521A\u51B3\u5730\u63A8\u884C\u4E3B\u5F20\uFF0C\u5373\u4F7F\u7ACB\u573A\u6B63\u786E\u4E5F\u6709\u98CE\u9669\u3002|\u56DE\u770B\u8D70\u8FC7\u7684\u8DEF\u3001\u68C0\u9A8C\u5F97\u5931\u5E76\u5584\u59CB\u5584\u7EC8\uFF0C\u6700\u4E3A\u6709\u5229\u3002
\u6CF0|\u5FD7\u540C\u9053\u5408\u8005\u5F7C\u6B64\u5E26\u52A8\uFF0C\u9002\u5408\u5171\u540C\u5411\u524D\u3002|\u5305\u5BB9\u5DEE\u5F02\u3001\u6562\u62C5\u8D23\u4EFB\u3001\u4E0D\u9057\u6F0F\u8FDC\u65B9\u7684\u4EBA\uFF0C\u624D\u80FD\u5B88\u4F4F\u4E2D\u9053\u3002|\u987A\u9006\u603B\u4F1A\u5FAA\u73AF\uFF1B\u8270\u96BE\u65F6\u5B88\u6B63\u3001\u76F8\u4FE1\u957F\u671F\u79EF\u7D2F\uFF0C\u53EF\u4FDD\u65E0\u548E\u3002|\u5F7C\u6B64\u5766\u8BDA\u5408\u4F5C\uFF0C\u4E0D\u4EE5\u8D22\u5BCC\u5730\u4F4D\u4E3A\u6761\u4EF6\uFF0C\u4FE1\u4EFB\u81EA\u7136\u5F62\u6210\u3002|\u4EE5\u5408\u5B9C\u7684\u8054\u7ED3\u4FC3\u8FDB\u548C\u8C10\uFF0C\u4F1A\u5E26\u6765\u957F\u4E45\u798F\u7949\u3002|\u901A\u6CF0\u5230\u6781\u70B9\u4F1A\u8F6C\u4E3A\u95ED\u585E\uFF0C\u5B9C\u6536\u7F29\u6218\u7EBF\u3001\u4ECE\u5185\u90E8\u4FEE\u6574\u3002
\u5426|\u95ED\u585E\u521D\u8D77\u65F6\u4E0E\u540C\u9053\u5B88\u6B63\u76F8\u8FDE\uFF0C\u4ECD\u53EF\u4FDD\u6301\u901A\u8FBE\u3002|\u5BF9\u4E0D\u5F53\u73AF\u5883\u53EF\u4EE5\u8868\u9762\u627F\u53D7\uFF0C\u4F46\u6709\u539F\u5219\u8005\u4E0D\u80FD\u968F\u6CE2\u9010\u6D41\u3002|\u628A\u7F9E\u803B\u548C\u95EE\u9898\u63A9\u85CF\u8D77\u6765\uFF0C\u53EA\u4F1A\u8BA9\u95ED\u585E\u6301\u7EED\u3002|\u5F97\u5230\u6B63\u5F53\u4F7F\u547D\u540E\u4E0E\u4F19\u4F34\u534F\u4F5C\uFF0C\u53EF\u514D\u8FC7\u5931\u5E76\u5171\u4EAB\u6210\u679C\u3002|\u626D\u8F6C\u95ED\u585E\u5DF2\u6709\u5E0C\u671B\uFF0C\u4F46\u8981\u65F6\u523B\u8B66\u60D5\u6839\u57FA\u677E\u52A8\u3002|\u95ED\u585E\u7EC8\u4E8E\u88AB\u63A8\u7FFB\uFF0C\u5148\u524D\u8270\u96BE\u4E4B\u540E\u4F1A\u89C1\u559C\u60A6\u3002
\u540C\u4EBA|\u5728\u516C\u5F00\u5E73\u7B49\u7684\u7A7A\u95F4\u4E0E\u4EBA\u5408\u4F5C\uFF0C\u4E0D\u8BBE\u95E8\u6237\u53EF\u514D\u8FC7\u5931\u3002|\u53EA\u5728\u5C0F\u5708\u5B50\u91CC\u62B1\u56E2\uFF0C\u4F1A\u9650\u5236\u771F\u6B63\u7684\u5171\u540C\u76EE\u6807\u3002|\u6697\u4E2D\u6212\u5907\u53C8\u5360\u636E\u9AD8\u4F4D\uFF0C\u957F\u671F\u65E0\u6CD5\u5EFA\u7ACB\u5408\u4F5C\u3002|\u5373\u4F7F\u5360\u6709\u4F18\u52BF\u4E5F\u4E0D\u653B\u51FB\uFF0C\u514B\u5236\u51B2\u7A81\u53CD\u800C\u6709\u5229\u3002|\u7ECF\u5386\u5206\u6B67\u548C\u8270\u96BE\u540E\uFF0C\u771F\u6B63\u540C\u5FC3\u8005\u7EC8\u80FD\u76F8\u9047\u3002|\u5728\u8F83\u8FDC\u7684\u8FB9\u754C\u4FDD\u6301\u5408\u4F5C\uFF0C\u867D\u4E0D\u4EB2\u5BC6\u4E5F\u6CA1\u6709\u9057\u61BE\u3002
\u5927\u6709|\u5BCC\u6709\u4E4B\u521D\u5148\u8FDC\u79BB\u6709\u5BB3\u4EA4\u5F80\uFF0C\u8270\u82E6\u81EA\u6301\u53EF\u514D\u8FC7\u5931\u3002|\u80FD\u529B\u8DB3\u4EE5\u627F\u8F7D\u8D44\u6E90\u65F6\uFF0C\u53EF\u5E26\u7740\u6210\u679C\u5411\u66F4\u5927\u76EE\u6807\u524D\u8FDB\u3002|\u8D44\u6E90\u5E94\u670D\u52A1\u516C\u5171\u8D23\u4EFB\uFF1B\u5FC3\u672F\u4E0D\u6B63\u8005\u96BE\u4EE5\u627F\u53D7\u3002|\u4E0D\u70AB\u8000\u3001\u4E0D\u5938\u5927\u81EA\u5DF1\u7684\u5BCC\u6709\u548C\u529F\u52B3\uFF0C\u624D\u80FD\u65E0\u548E\u3002|\u8BDA\u4FE1\u4E0E\u5A01\u4E25\u5E76\u7528\uFF0C\u65E2\u4EB2\u548C\u53C8\u6709\u8FB9\u754C\uFF0C\u5173\u7CFB\u66F4\u7A33\u3002|\u987A\u5E94\u6B63\u9053\u53C8\u4E0D\u72EC\u5360\u6210\u679C\uFF0C\u5BB9\u6613\u5F97\u5230\u5E7F\u6CDB\u652F\u6301\u3002
\u8B19|\u8C26\u900A\u518D\u8C26\u900A\uFF0C\u80FD\u8BA9\u4EBA\u627F\u62C5\u5927\u4E8B\u3001\u6E21\u8FC7\u96BE\u5173\u3002|\u8C26\u5FB7\u88AB\u4EBA\u770B\u89C1\u4ECD\u5B88\u6B63\uFF0C\u4E0D\u628A\u79F0\u8D5E\u5F53\u8D44\u672C\u3002|\u6709\u529F\u52B3\u5374\u4E0D\u81EA\u6EE1\uFF0C\u6301\u7EED\u505A\u5230\u6700\u540E\u624D\u80FD\u5584\u7EC8\u3002|\u5728\u4EFB\u4F55\u5904\u5883\u90FD\u4E3B\u52A8\u8BA9\u529F\u3001\u4FDD\u6301\u8C26\u900A\uFF0C\u884C\u52A8\u8F83\u5C11\u963B\u529B\u3002|\u8D44\u6E90\u4E0D\u8DB3\u4E5F\u53EF\u501F\u52A9\u4F19\u4F34\uFF0C\u4F46\u91C7\u53D6\u5F3A\u786C\u884C\u52A8\u5FC5\u987B\u51FA\u4E8E\u6B63\u5F53\u76EE\u7684\u3002|\u5FC5\u8981\u65F6\u4EE5\u884C\u52A8\u6574\u987F\u5185\u90E8\uFF0C\u4F46\u4E0D\u80FD\u501F\u8C26\u900A\u4E4B\u540D\u9003\u907F\u8D23\u4EFB\u3002
\u8C6B|\u4E00\u5F00\u59CB\u5C31\u6C89\u6EBA\u5174\u594B\u5E76\u56DB\u5904\u5F20\u626C\uFF0C\u5BB9\u6613\u5931\u53BB\u8282\u5236\u3002|\u5F81\u5146\u4E00\u51FA\u73B0\u4FBF\u8FC5\u901F\u5224\u65AD\uFF0C\u4E0D\u628A\u95EE\u9898\u62D6\u5230\u6B21\u65E5\uFF0C\u662F\u6E05\u9192\u4E4B\u9053\u3002|\u4EF0\u671B\u4ED6\u4EBA\u3001\u8D2A\u56FE\u4EAB\u4E50\u4F1A\u540E\u6094\uFF1B\u8FDF\u8FDF\u4E0D\u6539\u8FD8\u4F1A\u518D\u6094\u3002|\u6210\u4E3A\u5FEB\u4E50\u4E0E\u52A8\u529B\u7684\u6765\u6E90\u65F6\uFF0C\u8981\u4FE1\u4EFB\u540C\u4F34\u3001\u6C47\u805A\u4F17\u529B\u3002|\u957F\u671F\u5E26\u7740\u4E0D\u9002\u4ECD\u80FD\u7EF4\u6301\uFF0C\u63D0\u9192\u5728\u5B89\u4E50\u4E2D\u4FDD\u6301\u6E05\u9192\u3002|\u6C89\u8FF7\u5DF2\u7ECF\u5230\u6781\u70B9\uFF0C\u82E5\u80AF\u6539\u53D8\u65E2\u6210\u505A\u6CD5\uFF0C\u4ECD\u53EF\u65E0\u548E\u3002
\u96A8|\u804C\u8D23\u548C\u65B9\u6CD5\u53EF\u4EE5\u8C03\u6574\uFF1B\u8D70\u51FA\u65E7\u5708\u5B50\u771F\u8BDA\u4EA4\u5F80\u4F1A\u6709\u6536\u83B7\u3002|\u53EA\u8FFD\u968F\u773C\u524D\u5C0F\u5229\uFF0C\u53EF\u80FD\u5931\u53BB\u66F4\u91CD\u8981\u3001\u66F4\u6210\u719F\u7684\u4F19\u4F34\u3002|\u9009\u62E9\u4E3B\u8981\u65B9\u5411\u5C31\u8981\u820D\u5F03\u6B21\u8981\u7275\u7ECA\uFF0C\u5B88\u6B63\u53EF\u6709\u6240\u83B7\u3002|\u8FFD\u968F\u5E26\u6765\u6536\u83B7\u4E5F\u53EF\u80FD\u6ECB\u751F\u79C1\u5FC3\uFF1B\u52A8\u673A\u5149\u660E\u624D\u80FD\u514D\u548E\u3002|\u771F\u8BDA\u8FFD\u968F\u7F8E\u5584\u7684\u76EE\u6807\uFF0C\u5173\u7CFB\u4E0E\u884C\u52A8\u90FD\u4F1A\u987A\u5229\u3002|\u8054\u7ED3\u5DF2\u5F88\u7262\u56FA\uFF0C\u9002\u5408\u628A\u5171\u540C\u4EF7\u503C\u63D0\u5347\u4E3A\u90D1\u91CD\u627F\u8BFA\u3002
\u8831|\u4FEE\u590D\u524D\u4EBA\u9057\u7559\u7684\u95EE\u9898\u867D\u6709\u98CE\u9669\uFF0C\u8BA4\u771F\u627F\u62C5\u7EC8\u4F1A\u8F6C\u597D\u3002|\u5904\u7406\u4EB2\u8FD1\u8005\u7559\u4E0B\u7684\u95EE\u9898\u8981\u67D4\u548C\uFF0C\u4E0D\u53EF\u50F5\u786C\u5F3A\u6C42\u3002|\u79EF\u6781\u7EA0\u504F\u53EF\u80FD\u6709\u5C0F\u9057\u61BE\uFF0C\u4F46\u4E0D\u4F1A\u9020\u6210\u5927\u9519\u3002|\u5BBD\u7EB5\u65E7\u95EE\u9898\u3001\u8FDF\u8FDF\u4E0D\u4FEE\u590D\uFF0C\u7EE7\u7EED\u4E0B\u53BB\u4F1A\u53D7\u56F0\u3002|\u80FD\u59A5\u5584\u4FEE\u590D\u65E7\u5F0A\uFF0C\u4F1A\u8D62\u5F97\u8BA4\u53EF\u548C\u58F0\u8A89\u3002|\u4E0D\u518D\u8FFD\u9010\u6743\u4F4D\uFF0C\u9009\u62E9\u66F4\u9AD8\u5C1A\u3001\u72EC\u7ACB\u7684\u4E8B\u4E1A\u3002
\u81E8|\u4EE5\u76F8\u4E92\u611F\u5E94\u7684\u65B9\u5F0F\u63A5\u8FD1\u4E8B\u52A1\uFF0C\u5B88\u6B63\u5219\u5409\u3002|\u771F\u8BDA\u5E7F\u6CDB\u5730\u53C2\u4E0E\u548C\u7167\u6599\uFF0C\u884C\u52A8\u4F1A\u8F83\u4E3A\u987A\u5229\u3002|\u53EA\u7528\u751C\u8A00\u60A6\u8272\u63A5\u8FD1\u4ED6\u4EBA\u6CA1\u6709\u76CA\u5904\uFF1B\u5BDF\u89C9\u5E76\u62C5\u5FE7\u540E\u6539\u6B63\u53EF\u514D\u548E\u3002|\u4EB2\u81EA\u6DF1\u5165\u73B0\u573A\u3001\u771F\u6B63\u9760\u8FD1\u95EE\u9898\uFF0C\u4E0D\u4F1A\u6709\u8FC7\u5931\u3002|\u4EE5\u667A\u6167\u800C\u975E\u6743\u52BF\u7BA1\u7406\uFF0C\u662F\u8D1F\u8D23\u8005\u5408\u5B9C\u7684\u65B9\u5F0F\u3002|\u4EE5\u6566\u539A\u5BBD\u5BB9\u5BF9\u5F85\u6765\u8005\uFF0C\u65E2\u5409\u7965\u53C8\u5C11\u8FC7\u5931\u3002
\u89C0|\u53EA\u770B\u5230\u8868\u9762\uFF0C\u666E\u901A\u4EBA\u5C1A\u53EF\uFF0C\u6709\u8D23\u4EFB\u8005\u5219\u4F1A\u663E\u5F97\u6D45\u8584\u3002|\u4ECE\u72ED\u7A84\u7F1D\u9699\u89C2\u5BDF\u53EA\u80FD\u5F97\u5230\u5C40\u90E8\uFF0C\u5B9C\u5B89\u9759\u5B88\u6B63\u5E76\u6269\u5C55\u89C6\u91CE\u3002|\u5148\u89C2\u5BDF\u81EA\u5DF1\u7684\u884C\u4E3A\u548C\u5904\u5883\uFF0C\u518D\u51B3\u5B9A\u8FDB\u9000\u3002|\u770B\u89C1\u6574\u4F53\u7EC4\u7EC7\u7684\u5149\u660E\u9762\uFF0C\u9002\u5408\u53C2\u4E0E\u66F4\u9AD8\u5C42\u6B21\u7684\u5408\u4F5C\u3002|\u8EAB\u5C45\u8981\u4F4D\u66F4\u5E94\u89C2\u5BDF\u81EA\u8EAB\u5F71\u54CD\uFF0C\u4EE5\u541B\u5B50\u6807\u51C6\u81EA\u7701\u3002|\u8D85\u8D8A\u4E2A\u4EBA\u5F97\u5931\uFF0C\u89C2\u5BDF\u4E00\u751F\u548C\u7FA4\u4F53\u5F71\u54CD\uFF0C\u624D\u80FD\u65E0\u548E\u3002
\u566C\u55D1|\u9519\u8BEF\u521A\u53D1\u751F\u5C31\u7528\u5C0F\u60E9\u6212\u963B\u6B62\u6269\u5927\uFF0C\u53EF\u4EE5\u514D\u9664\u540E\u60A3\u3002|\u5904\u7406\u660E\u663E\u95EE\u9898\u53EF\u4EE5\u679C\u65AD\uFF0C\u4F46\u8FC7\u5EA6\u6295\u5165\u4E5F\u4F1A\u4F24\u53CA\u81EA\u8EAB\u611F\u53D7\u3002|\u9762\u5BF9\u79EF\u4E45\u96BE\u9898\u53EF\u80FD\u78B0\u5230\u9690\u60A3\uFF0C\u5C0F\u6709\u4E0D\u987A\u4F46\u53EF\u5904\u7406\u3002|\u5543\u4E0B\u786C\u9AA8\u5934\u9700\u8981\u53EF\u9760\u8BC1\u636E\u4E0E\u575A\u97E7\u539F\u5219\uFF0C\u8270\u96BE\u4E2D\u53EF\u6210\u3002|\u5904\u7406\u68D8\u624B\u95EE\u9898\u5DF2\u6709\u5173\u952E\u4F9D\u636E\uFF0C\u4ECD\u8981\u8B66\u60D5\u6743\u529B\u5E26\u6765\u7684\u98CE\u9669\u3002|\u5C61\u6B21\u4E0D\u542C\u8B66\u544A\uFF0C\u60E9\u7F5A\u5DF2\u91CD\u5230\u4F24\u53CA\u542C\u89C9\uFF0C\u7ED3\u5C40\u5371\u9669\u3002
\u8CC1|\u5148\u4FEE\u9970\u81EA\u5DF1\u7684\u811A\u6B65\u4E0E\u884C\u52A8\uFF0C\u5B81\u53EF\u6B65\u884C\u4E5F\u4E0D\u4F9D\u8D56\u6392\u573A\u3002|\u5916\u5728\u4FEE\u9970\u5E94\u4F9D\u9644\u4E8E\u5B9E\u8D28\uFF0C\u4E0D\u80FD\u628A\u88C5\u70B9\u5F53\u6210\u4E3B\u4F53\u3002|\u6DA6\u6CFD\u7F8E\u597D\u53EF\u4EE5\u957F\u4E45\uFF0C\u4F46\u8981\u4EE5\u6301\u7EED\u5B88\u6B63\u4E3A\u6839\u672C\u3002|\u6734\u7D20\u4E0E\u534E\u7F8E\u770B\u4F3C\u51B2\u7A81\uFF0C\u771F\u8BDA\u6765\u610F\u7EC8\u4F1A\u6F84\u6E05\u3002|\u793C\u7269\u867D\u5C11\u800C\u5FC3\u610F\u771F\u5B9E\uFF0C\u8D77\u521D\u5C34\u5C2C\uFF0C\u6700\u7EC8\u4ECD\u5409\u3002|\u56DE\u5F52\u7EAF\u767D\u6734\u7D20\uFF0C\u4E0D\u518D\u8FC7\u5EA6\u88C5\u9970\uFF0C\u4FBF\u80FD\u65E0\u548E\u3002
\u525D|\u8150\u8680\u4ECE\u6839\u57FA\u5F00\u59CB\uFF0C\u82E5\u8FD8\u8F7B\u89C6\u539F\u5219\uFF0C\u5371\u9669\u4F1A\u6269\u5927\u3002|\u635F\u574F\u5DF2\u6DF1\u5165\u7ED3\u6784\uFF0C\u5E94\u505C\u6B62\u7C89\u9970\u5E76\u4FDD\u62A4\u5173\u952E\u627F\u6258\u3002|\u5728\u5265\u843D\u4E2D\u80FD\u4E0E\u9519\u8BEF\u529B\u91CF\u5206\u5F00\uFF0C\u53EF\u514D\u4E8E\u540C\u53D7\u4F24\u5BB3\u3002|\u95EE\u9898\u5DF2\u7ECF\u8D34\u8FD1\u81EA\u8EAB\uFF0C\u5FC5\u987B\u7ACB\u5373\u6B62\u635F\u3002|\u628A\u5206\u6563\u529B\u91CF\u6709\u5E8F\u7EC4\u7EC7\u8D77\u6765\u5E76\u5F97\u5230\u7167\u987E\uFF0C\u6574\u4F53\u53EF\u987A\u3002|\u6700\u540E\u7684\u6838\u5FC3\u6210\u679C\u4ECD\u5728\uFF1B\u6709\u5FB7\u8005\u83B7\u5F97\u652F\u6301\uFF0C\u65E0\u5FB7\u8005\u5931\u53BB\u7ACB\u8DB3\u5904\u3002
\u5FA9|\u504F\u79BB\u4E0D\u8FDC\u5C31\u53CA\u65F6\u8FD4\u56DE\uFF0C\u4E0D\u81F3\u540E\u6094\uFF0C\u662F\u6700\u597D\u7684\u4FEE\u6B63\u3002|\u613F\u610F\u4EB2\u8FD1\u5584\u610F\u3001\u5E73\u9759\u56DE\u5F52\u6B63\u786E\u65B9\u5411\uFF0C\u7ED3\u679C\u826F\u597D\u3002|\u53CD\u590D\u72AF\u9519\u53C8\u53CD\u590D\u6539\u6B63\u867D\u6709\u98CE\u9669\uFF0C\u80AF\u56DE\u5934\u4ECD\u53EF\u65E0\u548E\u3002|\u8EAB\u5904\u4F17\u4EBA\u4E4B\u95F4\u4ECD\u72EC\u81EA\u56DE\u5F52\u6B63\u9053\uFF0C\u9700\u8981\u5185\u5728\u5224\u65AD\u3002|\u4EE5\u6566\u539A\u8BDA\u610F\u56DE\u5F52\u672C\u5FC3\uFF0C\u4E0D\u4F1A\u7559\u4E0B\u540E\u6094\u3002|\u8FF7\u5931\u540E\u62D2\u7EDD\u56DE\u5934\u4F1A\u5BFC\u81F4\u957F\u671F\u5931\u8D25\uFF0C\u6B64\u65F6\u4E0D\u5B9C\u53D1\u52A8\u5927\u884C\u52A8\u3002
\u65E0\u5984|\u4E0D\u5B58\u865A\u5984\u3001\u6309\u771F\u5B9E\u60C5\u51B5\u884C\u52A8\uFF0C\u524D\u884C\u8F83\u4E3A\u987A\u5229\u3002|\u4E0D\u9884\u8BBE\u6536\u83B7\u3001\u4E0D\u6295\u673A\u53D6\u5DE7\uFF0C\u6309\u672C\u5206\u505A\u4E8B\u53CD\u800C\u6709\u53BB\u5904\u3002|\u65E0\u7AEF\u707E\u7978\u53EF\u80FD\u7531\u4ED6\u4EBA\u884C\u4E3A\u8F6C\u5AC1\u800C\u6765\uFF0C\u8981\u5206\u6E05\u8D23\u4EFB\u8FB9\u754C\u3002|\u4FDD\u6301\u771F\u5B9E\u4E0E\u6B63\u5F53\uFF0C\u4E0D\u5984\u4F5C\u5373\u53EF\u514D\u548E\u3002|\u81EA\u7136\u51FA\u73B0\u7684\u5C0F\u95EE\u9898\u4E0D\u5FC5\u8FC7\u5EA6\u5E72\u9884\uFF0C\u7ED9\u5B83\u6062\u590D\u7684\u7A7A\u95F4\u3002|\u6761\u4EF6\u4E0D\u5141\u8BB8\u5374\u6267\u610F\u884C\u52A8\uFF0C\u5373\u4F7F\u52A8\u673A\u771F\u5B9E\u4E5F\u4F1A\u751F\u7978\u3002
\u5927\u755C|\u524D\u65B9\u5DF2\u6709\u5371\u9669\uFF0C\u4E3B\u52A8\u505C\u6B62\u6BD4\u786C\u95EF\u66F4\u6709\u5229\u3002|\u8F66\u8F86\u8FDE\u63A5\u5904\u8131\u843D\uFF0C\u6682\u65F6\u65E0\u6CD5\u524D\u8FDB\uFF0C\u5E94\u5148\u68C0\u4FEE\u80FD\u529B\u548C\u7CFB\u7EDF\u3002|\u529B\u91CF\u5145\u8DB3\u4ECD\u8981\u8BAD\u7EC3\u9632\u62A4\u3001\u5728\u8270\u96BE\u4E2D\u5B88\u6B63\uFF0C\u7136\u540E\u624D\u53EF\u524D\u5F80\u3002|\u5728\u529B\u91CF\u5C1A\u5C0F\u65F6\u5148\u8BBE\u597D\u7EA6\u675F\uFF0C\u80FD\u4ECE\u6E90\u5934\u9632\u6B62\u51B2\u649E\u3002|\u4E0D\u4E0E\u5F3A\u529B\u6B63\u9762\u5BF9\u6297\uFF0C\u800C\u4ECE\u6839\u6E90\u6539\u53D8\u5176\u51B2\u52A8\uFF0C\u6548\u679C\u66F4\u597D\u3002|\u79EF\u84C4\u6210\u719F\u540E\u5927\u9053\u6253\u5F00\uFF0C\u9002\u5408\u628A\u80FD\u529B\u7528\u4E8E\u66F4\u5E7F\u9614\u7684\u4E8B\u4E1A\u3002
\u9824|\u653E\u5F03\u81EA\u8EAB\u6E05\u660E\u5374\u7FA1\u6155\u4ED6\u4EBA\u4F9B\u517B\uFF0C\u4F1A\u5931\u53BB\u81EA\u4E3B\u800C\u6709\u5371\u9669\u3002|\u98A0\u5012\u6B63\u5E38\u7684\u81EA\u517B\u65B9\u5F0F\u3001\u5411\u8FDC\u5904\u6C42\u53D6\uFF0C\u8D38\u7136\u524D\u5F80\u4E0D\u5229\u3002|\u957F\u671F\u8FDD\u80CC\u6B63\u786E\u517B\u80B2\u4E4B\u9053\uFF0C\u4F1A\u4F7F\u8EAB\u5FC3\u548C\u4E8B\u4E1A\u90FD\u96BE\u4EE5\u4E3A\u7EE7\u3002|\u5411\u4E0B\u6C42\u517B\u82E5\u76EE\u6807\u660E\u786E\u3001\u4E13\u6CE8\u8C28\u614E\uFF0C\u4ECD\u53EF\u65E0\u548E\u3002|\u867D\u4E0D\u5FAA\u5E38\u89C4\uFF0C\u5B89\u5B88\u6B63\u9053\u5C1A\u53EF\uFF0C\u4F46\u4E0D\u53EF\u627F\u62C5\u8FC7\u5927\u98CE\u9669\u3002|\u627F\u62C5\u517B\u80B2\u4F17\u4EBA\u7684\u8D23\u4EFB\u867D\u6709\u98CE\u9669\uFF0C\u5374\u4E5F\u80FD\u6210\u5C31\u5927\u4E8B\u3002
\u5927\u904E|\u627F\u53D7\u8FC7\u91CD\u4E4B\u524D\u5148\u7528\u6700\u8C28\u614E\u7684\u65B9\u5F0F\u94FA\u57AB\uFF0C\u53EF\u514D\u8FC7\u5931\u3002|\u8870\u8D25\u5904\u751F\u51FA\u65B0\u82BD\uFF0C\u4E0D\u5BFB\u5E38\u7684\u7EC4\u5408\u4E5F\u53EF\u80FD\u5E26\u6765\u65B0\u751F\u3002|\u4E3B\u8981\u652F\u67F1\u5F2F\u66F2\uFF0C\u8BF4\u660E\u8D1F\u8377\u8D85\u8FC7\u80FD\u529B\uFF0C\u7EE7\u7EED\u4F1A\u5931\u8D25\u3002|\u652F\u67F1\u5F97\u5230\u52A0\u5F3A\u4FBF\u53EF\u627F\u91CD\uFF0C\u4F46\u989D\u5916\u79C1\u5FC3\u4F1A\u7559\u4E0B\u9057\u61BE\u3002|\u8868\u9762\u5F00\u82B1\u5374\u96BE\u7ED3\u679C\uFF0C\u5173\u7CFB\u867D\u65E0\u8FC7\u9519\u4E5F\u672A\u5FC5\u6709\u5B9E\u9645\u6210\u5C31\u3002|\u4E3A\u5B8C\u6210\u8D23\u4EFB\u6D89\u9669\u8FC7\u6DF1\uFF0C\u5373\u4F7F\u52A8\u673A\u65E0\u548E\uFF0C\u4ECD\u8981\u627F\u8BA4\u73B0\u5B9E\u5371\u9669\u3002
\u574E|\u53CD\u590D\u9677\u5165\u540C\u4E00\u9669\u5883\u4E14\u8D8A\u8D70\u8D8A\u6DF1\uFF0C\u5FC5\u987B\u505C\u4E0B\u65E7\u6A21\u5F0F\u3002|\u8EAB\u5904\u9669\u4E2D\u5148\u6C42\u5C0F\u7684\u53EF\u63A7\u6210\u679C\uFF0C\u4E0D\u53EF\u5E7B\u60F3\u4E00\u6B65\u8131\u56F0\u3002|\u524D\u540E\u90FD\u662F\u9669\u5883\u53C8\u65E0\u5904\u5B89\u7A33\uFF0C\u6B64\u65F6\u4E0D\u5B9C\u884C\u52A8\u3002|\u7528\u6734\u7D20\u771F\u8BDA\u7684\u65B9\u5F0F\u5EFA\u7ACB\u6C9F\u901A\uFF0C\u5373\u4F7F\u8D44\u6E90\u5C11\u4E5F\u80FD\u6E21\u9669\u3002|\u5371\u9669\u5C1A\u672A\u5B8C\u5168\u6D88\u5931\uFF0C\u4F46\u5C40\u52BF\u8D8B\u5E73\uFF0C\u4FDD\u6301\u514B\u5236\u53EF\u65E0\u548E\u3002|\u957F\u671F\u53D7\u56F0\u4E14\u5931\u53BB\u81EA\u7531\uFF0C\u8BF4\u660E\u95EE\u9898\u5DF2\u4E25\u91CD\uFF0C\u9700\u5916\u90E8\u5E2E\u52A9\u3002
\u96E2|\u8D77\u6B65\u7EB7\u6742\u65F6\u4FDD\u6301\u656C\u614E\uFF0C\u628A\u4E8B\u60C5\u7406\u6E05\u4FBF\u53EF\u514D\u548E\u3002|\u4F9D\u9644\u4E8E\u4E2D\u6B63\u3001\u6E29\u548C\u800C\u660E\u4EAE\u7684\u539F\u5219\uFF0C\u6700\u4E3A\u5409\u7965\u3002|\u76DB\u5149\u5C06\u8870\uFF0C\u5E94\u5766\u7136\u9762\u5BF9\u53D8\u5316\uFF0C\u4E0D\u8981\u53EA\u5269\u54C0\u53F9\u3002|\u6765\u52BF\u8FC7\u731B\u3001\u71C3\u70E7\u8FC7\u5FEB\u4F1A\u8FC5\u901F\u8017\u5C3D\u5E76\u88AB\u629B\u5F03\u3002|\u80FD\u771F\u5B9E\u8868\u8FBE\u60B2\u4F24\u548C\u5FE7\u60E7\uFF0C\u53CD\u800C\u6709\u52A9\u4E8E\u7A7F\u8D8A\u96BE\u5173\u3002|\u679C\u65AD\u6E05\u9664\u9996\u8981\u5371\u5BB3\u800C\u4E0D\u682A\u8FDE\u65E0\u5173\u8005\uFF0C\u53EF\u4EE5\u65E0\u548E\u3002
\u54B8|\u611F\u5E94\u521A\u5230\u811A\u8DBE\uFF0C\u53EA\u662F\u5FAE\u5C0F\u89E6\u52A8\uFF0C\u4E0D\u5FC5\u7ACB\u5373\u884C\u52A8\u3002|\u611F\u5E94\u5230\u4E86\u817F\u90E8\u4FBF\u6025\u7740\u52A8\u4F1A\u6709\u98CE\u9669\uFF0C\u5B89\u9759\u5B88\u5019\u66F4\u597D\u3002|\u4E00\u5473\u968F\u5916\u754C\u51B2\u52A8\u800C\u8D70\uFF0C\u4F1A\u5931\u53BB\u81EA\u4E3B\u5E76\u7559\u4E0B\u9057\u61BE\u3002|\u5B88\u6B63\u53EF\u4F7F\u540E\u6094\u6D88\u5931\uFF1B\u5FC3\u601D\u53CD\u590D\u65F6\uFF0C\u670B\u53CB\u4E5F\u4F1A\u968F\u4F60\u7684\u5FF5\u5934\u6447\u6446\u3002|\u611F\u5E94\u6DF1\u5165\u80CC\u90E8\u5374\u4E0D\u663E\u4E8E\u5916\uFF0C\u80FD\u5B88\u4F4F\u81EA\u5DF1\u4FBF\u65E0\u6094\u3002|\u611F\u5E94\u53EA\u505C\u5728\u53E3\u820C\uFF0C\u82E5\u7F3A\u4E4F\u771F\u5B9E\u884C\u52A8\u5C31\u6D41\u4E8E\u7A7A\u8C08\u3002
\u6046|\u4E00\u5F00\u59CB\u5C31\u8FC7\u5EA6\u8FFD\u6C42\u6C38\u4E45\u4E0D\u53D8\uFF0C\u4F1A\u50F5\u5316\u800C\u65E0\u76CA\u3002|\u80FD\u591F\u5B88\u4E2D\u6301\u7EED\uFF0C\u5148\u524D\u7684\u540E\u6094\u4FBF\u4F1A\u6D88\u5931\u3002|\u5FB7\u884C\u548C\u627F\u8BFA\u4E0D\u80FD\u6301\u7EED\uFF0C\u4F1A\u62DB\u81F4\u7F9E\u8FB1\u4E0E\u9057\u61BE\u3002|\u5728\u6CA1\u6709\u730E\u7269\u7684\u5730\u65B9\u4E45\u5B88\uFF0C\u52AA\u529B\u4E5F\u4E0D\u4F1A\u6709\u6536\u83B7\uFF0C\u5E94\u6362\u65B9\u5411\u3002|\u6052\u5E38\u4E5F\u8981\u7B26\u5408\u89D2\u8272\u548C\u60C5\u5883\uFF0C\u4E0D\u80FD\u628A\u4E00\u79CD\u6807\u51C6\u5F3A\u52A0\u6240\u6709\u4EBA\u3002|\u5728\u8E81\u52A8\u4E2D\u9891\u7E41\u6539\u53D8\uFF0C\u65E0\u6CD5\u5F62\u6210\u771F\u6B63\u7684\u6052\u4E45\u3002
\u906F|\u64A4\u9000\u5F97\u592A\u665A\u3001\u843D\u5728\u672B\u5C3E\u5DF2\u4E34\u5371\u9669\uFF0C\u4E0D\u5B9C\u518D\u5192\u8FDB\u3002|\u4EE5\u575A\u97E7\u800C\u5408\u5B9C\u7684\u65B9\u5F0F\u5B88\u4F4F\u9000\u907F\u539F\u5219\uFF0C\u4E0D\u88AB\u5916\u529B\u62C9\u56DE\u3002|\u60F3\u9000\u53C8\u88AB\u7275\u7CFB\u4F1A\u5E26\u6765\u538B\u529B\uFF0C\u5E94\u5148\u5B89\u987F\u5185\u90E8\u5173\u7CFB\u3002|\u80FD\u591F\u4E3B\u52A8\u800C\u4ECE\u5BB9\u5730\u9000\u8BA9\u662F\u541B\u5B50\u9009\u62E9\uFF0C\u4E0D\u6210\u719F\u8005\u4F1A\u820D\u4E0D\u5F97\u3002|\u5728\u6070\u5F53\u65F6\u673A\u4F18\u96C5\u9000\u51FA\uFF0C\u5B88\u6B63\u53EF\u5409\u3002|\u653E\u4E0B\u7275\u6302\u3001\u5BBD\u88D5\u9000\u5F00\uFF0C\u524D\u8DEF\u6CA1\u6709\u660E\u663E\u963B\u788D\u3002
\u5927\u58EF|\u529B\u91CF\u521A\u5230\u811A\u4E0B\u5C31\u6025\u4E8E\u51FA\u53D1\uFF0C\u5BB9\u6613\u56E0\u901E\u5F3A\u5931\u8D25\u3002|\u529B\u91CF\u5145\u8DB3\u4ECD\u5B88\u6B63\u4E2D\u9053\uFF0C\u8F83\u4E3A\u5409\u7965\u3002|\u53EA\u9760\u86EE\u529B\u4F1A\u50CF\u516C\u7F8A\u5361\u4F4F\u89D2\uFF1B\u6210\u719F\u8005\u4E0D\u628A\u5F3A\u58EE\u7528\u5728\u4E89\u80DC\u3002|\u5B88\u6B63\u800C\u6709\u8282\u5236\uFF0C\u969C\u788D\u6253\u5F00\uFF0C\u5F3A\u529B\u53EF\u4EE5\u627F\u8F7D\u5B9E\u9645\u4EFB\u52A1\u3002|\u5728\u4ECE\u5BB9\u5904\u653E\u4E0B\u901E\u5F3A\uFF0C\u6CA1\u6709\u5FC5\u8981\u4E3A\u6682\u65F6\u635F\u5931\u540E\u6094\u3002|\u8FDB\u9000\u4E24\u96BE\u65F6\u4E0D\u8981\u7EE7\u7EED\u786C\u9876\uFF1B\u627F\u8BA4\u56F0\u96BE\u3001\u8010\u5FC3\u5904\u7406\u624D\u4F1A\u8F6C\u597D\u3002
\u6649|\u524D\u8FDB\u65F6\u9047\u632B\u4E0E\u4E0D\u4FE1\u4EFB\uFF0C\u5BBD\u7F13\u5B88\u6B63\u4FBF\u53EF\u514D\u548E\u3002|\u5728\u5FE7\u8651\u4E2D\u524D\u8FDB\u4ECD\u5B88\u6B63\uFF0C\u4F1A\u5F97\u5230\u6765\u81EA\u957F\u8005\u6216\u6839\u6E90\u7684\u652F\u6301\u3002|\u83B7\u5F97\u4F17\u4EBA\u4FE1\u4EFB\u540E\uFF0C\u5148\u524D\u987E\u8651\u53EF\u4EE5\u653E\u4E0B\u3002|\u50CF\u8D2A\u85CF\u7684\u7855\u9F20\u90A3\u6837\u8C0B\u8FDB\uFF0C\u5373\u4F7F\u6210\u529F\u4E5F\u6697\u85CF\u5371\u9669\u3002|\u4E0D\u8981\u60A3\u5F97\u60A3\u5931\uFF0C\u653E\u4E0B\u8BA1\u8F83\u7EE7\u7EED\u524D\u884C\uFF0C\u6574\u4F53\u8F83\u987A\u3002|\u524D\u8FDB\u5230\u53EA\u5269\u5F3A\u786C\uFF0C\u6700\u591A\u7528\u4E8E\u5185\u90E8\u6574\u987F\uFF1B\u5373\u4F7F\u6709\u6210\u4E5F\u4F1A\u7559\u4E0B\u9057\u61BE\u3002
\u660E\u5937|\u5149\u660E\u53D7\u4F24\u65F6\u5E94\u6536\u655B\u950B\u8292\u3001\u5FCD\u53D7\u77ED\u671F\u56F0\u96BE\uFF0C\u7EE7\u7EED\u5BFB\u627E\u53BB\u5904\u3002|\u4F24\u53CA\u884C\u52A8\u80FD\u529B\u65F6\u501F\u52A9\u6709\u529B\u5DE5\u5177\u8FC5\u901F\u8131\u9669\uFF0C\u53EF\u8F6C\u5371\u4E3A\u5B89\u3002|\u6709\u673A\u4F1A\u627E\u5230\u9ED1\u6697\u6E90\u5934\uFF0C\u4F46\u7EA0\u6B63\u4E0D\u80FD\u64CD\u4E4B\u8FC7\u6025\u3002|\u6DF1\u5165\u95EE\u9898\u5185\u90E8\u770B\u6E05\u771F\u5B9E\u52A8\u673A\u540E\uFF0C\u5E94\u79BB\u5F00\u4E0D\u5408\u5B9C\u7684\u73AF\u5883\u3002|\u50CF\u7B95\u5B50\u90A3\u6837\u5728\u6666\u6697\u4E2D\u9690\u85CF\u660E\u667A\u3001\u575A\u5B88\u539F\u5219\u3002|\u4ECE\u9AD8\u5904\u5760\u5165\u9ED1\u6697\uFF0C\u63D0\u9192\u6743\u52BF\u82E5\u5931\u53BB\u660E\u5FB7\u4F1A\u8FC5\u901F\u53CD\u8F6C\u3002
\u5BB6\u4EBA|\u5BB6\u5EAD\u6216\u56E2\u961F\u4E4B\u521D\u5148\u5EFA\u7ACB\u8FB9\u754C\u548C\u89C4\u5219\uFF0C\u65E5\u540E\u5C11\u6709\u540E\u6094\u3002|\u4E0D\u4E89\u9010\u5916\u52A1\uFF0C\u4E13\u5FC3\u628A\u5185\u90E8\u652F\u6301\u505A\u597D\uFF0C\u5B88\u6B63\u6709\u5229\u3002|\u4E25\u683C\u6709\u5EA6\u867D\u4E00\u65F6\u4E0D\u60A6\uFF0C\u8FC7\u5EA6\u5B09\u95F9\u3001\u5931\u53BB\u89C4\u5219\u6700\u7EC8\u4F1A\u9057\u61BE\u3002|\u8BA9\u5BB6\u5EAD\u6216\u56E2\u961F\u8D44\u6E90\u5145\u8DB3\u3001\u5173\u7CFB\u7A33\u56FA\uFF0C\u662F\u5F88\u5927\u7684\u6210\u679C\u3002|\u4EE5\u4FE1\u4EFB\u548C\u8D23\u4EFB\u51DD\u805A\u5171\u540C\u4F53\uFF0C\u4E0D\u5FC5\u5FE7\u8651\uFF0C\u884C\u52A8\u53EF\u987A\u3002|\u771F\u8BDA\u53C8\u6709\u5A01\u4FE1\uFF0C\u65E2\u5173\u6000\u4E5F\u5B88\u8FB9\u754C\uFF0C\u624D\u80FD\u5584\u59CB\u5584\u7EC8\u3002
\u777D|\u5931\u53BB\u7684\u4E0D\u5FC5\u8FFD\uFF0C\u5B83\u53EF\u80FD\u81EA\u884C\u56DE\u6765\uFF1B\u4E0E\u4E0D\u559C\u6B22\u7684\u4EBA\u4FDD\u6301\u57FA\u672C\u5408\u4F5C\u53EF\u514D\u548E\u3002|\u5728\u975E\u6B63\u5F0F\u573A\u5408\u9047\u5230\u5173\u952E\u4F19\u4F34\uFF0C\u771F\u8BDA\u76F8\u8BA4\u5373\u53EF\u3002|\u5F00\u7AEF\u5904\u5904\u53D7\u963B\u751A\u81F3\u53D7\u8FB1\uFF0C\u4F46\u575A\u6301\u6C9F\u901A\u4ECD\u53EF\u80FD\u6709\u597D\u7ED3\u679C\u3002|\u5B64\u7ACB\u5206\u6B67\u4E2D\u9047\u5230\u53EF\u4FE1\u4E4B\u4EBA\uFF0C\u5F7C\u6B64\u4EE5\u8BDA\u4FE1\u8FDE\u63A5\uFF0C\u53EF\u6E21\u8FC7\u5371\u9669\u3002|\u4EB2\u8FD1\u8005\u4E3B\u52A8\u6253\u7834\u9694\u819C\uFF0C\u524D\u5F80\u56DE\u5E94\u4E0D\u4F1A\u6709\u8FC7\u5931\u3002|\u7591\u60E7\u4F1A\u628A\u666E\u901A\u4E8B\u7269\u770B\u6210\u5A01\u80C1\uFF1B\u653E\u4E0B\u6212\u5907\u3001\u770B\u6E05\u6765\u610F\uFF0C\u5206\u6B67\u53EF\u5316\u89E3\u3002
\u8E47|\u5411\u524D\u66F4\u56F0\u96BE\uFF0C\u56DE\u5230\u539F\u5904\u91CD\u65B0\u51C6\u5907\u53CD\u800C\u5F97\u5230\u8BA4\u53EF\u3002|\u4E3A\u516C\u5171\u8D23\u4EFB\u627F\u53D7\u91CD\u91CD\u56F0\u96BE\uFF0C\u4E0D\u662F\u4E3A\u4E86\u4E2A\u4EBA\u5F97\u5931\u3002|\u524D\u8FDB\u53D7\u963B\u65F6\u53CA\u65F6\u8FD4\u56DE\uFF0C\u4E0D\u518D\u65E0\u6548\u6D88\u8017\u3002|\u9000\u56DE\u6765\u4E0E\u4F19\u4F34\u8FDE\u7ED3\uFF0C\u5171\u540C\u9762\u5BF9\u963B\u788D\u3002|\u5927\u96BE\u5F53\u524D\uFF0C\u771F\u6B63\u7684\u670B\u53CB\u4F1A\u524D\u6765\u76F8\u52A9\u3002|\u505C\u6B62\u786C\u95EF\u540E\u83B7\u5F97\u5145\u5B9E\u6210\u679C\uFF0C\u5E76\u9002\u5408\u6C42\u52A9\u6709\u80FD\u529B\u7684\u4EBA\u3002
\u89E3|\u7D27\u5F20\u5DF2\u7ECF\u89E3\u9664\uFF0C\u4FDD\u6301\u7B80\u6D01\u3001\u4E0D\u518D\u5236\u9020\u65B0\u95EE\u9898\u5373\u53EF\u3002|\u51C6\u786E\u8BC6\u522B\u5E76\u6E05\u9664\u591A\u91CD\u9690\u60A3\uFF0C\u51ED\u6B63\u76F4\u539F\u5219\u53EF\u5409\u3002|\u80FD\u529B\u4E0D\u8DB3\u5374\u5360\u636E\u9AD8\u4F4D\u3001\u70AB\u8000\u8D44\u6E90\uFF0C\u4F1A\u62DB\u6765\u98CE\u9669\u3002|\u89E3\u9664\u811A\u4E0B\u7275\u7ECA\u540E\uFF0C\u53EF\u9760\u4F19\u4F34\u624D\u4F1A\u771F\u6B63\u9760\u8FD1\u3002|\u6709\u539F\u5219\u8005\u5148\u89E3\u5F00\u81EA\u8EAB\u675F\u7F1A\uFF0C\u4E5F\u8BA9\u4E0D\u6B63\u5F53\u529B\u91CF\u770B\u89C1\u754C\u9650\u3002|\u7784\u51C6\u9AD8\u5904\u7684\u6838\u5FC3\u95EE\u9898\u679C\u65AD\u89E3\u51B3\uFF0C\u884C\u52A8\u4F1A\u51CF\u5C11\u963B\u788D\u3002
\u640D|\u81EA\u5DF1\u7684\u4E8B\u505A\u5B8C\u4FBF\u8FC5\u901F\u63F4\u52A9\u4ED6\u4EBA\uFF0C\u4F46\u8981\u8861\u91CF\u4ED8\u51FA\u5C3A\u5EA6\u3002|\u5B88\u6B63\u6709\u5229\uFF0C\u76F2\u76EE\u524D\u5F80\u6709\u5BB3\uFF1B\u771F\u6B63\u7684\u5E2E\u52A9\u4E0D\u662F\u635F\u5DF1\uFF0C\u800C\u662F\u589E\u76CA\u5BF9\u65B9\u3002|\u5173\u7CFB\u8FC7\u591A\u4F1A\u5206\u6563\uFF0C\u9002\u5F53\u51CF\u5C11\u540E\u53CD\u800C\u627E\u5230\u771F\u6B63\u540C\u4F34\u3002|\u5C3D\u5FEB\u51CF\u5C11\u81EA\u5DF1\u7684\u95EE\u9898\u548C\u574F\u4E60\u60EF\uFF0C\u4F1A\u5E26\u6765\u559C\u60A6\u4E14\u65E0\u548E\u3002|\u610F\u5916\u5F97\u5230\u5DE8\u5927\u5E2E\u52A9\uFF0C\u662F\u957F\u671F\u5B88\u6B63\u5E26\u6765\u7684\u597D\u7ED3\u679C\u3002|\u4E0D\u9760\u635F\u4EBA\u800C\u589E\u76CA\u5171\u540C\u4F53\uFF0C\u80FD\u83B7\u5F97\u4F19\u4F34\u4E14\u4E0D\u628A\u4EBA\u636E\u4E3A\u79C1\u6709\u3002
\u76CA|\u8D44\u6E90\u589E\u52A0\u65F6\u9002\u5408\u627F\u62C5\u6709\u516C\u5171\u4EF7\u503C\u7684\u5927\u4E8B\uFF0C\u7ED3\u679C\u826F\u597D\u3002|\u771F\u8BDA\u63A5\u53D7\u96BE\u4EE5\u62D2\u7EDD\u7684\u5E2E\u52A9\uFF0C\u5E76\u4EE5\u957F\u671F\u5B88\u6B63\u56DE\u5E94\u3002|\u628A\u589E\u76CA\u7528\u4E8E\u5E94\u5BF9\u707E\u96BE\uFF0C\u79C9\u6301\u4E2D\u9053\u5E76\u516C\u5F00\u8BF4\u660E\uFF0C\u53EF\u514D\u548E\u3002|\u4EE5\u4E2D\u6B63\u65B9\u5F0F\u53D6\u5F97\u4FE1\u4EFB\uFF0C\u53EF\u63A8\u52A8\u91CD\u8981\u7684\u7EC4\u7EC7\u8FC1\u79FB\u6216\u8C03\u6574\u3002|\u771F\u5FC3\u60E0\u53CA\u4ED6\u4EBA\u65E0\u9700\u8FFD\u95EE\u56DE\u62A5\uFF0C\u5584\u610F\u4F1A\u5F62\u6210\u76F8\u4E92\u5F71\u54CD\u3002|\u53EA\u6C42\u522B\u4EBA\u589E\u76CA\u81EA\u5DF1\u3001\u5185\u5FC3\u53C8\u53CD\u590D\u65E0\u5E38\uFF0C\u5BB9\u6613\u906D\u5230\u53CD\u51FB\u3002
\u592C|\u521A\u4E00\u51B3\u5B9A\u5C31\u6025\u7740\u5411\u524D\uFF0C\u529B\u91CF\u4E0D\u8DB3\u4F1A\u56E0\u5931\u8D25\u800C\u6709\u8FC7\u5931\u3002|\u63D0\u524D\u53D1\u51FA\u8B66\u89C9\u3001\u4E3A\u591C\u95F4\u98CE\u9669\u505A\u51C6\u5907\uFF0C\u5C31\u4E0D\u5FC5\u6050\u614C\u3002|\u628A\u51B3\u65AD\u5199\u5728\u8138\u4E0A\u4F1A\u62DB\u9669\uFF1B\u72EC\u81EA\u5B88\u6B63\u867D\u53D7\u8BEF\u89E3\uFF0C\u6700\u7EC8\u53EF\u65E0\u548E\u3002|\u5904\u5883\u4E0D\u9002\u53C8\u6B65\u5C65\u8270\u96BE\uFF0C\u5E94\u653E\u4E0B\u56FA\u6267\u3001\u542C\u53D6\u5F15\u5BFC\u3002|\u6E05\u9664\u95EE\u9898\u8981\u6301\u7EED\u800C\u5B88\u4E2D\uFF0C\u907F\u514D\u628A\u679C\u65AD\u53D8\u6210\u6781\u7AEF\u3002|\u5230\u4E86\u6700\u540E\u4ECD\u65E0\u6CD5\u53D1\u51FA\u8B66\u544A\uFF0C\u5371\u9669\u5C06\u96BE\u4EE5\u633D\u56DE\u3002
\u59E4|\u5076\u7136\u76F8\u9047\u7684\u529B\u91CF\u867D\u5C0F\u4E5F\u4F1A\u589E\u957F\uFF0C\u5E94\u4E00\u5F00\u59CB\u5C31\u8BBE\u7262\u8FB9\u754C\u3002|\u628A\u5076\u9047\u7684\u8D44\u6E90\u7559\u5728\u5408\u9002\u8303\u56F4\uFF0C\u4E0D\u5B9C\u8D38\u7136\u5411\u5916\u6269\u6563\u3002|\u8FDB\u9000\u56F0\u96BE\u800C\u6709\u98CE\u9669\uFF0C\u4F46\u8C28\u614E\u81EA\u6301\u4E0D\u4F1A\u9020\u6210\u5927\u9519\u3002|\u8BE5\u638C\u63E1\u7684\u8D44\u6E90\u5DF2\u7ECF\u5931\u53BB\uFF0C\u7F3A\u4E4F\u51C6\u5907\u4F1A\u5F15\u53D1\u95EE\u9898\u3002|\u4EE5\u5185\u5728\u624D\u534E\u5305\u5BB9\u5C1A\u672A\u6210\u719F\u7684\u673A\u4F1A\uFF0C\u7B49\u5F85\u81EA\u7136\u65F6\u673A\u843D\u4E0B\u3002|\u76F8\u9047\u53D1\u5C55\u5230\u5F7C\u6B64\u9876\u649E\uFF0C\u867D\u6709\u9057\u61BE\uFF0C\u5B88\u4F4F\u8FB9\u754C\u5C1A\u53EF\u65E0\u548E\u3002
\u8403|\u4FE1\u4EFB\u4E0D\u80FD\u575A\u6301\u4F1A\u4F7F\u4EBA\u7FA4\u6DF7\u4E71\uFF1B\u771F\u8BDA\u547C\u5524\u3001\u63E1\u624B\u8A00\u548C\u540E\u53EF\u7EE7\u7EED\u3002|\u6709\u4EBA\u5F15\u5BFC\u800C\u76F8\u805A\u8F83\u597D\uFF1B\u793C\u7269\u53EF\u8584\uFF0C\u8BDA\u4FE1\u5FC5\u987B\u771F\u5B9E\u3002|\u60F3\u805A\u5408\u5374\u5B64\u7ACB\u53F9\u606F\uFF0C\u524D\u5F80\u8FDE\u63A5\u867D\u6709\u5C0F\u5C34\u5C2C\u4ECD\u53EF\u65E0\u548E\u3002|\u80FD\u628A\u4F17\u4EBA\u7EC4\u7EC7\u8D77\u6765\u5E76\u670D\u52A1\u5171\u540C\u76EE\u6807\uFF0C\u662F\u5F88\u597D\u7684\u5C40\u9762\u3002|\u6709\u4F4D\u7F6E\u8FD8\u9700\u8D62\u5F97\u4FE1\u4EFB\uFF1B\u957F\u671F\u5B88\u6B63\uFF0C\u6000\u7591\u4E0E\u540E\u6094\u4F1A\u6D88\u5931\u3002|\u805A\u5408\u5230\u6700\u540E\u4ECD\u60B2\u4F24\u53F9\u606F\uFF0C\u5766\u8BDA\u8868\u8FBE\u60C5\u7EEA\u5E76\u65E0\u8FC7\u5931\u3002
\u5347|\u83B7\u5F97\u4FE1\u4EFB\u4E0E\u8BB8\u53EF\u540E\u7A33\u6B65\u4E0A\u5347\uFF0C\u662F\u597D\u7684\u5F00\u7AEF\u3002|\u8BDA\u4FE1\u6BD4\u4EEA\u5F0F\u89C4\u6A21\u66F4\u91CD\u8981\uFF0C\u6734\u7D20\u8868\u8FBE\u4E5F\u53EF\u65E0\u548E\u3002|\u524D\u65B9\u50CF\u7A7A\u57CE\u822C\u5C11\u6709\u963B\u788D\uFF0C\u53EF\u4EE5\u628A\u63E1\u673A\u4F1A\u524D\u8FDB\u3002|\u4EE5\u90D1\u91CD\u6001\u5EA6\u8FDE\u63A5\u5171\u540C\u4EF7\u503C\uFF0C\u884C\u52A8\u987A\u5229\u4E14\u5C11\u8FC7\u5931\u3002|\u6CBF\u9636\u68AF\u4E00\u6B65\u6B65\u4E0A\u5347\uFF0C\u5B88\u6B63\u6BD4\u8DF3\u7EA7\u66F4\u53EF\u9760\u3002|\u5728\u660F\u6697\u4E2D\u4ECD\u53EA\u987E\u4E0A\u5347\u4F1A\u8FF7\u5931\uFF0C\u5E94\u628A\u575A\u6301\u7528\u5728\u6B63\u9053\u800C\u975E\u804C\u4F4D\u3002
\u56F0|\u56F0\u5728\u67AF\u6728\u4E0E\u5E7D\u8C37\u4E2D\u770B\u4E0D\u5230\u51FA\u53E3\uFF0C\u5148\u627F\u8BA4\u4F4E\u8C37\u5E76\u4FDD\u5B58\u529B\u91CF\u3002|\u7269\u8D28\u4E30\u8DB3\u4E5F\u53EF\u80FD\u7CBE\u795E\u53D7\u56F0\uFF1B\u7B49\u5F85\u652F\u6301\uFF0C\u6682\u4E0D\u8FDC\u5F81\u3002|\u4F9D\u9760\u4E0D\u7A33\u4E4B\u7269\u53C8\u56DE\u4E0D\u5230\u4EB2\u8FD1\u5173\u7CFB\uFF0C\u9519\u8BEF\u9009\u62E9\u4F1A\u52A0\u6DF1\u56F0\u5883\u3002|\u63F4\u52A9\u867D\u6765\u5F97\u6162\u4E14\u53D7\u8D44\u6E90\u7275\u5236\uFF0C\u575A\u6301\u4ECD\u80FD\u8D70\u5230\u7ED3\u679C\u3002|\u8EAB\u5FC3\u4E0E\u5730\u4F4D\u90FD\u53D7\u56F0\u65F6\uFF0C\u9010\u6B65\u677E\u89E3\uFF0C\u4EE5\u771F\u8BDA\u4FE1\u5FF5\u7EF4\u6301\u5E0C\u671B\u3002|\u88AB\u85E4\u8513\u7F20\u4F4F\u800C\u8FDB\u9000\u4E0D\u5B89\uFF0C\u89C9\u5BDF\u540E\u6094\u5E76\u51B3\u5B9A\u884C\u52A8\uFF0C\u4FBF\u53EF\u8F6C\u597D\u3002
\u4E95|\u4E95\u6C34\u6DE4\u6CE5\u3001\u8BBE\u65BD\u5E9F\u65E7\u4FBF\u65E0\u4EBA\u4F7F\u7528\uFF0C\u80FD\u529B\u82E5\u4E0D\u7EF4\u62A4\u4E5F\u4F1A\u8352\u5E9F\u3002|\u6709\u6C34\u5374\u53EA\u4F9B\u5C0F\u9C7C\u3001\u5BB9\u5668\u8FD8\u7834\u6F0F\uFF0C\u8D44\u6E90\u6CA1\u6709\u88AB\u6709\u6548\u5229\u7528\u3002|\u4E95\u5DF2\u6E05\u5374\u65E0\u4EBA\u6C72\u53D6\u4EE4\u4EBA\u60CB\u60DC\uFF1B\u9047\u5230\u660E\u667A\u7BA1\u7406\u8005\uFF0C\u5927\u5BB6\u90FD\u53D7\u76CA\u3002|\u4FEE\u6574\u4E95\u58C1\u3001\u5B8C\u5584\u57FA\u7840\u8BBE\u65BD\uFF0C\u53EF\u514D\u8FC7\u5931\u3002|\u6E05\u51BD\u5BD2\u6CC9\u53EF\u4F9B\u996E\u7528\uFF0C\u8BF4\u660E\u8D44\u6E90\u5DF2\u5177\u5907\u7A33\u5B9A\u4EF7\u503C\u3002|\u4E95\u6210\u4E4B\u540E\u4E0D\u8981\u5C01\u76D6\uFF0C\u4EE5\u8BDA\u4FE1\u5F00\u653E\u5171\u4EAB\uFF0C\u6700\u4E3A\u6709\u5229\u3002
\u9769|\u53D8\u9769\u521D\u671F\u5148\u7528\u575A\u97E7\u539F\u5219\u7EA6\u675F\u81EA\u5DF1\uFF0C\u4E0D\u53EF\u6025\u52A8\u3002|\u65F6\u673A\u6210\u719F\u540E\u518D\u53D8\u9769\uFF0C\u51FA\u53D1\u8F83\u987A\u4E14\u65E0\u548E\u3002|\u8D38\u7136\u6539\u9769\u5371\u9669\uFF1B\u53CD\u590D\u8BA8\u8BBA\u3001\u53D6\u5F97\u4FE1\u4EFB\u540E\u624D\u53EF\u884C\u52A8\u3002|\u771F\u8BDA\u4FE1\u670D\u540E\u8C03\u6574\u65E7\u5236\u5EA6\uFF0C\u5148\u524D\u540E\u6094\u4F1A\u6D88\u5931\u3002|\u6210\u719F\u9886\u5BFC\u8005\u7684\u6539\u53D8\u50CF\u864E\u7EB9\u822C\u6E05\u695A\uFF0C\u65E0\u987B\u5360\u95EE\u4E5F\u80FD\u8BA9\u4EBA\u4FE1\u670D\u3002|\u541B\u5B50\u6539\u53D8\u5185\u5728\uFF0C\u5C0F\u4EBA\u53EA\u6539\u8868\u9762\uFF1B\u4E0D\u5B9C\u7EE7\u7EED\u6269\u5F20\uFF0C\u5E94\u5B88\u4F4F\u6210\u679C\u3002
\u9F0E|\u5148\u628A\u9F0E\u5012\u7F6E\u6E05\u51FA\u5E9F\u7269\uFF0C\u518D\u5EFA\u7ACB\u65B0\u7528\u9014\uFF0C\u53D8\u901A\u53EF\u514D\u548E\u3002|\u9F0E\u4E2D\u6709\u771F\u5B9E\u5185\u5BB9\uFF0C\u5916\u90E8\u963B\u788D\u4E5F\u96BE\u4EE5\u4FB5\u5165\uFF0C\u4FDD\u6301\u5145\u5B9E\u5373\u53EF\u3002|\u5DE5\u5177\u5173\u952E\u90E8\u4F4D\u6539\u53D8\u5BFC\u81F4\u597D\u8D44\u6E90\u6682\u4E0D\u53EF\u7528\uFF0C\u7B49\u5F85\u6761\u4EF6\u8F6C\u53D8\u7EC8\u4F1A\u8F6C\u597D\u3002|\u627F\u8F7D\u7ED3\u6784\u65AD\u88C2\u3001\u628A\u516C\u5171\u8D44\u6E90\u503E\u8986\uFF0C\u662F\u5931\u804C\u5E26\u6765\u7684\u5371\u9669\u3002|\u4F4D\u7F6E\u4E0E\u627F\u6258\u90FD\u5408\u5B9C\uFF0C\u9002\u5408\u5B88\u6B63\u53D1\u6325\u8C03\u548C\u4F5C\u7528\u3002|\u4EE5\u6E29\u6DA6\u800C\u521A\u5065\u7684\u65B9\u5F0F\u627F\u62C5\u6700\u9AD8\u8D23\u4EFB\uFF0C\u6574\u4F53\u987A\u5229\u3002
\u9707|\u7A81\u53D1\u53D8\u5316\u5148\u4EE4\u4EBA\u6050\u60E7\uFF0C\u82E5\u4FDD\u6301\u656C\u754F\u548C\u79E9\u5E8F\uFF0C\u4E4B\u540E\u80FD\u6062\u590D\u4ECE\u5BB9\u3002|\u9707\u52A8\u4E2D\u4EFF\u4F5B\u5931\u53BB\u91CD\u8981\u8D44\u6E90\uFF0C\u5148\u767B\u9AD8\u907F\u9669\uFF0C\u4E0D\u5FC5\u8FFD\uFF0C\u65E5\u540E\u4F1A\u6062\u590D\u3002|\u56E0\u9707\u60CA\u800C\u60F6\u4E71\u65F6\uFF0C\u628A\u8B66\u89C9\u8F6C\u6210\u884C\u52A8\u4FBF\u53EF\u907F\u514D\u707E\u7978\u3002|\u884C\u52A8\u9677\u5165\u6CE5\u6CDE\uFF0C\u60CA\u9192\u5374\u6CA1\u6709\u771F\u6B63\u6539\u53D8\u3002|\u98CE\u9669\u53CD\u590D\u6765\u53BB\uFF0C\u5B88\u4F4F\u6838\u5FC3\u8D44\u6E90\u5E76\u7EE7\u7EED\u5C65\u8D23\u3002|\u6050\u60E7\u5DF2\u5230\u6781\u70B9\u65F6\u51FA\u5F81\u5371\u9669\uFF1B\u5371\u9669\u5C1A\u5728\u90BB\u8FD1\u5904\u5C31\u9884\u9632\uFF0C\u53EF\u514D\u548E\u3002
\u826E|\u884C\u52A8\u521A\u8D77\u4FBF\u505C\u4F4F\u811A\u6B65\uFF0C\u53EF\u514D\u8FC7\u5931\uFF0C\u5B9C\u957F\u671F\u5B88\u6B63\u3002|\u53EA\u505C\u5C0F\u817F\u5374\u65E0\u6CD5\u7167\u987E\u968F\u884C\u8005\uFF0C\u5185\u5FC3\u4F1A\u4E0D\u5B89\u3002|\u5F3A\u884C\u50F5\u4F4F\u8170\u80CC\uFF0C\u4F7F\u4E0A\u4E0B\u5272\u88C2\uFF0C\u538B\u6291\u4F1A\u707C\u4F24\u5185\u5FC3\u3002|\u9002\u65F6\u8BA9\u6574\u4E2A\u8EAB\u4F53\u505C\u4E0B\uFF0C\u6062\u590D\u8FB9\u754C\u4E0E\u79E9\u5E8F\uFF0C\u53EF\u65E0\u548E\u3002|\u7BA1\u4F4F\u5634\u3001\u8BA9\u8868\u8FBE\u6709\u6B21\u5E8F\uFF0C\u80FD\u6D88\u9664\u540E\u6094\u3002|\u4EE5\u6566\u539A\u7A33\u5B9A\u5B8C\u6210\u505C\u6B62\uFF0C\u4E0D\u6267\u7740\u7EE7\u7EED\uFF0C\u7ED3\u679C\u826F\u597D\u3002
\u6F38|\u5927\u96C1\u521A\u5230\u6C34\u8FB9\uFF0C\u521D\u5B66\u8005\u6709\u98CE\u9669\u4E0E\u8BAE\u8BBA\uFF0C\u8C28\u614E\u5373\u53EF\u65E0\u548E\u3002|\u6E10\u8FDB\u5230\u7A33\u56FA\u78D0\u77F3\uFF0C\u751F\u6D3B\u5B89\u548C\uFF0C\u8BF4\u660E\u6B65\u9AA4\u4E0E\u4F4D\u7F6E\u76F8\u79F0\u3002|\u8D38\u7136\u8D70\u4E0A\u65F1\u5730\u4F7F\u5173\u7CFB\u548C\u6210\u679C\u53D7\u635F\uFF0C\u5E94\u5148\u9632\u5FA1\u98CE\u9669\u3002|\u6E10\u8FDB\u5230\u4E0D\u719F\u6089\u4F4D\u7F6E\u65F6\uFF0C\u53EA\u8981\u627E\u5230\u53EF\u843D\u811A\u5904\u4E5F\u80FD\u65E0\u548E\u3002|\u957F\u671F\u53D7\u963B\u4ECD\u4E0D\u6539\u53D8\u6B63\u9053\uFF0C\u6700\u7EC8\u6CA1\u6709\u529B\u91CF\u80FD\u963B\u6B62\u6210\u679C\u3002|\u6E10\u8FDB\u5230\u9AD8\u5904\uFF0C\u7559\u4E0B\u53EF\u4F9B\u4ED6\u4EBA\u6548\u6CD5\u7684\u98CE\u8303\u3002
\u6B78\u59B9|\u4EE5\u8F85\u52A9\u4F4D\u7F6E\u8FDB\u5165\u65B0\u5173\u7CFB\uFF0C\u80FD\u529B\u867D\u6709\u9650\uFF0C\u4ECD\u53EF\u7A33\u6B65\u884C\u52A8\u3002|\u89C6\u91CE\u6709\u9650\u65F6\u5B9C\u5B89\u9759\u5B88\u6B63\uFF0C\u4E0D\u56E0\u5916\u754C\u8BC4\u4EF7\u5931\u53BB\u5185\u5728\u5224\u65AD\u3002|\u671F\u5F85\u7684\u5173\u7CFB\u6761\u4EF6\u4E0D\u8DB3\uFF0C\u53EA\u80FD\u9000\u56DE\u8F83\u6B21\u4F4D\u7F6E\uFF0C\u5E94\u91CD\u65B0\u786E\u8BA4\u89D2\u8272\u3002|\u9519\u8FC7\u671F\u9650\u4E0D\u5FC5\u52C9\u5F3A\uFF0C\u771F\u6B63\u5408\u9002\u7684\u5F52\u5BBF\u6709\u5176\u65F6\u673A\u3002|\u5916\u5728\u670D\u9970\u4E0D\u5982\u5185\u5728\u54C1\u5FB7\u91CD\u8981\uFF0C\u5706\u6EE1\u5C06\u8FD1\u800C\u4ECD\u4FDD\u6301\u8C26\u900A\u3002|\u5F62\u5F0F\u770B\u4F3C\u5B8C\u6574\u5374\u6CA1\u6709\u5B9E\u8D28\u6295\u5165\uFF0C\u8FD9\u6BB5\u7ED3\u5408\u4E0D\u4F1A\u5E26\u6765\u6210\u679C\u3002
\u8C50|\u5728\u4E30\u76DB\u65F6\u9047\u5230\u5339\u914D\u4F19\u4F34\uFF0C\u77ED\u671F\u5E76\u884C\u65E0\u548E\uFF0C\u524D\u5F80\u4F1A\u53D7\u91CD\u89C6\u3002|\u906E\u853D\u4F7F\u767D\u663C\u5982\u591C\uFF0C\u8D38\u7136\u524D\u5F80\u4F1A\u88AB\u6000\u7591\uFF1B\u4EE5\u8BDA\u4FE1\u8BF4\u660E\u53EF\u8F6C\u597D\u3002|\u906E\u853D\u66F4\u91CD\u4E14\u884C\u52A8\u53D7\u635F\uFF0C\u4F46\u82E5\u975E\u81EA\u8EAB\u8FC7\u9519\uFF0C\u4E0D\u5FC5\u8FC7\u5206\u81EA\u8D23\u3002|\u5728\u8FF7\u6697\u4E2D\u9047\u5230\u5E73\u7B49\u53EF\u9760\u7684\u4F19\u4F34\uFF0C\u5C40\u9762\u53EF\u91CD\u65B0\u53D8\u660E\u3002|\u5438\u5F15\u6709\u624D\u534E\u8005\u5230\u6765\uFF0C\u4F1A\u5E26\u6765\u5E86\u8D3A\u3001\u58F0\u8A89\u4E0E\u6210\u679C\u3002|\u628A\u4E30\u76DB\u5C01\u95ED\u5728\u81EA\u5DF1\u5C4B\u5185\uFF0C\u6700\u7EC8\u5B64\u7ACB\u65E0\u4EBA\uFF0C\u8D44\u6E90\u53CD\u6210\u906E\u853D\u3002
\u65C5|\u65C5\u9014\u4E2D\u62D8\u6CE5\u7410\u788E\u3001\u65A4\u65A4\u8BA1\u8F83\uFF0C\u4F1A\u4E3B\u52A8\u62DB\u6765\u707E\u7978\u3002|\u627E\u5230\u4F4F\u5904\u3001\u4FDD\u6709\u8D44\u6E90\u5E76\u5F97\u5230\u53EF\u4FE1\u5E2E\u52A9\uFF0C\u65C5\u7A0B\u53EF\u7A33\u3002|\u70E7\u6BC1\u843D\u811A\u5904\u53C8\u5931\u53BB\u52A9\u624B\uFF0C\u56FA\u6267\u524D\u884C\u4F1A\u6709\u5371\u9669\u3002|\u867D\u627E\u5230\u4E34\u65F6\u4F4F\u6240\u4E0E\u5DE5\u5177\uFF0C\u5185\u5FC3\u4ECD\u4E0D\u5B89\uFF0C\u5E94\u7EE7\u7EED\u786E\u8BA4\u5F52\u5C5E\u3002|\u4ED8\u51FA\u4E00\u6B21\u4EE3\u4EF7\u53D6\u5F97\u6210\u679C\uFF0C\u6700\u7EC8\u83B7\u5F97\u8BA4\u53EF\u4E0E\u4F7F\u547D\u3002|\u5931\u53BB\u6816\u8EAB\u5904\u8FD8\u7531\u559C\u8F6C\u60B2\uFF0C\u53C8\u56E0\u758F\u5FFD\u4E22\u6389\u5173\u952E\u8D44\u6E90\uFF0C\u7ED3\u5C40\u5371\u9669\u3002
\u5DFD|\u8FDB\u9000\u4E0D\u5B9A\u65F6\u9700\u8981\u575A\u5B9A\u7EAA\u5F8B\uFF0C\u5148\u7EDF\u4E00\u884C\u52A8\u539F\u5219\u3002|\u6DF1\u5165\u9690\u853D\u5904\u5BFB\u6C42\u591A\u65B9\u5E2E\u52A9\uFF0C\u771F\u8BDA\u800C\u6709\u79E9\u5E8F\u4FBF\u53EF\u65E0\u548E\u3002|\u4E00\u518D\u5C48\u4ECE\u3001\u6CA1\u6709\u81EA\u4E3B\u5224\u65AD\uFF0C\u4F1A\u7559\u4E0B\u9057\u61BE\u3002|\u7591\u8651\u6D88\u9664\u540E\u884C\u52A8\u6709\u6240\u6536\u83B7\uFF0C\u8BF4\u660E\u67D4\u987A\u4E0E\u51B3\u65AD\u5DF2\u7ECF\u534F\u8C03\u3002|\u6539\u9769\u524D\u540E\u90FD\u5145\u5206\u51C6\u5907\uFF0C\u867D\u5F00\u5934\u4E0D\u6613\uFF0C\u5B88\u6B63\u7EC8\u4F1A\u987A\u5229\u3002|\u8C26\u9000\u8FC7\u5EA6\u800C\u5931\u53BB\u8D44\u6E90\u548C\u5DE5\u5177\uFF0C\u7EE7\u7EED\u5982\u6B64\u4F1A\u6709\u5371\u9669\u3002
\u514C|\u4EE5\u548C\u60A6\u771F\u8BDA\u76F8\u5904\uFF0C\u7B80\u5355\u800C\u5409\u3002|\u559C\u60A6\u5EFA\u7ACB\u5728\u8BDA\u4FE1\u4E0A\uFF0C\u80FD\u6D88\u9664\u5148\u524D\u540E\u6094\u3002|\u4E3B\u52A8\u8FCE\u5408\u5916\u6765\u7684\u5FEB\u4E50\u3001\u5931\u53BB\u5185\u5728\u6807\u51C6\uFF0C\u4F1A\u6709\u5371\u9669\u3002|\u5BF9\u5FEB\u4E50\u6709\u6240\u5546\u8BAE\u3001\u5C1A\u672A\u5B89\u5B9A\uFF0C\u80FD\u9694\u5F00\u8BF1\u60D1\u4FBF\u4F1A\u6709\u559C\u3002|\u771F\u8BDA\u76F8\u4FE1\u6B63\u5728\u4FB5\u8680\u81EA\u5DF1\u7684\u4E8B\u7269\uFF0C\u6697\u85CF\u98CE\u9669\u3002|\u53EA\u9760\u5F15\u8BF1\u548C\u53D6\u60A6\u7275\u5F15\u4ED6\u4EBA\uFF0C\u5173\u7CFB\u7F3A\u5C11\u771F\u5B9E\u6839\u57FA\u3002
\u6E19|\u79BB\u6563\u521D\u8D77\u65F6\u7528\u5F3A\u6709\u529B\u7684\u652F\u6301\u8FC5\u901F\u6551\u52A9\uFF0C\u53EF\u8F6C\u4E3A\u5409\u3002|\u6DA3\u6563\u4E2D\u8D76\u5FEB\u56DE\u5230\u53EF\u4F9D\u9760\u7684\u652F\u70B9\uFF0C\u540E\u6094\u4F1A\u6D88\u5931\u3002|\u5148\u5316\u89E3\u81EA\u5DF1\u7684\u56FA\u6267\u548C\u79C1\u5FC3\uFF0C\u4E0D\u4F1A\u540E\u6094\u3002|\u6253\u6563\u5C0F\u5708\u5B50\u3001\u5F62\u6210\u66F4\u5927\u5171\u540C\u4F53\uFF0C\u6210\u679C\u8D85\u51FA\u60EF\u5E38\u60F3\u8C61\u3002|\u4EE5\u660E\u786E\u53F7\u4EE4\u5316\u89E3\u58C5\u585E\uFF0C\u4E5F\u628A\u516C\u5171\u8D44\u6E90\u91CD\u65B0\u6D41\u901A\uFF0C\u53EF\u514D\u548E\u3002|\u8BA9\u4F24\u5BB3\u548C\u5371\u9669\u6D88\u6563\u8FDC\u79BB\uFF0C\u6700\u7EC8\u8D70\u51FA\u9669\u5883\u3002
\u7BC0|\u65F6\u673A\u672A\u5230\u5C31\u4E0D\u51FA\u5EAD\u9662\uFF0C\u9002\u5EA6\u81EA\u9650\u53EF\u4EE5\u65E0\u548E\u3002|\u8BE5\u884C\u52A8\u65F6\u4ECD\u628A\u81EA\u5DF1\u5173\u4F4F\uFF0C\u8282\u5236\u8FC7\u5934\u4FBF\u8F6C\u4E3A\u5371\u9669\u3002|\u5E73\u65F6\u4E0D\u77E5\u8282\u5236\uFF0C\u4E8B\u540E\u53EA\u5269\u53F9\u606F\uFF1B\u8D23\u4EFB\u4ECD\u5728\u81EA\u5DF1\u3002|\u5B89\u7136\u63A5\u53D7\u5408\u5B9C\u8FB9\u754C\uFF0C\u8282\u5236\u53CD\u800C\u5E26\u6765\u81EA\u7531\u4E0E\u901A\u8FBE\u3002|\u8BA9\u89C4\u5219\u5408\u7406\u53EF\u6301\u7EED\uFF0C\u4EBA\u4EEC\u613F\u610F\u9075\u5B88\uFF0C\u884C\u52A8\u4E5F\u53D7\u5C0A\u91CD\u3002|\u628A\u8282\u5236\u53D8\u6210\u75DB\u82E6\u82DB\u523B\uFF0C\u957F\u671F\u575A\u6301\u53CD\u800C\u6709\u5BB3\uFF1B\u89C9\u5BDF\u540E\u53EF\u4E0D\u6094\u3002
\u4E2D\u5B5A|\u9884\u5148\u5B89\u987F\u5185\u5FC3\u5219\u5409\uFF1B\u82E5\u53E6\u6709\u79C1\u5FF5\uFF0C\u4FBF\u96BE\u4EE5\u5B89\u5B81\u3002|\u771F\u8BDA\u4F1A\u50CF\u9690\u5904\u9E64\u9E23\u5F97\u5230\u540C\u4F34\u56DE\u5E94\uFF0C\u7F8E\u597D\u6210\u679C\u9002\u5408\u5171\u4EAB\u3002|\u9762\u5BF9\u5BF9\u624B\u65F6\u60C5\u7EEA\u5FFD\u8FDB\u5FFD\u9000\u3001\u5FFD\u60B2\u5FFD\u559C\uFF0C\u8BF4\u660E\u5185\u5FC3\u5C1A\u672A\u7A33\u5B9A\u3002|\u6708\u8FD1\u5706\u6EE1\u65F6\u820D\u5F03\u79C1\u4EBA\u914D\u5BF9\u3001\u670D\u52A1\u66F4\u5927\u76EE\u6807\uFF0C\u53EF\u514D\u548E\u3002|\u4EE5\u8BDA\u4FE1\u7D27\u5BC6\u8FDE\u63A5\u4F17\u4EBA\uFF0C\u5173\u7CFB\u7262\u56FA\u800C\u65E0\u8FC7\u5931\u3002|\u58F0\u540D\u98DE\u5F97\u5F88\u9AD8\u5374\u7F3A\u4E4F\u5B9E\u8D28\uFF0C\u957F\u671F\u5982\u6B64\u4F1A\u6709\u5371\u9669\u3002
\u5C0F\u904E|\u5C0F\u4E8B\u4E4B\u521D\u5374\u98DE\u5F97\u8FC7\u9AD8\uFF0C\u8D85\u8D8A\u80FD\u529B\u4FBF\u6709\u5371\u9669\u3002|\u8D8A\u8FC7\u65E7\u5C42\u7EA7\u4F46\u9047\u5230\u5408\u9002\u7684\u7167\u6599\u8005\uFF0C\u4E0D\u8D8A\u6743\u800C\u4E0E\u6267\u884C\u8005\u5408\u4F5C\uFF0C\u53EF\u65E0\u548E\u3002|\u82E5\u4E0D\u52A0\u5F3A\u9632\u5907\uFF0C\u53EF\u80FD\u88AB\u8DDF\u968F\u800C\u6765\u7684\u4EBA\u4F24\u5BB3\u3002|\u4E0D\u8FC7\u5EA6\u884C\u52A8\u3001\u6070\u597D\u76F8\u9047\u53EF\u514D\u548E\uFF1B\u524D\u5F80\u4ECD\u9700\u8B66\u6212\uFF0C\u4E5F\u4E0D\u5B9C\u50F5\u5B88\u3002|\u6761\u4EF6\u50CF\u5BC6\u4E91\u672A\u96E8\uFF0C\u5E94\u4ECE\u9690\u853D\u3001\u5177\u4F53\u4E4B\u5904\u53D6\u5F97\u76EE\u6807\u3002|\u8D85\u8FC7\u76F8\u9047\u7684\u5C3A\u5EA6\u3001\u98DE\u5F97\u592A\u8FDC\uFF0C\u4F1A\u9677\u5165\u96BE\u4EE5\u633D\u56DE\u7684\u707E\u7978\u3002
\u65E2\u6FDF|\u4E8B\u60C5\u521A\u5B8C\u6210\u5C31\u653E\u6162\u8F66\u8F6E\uFF0C\u867D\u6CBE\u6E7F\u5C3E\u5DF4\u4ECD\u53EF\u907F\u514D\u8FC7\u5931\u3002|\u6682\u65F6\u5931\u53BB\u906E\u9970\u4E0D\u5FC5\u8FFD\u8D76\uFF0C\u8010\u5FC3\u7B49\u5F85\u4F1A\u81EA\u7136\u6062\u590D\u3002|\u957F\u671F\u8270\u82E6\u624D\u5B8C\u6210\u5927\u76EE\u6807\uFF0C\u6210\u679C\u4E0D\u80FD\u4EA4\u7ED9\u80FD\u529B\u54C1\u5FB7\u4E0D\u8DB3\u8005\u3002|\u6210\u4E8B\u4E4B\u540E\u4ECD\u8981\u6574\u65E5\u8B66\u6212\uFF0C\u53CA\u65F6\u4FEE\u8865\u7EC6\u5C0F\u6F0F\u6D1E\u3002|\u9686\u91CD\u5F62\u5F0F\u4E0D\u5982\u6734\u7D20\u771F\u8BDA\uFF0C\u771F\u6B63\u7684\u798F\u6765\u81EA\u8BDA\u610F\u800C\u975E\u6392\u573A\u3002|\u5B8C\u6210\u540E\u7EE7\u7EED\u5192\u8FDB\u4F1A\u6CA1\u9876\u53D7\u9669\uFF0C\u6700\u9700\u8981\u5B88\u6210\u4E0E\u6536\u675F\u3002
\u672A\u6FDF|\u5C1A\u672A\u6E21\u8FC7\u5C31\u5148\u6CBE\u6E7F\u5C3E\u5DF4\uFF0C\u8D77\u6B65\u5192\u8FDB\u4F1A\u7559\u4E0B\u9057\u61BE\u3002|\u62D6\u4F4F\u8F66\u8F6E\u63A7\u5236\u901F\u5EA6\uFF0C\u5B88\u6B63\u7B49\u5F85\u80FD\u5E26\u6765\u597D\u7ED3\u679C\u3002|\u6761\u4EF6\u672A\u6210\u65F6\u8D38\u7136\u51FA\u5F81\u4F1A\u5931\u8D25\uFF0C\u4F46\u5145\u5206\u51C6\u5907\u540E\u4ECD\u53EF\u6E21\u8FC7\u5927\u6CB3\u3002|\u5B88\u6B63\u6295\u5165\u957F\u671F\u653B\u575A\uFF0C\u867D\u5386\u65F6\u5F88\u4E45\uFF0C\u6700\u7EC8\u4F1A\u5F97\u5230\u8BA4\u53EF\u3002|\u672A\u5B8C\u6210\u4E2D\u4ECD\u4FDD\u6301\u5149\u660E\u3001\u8BDA\u4FE1\u4E0E\u6B63\u76F4\uFF0C\u7ED3\u679C\u53EF\u671F\u4E14\u65E0\u6094\u3002|\u5B8C\u6210\u524D\u540E\u53EF\u4EE5\u5E86\u795D\uFF0C\u4F46\u82E5\u653E\u7EB5\u5230\u6CA1\u9876\uFF0C\u8BDA\u4FE1\u4E0E\u5206\u5BF8\u90FD\u4F1A\u5931\u53BB\u3002
`;
  function parseCorpus(raw, label) {
    const rows = raw.trim().split("\n").map((row) => row.split("|"));
    if (rows.length !== 64 || rows.some((row) => row.length !== 7)) {
      throw new Error(`Invalid ${label} corpus shape`);
    }
    return rows;
  }
  function positionName(original) {
    const separator = original.search(/[：，]/u);
    if (separator <= 0) throw new Error(`Invalid Zhouyi line label: ${original}`);
    return original.slice(0, separator);
  }
  var originals = parseCorpus(RAW_ORIGINALS, "original");
  var explanations = parseCorpus(RAW_EXPLANATIONS, "explanation");
  var ICHING_LINES = Object.freeze(
    originals.flatMap((row, hexagramIndex) => {
      const explanationRow = explanations[hexagramIndex];
      if (row[0] !== explanationRow[0]) {
        throw new Error(`Mismatched I Ching explanation row: ${row[0]}`);
      }
      return row.slice(1).map((original, lineIndex) => {
        const hexagramNumber = hexagramIndex + 1;
        const position = lineIndex + 1;
        return Object.freeze({
          id: `${String(hexagramNumber).padStart(2, "0")}-${position}`,
          hexagramNumber,
          hexagramName: row[0],
          hexagramSymbol: String.fromCodePoint(19904 + hexagramIndex),
          position,
          positionName: positionName(original),
          original,
          explanation: explanationRow[lineIndex + 1]
        });
      });
    })
  );
  function validateIntegerInRange(value, min, max, label) {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(`Invalid ${label}: ${value}`);
    }
  }
  function getIChingLine(hexagramNumber, position) {
    validateIntegerInRange(hexagramNumber, 1, 64, "hexagram number");
    validateIntegerInRange(position, 1, 6, "line position");
    return ICHING_LINES[(hexagramNumber - 1) * 6 + position - 1];
  }
  function normalizedVaultName(vaultName) {
    if (typeof vaultName !== "string") throw new Error("Vault name must be a string");
    const normalized = vaultName.normalize("NFC").trim();
    if (!normalized) throw new Error("Vault name must not be empty");
    return normalized;
  }
  function stableHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
  function getDailyIChingIndex(dateKey, vaultName) {
    keyToDate(dateKey);
    const identity = `${dateKey}\0${normalizedVaultName(vaultName)}`;
    return stableHash(identity) % ICHING_LINES.length;
  }
  function getDailyIChingLine(dateKey, vaultName) {
    return ICHING_LINES[getDailyIChingIndex(dateKey, vaultName)];
  }

  // ../../src/daily-ritual.ts
  var DAILY_RITUAL_PASSAGES = [
    {
      id: "daodejing-08-water",
      source: "\u300A\u9053\u5FB7\u7ECF\u300B\u7B2C\u516B\u7AE0",
      original: "\u4E0A\u5584\u82E5\u6C34\u3002\u6C34\u5584\u5229\u4E07\u7269\u800C\u4E0D\u4E89\uFF0C\u5904\u4F17\u4EBA\u4E4B\u6240\u6076\uFF0C\u6545\u51E0\u4E8E\u9053\u3002",
      translation: "\u6700\u9AD8\u7684\u5584\u50CF\u6C34\uFF1A\u6ECB\u517B\u4E07\u7269\u800C\u4E0D\u4E89\uFF0C\u5B89\u5904\u4F17\u4EBA\u4E0D\u613F\u53BB\u7684\u4F4E\u5904\uFF0C\u56E0\u6B64\u63A5\u8FD1\u4E8E\u9053\u3002"
    },
    {
      id: "daodejing-10-hold-one",
      source: "\u300A\u9053\u5FB7\u7ECF\u300B\u7B2C\u5341\u7AE0",
      original: "\u8F7D\u8425\u9B44\u62B1\u4E00\uFF0C\u80FD\u65E0\u79BB\u4E4E\uFF1F\u4E13\u6C14\u81F4\u67D4\uFF0C\u80FD\u5A74\u513F\u4E4E\uFF1F\u6DA4\u9664\u7384\u89C8\uFF0C\u80FD\u65E0\u75B5\u4E4E\uFF1F",
      translation: "\u8BA9\u8EAB\u5FC3\u5408\u4E00\u800C\u4E0D\u5206\u79BB\uFF0C\u8C03\u5300\u6C14\u606F\u800C\u5F52\u4E8E\u67D4\u548C\uFF0C\u6D17\u51C0\u5185\u5FC3\u7684\u89C2\u7167\u800C\u4E0D\u7559\u853D\u969C\u3002"
    },
    {
      id: "daodejing-15-clear",
      source: "\u300A\u9053\u5FB7\u7ECF\u300B\u7B2C\u5341\u4E94\u7AE0",
      original: "\u5B70\u80FD\u6D4A\u4EE5\u9759\u4E4B\u5F90\u6E05\uFF1F\u5B70\u80FD\u5B89\u4EE5\u52A8\u4E4B\u5F90\u751F\uFF1F",
      translation: "\u8C01\u80FD\u8BA9\u6D51\u6D4A\u5728\u5B89\u9759\u4E2D\u6162\u6162\u6F84\u6E05\uFF1F\u8C01\u80FD\u5728\u5B89\u5B9A\u4E2D\u884C\u52A8\uFF0C\u4F7F\u751F\u673A\u6E10\u6E10\u663E\u73B0\uFF1F"
    },
    {
      id: "daodejing-16-return",
      source: "\u300A\u9053\u5FB7\u7ECF\u300B\u7B2C\u5341\u516D\u7AE0",
      original: "\u81F4\u865A\u6781\uFF0C\u5B88\u9759\u7B03\u3002\u4E07\u7269\u5E76\u4F5C\uFF0C\u543E\u4EE5\u89C2\u590D\u3002\u592B\u7269\u82B8\u82B8\uFF0C\u5404\u590D\u5F52\u5176\u6839\u3002\u5F52\u6839\u66F0\u9759\uFF0C\u662F\u8C13\u590D\u547D\u3002",
      translation: "\u8BA9\u5FC3\u7A7A\u660E\u5230\u6781\u5904\uFF0C\u5B88\u4F4F\u6DF1\u9759\u3002\u4E07\u7269\u84EC\u52C3\u751F\u957F\uFF0C\u6211\u7531\u6B64\u770B\u89C1\u5B83\u4EEC\u7EC8\u4F1A\u8FD4\u56DE\u6839\u672C\uFF1B\u5F52\u6839\u5C31\u662F\u9759\u3002"
    },
    {
      id: "daodejing-22-whole",
      source: "\u300A\u9053\u5FB7\u7ECF\u300B\u7B2C\u4E8C\u5341\u4E8C\u7AE0",
      original: "\u66F2\u5219\u5168\uFF0C\u6789\u5219\u76F4\uFF0C\u6D3C\u5219\u76C8\uFF0C\u655D\u5219\u65B0\uFF0C\u5C11\u5219\u5F97\uFF0C\u591A\u5219\u60D1\u3002",
      translation: "\u80FD\u5F2F\u66F2\u53CD\u5F97\u4FDD\u5168\uFF0C\u80FD\u5C48\u5C31\u53CD\u5F97\u4F38\u5C55\uFF1B\u4F4E\u6D3C\u5F97\u4EE5\u5145\u76C8\uFF0C\u9648\u65E7\u5F97\u4EE5\u66F4\u65B0\uFF0C\u5C11\u53D6\u53CD\u800C\u6709\u6240\u5F97\u3002"
    },
    {
      id: "daodejing-28-stream",
      source: "\u300A\u9053\u5FB7\u7ECF\u300B\u7B2C\u4E8C\u5341\u516B\u7AE0",
      original: "\u77E5\u5176\u96C4\uFF0C\u5B88\u5176\u96CC\uFF0C\u4E3A\u5929\u4E0B\u6EAA\u3002\u4E3A\u5929\u4E0B\u6EAA\uFF0C\u5E38\u5FB7\u4E0D\u79BB\uFF0C\u590D\u5F52\u4E8E\u5A74\u513F\u3002",
      translation: "\u77E5\u9053\u521A\u5F3A\uFF0C\u4E5F\u5B88\u4F4F\u67D4\u9759\uFF0C\u7518\u4E3A\u5929\u4E0B\u7684\u6EAA\u8C37\uFF1B\u5982\u6B64\u5E38\u5FB7\u4E0D\u79BB\uFF0C\u5FC3\u6027\u4FBF\u80FD\u56DE\u5230\u5A74\u513F\u822C\u7EAF\u771F\u3002"
    },
    {
      id: "daodejing-33-self-knowledge",
      source: "\u300A\u9053\u5FB7\u7ECF\u300B\u7B2C\u4E09\u5341\u4E09\u7AE0",
      original: "\u77E5\u4EBA\u8005\u667A\uFF0C\u81EA\u77E5\u8005\u660E\u3002\u80DC\u4EBA\u8005\u6709\u529B\uFF0C\u81EA\u80DC\u8005\u5F3A\u3002\u77E5\u8DB3\u8005\u5BCC\uFF0C\u5F3A\u884C\u8005\u6709\u5FD7\u3002",
      translation: "\u4E86\u89E3\u522B\u4EBA\u662F\u667A\u6167\uFF0C\u8BA4\u8BC6\u81EA\u5DF1\u624D\u7B97\u660E\u6F88\uFF1B\u80DC\u8FC7\u522B\u4EBA\u662F\u6709\u529B\uFF0C\u6218\u80DC\u81EA\u5DF1\u624D\u662F\u771F\u6B63\u5F3A\u5927\u3002"
    },
    {
      id: "daodejing-37-nonaction",
      source: "\u300A\u9053\u5FB7\u7ECF\u300B\u7B2C\u4E09\u5341\u4E03\u7AE0",
      original: "\u9053\u5E38\u65E0\u4E3A\u800C\u65E0\u4E0D\u4E3A\u3002",
      translation: "\u9053\u4ECE\u4E0D\u52C9\u5F3A\u9020\u4F5C\uFF0C\u5374\u6CA1\u6709\u4EC0\u4E48\u4E0D\u80FD\u5728\u5176\u8FD0\u884C\u4E2D\u81EA\u7136\u6210\u5C31\u3002"
    },
    {
      id: "daodejing-44-enough",
      source: "\u300A\u9053\u5FB7\u7ECF\u300B\u7B2C\u56DB\u5341\u56DB\u7AE0",
      original: "\u77E5\u8DB3\u4E0D\u8FB1\uFF0C\u77E5\u6B62\u4E0D\u6B86\uFF0C\u53EF\u4EE5\u957F\u4E45\u3002",
      translation: "\u61C2\u5F97\u6EE1\u8DB3\u5C31\u4E0D\u6613\u53D7\u8FB1\uFF0C\u77E5\u9053\u9002\u65F6\u505C\u6B62\u5C31\u4E0D\u6613\u9677\u5165\u5371\u9669\uFF0C\u56E0\u6B64\u80FD\u591F\u957F\u4E45\u3002"
    },
    {
      id: "daodejing-48-less",
      source: "\u300A\u9053\u5FB7\u7ECF\u300B\u7B2C\u56DB\u5341\u516B\u7AE0",
      original: "\u4E3A\u5B66\u65E5\u76CA\uFF0C\u4E3A\u9053\u65E5\u635F\u3002\u635F\u4E4B\u53C8\u635F\uFF0C\u4EE5\u81F3\u4E8E\u65E0\u4E3A\u3002\u65E0\u4E3A\u800C\u65E0\u4E0D\u4E3A\u3002",
      translation: "\u6C42\u5B66\u5929\u5929\u589E\u52A0\u77E5\u8BC6\uFF0C\u4F53\u9053\u5219\u5929\u5929\u51CF\u53BB\u5984\u5FF5\uFF1B\u4E00\u51CF\u518D\u51CF\uFF0C\u76F4\u5230\u4E0D\u5F3A\u4F5C\uFF0C\u4E8E\u662F\u65E0\u6240\u4E0D\u6210\u3002"
    },
    {
      id: "daodejing-64-first-step",
      source: "\u300A\u9053\u5FB7\u7ECF\u300B\u7B2C\u516D\u5341\u56DB\u7AE0",
      original: "\u5408\u62B1\u4E4B\u6728\uFF0C\u751F\u4E8E\u6BEB\u672B\uFF1B\u4E5D\u5C42\u4E4B\u53F0\uFF0C\u8D77\u4E8E\u7D2F\u571F\uFF1B\u5343\u91CC\u4E4B\u884C\uFF0C\u59CB\u4E8E\u8DB3\u4E0B\u3002",
      translation: "\u5408\u62B1\u7684\u5927\u6811\u4ECE\u7EC6\u82BD\u957F\u8D77\uFF0C\u4E5D\u5C42\u9AD8\u53F0\u4ECE\u4E00\u7B50\u571F\u7B51\u8D77\uFF0C\u5343\u91CC\u8FDC\u884C\u4ECE\u811A\u4E0B\u7B2C\u4E00\u6B65\u5F00\u59CB\u3002"
    },
    {
      id: "daodejing-76-soft",
      source: "\u300A\u9053\u5FB7\u7ECF\u300B\u7B2C\u4E03\u5341\u516D\u7AE0",
      original: "\u4EBA\u4E4B\u751F\u4E5F\u67D4\u5F31\uFF0C\u5176\u6B7B\u4E5F\u575A\u5F3A\u3002\u8349\u6728\u4E4B\u751F\u4E5F\u67D4\u8106\uFF0C\u5176\u6B7B\u4E5F\u67AF\u69C1\u3002\u6545\u575A\u5F3A\u8005\u6B7B\u4E4B\u5F92\uFF0C\u67D4\u5F31\u8005\u751F\u4E4B\u5F92\u3002",
      translation: "\u4EBA\u6D3B\u7740\u65F6\u67D4\u8F6F\uFF0C\u6B7B\u540E\u53D8\u5F97\u50F5\u786C\uFF1B\u8349\u6728\u6709\u751F\u673A\u65F6\u67D4\u8106\uFF0C\u67AF\u6B7B\u65F6\u5E72\u786C\u3002\u67D4\u5F31\u66F4\u63A5\u8FD1\u751F\u547D\u3002"
    },
    {
      id: "qingjing-dao",
      source: "\u300A\u6E05\u9759\u7ECF\u300B",
      original: "\u5927\u9053\u65E0\u5F62\uFF0C\u751F\u80B2\u5929\u5730\uFF1B\u5927\u9053\u65E0\u60C5\uFF0C\u8FD0\u884C\u65E5\u6708\uFF1B\u5927\u9053\u65E0\u540D\uFF0C\u957F\u517B\u4E07\u7269\u3002\u543E\u4E0D\u77E5\u5176\u540D\uFF0C\u5F3A\u540D\u66F0\u9053\u3002",
      translation: "\u5927\u9053\u6CA1\u6709\u56FA\u5B9A\u5F62\u4F53\uFF0C\u5374\u5316\u751F\u5929\u5730\uFF1B\u4E0D\u51ED\u79C1\u60C5\uFF0C\u5374\u8FD0\u884C\u65E5\u6708\uFF1B\u4E0D\u53EF\u547D\u540D\uFF0C\u5374\u6ECB\u517B\u4E07\u7269\uFF0C\u59D1\u4E14\u79F0\u5B83\u4E3A\u9053\u3002"
    },
    {
      id: "qingjing-mind",
      source: "\u300A\u6E05\u9759\u7ECF\u300B",
      original: "\u592B\u4EBA\u795E\u597D\u6E05\uFF0C\u800C\u5FC3\u6270\u4E4B\uFF1B\u4EBA\u5FC3\u597D\u9759\uFF0C\u800C\u6B32\u7275\u4E4B\u3002\u5E38\u80FD\u9063\u5176\u6B32\uFF0C\u800C\u5FC3\u81EA\u9759\uFF1B\u6F84\u5176\u5FC3\uFF0C\u800C\u795E\u81EA\u6E05\u3002",
      translation: "\u4EBA\u7684\u7CBE\u795E\u672C\u6765\u559C\u6E05\uFF0C\u6742\u5FF5\u5374\u6765\u6270\u52A8\uFF1B\u5185\u5FC3\u672C\u6765\u559C\u9759\uFF0C\u6B32\u671B\u5374\u6765\u7275\u5F15\u3002\u653E\u4E0B\u6B32\u5FF5\u3001\u6F84\u6E05\u5185\u5FC3\uFF0C\u7CBE\u795E\u81EA\u7136\u6E05\u660E\u3002"
    },
    {
      id: "qingjing-return",
      source: "\u300A\u6E05\u9759\u7ECF\u300B",
      original: "\u6E05\u8005\u6D4A\u4E4B\u6E90\uFF0C\u52A8\u8005\u9759\u4E4B\u57FA\u3002\u4EBA\u80FD\u5E38\u6E05\u9759\uFF0C\u5929\u5730\u6089\u7686\u5F52\u3002",
      translation: "\u6E05\u662F\u6D4A\u7684\u6E90\u5934\uFF0C\u52A8\u4EE5\u9759\u4E3A\u6839\u57FA\u3002\u4EBA\u82E5\u80FD\u5E38\u5B88\u6E05\u9759\uFF0C\u4FBF\u80FD\u4E0E\u5929\u5730\u8FD0\u884C\u7684\u6839\u672C\u76F8\u5951\u3002"
    },
    {
      id: "qingjing-observe",
      source: "\u300A\u6E05\u9759\u7ECF\u300B",
      original: "\u5185\u89C2\u5176\u5FC3\uFF0C\u5FC3\u65E0\u5176\u5FC3\uFF1B\u5916\u89C2\u5176\u5F62\uFF0C\u5F62\u65E0\u5176\u5F62\uFF1B\u8FDC\u89C2\u5176\u7269\uFF0C\u7269\u65E0\u5176\u7269\u3002\u4E09\u8005\u65E2\u609F\uFF0C\u552F\u89C1\u4E8E\u7A7A\u3002",
      translation: "\u5411\u5185\u89C2\u5FC3\u3001\u5411\u5916\u89C2\u8EAB\u3001\u518D\u8FDC\u89C2\u4E07\u7269\uFF0C\u4E0D\u6267\u7740\u4E8E\u56FA\u5B9A\u7684\u5FC3\u3001\u5F62\u4E0E\u7269\uFF0C\u4FBF\u80FD\u4F53\u4F1A\u7A7A\u660E\u3002"
    }
  ];
  function normalizedSeed(seed) {
    if (typeof seed !== "string") throw new Error("Daily ritual seed must be a string");
    const normalized = seed.normalize("NFC").trim();
    if (!normalized) throw new Error("Daily ritual seed must not be empty");
    return normalized;
  }
  function stableHash2(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
  function getDailyRitualPassage(dateKey, seed) {
    keyToDate(dateKey);
    const identity = `${dateKey}\0${normalizedSeed(seed)}\0daily-ritual`;
    return DAILY_RITUAL_PASSAGES[stableHash2(identity) % DAILY_RITUAL_PASSAGES.length];
  }

  // ../../src/milestones.ts
  var HEXAGRAM_STEP_HOURS = 1;
  var HEXAGRAM_STEP_SECONDS = HEXAGRAM_STEP_HOURS * 60 * 60;
  var HEXAGRAMS_PER_CYCLE = 64;
  var RUNE_CYCLE_HOURS = HEXAGRAM_STEP_HOURS * HEXAGRAMS_PER_CYCLE;
  var MILESTONE_CYCLE_SECONDS = HEXAGRAM_STEP_SECONDS * HEXAGRAMS_PER_CYCLE;
  var MILESTONE_HEXAGRAMS = Object.freeze(
    Array.from({ length: HEXAGRAMS_PER_CYCLE }, (_, index) => {
      const line = getIChingLine(index + 1, 1);
      return Object.freeze({
        number: line.hexagramNumber,
        name: line.hexagramName,
        symbol: line.hexagramSymbol
      });
    })
  );
  var ELDER_FUTHARK_RUNES = [
    { id: "fehu", name: "Fehu", symbol: "\u16A0", sound: "/f/", meaning: "\u5BB6\u755C\u3001\u8D22\u5BCC" },
    { id: "uruz", name: "Uruz", symbol: "\u16A2", sound: "/u\u02D0/", meaning: "\u539F\u725B\uFF08\u5DF2\u706D\u7EDD\u7684\u91CE\u725B\uFF09" },
    { id: "thurisaz", name: "Thurisaz", symbol: "\u16A6", sound: "/\u03B8/ \u6216 /\xF0/", meaning: "\u5DE8\u4EBA\u3001\u602A\u7269" },
    { id: "ansuz", name: "Ansuz", symbol: "\u16A8", sound: "/\u0251/", meaning: "\u795E\u7947" },
    { id: "raidho", name: "Raidho", symbol: "\u16B1", sound: "/r/", meaning: "\u9A91\u884C\u3001\u9053\u8DEF\u4E0E\u65C5\u7A0B" },
    { id: "kenaz", name: "Kenaz", symbol: "\u16B2", sound: "/k/", meaning: "\u706B\u70AC\uFF1B\u540D\u79F0\u8BCD\u6E90\u6709\u4E89\u8BAE" },
    { id: "gebo", name: "Gebo", symbol: "\u16B7", sound: "/\u0261/", meaning: "\u793C\u7269" },
    { id: "wunjo", name: "Wunjo", symbol: "\u16B9", sound: "/w/", meaning: "\u559C\u60A6" },
    { id: "hagalaz", name: "Hagalaz", symbol: "\u16BA", sound: "/h/", meaning: "\u51B0\u96F9" },
    { id: "nauthiz", name: "Nauthiz", symbol: "\u16BE", sound: "/n/", meaning: "\u9700\u6C42\u3001\u7EA6\u675F\u4E0E\u56F0\u5883" },
    { id: "isa", name: "Isa", symbol: "\u16C1", sound: "/i\u02D0/", meaning: "\u51B0" },
    { id: "jera", name: "Jera", symbol: "\u16C3", sound: "/j/", meaning: "\u5E74\u6210\u3001\u6536\u83B7" },
    { id: "eihwaz", name: "Eihwaz", symbol: "\u16C7", sound: "/\u026A/ \u6216 /\xE6/\uFF08\u6709\u4E89\u8BAE\uFF09", meaning: "\u7D2B\u6749" },
    { id: "perthro", name: "Perthro", symbol: "\u16C8", sound: "/p/", meaning: "\u8BCD\u4E49\u672A\u5B9A\uFF1B\u5E38\u89C1\u63A8\u6D4B\u4E3A\u9AB0\u676F\u6216\u62BD\u7B7E" },
    { id: "algiz", name: "Algiz", symbol: "\u16C9", sound: "/z/\uFF0C\u540E\u671F /\u0280/", meaning: "\u8BCD\u4E49\u6709\u4E89\u8BAE\uFF1B\u5E38\u89C1\u91CA\u4E3A\u9E8B\u9E7F\u6216\u838E\u8349" },
    { id: "sowilo", name: "Sowilo", symbol: "\u16CA", sound: "/s/", meaning: "\u592A\u9633" },
    { id: "tiwaz", name: "Tiwaz", symbol: "\u16CF", sound: "/t/", meaning: "\u63D0\u74E6\u5179\uFF0F\u63D0\u5C14\u795E" },
    { id: "berkano", name: "Berkano", symbol: "\u16D2", sound: "/b/", meaning: "\u767D\u6866" },
    { id: "ehwaz", name: "Ehwaz", symbol: "\u16D6", sound: "/e/", meaning: "\u9A6C" },
    { id: "mannaz", name: "Mannaz", symbol: "\u16D7", sound: "/m/", meaning: "\u4EBA\u3001\u4EBA\u7C7B" },
    { id: "laguz", name: "Laguz", symbol: "\u16DA", sound: "/l/", meaning: "\u6C34\u3001\u6E56" },
    { id: "ingwaz", name: "Ingwaz", symbol: "\u16DC", sound: "/\u014B/", meaning: "\u82F1\u683C\u795E" },
    { id: "dagaz", name: "Dagaz", symbol: "\u16DE", sound: "/d/", meaning: "\u767D\u663C" },
    { id: "othala", name: "Othala", symbol: "\u16DF", sound: "/o/", meaning: "\u7956\u4EA7\u3001\u7EE7\u627F" }
  ];
  var CLASSICAL_PLANETS = [
    { id: "moon", name: "\u6708\u4EAE", symbol: "\u263D", sound: "Moon /mu\u02D0n/", meaning: "\u8282\u5F8B\u3001\u611F\u53D7\u3001\u517B\u62A4" },
    { id: "mercury", name: "\u6C34\u661F", symbol: "\u263F", sound: "Mercury /\u02C8m\u025C\u02D0rkj\u0259ri/", meaning: "\u5B66\u4E60\u3001\u8BED\u8A00\u3001\u6280\u827A" },
    { id: "venus", name: "\u91D1\u661F", symbol: "\u2640", sound: "Venus /\u02C8vi\u02D0n\u0259s/", meaning: "\u548C\u8C10\u3001\u5173\u7CFB\u3001\u5BA1\u7F8E" },
    { id: "sun", name: "\u592A\u9633", symbol: "\u2609", sound: "Sun /s\u028Cn/", meaning: "\u6838\u5FC3\u3001\u751F\u547D\u529B\u3001\u663E\u73B0" },
    { id: "mars", name: "\u706B\u661F", symbol: "\u2642", sound: "Mars /m\u0251\u02D0rz/", meaning: "\u884C\u52A8\u3001\u52C7\u6C14\u3001\u51B3\u65AD" },
    { id: "jupiter", name: "\u6728\u661F", symbol: "\u2643", sound: "Jupiter /\u02C8d\u0292u\u02D0p\u026At\u0259r/", meaning: "\u6269\u5C55\u3001\u4FE1\u5FF5\u3001\u7EDF\u6444" },
    { id: "saturn", name: "\u571F\u661F", symbol: "\u2644", sound: "Saturn /\u02C8s\xE6t\u0259rn/", meaning: "\u65F6\u95F4\u3001\u8FB9\u754C\u3001\u957F\u671F\u8D23\u4EFB" }
  ];
  var ZODIAC_SIGNS = [
    { id: "aries", name: "\u767D\u7F8A\u5BAB", symbol: "\u2648\uFE0E", sound: "Aries /\u02C8e\u0259ri\u02D0z/", meaning: "\u5F00\u7AEF\u3001\u4E3B\u52A8" },
    { id: "taurus", name: "\u91D1\u725B\u5BAB", symbol: "\u2649\uFE0E", sound: "Taurus /\u02C8t\u0254\u02D0r\u0259s/", meaning: "\u7A33\u56FA\u3001\u79EF\u7D2F" },
    { id: "gemini", name: "\u53CC\u5B50\u5BAB", symbol: "\u264A\uFE0E", sound: "Gemini /\u02C8d\u0292em\u026Ana\u026A/", meaning: "\u4EA4\u6D41\u3001\u8054\u7ED3" },
    { id: "cancer", name: "\u5DE8\u87F9\u5BAB", symbol: "\u264B\uFE0E", sound: "Cancer /\u02C8k\xE6ns\u0259r/", meaning: "\u5B88\u62A4\u3001\u6ECB\u517B" },
    { id: "leo", name: "\u72EE\u5B50\u5BAB", symbol: "\u264C\uFE0E", sound: "Leo /\u02C8li\u02D0o\u028A/", meaning: "\u52C7\u6C14\u3001\u8868\u8FBE" },
    { id: "virgo", name: "\u5BA4\u5973\u5BAB", symbol: "\u264D\uFE0E", sound: "Virgo /\u02C8v\u025C\u02D0r\u0261o\u028A/", meaning: "\u8FA8\u6790\u3001\u6574\u7406" },
    { id: "libra", name: "\u5929\u79E4\u5BAB", symbol: "\u264E\uFE0E", sound: "Libra /\u02C8li\u02D0br\u0259/", meaning: "\u5E73\u8861\u3001\u516C\u6B63" },
    { id: "scorpio", name: "\u5929\u874E\u5BAB", symbol: "\u264F\uFE0E", sound: "Scorpio /\u02C8sk\u0254\u02D0rpio\u028A/", meaning: "\u6DF1\u5EA6\u3001\u8F6C\u5316" },
    { id: "sagittarius", name: "\u4EBA\u9A6C\u5BAB", symbol: "\u2650\uFE0E", sound: "Sagittarius /\u02CCs\xE6d\u0292\u026A\u02C8te\u0259ri\u0259s/", meaning: "\u65B9\u5411\u3001\u63A2\u7D22" },
    { id: "capricorn", name: "\u6469\u7FAF\u5BAB", symbol: "\u2651\uFE0E", sound: "Capricorn /\u02C8k\xE6pr\u026Ak\u0254\u02D0rn/", meaning: "\u81EA\u5F8B\u3001\u6500\u767B" },
    { id: "aquarius", name: "\u5B9D\u74F6\u5BAB", symbol: "\u2652\uFE0E", sound: "Aquarius /\u0259\u02C8kwe\u0259ri\u0259s/", meaning: "\u5206\u4EAB\u3001\u66F4\u65B0" },
    { id: "pisces", name: "\u53CC\u9C7C\u5BAB", symbol: "\u2653\uFE0E", sound: "Pisces /\u02C8pa\u026Asi\u02D0z/", meaning: "\u5171\u60C5\u3001\u6D41\u52A8" }
  ];
  var GEOMANTIC_DEFINITIONS = [
    { id: "populus", name: "\u4F17\u6C11", sound: "Populus", soundLabel: "\u62C9\u4E01\u540D", meaning: "\u6C47\u805A\u3001\u63A5\u7EB3", pattern: "2222" },
    { id: "tristitia", name: "\u60B2\u54C0", sound: "Tristitia", soundLabel: "\u62C9\u4E01\u540D", meaning: "\u6C89\u9759\u3001\u53CD\u601D", pattern: "2221" },
    { id: "albus", name: "\u767D", sound: "Albus", soundLabel: "\u62C9\u4E01\u540D", meaning: "\u6E05\u660E\u3001\u7406\u6027", pattern: "2212" },
    { id: "fortuna-major", name: "\u5927\u798F", sound: "Fortuna Major", soundLabel: "\u62C9\u4E01\u540D", meaning: "\u957F\u4E45\u6210\u679C\u3001\u5185\u5728\u7A33\u56FA", pattern: "2211" },
    { id: "rubeus", name: "\u8D64\u7EA2", sound: "Rubeus", soundLabel: "\u62C9\u4E01\u540D", meaning: "\u70ED\u60C5\u3001\u5F3A\u70C8", pattern: "2122" },
    { id: "acquisitio", name: "\u83B7\u5F97", sound: "Acquisitio", soundLabel: "\u62C9\u4E01\u540D", meaning: "\u6536\u83B7\u3001\u6210\u957F", pattern: "2121" },
    { id: "conjunctio", name: "\u8054\u7ED3", sound: "Conjunctio", soundLabel: "\u62C9\u4E01\u540D", meaning: "\u4F1A\u5408\u3001\u534F\u4F5C", pattern: "2112" },
    { id: "caput-draconis", name: "\u9F99\u9996", sound: "Caput Draconis", soundLabel: "\u62C9\u4E01\u540D", meaning: "\u5F00\u7AEF\u3001\u8FDB\u5165", pattern: "2111" },
    { id: "laetitia", name: "\u6B22\u6B23", sound: "Laetitia", soundLabel: "\u62C9\u4E01\u540D", meaning: "\u559C\u60A6\u3001\u4E0A\u5347", pattern: "1222" },
    { id: "carcer", name: "\u56DA\u7B3C", sound: "Carcer", soundLabel: "\u62C9\u4E01\u540D", meaning: "\u8FB9\u754C\u3001\u81EA\u5F8B", pattern: "1221" },
    { id: "amissio", name: "\u5931\u53BB", sound: "Amissio", soundLabel: "\u62C9\u4E01\u540D", meaning: "\u653E\u4E0B\u3001\u7CBE\u7B80", pattern: "1212" },
    { id: "puella", name: "\u5C11\u5973", sound: "Puella", soundLabel: "\u62C9\u4E01\u540D", meaning: "\u6E29\u548C\u3001\u534F\u8C03", pattern: "1211" },
    { id: "fortuna-minor", name: "\u5C0F\u798F", sound: "Fortuna Minor", soundLabel: "\u62C9\u4E01\u540D", meaning: "\u53CA\u65F6\u52A9\u529B\u3001\u77ED\u7A0B\u8FDB\u5C55", pattern: "1122" },
    { id: "puer", name: "\u5C11\u5E74", sound: "Puer", soundLabel: "\u62C9\u4E01\u540D", meaning: "\u52C7\u6C14\u3001\u53D1\u8D77", pattern: "1121" },
    { id: "cauda-draconis", name: "\u9F99\u5C3E", sound: "Cauda Draconis", soundLabel: "\u62C9\u4E01\u540D", meaning: "\u7ED3\u675F\u3001\u91CA\u653E", pattern: "1112" },
    { id: "via", name: "\u9053\u8DEF", sound: "Via", soundLabel: "\u62C9\u4E01\u540D", meaning: "\u884C\u8FDB\u3001\u53D8\u5316", pattern: "1111" }
  ];
  var GEOMANTIC_FIGURES = Object.freeze(
    GEOMANTIC_DEFINITIONS.map(
      (figure, index) => Object.freeze({
        ...figure,
        symbol: String.fromCodePoint(118496 + index)
      })
    )
  );
  var MILESTONE_SYMBOL_SYSTEMS = [
    {
      id: "elder-futhark",
      name: "Elder Futhark \xB7 \u53E4\u5F17\u8428\u514B",
      description: "\u4E8C\u5341\u56DB\u4E2A\u5362\u6069\u5B57\u7B26\uFF0C\u4F9D\u901A\u884C\u7684\u53E4\u5F17\u8428\u514B\u987A\u5E8F\u6392\u5217",
      symbols: ELDER_FUTHARK_RUNES
    },
    {
      id: "classical-planets",
      name: "\u53E4\u5178\u4E03\u884C\u661F",
      description: "\u6309\u4F20\u7EDF\u5730\u5FC3\u5C42\u6B21\u7531\u5185\u5411\u5916\uFF1A\u6708\u3001\u6C34\u3001\u91D1\u3001\u65E5\u3001\u706B\u3001\u6728\u3001\u571F",
      symbols: CLASSICAL_PLANETS
    },
    {
      id: "zodiac",
      name: "\u9EC4\u9053\u5341\u4E8C\u5BAB",
      description: "\u4F9D\u767D\u7F8A\u5BAB\u81F3\u53CC\u9C7C\u5BAB\u7684\u4F20\u7EDF\u9EC4\u9053\u987A\u5E8F\u6392\u5217",
      symbols: ZODIAC_SIGNS
    },
    {
      id: "geomancy",
      name: "\u963F\u62C9\u4F2F\u2014\u6B27\u6D32\u571F\u5360\u5341\u516D\u8C61",
      description: "\u56DB\u884C\u5355\u53CC\u70B9\u6784\u6210\u7684\u5341\u516D\u79CD\u571F\u5360\u56FE\u5F62\uFF0C\u6309 Unicode \u7ED3\u6784\u987A\u5E8F\u6392\u5217",
      symbols: GEOMANTIC_FIGURES
    }
  ];
  var MILESTONE_STAGES = Object.freeze(
    MILESTONE_SYMBOL_SYSTEMS.flatMap(
      (system) => system.symbols.map((reward) => ({ system, reward }))
    ).map(({ system, reward }, index) => {
      const cycle = index + 1;
      return Object.freeze({
        id: `${system.id}-${reward.id}`,
        cycle,
        thresholdSeconds: cycle * MILESTONE_CYCLE_SECONDS,
        systemId: system.id,
        systemName: system.name,
        reward
      });
    })
  );
  function evaluateMilestoneProgress(totalSeconds) {
    const safeTotal = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
    const completedCycles = Math.floor(safeTotal / MILESTONE_CYCLE_SECONDS);
    const unlockedCount = Math.min(completedCycles, MILESTONE_STAGES.length);
    const completedStages = MILESTONE_STAGES.slice(0, unlockedCount);
    const currentStage = completedStages[completedStages.length - 1];
    const nextStage = MILESTONE_STAGES[unlockedCount];
    const elapsedInCycle = safeTotal % MILESTONE_CYCLE_SECONDS;
    const completedHexagramsInCycle = Math.floor(elapsedInCycle / HEXAGRAM_STEP_SECONDS);
    const elapsedInHexagram = elapsedInCycle % HEXAGRAM_STEP_SECONDS;
    const currentHexagram = MILESTONE_HEXAGRAMS[completedHexagramsInCycle];
    const nextHexagram = MILESTONE_HEXAGRAMS[(completedHexagramsInCycle + 1) % HEXAGRAMS_PER_CYCLE];
    const hexagramProgress = elapsedInHexagram / HEXAGRAM_STEP_SECONDS;
    const remainingHexagramSeconds = HEXAGRAM_STEP_SECONDS - elapsedInHexagram;
    const cycleProgress = elapsedInCycle / MILESTONE_CYCLE_SECONDS;
    const remainingRewardSeconds = nextStage ? Math.max(0, nextStage.thresholdSeconds - safeTotal) : 0;
    return {
      totalSeconds: safeTotal,
      completedStages: [...completedStages],
      currentStage,
      nextStage,
      completedCycles,
      currentCycle: completedCycles + 1,
      currentHexagram,
      nextHexagram,
      completedHexagramsInCycle,
      hexagramProgress,
      remainingHexagramSeconds,
      cycleProgress,
      remainingRewardSeconds,
      progress: nextStage ? cycleProgress : 1,
      remainingSeconds: remainingRewardSeconds
    };
  }
  function buildMilestoneProgress(habits2, events2, runningTimer, now = Date.now()) {
    const durationHabitIds = new Set(
      habits2.filter((habit) => habit.type === "duration").map((habit) => habit.id)
    );
    let totalSeconds = 0;
    for (const habitId of durationHabitIds) {
      totalSeconds += cumulativeDurationSeconds(habitId, [...events2]);
    }
    if (runningTimer && durationHabitIds.has(runningTimer.habitId)) {
      totalSeconds += elapsedTimerSeconds(runningTimer, now);
    }
    return evaluateMilestoneProgress(totalSeconds);
  }

  // ../../src/modals.ts
  var WEEKDAYS = [
    { value: 1, label: "\u4E00" },
    { value: 2, label: "\u4E8C" },
    { value: 3, label: "\u4E09" },
    { value: 4, label: "\u56DB" },
    { value: 5, label: "\u4E94" },
    { value: 6, label: "\u516D" },
    { value: 0, label: "\u65E5" }
  ];
  var HabitModal = class extends Modal {
    constructor(app, options) {
      super(app);
      this.options = options;
    }
    onOpen() {
      this.modalEl.addClass("daymark-modal");
      const { contentEl } = this;
      contentEl.empty();
      contentEl.createEl("h2", {
        text: this.options.habit ? "\u7F16\u8F91\u9879\u76EE" : "\u65B0\u5EFA\u9879\u76EE"
      });
      if (this.options.habit) {
        contentEl.createEl("p", {
          cls: "setting-item-description",
          text: `\u76EE\u6807\u4E0E\u6267\u884C\u661F\u671F\u7684\u4FEE\u6539\u4ECE ${this.options.effectiveDate} \u8D77\u751F\u6548\u3002`
        });
      }
      const original = this.options.habit;
      const activeRule = original ? effectiveRule(original, this.options.effectiveDate) : void 0;
      let name = original?.name ?? "";
      let type = original?.type ?? "checkbox";
      let category = original?.category ?? "\u65E5\u5E38";
      let emoji = original?.emoji ?? "\u2728";
      let color = original?.color ?? "#7c6fcd";
      let unit = original?.unit ?? "";
      let target = String(
        original?.type === "duration" ? (activeRule?.target ?? 1800) / 60 : activeRule?.target ?? 1
      );
      let step = String(
        original?.type === "duration" ? original.step / 60 : original?.step ?? 1
      );
      const weekdays = new Set(activeRule?.weekdays ?? [0, 1, 2, 3, 4, 5, 6]);
      new Setting(contentEl).setName("\u540D\u79F0").addText((text) => {
        text.inputEl.setAttrs({ "aria-label": "\u9879\u76EE\u540D\u79F0", maxlength: "80" });
        text.setPlaceholder("\u4F8B\u5982\uFF1A\u953B\u70BC").setValue(name).onChange((value) => {
          name = value;
        });
      });
      const typeSetting = new Setting(contentEl).setName("\u8BB0\u5F55\u65B9\u5F0F");
      typeSetting.addDropdown((dropdown) => {
        dropdown.selectEl.setAttr("aria-label", "\u8BB0\u5F55\u65B9\u5F0F");
        dropdown.addOptions({
          checkbox: "\u5B8C\u6210\u578B",
          count: "\u6B21\u6570\u578B",
          duration: "\u65F6\u957F\u578B",
          text: "\u6587\u5B57\u578B"
        }).setValue(type).setDisabled(Boolean(original)).onChange((value) => {
          type = value;
          if (type === "duration") {
            unit = "\u5206\u949F";
            target = "30";
            step = "5";
          } else if (type === "count") {
            unit = "\u6B21";
            target = "1";
            step = "1";
          }
          updateConditionalFields();
        });
      });
      if (original) typeSetting.setDesc("\u5DF2\u6709\u9879\u76EE\u6682\u4E0D\u652F\u6301\u66F4\u6539\u7C7B\u578B");
      new Setting(contentEl).setName("\u5206\u7C7B").addText((text) => {
        text.inputEl.setAttrs({ "aria-label": "\u9879\u76EE\u5206\u7C7B", maxlength: "40" });
        text.setValue(category).onChange((value) => {
          category = value;
        });
      });
      new Setting(contentEl).setName("\u56FE\u6807").setDesc("\u63A8\u8350\u4F7F\u7528\u4E00\u4E2A Emoji").addText((text) => {
        text.inputEl.setAttrs({ "aria-label": "\u9879\u76EE\u56FE\u6807", maxlength: "16" });
        text.setValue(emoji).onChange((value) => {
          emoji = value;
        });
      });
      new Setting(contentEl).setName("\u989C\u8272").addColorPicker(
        (picker) => picker.setValue(color).onChange((value) => {
          color = value;
        })
      );
      let targetInput;
      const targetSetting = new Setting(contentEl).setName("\u6BCF\u65E5\u76EE\u6807").addText((text) => {
        targetInput = text;
        text.inputEl.type = "number";
        text.inputEl.min = "0.02";
        text.inputEl.step = "any";
        text.inputEl.setAttr("aria-label", "\u6BCF\u65E5\u76EE\u6807\uFF1B\u65F6\u957F\u6309\u5206\u949F\u586B\u5199");
        text.setValue(target).onChange((value) => {
          target = value;
        });
      });
      let stepInput;
      const stepSetting = new Setting(contentEl).setName("\u5FEB\u6377\u589E\u52A0").setDesc("\u65F6\u957F\u6309\u5206\u949F\u586B\u5199").addText((text) => {
        stepInput = text;
        text.inputEl.type = "number";
        text.inputEl.min = "0.02";
        text.inputEl.step = "any";
        text.inputEl.setAttr("aria-label", "\u5FEB\u6377\u589E\u52A0\u503C\uFF1B\u65F6\u957F\u6309\u5206\u949F\u586B\u5199");
        text.setValue(step).onChange((value) => {
          step = value;
        });
      });
      let unitInput;
      const unitSetting = new Setting(contentEl).setName("\u5355\u4F4D").addText((text) => {
        unitInput = text;
        text.setValue(unit).setDisabled(Boolean(original)).onChange((value) => {
          unit = value;
        });
        text.inputEl.setAttrs({ "aria-label": "\u8BA1\u6570\u5355\u4F4D", maxlength: "16" });
      });
      if (original) unitSetting.setDesc("\u4E3A\u907F\u514D\u6539\u53D8\u5386\u53F2\u8BB0\u5F55\u542B\u4E49\uFF0C\u5DF2\u6709\u9879\u76EE\u4E0D\u80FD\u66F4\u6539\u5355\u4F4D");
      const scheduleSetting = new Setting(contentEl).setName("\u6267\u884C\u661F\u671F").setDesc("\u672A\u9009\u62E9\u7684\u65E5\u671F\u4E0D\u8BA1\u5165\u5B8C\u6210\u7387");
      const schedule = scheduleSetting.controlEl.createDiv("daymark-weekdays");
      for (const day of WEEKDAYS) {
        const label = schedule.createEl("label", { cls: "daymark-weekday" });
        const input = label.createEl("input", { type: "checkbox" });
        input.setAttr("aria-label", `\u661F\u671F${day.label}`);
        input.checked = weekdays.has(day.value);
        input.addEventListener("change", () => {
          if (input.checked) weekdays.add(day.value);
          else weekdays.delete(day.value);
        });
        label.createSpan({ text: day.label });
      }
      const updateConditionalFields = () => {
        const showNumberFields = type === "count" || type === "duration";
        targetSetting.settingEl.toggleClass("daymark-hidden", !showNumberFields);
        stepSetting.settingEl.toggleClass("daymark-hidden", !showNumberFields);
        unitSetting.settingEl.toggleClass("daymark-hidden", type !== "count");
        targetInput?.setValue(target);
        stepInput?.setValue(step);
        unitInput?.setValue(unit);
      };
      updateConditionalFields();
      new Setting(contentEl).addButton(
        (button) => button.setButtonText("\u53D6\u6D88").onClick(() => {
          this.close();
        })
      ).addButton(
        (button) => button.setButtonText("\u4FDD\u5B58").setCta().onClick(async () => {
          const cleanName = name.trim();
          if (!cleanName) {
            new Notice("\u8BF7\u586B\u5199\u9879\u76EE\u540D\u79F0");
            return;
          }
          if (weekdays.size === 0) {
            new Notice("\u8BF7\u81F3\u5C11\u9009\u62E9\u4E00\u5929");
            return;
          }
          const parsedTarget = Number(target);
          const parsedStep = Number(step);
          const normalizedTarget = type === "duration" ? Math.round(parsedTarget * 60) : type === "count" ? parsedTarget : 1;
          const normalizedStep = type === "duration" ? Math.round(parsedStep * 60) : type === "count" ? parsedStep : 1;
          if ((type === "count" || type === "duration") && (!Number.isFinite(normalizedTarget) || normalizedTarget <= 0 || !Number.isFinite(normalizedStep) || normalizedStep <= 0)) {
            new Notice(type === "duration" ? "\u76EE\u6807\u548C\u5FEB\u6377\u589E\u52A0\u503C\u81F3\u5C11\u4E3A 1 \u79D2" : "\u76EE\u6807\u548C\u5FEB\u6377\u589E\u52A0\u503C\u5FC5\u987B\u5927\u4E8E 0");
            return;
          }
          const habit = original ? {
            ...original,
            rules: original.rules.map((rule) => ({ ...rule, weekdays: [...rule.weekdays] }))
          } : createHabit(cleanName, type, this.options.effectiveDate, this.options.nextOrder);
          habit.name = cleanName;
          habit.category = category.trim() || "\u65E5\u5E38";
          habit.emoji = emoji.trim() || "\u2728";
          habit.color = color;
          habit.unit = type === "duration" ? "\u5206\u949F" : type === "count" ? unit.trim() || "\u6B21" : "";
          habit.step = normalizedStep;
          habit.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
          const desiredDays = [...weekdays].sort((a, b) => a - b);
          const previousRule = effectiveRule(habit, this.options.effectiveDate);
          const desiredEnabled = previousRule?.enabled ?? true;
          const ruleChanged = !previousRule || previousRule.target !== normalizedTarget || previousRule.weekdays.join(",") !== desiredDays.join(",");
          if (ruleChanged) {
            const now = (/* @__PURE__ */ new Date()).toISOString();
            habit.rules.push({
              id: generateId("rule"),
              effectiveFrom: this.options.effectiveDate,
              enabled: desiredEnabled,
              weekdays: desiredDays,
              target: normalizedTarget,
              createdAt: now
            });
          }
          try {
            button.setDisabled(true);
            await this.options.onSubmit(habit);
            this.close();
          } catch (error) {
            button.setDisabled(false);
            new Notice(error instanceof Error ? error.message : String(error));
          }
        })
      );
    }
  };
  var TextRecordModal = class extends Modal {
    constructor(app, title, onSubmit) {
      super(app);
      this.title = title;
      this.onSubmit = onSubmit;
    }
    onOpen() {
      this.modalEl.addClass("daymark-modal");
      this.contentEl.createEl("h2", { text: this.title });
      let value = "";
      new Setting(this.contentEl).setName("\u8BB0\u5F55\u5185\u5BB9").addTextArea((area) => {
        area.setPlaceholder("\u5199\u4E0B\u8FD9\u5929\u7684\u8BB0\u5F55\u2026\u2026").onChange((next) => {
          value = next;
        });
        area.inputEl.rows = 6;
        area.inputEl.setAttrs({ "aria-label": "\u6587\u5B57\u8BB0\u5F55\u5185\u5BB9", maxlength: "10000" });
        area.inputEl.addClass("daymark-record-textarea");
        window.setTimeout(() => area.inputEl.focus(), 50);
      });
      new Setting(this.contentEl).addButton((button) => button.setButtonText("\u53D6\u6D88").onClick(() => this.close())).addButton(
        (button) => button.setButtonText("\u4FDD\u5B58\u8BB0\u5F55").setCta().onClick(async () => {
          if (!value.trim()) {
            new Notice("\u8BB0\u5F55\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A");
            return;
          }
          try {
            button.setDisabled(true);
            await this.onSubmit(value.trim());
            this.close();
          } catch (error) {
            button.setDisabled(false);
            new Notice(error instanceof Error ? error.message : String(error));
          }
        })
      );
    }
  };
  var NumericRecordModal = class extends Modal {
    constructor(app, habit, onSubmit) {
      super(app);
      this.habit = habit;
      this.onSubmit = onSubmit;
    }
    onOpen() {
      this.modalEl.addClass("daymark-modal");
      this.contentEl.createEl("h2", { text: `\u8BB0\u5F55 ${this.habit.name}` });
      let value = this.habit.type === "duration" ? String(this.habit.step / 60) : String(this.habit.step);
      let note = "";
      new Setting(this.contentEl).setName(this.habit.type === "duration" ? "\u589E\u52A0\u65F6\u957F\uFF08\u5206\u949F\uFF09" : `\u589E\u52A0\u6570\u91CF\uFF08${this.habit.unit}\uFF09`).addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = this.habit.type === "duration" ? "0.02" : "0.001";
        text.inputEl.step = "any";
        text.inputEl.setAttr("aria-label", this.habit.type === "duration" ? "\u589E\u52A0\u5206\u949F\u6570" : "\u589E\u52A0\u6570\u91CF");
        text.setValue(value).onChange((next) => {
          value = next;
        });
      });
      new Setting(this.contentEl).setName("\u5907\u6CE8\uFF08\u53EF\u9009\uFF09").addTextArea((area) => {
        area.inputEl.setAttrs({ "aria-label": "\u8BB0\u5F55\u5907\u6CE8", maxlength: "1000" });
        area.onChange((next) => {
          note = next;
        });
      });
      new Setting(this.contentEl).addButton((button) => button.setButtonText("\u53D6\u6D88").onClick(() => this.close())).addButton(
        (button) => button.setButtonText("\u6DFB\u52A0").setCta().onClick(async () => {
          const parsed = Number(value);
          if (!Number.isFinite(parsed) || parsed <= 0) {
            new Notice("\u8BF7\u8F93\u5165\u5927\u4E8E 0 \u7684\u6570\u5B57");
            return;
          }
          const baseValue = this.habit.type === "duration" ? Math.round(parsed * 60) : parsed;
          if (!Number.isFinite(baseValue) || baseValue <= 0) {
            new Notice(this.habit.type === "duration" ? "\u65F6\u957F\u81F3\u5C11\u4E3A 1 \u79D2" : "\u8BF7\u8F93\u5165\u5927\u4E8E 0 \u7684\u6570\u5B57");
            return;
          }
          try {
            button.setDisabled(true);
            await this.onSubmit(baseValue, note.trim());
            this.close();
          } catch (error) {
            button.setDisabled(false);
            new Notice(error instanceof Error ? error.message : String(error));
          }
        })
      );
    }
  };
  var IssuesModal = class extends Modal {
    constructor(app, issues) {
      super(app);
      this.issues = issues;
    }
    onOpen() {
      this.modalEl.addClass("daymark-modal");
      this.contentEl.createEl("h2", { text: "\u6570\u636E\u68C0\u67E5" });
      this.contentEl.createEl("p", {
        text: "\u4EE5\u4E0B\u6587\u4EF6\u672A\u88AB\u81EA\u52A8\u6539\u5199\uFF0C\u8BF7\u624B\u52A8\u68C0\u67E5\u3002\u5176\u4ED6\u6709\u6548\u8BB0\u5F55\u4ECD\u53EF\u6B63\u5E38\u4F7F\u7528\u3002"
      });
      const list = this.contentEl.createEl("ul", { cls: "daymark-issues" });
      for (const issue of this.issues) {
        const item = list.createEl("li");
        item.createEl("strong", { text: issue.path });
        item.createEl("div", { text: issue.message });
      }
    }
  };

  // ../../src/statistics.ts
  function activeBaseEvents2(events2) {
    const unique = deduplicateEvents([...events2]);
    const retractedIds = new Set(
      unique.filter((event) => event.type === "retract" && event.targetEventId).map((event) => event.targetEventId)
    );
    return unique.filter((event) => event.type !== "retract" && !retractedIds.has(event.id));
  }
  function resolveStatisticsRange(range, today2, events2) {
    keyToDate(today2);
    if (range === "7d") return { start: addDays(today2, -6), end: today2 };
    if (range === "30d") return { start: addDays(today2, -29), end: today2 };
    if (range === "90d") return { start: addDays(today2, -89), end: today2 };
    const earliest = activeBaseEvents2(events2).map((event) => event.occurredOn).sort((a, b) => a.localeCompare(b))[0];
    return { start: earliest ?? today2, end: today2 };
  }
  var MAX_DENSE_STATISTICS_DAYS = 2e4;
  var MILLISECONDS_PER_DAY = 864e5;
  function calendarDaysInclusive(start2, end) {
    const startDate = keyToDate(start2);
    const endDate = keyToDate(end);
    if (start2 > end) return 0;
    return Math.round((endDate.getTime() - startDate.getTime()) / MILLISECONDS_PER_DAY) + 1;
  }
  function emptyDailyStatistics(date) {
    return { date, durationSeconds: 0, completions: 0, records: 0 };
  }
  function numericContribution(event) {
    return event.type === "add" && typeof event.value === "number" && Number.isFinite(event.value) && event.value > 0 ? event.value : 0;
  }
  function buildRangeStatistics(habits2, events2, start2, end) {
    const calendarDays = calendarDaysInclusive(start2, end);
    const usesSparseTimeline = calendarDays > MAX_DENSE_STATISTICS_DAYS;
    const dates = usesSparseTimeline ? [start2, ...end === start2 ? [] : [end]] : daysBetweenInclusive(start2, end);
    const dailyByDate = new Map(
      dates.map((date) => [date, emptyDailyStatistics(date)])
    );
    const accumulators = /* @__PURE__ */ new Map();
    for (const habit of habits2) {
      if (!accumulators.has(habit.id)) {
        accumulators.set(habit.id, { habit, total: 0, records: 0, eventsByDate: /* @__PURE__ */ new Map() });
      }
    }
    for (const event of activeBaseEvents2(events2)) {
      const accumulator = accumulators.get(event.habitId);
      if (!accumulator) continue;
      let daily2 = dailyByDate.get(event.occurredOn);
      if (!daily2 && usesSparseTimeline && event.occurredOn >= start2 && event.occurredOn <= end) {
        try {
          keyToDate(event.occurredOn);
          daily2 = emptyDailyStatistics(event.occurredOn);
          dailyByDate.set(event.occurredOn, daily2);
        } catch {
        }
      }
      if (!daily2) continue;
      daily2.records += 1;
      accumulator.records += 1;
      const dayEvents = accumulator.eventsByDate.get(event.occurredOn) ?? [];
      dayEvents.push(event);
      accumulator.eventsByDate.set(event.occurredOn, dayEvents);
      if (accumulator.habit.type === "duration") {
        const seconds = numericContribution(event);
        accumulator.total += seconds;
        daily2.durationSeconds += seconds;
      } else if (accumulator.habit.type === "count") {
        accumulator.total += numericContribution(event);
      } else if (accumulator.habit.type === "text" && event.type === "note") {
        accumulator.total += 1;
      }
    }
    const habitStatistics = [];
    let completions = 0;
    for (const accumulator of accumulators.values()) {
      let completedDays = 0;
      for (const [date, dayEvents] of accumulator.eventsByDate) {
        if (projectHabitDay(accumulator.habit, date, dayEvents).completed) {
          completedDays += 1;
          completions += 1;
          const daily2 = dailyByDate.get(date);
          if (daily2) daily2.completions += 1;
        }
      }
      habitStatistics.push({
        habitId: accumulator.habit.id,
        total: accumulator.habit.type === "checkbox" ? completedDays : accumulator.total,
        activeDays: accumulator.eventsByDate.size,
        completedDays,
        records: accumulator.records
      });
    }
    const daily = [...dailyByDate.values()].sort((left, right) => left.date.localeCompare(right.date));
    return {
      start: start2,
      end,
      activeDays: daily.reduce((total, day) => total + (day.records > 0 ? 1 : 0), 0),
      completions,
      records: daily.reduce((total, day) => total + day.records, 0),
      durationSeconds: daily.reduce((total, day) => total + day.durationSeconds, 0),
      daily,
      habits: habitStatistics
    };
  }

  // ../../src/view.ts
  function formatDuration(seconds) {
    const safe = Math.max(0, Math.round(seconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor(safe % 3600 / 60);
    const rest = safe % 60;
    if (hours > 0) return `${hours}\u5C0F\u65F6${minutes > 0 ? `${minutes}\u5206` : ""}`;
    if (minutes > 0) return `${minutes}\u5206${rest > 0 ? `${rest}\u79D2` : ""}`;
    return `${rest}\u79D2`;
  }
  function formatClock(seconds, includeHours = false) {
    const safe = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor(safe % 3600 / 60);
    const rest = safe % 60;
    return hours > 0 || includeHours ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}` : `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }
  function formatNumber(value) {
    return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 3 }).format(value);
  }
  var liveTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  var liveDateFormatter = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short"
  });
  var MYSTIC_HEXAGRAMS = Array.from(
    { length: 64 },
    (_, index) => String.fromCodePoint(19904 + index)
  );
  function formatShortDate(key) {
    const date = keyToDate(key);
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
  }
  function displayValue(habit, value) {
    return habit.type === "duration" ? formatDuration(value) : `${value} ${habit.unit}`.trim();
  }
  function targetLabel(habit, date) {
    const target = effectiveRule(habit, date)?.target ?? habit.rules[0]?.target ?? 0;
    return habit.type === "duration" ? `\u76EE\u6807 ${formatDuration(target)}` : habit.type === "count" ? `\u76EE\u6807 ${target} ${habit.unit}`.trim() : "";
  }
  function numericProgress(habit, date, value) {
    const target = effectiveRule(habit, date)?.target ?? habit.rules[0]?.target ?? 1;
    return Math.min(1, Math.max(0, value / target));
  }
  var DaymarkView = class extends ItemView {
    constructor(leaf, controller2) {
      super(leaf);
      this.controller = controller2;
      this.backdropSymbols = [
        ...MYSTIC_HEXAGRAMS.map((symbol) => ({ symbol, cls: "daymark-mystic-hexagram" })),
        ...ELDER_FUTHARK_RUNES.map((rune) => ({ symbol: rune.symbol, cls: "daymark-mystic-rune" }))
      ];
      this.backdropStyles = this.backdropSymbols.map(() => ({
        x: `${Math.round(Math.random() * 24 - 12)}px`,
        y: `${Math.round(Math.random() * 30 - 15)}px`,
        scale: (0.75 + Math.random() * 0.65).toFixed(2),
        opacity: (0.4 + Math.random() * 0.6).toFixed(2),
        color: ["#9ce8d2", "#a3bfdc", "#c3a6ed", "#d4b77d"][Math.floor(Math.random() * 4)]
      }));
      this.activeTab = "today";
      this.statisticsRange = "30d";
      this.cumulativeDurations = /* @__PURE__ */ new Map();
      this.liveDurationLabels = [];
      this.liveAverageLabels = [];
      this.activityBusy = false;
      for (let index = this.backdropSymbols.length - 1; index > 0; index -= 1) {
        const other = Math.floor(Math.random() * (index + 1));
        [this.backdropSymbols[index], this.backdropSymbols[other]] = [this.backdropSymbols[other], this.backdropSymbols[index]];
      }
      this.selectedDate = todayKey(/* @__PURE__ */ new Date(), controller2.settings.timezone);
      this.lastKnownToday = this.selectedDate;
    }
    getViewType() {
      return VIEW_TYPE_DAYMARK;
    }
    getDisplayText() {
      return "\u65E5\u8FF9";
    }
    getIcon() {
      return "calendar-check";
    }
    async onOpen() {
      this.contentEl.addClass("daymark-view");
      this.contentEl.style.setProperty("--daymark-glow-x", `${8 + Math.round(Math.random() * 70)}%`);
      this.contentEl.style.setProperty("--daymark-glow-y", `${5 + Math.round(Math.random() * 45)}%`);
      this.contentEl.style.setProperty("--daymark-glow-angle", `${135 + Math.round(Math.random() * 40)}deg`);
      this.restartLiveUpdates();
      this.render();
    }
    async onClose() {
      if (this.liveUpdateInterval !== void 0) {
        window.clearInterval(this.liveUpdateInterval);
        this.liveUpdateInterval = void 0;
      }
    }
    refresh() {
      this.render();
    }
    recoverFromSuspend() {
      this.restartLiveUpdates();
      const today2 = todayKey(/* @__PURE__ */ new Date(), this.controller.settings.timezone);
      const selectedWasToday = this.selectedDate === this.lastKnownToday;
      this.lastKnownToday = today2;
      if (selectedWasToday) this.selectedDate = today2;
      this.render();
    }
    restartLiveUpdates() {
      if (this.liveUpdateInterval !== void 0) {
        window.clearInterval(this.liveUpdateInterval);
      }
      this.liveUpdateInterval = window.setInterval(() => {
        this.updateLiveClock();
        this.updateRunningTimerLabels();
        this.rollOverToday();
      }, 1e3);
    }
    rollOverToday() {
      const today2 = todayKey(/* @__PURE__ */ new Date(), this.controller.settings.timezone);
      if (today2 === this.lastKnownToday) return;
      const selectedWasToday = this.selectedDate === this.lastKnownToday;
      this.lastKnownToday = today2;
      if (selectedWasToday) this.selectedDate = today2;
      this.render();
    }
    render() {
      const { contentEl } = this;
      const active = document.activeElement instanceof HTMLElement && contentEl.contains(document.activeElement) ? document.activeElement : void 0;
      const focusLabel = active?.getAttribute("aria-label") ?? void 0;
      const focusText = active?.textContent?.trim();
      const focusHabitId = active?.closest("[data-habit-id]")?.dataset.habitId;
      this.cumulativeDurations = new Map(
        this.controller.habits.filter((habit) => habit.type === "duration").map((habit) => [habit.id, cumulativeDurationSeconds(habit.id, this.controller.events)])
      );
      this.liveDurationLabels = [];
      this.liveAverageLabels = [];
      this.milestoneLive = void 0;
      contentEl.empty();
      this.renderMysticBackdrop(contentEl);
      this.liveRegion = contentEl.createDiv("daymark-sr-only");
      this.liveRegion.setAttrs({ role: "status", "aria-live": "polite", "aria-atomic": "true" });
      const shell = contentEl.createDiv("daymark-shell");
      this.renderTopbar(shell);
      this.renderTabs(shell);
      this.renderRunningTimer(shell);
      if (this.activeTab === "today") this.renderToday(shell);
      else if (this.activeTab === "gallery") this.renderGallery(shell);
      else this.renderHistory(shell);
      this.updateRunningTimerLabels();
      this.updateLiveClock();
      if (active) {
        window.setTimeout(() => {
          const controls = [...contentEl.querySelectorAll("button, input, select, textarea")];
          const exact = focusLabel ? controls.find((element) => element.getAttribute("aria-label") === focusLabel) : void 0;
          const byText = !exact && focusText ? controls.find((element) => element.textContent?.trim() === focusText) : void 0;
          const cardFallback = focusHabitId ? contentEl.querySelector(`[data-habit-id="${focusHabitId}"] button`) : void 0;
          (exact ?? byText ?? cardFallback)?.focus();
        }, 0);
      }
    }
    renderMysticBackdrop(container) {
      const backdrop = container.createDiv({
        cls: "daymark-mystic-backdrop",
        attr: { "aria-hidden": "true" }
      });
      for (const [index, item] of this.backdropSymbols.entries()) {
        const glyph = backdrop.createSpan({ cls: item.cls, text: item.symbol });
        const style = this.backdropStyles[index];
        glyph.style.setProperty("--glyph-x", style.x);
        glyph.style.setProperty("--glyph-y", style.y);
        glyph.style.setProperty("--glyph-scale", style.scale);
        glyph.style.opacity = style.opacity;
        glyph.style.color = style.color;
      }
    }
    renderTopbar(container) {
      const topbar = container.createDiv("daymark-topbar");
      const brand = topbar.createDiv("daymark-brand");
      const mark = brand.createSpan({ cls: "daymark-brand-mark", attr: { "aria-hidden": "true" } });
      setIcon(mark, "sprout");
      const brandText = brand.createDiv();
      const titleRow = brandText.createDiv("daymark-brand-title-row");
      titleRow.createEl("h2", { text: "\u65E5\u8FF9" });
      this.liveClockElement = titleRow.createEl("time", {
        cls: "daymark-live-clock",
        attr: { "aria-label": "\u5F53\u524D\u65F6\u95F4" }
      });
      this.liveClockTimeLabel = this.liveClockElement.createEl("strong");
      const brandMeta = brandText.createDiv("daymark-brand-meta");
      brandMeta.createSpan({ text: "\u8BA9\u6BCF\u4E00\u70B9\u79EF\u7D2F\uFF0C\u90FD\u6709\u8FF9\u53EF\u5FAA" });
      this.liveClockDateLabel = brandMeta.createSpan("daymark-live-date");
      const actions = topbar.createDiv("daymark-top-actions");
      if (this.controller.issues.length > 0) {
        const issueButton = actions.createEl("button", {
          cls: "clickable-icon daymark-issue-button",
          attr: { "aria-label": `${this.controller.issues.length} \u4E2A\u6570\u636E\u95EE\u9898` }
        });
        setIcon(issueButton, "triangle-alert");
        issueButton.createSpan({ text: String(this.controller.issues.length) });
        issueButton.addEventListener("click", () => {
          new IssuesModal(this.app, this.controller.issues).open();
        });
      }
      const addButton = actions.createEl("button", {
        cls: "clickable-icon daymark-new-habit",
        attr: { "aria-label": "\u65B0\u5EFA\u9879\u76EE" }
      });
      setIcon(addButton, "plus");
      addButton.createSpan({ text: "\u65B0\u5EFA" });
      addButton.addEventListener("click", () => this.controller.openHabitEditor());
      const settingsButton = actions.createEl("button", {
        cls: "clickable-icon",
        attr: { "aria-label": "\u65E5\u8FF9\u8BBE\u7F6E" }
      });
      setIcon(settingsButton, "settings-2");
      settingsButton.addEventListener("click", () => this.controller.openSettings());
    }
    renderTabs(container) {
      const tabs = container.createDiv("daymark-tabs");
      tabs.setAttr("role", "tablist");
      for (const [tab, label, icon] of [
        ["today", "\u65E5\u5E38\u6253\u5361", "circle-check-big"],
        ["history", "\u79EF\u7D2F\u7EDF\u8BA1", "chart-no-axes-column-increasing"],
        ["gallery", "Blender \u5C55\u67DC", "box"]
      ]) {
        const button = tabs.createEl("button", {
          cls: this.activeTab === tab ? "is-active" : "",
          attr: {
            role: "tab",
            "aria-selected": String(this.activeTab === tab)
          }
        });
        const iconEl = button.createSpan();
        setIcon(iconEl, icon);
        button.createSpan({ text: label });
        button.addEventListener("click", () => {
          this.activeTab = tab;
          this.render();
        });
        button.addEventListener("keydown", (event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const order = ["today", "history", "gallery"];
          this.activeTab = order[(order.indexOf(this.activeTab) + (event.key === "ArrowRight" ? 1 : 2)) % order.length];
          this.render();
          window.setTimeout(() => {
            this.contentEl.querySelector('[role="tab"][aria-selected="true"]')?.focus();
          }, 0);
        });
      }
    }
    renderGallery(container) {
      const gallery = container.createDiv("daymark-gallery");
      gallery.createEl("h2", { text: "Blender \u5C55\u67DC" });
      gallery.createEl("p", { text: `\u5149\u5F71\u4E0E\u5F62\u4F53 \xB7 ${this.controller.galleryItems.length} \u4EF6\u4F5C\u54C1` });
      gallery.createEl("p", { cls: "daymark-gallery-help", text: `\u5BFC\u5165\u6E32\u67D3\u56FE\u7247\uFF0C\u6216\u5C06\u56FE\u7247\u653E\u5165 ${this.controller.settings.dataFolder}/Blender\u5C55\u67DC\u3002\u652F\u6301 PNG\u3001JPG\u3001WEBP\u3001GIF\u3001AVIF\uFF0C\u6BCF\u5F20\u6700\u591A 40 MB\u3002` });
      const input = gallery.createEl("input", { attr: { type: "file", accept: ".png,.jpg,.jpeg,.webp,.gif,.avif", multiple: "", "aria-label": "\u9009\u62E9\u6E32\u67D3\u4F5C\u54C1" } });
      input.hidden = true;
      const add = gallery.createEl("button", { cls: "mod-cta", text: "\uFF0B \u6DFB\u52A0\u6E32\u67D3\u4F5C\u54C1" });
      add.addEventListener("click", () => input.click());
      input.addEventListener("change", async () => {
        const files = Array.from(input.files ?? []);
        if (!files.length) return;
        add.disabled = true;
        add.setText("\u6B63\u5728\u5BFC\u5165\u2026");
        try {
          await this.controller.importGalleryImages(files);
        } catch (error) {
          new Notice(error instanceof Error ? error.message : String(error));
        } finally {
          add.disabled = false;
          add.setText("\uFF0B \u6DFB\u52A0\u6E32\u67D3\u4F5C\u54C1");
          input.value = "";
        }
      });
      if (!this.controller.galleryItems.length) {
        gallery.createDiv({ cls: "daymark-gallery-empty", text: "\u5C55\u67DC\u6B63\u7B49\u5F85\u7B2C\u4E00\u675F\u5149\u3002\u6DFB\u52A0\u4F60\u7684\u7B2C\u4E00\u5F20\u6E32\u67D3\u4F5C\u54C1\u5427\u3002" });
      }
      const grid = gallery.createDiv("daymark-gallery-grid");
      for (const item of this.controller.galleryItems) {
        const card = grid.createEl("article", { cls: "daymark-gallery-card" });
        const preview = card.createEl("button", { cls: "daymark-gallery-preview", attr: { "aria-label": `\u653E\u5927\u4F5C\u54C1\uFF1A${item.title}` } });
        const img = preview.createEl("img", { attr: { src: item.url, alt: item.title, loading: "lazy", decoding: "async" } });
        img.addEventListener("error", () => {
          img.remove();
          preview.setText("\u56FE\u7247\u672A\u5C31\u7EEA\uFF0C\u8BF7\u68C0\u67E5\u6587\u4EF6\u662F\u5426\u5DF2\u540C\u6B65");
        }, { once: true });
        preview.addEventListener("click", () => new GalleryImageModal(this.app, item).open());
        card.createEl("h3", { text: item.title });
        card.createEl("p", { text: item.description || "\u8FD8\u6CA1\u6709\u4F5C\u54C1\u8BF4\u660E" });
        if (item.warning) card.createEl("p", { text: item.warning });
        card.createEl("button", { text: "\u7F16\u8F91\u8BF4\u660E", attr: { "aria-label": `\u7F16\u8F91\u4F5C\u54C1\uFF1A${item.title}` } }).addEventListener(
          "click",
          () => new GalleryEditModal(this.app, item, (title, description) => this.controller.saveGalleryDetails(item.path, title, description)).open()
        );
      }
    }
    renderRunningTimer(container) {
      container.createDiv("daymark-rest-banner").createSpan({
        cls: "daymark-rest-countdown",
        text: "\u6BCF 30 \u5206\u949F\u63D0\u9192\u4F11\u606F \xB7 \u72EC\u7ACB\u8FD0\u884C",
        attr: { "data-rest-countdown": "true" }
      });
      const running = this.controller.deviceState.runningTimer;
      if (!running) return;
      const habit = this.controller.habits.find((item) => item.id === running.habitId);
      if (!habit) return;
      const banner = container.createDiv("daymark-running-banner");
      const heading = banner.createDiv("daymark-focus-heading");
      const pulse = heading.createSpan("daymark-running-pulse");
      pulse.setAttr("aria-hidden", "true");
      heading.createSpan({ text: running.pausedAt === void 0 ? "\u6B63\u5728\u4E13\u6CE8" : "\u4F11\u606F\u4E2D \xB7 \u4EFB\u52A1\u5DF2\u6682\u505C" });
      heading.createSpan({ cls: "daymark-focus-date", text: running.date });
      const body = banner.createDiv("daymark-focus-body");
      const copy = body.createDiv("daymark-focus-copy");
      copy.createEl("strong", { cls: "daymark-focus-name", text: `${habit.emoji} ${habit.name}` });
      const clock = copy.createDiv("daymark-focus-clock");
      clock.createSpan({ text: "\u672C\u6B21\u8BA1\u65F6" });
      clock.createEl("strong", { cls: "daymark-timer-label", text: "00:00" });
      banner.dataset.timerStarted = String(running.startedAt);
      banner.dataset.timerPrefix = "";
      const stop = body.createEl("button", {
        cls: "daymark-focus-stop",
        text: "\u505C\u6B62\u5E76\u4FDD\u5B58",
        attr: { "aria-label": `\u505C\u6B62 ${habit.name} \u7684\u8BA1\u65F6\u5E76\u4FDD\u5B58` }
      });
      stop.addEventListener("click", async () => {
        stop.disabled = true;
        try {
          await this.controller.toggleTimer(habit, running.date);
          this.announce(`${habit.name} \u7684\u8BA1\u65F6\u5DF2\u4FDD\u5B58`);
        } catch (error) {
          new Notice(error instanceof Error ? error.message : String(error));
          stop.disabled = false;
        }
      });
    }
    renderDateNavigator(container) {
      const nav = container.createDiv("daymark-date-nav");
      const previous = nav.createEl("button", {
        cls: "clickable-icon",
        attr: { "aria-label": "\u524D\u4E00\u5929" }
      });
      setIcon(previous, "chevron-left");
      previous.addEventListener("click", () => {
        this.selectedDate = addDays(this.selectedDate, -1);
        this.render();
      });
      const dateWrap = nav.createDiv("daymark-date-label");
      dateWrap.createEl("strong", { text: formatDateLabel(this.selectedDate) });
      dateWrap.createSpan({ text: this.selectedDate });
      const input = dateWrap.createEl("input", {
        type: "date",
        attr: {
          value: this.selectedDate,
          max: todayKey(/* @__PURE__ */ new Date(), this.controller.settings.timezone),
          "aria-label": "\u9009\u62E9\u6253\u5361\u65E5\u671F"
        }
      });
      input.addEventListener("change", () => {
        if (input.value) {
          this.selectedDate = input.value;
          this.render();
        }
      });
      const next = nav.createEl("button", {
        cls: "clickable-icon",
        attr: { "aria-label": "\u540E\u4E00\u5929" }
      });
      setIcon(next, "chevron-right");
      const today2 = todayKey(/* @__PURE__ */ new Date(), this.controller.settings.timezone);
      next.disabled = this.selectedDate >= today2;
      next.addEventListener("click", () => {
        if (this.selectedDate < today2) {
          this.selectedDate = addDays(this.selectedDate, 1);
          this.render();
        }
      });
      if (this.selectedDate !== today2) {
        const todayButton = nav.createEl("button", {
          cls: "daymark-today-button",
          text: "\u4ECA\u5929"
        });
        todayButton.addEventListener("click", () => {
          this.selectedDate = today2;
          this.render();
        });
      }
    }
    renderToday(container) {
      this.renderDateNavigator(container);
      this.renderActivityList(container);
      const today2 = todayKey(/* @__PURE__ */ new Date(), this.controller.settings.timezone);
      if (this.selectedDate === today2) {
        this.renderDailyIChing(container, today2);
        this.renderDailyRitualCheckIn(container, today2);
      }
      const habits2 = this.controller.habits;
      const events2 = this.controller.events.filter((event) => event.occurredOn === this.selectedDate);
      const summary = summarizeDay(this.selectedDate, habits2, events2);
      const summaryEl = container.createDiv("daymark-daily-summary");
      const copy = summaryEl.createDiv("daymark-summary-copy");
      copy.createSpan({ cls: "daymark-eyebrow", text: "\u8BB0\u5F55 \xB7 \u79EF\u7D2F \xB7 \u6210\u957F" });
      copy.createEl("h1", {
        text: this.selectedDate === todayKey(/* @__PURE__ */ new Date(), this.controller.settings.timezone) ? "\u7ED9\u4ECA\u5929\u4E00\u70B9\u79EF\u7D2F" : "\u6BCF\u4E00\u5929\uFF0C\u90FD\u6709\u8FF9\u53EF\u5FAA"
      });
      copy.createEl("p", {
        text: summary.hasActivity ? "\u5B66\u4E60\u3001\u8FD0\u52A8\u4E0E\u751F\u6D3B\uFF0C\u8D70\u8FC7\u7684\u6BCF\u4E00\u6B65\u90FD\u7B97\u6570\u3002" : "\u4ECE\u4E00\u4EF6\u5C0F\u4E8B\u5F00\u59CB\uFF0C\u6162\u6162\u6210\u4E3A\u60F3\u6210\u4E3A\u7684\u81EA\u5DF1\u3002"
      });
      const metrics = copy.createDiv("daymark-summary-metrics");
      metrics.createSpan({
        text: summary.scheduled === 0 ? "\u8FD9\u5929\u6CA1\u6709\u5B89\u6392" : `\u5DF2\u8FBE\u6210 ${summary.completed} / ${summary.scheduled} \u9879`
      });
      const savedDuration = habits2.filter((habit) => habit.type === "duration").reduce((total, habit) => total + Number(projectHabitDay(habit, this.selectedDate, events2).value), 0);
      metrics.createSpan({ text: `\u5F53\u65E5\u5DF2\u8BB0\u5F55 ${formatDuration(savedDuration)}` });
      const ring = summaryEl.createDiv("daymark-progress-ring");
      ring.setAttr("aria-label", `\u5F53\u65E5\u5B8C\u6210\u7387 ${Math.round(summary.ratio * 100)}%`);
      ring.style.setProperty("--daymark-progress", `${summary.ratio * 360}deg`);
      const ringInner = ring.createDiv();
      ringInner.createEl("strong", {
        text: summary.scheduled === 0 ? "\u2014" : `${Math.round(summary.ratio * 100)}%`
      });
      ringInner.createSpan({ text: "\u5B8C\u6210\u7387" });
      const visible = habits2.filter((habit) => {
        const projection = projectHabitDay(habit, this.selectedDate, events2);
        const enabledToday = effectiveRule(
          habit,
          todayKey(/* @__PURE__ */ new Date(), this.controller.settings.timezone)
        )?.enabled;
        return isHabitScheduled(habit, this.selectedDate) || projection.activeEvents.length > 0 || enabledToday;
      });
      if (visible.length === 0) {
        const empty = container.createDiv("daymark-empty");
        const icon = empty.createDiv();
        setIcon(icon, "sprout");
        empty.createEl("h3", { text: "\u4ECE\u7B2C\u4E00\u4E2A\u9879\u76EE\u5F00\u59CB" });
        empty.createEl("p", { text: "\u53EF\u4EE5\u8BB0\u5F55\u953B\u70BC\u3001\u9605\u8BFB\u3001\u559D\u6C34\uFF0C\u6216\u4EFB\u4F55\u60F3\u575A\u6301\u7684\u4E8B\u60C5\u3002" });
        const button = empty.createEl("button", { cls: "mod-cta", text: "\u65B0\u5EFA\u9879\u76EE" });
        button.addEventListener("click", () => this.controller.openHabitEditor());
        return;
      }
      const byCategory = /* @__PURE__ */ new Map();
      for (const habit of visible) {
        const category = habit.category || "\u65E5\u5E38";
        const group = byCategory.get(category) ?? [];
        group.push(habit);
        byCategory.set(category, group);
      }
      for (const [category, categoryHabits] of byCategory) {
        const section = container.createEl("section", { cls: "daymark-category" });
        const heading = section.createDiv("daymark-category-heading");
        heading.createEl("h3", { text: category });
        heading.createSpan({ text: `${categoryHabits.length} \u4E2A\u9879\u76EE` });
        const list = section.createDiv("daymark-habit-list");
        for (const habit of categoryHabits) {
          this.renderHabitCard(list, habit, projectHabitDay(habit, this.selectedDate, events2));
        }
      }
    }
    renderDailyIChing(container, today2) {
      const line = getDailyIChingLine(today2, this.controller.dailyReflectionSeed);
      const section = container.createEl("section", {
        cls: "daymark-daily-iching",
        attr: {
          "aria-label": "\u4ECA\u65E5\u4E00\u723B",
          "data-line-id": line.id
        }
      });
      section.createSpan({
        cls: "daymark-iching-symbol",
        text: line.hexagramSymbol,
        attr: { "aria-hidden": "true" }
      });
      const content = section.createDiv("daymark-iching-content");
      const heading = content.createDiv("daymark-iching-heading");
      const headingCopy = heading.createDiv();
      headingCopy.createSpan({ cls: "daymark-eyebrow", text: `\u4ECA\u65E5\u4E00\u723B \xB7 ${today2}` });
      headingCopy.createEl("h2", { text: `${line.hexagramName} \xB7 ${line.positionName}` });
      heading.createSpan({
        cls: "daymark-iching-index",
        text: `\u7B2C ${line.hexagramNumber} \u5366`
      });
      content.createEl("blockquote", {
        cls: "daymark-iching-original",
        text: line.original
      });
      const explanation = content.createDiv("daymark-iching-explanation");
      explanation.createSpan({ text: "\u4ECA\u65E5\u9759\u601D" });
      explanation.createEl("p", { text: line.explanation });
      content.createEl("small", {
        cls: "daymark-iching-disclaimer",
        text: `${ICHING_REFLECTION_DISCLAIMER} \u540C\u4E00\u5929\u3001\u540C\u4E00\u4EFD\u65E5\u8FF9\u6570\u636E\u5185\u5BB9\u56FA\u5B9A\u3002`
      });
    }
    renderDailyRitualCheckIn(container, today2) {
      const passage = getDailyRitualPassage(today2, this.controller.dailyReflectionSeed);
      const checkedIn = this.controller.dailyRitualCheckIns.some(
        (checkIn) => checkIn.occurredOn === today2
      );
      const status = checkedIn ? "\u4ECA\u65E5\u5DF2\u7B7E\u5230" : "\u4ECA\u65E5\u672A\u7B7E\u5230";
      const section = container.createEl("section", {
        cls: `daymark-daily-check-in${checkedIn ? " is-complete" : ""}`,
        attr: {
          "aria-label": `\u4ECA\u65E5\u7ECF\u5178\u7B7E\u5230\uFF0C${status}`,
          "data-check-in-state": checkedIn ? "signed" : "unsigned"
        }
      });
      const icon = section.createDiv("daymark-check-in-icon");
      icon.setAttr("aria-hidden", "true");
      setIcon(icon, checkedIn ? "badge-check" : "feather");
      const copy = section.createDiv("daymark-check-in-copy");
      const heading = copy.createDiv("daymark-check-in-heading");
      heading.createEl("h2", { text: status });
      heading.createSpan({ text: passage.source });
      copy.createEl("p", {
        text: checkedIn ? "\u7B7E\u5230\u8BB0\u5F55\u5DF2\u4FDD\u5B58\u5728 Vault\uFF1B\u4ECA\u65E5\u7684\u666E\u901A\u6253\u5361\u4E0E\u91CC\u7A0B\u7891\u4FDD\u6301\u72EC\u7ACB\u3002" : "\u53EF\u5148\u6717\u8BFB\u6216\u6284\u5199\u4ECA\u65E5\u77ED\u7AE0\uFF0C\u518D\u4EB2\u624B\u5B8C\u6210\u7B7E\u5230\u3002\u6284\u5199\u5185\u5BB9\u4E0D\u4F1A\u4FDD\u5B58\u3002"
      });
      const action = section.createEl("button", {
        cls: `daymark-check-in-action${checkedIn ? " is-complete" : " mod-cta"}`,
        attr: { "aria-label": checkedIn ? "\u4ECA\u65E5\u5DF2\u7B7E\u5230" : "\u6253\u5F00\u4ECA\u65E5\u7B7E\u5230" }
      });
      const actionIcon = action.createSpan();
      actionIcon.setAttr("aria-hidden", "true");
      setIcon(actionIcon, checkedIn ? "check" : "book-open-text");
      action.createSpan({ text: checkedIn ? "\u5DF2\u7B7E\u5230" : "\u6253\u5F00\u7B7E\u5230" });
      action.disabled = checkedIn;
      if (!checkedIn) {
        action.addEventListener("click", () => this.controller.openDailyRitualCheckIn());
      }
    }
    renderHabitCard(container, habit, projection) {
      const card = container.createEl("article", {
        cls: `daymark-habit-card${projection.completed ? " is-complete" : ""}`,
        attr: {
          "aria-label": `${habit.name}\uFF0C${projection.completed ? "\u8FD9\u5929\u5DF2\u8FBE\u6210" : "\u8FD9\u5929\u672A\u8FBE\u6210"}`,
          "data-habit-id": habit.id
        }
      });
      card.style.setProperty("--daymark-habit-color", habit.color);
      const header = card.createDiv("daymark-habit-header");
      const grip = header.createEl("button", { cls: "daymark-card-grip", attr: { draggable: "true", "aria-label": `\u62D6\u52A8\u6392\u5E8F ${habit.name}`, title: "\u62D6\u5230\u540C\u5206\u7C7B\u9879\u76EE\u4E0A\u6392\u5E8F\uFF0C\u4E5F\u53EF\u6309\u4E0A\u4E0B\u65B9\u5411\u952E" } });
      setIcon(grip, "grip-vertical");
      card.draggable = true;
      card.addEventListener("dragstart", (event) => {
        const source = event.target.closest("button,input,textarea,select,a");
        if (source && source !== grip) {
          if (!source.classList.contains("daymark-activity-handle")) event.preventDefault();
          return;
        }
        event.stopPropagation();
        event.dataTransfer?.setData("application/x-daymark-reorder", habit.id);
        if (habit.type === "duration" || habit.type === "count") writeActivityDrag(event.dataTransfer, habit.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "copyMove";
        card.addClass("is-sorting");
      });
      card.addEventListener("dragend", () => {
        card.removeClass("is-sorting");
        this.contentEl.querySelectorAll(".is-drop-before,.is-drop-after").forEach((item) => item.classList.remove("is-drop-before", "is-drop-after"));
      });
      const moveOne = (down) => {
        const peers = this.controller.habits.filter((item) => habitCategory(item) === habitCategory(habit));
        const target = peers[peers.findIndex((item) => item.id === habit.id) + (down ? 1 : -1)];
        if (target) void this.controller.reorderHabit(habit.id, target.id, down).catch((error) => new Notice(String(error)));
      };
      grip.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          moveOne(event.key === "ArrowDown");
        }
      });
      card.addEventListener("dragover", (event) => {
        if (!event.dataTransfer?.types.includes("application/x-daymark-reorder")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        const after = event.clientY > card.getBoundingClientRect().top + card.clientHeight / 2;
        card.toggleClass("is-drop-after", after);
        card.toggleClass("is-drop-before", !after);
      });
      card.addEventListener("dragleave", () => card.removeClass("is-drop-before", "is-drop-after"));
      card.addEventListener("drop", (event) => {
        const id = event.dataTransfer?.getData("application/x-daymark-reorder");
        if (!id) return;
        event.preventDefault();
        event.stopPropagation();
        const after = event.clientY > card.getBoundingClientRect().top + card.clientHeight / 2;
        card.removeClass("is-drop-before", "is-drop-after");
        void this.controller.reorderHabit(id, habit.id, after).catch((error) => new Notice(String(error)));
      });
      header.createDiv({ cls: "daymark-habit-emoji", text: habit.emoji });
      const title = header.createDiv("daymark-habit-title");
      title.createEl("strong", { text: habit.name });
      const detail = targetLabel(habit, this.selectedDate);
      const kind = detail || (habit.type === "text" ? "\u6587\u5B57\u8BB0\u5F55" : "\u5B8C\u6210\u578B");
      title.createSpan({
        text: `${isHabitScheduled(habit, this.selectedDate) ? "" : "\u975E\u8BA1\u5212 \xB7 "}${kind}`
      });
      if (projection.completed) {
        const done = header.createSpan({ cls: "daymark-done-badge", text: "\u5DF2\u8FBE\u6210" });
        done.setAttr("aria-label", "\u8FD9\u5929\u76EE\u6807\u5DF2\u8FBE\u6210");
      }
      const edit = header.createEl("button", {
        cls: "clickable-icon daymark-card-edit",
        attr: { "aria-label": `\u7F16\u8F91 ${habit.name}` }
      });
      setIcon(edit, "ellipsis");
      edit.addEventListener("click", () => this.controller.openHabitEditor(habit));
      if (habit.type === "checkbox") this.renderCheckboxControl(card, habit, projection);
      else if (habit.type === "text") this.renderTextControl(card, habit, projection);
      else this.renderNumberControl(card, habit, projection);
      const tools = card.createDiv("daymark-card-tools");
      for (const down of [false, true]) {
        const arrow = tools.createEl("button", { attr: { "aria-label": `${down ? "\u4E0B\u79FB" : "\u4E0A\u79FB"} ${habit.name}`, title: "\u53EA\u8C03\u6574\u5206\u7C7B\u5185\u987A\u5E8F" } });
        setIcon(arrow, down ? "arrow-down" : "arrow-up");
        arrow.addEventListener("click", () => moveOne(down));
      }
      if (habit.type === "duration" || habit.type === "count") {
        const handle = tools.createEl("button", { cls: "daymark-activity-handle", text: "\uFF0B \u6D3B\u52A8", attr: { draggable: "true", "aria-label": `\u6DFB\u52A0 ${habit.name} \u5230\u6D3B\u52A8\u5217\u8868`, title: "\u6DFB\u52A0\u5230\u4ECA\u65E5\u6D3B\u52A8\uFF0C\u4E5F\u53EF\u62D6\u5165\u60AC\u6D6E\u7A97" } });
        handle.addEventListener("dragstart", (event) => {
          event.stopPropagation();
          writeActivityDrag(event.dataTransfer, habit.id);
          if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
        });
        handle.addEventListener("click", () => {
          void this.changeActivity(habit.id, true);
        });
      }
    }
    async changeActivity(habitId, included) {
      if (this.activityBusy) return;
      const date = this.selectedDate;
      if (included && selectedActivityIds(this.controller.activitySelections, date).includes(habitId)) {
        new Notice("\u8FD9\u4E2A\u9879\u76EE\u5DF2\u7ECF\u5728\u6D3B\u52A8\u5217\u8868\u4E2D");
        return;
      }
      this.activityBusy = true;
      try {
        await this.controller.setActivitySelected(date, habitId, included);
        new Notice(included ? "\u5DF2\u6DFB\u52A0\u5230\u6D3B\u52A8\u5217\u8868" : "\u5DF2\u79FB\u9664\u5217\u8868\u5173\u8054\uFF0C\u539F\u9879\u76EE\u548C\u8BB0\u5F55\u4FDD\u6301\u4E0D\u53D8");
      } catch (error) {
        new Notice(error instanceof Error ? error.message : String(error));
      } finally {
        this.activityBusy = false;
      }
    }
    renderActivityList(container) {
      const count = selectedActivityIds(this.controller.activitySelections, this.selectedDate).length;
      const launch = container.createEl("button", { cls: "daymark-activity-launch", attr: { "aria-label": "\u6253\u5F00\u6D3B\u52A8\u60AC\u6D6E\u7A97" } });
      setIcon(launch.createSpan("daymark-activity-launch-icon"), "panels-top-left");
      const copy = launch.createDiv();
      copy.createEl("strong", { text: "\u4ECA\u65E5\u6D3B\u52A8" });
      copy.createSpan({ text: count ? `${count} \u9879\u5B89\u6392 \xB7 \u72EC\u7ACB\u60AC\u6D6E\u9762\u677F` : "\u7ED9\u4ECA\u5929\u7559\u4E00\u70B9\u65B9\u5411" });
      setIcon(launch.createSpan(), "arrow-up-right");
      launch.addEventListener("click", () => {
        void this.controller.openActivityView(this.selectedDate).catch((error) => new Notice(String(error)));
      });
      launch.addEventListener("dragover", (event) => {
        if (event.dataTransfer?.types.includes("application/x-daymark-habit")) event.preventDefault();
      });
      launch.addEventListener("drop", (event) => {
        event.preventDefault();
        const id = event.dataTransfer?.getData("application/x-daymark-habit");
        if (id) void this.changeActivity(id, true);
      });
    }
    renderCheckboxControl(card, habit, projection) {
      const button = card.createEl("button", {
        cls: "daymark-check-control",
        attr: {
          "aria-label": projection.completed ? `\u53D6\u6D88\u5B8C\u6210 ${habit.name}` : `\u5B8C\u6210 ${habit.name}`,
          "aria-pressed": String(projection.completed)
        }
      });
      const icon = button.createSpan("daymark-check-icon");
      setIcon(icon, projection.completed ? "check" : "circle");
      button.createSpan({ text: projection.completed ? "\u8FD9\u5929\u5DF2\u5B8C\u6210" : "\u6807\u8BB0\u4E3A\u5B8C\u6210" });
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await this.controller.recordCheckbox(habit, this.selectedDate, !projection.completed);
          this.announce(`${habit.name}${projection.completed ? "\u5DF2\u53D6\u6D88\u5B8C\u6210" : "\u5DF2\u5B8C\u6210"}`);
        } catch (error) {
          new Notice(error instanceof Error ? error.message : String(error));
          button.disabled = false;
        }
      });
    }
    renderNumberControl(card, habit, projection) {
      const value = typeof projection.value === "number" ? projection.value : 0;
      if (habit.type === "duration") {
        card.addClass("daymark-duration-card");
        const total = card.createDiv("daymark-duration-total");
        const label = total.createDiv("daymark-duration-caption");
        const icon = label.createSpan();
        setIcon(icon, "hourglass");
        label.createSpan({ text: "\u7D2F\u8BA1\u6295\u5165 \xB7 \u65F6:\u5206:\u79D2" });
        this.renderCumulativeDuration(total, habit);
        total.createSpan({
          cls: "daymark-duration-hint",
          text: this.controller.deviceState.runningTimer?.habitId === habit.id ? "\u5305\u542B\u672C\u6B21\u6B63\u5728\u8FDB\u884C\u7684\u8BA1\u65F6" : "\u6BCF\u4E00\u6B21\u6295\u5165\uFF0C\u90FD\u7559\u5728\u8FD9\u91CC"
        });
      }
      const meter = card.createDiv("daymark-number-meter");
      const valueEl = meter.createDiv();
      const saved = valueEl.createDiv("daymark-saved-value");
      if (habit.type === "duration") saved.createSpan({ text: "\u5F53\u65E5\u5DF2\u4FDD\u5B58" });
      saved.createEl("strong", { text: displayValue(habit, value) });
      valueEl.createSpan({ text: targetLabel(habit, this.selectedDate) });
      const progress = meter.createDiv("daymark-linear-progress");
      const bar = progress.createDiv();
      bar.style.width = `${numericProgress(habit, this.selectedDate, value) * 100}%`;
      const controls = card.createDiv("daymark-number-controls");
      const today2 = todayKey(/* @__PURE__ */ new Date(), this.controller.settings.timezone);
      if (habit.type === "duration" && this.selectedDate === today2) {
        const running = this.controller.deviceState.runningTimer?.habitId === habit.id && this.controller.deviceState.runningTimer.date === this.selectedDate;
        const timer = controls.createEl("button", {
          cls: running ? "daymark-timer is-running" : "daymark-timer",
          attr: {
            "aria-label": `${running ? "\u505C\u6B62" : "\u5F00\u59CB"} ${habit.name} \u7684\u8BA1\u65F6`
          }
        });
        const timerIcon = timer.createSpan();
        setIcon(timerIcon, running ? "square" : "play");
        timer.createSpan({
          cls: "daymark-timer-label",
          text: running ? "\u505C\u6B62 00:00" : "\u5F00\u59CB\u8BA1\u65F6"
        });
        if (running) {
          timer.dataset.timerStarted = String(this.controller.deviceState.runningTimer?.startedAt ?? 0);
        }
        timer.addEventListener("click", async () => {
          timer.disabled = true;
          try {
            await this.controller.toggleTimer(habit, this.selectedDate);
            this.announce(`${habit.name}${running ? "\u8BA1\u65F6\u5DF2\u4FDD\u5B58" : "\u5F00\u59CB\u8BA1\u65F6"}`);
          } catch (error) {
            new Notice(error instanceof Error ? error.message : String(error));
            timer.disabled = false;
          }
        });
      }
      const add = controls.createEl("button", {
        cls: "mod-cta daymark-add-step",
        text: habit.type === "duration" ? `+${formatDuration(habit.step)}` : `+${habit.step} ${habit.unit}`.trim(),
        attr: { "aria-label": `\u4E3A ${habit.name} \u5FEB\u6377\u589E\u52A0` }
      });
      add.addEventListener("click", async () => {
        add.disabled = true;
        try {
          await this.controller.recordNumber(habit, this.selectedDate, habit.step);
          this.announce(`${habit.name}\u5DF2\u589E\u52A0 ${displayValue(habit, habit.step)}`);
        } catch (error) {
          new Notice(error instanceof Error ? error.message : String(error));
          add.disabled = false;
        }
      });
      const custom = controls.createEl("button", {
        cls: "clickable-icon",
        attr: { "aria-label": `\u81EA\u5B9A\u4E49\u8BB0\u5F55 ${habit.name}` }
      });
      setIcon(custom, "pencil-line");
      custom.addEventListener("click", () => {
        new NumericRecordModal(
          this.app,
          habit,
          (amount, note) => this.controller.recordNumber(habit, this.selectedDate, amount, note).then(() => {
            this.announce(`${habit.name}\u7684\u8BB0\u5F55\u5DF2\u6DFB\u52A0`);
          })
        ).open();
      });
      const retractable = latestRetractableEvent(projection);
      if (retractable) this.renderUndoButton(controls, habit, retractable, "\u64A4\u9500\u6700\u8FD1\u4E00\u6B21\u589E\u52A0");
      if (habit.type === "duration") {
        card.createDiv({ cls: "daymark-timer-hint", text: "\u6BCF 30 \u5206\u949F\u63D0\u9192\u4F11\u606F" });
      }
      const latestNote = [...projection.activeEvents].reverse().find((event) => event.note);
      if (latestNote?.note) card.createDiv({ cls: "daymark-entry-note", text: latestNote.note });
    }
    renderTextControl(card, habit, projection) {
      const add = card.createEl("button", {
        cls: "daymark-text-add",
        attr: { "aria-label": `\u4E3A ${habit.name} \u5199\u4E00\u6761\u8BB0\u5F55` }
      });
      const icon = add.createSpan();
      setIcon(icon, "square-pen");
      add.createSpan({ text: "\u5199\u4E00\u6761\u8BB0\u5F55" });
      add.addEventListener("click", () => {
        new TextRecordModal(
          this.app,
          `${habit.name} \xB7 ${this.selectedDate}`,
          (value) => this.controller.recordText(habit, this.selectedDate, value).then(() => {
            this.announce(`${habit.name}\u7684\u6587\u5B57\u8BB0\u5F55\u5DF2\u4FDD\u5B58`);
          })
        ).open();
      });
      if (projection.notes.length === 0) return;
      const notes = card.createDiv("daymark-note-list");
      for (const event of [...projection.notes].reverse()) {
        const row = notes.createDiv("daymark-note-row");
        row.createDiv({ text: String(event.value) });
        this.renderUndoButton(row, habit, event, "\u64A4\u9500\u8FD9\u6761\u6587\u5B57\u8BB0\u5F55");
      }
    }
    renderUndoButton(container, habit, event, label) {
      const undo = container.createEl("button", {
        cls: "clickable-icon",
        attr: { "aria-label": `${label}\uFF1A${habit.name}` }
      });
      setIcon(undo, "undo-2");
      undo.addEventListener("click", async () => {
        undo.disabled = true;
        try {
          await this.controller.retractEvent(habit, event);
          this.announce(`${habit.name}\u7684\u8BB0\u5F55\u5DF2\u64A4\u9500`);
        } catch (error) {
          new Notice(error instanceof Error ? error.message : String(error));
          undo.disabled = false;
        }
      });
    }
    renderHistory(container) {
      const today2 = todayKey(/* @__PURE__ */ new Date(), this.controller.settings.timezone);
      const range = resolveStatisticsRange(this.statisticsRange, today2, this.controller.events);
      const rangeStatistics = buildRangeStatistics(
        this.controller.habits,
        this.controller.events,
        range.start,
        range.end
      );
      const running = this.controller.deviceState.runningTimer;
      const runningHabit = running ? this.controller.habits.find((habit) => habit.id === running.habitId) : void 0;
      const runningInRange = Boolean(
        running && runningHabit?.type === "duration" && running.date >= range.start && running.date <= range.end
      );
      const runningSeconds = runningInRange && running ? elapsedTimerSeconds(running) : 0;
      this.statisticsLiveMinute = runningInRange ? Math.floor(runningSeconds / 60) : void 0;
      const runningDay = running ? rangeStatistics.daily.find((day) => day.date === running.date) : void 0;
      const liveActiveDays = rangeStatistics.activeDays + (runningInRange && (runningDay?.records ?? 0) === 0 ? 1 : 0);
      const dailyTrend = rangeStatistics.daily.map((day) => ({ ...day }));
      if (runningInRange && running) {
        const runningIndex = dailyTrend.findIndex((day) => day.date === running.date);
        if (runningIndex >= 0) {
          dailyTrend[runningIndex].durationSeconds += runningSeconds;
        } else {
          dailyTrend.push({
            date: running.date,
            durationSeconds: runningSeconds,
            completions: 0,
            records: 0
          });
          dailyTrend.sort((left, right) => left.date.localeCompare(right.date));
        }
      }
      const intro = container.createEl("section", {
        cls: "daymark-statistics-intro",
        attr: { "aria-label": "\u79EF\u7D2F\u7EDF\u8BA1" }
      });
      const introCopy = intro.createDiv("daymark-statistics-copy");
      introCopy.createSpan({ cls: "daymark-eyebrow", text: "\u65F6\u95F4\u4F1A\u7559\u4E0B\u7B54\u6848" });
      introCopy.createEl("h1", { text: "\u770B\u89C1\u6BCF\u4E00\u6B21\u79EF\u7D2F" });
      introCopy.createEl("p", {
        text: `${range.start} \u81F3 ${range.end} \xB7 \u57FA\u4E8E\u6709\u6548\u65E5\u8FF9\u8BB0\u5F55\uFF0C\u6B63\u5728\u8BA1\u65F6\u4F1A\u5B9E\u65F6\u52A0\u5165\u603B\u6295\u5165`
      });
      this.renderStatisticsRangeSelector(intro);
      const overview = container.createEl("section", {
        cls: "daymark-overview",
        attr: { "aria-label": "\u7D2F\u8BA1\u6982\u89C8" }
      });
      const totalDuration = overview.createEl("article", {
        cls: "daymark-overview-card daymark-overview-duration"
      });
      const durationHeading = totalDuration.createDiv("daymark-overview-label");
      const durationIcon = durationHeading.createSpan();
      setIcon(durationIcon, "timer");
      durationHeading.createSpan({ text: "\u603B\u6295\u5165" });
      this.renderLiveDurationValue(
        totalDuration,
        rangeStatistics.durationSeconds,
        runningInRange ? running?.startedAt : void 0,
        "daymark-overview-value",
        `${range.start} \u81F3 ${range.end} \u7684\u7D2F\u8BA1\u6295\u5165\uFF08\u65F6:\u5206:\u79D2\uFF09`
      );
      const durationNote = totalDuration.createSpan("daymark-overview-note");
      if (liveActiveDays > 0 && rangeStatistics.durationSeconds + runningSeconds > 0) {
        const suffix = runningInRange ? " \xB7 \u542B\u6B63\u5728\u8BA1\u65F6" : "";
        durationNote.setText(
          `\u6D3B\u8DC3\u65E5\u5747 ${formatClock(
            (rangeStatistics.durationSeconds + runningSeconds) / liveActiveDays,
            true
          )}${suffix}`
        );
        this.liveAverageLabels.push({
          element: durationNote,
          savedSeconds: rangeStatistics.durationSeconds,
          activeDays: liveActiveDays,
          startedAt: runningInRange ? running?.startedAt : void 0,
          suffix
        });
      } else {
        durationNote.setText("\u5C1A\u65E0\u65F6\u957F\u8BB0\u5F55");
      }
      this.renderOverviewMetric(
        overview,
        "calendar-days",
        "\u6D3B\u8DC3\u5929\u6570",
        `${liveActiveDays} \u5929`,
        runningInRange ? "\u6709\u6709\u6548\u8BB0\u5F55\u6216\u6B63\u5728\u8BA1\u65F6\u7684\u65E5\u671F" : "\u81F3\u5C11\u7559\u4E0B\u8FC7\u4E00\u6761\u6709\u6548\u8BB0\u5F55\u7684\u65E5\u671F"
      );
      this.renderOverviewMetric(
        overview,
        "circle-check-big",
        "\u8FBE\u6210\u6B21\u6570",
        `${rangeStatistics.completions} \u6B21`,
        "\u8FBE\u5230\u5F53\u5929\u76EE\u6807\u7684\u9879\u76EE\u6B21\u6570"
      );
      this.renderOverviewMetric(
        overview,
        "notebook-pen",
        "\u6709\u6548\u8BB0\u5F55",
        `${rangeStatistics.records} \u6761`,
        "\u64A4\u9500\u540E\u7684\u8BB0\u5F55\u4E0D\u4F1A\u8BA1\u5165"
      );
      this.renderStatisticsTrend(
        container,
        dailyTrend,
        rangeStatistics.durationSeconds + runningSeconds
      );
      this.renderHabitStatistics(container, rangeStatistics.habits, range, runningInRange ? running : void 0);
      this.renderMilestoneJourney(container);
      const continuity = container.createEl("section", {
        cls: "daymark-continuity",
        attr: { "aria-label": "\u5168\u90E8\u65F6\u95F4\u7684\u8FDE\u7EED\u8BB0\u5F55" }
      });
      const continuityHeading = continuity.createDiv("daymark-section-heading");
      const continuityCopy = continuityHeading.createDiv();
      continuityCopy.createSpan({ cls: "daymark-eyebrow", text: "\u5168\u90E8\u65F6\u95F4" });
      continuityCopy.createEl("h2", { text: "\u8FDE\u7EED\u6027" });
      const continuityStats = continuity.createDiv("daymark-stats-grid");
      this.renderStat(
        continuityStats,
        "flame",
        "\u5F53\u524D\u8FDE\u7EED\u6709\u8BB0\u5F55",
        `${currentActivityStreak(
          this.controller.habits,
          this.controller.events,
          this.controller.settings.timezone
        )} \u5929`
      );
      this.renderStat(
        continuityStats,
        "trophy",
        "\u6700\u957F\u8FDE\u7EED\u6709\u8BB0\u5F55",
        `${bestActivityStreak(this.controller.habits, this.controller.events)} \u5929`
      );
      this.renderMonthReview(container, today2);
    }
    renderStatisticsRangeSelector(container) {
      const selector = container.createDiv("daymark-range-selector");
      selector.setAttrs({ role: "group", "aria-label": "\u7EDF\u8BA1\u65F6\u95F4\u8303\u56F4" });
      for (const [range, label] of [
        ["7d", "\u8FD17\u5929"],
        ["30d", "\u8FD130\u5929"],
        ["90d", "\u8FD190\u5929"],
        ["all", "\u5168\u90E8"]
      ]) {
        const button = selector.createEl("button", {
          cls: this.statisticsRange === range ? "is-active" : "",
          text: label,
          attr: {
            type: "button",
            "aria-label": `\u67E5\u770B${label}\u7EDF\u8BA1`,
            "aria-pressed": String(this.statisticsRange === range),
            "data-statistics-range": range
          }
        });
        button.addEventListener("click", () => {
          if (this.statisticsRange === range) return;
          this.statisticsRange = range;
          this.render();
          this.announce(`\u5DF2\u5207\u6362\u4E3A${label}\u7EDF\u8BA1`);
        });
      }
    }
    renderOverviewMetric(container, iconName, label, value, note) {
      const card = container.createEl("article", { cls: "daymark-overview-card" });
      const heading = card.createDiv("daymark-overview-label");
      const icon = heading.createSpan();
      setIcon(icon, iconName);
      heading.createSpan({ text: label });
      card.createEl("strong", { cls: "daymark-overview-value", text: value });
      card.createSpan({ cls: "daymark-overview-note", text: note });
    }
    renderStatisticsTrend(container, days, durationSeconds) {
      const section = container.createEl("section", {
        cls: "daymark-trend-section",
        attr: { "aria-label": "\u6BCF\u65E5\u6295\u5165\u65F6\u957F\u8D8B\u52BF" }
      });
      const heading = section.createDiv("daymark-section-heading");
      const copy = heading.createDiv();
      copy.createSpan({ cls: "daymark-eyebrow", text: "\u5DF2\u4FDD\u5B58\u8BB0\u5F55" });
      copy.createEl("h2", { text: "\u6BCF\u65E5\u6295\u5165\u65F6\u957F" });
      copy.createEl("p", { text: "\u6298\u7EBF\u6309\u5929\u5C55\u793A\u6295\u5165\u65F6\u95F4\u7684\u53D8\u5316\uFF1B\u6B63\u5728\u8BA1\u65F6\u6309\u5B9E\u9645\u7ECF\u8FC7\u65F6\u95F4\u52A0\u5165\u5F53\u5929\u3002" });
      if (durationSeconds <= 0 || days.length === 0) {
        const empty = section.createDiv("daymark-trend-empty");
        const icon = empty.createSpan();
        setIcon(icon, "trending-up");
        const emptyCopy = empty.createDiv();
        emptyCopy.createEl("strong", { text: "\u8FD9\u6BB5\u65F6\u95F4\u8FD8\u6CA1\u6709\u65F6\u957F\u6570\u636E" });
        emptyCopy.createSpan({ text: "\u8BB0\u5F55\u5B66\u4E60\u3001\u953B\u70BC\u7B49\u8BA1\u65F6\u540E\uFF0C\u8FD9\u91CC\u4F1A\u663E\u793A\u6BCF\u65E5\u53D8\u5316\u6298\u7EBF\u3002" });
        return;
      }
      const chart = section.createDiv("daymark-trend-chart");
      chart.createEl("p", {
        cls: "daymark-sr-only",
        text: `\u6BCF\u65E5\u6295\u5165\u65F6\u957F\u6298\u7EBF\uFF1A\u7D2F\u8BA1 ${formatClock(durationSeconds, true)}\uFF0C\u5171 ${days.length} \u5929\u3002`
      });
      const maxDuration = Math.max(1, ...days.map((day) => day.durationSeconds));
      const peak = days.reduce(
        (highest, day) => day.durationSeconds > highest.durationSeconds ? day : highest,
        days[0]
      );
      const summary = chart.createDiv("daymark-line-chart-summary");
      const maximum = summary.createDiv();
      maximum.createSpan({ text: "\u5355\u65E5\u6700\u9AD8" });
      maximum.createEl("strong", { text: formatClock(maxDuration, true) });
      summary.createSpan({
        text: `${formatShortDate(peak.date)} \xB7 \u5171 ${days.length} \u5929 \xB7 \u7D2F\u8BA1 ${formatClock(durationSeconds, true)}`
      });
      const plot = chart.createDiv("daymark-line-chart-plot");
      const namespace = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(namespace, "svg");
      svg.classList.add("daymark-line-chart-svg");
      svg.setAttribute("viewBox", "0 0 1000 220");
      svg.setAttribute("preserveAspectRatio", "none");
      svg.setAttribute("role", "img");
      svg.setAttribute(
        "aria-label",
        `${days[0].date} \u81F3 ${days[days.length - 1].date} \u6BCF\u65E5\u6295\u5165\u65F6\u957F\u6298\u7EBF\uFF0C\u5355\u65E5\u6700\u9AD8 ${formatClock(maxDuration, true)}`
      );
      svg.setAttribute("data-daily-points", String(days.length));
      for (const y of [16, 110, 204]) {
        const gridLine = document.createElementNS(namespace, "line");
        gridLine.classList.add("daymark-line-chart-grid");
        gridLine.setAttribute("x1", "0");
        gridLine.setAttribute("x2", "1000");
        gridLine.setAttribute("y1", String(y));
        gridLine.setAttribute("y2", String(y));
        svg.append(gridLine);
      }
      const coordinates = days.map((day, index) => {
        const x = days.length === 1 ? 0 : index / (days.length - 1) * 1e3;
        const y = 204 - day.durationSeconds / maxDuration * 188;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      });
      if (days.length === 1) {
        coordinates.push(`1000.00,${coordinates[0].split(",")[1]}`);
      }
      const line = document.createElementNS(namespace, "polyline");
      line.classList.add("daymark-line-chart-line");
      line.setAttribute("points", coordinates.join(" "));
      line.setAttribute("vector-effect", "non-scaling-stroke");
      svg.append(line);
      plot.append(svg);
      const labels = chart.createDiv("daymark-line-chart-labels");
      labels.createSpan({ text: formatShortDate(days[0].date) });
      labels.createSpan({ text: `\u5CF0\u503C ${formatShortDate(peak.date)}` });
      labels.createSpan({ text: formatShortDate(days[days.length - 1].date) });
    }
    renderHabitStatistics(container, statistics, range, running) {
      const section = container.createEl("section", {
        cls: "daymark-habit-statistics",
        attr: { "aria-label": "\u9879\u76EE\u7D2F\u8BA1\u660E\u7EC6" }
      });
      const heading = section.createDiv("daymark-section-heading");
      const copy = heading.createDiv();
      copy.createSpan({ cls: "daymark-eyebrow", text: `${range.start} \u81F3 ${range.end}` });
      copy.createEl("h2", { text: "\u9879\u76EE\u7D2F\u8BA1" });
      copy.createEl("p", { text: "\u6309\u8BB0\u5F55\u7C7B\u578B\u548C\u5355\u4F4D\u5206\u522B\u6392\u5217\uFF0C\u6570\u503C\u53EA\u4E0E\u540C\u7C7B\u9879\u76EE\u6BD4\u8F83\u3002" });
      if (this.controller.habits.length === 0) {
        section.createDiv({ cls: "daymark-statistics-empty", text: "\u65B0\u5EFA\u9879\u76EE\u540E\uFF0C\u7D2F\u8BA1\u660E\u7EC6\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002" });
        return;
      }
      const byHabit = new Map(statistics.map((item) => [item.habitId, item]));
      const entries = this.controller.habits.map((habit) => ({
        habit,
        statistics: byHabit.get(habit.id) ?? {
          habitId: habit.id,
          total: 0,
          activeDays: 0,
          completedDays: 0,
          records: 0
        }
      }));
      const groups = [];
      const durationEntries = entries.filter(({ habit }) => habit.type === "duration");
      if (durationEntries.length > 0) {
        groups.push({
          key: "duration",
          label: "\u65F6\u957F\u6295\u5165",
          description: "\u6309\u7D2F\u8BA1\u6295\u5165\u65F6\u957F\u6392\u5217",
          entries: durationEntries,
          value: ({ statistics: item }) => formatClock(item.total, true),
          score: ({ statistics: item }) => item.total + (running && running.habitId === item.habitId ? elapsedTimerSeconds(running) : 0)
        });
      }
      const countUnits = /* @__PURE__ */ new Map();
      for (const entry of entries.filter(({ habit }) => habit.type === "count")) {
        const unit = entry.habit.unit.trim() || "\u6B21";
        const group = countUnits.get(unit) ?? [];
        group.push(entry);
        countUnits.set(unit, group);
      }
      for (const [unit, countEntries] of countUnits) {
        groups.push({
          key: `count-${unit}`,
          label: `\u6570\u91CF \xB7 ${unit}`,
          description: `\u6309\u7D2F\u8BA1${unit}\u6570\u6392\u5217`,
          entries: countEntries,
          value: ({ statistics: item }) => `${formatNumber(item.total)} ${unit}`,
          score: ({ statistics: item }) => item.total
        });
      }
      const checkboxEntries = entries.filter(({ habit }) => habit.type === "checkbox");
      if (checkboxEntries.length > 0) {
        groups.push({
          key: "checkbox",
          label: "\u5B8C\u6210\u578B\u9879\u76EE",
          description: "\u6309\u5B8C\u6210\u5929\u6570\u6392\u5217",
          entries: checkboxEntries,
          value: ({ statistics: item }) => `${item.completedDays} \u5929`,
          score: ({ statistics: item }) => item.completedDays
        });
      }
      const textEntries = entries.filter(({ habit }) => habit.type === "text");
      if (textEntries.length > 0) {
        groups.push({
          key: "text",
          label: "\u6587\u5B57\u8BB0\u5F55",
          description: "\u6309\u6709\u6548\u8BB0\u5F55\u6761\u6570\u6392\u5217",
          entries: textEntries,
          value: ({ statistics: item }) => `${item.records} \u6761`,
          score: ({ statistics: item }) => item.records
        });
      }
      for (const group of groups) {
        const groupEl = section.createEl("section", {
          cls: "daymark-stat-group",
          attr: { "aria-label": `${group.label}\uFF0C${group.description}` }
        });
        const groupHeading = groupEl.createDiv("daymark-stat-group-heading");
        const title = groupHeading.createDiv();
        title.createEl("h3", { text: group.label });
        title.createSpan({ text: group.description });
        groupHeading.createSpan({ text: `${group.entries.length} \u9879` });
        const list = groupEl.createEl("ol", {
          cls: "daymark-stat-list",
          attr: { role: "list" }
        });
        const sorted = [...group.entries].sort(
          (left, right) => group.score(right) - group.score(left) || left.habit.order - right.habit.order
        );
        sorted.forEach((entry, index) => {
          const row = list.createEl("li", {
            cls: "daymark-stat-row",
            attr: { "data-habit-id": entry.habit.id }
          });
          row.style.setProperty("--daymark-habit-color", entry.habit.color);
          row.createSpan({ cls: "daymark-stat-rank", text: String(index + 1), attr: { "aria-hidden": "true" } });
          row.createSpan({ cls: "daymark-stat-emoji", text: entry.habit.emoji, attr: { "aria-hidden": "true" } });
          const rowCopy = row.createDiv("daymark-stat-row-copy");
          rowCopy.createEl("strong", { text: entry.habit.name });
          const isRunningDuration = entry.habit.type === "duration" && running?.habitId === entry.habit.id;
          const runningAddsActiveDay = Boolean(
            isRunningDuration && running && projectHabitDay(entry.habit, running.date, this.controller.events).activeEvents.length === 0
          );
          const activeDays = entry.statistics.activeDays + (runningAddsActiveDay ? 1 : 0);
          const detailParts = [`\u6D3B\u8DC3 ${activeDays} \u5929`];
          if (entry.habit.type !== "checkbox" && entry.statistics.completedDays > 0) {
            detailParts.push(`\u8FBE\u6210 ${entry.statistics.completedDays} \u5929`);
          }
          if (entry.habit.type !== "text" && entry.statistics.records > 0) {
            detailParts.push(`${entry.statistics.records} \u6761\u6709\u6548\u8BB0\u5F55`);
          }
          if (isRunningDuration) detailParts.push("\u6B63\u5728\u8BA1\u65F6");
          rowCopy.createSpan({ text: detailParts.join(" \xB7 ") });
          if (entry.habit.type === "duration") {
            this.renderLiveDurationValue(
              row,
              entry.statistics.total,
              running?.habitId === entry.habit.id ? running.startedAt : void 0,
              "daymark-stat-row-value",
              `${entry.habit.name}\u5728\u6240\u9009\u8303\u56F4\u5185\u7684\u7D2F\u8BA1\u6295\u5165\uFF08\u65F6:\u5206:\u79D2\uFF09`
            );
          } else {
            row.createEl("strong", { cls: "daymark-stat-row-value", text: group.value(entry) });
          }
        });
      }
    }
    renderMilestoneJourney(container) {
      const now = Date.now();
      const saved = buildMilestoneProgress(
        this.controller.habits,
        this.controller.events,
        void 0,
        now
      );
      const running = this.controller.deviceState.runningTimer;
      const runningHabit = running ? this.controller.habits.find(
        (habit) => habit.id === running.habitId && habit.type === "duration"
      ) : void 0;
      const startedAt = runningHabit ? running?.startedAt : void 0;
      const elapsed = running && startedAt ? elapsedTimerSeconds(running, now) : 0;
      const progress = evaluateMilestoneProgress(saved.totalSeconds + elapsed);
      const stepSeconds = HEXAGRAM_STEP_HOURS * 60 * 60;
      const hexagramPercent = Math.floor(progress.hexagramProgress * 100);
      const cyclePercent = Math.floor(progress.cycleProgress * 100);
      const hexagramElapsedSeconds = Math.max(
        0,
        Math.min(stepSeconds, stepSeconds - progress.remainingHexagramSeconds)
      );
      const completedStageIds = new Set(progress.completedStages.map((stage) => stage.id));
      const stageByReward = new Map(
        MILESTONE_STAGES.map((stage) => [`${stage.systemId}:${stage.reward.id}`, stage])
      );
      const section = container.createEl("section", {
        cls: "daymark-milestone-journey",
        attr: { "aria-label": "\u5168\u90E8\u65F6\u95F4\u91CC\u7A0B\u7891" }
      });
      const heading = section.createDiv("daymark-section-heading");
      const headingCopy = heading.createDiv();
      headingCopy.createSpan({ cls: "daymark-eyebrow", text: "\u5168\u90E8\u65F6\u95F4 \xB7 \u4E0D\u53D7\u4E0A\u65B9\u8303\u56F4\u5F71\u54CD" });
      headingCopy.createEl("h2", { text: "\u4FEE\u884C\u91CC\u7A0B\u7891" });
      headingCopy.createEl("p", {
        text: `\u6C47\u603B\u6240\u6709\u65F6\u957F\u578B\u9879\u76EE\uFF1B\u6BCF\u7D2F\u8BA1 ${HEXAGRAM_STEP_HOURS} \u5C0F\u65F6\u4F9D\u6B21\u5B8C\u6210\u4E00\u5366\uFF0C\u8D70\u5B8C\u516D\u5341\u56DB\u5366\u89E3\u9501\u4E00\u4E2A\u7B26\u53F7\u3002`
      });
      const hero = section.createDiv("daymark-milestone-hero");
      const current = hero.createDiv("daymark-milestone-current");
      const currentSymbols = current.createDiv({
        cls: "daymark-milestone-symbols",
        attr: { "aria-hidden": "true" }
      });
      currentSymbols.createSpan({
        cls: "daymark-milestone-hexagram-current",
        text: progress.currentHexagram.symbol
      });
      const currentCopy = current.createDiv();
      currentCopy.createSpan({
        cls: "daymark-milestone-kicker",
        text: `\u7B2C ${progress.currentCycle} \u8F6E \xB7 \u5F53\u524D\u7B2C ${progress.currentHexagram.number} / ${MILESTONE_HEXAGRAMS.length} \u5366`
      });
      currentCopy.createEl("h3", {
        text: `${progress.currentHexagram.symbol} ${progress.currentHexagram.name}`
      });
      currentCopy.createEl("p", {
        text: `\u672C\u8F6E\u5DF2\u5B8C\u6210 ${progress.completedHexagramsInCycle} \u5366\uFF1B\u6309\u6587\u738B\u5366\u5E8F\u7EE7\u7EED\u884C\u8FDB\u3002`
      });
      const summary = hero.createDiv("daymark-milestone-summary");
      const total = summary.createDiv("daymark-milestone-total");
      total.createSpan({ text: "\u5168\u90E8\u65F6\u957F\u9879\u76EE\u7D2F\u8BA1" });
      const totalElement = total.createEl("strong", {
        text: formatClock(progress.totalSeconds, true)
      });
      total.createSpan({
        text: `\u5DF2\u5B8C\u6210 ${progress.completedCycles} \u8F6E \xB7 \u89E3\u9501 ${progress.completedStages.length} / ${MILESTONE_STAGES.length}`
      });
      const nextReward = summary.createDiv("daymark-milestone-next-reward");
      nextReward.createSpan({ text: "\u672C\u8F6E\u5B8C\u6210\u540E\u89E3\u9501" });
      const nextRewardBody = nextReward.createDiv("daymark-milestone-next-reward-body");
      if (progress.nextStage) {
        this.renderRewardGlyph(nextRewardBody, progress.nextStage.reward, "daymark-milestone-next-glyph");
        const nextRewardCopy = nextRewardBody.createDiv();
        nextRewardCopy.createEl("strong", { text: progress.nextStage.reward.name });
        nextRewardCopy.createSpan({ text: progress.nextStage.systemName });
      } else {
        nextRewardBody.createSpan({ cls: "daymark-milestone-next-glyph", text: "\u2726" });
        const nextRewardCopy = nextRewardBody.createDiv();
        nextRewardCopy.createEl("strong", { text: "\u7B26\u53F7\u957F\u9636\u5DF2\u5B8C\u6210" });
        nextRewardCopy.createSpan({ text: "\u516D\u5341\u56DB\u5366\u4ECD\u4F1A\u7EE7\u7EED\u8F6E\u56DE" });
      }
      const progressStack = section.createDiv("daymark-milestone-progress-stack");
      const hexagramProgressCard = progressStack.createDiv(
        "daymark-milestone-progress-card is-hexagram"
      );
      const hexagramProgressCopy = hexagramProgressCard.createDiv(
        "daymark-milestone-progress-copy"
      );
      hexagramProgressCopy.createSpan({
        text: `\u5366\u5185\u8FDB\u5EA6 \xB7 ${formatClock(hexagramElapsedSeconds, true)} / ${formatClock(stepSeconds, true)}`
      });
      const hexagramProgressLabel = hexagramProgressCopy.createEl("strong", {
        text: `${hexagramPercent}%`
      });
      const hexagramProgressElement = hexagramProgressCard.createDiv({
        cls: "daymark-milestone-progress",
        attr: {
          role: "progressbar",
          "aria-label": `\u7B2C${progress.currentHexagram.number}\u5366${progress.currentHexagram.name}\u7684\u5366\u5185\u8BA1\u65F6\u8FDB\u5EA6`,
          "aria-valuemin": "0",
          "aria-valuemax": "100",
          "aria-valuenow": String(hexagramPercent),
          "aria-valuetext": `\u5DF2\u8FDB\u884C${formatClock(hexagramElapsedSeconds, true)}\uFF0C\u8FD8\u9700${formatClock(progress.remainingHexagramSeconds, true)}`
        }
      });
      const hexagramProgressFill = hexagramProgressElement.createDiv(
        "daymark-milestone-progress-fill"
      );
      hexagramProgressFill.style.width = `${progress.hexagramProgress * 100}%`;
      const hexagramRemainingElement = hexagramProgressCard.createEl("p", {
        text: `\u5B8C\u6210\u5F53\u524D\u5366\u8FD8\u9700 ${formatClock(progress.remainingHexagramSeconds, true)}`
      });
      const cycleProgressCard = progressStack.createDiv(
        "daymark-milestone-progress-card is-cycle"
      );
      const cycleProgressCopy = cycleProgressCard.createDiv("daymark-milestone-progress-copy");
      cycleProgressCopy.createSpan({
        text: `\u672C\u8F6E\u516D\u5341\u56DB\u5366 \xB7 \u5DF2\u5B8C\u6210 ${progress.completedHexagramsInCycle} / ${MILESTONE_HEXAGRAMS.length}`
      });
      const cycleProgressLabel = cycleProgressCopy.createEl("strong", {
        text: `${cyclePercent}%`
      });
      const cycleProgressElement = cycleProgressCard.createDiv({
        cls: "daymark-milestone-progress",
        attr: {
          role: "progressbar",
          "aria-label": `\u7B2C${progress.currentCycle}\u8F6E\u516D\u5341\u56DB\u5366\u8FDB\u5EA6`,
          "aria-valuemin": "0",
          "aria-valuemax": "100",
          "aria-valuenow": String(cyclePercent),
          "aria-valuetext": `\u672C\u8F6E\u5DF2\u5B8C\u6210${progress.completedHexagramsInCycle}\u5366\uFF0C\u5F53\u524D\u7B2C${progress.currentHexagram.number}\u5366${progress.currentHexagram.name}`
        }
      });
      const cycleProgressFill = cycleProgressElement.createDiv("daymark-milestone-progress-fill");
      cycleProgressFill.style.width = `${progress.cycleProgress * 100}%`;
      const cycleRemainingElement = cycleProgressCard.createEl("p", {
        text: progress.nextStage ? `\u8DDD\u89E3\u9501 ${progress.nextStage.reward.name} \u8FD8\u9700 ${formatClock(progress.remainingRewardSeconds, true)}` : "\u5168\u90E8\u7B26\u53F7\u5DF2\u7ECF\u89E3\u9501\uFF1B\u516D\u5341\u56DB\u5366\u4ECD\u6309\u987A\u5E8F\u7EE7\u7EED\u8F6E\u56DE\u3002"
      });
      const hexagramCycle = section.createDiv("daymark-hexagram-cycle");
      const hexagramHeading = hexagramCycle.createDiv("daymark-milestone-subheading");
      hexagramHeading.createEl("strong", { text: "\u672C\u8F6E\u516D\u5341\u56DB\u5366" });
      hexagramHeading.createSpan({
        text: `\u7B2C ${progress.currentCycle} \u8F6E \xB7 \u6587\u738B\u5366\u5E8F 1\u2014${MILESTONE_HEXAGRAMS.length}`
      });
      const hexagramGrid = hexagramCycle.createEl("ol", {
        cls: "daymark-hexagram-grid",
        attr: { "aria-label": `\u7B2C${progress.currentCycle}\u8F6E\u516D\u5341\u56DB\u5366\u987A\u5E8F\u8FDB\u5EA6` }
      });
      for (const hexagram of MILESTONE_HEXAGRAMS) {
        const isCompleted = hexagram.number <= progress.completedHexagramsInCycle;
        const isCurrent = hexagram.number === progress.currentHexagram.number;
        const status = isCompleted ? "\u5DF2\u5B8C\u6210" : isCurrent ? "\u5F53\u524D" : "\u672A\u5B8C\u6210";
        const cell = hexagramGrid.createEl("li", {
          cls: `daymark-hexagram-cell${isCompleted ? " is-completed" : ""}${isCurrent ? " is-current" : ""}`,
          attr: {
            "aria-label": `\u672C\u8F6E\u7B2C${hexagram.number}\u5C0F\u65F6\u5BF9\u5E94\u7B2C${hexagram.number}\u5366${hexagram.name}\uFF0C${status}`,
            title: `\u7B2C ${hexagram.number} \u5C0F\u65F6 \u2192 \u7B2C ${hexagram.number} \u5366 \xB7 ${hexagram.name} \xB7 ${status}`,
            ...isCurrent ? { "aria-current": "step" } : {}
          }
        });
        cell.createSpan({
          text: hexagram.symbol,
          attr: { "aria-hidden": "true" }
        });
        cell.createEl("small", {
          text: `${hexagram.number}h`,
          attr: { "aria-hidden": "true" }
        });
      }
      const hexagramLegend = hexagramCycle.createDiv("daymark-hexagram-legend");
      hexagramLegend.createSpan({
        cls: "is-completed",
        text: `\u5DF2\u5B8C\u6210 ${progress.completedHexagramsInCycle}`
      });
      hexagramLegend.createSpan({ cls: "is-current", text: "\u5F53\u524D 1" });
      hexagramLegend.createSpan({
        text: `\u672A\u5B8C\u6210 ${Math.max(0, MILESTONE_HEXAGRAMS.length - progress.completedHexagramsInCycle - 1)}`
      });
      const systems = section.createDiv("daymark-reward-systems");
      const systemsHeading = systems.createDiv("daymark-milestone-subheading");
      systemsHeading.createEl("strong", { text: "\u7B26\u53F7\u957F\u9636" });
      systemsHeading.createSpan({
        text: `\u6BCF\u8D70\u5B8C\u4E00\u8F6E\u516D\u5341\u56DB\u5366\uFF0C\u4F9D\u6B21\u89E3\u9501\u4E00\u4E2A\u7B26\u53F7 \xB7 ${progress.completedStages.length} / ${MILESTONE_STAGES.length}`
      });
      const systemList = systems.createDiv("daymark-symbol-system-list");
      for (const system of MILESTONE_SYMBOL_SYSTEMS) {
        const systemStages = MILESTONE_STAGES.filter((stage) => stage.systemId === system.id);
        const unlockedCount = systemStages.filter((stage) => completedStageIds.has(stage.id)).length;
        const isComplete = unlockedCount === systemStages.length;
        const isCurrent = progress.nextStage?.systemId === system.id;
        const systemStatus = isComplete ? "\u5DF2\u5B8C\u6210" : isCurrent ? "\u5F53\u524D\u4F53\u7CFB" : "\u5F85\u5F00\u542F";
        const systemCard = systemList.createEl("section", {
          cls: `daymark-symbol-system${isComplete ? " is-completed" : ""}${isCurrent ? " is-current" : ""}`,
          attr: { "aria-label": `${system.name}\uFF0C\u5DF2\u89E3\u9501${unlockedCount}/${systemStages.length}\uFF0C${systemStatus}` }
        });
        const systemHeader = systemCard.createDiv("daymark-symbol-system-heading");
        systemHeader.createEl("strong", { text: system.name });
        systemHeader.createSpan({ text: `${unlockedCount} / ${systemStages.length} \xB7 ${systemStatus}` });
        systemCard.createEl("p", { text: system.description });
        const symbolGrid = systemCard.createDiv({
          cls: "daymark-symbol-grid",
          attr: { role: "list", "aria-label": `${system.name}\u7B26\u53F7\u603B\u89C8` }
        });
        for (const reward of system.symbols) {
          const stage = stageByReward.get(`${system.id}:${reward.id}`);
          if (!stage) continue;
          const unlocked = completedStageIds.has(stage.id);
          const isNext = progress.nextStage?.id === stage.id;
          const status = unlocked ? "\u5DF2\u89E3\u9501" : isNext ? "\u4E0B\u4E00\u5956\u52B1" : "\u672A\u89E3\u9501";
          const symbol = symbolGrid.createDiv({
            cls: `daymark-symbol-tile${unlocked ? " is-unlocked" : ""}${isNext ? " is-next" : ""}`,
            attr: {
              role: "listitem",
              "aria-label": `${reward.symbol} ${reward.name}${reward.sound ? `\uFF0C${reward.soundLabel ?? "\u8BFB\u97F3"}${reward.sound}` : ""}\uFF0C\u8C61\u5F81\u4E3B\u9898${reward.meaning}\uFF0C${status}`,
              title: `${reward.name} \xB7 ${status}`
            }
          });
          this.renderRewardGlyph(symbol, reward, "daymark-reward-glyph");
        }
      }
      const archive = section.createEl("details", { cls: "daymark-symbol-archive" });
      archive.createEl("summary", {
        text: `\u67E5\u770B\u5168\u90E8\u7B26\u53F7\u7684\u540D\u79F0\u3001\u8BFB\u97F3\u6216\u539F\u540D\u4E0E\u542B\u4E49 \xB7 \u5DF2\u89E3\u9501 ${progress.completedStages.length} / ${MILESTONE_STAGES.length}`
      });
      const archiveBody = archive.createDiv("daymark-symbol-archive-body");
      for (const system of MILESTONE_SYMBOL_SYSTEMS) {
        const systemStages = MILESTONE_STAGES.filter((stage) => stage.systemId === system.id);
        const unlockedCount = systemStages.filter((stage) => completedStageIds.has(stage.id)).length;
        const group = archiveBody.createEl("section", { cls: "daymark-symbol-archive-group" });
        const groupHeading = group.createDiv("daymark-symbol-archive-heading");
        groupHeading.createEl("h3", { text: system.name });
        groupHeading.createSpan({ text: `${unlockedCount} / ${systemStages.length}` });
        group.createEl("p", { text: system.description });
        const list = group.createEl("ol", {
          cls: "daymark-symbol-archive-list",
          attr: { "aria-label": `${system.name}\u7B26\u53F7\u91CA\u4E49` }
        });
        for (const stage of systemStages) {
          const unlocked = completedStageIds.has(stage.id);
          const isNext = progress.nextStage?.id === stage.id;
          const status = unlocked ? "\u5DF2\u89E3\u9501" : isNext ? "\u4E0B\u4E00\u5956\u52B1" : "\u672A\u89E3\u9501";
          const item = list.createEl("li", {
            cls: `daymark-symbol-archive-item${unlocked ? " is-unlocked" : ""}${isNext ? " is-next" : ""}`,
            attr: {
              "aria-label": `\u7B2C${stage.cycle}\u8F6E\uFF0C${stage.reward.name}${stage.reward.sound ? `\uFF0C${stage.reward.soundLabel ?? "\u8BFB\u97F3"}${stage.reward.sound}` : ""}\uFF0C\u8C61\u5F81\u4E3B\u9898${stage.reward.meaning}\uFF0C${status}`
            }
          });
          this.renderRewardGlyph(item, stage.reward, "daymark-symbol-archive-glyph");
          const itemCopy = item.createDiv("daymark-symbol-archive-copy");
          itemCopy.createEl("strong", { text: stage.reward.name });
          if (stage.reward.sound) {
            itemCopy.createSpan({
              text: `${stage.reward.soundLabel ?? "\u8BFB\u97F3"} ${stage.reward.sound}`
            });
          }
          itemCopy.createEl("small", { text: `\u8C61\u5F81\u4E3B\u9898\uFF1A${stage.reward.meaning}` });
          const itemMeta = item.createDiv("daymark-symbol-archive-meta");
          itemMeta.createEl("strong", { text: `\u7B2C ${stage.cycle} \u8F6E` });
          itemMeta.createSpan({ text: `${formatDuration(stage.thresholdSeconds)} \xB7 ${status}` });
        }
      }
      this.milestoneLive = {
        savedSeconds: saved.totalSeconds,
        startedAt,
        completedRewardCount: progress.completedStages.length,
        completedCycles: progress.completedCycles,
        completedHexagramsInCycle: progress.completedHexagramsInCycle,
        totalElement,
        hexagramProgressElement,
        hexagramProgressFill,
        hexagramProgressLabel,
        hexagramRemainingElement,
        cycleProgressElement,
        cycleProgressFill,
        cycleProgressLabel,
        cycleRemainingElement
      };
    }
    renderRewardGlyph(container, reward, className) {
      const glyph = container.createSpan({
        cls: className,
        attr: { "aria-hidden": "true" }
      });
      if (!reward.pattern) {
        glyph.setText(reward.symbol);
        return glyph;
      }
      glyph.addClass("is-geomantic");
      const pattern = glyph.createSpan("daymark-geomantic-pattern");
      for (const count of reward.pattern) {
        const row = pattern.createSpan("daymark-geomantic-row");
        for (let index = 0; index < Number(count); index += 1) {
          row.createSpan("daymark-geomantic-dot");
        }
      }
      return glyph;
    }
    renderMonthReview(container, today2) {
      const monthStart = startOfMonth(this.selectedDate);
      const monthEnd = endOfMonth(this.selectedDate);
      const eventsByDate = /* @__PURE__ */ new Map();
      for (const event of this.controller.events) {
        if (event.occurredOn < monthStart || event.occurredOn > monthEnd) continue;
        const group = eventsByDate.get(event.occurredOn) ?? [];
        group.push(event);
        eventsByDate.set(event.occurredOn, group);
      }
      const review = container.createEl("section", {
        cls: "daymark-month-review",
        attr: { "aria-label": "\u6708\u5EA6\u56DE\u987E" }
      });
      const reviewHeading = review.createDiv("daymark-section-heading");
      const reviewCopy = reviewHeading.createDiv();
      reviewCopy.createSpan({ cls: "daymark-eyebrow", text: "\u6BCF\u65E5\u8DB3\u8FF9" });
      reviewCopy.createEl("h2", { text: "\u6708\u5EA6\u56DE\u987E" });
      reviewCopy.createEl("p", { text: "\u70B9\u51FB\u65E5\u671F\u53EF\u4EE5\u56DE\u5230\u5F53\u5929\u8865\u8BB0\u6216\u67E5\u770B\u8BE6\u60C5\u3002" });
      const monthNav = review.createDiv("daymark-month-nav");
      const previous = monthNav.createEl("button", {
        cls: "clickable-icon",
        attr: { "aria-label": "\u4E0A\u4E2A\u6708" }
      });
      setIcon(previous, "chevron-left");
      previous.addEventListener("click", () => {
        this.selectedDate = addMonths(this.selectedDate, -1);
        this.render();
      });
      monthNav.createEl("h3", { text: formatMonthLabel(this.selectedDate) });
      const next = monthNav.createEl("button", {
        cls: "clickable-icon",
        attr: { "aria-label": "\u4E0B\u4E2A\u6708" }
      });
      setIcon(next, "chevron-right");
      const thisMonth = startOfMonth(today2);
      next.disabled = monthStart >= thisMonth;
      next.addEventListener("click", () => {
        if (monthStart < thisMonth) {
          this.selectedDate = addMonths(this.selectedDate, 1);
          this.render();
        }
      });
      const calendar = review.createDiv("daymark-calendar");
      const weekdays = this.controller.settings.firstDayOfWeek === "monday" ? ["\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D", "\u65E5"] : ["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"];
      for (const label of weekdays) calendar.createDiv({ cls: "daymark-calendar-weekday", text: label });
      const nativeOffset = keyToDate(monthStart).getUTCDay();
      const offset = this.controller.settings.firstDayOfWeek === "monday" ? (nativeOffset + 6) % 7 : nativeOffset;
      for (let index = 0; index < offset; index += 1) {
        calendar.createDiv("daymark-calendar-spacer");
      }
      for (const date of daysBetweenInclusive(monthStart, monthEnd)) {
        const summary = summarizeDay(date, this.controller.habits, eventsByDate.get(date) ?? []);
        const day = calendar.createEl("button", {
          cls: `daymark-calendar-day${date === today2 ? " is-today" : ""}${date === this.selectedDate ? " is-selected" : ""}`,
          attr: {
            "aria-label": `${date}\uFF0C\u5B8C\u6210 ${summary.completed} / ${summary.scheduled}`,
            "aria-current": date === today2 ? "date" : "false",
            "aria-pressed": String(date === this.selectedDate)
          }
        });
        day.style.setProperty("--daymark-day-strength", String(summary.ratio));
        day.createSpan({ text: String(keyToDate(date).getUTCDate()) });
        day.createEl("small", {
          text: summary.hasActivity ? `${summary.completed}/${summary.scheduled}` : ""
        });
        day.disabled = date > today2;
        day.addEventListener("click", () => {
          this.selectedDate = date;
          this.activeTab = "today";
          this.render();
        });
      }
    }
    renderStat(container, iconName, label, value) {
      const card = container.createDiv("daymark-stat-card");
      const icon = card.createDiv();
      setIcon(icon, iconName);
      card.createEl("strong", { text: value });
      card.createSpan({ text: label });
    }
    updateRunningTimerLabels() {
      const now = Date.now();
      const taskNow = this.controller.deviceState.runningTimer?.pausedAt ?? now;
      for (const element of this.contentEl.querySelectorAll("[data-timer-started]")) {
        const started = Number(element.dataset.timerStarted);
        const label = element.querySelector(".daymark-timer-label");
        if (label && Number.isFinite(started)) {
          const prefix = element.dataset.timerPrefix ?? "\u505C\u6B62 ";
          label.setText(`${prefix}${formatClock((taskNow - started) / 1e3)}`);
        }
      }
      for (const label of this.liveDurationLabels) {
        const current = label.startedAt ? Math.max(0, Math.floor((taskNow - label.startedAt) / 1e3)) : 0;
        label.element.setText(formatClock(label.savedSeconds + current, true));
      }
      for (const label of this.liveAverageLabels) {
        const current = label.startedAt ? Math.max(0, Math.floor((taskNow - label.startedAt) / 1e3)) : 0;
        label.element.setText(
          `\u6D3B\u8DC3\u65E5\u5747 ${formatClock(
            (label.savedSeconds + current) / label.activeDays,
            true
          )}${label.suffix}`
        );
      }
      if (this.updateMilestoneLabels(taskNow)) return;
      const running = this.controller.deviceState.runningTimer;
      if (running) {
        const elapsed = elapsedTimerSeconds(running, now);
        if (this.activeTab === "history" && this.statisticsLiveMinute !== void 0 && Math.floor(elapsed / 60) !== this.statisticsLiveMinute) {
          this.render();
          return;
        }
      }
      const restTimer = this.controller.deviceState.restTimer;
      if (restTimer) {
        const nextReminder = (restTimer.lastRestReminderSeconds ?? 0) + REST_INTERVAL_SECONDS;
        const remaining = Math.max(0, nextReminder - elapsedTimerSeconds(restTimer, now));
        for (const label of this.contentEl.querySelectorAll("[data-rest-countdown]")) {
          label.setText(remaining > 0 ? `\u8DDD\u4E0B\u6B21\u4F11\u606F\u63D0\u9192 ${formatClock(remaining)}` : "\u4F11\u606F\u5012\u8BA1\u65F6\u5DF2\u6682\u505C \xB7 \u5173\u95ED\u63D0\u9192\u540E\u91CD\u65B0\u5F00\u59CB");
        }
      }
    }
    updateMilestoneLabels(now) {
      const live = this.milestoneLive;
      if (!live) return false;
      const elapsed = live.startedAt ? Math.max(0, Math.floor((now - live.startedAt) / 1e3)) : 0;
      const progress = evaluateMilestoneProgress(live.savedSeconds + elapsed);
      if (progress.completedStages.length !== live.completedRewardCount || progress.completedCycles !== live.completedCycles || progress.completedHexagramsInCycle !== live.completedHexagramsInCycle) {
        this.render();
        return true;
      }
      const stepSeconds = HEXAGRAM_STEP_HOURS * 60 * 60;
      const hexagramElapsedSeconds = Math.max(
        0,
        Math.min(stepSeconds, stepSeconds - progress.remainingHexagramSeconds)
      );
      const hexagramPercent = Math.floor(progress.hexagramProgress * 100);
      const cyclePercent = Math.floor(progress.cycleProgress * 100);
      live.totalElement.setText(formatClock(progress.totalSeconds, true));
      live.hexagramProgressFill.style.width = `${progress.hexagramProgress * 100}%`;
      live.hexagramProgressElement.setAttr("aria-valuenow", String(hexagramPercent));
      live.hexagramProgressElement.setAttr(
        "aria-valuetext",
        `\u5DF2\u8FDB\u884C${formatClock(hexagramElapsedSeconds, true)}\uFF0C\u8FD8\u9700${formatClock(progress.remainingHexagramSeconds, true)}`
      );
      live.hexagramProgressLabel.setText(`${hexagramPercent}%`);
      live.hexagramRemainingElement.setText(
        `\u5B8C\u6210\u5F53\u524D\u5366\u8FD8\u9700 ${formatClock(progress.remainingHexagramSeconds, true)}`
      );
      live.cycleProgressFill.style.width = `${progress.cycleProgress * 100}%`;
      live.cycleProgressElement.setAttr("aria-valuenow", String(cyclePercent));
      live.cycleProgressElement.setAttr(
        "aria-valuetext",
        `\u672C\u8F6E\u5DF2\u5B8C\u6210${progress.completedHexagramsInCycle}\u5366\uFF0C\u5F53\u524D\u7B2C${progress.currentHexagram.number}\u5366${progress.currentHexagram.name}`
      );
      live.cycleProgressLabel.setText(`${cyclePercent}%`);
      live.cycleRemainingElement.setText(
        progress.nextStage ? `\u8DDD\u89E3\u9501 ${progress.nextStage.reward.name} \u8FD8\u9700 ${formatClock(progress.remainingRewardSeconds, true)}` : "\u5168\u90E8\u7B26\u53F7\u5DF2\u7ECF\u89E3\u9501\uFF1B\u516D\u5341\u56DB\u5366\u4ECD\u6309\u987A\u5E8F\u7EE7\u7EED\u8F6E\u56DE\u3002"
      );
      return false;
    }
    updateLiveClock(now = /* @__PURE__ */ new Date()) {
      if (!this.liveClockElement || !this.liveClockTimeLabel || !this.liveClockDateLabel) return;
      const time = liveTimeFormatter.format(now);
      const date = liveDateFormatter.format(now);
      this.liveClockElement.dateTime = now.toISOString();
      this.liveClockElement.setAttr("aria-label", `\u5F53\u524D\u65F6\u95F4 ${date} ${time}`);
      this.liveClockElement.setAttr("title", `\u672C\u673A\u65F6\u95F4\uFF1A${date} ${time}`);
      this.liveClockTimeLabel.setText(time);
      this.liveClockDateLabel.setText(date);
    }
    renderCumulativeDuration(container, habit) {
      const saved = this.cumulativeDurations.get(habit.id) ?? 0;
      const running = this.controller.deviceState.runningTimer;
      this.renderLiveDurationValue(
        container,
        saved,
        running?.habitId === habit.id ? running.startedAt : void 0,
        "daymark-cumulative-value",
        "\u6240\u6709\u65E5\u671F\u7684\u7D2F\u8BA1\u65F6\u957F\uFF08\u65F6:\u5206:\u79D2\uFF09\uFF0C\u5305\u542B\u672C\u6B21\u6B63\u5728\u8FDB\u884C\u7684\u8BA1\u65F6"
      );
    }
    renderLiveDurationValue(container, savedSeconds, startedAt, className, title) {
      const now = this.controller.deviceState.runningTimer?.pausedAt ?? Date.now();
      const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1e3)) : 0;
      const value = container.createEl("strong", {
        cls: className,
        text: formatClock(savedSeconds + elapsed, true),
        attr: {
          "data-cumulative-seconds": String(savedSeconds),
          title
        }
      });
      if (startedAt) value.dataset.cumulativeStarted = String(startedAt);
      this.liveDurationLabels.push({ element: value, savedSeconds, startedAt });
      return value;
    }
    announce(message) {
      if (!this.liveRegion) return;
      this.liveRegion.setText("");
      window.setTimeout(() => this.liveRegion?.setText(message), 20);
    }
  };

  // ../../src/activity-window.ts
  var ActivityWindowPin = class {
    constructor() {
      this.previous = false;
    }
    bind(owner, main, enabled) {
      const host = owner && owner !== main ? owner.electronWindow : void 0;
      const mainHost = main.electronWindow;
      if (host && (host === mainHost || host.id !== void 0 && host.id === mainHost?.id)) {
        this.dispose();
        return false;
      }
      if (host === this.host) return this.set(enabled);
      this.dispose();
      if (!host) return false;
      try {
        this.previous = host.isAlwaysOnTop();
        this.host = host;
        return this.set(enabled);
      } catch {
        return false;
      }
    }
    set(enabled) {
      try {
        if (!this.host) return false;
        if (enabled && this.host.isMaximized?.()) this.host.unmaximize?.();
        if (this.host.isAlwaysOnTop() !== enabled) this.host.setAlwaysOnTop(enabled);
        return this.host.isAlwaysOnTop() === enabled;
      } catch {
        return false;
      }
    }
    dispose() {
      try {
        this.host?.setAlwaysOnTop(this.previous);
      } catch {
      }
      this.host = void 0;
    }
  };

  // ../../src/activity-view.ts
  var VIEW_TYPE_ACTIVITY = "daymark-activity-window";
  function duration(seconds) {
    const safe = Math.max(0, Math.floor(seconds));
    return safe >= 3600 ? `${Math.floor(safe / 3600)}\u65F6${Math.floor(safe % 3600 / 60)}\u5206` : `${Math.floor(safe / 60)}\u5206${String(safe % 60).padStart(2, "0")}\u79D2`;
  }
  var ActivityView = class extends ItemView {
    constructor(leaf, controller2) {
      super(leaf);
      this.controller = controller2;
      this.pinned = true;
      this.pickerOpen = false;
      this.busy = false;
      this.pin = new ActivityWindowPin();
      this.rows = [];
      this.date = this.lastToday = todayKey(/* @__PURE__ */ new Date(), controller2.settings.timezone);
      this.pinned = controller2.deviceState.activityWindowPinned ?? true;
    }
    getViewType() {
      return VIEW_TYPE_ACTIVITY;
    }
    getDisplayText() {
      return "\u4ECA\u65E5\u6D3B\u52A8";
    }
    getIcon() {
      return "list-checks";
    }
    getState() {
      return { date: this.date, pinned: this.pinned };
    }
    async setState(state) {
      const data = state;
      if (data?.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date)) this.date = data.date;
      if (typeof data?.pinned === "boolean") this.pinned = data.pinned;
      this.pin.set(this.pinned);
      this.render();
    }
    async onOpen() {
      this.contentEl.addClass("daymark-activity-view");
      this.render();
      this.interval = window.setInterval(() => this.tick(), 1e3);
    }
    async onClose() {
      if (this.interval !== void 0) window.clearInterval(this.interval);
      this.interval = void 0;
      this.pin.dispose();
    }
    refresh() {
      this.render();
    }
    async change(id, included, date = this.date) {
      if (this.busy) return;
      if (included && selectedActivityIds(this.controller.activitySelections, date).includes(id)) return;
      this.busy = true;
      this.contentEl.setAttr("aria-busy", "true");
      try {
        await this.controller.setActivitySelected(date, id, included);
      } catch (error) {
        new Notice(error instanceof Error ? error.message : String(error));
      } finally {
        this.busy = false;
        this.contentEl.removeAttribute("aria-busy");
      }
    }
    render() {
      const scroll = this.contentEl.scrollTop;
      this.contentEl.empty();
      this.rows = [];
      const date = this.date;
      const ids = selectedActivityIds(this.controller.activitySelections, date);
      const panel = this.contentEl.createEl("section", { cls: "daymark-focus-panel", attr: { "aria-label": "\u6BCF\u65E5\u6D3B\u52A8\u5217\u8868" } });
      const header = panel.createDiv("daymark-focus-top");
      const brand = header.createDiv();
      brand.createSpan({ cls: "daymark-focus-kicker", text: "DAYMARK / FOCUS" });
      brand.createEl("h1", { text: "\u4ECA\u65E5\u6D3B\u52A8" });
      this.pinButton = header.createEl("button", { cls: "daymark-focus-icon", attr: { "aria-label": "\u5207\u6362\u7A97\u53E3\u7F6E\u9876", title: "\u5207\u6362\u7A97\u53E3\u7F6E\u9876" } });
      setIcon(this.pinButton, "pin");
      this.pinButton.addEventListener("click", () => {
        if (this.pin.set(!this.pinned)) {
          this.pinned = !this.pinned;
          this.controller.setActivityWindowPinned(this.pinned);
        } else new Notice("\u7CFB\u7EDF\u7F6E\u9876\u4EC5\u5728\u7535\u8111\u7AEF\u72EC\u7ACB\u6D3B\u52A8\u7A97\u53E3\u4E2D\u53EF\u7528");
        this.tick();
      });
      const hero = panel.createDiv("daymark-focus-overview");
      const copy = hero.createDiv();
      const dateInput = copy.createEl("input", { cls: "daymark-focus-date-input", attr: { type: "date", value: date, max: todayKey(/* @__PURE__ */ new Date(), this.controller.settings.timezone), "aria-label": "\u6D3B\u52A8\u5217\u8868\u65E5\u671F" } });
      dateInput.addEventListener("change", () => {
        if (dateInput.value && dateInput.value <= dateInput.max) {
          this.date = dateInput.value;
          this.render();
        }
      });
      this.summary = copy.createEl("p", { cls: "daymark-focus-summary" });
      this.ring = hero.createDiv("daymark-focus-ring");
      this.count = this.ring.createEl("strong");
      const toolbar = panel.createDiv("daymark-focus-toolbar");
      toolbar.createSpan({ text: "\u6211\u7684\u5B89\u6392" });
      const add = toolbar.createEl("button", { text: this.pickerOpen ? "\u6536\u8D77" : "\uFF0B \u6DFB\u52A0\u9879\u76EE", attr: { "aria-expanded": String(this.pickerOpen) } });
      add.addEventListener("click", () => {
        this.pickerOpen = !this.pickerOpen;
        this.render();
      });
      if (this.pickerOpen) {
        const picker = panel.createDiv("daymark-focus-picker");
        const select = picker.createEl("select", { attr: { "aria-label": "\u9009\u62E9\u5DF2\u6709\u6D3B\u52A8\u9879\u76EE" } });
        select.createEl("option", { text: "\u9009\u62E9\u5DF2\u6709\u8BA1\u65F6 / \u8BA1\u6B21\u9879\u76EE", attr: { value: "" } });
        for (const habit of this.controller.habits.filter((habit2) => (habit2.type === "duration" || habit2.type === "count") && !ids.includes(habit2.id) && effectiveRule(habit2, date)?.enabled)) {
          select.createEl("option", { text: `${habit.emoji} ${habit.name}`, attr: { value: habit.id } });
        }
        picker.createEl("button", { text: "\u6DFB\u52A0", attr: { "aria-label": "\u6DFB\u52A0\u5DF2\u6709\u9879\u76EE" } }).addEventListener("click", () => {
          if (select.value) void this.change(select.value, true, date);
        });
      }
      panel.addEventListener("dragover", (event) => {
        if (canDropActivity(event.dataTransfer)) {
          event.preventDefault();
          event.stopPropagation();
          if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
          panel.addClass("is-dragover");
        }
      }, true);
      panel.addEventListener("dragleave", () => panel.removeClass("is-dragover"));
      panel.addEventListener("drop", (event) => {
        panel.removeClass("is-dragover");
        const id = readActivityDrag(event.dataTransfer);
        if (!id) return;
        event.preventDefault();
        event.stopPropagation();
        if (this.controller.habits.some((habit) => habit.id === id && (habit.type === "duration" || habit.type === "count"))) void this.change(id, true, date);
      }, true);
      const list = panel.createEl("ul", { cls: "daymark-focus-items" });
      if (!ids.length) {
        const empty = panel.createDiv("daymark-focus-empty");
        setIcon(empty.createDiv(), "orbit");
        empty.createEl("strong", { text: "\u7ED9\u4ECA\u5929\u7559\u4E00\u70B9\u65B9\u5411" });
        empty.createEl("p", { text: "\u6DFB\u52A0\u4E00\u4E2A\u9879\u76EE\uFF0C\u6216\u628A\u539F\u6A21\u5757\u62D6\u5230\u8FD9\u91CC\u3002" });
      }
      for (const id of ids) {
        const habit = this.controller.habits.find((item) => item.id === id);
        const row = list.createEl("li", { cls: "daymark-activity-row", attr: { "data-activity-id": id } });
        row.createSpan({ cls: "daymark-focus-emoji", text: habit?.emoji ?? "\xB7" });
        const body = row.createDiv("daymark-focus-task-body");
        const line = body.createDiv("daymark-focus-task-line");
        line.createEl("strong", { text: habit?.name ?? "\u539F\u9879\u76EE\u5DF2\u4E0D\u5B58\u5728" });
        const state = line.createSpan("daymark-focus-task-state");
        const progress = body.createDiv("daymark-focus-task-progress");
        const fill = progress.createSpan();
        const value = body.createSpan("daymark-focus-task-value");
        const check = row.createSpan({ cls: "daymark-activity-check", attr: { role: "img" } });
        if (habit && (habit.type === "duration" || habit.type === "count")) this.rows.push({ habit, row, value, fill, check, state });
        else {
          value.setText("\u4EC5\u5217\u8868\u5173\u8054\uFF0C\u53EF\u5B89\u5168\u79FB\u9664");
          check.setText("\u2014");
          check.setAttr("aria-label", "\u9879\u76EE\u4E0D\u53EF\u7528");
        }
        const remove = row.createEl("button", { cls: "daymark-focus-remove", attr: { "aria-label": `\u4ECE\u6D3B\u52A8\u5217\u8868\u79FB\u9664 ${habit?.name ?? id}`, title: "\u53EA\u79FB\u9664\u5217\u8868\u5173\u8054" } });
        setIcon(remove, "x");
        remove.addEventListener("click", () => {
          void this.change(id, false, date);
        });
      }
      const footer = panel.createDiv("daymark-focus-footer");
      this.rest = footer.createSpan();
      footer.createSpan({ text: "\u81EA\u52A8\u540C\u6B65 \xB7 \u65E0\u9700\u624B\u52A8\u6253\u52FE" });
      this.tick();
      this.contentEl.scrollTop = scroll;
    }
    tick() {
      const today2 = todayKey(/* @__PURE__ */ new Date(), this.controller.settings.timezone);
      if (today2 !== this.lastToday) {
        if (this.date === this.lastToday) this.date = today2;
        this.lastToday = today2;
        this.render();
        return;
      }
      const available = this.pin.bind(this.contentEl.ownerDocument.defaultView, window, this.pinned);
      if (this.pinButton) {
        this.pinButton.disabled = this.contentEl.ownerDocument.defaultView === window;
        this.pinButton.setAttr("aria-pressed", String(available && this.pinned));
        this.pinButton.title = available ? this.pinned ? "\u5DF2\u7F6E\u9876\uFF0C\u70B9\u51FB\u53D6\u6D88" : "\u70B9\u51FB\u7F6E\u9876" : "\u4EC5\u7535\u8111\u7AEF\u72EC\u7ACB\u7A97\u53E3\u652F\u6301\u7F6E\u9876";
      }
      let completed = 0;
      const running = this.controller.deviceState.runningTimer;
      for (const entry of this.rows) {
        const result = activityProgress(entry.habit, this.date, this.controller.events, running);
        const format = (value) => entry.habit.type === "duration" ? duration(value) : `${value} ${entry.habit.unit || "\u6B21"}`;
        entry.value.setText(`${format(result.value)} / ${result.target === void 0 ? "\u672A\u8BBE\u76EE\u6807" : format(result.target)}`);
        const percent = result.target ? Math.min(100, Math.max(0, result.value / result.target * 100)) : 0;
        entry.fill.style.width = `${percent}%`;
        entry.check.setText(result.completed ? "\u2713" : "\u25CB");
        entry.check.setAttr("aria-label", result.completed ? "\u5DF2\u81EA\u52A8\u5B8C\u6210" : "\u5C1A\u672A\u8FBE\u6807");
        entry.row.toggleClass("is-complete", result.completed);
        const active = running?.habitId === entry.habit.id && running.date === this.date;
        entry.state.setText(active ? running.pausedAt === void 0 ? "\u8FDB\u884C\u4E2D" : "\u4F11\u606F\u4E2D" : "");
        if (result.completed) completed += 1;
      }
      const total = selectedActivityIds(this.controller.activitySelections, this.date).length;
      this.summary?.setText(total ? completed === total ? "\u4ECA\u5929\u7684\u5B89\u6392\uFF0C\u5168\u90E8\u5B8C\u6210\u3002" : `\u8FD8\u6709 ${total - completed} \u4EF6\u4E8B\uFF0C\u6162\u6162\u5B8C\u6210\u3002` : "\u4E0D\u5FC5\u5F88\u591A\uFF0C\u9009\u597D\u4ECA\u5929\u60F3\u505A\u7684\u4E8B\u3002");
      this.count?.setText(`${completed}/${total}`);
      this.ring?.style.setProperty("--focus-progress", `${total ? completed / total * 100 : 0}%`);
      const rest = this.controller.deviceState.restTimer;
      const remaining = rest ? Math.max(0, (rest.lastRestReminderSeconds ?? 0) + REST_INTERVAL_SECONDS - elapsedTimerSeconds(rest)) : REST_INTERVAL_SECONDS;
      this.rest?.setText(remaining ? `\u4E0B\u6B21\u4F11\u606F ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "\u4F11\u606F\u4E2D \xB7 \u5173\u95ED\u63D0\u9192\u540E\u7EE7\u7EED");
    }
  };

  // ../../src/daily-ritual-modal.ts
  var DailyRitualModal = class extends Modal {
    constructor(app, options) {
      super(app);
      this.options = options;
      this.showing = false;
    }
    onOpen() {
      this.showing = true;
      this.modalEl.addClass("daymark-modal", "daymark-ritual-modal");
      this.setTitle("\u4ECA\u65E5\u7B7E\u5230 \xB7 \u6284\u8BFB\u5165\u5B9A");
      const icon = this.contentEl.createDiv("daymark-ritual-icon");
      icon.setAttr("aria-hidden", "true");
      setIcon(icon, "feather");
      const source = this.contentEl.createDiv("daymark-ritual-source");
      source.createSpan({ text: this.options.passage.source });
      source.createEl("time", { text: this.options.date, attr: { datetime: this.options.date } });
      this.contentEl.createEl("blockquote", {
        cls: "daymark-ritual-original",
        text: this.options.passage.original
      });
      const translation = this.contentEl.createDiv("daymark-ritual-translation");
      translation.createEl("strong", { text: "\u4ECA\u8BD1" });
      translation.createEl("p", { text: this.options.passage.translation });
      this.contentEl.createEl("p", {
        cls: "daymark-ritual-instruction",
        text: "\u5EFA\u8BAE\u5148\u7F13\u6162\u6717\u8BFB\u4E09\u904D\uFF0C\u518D\u5728\u4E0B\u65B9\u6284\u5199\u4E00\u904D\u3002\u6284\u5199\u4E3A\u9009\u586B\uFF0C\u5185\u5BB9\u4EC5\u7559\u5728\u672C\u6B21\u7A97\u53E3\uFF0C\u4E0D\u4F1A\u4FDD\u5B58\u3002"
      });
      const transcription = this.contentEl.createEl("textarea", {
        cls: "daymark-ritual-transcription",
        attr: {
          "aria-label": "\u4ECA\u65E5\u7B7E\u5230\u7BC7\u7AE0\u6284\u5199\u533A\uFF08\u9009\u586B\uFF0C\u4E0D\u4FDD\u5B58\uFF09",
          placeholder: "\u9009\u586B\uFF1A\u5728\u8FD9\u91CC\u6284\u5199\u539F\u6587\uFF08\u4E0D\u4F1A\u4FDD\u5B58\uFF09\u2026\u2026",
          rows: "5"
        }
      });
      transcription.setAttr("spellcheck", "false");
      const actions = this.contentEl.createDiv("daymark-ritual-actions");
      const done = actions.createEl("button", { cls: "mod-cta", text: "\u5B8C\u6210\u4ECA\u65E5\u7B7E\u5230" });
      let saving = false;
      done.addEventListener("click", async () => {
        if (saving) return;
        saving = true;
        done.disabled = true;
        try {
          await this.options.onCheckIn();
          this.close();
        } catch (error) {
          new Notice(`\u7B7E\u5230\u672A\u4FDD\u5B58\uFF1A${error instanceof Error ? error.message : String(error)}`);
          saving = false;
          done.disabled = false;
        }
      });
    }
    onClose() {
      if (!this.showing) return;
      this.showing = false;
      this.contentEl.empty();
      this.options.onDismiss();
    }
  };

  // ../../src/rest-modal.ts
  var RestReminderModal = class extends Modal {
    constructor(app, options) {
      super(app);
      this.options = options;
      this.showing = false;
    }
    onOpen() {
      this.showing = true;
      this.modalEl.addClass("daymark-modal", "daymark-rest-modal");
      this.setTitle("\u949F\u58F0\u5DF2\u54CD \xB7 \u8BE5\u4F11\u606F\u4E86");
      let mode = this.options.soundMode ?? "bell";
      const chime = this.contentEl.createEl("button", { cls: "daymark-rest-chime daymark-rest-instrument" });
      chime.setAttr("type", "button");
      chime.createSpan("daymark-rest-chime-ring daymark-rest-chime-ring-one");
      chime.createSpan("daymark-rest-chime-ring daymark-rest-chime-ring-two");
      chime.createSpan("daymark-rest-chime-ring daymark-rest-chime-ring-three");
      const icon = chime.createDiv("daymark-rest-icon");
      setIcon(icon, "bell-ring");
      const seal = chime.createSpan({ cls: "daymark-rest-chime-seal", text: "\u9418" });
      const feedback = this.contentEl.createDiv("daymark-rest-feedback");
      feedback.setAttr("role", "status");
      const switches = this.contentEl.createDiv("daymark-rest-modes");
      const bellButton = switches.createEl("button", { text: "\u949F" });
      const woodButton = switches.createEl("button", { text: "\u6728\u9C7C" });
      this.contentEl.createEl("p", {
        cls: "daymark-rest-heading",
        text: "30 \u5206\u949F\u4F11\u606F\u63D0\u9192\u5DF2\u5230"
      });
      this.contentEl.createEl("p", {
        cls: "daymark-rest-description",
        text: "\u62AC\u773C\u3001\u677E\u80A9\u3001\u559D\u53E3\u6C34\uFF0C\u8BA9\u6CE8\u610F\u529B\u968F\u7740\u949F\u58F0\u7F13\u7F13\u5F52\u4F4D\u3002"
      });
      const resonance = this.contentEl.createEl("p", {
        cls: "daymark-rest-resonance",
        text: "\u539A\u91CD\u4F59\u97F5\u7EA6 10 \u79D2 \xB7 \u70B9\u51FB\u949F\uFF0C\u6E05\u51C0 +1"
      });
      this.contentEl.createEl("p", {
        cls: "daymark-rest-note",
        text: "\u4F11\u606F\u5012\u8BA1\u65F6\u4E0E\u5F53\u524D\u4EFB\u52A1\u5747\u5DF2\u6682\u505C\u3002\u5173\u95ED\u5F39\u7A97\u540E\u4EFB\u52A1\u81EA\u52A8\u7EE7\u7EED\uFF0C\u5E76\u91CD\u65B0\u5F00\u59CB 30 \u5206\u949F\u5012\u8BA1\u65F6\uFF1B\u4F11\u606F\u65F6\u95F4\u4E0D\u8BA1\u5165\u7D2F\u8BA1\u3002"
      });
      const updateMode = () => {
        this.setTitle(mode === "bell" ? "\u949F\u58F0\u5DF2\u54CD \xB7 \u8BE5\u4F11\u606F\u4E86" : "\u6728\u9C7C\u8F7B\u54CD \xB7 \u8BE5\u4F11\u606F\u4E86");
        chime.setAttr("aria-label", mode === "bell" ? "\u6572\u949F" : "\u6572\u6728\u9C7C");
        chime.setAttr("data-mode", mode);
        icon.empty();
        if (mode === "bell") setIcon(icon, "bell-ring");
        else icon.createSpan("daymark-woodfish");
        seal.setText(mode === "bell" ? "\u9418" : "\u6728");
        resonance.setText(mode === "bell" ? "\u539A\u91CD\u4F59\u97F5\u7EA6 10 \u79D2 \xB7 \u70B9\u51FB\u949F\uFF0C\u6E05\u51C0 +1" : "\u4E00\u53E9\u4E00\u5FF5 \xB7 \u70B9\u51FB\u6728\u9C7C\uFF0C\u6E05\u51C0 +1");
        bellButton.setAttr("aria-pressed", String(mode === "bell"));
        woodButton.setAttr("aria-pressed", String(mode === "wood"));
      };
      for (const [button, value] of [[bellButton, "bell"], [woodButton, "wood"]]) {
        button.addEventListener("click", () => {
          mode = value;
          this.options.onModeChange?.(mode);
          updateMode();
        });
      }
      updateMode();
      const replay = chime;
      replay.addEventListener("click", async () => {
        if (!this.showing || replay.disabled) return;
        replay.disabled = true;
        replay.setAttr("aria-busy", "true");
        try {
          const played = await this.options.onReplaySound(mode);
          if (played && this.showing) {
            clearTimeout(this.feedbackTimer);
            feedback.empty();
            feedback.createSpan({ cls: "daymark-rest-merit", text: "\u6E05\u51C0 +1" });
            this.feedbackTimer = setTimeout(() => feedback.empty(), 1400);
          }
          if (!played && this.showing) {
            new Notice("\u7CFB\u7EDF\u6682\u65F6\u65E0\u6CD5\u64AD\u653E\u949F\u58F0\uFF0C\u8BF7\u68C0\u67E5\u9759\u97F3\u8BBE\u7F6E\u540E\u91CD\u8BD5\u3002");
          }
        } catch {
          if (this.showing) {
            new Notice("\u7CFB\u7EDF\u6682\u65F6\u65E0\u6CD5\u64AD\u653E\u949F\u58F0\uFF0C\u8BF7\u68C0\u67E5\u9759\u97F3\u8BBE\u7F6E\u540E\u91CD\u8BD5\u3002");
          }
        } finally {
          if (this.showing) {
            replay.disabled = false;
            replay.removeAttribute("aria-busy");
          }
        }
      });
      const actions = this.contentEl.createDiv("daymark-rest-actions");
      const keepGoing = actions.createEl("button", { text: "\u77E5\u9053\u4E86" });
      keepGoing.addEventListener("click", () => this.close());
      if (!this.options.habitName) return;
      const stop = actions.createEl("button", { cls: "mod-cta", text: "\u505C\u6B62\u5E76\u4FDD\u5B58\uFF0C\u53BB\u4F11\u606F" });
      stop.addEventListener("click", async () => {
        if (!this.showing || stop.disabled) return;
        replay.disabled = true;
        keepGoing.disabled = true;
        stop.disabled = true;
        try {
          await this.options.onStop();
          if (this.showing) this.close();
        } catch (error) {
          new Notice(`\u8BA1\u65F6\u672A\u4FDD\u5B58\uFF1A${error instanceof Error ? error.message : String(error)}`);
          replay.disabled = false;
          keepGoing.disabled = false;
          stop.disabled = false;
        }
      });
    }
    onClose() {
      if (!this.showing) return;
      this.showing = false;
      clearTimeout(this.feedbackTimer);
      this.contentEl.empty();
      this.options.onDismiss();
    }
  };

  // preview.ts
  var params = new URLSearchParams(location.search);
  document.body.className = params.get("theme") === "dark" ? "theme-dark" : "theme-light";
  var today = todayKey(/* @__PURE__ */ new Date(), "Asia/Shanghai");
  var start = addDays(today, -125);
  var habits = [
    createHabit("\u6DF1\u5EA6\u9605\u8BFB", "duration", start, 0, { category: "\u5B66\u4E60\u4E0E\u6210\u957F", emoji: "\u{1F4D6}", color: "#7964cf", step: 300 }),
    createHabit("\u82F1\u8BED\u542C\u529B", "duration", start, 1, { category: "\u5B66\u4E60\u4E0E\u6210\u957F", emoji: "\u{1F3A7}", color: "#5984d8", step: 600 }),
    createHabit("\u529B\u91CF\u8BAD\u7EC3", "checkbox", start, 2, { category: "\u7167\u987E\u81EA\u5DF1", emoji: "\u{1F3CB}\uFE0F", color: "#dc8956" }),
    createHabit("\u559D\u6C34", "count", start, 3, { category: "\u7167\u987E\u81EA\u5DF1", emoji: "\u{1F4A7}", color: "#40a9b1", unit: "\u676F", step: 1 }),
    createHabit("\u751F\u6D3B\u968F\u8BB0", "text", start, 4, { category: "\u751F\u6D3B\u7684\u7247\u523B", emoji: "\u{1F331}", color: "#709858" })
  ];
  habits[1].rules[0].target = 1200;
  habits[3].rules[0].target = 8;
  var events = [];
  var seq = 0;
  function record(habit, date, type, value, note = "", targetEventId) {
    events.push({ version: 1, id: `preview-event-${++seq}`, habitId: habit.id, type, value, targetEventId, occurredOn: date, recordedAt: new Date(Date.now() + seq).toISOString(), timezone: "Asia/Shanghai", deviceId: "preview-only", note });
  }
  var reflectionNotes = [
    "\u5B8C\u6210\u540E\u6BD4\u5F00\u59CB\u524D\u66F4\u6709\u7CBE\u795E\uFF0C\u8BB0\u4F4F\u8FD9\u79CD\u611F\u89C9\u3002",
    "\u4ECA\u5929\u653E\u6162\u4E86\u4E00\u70B9\uFF0C\u4F46\u4ECD\u7136\u7559\u4E0B\u4E86\u8BB0\u5F55\u3002",
    "\u628A\u8FC7\u7A0B\u62C6\u5C0F\u4E4B\u540E\uFF0C\u884C\u52A8\u660E\u663E\u66F4\u8F7B\u677E\u3002",
    "\u665A\u95F4\u590D\u76D8\uFF1A\u4E13\u6CE8\u6765\u81EA\u5C11\u505A\u4E00\u4EF6\u4E8B\u3002"
  ];
  for (let offset = -125; offset < 0; offset++) {
    const date = addDays(today, offset);
    const dayIndex = offset + 125;
    if (dayIndex % 11 !== 0) {
      const recentLift = offset >= -7 ? 1500 : offset >= -30 ? 900 : offset >= -90 ? 300 : 0;
      record(habits[0], date, "add", 900 + recentLift + dayIndex % 5 * 240);
      if (dayIndex % 9 === 0) record(habits[0], date, "add", 420, "\u8865\u8BB0\u4E00\u5C0F\u6BB5\u4E13\u6CE8\u9605\u8BFB\u3002 ");
    }
    if (dayIndex % 4 !== 0) {
      const listeningBase = offset >= -30 ? 1200 : 600;
      record(habits[1], date, "add", listeningBase + dayIndex % 3 * 300);
    }
    if (offset >= -30 && dayIndex % 5 !== 0 || offset < -30 && dayIndex % 3 === 0) {
      record(habits[2], date, "set", true);
    }
    if (dayIndex % 13 !== 0) {
      const cups = 3 + dayIndex % 5 + (offset >= -30 ? 2 : 0);
      record(habits[3], date, "add", cups);
    }
    if (dayIndex % 4 === 0 || offset >= -7 && dayIndex % 2 === 0) {
      record(habits[4], date, "note", reflectionNotes[dayIndex % reflectionNotes.length]);
    }
  }
  record(habits[0], today, "add", 1200, "\u8BFB\u5B8C\u7B2C\u4E8C\u7AE0\uFF0C\u8BB0\u4E0B\u4E86\u4E09\u4E2A\u503C\u5F97\u5B9E\u8DF5\u7684\u60F3\u6CD5\u3002");
  record(habits[1], today, "add", 1200);
  record(habits[2], today, "set", true);
  record(habits[3], today, "add", 4);
  record(habits[4], today, "note", "\u508D\u665A\u6563\u6B65\u65F6\u770B\u89C1\u4E00\u7247\u5F88\u6E29\u67D4\u7684\u665A\u971E\u3002\u7ED9\u4ECA\u5929\u7559\u4E00\u70B9\u7A7A\u767D\uFF0C\u4E5F\u662F\u4E00\u79CD\u8FDB\u6B65\u3002");
  var dailyRitualCheckIns = [];
  var restChimeReplayCount = 0;
  var view;
  var activityView;
  var controller = {
    settings: { dataFolder: "\u65E5\u8FF9", firstDayOfWeek: "monday", timezone: "Asia/Shanghai" },
    dailyReflectionSeed: "\u65E5\u8FF9",
    deviceState: { deviceId: "preview-only", restTimer: { startedAt: Date.now() - 23 * 60 * 1e3 }, runningTimer: { habitId: habits[0].id, date: today, startedAt: Date.now() - 23 * 60 * 1e3 - 16 * 1e3 } },
    habits,
    events,
    dailyRitualCheckIns,
    issues: [],
    galleryItems: [],
    activitySelections: [],
    setActivityWindowPinned(pinned) {
      this.deviceState.activityWindowPinned = pinned;
    },
    async openActivityView(date) {
      if (!activityView) {
        const panel = document.body.createDiv("preview-activity-host");
        Object.assign(panel.style, { position: "fixed", top: "0", right: "0", width: "min(420px, 100vw)", height: "100vh", zIndex: "1000", boxShadow: "-20px 0 70px #0008", overflow: "auto" });
        activityView = new ActivityView({ previewContainer: panel }, controller);
        await activityView.onOpen();
      }
      if (date) await activityView.setState({ date });
    },
    async reorderHabit(sourceId, targetId, after) {
      const group = moveHabitIds(habits, sourceId, targetId, after);
      const sorted = applyHabitOrder(habits, [group]);
      habits.splice(0, habits.length, ...sorted);
      view.refresh();
      activityView?.refresh();
    },
    async setActivitySelected(date, habitId, included) {
      this.activitySelections.push({ version: 1, id: `activity_${this.activitySelections.length}`, date, habitId, included, recordedAt: (/* @__PURE__ */ new Date()).toISOString() });
      view.refresh();
      activityView?.refresh();
    },
    async importGalleryImages(files) {
      for (const file of files) this.galleryItems.push({ path: file.name, url: URL.createObjectURL(file), title: file.name, description: "", createdAt: Date.now() });
      view.refresh();
      activityView?.refresh();
    },
    async saveGalleryDetails(path, title, description) {
      const item = this.galleryItems.find((item2) => item2.path === path);
      if (item) Object.assign(item, { title, description });
      view.refresh();
      activityView?.refresh();
    },
    async updateSettings(settings) {
      Object.assign(this.settings, settings);
      view.refresh();
      activityView?.refresh();
    },
    openHabitEditor(habit) {
      new HabitModal(view.app, { habit, effectiveDate: today, nextOrder: habits.length, onSubmit: async (next) => {
        const index = habits.findIndex((item) => item.id === next.id);
        if (index >= 0) habits[index] = next;
        else habits.push(next);
        view.refresh();
        activityView?.refresh();
      } }).open();
    },
    async archiveHabit() {
    },
    async restoreHabit() {
    },
    async recordCheckbox(habit, date, value) {
      record(habit, date, "set", value);
      view.refresh();
      activityView?.refresh();
    },
    async recordNumber(habit, date, value, note) {
      record(habit, date, "add", value, note);
      view.refresh();
      activityView?.refresh();
    },
    async recordText(habit, date, value) {
      record(habit, date, "note", value);
      view.refresh();
      activityView?.refresh();
    },
    async retractEvent(habit, event) {
      record(habit, event.occurredOn, "retract", void 0, "", event.id);
      view.refresh();
      activityView?.refresh();
    },
    async toggleTimer(habit, date) {
      const running = this.deviceState.runningTimer;
      if (running) {
        if (running.habitId !== habit.id) throw new Error("\u8BF7\u5148\u505C\u6B62\u6B63\u5728\u8FDB\u884C\u7684\u8BA1\u65F6");
        record(habit, running.date, "add", Math.floor((Date.now() - running.startedAt) / 1e3));
        delete this.deviceState.runningTimer;
      } else this.deviceState.runningTimer = { habitId: habit.id, date, startedAt: Date.now() };
      view.refresh();
      activityView?.refresh();
    },
    openDailyRitualCheckIn() {
      openDailyRitualCheckIn();
    },
    openSettings() {
      new Notice("\u9884\u89C8\u6A21\u5F0F\uFF1A\u6240\u6709\u6837\u4F8B\u4EC5\u5B58\u5728\u5185\u5B58\uFF0C\u4E0D\u4F1A\u4FEE\u6539\u4ED3\u5E93\u6216\u8BBE\u7F6E\u3002");
    }
  };
  function openDailyRitualCheckIn() {
    const passage = getDailyRitualPassage(today, controller.dailyReflectionSeed);
    new DailyRitualModal(view.app, {
      date: today,
      passage,
      onCheckIn: async () => {
        if (!dailyRitualCheckIns.some((checkIn) => checkIn.occurredOn === today)) {
          dailyRitualCheckIns.push({
            version: 1,
            id: "checkin-preview-only",
            type: "daily-ritual",
            occurredOn: today,
            recordedAt: (/* @__PURE__ */ new Date()).toISOString(),
            timezone: controller.settings.timezone,
            deviceId: controller.deviceState.deviceId,
            passageId: passage.id
          });
        }
        view.refresh();
        activityView?.refresh();
      },
      onDismiss: () => {
      }
    }).open();
  }
  view = new DaymarkView({}, controller);
  window.preview = {
    view,
    controller,
    get activityView() {
      return activityView;
    },
    openDailyRitual: openDailyRitualCheckIn,
    openRestReminder: () => new RestReminderModal(view.app, {
      habitName: habits[0].name,
      elapsedSeconds: 1800,
      onReplaySound: async () => {
        restChimeReplayCount += 1;
        await new Promise((resolve) => window.setTimeout(resolve, 120));
        return true;
      },
      onStop: () => controller.toggleTimer(habits[0], today),
      onDismiss: () => {
      }
    }).open(),
    get restChimeReplayCount() {
      return restChimeReplayCount;
    }
  };
  view.onOpen().then(() => {
    window.previewReady = true;
    if (params.get("modal") === "ritual") window.preview.openDailyRitual();
  });
})();
