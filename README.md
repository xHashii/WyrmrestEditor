# Wyrmrest Editor

A desktop database editor for **TrinityCore 3.4.3 (Wrath of the Lich King Classic)** cores, in the
spirit of WoWDatabaseEditor: browse any table in `auth`, `characters`, `world` and `hotfixes`, edit
cells with editors that understand what each column *means*, and ship the result as a reviewable
`sql/updates` patch instead of an ad-hoc `UPDATE` typed into a console.

Requires **Node.js 22.12 or newer**.

```bash
npm install            # ELECTRON_SKIP_BINARY_DOWNLOAD=1 if the Electron binary is blocked
npm run dev            # API on :8787 + Vite UI on :5173  (browser, no Electron needed)
npm run dev:electron   # the same UI inside the Electron shell
```

Without a database connection the app starts in **demo mode** with a small, hand-seeded slice of
Azeroth (Hogger, Innkeeper Farley, a few quests, gossip menus and SmartAI scripts). Browsing, staging,
reverting and SQL export work offline. Applying changes requires a live server.

---

## What makes it TrinityCore-aware

Nothing about the schema is hand-written. Everything the editor knows is generated from two sources
and committed under `resources/metadata/`:

| Source | What it gives us |
| --- | --- |
| The four schema dumps in this repo (`auth_database.sql`, `characters_database.sql`, `world.sql`, `hotfixes_database.sql`) | Exact tables, columns, ordinals, SQL types, nullability, defaults, primary/unique keys, auto-increment, declared foreign keys, `vw_*` views |
| [TrinityCore/tc-wiki](https://github.com/TrinityCore/tc-wiki) — the markdown backup of trinitycore.info (`/en/database/master/<db>/home` and the 3.3.5 branch) | Table and column descriptions, enum tables, flag/bitmask tables, cross-table links |

That produces **766 tables / 6 997 columns** — auth 32, characters 107, world 251, hotfixes 376 —
with ~91 % of columns carrying a human description, 508 value sets and 510 reference (ID picker)
columns.

The generated metadata is what turns a raw integer into something you can actually edit:

* **Enums** — `smart_scripts.action_type` renders as `SMART_ACTION_TALK` from a 100+ entry list;
  `creature_template.Classification`, `unit_class`, `quest_template.QuestType`, and hundreds more.
* **Bitmasks** — `npcflag`, `unit_flags`, `flags_extra`, `mechanic_immune_mask` … open a checklist of
  documented bits with per-bit comments, showing the resulting value as you toggle.
* **ID pickers** — 56 entity types are searchable by name, including creature, gameobject, quest,
  spell, item, faction, map, sound, emote, broadcast text, gossip menu and loot. Referencing cells
  show the resolved name next to the raw ID.
* **Inspector** — the full selected value, its original value when edited, all fields in a row, and
  the wiki text and enum/flag tables for the selected column. Large values can be expanded and edited
  in a multiline dialog. NULL is explicitly different from an empty string.
* **Column navigation** — identity and name columns lead the grid; the first column stays pinned.
  Jump to any column from the visible selector or navigate with the keyboard in both axes.
* **Responsive panels** — toolbars wrap, secondary panels can be toggled, and narrow windows use
  focused drawers. Flag, reference and text dialogs are portaled above the grid, never clipped by it.

> **3.4.3 layout note.** Wrath Classic moved a lot of static data into DB2 hotfix tables: there is no
> `item_template`, `broadcast_text` or `npc_trainer` in `world`. Item, spell, faction, map, area,
> emote, sound and broadcast-text lookups therefore resolve against the **`hotfixes`** database
> (`item_sparse`, `spell_name`, `faction`, `map`, `area_table`, `emotes`, `sound_kit`,
> `broadcast_text`), which are keyed `ID + VerifiedBuild`; the pickers match on `ID`.

## Searching — by names, not just IDs

The search box above the grid does not only match the text you can see: it understands the
relationships in the metadata. Pick a **scope** next to the field and type words or `key:value`
terms.

| Scope | What it searches |
| --- | --- |
| **Everything** | every text column *and* every numeric key/reference column |
| **Names & text** | only the text columns — a row matches when *any* of them contains the word |
| **Ids** | numeric terms only, so `12 13` finds entries 12 and 13 without pulling in names |
| **References** | resolves names to IDs first: `creature:Farley` finds every row that *points at* that creature |

Terms are combined with AND, and these operators work inside a term:

| Term | Meaning |
| --- | --- |
| `Farley` | free text across the scope |
| `"Innkeeper Farley"` | the exact phrase, one term |
| `name~Farl` / `name^Inn` | column contains / starts with |
| `level>20`, `entry!=448` | numeric or text comparison |
| `-spell:Fireball` | rows that do **not** reference that spell |
| `mob:Hogger`, `go:Lamp`, `npc:Farley` | entity aliases (mob → creature, go → gameobject, npc → creature, …) |

Name-ish columns lead the search (the referenced table's own `name`/`Title` before `Subname`), so
`Names & text` behaves like a name lookup rather than a scan over 60 columns. The field shows a trace of
what was understood — which tokens hit, which columns were searched, and a note when a table has no
such reference or a `key:` was ignored. Everything runs as a parameterised query; the demo mode
mirrors the same semantics over its in-memory rows.

## SmartAI scripts

`smart_scripts` rows are a programming language written in 25 integer columns. On any table that
owns a script — `creature_template`, `creature`, `gameobject_template`, `gameobject`,
`quest_template` — the table view gains a **SmartAI** switch that replaces the grid with a row-based
editor in the style of WoWDatabaseEditor (its SmartData definitions and colour scheme are vendored
under `tools/vendor/wde-smartdata`, MIT):

* **One row per logical event**: `Event · Action · Target` with the comment written out in full —
  `Hogger - On Aggro - Cast Spell (133) with flags`. Parameters render as coloured, labelled chips;
  the ones you did not touch fade back, so the interesting values stand out.
* **Every parameter uses the right editor**: enums (`SMART_ACTION_CAST`), 64-bit flag sets, chance
  percentages, coordinates, and reference pickers that search spells, creatures, quests, sounds and
  texts **by name**.
* **Chains and groups are visible**: `id`/`link` become indented child rows with a `↳ #2` marker;
  link or unlink a row, move it up or down, and the editor keeps the chain intact (deleting a chained
  row reconnects the row that pointed at it, and a deleted row can be brought back from the notice).
* **Descriptions come from the wiki**, not from memory: event/action/target help text, the parameters
  they expect, and per-definition notes (`12 newer than this core`) are generated by
  `npm run metadata:smartai` from the TrinityCore wiki plus the vendored definition tables, and
  committed as `resources/metadata/derived/smartai.json`.
* **Comment rows and `+ Event` / `+ Action` buttons** — new rows start from a picker of supported
  definitions (searchable, grouped by category) instead of a blank integer field.
* **Problems panel + Fix comments**: validation warns about unsupported types, missing parameters,
  a zero-chance action, or a comment that drifted from the TrinityCore convention
  `<subject> - <Event> - <Action> <params>`; `Fix comments` rewrites them.
* **In-script search and "Hide comments"** for long scripts, plus a preview of the row values that
  will be staged.

Editing a script goes through the same staged-changes ledger as any other cell: nothing is written to
the database until you export or apply the change, and the SQL preview is available before you commit
to it.

## The staged-changes ledger

Edits never touch the server behind your back. Every edit, inserted row and deleted row lands in a
ledger that is:

* **merged per row** — ten edits to Hogger are one change, and putting a column back to its original
  value removes it again (staging an insert and then deleting the row cancels both);
* **persisted atomically** to `~/.wyrmrest/ledger.json`, so closing the app does not lose saved work
  (an existing repository-local `.wyrmrest/ledger.json` is still discovered);
* **reviewable** — the ledger panel lists every change with its table, key and before → after values,
  and can revert or export any subset;
* **previewable** — see the exact SQL before anything is written or executed.

Demo source rows are immutable: refresh overlays staged values, while revert/discard restores the
original sample. Search, filters and paging query source rows; staged new rows remain visible.
Indistinguishable duplicate rows without a unique key are read-only rather than risking the wrong row.

### Export

`Export…` writes the classic TrinityCore patch layout:

```
sql/updates/<db>/3.4.3/YYYY_MM_DD_NN_<db>.sql
```

`NN` is a per-database sequence for the day, growing beyond two digits if needed; existing files are
never overwritten. Each file has an author/date header and groups statements by table. Inserts with
an explicit unique key have a preceding `DELETE` using the **final edited key**. Auto-generated and
keyless inserts have no such delete and are explicitly marked **not replay-safe**.

Export keeps changes staged by default. An optional checkbox removes only the exported changes.
The completion screen keeps file paths visible and provides **Copy SQL**, **Download SQL** in the
browser, and **Show in folder** on desktop. Export writes files on the editor service; it never
applies changes to a database.

### Apply to server

Applying requires a live connection and a confirmation showing the server and change count. Each
row change runs in its own transaction on an **InnoDB** table, so a failed insert rolls back its
preceding delete. A batch is not globally atomic: successful changes are removed from the ledger,
while failed changes stay staged. Non-transactional tables such as MyISAM must be exported for
manual review. Back up your database and review generated SQL before applying it.

The ledger belongs to the workspace, not to an individual connection profile. Switching servers
keeps staged changes; always review their target before applying.

## Layout

```
tools/            metadata pipeline (schema parser, wiki fetch/ingest, view-enum ingest, SmartAI definitions, icon renderer)
resources/metadata/  generated, committed: schema/, docs/, derived/, tables/<db>.json, index.json
src/shared/       the API contract shared by every process
src/core/         the real application: metadata, datasource, query builder, ledger, export, settings
src/server/       express API (`/api/...`) — also serves the built UI
src/main|preload/ Electron shell (same core, exposed over IPC `wyrmrest:<method>`)
src/renderer/     React UI (virtualised grid, docs panel, ledger, pickers, command palette)
tests/            unit, service, store and shipped-bundle jsdom regression tests
tests/browser/    Playwright workflows, viewport checks and axe accessibility audits
```

Both transports return the same `{ ok, data | error }` envelope, and the renderer picks whichever is
available (`window.wyrmrest` in Electron, `fetch('/api/...')` in the browser).

## Working on it

```bash
npm run metadata:fetch-docs   # clone the wiki at the commit pinned in tools/docs.lock.json
npm run metadata              # schema → views → docs → smartai → resources/metadata (deterministic)
npm run typecheck
npm run build                 # dist/node + dist/renderer
npm test                      # builds first, then runs core/store/transport/jsdom tests
npx playwright install --with-deps chromium
npm run test:browser           # builds first, then runs real Chromium workflows
npm run check                 # typecheck + build + node/jsdom tests
npm run package               # electron-builder installers into release/
npm run icon                    # re-render resources/icons/icon.png + icon.ico from icon.svg
```

Browser tests run against an isolated temporary demo workspace, never your saved connection or
ledger. To use an already installed Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its
executable. Generated builds, screenshots, traces and exports are not committed.

`npm run metadata` is deterministic — no timestamps in the output — and CI fails if the committed
metadata differs from a fresh rebuild. To move to a newer wiki snapshot run
`node tools/fetch-docs.mjs --update`, rebuild the metadata and commit both.

Curated knowledge that the wiki cannot give us (extra reference targets, corrected value sets) lives
in `tools/overlay/index.mjs`; the builder fails loudly if an overlay entry points at a table or
column that does not exist in the dumps.

## Building the Windows executable

`npm run package` runs electron-builder with `electron-builder.yml`, producing the portable
`.exe` and an NSIS installer in `release/` (the same job runs on Windows, macOS and Linux in CI —
see `.github/workflows/build.yml`, which also publishes them to a GitHub release when you push a
`v*` tag):

```bash
npm ci
npm run build
npm exec --yes -- electron-builder --win --x64 --publish never
```

The result is `release/WyrmrestEditor-<version>-win-x64.exe` (installer) and
`…-win-x64-portable.exe`; double-click either, no Node.js or database required — the app starts in
demo mode and connects to MySQL from its own settings dialog. The executable is unsigned, so Windows
SmartScreen will ask once ("More info → Run anyway"); code signing is opt-in via
`CSC_LINK`/`CSC_KEY_PASSWORD`. Nothing is installed system-wide: the ledger, settings and saved
connections live in `~/.wyrmrest` (`WYRMREST_HOME` overrides it), and the app writes only there and
to the export folder you pick (`~/Wyrmrest Exports` in the packaged app).

Linux (`.AppImage`, `.deb`) and macOS (`.dmg`, `.zip`) targets are configured in the same file —
`npx electron-builder --linux` / `--mac`. Building for Windows from Linux needs Wine only for the
installer; `--dir` works without it.

## Connecting

Click the connection chip in the top bar (or **File → Connection settings…**) to open the connection
dialog. It gives you:

* **Quick setups** — one-click presets for a local TrinityCore (`trinity@127.0.0.1:3306`), a
  Docker/root MySQL, and AzerothCore (`acore_*` schema names only — the table definitions still target 3.4.3);
* **Saved servers** — add, edit, explicitly save and delete named profiles without silently switching
  the active connection. Unsaved profile edits are confirmed before dismissal;
* **Session-only passwords by default** — opting into “Remember password” saves it as plain text in
  the private local settings file. Only use this on a trusted device/service. Automatic reconnection
  needs a remembered password or a passwordless server; failures leave a visible warning in demo mode;
* **Test connection** — probes every configured schema without leaving the dialog or disturbing the
  current session, reporting the table count or the complete MySQL error per database. A failed
  Connect attempt also preserves the current session;
* **Demo data / Disconnect** — drop back to the built-in sample at any time.

### Browser service safety

The HTTP service defaults to `0.0.0.0` for development/preview access and has **no built-in user
authentication**. It is intended for a single trusted editor, not public shared hosting. Use
`HOST=127.0.0.1 npm start` for local-only built browser use, or put remote access behind an authenticated
HTTPS proxy/firewall. Browser mutations require JSON and cross-origin access is not enabled.

`WYRMREST_HOME` overrides the ledger/settings folder; `WYRMREST_EXPORT_ROOT` sets the initial export
root. New packaged installs use a writable home folder rather than trying to write inside `app.asar`.

## Quick actions

A toolbar above the grid puts the common spreadsheet-style row operations one click away:

* **⧉ Duplicate row** — copies the selected row and stages the copy as a new row (integer primary
  keys are proposed from the full source and checked for collisions; auto-increment keys are left to the server);
* **🗑 Delete row** — stages the selected row for deletion;
* **↺ Revert row** — discards every staged change on the selected row;
* **⚡ Filter by cell** — instantly narrows the page to rows matching the selected cell
  (`= value`, including `= ''` for an empty string, or `IS NULL` for NULL); active filters show as removable chips.

## Keyboard

| | |
| --- | --- |
| `Ctrl/Cmd + K` | command palette (jump to any of the 766 tables) |
| `Ctrl/Cmd + S` / `Ctrl/Cmd + E` | open the export dialog |
| `Ctrl/Cmd + I` | stage a new empty row |
| `Ctrl/Cmd + D` | duplicate the selected row |
| `Ctrl/Cmd + Delete` | delete the selected row |
| `Ctrl/Cmd + R` | revert staged changes on the selected row |
| arrows, `Tab`, `PageUp/Down`, `Home/End` | move around the grid |
| `Enter` / `F2` / double-click | edit the selected cell (`Esc` cancels, `Enter` stages) |
| `Ctrl/Cmd + Enter` | stage a multiline value |
| `Esc` | cancel the current editor / close the current dialog |
| **SmartAI editor** | |
| `Alt + ↑/↓` | move the focused row up or down the script |
| `Enter` | edit the focused row · `Delete` removes it (a linked row is reconnected) |
| `Ctrl/Cmd + N` | add an event row |
| `/` or `Ctrl/Cmd + F` | search inside the script |

Shortcuts that modify rows are blocked while typing or while a dialog is open. Errors remain
visible until dismissed; failed copies, saves, connections and exports do not report success.

## Licence

GPL-2.0-only, matching TrinityCore. The SQL dumps and the wiki content belong to the TrinityCore
project.
