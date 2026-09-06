import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Path resolution that works in three contexts: tsx (source), compiled Node
 * (dist/node/...) and a packaged Electron app (resources/app.asar + extraResources).
 */

const here = path.dirname(fileURLToPath(import.meta.url));

function findUp(startDir: string, marker: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, marker))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Repository / installation root. */
export const APP_ROOT =
  process.env.WYRMREST_ROOT ??
  findUp(here, 'resources/metadata/index.json') ??
  findUp(here, 'package.json') ??
  process.cwd();

export const METADATA_DIR =
  process.env.WYRMREST_METADATA_DIR ??
  [
    path.join(APP_ROOT, 'resources', 'metadata'),
    // packaged: resources are copied next to the asar archive
    path.join(process.resourcesPath ?? '', 'metadata'),
  ].find((p) => p && fs.existsSync(path.join(p, 'index.json'))) ??
  path.join(APP_ROOT, 'resources', 'metadata');

/** Where the ledger and settings live. Overridable for tests / portable use. */
export function appHome(): string {
  const home = process.env.WYRMREST_HOME ?? path.join(APP_ROOT, '.wyrmrest');
  fs.mkdirSync(home, { recursive: true });
  return home;
}

/** Where `sql/updates/<db>/<version>/…` files are written. */
export function defaultExportRoot(): string {
  return process.env.WYRMREST_EXPORT_ROOT ?? APP_ROOT;
}
