# Shiny's Custom Status Effects

Adds custom status effects to the Token HUD (the panel that opens when you
select a token and click "Assign Status Effect"). Each effect's name is
shown next to its icon, and everything is managed from an in-app settings
menu — no file editing required.

## Managing your own conditions

1. In your world: **Game Settings → Configure Settings → Module Settings**
2. Under "Shiny's Custom Status Effects", click **"Manage Conditions"**
3. Edit any field directly in the table (ID, Name, Icon path) — changes
   save automatically when you click away from a field
4. Use the file-picker button next to the Icon field to browse Foundry's
   built-in icons (`icons/svg/...`) or your own images
5. Click **"+ Add Condition"** for a new blank row, or the trash icon to
   remove one
6. Use **Export** to download your conditions as a JSON file, and
   **Import** to add conditions from a previously exported file (existing
   IDs are skipped, so importing is safe to repeat) — handy for carrying
   your set over to another world
7. Reload Foundry (F5), or use **Save & Reload**, so the Token HUD
   reflects your changes

Conditions are stored as a world-scoped setting, so they apply for
everyone in that world.

## Managing built-in conditions

Click **"Manage Built-in Conditions"** (next to "Manage Conditions") to
rename, re-icon, or hide any of the system's default conditions from the
Token HUD — without deleting them. Use the checkbox in the "In HUD"
column to hide one, and the reset icon to restore its original name/icon.

## Token HUD extras

- A **search box** at the top of the "Assign Status Effect" panel filters
  the list live as you type
- Icons are sorted alphabetically by name, custom and built-in mixed
  together
- A **Clear All** button at the bottom removes every active condition
  from the selected token in one click

## Hover panel

When you hover over a token, a small panel appears next to it listing
that token's currently active conditions with icon and name — handy since
the Token HUD icons alone don't show text. Toggle this on/off per-player
under **Game Settings → Configure Settings → Module Settings →
"Show active conditions on hover"**.
