# HANDOFF

Notes for the next person (or agent) picking this repository up. Read this first, then `README.md`.

## Where things stand

The repository started as four schema-only HeidiSQL dumps and nothing else — **there was no
`HANDOFF.md` and no prior application code**, so the editor described below was built from scratch in
this branch. Everything in the task brief is implemented: generated metadata for all four databases,
doc-driven editors, the staged-changes ledger, `sql/updates` export, the Electron wrapper and CI
installers.

Status of the moving parts:

| Area | State |
| --- | --- |
| Metadata pipeline (`tools/`) | Done, deterministic, wiki commit pinned in `tools/docs.lock.json` |
| Core (`src/core`) | Done; ledger + export + query builder covered by tests |
| Server / IPC | Done; identical `{ ok, data \| error }` envelope on both transports |
| Renderer | Done; grid, docs, ledger, pickers, flags, palette, keyboard nav |
| Tests | `npm test` → 22 tests, green (incl. an end-to-end run of the real bundle) |
| Electron packaging | Config written, **never executed here** — see caveats |
| CI | `.github/workflows/build.yml`, **never executed here** |

## The two-stage build

Nothing about the schema is typed by hand, and this ordering matters:

```
tools/ingest-schema.mjs      dumps      → resources/metadata/schema/<db>.json
tools/ingest-view-enums.mjs  world vw_* → resources/metadata/derived/view-enums.json
tools/ingest-docs.mjs        wiki       → resources/metadata/docs/<db>.json
tools/build-metadata.mjs     merge      → resources/metadata/tables/<db>.json + index.json
```

Merge precedence, if you need to change how a column is presented:

* **value set** — curated overlay > shipped `vw_*` view CASE map > wiki table > schema `enum`/`set`,
  then an inheritance pass (e.g. `smart_scripts.action_type` propagating to related tables). Each
  column records where its value set came from in `valueSetSource`.
* **reference (ID picker)** — curated overlay > declared schema FK > unambiguous wiki link
  (`reference.source` records which).

Curated corrections live in **`tools/overlay/index.mjs`**. That is the file to edit first; the
builder exits non-zero if an overlay entry names a table or column that does not exist, so typos
cannot silently rot.

Regenerating is `npm run metadata` and the output is byte-stable (content hashes, no timestamps) —
CI rebuilds and fails if the committed `resources/metadata` differs.

## Things that will bite you

* **No network to trinitycore.info from a sandbox.** `curl` to it fails (exit 35) and
  `raw.githubusercontent.com` returns nothing; `github.com` over git works. That is why docs come
  from the `TrinityCore/tc-wiki` clone rather than a scraper. Do not reintroduce a live scraper.
* **The 3.3.5 wiki matches 3.4.3 better than master** for shared tables (`rank`, `gossip_menu_id`,
  `modelid1-4`, `spawnMask`/`phaseMask`), while master covers the newer hotfix tables. `ingest-docs`
  merges 335-first with master as fallback; keep that order.
* **3.4.3 has no `item_template` / `broadcast_text` / `npc_trainer` in `world`.** Those lookups
  resolve against `hotfixes` DB2 tables keyed `ID + VerifiedBuild`. Pickers match on `ID` only and
  will return several build-specific rows for one ID — that is expected.
* **Electron's binary download was blocked in the build sandbox.** Install with
  `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install` there; `electron .` therefore has never run locally
  and the desktop shell is only exercised by CI (`installers` job). If you have a normal machine, run
  `npm run dev:electron` early — that is the least-verified path in the project.
* **Playwright/Chromium downloads are blocked too.** UI testing uses jsdom against the built bundle
  (`tests/ui-e2e.test.mjs`). jsdom has no layout, so the file stubs `offsetHeight`/`clientHeight` on
  `HTMLElement.prototype`; without that the virtualiser renders zero rows.
* `node --test tests/` fails to resolve; the script globs `tests/*.test.mjs` deliberately.
* The e2e tests need a build first (`npm run build`), otherwise they skip themselves.
* **No MySQL client exists in the sandbox**, so the live-database code path (`mysql2` connect,
  `Apply to server`) is unit-tested but never smoke-tested against a real core. Try it against a real
  3.4.3 world DB before trusting `Apply to server` in anger; export-to-file is the safe path.

## Recently fixed, worth knowing

* Switching tables used to paint the new table's columns against the previous table's rows (a flash
  of `NULL`s), and two fast switches could land out of order. `store.ts` now clears `meta`/`result`
  on `openTable` and tags every query with a `queryToken`, discarding superseded responses. The
  regression assert is in `tests/ui-e2e.test.mjs` ("rows belong to the newly opened table").
* Cells subscribe to narrow store slices; a table can paint thousands of cells, so do not reintroduce
  a bare `useStore()` in `Cell.tsx`.

## Suggested next steps

1. Run the CI workflow once and download the installers; sign the macOS build if that matters to you
   (`CSC_IDENTITY_AUTO_DISCOVERY` is currently disabled).
2. Verify against a real 3.4.3 database: connect, browse `creature`, `creature_template`,
   `smart_scripts`, stage a change, `Apply to server`, then re-query.
3. Broaden the overlay. ~91 % of columns have descriptions; the gaps are mostly hotfix DB2 columns.
   Good candidates for curated value sets: `conditions.ConditionTypeOrReference`,
   `spell_proc.ProcFlags`, `gameobject_template.type` field meanings (they change per GO type).
4. Multi-row / multi-cell selection and paste; the ledger already merges per row, so the UI is the
   only missing piece.
5. A `git`-aware export mode (write the patch, `git add`, prefill a commit message).
