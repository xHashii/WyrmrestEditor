# Wyrmrest Editor

A desktop database editor for **TrinityCore 3.4.3 (Wrath of the Lich King Classic)** cores, in the
spirit of WoWDatabaseEditor: browse any table in `auth`, `characters`, `world` and `hotfixes`, edit
cells with editors that understand what each column *means*, and ship the result as a reviewable
`sql/updates` patch instead of an ad-hoc `UPDATE` typed into a console.

```
npm install            # ELECTRON_SKIP_BINARY_DOWNLOAD=1 if the Electron binary is blocked
npm run dev            # API on :8787 + Vite UI on :5173  (browser, no Electron needed)
npm run dev:electron   # the same UI inside the Electron shell
```

Without a database connection the app starts in **demo mode** with a small, hand-seeded slice of
Azeroth (Hogger, Innkeeper Farley, a few quests, gossip menus and SmartAI scripts), so every feature
below can be exercised offline.

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
  `creature_template.rank`, `unit_class`, `quest_template.QuestType`, and hundreds more.
* **Bitmasks** — `npcflag`, `unit_flags`, `flags_extra`, `mechanic_immune_mask` … open a checklist of
  documented bits with per-bit comments, showing the resulting value as you toggle.
* **ID pickers** — 12 entity types (creature, gameobject, quest, spell, item, faction, map, sound,
  emote, broadcast text, gossip menu, loot) are searchable by name, and referencing cells show the
  resolved name next to the raw ID.
* **Docs panel** — the wiki text for the current table and column, inline, with the enum/flag tables.

> **3.4.3 layout note.** Wrath Classic moved a lot of static data into DB2 hotfix tables: there is no
> `item_template`, `broadcast_text` or `npc_trainer` in `world`. Item, spell, faction, map, area,
> emote, sound and broadcast-text lookups therefore resolve against the **`hotfixes`** database
> (`item_sparse`, `spell_name`, `faction`, `map`, `area_table`, `emotes`, `sound_kit`,
> `broadcast_text`), which are keyed `ID + VerifiedBuild`; the pickers match on `ID`.

## The staged-changes ledger

Edits never touch the server behind your back. Every edit, inserted row and deleted row lands in a
ledger that is:

* **merged per row** — ten edits to Hogger are one change, and putting a column back to its original
  value removes it again (staging an insert and then deleting the row cancels both);
* **persisted** to `~/.wyrmrest/ledger.json`, so closing the app does not lose work;
* **reviewable** — the ledger panel lists every change with its table, key and before → after values,
  and can revert any subset;
* **previewable** — see the exact SQL before anything is written or executed.

### Export

`Export…` writes the classic TrinityCore patch layout:

```
sql/updates/<db>/3.4.3/YYYY_MM_DD_NN_<db>.sql
```

`NN` is a per-database sequence for the day, so a second export the same day becomes `…_01_world.sql`.
Each file carries a header (editor, author, date), groups statements per table with a
`-- creature_template (Creature Template)` comment, and emits a `DELETE` before every `INSERT` so the
patch can be replayed safely. `Apply to server` runs the same statements directly over the live
connection when you are connected (disabled in demo mode).

## Layout

```
tools/            metadata pipeline (schema parser, wiki fetch/ingest, view-enum ingest, builder)
resources/metadata/  generated, committed: schema/, docs/, derived/, tables/<db>.json, index.json
src/shared/       the API contract shared by every process
src/core/         the real application: metadata, datasource, query builder, ledger, export, settings
src/server/       express API (`/api/...`) — also serves the built UI
src/main|preload/ Electron shell (same core, exposed over IPC `wyrmrest:<method>`)
src/renderer/     React UI (virtualised grid, docs panel, ledger, pickers, command palette)
tests/            node:test suite, incl. an end-to-end run of the real bundle in jsdom
```

Both transports return the same `{ ok, data | error }` envelope, and the renderer picks whichever is
available (`window.wyrmrest` in Electron, `fetch('/api/...')` in the browser).

## Working on it

```bash
npm run metadata:fetch-docs   # clone the wiki at the commit pinned in tools/docs.lock.json
npm run metadata              # schema → views → docs → resources/metadata (deterministic)
npm run typecheck
npm run build                 # dist/node + dist/renderer
npm test                      # 22 tests
npm run package               # electron-builder installers into release/
```

`npm run metadata` is deterministic — no timestamps in the output — and CI fails if the committed
metadata differs from a fresh rebuild. To move to a newer wiki snapshot run
`node tools/fetch-docs.mjs --update`, rebuild the metadata and commit both.

Curated knowledge that the wiki cannot give us (extra reference targets, corrected value sets) lives
in `tools/overlay/index.mjs`; the builder fails loudly if an overlay entry points at a table or
column that does not exist in the dumps.

## Keyboard

| | |
| --- | --- |
| `Ctrl/Cmd + K` | command palette (jump to any of the 766 tables) |
| `Ctrl/Cmd + S` / `Ctrl/Cmd + E` | open the export dialog |
| arrows, `Tab`, `PageUp/Down`, `Home/End` | move around the grid |
| `Enter` / `F2` / double-click | edit the selected cell (`Esc` cancels, `Enter` stages) |
| `Esc` | close the current dialog |

## Licence

GPL-2.0-only, matching TrinityCore. The SQL dumps and the wiki content belong to the TrinityCore
project.
