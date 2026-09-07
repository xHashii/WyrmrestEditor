import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { service } from '../core/service.js';
import { APP_ROOT } from '../core/paths.js';

/**
 * HTTP transport for the same service the Electron main process exposes over
 * IPC. Used by `npm run dev` (browser preview) and `npm start` (headless /
 * remote use, e.g. a shared editor instance on a build box).
 */

const app = express();
app.disable('x-powered-by');
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  // Browser mutations must be JSON. Cross-site forms/simple requests cannot
  // trigger a connection change, discard, export or apply.
  if (req.method === 'POST' && !req.is('application/json')) {
    res.status(415).json({ ok: false, error: 'Send requests as application/json.' });
    return;
  }
  next();
});
app.use(express.json({ limit: '4mb' }));

const wrap =
  (handler: (req: express.Request) => Promise<unknown>): express.RequestHandler =>
  async (req, res) => {
    try {
      res.json({ ok: true, data: await handler(req) });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  };

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'wyrmrest-editor' }));
app.get('/api/metadata', wrap(async () => service.getIndex()));
app.get('/api/metadata/:database/:table', wrap(async (req) => service.getTable(req.params.database as never, String(req.params.table))));
app.get('/api/status', wrap(async () => service.getStatus()));
app.post('/api/connect', wrap(async (req) => service.connect(req.body)));
app.post('/api/connection/test', wrap(async (req) => service.testConnection(req.body)));
app.post('/api/demo', wrap(async () => service.useDemo()));
app.post('/api/disconnect', wrap(async () => service.disconnect()));
app.post('/api/query', wrap(async (req) => service.query(req.body)));
app.post('/api/lookup', wrap(async (req) => service.lookup(req.body)));
app.post('/api/resolve-names', wrap(async (req) => service.resolveNames(req.body.entity, req.body.ids ?? [])));
app.get('/api/ledger', wrap(async () => service.getLedger()));
app.post('/api/ledger/stage', wrap(async (req) => service.stage(req.body)));
app.post('/api/ledger/revert', wrap(async (req) => service.revert(req.body.changeIds ?? [])));
app.post('/api/ledger/clear', wrap(async () => service.clearLedger()));
app.post('/api/ledger/preview', wrap(async (req) => ({ sql: await service.previewSql(req.body?.changeIds) })));
app.post('/api/ledger/export', wrap(async (req) => service.exportSql(req.body ?? {})));
app.post('/api/ledger/apply', wrap(async (req) => service.applyToDatabase(req.body?.changeIds)));
app.get('/api/settings', wrap(async () => service.getSettings()));
app.post('/api/settings', wrap(async (req) => service.saveSettings(req.body ?? {})));

app.use('/api', (_req, res) => res.status(404).json({ ok: false, error: 'Unknown API route.' }));

// Serve the built renderer when it exists (production / packaged headless use).
const rendererDir = path.join(APP_ROOT, 'dist', 'renderer');
if (fs.existsSync(rendererDir)) {
  app.use(express.static(rendererDir));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(rendererDir, 'index.html')));
}

// JSON parser errors use the same envelope as route/service errors.
const errors: express.ErrorRequestHandler = (err, _req, res, _next) => {
  res.status(err.status ?? 500).json({ ok: false, error: err.type === 'entity.parse.failed' ? 'Invalid JSON request body.' : err.message ?? 'Editor service error.' });
};
app.use(errors);

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0';

service
  .restore()
  .catch(() => undefined)
  .finally(() => {
    const server = app.listen(port, host, () => {
      console.log(`Wyrmrest Editor API listening on http://${host}:${port}`);
    });
    const shutdown = () => { server.close(() => { void service.shutdown().finally(() => process.exit(0)); }); };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  });
