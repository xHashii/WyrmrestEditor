import { useState } from 'react';
import type { ColumnMeta } from '../../shared/types';

interface Props {
  column: ColumnMeta;
  value: number;
  onChange(value: number): void;
  onCancel(): void;
}

/** Bitmask editor: one checkbox per documented flag plus a raw value box. */
export function FlagsEditor({ column, value, onChange, onCancel }: Props) {
  const [draft, setDraft] = useState<number>(value);
  const entries = column.valueSet?.values ?? [];
  const known = entries.reduce((mask, e) => mask | Number(e.value), 0);
  const unknownBits = draft & ~known;

  const toggle = (bit: number) => setDraft((d) => (d & bit ? d & ~bit : d | bit));

  return (
    <div className="popover-backdrop" onMouseDown={onCancel}>
      <div className="popover flags-popover" onMouseDown={(e) => e.stopPropagation()}>
        <header className="popover-head">
          <div>
            <strong>{column.label}</strong>
            <code>{column.name}</code>
          </div>
          <div className="popover-value">
            <label>value</label>
            <input
              type="number"
              value={draft}
              onChange={(e) => setDraft(Number(e.target.value) || 0)}
            />
            <span className="hex">0x{(draft >>> 0).toString(16).toUpperCase()}</span>
          </div>
        </header>

        <div className="flags-list">
          {entries.map((entry) => {
            const bit = Number(entry.value);
            const checked = bit !== 0 && (draft & bit) === bit;
            return (
              <label key={String(entry.value)} className={`flag-row ${checked ? 'on' : ''}`}>
                <input type="checkbox" checked={checked} onChange={() => toggle(bit)} />
                <span className="flag-bit">{bit}</span>
                <span className="flag-name">{entry.name}</span>
                {entry.comment && <span className="flag-comment">{entry.comment}</span>}
              </label>
            );
          })}
          {!entries.length && <div className="muted">No documented flags — edit the raw value above.</div>}
        </div>

        <footer className="popover-foot">
          {unknownBits !== 0 && <span className="muted">undocumented bits: 0x{(unknownBits >>> 0).toString(16)}</span>}
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-accent" onClick={() => onChange(draft)}>
            Stage value
          </button>
        </footer>
      </div>
    </div>
  );
}
