# Shiny's Custom Status Effects

Adds custom status effects to the Token HUD (the panel that opens when you
select a token and click "Assign Status Effect"). Each effect's name is
shown next to its icon, and everything is managed from an in-app settings
menu — no file editing required.

## Managing conditions

1. In your world: **Game Settings → Configure Settings → Module Settings**
2. Under "Shiny's Custom Status Effects", click **"Manage Conditions"**
3. Edit any field directly in the table (ID, Name, Icon path) — changes
   save automatically when you click away from a field
4. Use the file-picker button next to the Icon field to browse Foundry's
   built-in icons (`icons/svg/...`) or your own images
5. Click **"+ Add Condition"** for a new blank row, or the trash icon to
   remove one
6. Expand **"Built-in Conditions"** to rename, re-icon, or hide any of the
   system's default conditions from the HUD (without deleting them)
7. Reload Foundry (F5) afterwards so the Token HUD reflects your changes

Conditions are stored as a world-scoped setting, so they apply for
everyone in that world.

## Updating this module on GitHub

This module is installed straight from raw files on the `main` branch —
no GitHub Releases needed. To publish an update:

1. Make your code changes
2. Bump `version` in `module.json` (e.g. `1.3.1` → `1.4.0`)
3. Re-zip the folder (`module.json` at the root of the zip) and overwrite
   `shinys-custom-status-effects.zip` in the repo (same filename)
4. Upload/overwrite the changed files (including `module.json`) on `main`

Because `manifest` and `download` in `module.json` both point at fixed
raw-file URLs on the `main` branch, Foundry always fetches whatever is
currently committed there — as soon as the version number is higher than
what's installed, "Manage Modules" will offer an **Update** button, no
manual reinstall required.
