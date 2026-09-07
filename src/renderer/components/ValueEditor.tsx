import { useState } from 'react';
import type { CellValue, ColumnMeta } from '../../shared/types';
import { Modal } from './Modal';
import { useStore } from '../store';

export function ValueEditor({ column, value, onChange, onCancel }: {
  column: ColumnMeta; value: CellValue; onChange(value: CellValue): Promise<boolean>; onCancel(): void;
}) {
  const [draft, setDraft] = useState(String(value ?? ''));
  const [isNull, setNull] = useState(value === null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    try {
      if (!await onChange(isNull ? null : draft)) setError(useStore.getState().editError ?? 'The value could not be staged. Try again.');
    } finally { setBusy(false); }
  };
  return (
    <Modal label={`Edit ${column.name}`} onClose={onCancel} busy={busy}>
      <header className="modal-head"><h2>Edit {column.name}</h2><button className="btn btn-ghost" aria-label="Close value editor" disabled={busy} onClick={onCancel}>✕</button></header>
      <p className="muted">{column.rawType} · {column.nullable ? 'NULL and an empty string are different values.' : 'A value is required.'}</p>
      <textarea className="value-input mono" aria-label={column.name} autoFocus rows={10} disabled={isNull || busy} value={draft}
        onChange={(e) => { setDraft(e.target.value); setError(null); }} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); void save(); } }} />
      {column.nullable && <label className="checkbox"><input type="checkbox" checked={isNull} onChange={(e) => setNull(e.target.checked)} disabled={busy} />Set NULL (no value)</label>}
      {error && <div className="error-box" role="alert">{error}</div>}
      <footer className="modal-foot"><span className="muted small">{draft.length.toLocaleString()} characters · Ctrl/Cmd+Enter to stage</span><div className="spacer" />
        <button className="btn btn-ghost" disabled={busy} onClick={onCancel}>Cancel</button>
        <button className="btn btn-accent" disabled={busy} onClick={() => void save()}>{busy ? 'Staging…' : 'Stage value'}</button>
      </footer>
    </Modal>
  );
}
