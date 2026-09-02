/**
 * Shiny's Custom Status Effects
 * - Registriert eigene Zustände in CONFIG.statusEffects (Token-HUD)
 * - Einstellungsmenü zum Hinzufügen/Entfernen ohne Dateibearbeitung
 * - Zeigt den Namen jeder Condition als Label im Token-HUD an
 */

const MODULE_ID = "shinys-custom-status-effects";
const SETTING_KEY = "customConditions";

const DEFAULT_CONDITIONS = [
  { id: "arcane-mark", name: "Arkan Markiert", img: "icons/svg/target.svg" },
  { id: "blessed-custom", name: "Gesegnet", img: "icons/svg/aura.svg" },
  { id: "cursed-custom", name: "Verflucht", img: "icons/svg/degen.svg" },
  { id: "concentration-broken", name: "Konzentration gebrochen", img: "icons/svg/downgrade.svg" },
  { id: "hunters-mark", name: "Jägers Zeichen", img: "icons/svg/eye.svg" },
  { id: "warded", name: "Beschützt", img: "icons/svg/holy-shield.svg" }
];

/* -------------------------------------------- */
/*  Settings-Menü (FormApplication)              */
/* -------------------------------------------- */

class ShinysStatusEffectsConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "shinys-custom-status-effects-config",
      title: "Shiny's Custom Status Effects – Verwaltung",
      template: `modules/${MODULE_ID}/templates/config.html`,
      width: 480,
      height: "auto",
      closeOnSubmit: false
    });
  }

  getData() {
    return { conditions: game.settings.get(MODULE_ID, SETTING_KEY) ?? [] };
  }

  activateListeners(html) {
    super.activateListeners(html);
    // Verhindert, dass Enter im Textfeld das Formular ungewollt abschickt
    html.on("submit", (ev) => ev.preventDefault());
    html.find(".add-condition").on("click", this._onAdd.bind(this));
    html.find(".delete-condition").on("click", this._onDelete.bind(this));
    html.find(".pick-image").on("click", this._onPickImage.bind(this));
  }

  _onPickImage(event) {
    event.preventDefault();
    const input = event.currentTarget.previousElementSibling;
    const fp = new FilePicker({
      type: "image",
      current: input.value,
      callback: (path) => { input.value = path; }
    });
    fp.render(true);
  }

  async _onAdd(event) {
    event.preventDefault();
    const id = this.element.find("[name='newId']").val()?.trim();
    const name = this.element.find("[name='newName']").val()?.trim();
    const img = this.element.find("[name='newImg']").val()?.trim();

    if (!id || !name || !img) {
      ui.notifications.warn("Bitte ID, Name und Icon-Pfad ausfüllen.");
      return;
    }
    if (!/^[a-z0-9-]+$/i.test(id)) {
      ui.notifications.warn("Die ID darf nur Buchstaben, Zahlen und Bindestriche enthalten.");
      return;
    }

    const conditions = foundry.utils.deepClone(game.settings.get(MODULE_ID, SETTING_KEY) ?? []);
    if (conditions.some(c => c.id === id)) {
      ui.notifications.warn(`Die ID "${id}" existiert bereits.`);
      return;
    }

    conditions.push({ id, name, img });
    await game.settings.set(MODULE_ID, SETTING_KEY, conditions);
    ui.notifications.info(`"${name}" hinzugefügt. Foundry neu laden, damit sie im HUD erscheint.`);
    this.render();
  }

  async _onDelete(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.id;
    const conditions = foundry.utils.deepClone(game.settings.get(MODULE_ID, SETTING_KEY) ?? []);
    const filtered = conditions.filter(c => c.id !== id);
    await game.settings.set(MODULE_ID, SETTING_KEY, filtered);
    this.render();
  }

  async _updateObject() {
    // Speichern passiert direkt beim Hinzufügen/Löschen, hier nichts zu tun.
  }
}

/* -------------------------------------------- */
/*  Registrierung von Setting + Menü             */
/* -------------------------------------------- */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTING_KEY, {
    scope: "world",
    config: false,
    type: Array,
    default: DEFAULT_CONDITIONS
  });

  game.settings.registerMenu(MODULE_ID, "customConditionsMenu", {
    name: "Eigene Zustände",
    label: "Zustände verwalten",
    hint: "Eigene Conditions (z.B. für Zaubereffekte) hinzufügen oder entfernen.",
    icon: "fas fa-star",
    type: ShinysStatusEffectsConfig,
    restricted: true
  });
});

/* -------------------------------------------- */
/*  Zustände in CONFIG.statusEffects eintragen   */
/* -------------------------------------------- */

// "setup" statt "init": läuft erst NACHDEM System (z.B. dnd5e) und alle
// anderen Module ihre init-Hooks durchlaufen haben, damit unsere Einträge
// nicht überschrieben werden.
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

  console.log(`${MODULE_ID} | ${conditions.length} eigene Zustände geladen`);
});

/* -------------------------------------------- */
/*  Namen als Label im Token-HUD anzeigen        */
/* -------------------------------------------- */

Hooks.on("renderTokenHUD", (_app, html) => {
  // html ist je nach Version jQuery ODER ein natives HTMLElement
  const root = html?.jquery ? html[0] : html;
  if (!root) return;

  const icons = root.querySelectorAll(".status-effects .effect-control");
  icons.forEach((el) => {
    if (el.querySelector(".scse-label")) return;

    const label = el.getAttribute("data-tooltip")
      || el.getAttribute("title")
      || el.getAttribute("aria-label")
      || "";
    if (!label) return;

    const span = document.createElement("span");
    span.className = "scse-label";
    span.textContent = label;
    el.appendChild(span);
  });
});
