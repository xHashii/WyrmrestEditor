import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import type { CellValue, ColumnMeta, LookupItem } from '../../shared/types';
import { parseCellValue } from '../../shared/values';
import { Modal } from './Modal';

interface Props {
  column: ColumnMeta;
  value: CellValue;
  onPick(value: CellValue): void;
  onCancel(): void;
}

/**
 * ID picker. Searches the referenced table by id or name — this is what turns
 * "faction = 168" into "168 — Defias Brotherhood" and back.
 */
export function ReferencePicker({ column, value, onPick, onCancel }: Props) {
  const busy = useStore((s) => s.pendingMutations > 0);
  const stageError = useStore((s) => s.editError);
  const entities = useStore((s) => s.entities);
  const openTable = useStore((s) => s.openTable);
  const reference = column.reference!;
  const entity = reference.entity ? entities[reference.entity] : null;

  const [term, setTerm] = useState('');
  const [items, setItems] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState(String(value ?? ''));
  const [rawError, setRawError] = useState<string | null>(null);
  const pick = (value: CellValue) => {
    try { onPick(parseCellValue(column, value)); }
    catch (err) { setRawError((err as Error).message); }
  };

  const target = useMemo(
    () => `${reference.database}.${reference.table}.${reference.column}`,
    [reference],
  );

  useEffect(() => {
    if (!entity) return;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      api
        .lookup({ entity: entity.key, search: term || undefined, limit: 60 })
        .then((res) => {
          if (!cancelled) {
            setItems(res);
            setError(null);
          }
        })
        .catch((err) => !cancelled && setError((err as Error).message))
        .finally(() => !cancelled && setLoading(false));
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [entity, term]);

  return (
    <Modal label={`${column.label} reference picker`} className="popover picker-popover" backdropClassName="popover-backdrop" onClose={onCancel} busy={busy}>
        <header className="popover-head">
          <div>
            <strong>{entity?.label ?? column.label}</strong>
            <code>{target}</code>
          </div>
          <button
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => {
              onCancel();
              void openTable(reference.database, reference.table);
            }}
          >
            Open table →
          </button>
        </header>

        <div className="picker-search">
          <input
            autoFocus
            aria-label="Search references"
            disabled={!entity || busy}
            placeholder={entity ? `Search ${entity.table} by id or name…` : 'Search…'}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <div className="picker-raw">
            <label htmlFor="reference-raw">Raw ID</label>
            <input
              disabled={busy}
              id="reference-raw"
              aria-invalid={Boolean(rawError)}
              value={raw}
              onChange={(e) => { setRaw(e.target.value); setRawError(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') pick(raw);
              }}
            />
            <button className="btn btn-accent" disabled={busy} onClick={() => pick(raw)}>
              {busy ? 'Staging…' : 'Set'}
            </button>
          </div>
        </div>

        {(rawError || stageError) && <div className="error-box" role="alert">{rawError ?? stageError}</div>}
        <div className="picker-list" aria-busy={loading}>
          {!entity && <div className="muted">This column links to {target}; no searchable entity is registered.</div>}
          {error && <div className="error-box" role="alert">{error}</div>}
          {loading && <div className="muted">searching…</div>}
          {!loading &&
            items.map((item, index) => (
              <button
                disabled={busy}
                key={`${item.id}:${item.detail ?? ''}:${index}`}
                className={`picker-item ${String(item.id) === String(value) ? 'current' : ''}`}
                onClick={() => pick(item.id)}
              >
                <span className="picker-id">{item.id}</span>
                <span className="picker-name">{item.name}</span>
                {item.detail && <span className="picker-detail">{item.detail}</span>}
              </button>
            ))}
          {!loading && !error && entity && !items.length && <div className="muted">no matches</div>}
        </div>

        <footer className="popover-foot">
          <span className="muted">
            {column.nullable ? 'Empty is allowed on this column.' : 'This column cannot be NULL.'}
          </span>
          <div className="spacer" />
          {column.nullable && (
            <button className="btn btn-ghost" disabled={busy} onClick={() => onPick(null)}>
              Set NULL
            </button>
          )}
          <button className="btn btn-ghost" disabled={busy} onClick={() => pick(column.kind === 'integer' ? 0 : '')}>
            {column.kind === 'integer' ? 'Clear (0)' : 'Set empty string'}
          </button>
          <button className="btn btn-ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </footer>
    </Modal>
  );
}
