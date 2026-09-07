# Wyrmrest Editor — maintenance handoff

## Current state (2026-09-07)

The reliability and UX pass is implemented on `arena/01a07b1c-wyrmresteditor`. The editor remains a
TrinityCore **3.4.3** database editor, with the same generated catalogue of **766 tables / 6,997
columns**, browser/Electron transports, offline samples, staged ledger and SQL exports.

### Verification executed

| Check | Result |
| --- | --- |
| `npm run check` | TypeScript checks, both production builds and **68/68** Node/service/store/transport/jsdom tests passed; no skips |
| Playwright against the built app | **22/22** tests passed, with no uncaught renderer/React errors in the tested flows |
| Responsive browser checks | 1440×900, 1024×768, 768×1024 and 390×844 |
| axe WCAG A/AA checks | No violations in the tested workspace/inspector and connection-dialog states |
| `npm audit --audit-level=moderate` | **0 vulnerabilities** |
| Pinned wiki fetch + full metadata regeneration | Passed; `git diff --exit-code -- resources/metadata` was clean |
| `git diff --check` | Clean |

Browser coverage includes edit/blur/Escape/revert, NULL versus empty filters, invalid drafts,
64-bit flags, references, table/database navigation, stale previews, selected-only export and real
SQL downloads, discard confirmation, saved profiles/failed probes, nested focus restoration,
clipboard denial, malformed HTTP requests, boot recovery, and failed staging followed by retry.

### Not verified in this sandbox

- **A real TrinityCore MySQL server.** Transaction/rollback, mutation serialization, connection
  preservation and disk-failure paths were tested with controlled sources/connections. A real
  failed connection probe was exercised, but not a successful live database session.
- **Desktop execution or finished installers.** `npm run package:dir` was attempted twice. Node and
  renderer builds succeeded; Electron/builder downloads failed on TLS/certificate/network access.
  Retrying with the system CA bundle resolved one certificate issue but a subsequent TLS connection
  still failed. TLS verification was not disabled. Run the installer matrix on GitHub/native hosts.
- Browser tests are Chromium-based, not a guarantee of behavior in every browser or every assistive
  technology. Automated accessibility checks do not replace manual screen-reader testing.

## Main changes

### Data safety and correctness

- Shared strict cell parsing/comparison preserves BIGINT/DECIMAL values and distinguishes NULL,
  empty strings and zero. Invalid numeric drafts no longer silently become zero or truncated values.
- Demo rows are immutable; the renderer overlays the ledger. Refresh, revert and discard preserve
  original source data, and retyping the original value removes the delta.
- Stable `changeId` identities support editing/deleting new rows, changing insert keys, multiple
  auto-generated inserts and composite keys. Proposed numeric keys query the full source, and
  explicit insert collisions are rejected before staging.
- Keyless rows use complete snapshots with single-row SQL limits. Indistinguishable duplicates are
  not editable/deletable through the grid/service.
- Ledger/settings writes use exclusive temporary files and atomic rename with private permissions.
  Failed writes do not replace in-memory ledger state. Invalid settings are rejected and corrupt
  settings have a recovery-copy path.
- Mutating service operations are serialized. A failed Connect preserves the current session;
  unsuccessful pool probes are closed. Password persistence is opt-in. Startup reconnect failures
  are visible while the demo remains usable.
- Each InnoDB live row change uses a transaction. MyISAM/non-transactional tables must be exported
  for manual review. Successful SQL followed by a ledger write failure is reported explicitly as
  already applied, with a warning not to reapply blindly.
- Export validates version folders, sanitizes multiline comments, handles sequences beyond 99,
  never overwrites existing files and rolls back newly created files on partial write failure.
  Insert DELETEs use the final snapshot key; auto/keyless inserts are marked not replay-safe.
- Pagination/filter operators are validated, LIKE patterns cannot become arbitrary regexes, and
  numeric searches retain large integer text. Binary result values are JSON-safe hex strings.

### UI and UX

- Identity/name columns lead the grid; the first column stays pinned. Column jump controls and
  keyboard navigation maintain horizontal visibility, including after a viewport resize.
- The inspector exposes full values, originals, all row fields and a multiline editor. Explicit
  NULL controls and visible empty-string labels remove ambiguity.
- Shared viewport-level dialogs prevent grid clipping, trap keyboard focus, restore it through
  nested dialogs, and isolate global row shortcuts. Failed staging retains the draft and displays
  the real error inside the editor.
- Toolbars/panels wrap responsively; narrow screens use drawers. Loading, empty results, errors,
  source-versus-staged counts, connection targets and saved status are visible.
- The table finder scrolls its active keyboard result into view. Database/table/query requests and
  reference-name resolutions cannot replace newer contexts with stale responses.
- Export supports selected changes, stable previews, explicit completion paths, copy/download and
  optional clearing of only exported changes. Destructive operations use in-app confirmation.
- Errors do not silently disappear or report success. Boot retry, render-error recovery, preview
  retry, clipboard failure feedback and connection results are explicit.

### Infrastructure

- Node **22.12+**, updated Electron/electron-builder, patched transitive dependencies and a `qs`
  override; Express is a production dependency for built browser serving.
- Production CSP is stricter than the HMR development policy. Electron sandboxing is enabled,
  external schemes/navigation are restricted, and IPC checks its sender.
- HTTP errors use consistent JSON envelopes, mutation endpoints require JSON, API responses are
  not cached, and Vite does not enable cross-origin API reads. Preserve the **`^/api/`** proxy regex:
  a plain `/api` prefix also intercepts the renderer's `/api.ts` module and breaks development boot.
- CI now includes real-browser workflows and axe checks after the build/Node tests, with failure
  traces uploaded. Test commands build first so bundle-based tests cannot be silently skipped.

## Operational notes

- The HTTP service is **not authenticated**. Its preview-friendly default bind is `0.0.0.0`; use
  `HOST=127.0.0.1` for local-only serving or an authenticated HTTPS proxy/firewall for remote use.
- One ledger belongs to the workspace, not a connection profile. Review staged changes when
  switching servers. A batch apply is per-row transactional, not globally atomic across tables/DBs.
- Search/filter/paging use source values. Staged inserts remain visible; staging does not mutate
  the source to make a query match an uncommitted value.
- Defaults: ledger/settings in `~/.wyrmrest`, with existing repository-local work discovered.
  `WYRMREST_HOME` overrides this. Packaged exports default to `~/Wyrmrest Exports`; development
  exports default to the repository, overridable with `WYRMREST_EXPORT_ROOT`.
- Build outputs, documentation caches, downloads, browser traces and test workspaces are ignored.
  No generated schema/wiki metadata changes were necessary.

## Commands

```bash
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci   # when testing only the browser/core
npm run dev                            # browser preview on :5173, API on :8787
npm run check                          # typecheck + build + 68 tests
npx playwright install --with-deps chromium
npm run test:browser                   # build + 22 real-browser tests
npm run metadata:fetch-docs && npm run metadata
npm audit --audit-level=moderate
npm run package:dir                    # requires working Electron downloads/native dependencies
```

A custom browser can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. This sandbox used an
npm-distributed Chromium fallback (`/tmp/chromium`, with `LD_LIBRARY_PATH=/tmp/al2023/lib`) because
the standard Playwright CDN download was unavailable. That fallback is not a project dependency;
normal CI installs Playwright's supported Chromium build.
