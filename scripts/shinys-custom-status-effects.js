/**
 * Shiny's Custom Status Effects
 * - Registers custom conditions in CONFIG.statusEffects (Token HUD)
 * - Settings menu with inline editing (no delete+recreate needed)
 * - Shows each condition's name next to its icon in the Token HUD
 */

const MODULE_ID = "shinys-custom-status-effects";
const SETTING_KEY = "customConditions";
const OVERRIDE_KEY = "builtinOverrides";

const DEFAULT_CONDITIONS = [
  { id: "custom-status", name: "Custom Status", img: "icons/svg/aura.svg" }
];

// Populated in the "setup" hook with each built-in condition's untouched
// name/icon, before any saved override is applied — lets the management
// screen reset a row without needing a reload.
const SCSE_BUILTIN_DEFAULTS = {};

/* -------------------------------------------- */
/*  Settings menu (FormApplication)              */
/* -------------------------------------------- */

class ShinysStatusEffectsConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "shinys-custom-status-effects-config",
      title: "Shiny's Custom Status Effects – Manage Conditions",
      template: `modules/${MODULE_ID}/templates/config.html`,
      width: 640,
      height: "auto",
      closeOnSubmit: false,
      classes: ["scse-config-app"]
    });
  }

  getData() {
    // Work on a local copy so nothing is written to settings until the
    // user presses "Save & Reload" — closing the window discards edits.
    if (!this._conditions) {
      this._conditions = foundry.utils.deepClone(game.settings.get(MODULE_ID, SETTING_KEY) ?? []);
    }
    return { conditions: this._conditions };
  }

  activateListeners(html) {
    super.activateListeners(html);
    // Prevent Enter key from submitting the form unexpectedly
    html.on("submit", (ev) => ev.preventDefault());

    html.find(".add-condition").on("click", this._onAdd.bind(this));
    html.find(".delete-condition").on("click", this._onDelete.bind(this));
    html.find(".pick-image").on("click", (ev) => this._openFilePicker(ev, ".cond-img"));

    // Live-update the icon preview while typing the image path
    html.find(".cond-img").on("input", this._onImgPreview.bind(this));

    html.find(".save-reload").on("click", this._onSaveAndReload.bind(this));
    html.find(".export-conditions").on("click", this._onExport.bind(this));
    html.find(".import-conditions").on("click", this._onImportClick.bind(this));
    html.find(".import-file-input").on("change", this._onImportFile.bind(this));
  }

  // Reads the current (possibly unsaved) values straight out of the DOM
  // and stores them as the working copy, preserving in-progress edits
  // across an add/delete/import re-render.
  _syncFromDom() {
    const conditions = [];
    this.element.find(".cond-row").each((_, row) => {
      const id = row.querySelector(".cond-id")?.value.trim() ?? "";
      const name = row.querySelector(".cond-name")?.value.trim() ?? "";
      const img = row.querySelector(".cond-img")?.value.trim() ?? "";
      conditions.push({ id, name, img });
    });
    this._conditions = conditions;
  }

  _openFilePicker(event, inputSelector) {
    event.preventDefault();
    const row = event.currentTarget.closest("tr");
    const input = row.querySelector(inputSelector);
    const fp = new FilePicker({
      type: "image",
      current: input.value,
      callback: (path) => {
        input.value = path;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    fp.render(true);
  }

  _onImgPreview(event) {
    const row = event.currentTarget.closest(".cond-row");
    const preview = row?.querySelector(".cond-preview");
    if (preview) preview.src = event.currentTarget.value;
  }

  _onDelete(event) {
    event.preventDefault();
    const row = event.currentTarget.closest(".cond-row");
    const rows = this.element.find(".cond-row").toArray();
    const index = rows.indexOf(row);

    this._syncFromDom();
    if (index > -1) this._conditions.splice(index, 1);
    this.render();
  }

  _onAdd(event) {
    event.preventDefault();
    this._syncFromDom();

    let n = 1;
    while (this._conditions.some(c => c.id === `new-effect-${n}`)) n++;
    this._conditions.push({ id: `new-effect-${n}`, name: "New Effect", img: "icons/svg/aura.svg" });

    this.render();
  }

  async _onSaveAndReload(event) {
    event.preventDefault();
    this._syncFromDom();

    const conditions = this._conditions.filter(c => c.id && c.name && c.img);

    for (const c of conditions) {
      if (!/^[a-z0-9-]+$/i.test(c.id)) {
        ui.notifications.warn(`ID "${c.id}" may only contain letters, numbers, and hyphens. Fix it before saving.`);
        return;
      }
    }

    const ids = conditions.map(c => c.id);
    const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    if (dupes.length) {
      ui.notifications.warn(`Duplicate ID(s): ${dupes.join(", ")}. Fix them before saving.`);
      return;
    }

    await game.settings.set(MODULE_ID, SETTING_KEY, conditions);
    window.location.reload();
  }

  _onExport(event) {
    event.preventDefault();
    this._syncFromDom();

    const conditions = this._conditions.filter(c => c.id && c.name && c.img);
    const data = JSON.stringify(conditions, null, 2);

    // Foundry's own helper reliably triggers a real file download instead
    // of opening the content in a new tab (which a plain <a download> link
    // can run into inside Foundry's UI).
    saveDataToFile(data, "text/json", "shinys-custom-status-effects-export.json");
  }

  _onImportClick(event) {
    event.preventDefault();
    this.element.find(".import-file-input")[0]?.click();
  }

  async _onImportFile(event) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (!Array.isArray(imported)) throw new Error("Expected a JSON array");

      this._syncFromDom();
      const existingIds = new Set(this._conditions.map(c => c.id));

      let added = 0;
      let skipped = 0;

      for (const entry of imported) {
        if (!entry?.id || !entry?.name || !entry?.img || existingIds.has(entry.id)) {
          skipped++;
          continue;
        }
        this._conditions.push({ id: entry.id, name: entry.name, img: entry.img });
        existingIds.add(entry.id);
        added++;
      }

      ui.notifications.info(`Imported ${added} condition(s)${skipped ? `, skipped ${skipped} (missing fields or duplicate ID)` : ""}. Press "Save & Reload" to keep them.`);
      this.render();
    } catch (err) {
      console.error(`${MODULE_ID} | Import failed:`, err);
      ui.notifications.error("Could not import — make sure the file is a valid export from this module.");
    } finally {
      event.currentTarget.value = "";
    }
  }

  async _updateObject() {
    // Saving only happens via the "Save & Reload" button.
  }
}

