import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Regression: the dev proxy used a plain '/api' key. Vite matches a proxy
 * context with `url.startsWith(context)`, which also matches `/api.ts` — the
 * renderer's API-client module. That request was forwarded to the API server,
 * 404'd, and the whole app failed to boot in `npm run dev` / Electron dev.
 * The key must be a regex matching only `/api/<route>`.
 */
test('vite proxy targets /api/<route> but never the /api.ts client module', () => {
  const root = process.cwd();
  const viteConfig = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');

  // Extract the proxy key from the config (comments may sit between
  // `proxy: {` and the key).
  const block = viteConfig.slice(viteConfig.indexOf('proxy:'));
  const match = block.match(/['"]((?:\^)?\/api[^'"]*)['"]\s*:/);
  assert.ok(match, 'proxy key found in vite.config.ts');
  const context = match[1];

  // Mirror Vite's own doesProxyContextMatchUrl() predicate.
  const matches = (url) =>
    (context[0] === '^' && new RegExp(context).test(url)) || url.startsWith(context);

  assert.equal(matches('/api/status'), true, 'an API route is still proxied');
  assert.equal(matches('/api/connect'), true, 'an API POST route is still proxied');
  assert.equal(matches('/api.ts'), false, '/api.ts client module must NOT be proxied');
  assert.equal(matches('/api.ts?t=123'), false, '/api.ts with HMR query must NOT be proxied');
});
