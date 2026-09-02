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
6. Reload Foundry (F5) afterwards so the Token HUD reflects your changes

Conditions are stored as a world-scoped setting, so they apply for
everyone in that world.

## Updating this module on GitHub

1. Make your code changes
2. Bump `version` in `module.json` (e.g. `1.1.0` → `1.2.0`)
3. Update the `download` field in `module.json` to match the new tag
4. Re-zip the folder (`module.json` at the root of the zip)
5. Create a new GitHub Release with a matching tag (e.g. `v1.2.0`),
   attaching `module.json` and the zip as release assets
6. Foundry will show "Update Available" in Manage Modules automatically,
   since the manifest URL always points at `releases/latest/download/...`