/* -------------------------------------------- */
/*  Settings menu: built-in conditions           */
/* -------------------------------------------- */

class ShinysBuiltinConditionsConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "shinys-builtin-conditions-config",
      title: "Shiny's Custom Status Effects – Manage Built-in Conditions",
      template: `modules/${MODULE_ID}/templates/builtin.html`,
      width: 640,
      height: "auto",
      closeOnSubmit: false,
      classes: ["scse-config-app"]
    });
  }

  getData() {
    const conditions = game.settings.get(MODULE_ID, SETTING_KEY) ?? [];
    const overrides = game.settings.get(MODULE_ID, OVERRIDE_KEY) ?? {};
    const customIds = new Set(conditions.map(c => c.id));

    const isArrayConfig = Array.isArray(CONFIG.statusEffects);
    const allEffects = isArrayConfig ? CONFIG.statusEffects : Object.values(CONFIG.statusEffects);

    const builtins = allEffects
      .filter(e => e.id && !customIds.has(e.id))
      .map(e => {
        const o = overrides[e.id] ?? {};
        return {
          id: e.id,
          name: o.name ?? game.i18n.localize(e.name || e.label || e.id),
          img: o.img ?? e.img ?? e.icon ?? "",
          hidden: !!o.hidden
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return { builtins };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.on("submit", (ev) => ev.preventDefault());

    html.find(".pick-image-builtin").on("click", (ev) => this._openFilePicker(ev, ".builtin-img"));
    html.find(".builtin-img").on("input", this._onImgPreview.bind(this));
    html.find(".reset-builtin").on("click", this._onBuiltinReset.bind(this));
    html.find(".save-reload").on("click", this._onSaveAndReload.bind(this));
  }

  _openFilePicker(event, inputSelector) {
    event.preventDefault();
    const row = event.currentTarget.closest("tr");
    const input = row.querySelector(inputSelector);
    const fp = new FilePicker({
      type: "image",
      current: input.value,
      callback: (path) => {
        input.value = path;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    fp.render(true);
  }

  _onImgPreview(event) {
    const row = event.currentTarget.closest(".builtin-row");
    const preview = row?.querySelector(".cond-preview");
    if (preview) preview.src = event.currentTarget.value;
  }

  _onBuiltinReset(event) {
    event.preventDefault();
    const row = event.currentTarget.closest(".builtin-row");
    const id = row.dataset.id;

    const def = SCSE_BUILTIN_DEFAULTS[id];
    if (!def) return;

    row.querySelector(".builtin-name").value = def.name;
    row.querySelector(".builtin-img").value = def.img;
    row.querySelector(".cond-preview").src = def.img;
    row.querySelector(".builtin-visible").checked = true;
  }

  async _onSaveAndReload(event) {
    event.preventDefault();

    const overrides = {};
    this.element.find(".builtin-row").each((_, row) => {
      const id = row.dataset.id;
      const name = row.querySelector(".builtin-name")?.value.trim();
      const img = row.querySelector(".builtin-img")?.value.trim();
      const visibleInHud = row.querySelector(".builtin-visible")?.checked;

      const next = {};
      if (name) next.name = name;
      if (img) next.img = img;
      if (!visibleInHud) next.hidden = true;
      if (Object.keys(next).length) overrides[id] = next;
    });

    await game.settings.set(MODULE_ID, OVERRIDE_KEY, overrides);
    window.location.reload();
  }

  async _updateObject() {
    // Saving only happens via the "Save & Reload" button.
  }
}

/* -------------------------------------------- */
/*  Register setting + menu                      */
/* -------------------------------------------- */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTING_KEY, {
    scope: "world",
    config: false,
    type: Array,
    default: DEFAULT_CONDITIONS
  });

  game.settings.register(MODULE_ID, OVERRIDE_KEY, {
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(MODULE_ID, "showHoverEffects", {
    name: "Show active conditions on hover",
    hint: "When hovering over a token, display a small panel next to it listing that token's active conditions with icon and name.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.registerMenu(MODULE_ID, "customConditionsMenu", {
    name: "Custom Conditions",
    label: "Manage Custom Conditions",
    hint: "Add, edit, or remove custom conditions (e.g. for spell effects).",
    icon: "fas fa-star",
    type: ShinysStatusEffectsConfig,
    restricted: true
  });

  game.settings.registerMenu(MODULE_ID, "builtinConditionsMenu", {
    name: "Built-in Conditions",
    label: "Manage Standard Conditions",
    hint: "Rename, re-icon, or hide the system's default conditions from the Token HUD.",
    icon: "fas fa-shield-halved",
    type: ShinysBuiltinConditionsConfig,
    restricted: true
  });
});

/* -------------------------------------------- */
/*  Register conditions in CONFIG.statusEffects  */
/* -------------------------------------------- */

// "setup" instead of "init": runs AFTER the system (e.g. dnd5e) and all
// other modules have finished their init hooks, so our entries aren't
// wiped out by the system rebuilding its own condition list.
Hooks.once("setup", () => {
  const isArrayConfig = Array.isArray(CONFIG.statusEffects);
  const allEffectsBefore = isArrayConfig ? CONFIG.statusEffects : Object.values(CONFIG.statusEffects);

  // Remember each built-in condition's untouched name/icon BEFORE any
  // override is applied, so the management screen can reset a row back
  // to this without needing a reload.
  for (const entry of allEffectsBefore) {
    if (!entry.id) continue;
    SCSE_BUILTIN_DEFAULTS[entry.id] = {
      name: game.i18n.localize(entry.name || entry.label || entry.id),
      img: entry.img || entry.icon || ""
    };
  }

  // Apply overrides (rename / re-icon / hide) to whatever the system and
  // core have already registered before we add our own conditions.
  const overrides = game.settings.get(MODULE_ID, OVERRIDE_KEY) ?? {};
  for (const entry of allEffectsBefore) {
    const o = overrides[entry.id];
    if (!o) continue;
    if (o.name) entry.name = o.name;
    if (o.img) entry.img = o.img;
    if (o.hidden) entry.hud = false;
  }

  const conditions = game.settings.get(MODULE_ID, SETTING_KEY) ?? [];

  for (const condition of conditions) {
    const entry = {
      id: condition.id,
      name: condition.name,
      img: condition.img,
      hud: true
    };

    if (isArrayConfig) {
      const idx = CONFIG.statusEffects.findIndex(e => e.id === condition.id);
      if (idx === -1) CONFIG.statusEffects.push(entry);
      else CONFIG.statusEffects[idx] = entry;
    } else {
      CONFIG.statusEffects[condition.id] = entry;
    }
  }

  console.log(`${MODULE_ID} | ${conditions.length} custom condition(s) loaded, ${Object.keys(overrides).length} built-in override(s) applied`);
});


/* -------------------------------------------- */
/*  Show the name next to each icon in the HUD   */
/* -------------------------------------------- */

Hooks.on("renderTokenHUD", (_app, html) => {
  // html is jQuery in older versions, a native HTMLElement in newer ones
  const root = html?.jquery ? html[0] : html;
  if (!root) return;

  const container = root.querySelector(".status-effects");
  if (!container) return;

  container.classList.add("scse-enhanced");

  const isArrayConfig = Array.isArray(CONFIG.statusEffects);
  const allEffects = isArrayConfig ? CONFIG.statusEffects : Object.values(CONFIG.statusEffects);

  // Collect {gridItem, label} for every icon so we can sort them visually
  // afterwards, without touching CONFIG.statusEffects itself (mutating
  // Foundry's own data structure turned out to be fragile).
  const items = [];

  const controls = container.querySelectorAll(".effect-control");
  controls.forEach((el) => {
    // Try to identify which status this icon represents, then look its
    // name up from CONFIG.statusEffects — far more reliable than scraping
    // a tooltip attribute, which isn't consistent across Foundry versions.
    const statusId = el.dataset.statusId
      || el.getAttribute("data-status-id")
      || el.dataset.effect
      || el.getAttribute("data-effect")
      || "";

    let cfg = statusId ? allEffects.find(e => e.id === statusId) : null;

    if (!cfg) {
      const src = el.tagName === "IMG" ? el.getAttribute("src") : "";
      if (src) cfg = allEffects.find(e => (e.img || e.icon) && src.includes(e.img || e.icon));
    }

    let label = cfg ? game.i18n.localize(cfg.name || cfg.label || "") : "";
    if (!label) {
      label = el.dataset.tooltip || el.getAttribute("title") || el.getAttribute("aria-label") || "";
    }

    if (!label) {
      console.debug(`${MODULE_ID} | Could not determine a label for this icon:`, el);
      items.push({ gridItem: el, label: "\uFFFF" }); // sort unlabeled icons last
      return;
    }

    let gridItem = el;

    if (!el.dataset.scseDone) {
      el.dataset.scseDone = "true";

      if (el.tagName === "IMG") {
        // <img> elements can't render child nodes, so wrap the icon in a
        // container that carries the same class/attributes (for Foundry's
        // own click handling) and add the icon + label as its children.
        const wrapper = document.createElement("div");
        for (const attr of el.attributes) {
          if (attr.name !== "class") wrapper.setAttribute(attr.name, attr.value);
        }
        wrapper.className = `${el.className} scse-wrapper`;
        el.classList.add("scse-icon-img");

        el.replaceWith(wrapper);
        wrapper.appendChild(el);

        const span = document.createElement("span");
        span.className = "scse-label";
        span.textContent = label;
        wrapper.appendChild(span);

        gridItem = wrapper;
      } else {
        const span = document.createElement("span");
        span.className = "scse-label";
        span.textContent = label;
        el.appendChild(span);
      }
    } else {
      // Already processed on an earlier pass (shouldn't normally happen
      // within one render), find the wrapper if it exists.
      gridItem = el.closest(".scse-wrapper") || el;
    }

    items.push({ gridItem, label });
  });

  // Sort alphabetically and apply as CSS "order" on the actual grid
  // items — purely visual, doesn't touch Foundry's underlying data.
  items.sort((a, b) => a.label.localeCompare(b.label));
  items.forEach(({ gridItem }, index) => {
    gridItem.style.order = index;
  });

  // Search field, pinned to the top regardless of sort order, filters
  // the grid items live as you type.
  if (!container.querySelector(".scse-search")) {
    const searchWrap = document.createElement("div");
    searchWrap.className = "scse-search-wrap";
    searchWrap.style.order = -1;

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "scse-search";
    searchInput.placeholder = "Search conditions…";

    // Don't let typing here bubble up to canvas hotkeys or close the HUD
    searchInput.addEventListener("click", (ev) => ev.stopPropagation());
    searchInput.addEventListener("keydown", (ev) => ev.stopPropagation());
    searchInput.addEventListener("keyup", (ev) => ev.stopPropagation());

    searchInput.addEventListener("input", (ev) => {
      const term = ev.currentTarget.value.trim().toLowerCase();
      items.forEach(({ gridItem, label }) => {
        const match = !term || label.toLowerCase().includes(term);
        gridItem.classList.toggle("scse-hidden", !match);
      });
    });

    searchWrap.appendChild(searchInput);
    container.appendChild(searchWrap);
  }

  // "Clear All" button, pinned to the bottom of the palette regardless
  // of sort order.
  if (!container.querySelector(".scse-clear-all")) {
    const token = _app.object ?? _app.token;

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "scse-clear-all";
    clearBtn.textContent = "Clear All";
    clearBtn.style.order = 999999;
    clearBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      scseClearAllStatuses(token);
    });

    container.appendChild(clearBtn);
  }
});

async function scseClearAllStatuses(token) {
  const actor = token?.actor;
  if (!actor) return;

  const ids = actor.statuses instanceof Set ? Array.from(actor.statuses) : [];
  for (const id of ids) {
    await actor.toggleStatusEffect(id, { active: false });
  }
}

/* -------------------------------------------- */
/*  Hover panel: active conditions + names       */
/* -------------------------------------------- */

const HOVER_SETTING_KEY = "showHoverEffects";
let scseHoverPanel = null;

function scseGetActiveStatuses(token) {
  const actor = token.actor;
  if (!actor) return [];

  const isArrayConfig = Array.isArray(CONFIG.statusEffects);
  const allEffects = isArrayConfig ? CONFIG.statusEffects : Object.values(CONFIG.statusEffects);

  let ids = [];
  if (actor.statuses instanceof Set) {
    // Modern Foundry: Actor#statuses is a Set of active status IDs
    ids = Array.from(actor.statuses);
  } else if (Array.isArray(token.document?.effects)) {
    // Fallback for older versions: effects is an array of icon paths
    ids = token.document.effects
      .map(src => allEffects.find(e => (e.img || e.icon) === src)?.id)
      .filter(Boolean);
  }

  return ids
    .map(id => allEffects.find(e => e.id === id))
    .filter(Boolean)
    .map(e => ({
      name: game.i18n.localize(e.name || e.label || e.id),
      img: e.img || e.icon || ""
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function scseShowHoverPanel(token) {
  if (!game.settings.get(MODULE_ID, HOVER_SETTING_KEY)) return;

  const statuses = scseGetActiveStatuses(token);
  scseHideHoverPanel();
  if (!statuses.length) return;

  const panel = document.createElement("div");
  panel.id = "scse-hover-panel";

  for (const s of statuses) {
    const row = document.createElement("div");
    row.className = "scse-hover-row";

    if (s.img) {
      const img = document.createElement("img");
      img.src = s.img;
      row.appendChild(img);
    }

    const label = document.createElement("span");
    label.textContent = s.name;
    row.appendChild(label);

    panel.appendChild(row);
  }

  document.body.appendChild(panel);
  scseHoverPanel = panel;
  scsePositionHoverPanel(token);
}

function scsePositionHoverPanel(token) {
  if (!scseHoverPanel || !canvas?.app?.view) return;

  const canvasRect = canvas.app.view.getBoundingClientRect();
  const global = token.getGlobalPosition ? token.getGlobalPosition() : { x: token.x, y: token.y };
  const scale = canvas.stage?.scale?.x ?? 1;
  const tokenWidthPx = (token.w ?? 0) * scale;

  scseHoverPanel.style.left = `${canvasRect.left + global.x + tokenWidthPx + 8}px`;
  scseHoverPanel.style.top = `${canvasRect.top + global.y}px`;
}

function scseHideHoverPanel() {
  if (scseHoverPanel) {
    scseHoverPanel.remove();
    scseHoverPanel = null;
  }
}

Hooks.on("hoverToken", (token, hovered) => {
  if (hovered) scseShowHoverPanel(token);
  else scseHideHoverPanel();
});

// If conditions change on the actor currently being hovered, refresh
// the panel's contents instead of leaving it stale.
Hooks.on("updateActor", (actor) => {
  const hovered = canvas.tokens?.hover;
  if (hovered?.actor === actor) scseShowHoverPanel(hovered);
});

// Keep the panel glued to the token while panning/zooming
Hooks.on("canvasPan", () => {
  if (scseHoverPanel && canvas.tokens?.hover) scsePositionHoverPanel(canvas.tokens.hover);
});

// Clear any leftover panel when switching scenes
Hooks.on("canvasReady", scseHideHoverPanel);
