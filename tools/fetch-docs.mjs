#!/usr/bin/env node
/**
 * Wyrmrest Editor — documentation fetcher.
 *
 * TrinityCore publishes a markdown backup of https://trinitycore.info as
 * github.com/TrinityCore/tc-wiki. We clone it (shallow) into a gitignored
 * cache so `ingest-docs` can turn it into metadata reproducibly.
 *
 * The wiki commit is pinned in tools/docs.lock.json so that metadata rebuilds
 * are reproducible (CI verifies the committed metadata by rebuilding it).
 * Pass --update to move the pin to the wiki's current tip.
 *
 *   node tools/fetch-docs.mjs [--force] [--update]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(ROOT, '.docs-cache');
const REPO = process.env.WYRMREST_WIKI_REPO ?? 'https://github.com/TrinityCore/tc-wiki.git';
const force = process.argv.includes('--force');
const update = process.argv.includes('--update');
const LOCK = path.join(__dirname, 'docs.lock.json');
const lock = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, 'utf8')) : null;

function git(args, opts = {}) {
  const res = spawnSync('git', args, { stdio: 'inherit', ...opts });
  if (res.status !== 0) {
    console.error(`git ${args.join(' ')} failed — check network access to github.com`);
    process.exit(1);
  }
  return res;
}

if (fs.existsSync(path.join(CACHE, 'database')) && !force && !update) {
  const dbs = fs.readdirSync(path.join(CACHE, 'database'));
  console.log(`documentation cache present (${dbs.join(', ')}) — use --force to refresh`);
  process.exit(0);
}

fs.rmSync(CACHE, { recursive: true, force: true });
fs.mkdirSync(CACHE, { recursive: true });

const tmp = path.join(CACHE, '.clone');
if (lock && !update) {
  // Reproducible path: fetch exactly the pinned commit.
  console.log(`fetching ${REPO} @ ${lock.commit.slice(0, 10)} (pinned) …`);
  fs.mkdirSync(tmp, { recursive: true });
  git(['init', '--quiet'], { cwd: tmp });
  git(['remote', 'add', 'origin', REPO], { cwd: tmp });
  git(['fetch', '--depth', '1', '--filter=blob:none', 'origin', lock.commit], { cwd: tmp });
  git(['checkout', '--quiet', 'FETCH_HEAD'], { cwd: tmp });
} else {
  console.log(`cloning ${REPO} …`);
  git(['clone', '--depth', '1', '--filter=blob:none', REPO, tmp]);
}

const commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: tmp, encoding: 'utf8' }).stdout.trim();
if (update || !lock) {
  fs.writeFileSync(LOCK, `${JSON.stringify({ repo: REPO, commit }, null, 2)}\n`);
  console.log(`pinned tools/docs.lock.json → ${commit}`);
}

fs.renameSync(path.join(tmp, 'database'), path.join(CACHE, 'database'));
fs.rmSync(tmp, { recursive: true, force: true });

const variants = fs.readdirSync(path.join(CACHE, 'database'));
let pages = 0;
for (const v of variants) {
  for (const db of fs.readdirSync(path.join(CACHE, 'database', v))) {
    const dir = path.join(CACHE, 'database', v, db);
    if (fs.statSync(dir).isDirectory()) pages += fs.readdirSync(dir).filter((f) => f.endsWith('.md')).length;
  }
}
console.log(`documentation cache ready: ${variants.join(', ')} (${pages} pages) @ ${commit.slice(0, 10)}`);
