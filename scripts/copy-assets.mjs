#!/usr/bin/env node
/** Copies non-TypeScript node assets (the preload bridge) into dist/node. */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const targets = [['src/preload/preload.cjs', 'dist/node/preload/preload.cjs']];

for (const [from, to] of targets) {
  const src = path.join(ROOT, from);
  const dest = path.join(ROOT, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`copied ${from} -> ${to}`);
}
