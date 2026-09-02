# Shiny's Custom Status Effects

Fügt eigene Zustände zum Token-HUD hinzu (das Panel, das aufklappt, wenn du
einen Token auswählst und auf "Assign Status Effect" klickst). Namen werden
zusätzlich als kleines Label unter jedem Icon angezeigt.

## Eigene Zustände verwalten

1. In der Welt: **Game Settings → Configure Settings → Module Settings**
2. Bei "Shiny's Custom Status Effects" auf **"Zustände verwalten"** klicken
3. Neue Condition mit ID, Name und Icon hinzufügen (Datei-Browser-Button
   für eigene Bilder oder Foundrys eingebaute `icons/svg/...`-Icons),
   bestehende über den Papierkorb entfernen
4. Einmal F5 drücken, damit die Änderung im Token-HUD sichtbar wird

Die Liste wird als Welt-Einstellung gespeichert, gilt also für alle Spieler.

## Für Entwickler: Version aktualisieren

Siehe Installationsanleitung für den vollständigen GitHub-Release-Workflow.
Kurzfassung:

1. Code ändern
2. `version` in `module.json` erhöhen (z.B. `1.0.0` → `1.1.0`)
3. Ordner neu zippen, `module.json` liegt im Zip an der Wurzel
4. Neuen GitHub Release mit Tag `v1.1.0` erstellen, `module.json` und die
   ZIP als Release-Assets anhängen
5. Foundry erkennt das Update automatisch (Manage Modules zeigt "Update
   Available")
