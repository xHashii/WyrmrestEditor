import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../src/renderer/api.ts';

const response = (status, payload) => ({ ok: status >= 200 && status < 300, status, json: async () => payload });

test('HTTP transport refuses non-success statuses even with a success-looking envelope', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response(500, { ok: true, data: { connected: true } }));
  await assert.rejects(api.getStatus(), /HTTP 500/);
});

test('malformed HTTP responses and network outages are actionable errors', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 502, json: async () => { throw new Error('bad JSON'); } }));
  await assert.rejects(api.getIndex(), /invalid response.*HTTP 502/);
  fetch.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(api.getStatus(), /Cannot reach the editor service/);
});

test('timed-out mutations warn that the operation may still be running', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new DOMException('expired', 'TimeoutError'); });
  await assert.rejects(api.clearLedger(), /operation may still be running/);
});

test('browser mutations use relative JSON requests, including empty payloads', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url, options }); return response(200, { ok: true, data: {} }); });
  await api.clearLedger();
  assert.equal(calls[0].url, '/api/ledger/clear');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['content-type'], 'application/json');
  assert.equal(calls[0].options.body, '{}');
});
