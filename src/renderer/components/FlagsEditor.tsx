import { useState } from 'react';
import type { CellValue, ColumnMeta } from '../../shared/types';
import { integerValue, parseCellValue } from '../../shared/values';
import { Modal } from './Modal';
import { useStore } from '../store';

export function FlagsEditor({ column, value, onChange, onCancel }: {
  column: ColumnMeta; value: CellValue; onChange(value: CellValue): void; onCancel(): void;
}) {
  const busy = useStore((s) => s.pendingMutations > 0);
  const stageError = useStore((s) => s.editError);
  const [raw, setRaw] = useState(String(value ?? 0));
  const [filter, setFilter] = useState('');
  const entries = column.valueSet?.values ?? [];
  let draft = 0n;
  let error: string | null = null;
  try {
    if (!raw.trim()) throw new Error('Enter a decimal or hexadecimal flag value.');
    draft = BigInt(raw);
    parseCellValue(column, integerValue(draft));
  } catch (err) { error = (err as Error).message; }
  const known = entries.reduce((mask, entry) => mask | BigInt(entry.value), 0n);
  const unknownBits = draft & ~known;
  const toggle = (bit: bigint) => setRaw((bit === 0n ? 0n : (draft & bit) === bit ? draft & ~bit : draft | bit).toString());
  const visible = entries.filter((entry) => `${entry.name} ${entry.value} ${entry.comment ?? ''}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Modal label={`${column.label} flags`} className="popover flags-popover" backdropClassName="popover-backdrop" onClose={onCancel} busy={busy}>
      <header className="popover-head">
        <div><strong>{column.label}</strong><code>{column.name} · {entries.length} documented flags</code></div>
        <button className="btn btn-ghost" aria-label="Close flag editor" disabled={busy} onClick={onCancel}>✕</button>
      </header>
      <div className="flag-controls">
        <label className="field-label">Raw value
          <input autoFocus disabled={busy} value={raw} aria-invalid={Boolean(error)} onChange={(e) => setRaw(e.target.value)} />
        </label>
        <span className="hex">0x{draft.toString(16).toUpperCase()}</span>
        <input className="search" aria-label="Filter flags" disabled={busy} placeholder="Filter flags by name or value…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      {(error || stageError) && <div className="error-box" role="alert">{error ?? stageError}</div>}
      <div className="flags-list">
        {visible.map((entry) => {
          const bit = BigInt(entry.value);
          const checked = bit === 0n ? draft === 0n : (draft & bit) === bit;
          return (
            <label key={String(entry.value)} className={`flag-row ${checked ? 'on' : ''}`}>
              <input type="checkbox" checked={checked} disabled={busy || Boolean(error)} onChange={() => toggle(bit)} />
              <span className="flag-bit">{String(entry.value)}</span><span className="flag-name">{entry.name}</span>
              {entry.comment && <span className="flag-comment">{entry.comment}</span>}
            </label>
          );
        })}
        {!visible.length && <p className="muted">{entries.length ? 'No flags match this search.' : 'No documented flags. Use the raw value above.'}</p>}
      </div>
      <footer className="popover-foot">
        {unknownBits !== 0n && <span className="muted small">Undocumented bits preserved: 0x{unknownBits.toString(16).toUpperCase()}</span>}
        <div className="spacer" />
        <button className="btn btn-ghost" disabled={busy} onClick={onCancel}>Cancel</button>
        <button className="btn btn-accent" disabled={busy || Boolean(error)} onClick={() => onChange(integerValue(draft))}>{busy ? 'Staging…' : 'Stage value'}</button>
      </footer>
    </Modal>
  );
}
