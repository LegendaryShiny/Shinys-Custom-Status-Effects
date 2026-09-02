/**
 * Shiny's Custom Status Effects
 * - Registers custom conditions in CONFIG.statusEffects (Token HUD)
 * - Settings menu with inline editing (no delete+recreate needed)
 * - Shows each condition's name next to its icon in the Token HUD
 */

const MODULE_ID = "shinys-custom-status-effects";
const SETTING_KEY = "customConditions";

const DEFAULT_CONDITIONS = [
  { id: "custom-status", name: "Custom Status", img: "icons/svg/aura.svg" }
];

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
    return { conditions: game.settings.get(MODULE_ID, SETTING_KEY) ?? [] };
  }

  activateListeners(html) {
    super.activateListeners(html);
    // Prevent Enter key from submitting the form unexpectedly
    html.on("submit", (ev) => ev.preventDefault());

    html.find(".add-condition").on("click", this._onAdd.bind(this));
    html.find(".delete-condition").on("click", this._onDelete.bind(this));
    html.find(".pick-image").on("click", this._onPickImage.bind(this));

    // Save a row when any of its fields loses focus after a change
    html.find(".cond-row input").on("change", this._onRowChange.bind(this));
    // Live-update the icon preview while typing the image path
    html.find(".cond-img").on("input", this._onImgPreview.bind(this));
  }

  _onImgPreview(event) {
    const row = event.currentTarget.closest(".cond-row");
    const preview = row?.querySelector(".cond-preview");
    if (preview) preview.src = event.currentTarget.value;
  }

  _onPickImage(event) {
    event.preventDefault();
    const row = event.currentTarget.closest(".cond-row");
    const input = row.querySelector(".cond-img");
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

  async _onRowChange(event) {
    const row = event.currentTarget.closest(".cond-row");
    const originalId = row.dataset.id;

    const id = row.querySelector(".cond-id").value.trim();
    const name = row.querySelector(".cond-name").value.trim();
    const img = row.querySelector(".cond-img").value.trim();

    if (!id || !name || !img) {
      ui.notifications.warn("ID, Name, and Icon are all required.");
      return;
    }
    if (!/^[a-z0-9-]+$/i.test(id)) {
      ui.notifications.warn("ID may only contain letters, numbers, and hyphens.");
      return;
    }

    const conditions = foundry.utils.deepClone(game.settings.get(MODULE_ID, SETTING_KEY) ?? []);
    const index = conditions.findIndex(c => c.id === originalId);
    if (index === -1) return;

    const duplicate = conditions.some((c, i) => c.id === id && i !== index);
    if (duplicate) {
      ui.notifications.warn(`ID "${id}" is already in use.`);
      return;
    }

    conditions[index] = { id, name, img };
    await game.settings.set(MODULE_ID, SETTING_KEY, conditions);
    row.dataset.id = id;
    ui.notifications.info(`"${name}" saved. Reload Foundry (F5) for the Token HUD to pick it up.`);
  }

  async _onAdd(event) {
    event.preventDefault();
    const conditions = foundry.utils.deepClone(game.settings.get(MODULE_ID, SETTING_KEY) ?? []);

    let n = 1;
    while (conditions.some(c => c.id === `new-effect-${n}`)) n++;
    conditions.push({ id: `new-effect-${n}`, name: "New Effect", img: "icons/svg/aura.svg" });

    await game.settings.set(MODULE_ID, SETTING_KEY, conditions);
    this.render();
  }

  async _onDelete(event) {
    event.preventDefault();
    const row = event.currentTarget.closest(".cond-row");
    const id = row.dataset.id;

    const conditions = foundry.utils.deepClone(game.settings.get(MODULE_ID, SETTING_KEY) ?? []);
    const filtered = conditions.filter(c => c.id !== id);

    await game.settings.set(MODULE_ID, SETTING_KEY, filtered);
    this.render();
  }

  async _updateObject() {
    // Saving happens per-row on change, nothing to do on submit.
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

  game.settings.registerMenu(MODULE_ID, "customConditionsMenu", {
    name: "Custom Conditions",
    label: "Manage Conditions",
    hint: "Add, edit, or remove custom conditions (e.g. for spell effects).",
    icon: "fas fa-star",
    type: ShinysStatusEffectsConfig,
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
  const conditions = game.settings.get(MODULE_ID, SETTING_KEY) ?? [];
  const isArray = Array.isArray(CONFIG.statusEffects);

  for (const condition of conditions) {
    const entry = {
      id: condition.id,
      name: condition.name,
      img: condition.img,
      hud: true
    };

    if (isArray) {
      const idx = CONFIG.statusEffects.findIndex(e => e.id === condition.id);
      if (idx === -1) CONFIG.statusEffects.push(entry);
      else CONFIG.statusEffects[idx] = entry;
    } else {
      CONFIG.statusEffects[condition.id] = entry;
    }
  }

  console.log(`${MODULE_ID} | ${conditions.length} custom condition(s) loaded`);
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

  const controls = container.querySelectorAll(".effect-control");
  controls.forEach((el) => {
    if (el.dataset.scseDone) return;
    el.dataset.scseDone = "true";

    const label = el.dataset.tooltip
      || el.getAttribute("title")
      || el.getAttribute("aria-label")
      || "";
    if (!label) return;

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
    } else {
      const span = document.createElement("span");
      span.className = "scse-label";
      span.textContent = label;
      el.appendChild(span);
    }
  });
});
