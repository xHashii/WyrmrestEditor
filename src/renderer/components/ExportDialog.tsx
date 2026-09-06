import { useEffect, useState } from 'react';
import { api, isDesktop } from '../api';
import { useStore } from '../store';
import type { ExportResult } from '../../shared/types';

/**
 * Export dialog — previews (and then writes) the
 * `sql/updates/<db>/<version>/YYYY_MM_DD_NN_<db>.sql` files.
 */
export function ExportDialog() {
  const { ledger, settings, setDialog, notify, saveSettings, refreshLedger } = useStore();
  const [preview, setPreview] = useState<ExportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearAfter, setClearAfter] = useState(true);
  const [author, setAuthor] = useState(settings?.author ?? '');
  const [version, setVersion] = useState(settings?.version ?? '3.4.3');

  useEffect(() => {
    if (!ledger.length) return;
    setBusy(true);
    api
      .exportSql({ dryRun: true, version, author })
      .then(setPreview)
      .catch((err) => setError((err as Error).message))
      .finally(() => setBusy(false));
  }, [ledger, version, author]);

  const write = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.exportSql({ version, author, clearAfterExport: clearAfter });
      await saveSettings({ version, author });
      notify(
        'success',
        `Wrote ${result.files.length} file${result.files.length === 1 ? '' : 's'}: ${result.files
          .map((f) => f.relativePath)
          .join(', ')}`,
      );
      await refreshLedger();
      setDialog(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={() => setDialog(null)}>
      <div className="modal wide" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Export staged changes</h2>
          <button className="btn btn-ghost" onClick={() => setDialog(null)}>
            ✕
          </button>
        </header>

        <div className="modal-grid">
          <label>
            <span>Content version</span>
            <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="3.4.3" />
          </label>
          <label>
            <span>Author (comment header)</span>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="your name" />
          </label>
          <label className="wide-field">
            <span>Repository root</span>
            <div className="row">
              <input value={settings?.exportRoot ?? ''} readOnly />
              {isDesktop() && (
                <button
                  className="btn"
                  onClick={async () => {
                    const next = await api.chooseExportRoot();
                    if (next) useStore.setState({ settings: next });
                  }}
                >
                  Choose…
                </button>
              )}
            </div>
          </label>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="export-files">
          {busy && !preview && <p className="muted">building preview…</p>}
          {preview?.files.map((file) => (
            <div key={file.relativePath} className="export-file">
              <div className="export-file-head">
                <code>{file.relativePath}</code>
                <span className="muted">
                  {file.changeCount} change{file.changeCount === 1 ? '' : 's'} · {file.statementCount} statements
                </span>
              </div>
              <pre>{file.sql}</pre>
            </div>
          ))}
          {!ledger.length && <p className="muted">Nothing staged.</p>}
        </div>

        <footer className="modal-foot">
          <label className="checkbox">
            <input type="checkbox" checked={clearAfter} onChange={(e) => setClearAfter(e.target.checked)} />
            Clear the ledger after a successful export
          </label>
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={() => setDialog(null)}>
            Cancel
          </button>
          <button className="btn btn-accent" disabled={!ledger.length || busy} onClick={() => void write()}>
            {busy ? 'Writing…' : 'Write SQL files'}
          </button>
        </footer>
      </div>
    </div>
  );
}
