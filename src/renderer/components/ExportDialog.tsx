import { useEffect, useMemo, useState } from 'react';
import { api, isDesktop } from '../api';
import { useStore } from '../store';
import { copyText, downloadText } from '../clipboard';
import { versionError } from '../../shared/values';
import type { ExportResult } from '../../shared/types';
import { Modal } from './Modal';

export function ExportDialog() {
  const { ledger, settings, exportIds, setDialog, notify, saveSettings, refreshLedger } = useStore();
  const changes = useMemo(() => exportIds === undefined ? ledger : ledger.filter((c) => exportIds.includes(c.id)), [ledger, exportIds]);
  const [preview, setPreview] = useState<ExportResult | null>(null);
  const [completed, setCompleted] = useState<ExportResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [writing, setWriting] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [clearAfter, setClearAfter] = useState(false);
  const [author, setAuthor] = useState(settings?.author ?? '');
  const [version, setVersion] = useState(settings?.version ?? '3.4.3');
  const invalidVersion = versionError(version);
  const close = () => setDialog(null);

  useEffect(() => {
    let cancelled = false;
    setPreview(null); setError(null);
    if (completed || !changes.length || invalidVersion) { setPreviewing(false); return; }
    setPreviewing(true);
    const timer = setTimeout(() => {
      api.exportSql({ dryRun: true, changeIds: changes.map((c) => c.id), version, author })
        .then((preview) => { if (!cancelled) setPreview(preview); })
        .catch((err) => { if (!cancelled) setError(err.message); })
        .finally(() => { if (!cancelled) setPreviewing(false); });
    }, 180);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [changes, version, author, settings?.exportRoot, completed, invalidVersion, previewRevision]);

  const write = async () => {
    setWriting(true); setError(null);
    useStore.setState((s) => ({ pendingMutations: s.pendingMutations + 1 }));
    try {
      await saveSettings({ version, author });
      const result = await api.exportSql({ version, author, changeIds: changes.map((c) => c.id), clearAfterExport: clearAfter });
      setCompleted(result);
      notify('success', `Exported ${result.files.length} SQL file${result.files.length === 1 ? '' : 's'}. No database changes were applied.`);
      await refreshLedger();
      if (clearAfter) await useStore.getState().refresh();
    } catch (err) { setError((err as Error).message); }
    finally { setWriting(false); useStore.setState((s) => ({ pendingMutations: s.pendingMutations - 1 })); }
  };
  const files = completed?.files ?? preview?.files ?? [];

  return <Modal label={completed ? 'SQL export complete' : 'Export staged changes'} className="modal wide" onClose={close} busy={writing}>
    <header className="modal-head"><h2>{completed ? 'SQL export complete' : 'Export staged changes'}</h2><button className="btn btn-ghost" disabled={writing} aria-label="Close export dialog" onClick={close}>✕</button></header>
    {completed ? <div className="success-box" role="status"><strong>{completed.files.length} SQL file{completed.files.length === 1 ? '' : 's'} written successfully.</strong>
      <p>No changes have been applied to a database. {clearAfter ? 'Exported changes were removed from the ledger.' : 'Your changes are still staged for review.'}</p>
    </div> : <>
      <p className="muted">Review the exact SQL before writing. {exportIds ? `Only ${changes.length} selected changes will be exported.` : `${changes.length} staged changes across ${new Set(changes.map((c) => c.database)).size} databases.`}</p>
      <div className="modal-grid">
        <label><span>Content version</span><input value={version} disabled={writing} aria-invalid={Boolean(invalidVersion)} onChange={(e) => setVersion(e.target.value)} placeholder="3.4.3" /></label>
        <label><span>Author (comment header)</span><input value={author} disabled={writing} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" /></label>
        <label className="wide-field"><span>Export repository root</span><div className="row"><input value={settings?.exportRoot ?? ''} readOnly />
          {isDesktop() && <button className="btn" disabled={writing} onClick={async () => {
            try { const next = await api.chooseExportRoot(); if (next) useStore.setState({ settings: next }); }
            catch (err) { setError((err as Error).message); }
          }}>Choose…</button>}
        </div></label>
      </div>
    </>}
    {!isDesktop() && <p className="notice">Files are written on the editor service. After exporting, use <strong>Download SQL</strong> to save a copy to your computer.</p>}
    {(error || !completed && invalidVersion) && <div className="error-box" role="alert">{error ?? invalidVersion}{error && !completed && <button className="btn btn-quick" disabled={writing} onClick={() => setPreviewRevision((value) => value + 1)}>Retry preview</button>}</div>}
    <div className="export-files" aria-busy={previewing}>
      {previewing && <p className="muted" role="status">Building SQL preview…</p>}
      {files.map((file) => <div key={file.relativePath} className="export-file">
        <div className="export-file-head"><code>{file.relativePath}</code><span className="muted">{file.changeCount} changes · {file.statementCount} statements</span></div>
        {completed && <p className="export-absolute-path">{file.path}</p>}
        <pre tabIndex={0}>{file.sql}</pre>
        <div className="export-file-actions"><button className="btn btn-quick" onClick={() => void copyText(file.sql, 'SQL')}>Copy SQL</button>
          {completed && <button className="btn btn-quick" onClick={() => downloadText(file.relativePath.split('/').pop()!, file.sql)}>Download SQL</button>}
          {completed && isDesktop() && <button className="btn btn-quick" onClick={() => void api.reveal(file.path).catch((err) => setError(err.message))}>Show in folder</button>}
        </div>
      </div>)}
      {!changes.length && !completed && <div className="export-empty"><strong>Nothing staged for export.</strong><p>Edit a cell or add a row, then return here to review its SQL.</p></div>}
    </div>
    <footer className="modal-foot">
      {!completed && <label className="checkbox"><input type="checkbox" disabled={writing} checked={clearAfter} onChange={(e) => setClearAfter(e.target.checked)} />Remove exported changes from the ledger</label>}
      <div className="spacer" /><button className="btn btn-ghost" disabled={writing} onClick={close}>{completed ? 'Done' : 'Cancel'}</button>
      {!completed && <button className="btn btn-accent" disabled={!changes.length || previewing || writing || !preview || Boolean(invalidVersion || error)} onClick={() => void write()}>
        {writing ? 'Writing SQL files…' : previewing ? 'Preparing preview…' : 'Write SQL files'}
      </button>}
    </footer>
  </Modal>;
}
