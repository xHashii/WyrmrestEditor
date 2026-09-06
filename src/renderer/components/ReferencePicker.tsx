import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import type { CellValue, ColumnMeta, LookupItem } from '../../shared/types';

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
  const entities = useStore((s) => s.entities);
  const openTable = useStore((s) => s.openTable);
  const reference = column.reference!;
  const entity = reference.entity ? entities[reference.entity] : null;

  const [term, setTerm] = useState('');
  const [items, setItems] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState(String(value ?? ''));

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
    <div className="popover-backdrop" onMouseDown={onCancel}>
      <div className="popover picker-popover" onMouseDown={(e) => e.stopPropagation()}>
        <header className="popover-head">
          <div>
            <strong>{entity?.label ?? column.label}</strong>
            <code>{target}</code>
          </div>
          <button
            className="btn btn-ghost"
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
            placeholder={entity ? `Search ${entity.table} by id or name…` : 'Search…'}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <div className="picker-raw">
            <label>raw</label>
            <input
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onPick(column.kind === 'integer' ? Number(raw) || 0 : raw);
              }}
            />
            <button className="btn btn-accent" onClick={() => onPick(column.kind === 'integer' ? Number(raw) || 0 : raw)}>
              Set
            </button>
          </div>
        </div>

        <div className="picker-list">
          {!entity && <div className="muted">This column links to {target}; no searchable entity is registered.</div>}
          {error && <div className="error-box">{error}</div>}
          {loading && <div className="muted">searching…</div>}
          {!loading &&
            items.map((item) => (
              <button
                key={String(item.id)}
                className={`picker-item ${String(item.id) === String(value) ? 'current' : ''}`}
                onClick={() => onPick(column.kind === 'integer' ? Number(item.id) : item.id)}
              >
                <span className="picker-id">{item.id}</span>
                <span className="picker-name">{item.name}</span>
                {item.detail && <span className="picker-detail">{item.detail}</span>}
              </button>
            ))}
          {!loading && entity && !items.length && <div className="muted">no matches</div>}
        </div>

        <footer className="popover-foot">
          <span className="muted">
            {column.nullable ? 'Empty is allowed on this column.' : 'This column cannot be NULL.'}
          </span>
          <div className="spacer" />
          {column.nullable && (
            <button className="btn btn-ghost" onClick={() => onPick(null)}>
              Set NULL
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => onPick(0)}>
            Clear (0)
          </button>
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
